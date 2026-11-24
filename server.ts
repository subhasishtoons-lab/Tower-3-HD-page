import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { AuthSession, LocalAccount, LocalViewRole } from './src/types/index.ts';
import {
  MAX_ADDITIONAL_ADMINS,
  MAX_TOTAL_ADMINS,
  authenticateLocalAccount,
  buildSessionFromAccount,
  countAdditionalAdmins,
  countTotalAdmins,
  demoteAdminToResident,
  getRecoveryQuestion,
  hasAdminAccount,
  normalizeUsername,
  promoteResidentToAdmin,
  registerLocalAccount,
  removeLocalAccount,
  resetAccountPasswordWithAnswer,
  toPublicAccount,
} from './src/utils/auth.ts';

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), '.data');
const AUTH_STORE_FILE = path.resolve(DATA_DIR, 'tower3-auth.json');
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 10;

interface ServerSessionRecord {
  accountId: string;
  expiresAt: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface AuthenticatedRequest extends Request {
  authToken?: string;
  authAccount?: LocalAccount;
}

const activeSessions = new Map<string, ServerSessionRecord>();
const rateLimitBuckets = new Map<string, RateLimitBucket>();

function isValidStoredAccount(item: unknown): item is LocalAccount {
  if (!item || typeof item !== 'object') return false;
  const candidate = item as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.username === 'string' &&
    typeof candidate.fullName === 'string' &&
    (candidate.role === 'admin' || candidate.role === 'resident') &&
    typeof candidate.passwordSalt === 'string' &&
    typeof candidate.passwordHash === 'string' &&
    typeof candidate.securityQuestion === 'string' &&
    typeof candidate.securityAnswerSalt === 'string' &&
    typeof candidate.securityAnswerHash === 'string' &&
    typeof candidate.createdAt === 'string'
  );
}

function loadAccounts(): LocalAccount[] {
  try {
    if (!fs.existsSync(AUTH_STORE_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(AUTH_STORE_FILE, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidStoredAccount);
  } catch {
    return [];
  }
}

function saveAccounts(accounts: LocalAccount[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  const tempPath = `${AUTH_STORE_FILE}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(accounts, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tempPath, AUTH_STORE_FILE);
}

function buildStatusSummary(accounts: LocalAccount[]) {
  return {
    hasAdmin: hasAdminAccount(accounts),
    hasResident: accounts.some((a) => a.role === 'resident'),
    totalAdminCount: countTotalAdmins(accounts),
    additionalAdminCount: countAdditionalAdmins(accounts),
    maxTotalAdmins: MAX_TOTAL_ADMINS,
    maxAdditionalAdmins: MAX_ADDITIONAL_ADMINS,
  };
}

function createSessionToken(accountId: string): string {
  const now = Date.now();
  for (const [token, rec] of activeSessions.entries()) {
    if (rec.expiresAt <= now) {
      activeSessions.delete(token);
    }
  }
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, {
    accountId,
    expiresAt: now + SESSION_TTL_MS,
  });
  return token;
}

function revokeSessionsForAccount(accountId: string): void {
  for (const [token, rec] of activeSessions.entries()) {
    if (rec.accountId === accountId) {
      activeSessions.delete(token);
    }
  }
}

function checkRateLimit(bucketKey: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const existing = rateLimitBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    return { allowed: true, retryAfterSec: 0 };
  }
  if (existing.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

function recordFailedAttempt(bucketKey: string): void {
  const now = Date.now();
  if (rateLimitBuckets.size > 1000) {
    for (const [key, bucket] of rateLimitBuckets.entries()) {
      if (bucket.resetAt <= now) {
        rateLimitBuckets.delete(key);
      }
    }
  }
  const existing = rateLimitBuckets.get(bucketKey);
  if (!existing || existing.resetAt <= now) {
    rateLimitBuckets.set(bucketKey, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
  } else {
    existing.count += 1;
  }
}

function clearRateLimit(bucketKey: string): void {
  rateLimitBuckets.delete(bucketKey);
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asRole(value: unknown): LocalViewRole | null {
  return value === 'admin' || value === 'resident' ? value : null;
}

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ ok: false, error: 'Authentication required. Please sign in.' });
    return;
  }

  const record = activeSessions.get(token);
  if (!record || record.expiresAt <= Date.now()) {
    if (record) activeSessions.delete(token);
    res.status(401).json({ ok: false, error: 'Session expired. Please sign in again.' });
    return;
  }

  const accounts = loadAccounts();
  const account = accounts.find((a) => a.id === record.accountId);
  if (!account) {
    activeSessions.delete(token);
    res.status(401).json({ ok: false, error: 'Account no longer exists. Please sign in again.' });
    return;
  }

  req.authToken = token;
  req.authAccount = account;
  next();
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.authAccount?.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Admin access required.' });
      return;
    }
    next();
  });
}

function requirePrimaryAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAdmin(req, res, () => {
    if (!req.authAccount?.isPrimaryAdmin) {
      res.status(403).json({
        ok: false,
        error: 'Only the 1st Admin can manage Admin roles (maximum 3 Admins total).',
      });
      return;
    }
    next();
  });
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // Public auth status (never returns usernames, emails, or hashes)
  app.get('/api/auth/status', (_req, res) => {
    const accounts = loadAccounts();
    res.json({
      ok: true,
      data: buildStatusSummary(accounts),
    });
  });

  // Public signup: 1st Admin (once globally) OR Resident (always) with mandatory Security Question & Answer
  app.post('/api/auth/signup', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid request payload.' });
      return;
    }

    const role = asRole(body.role);
    if (!role) {
      res.status(400).json({ ok: false, error: 'Account role must be resident or admin.' });
      return;
    }

    const accounts = loadAccounts();
    const result = await registerLocalAccount(
      accounts,
      {
        fullName: asString(body.fullName),
        username: asString(body.username),
        password: asString(body.password),
        confirmPassword: asString(body.confirmPassword),
        role,
        unitNumber: asString(body.unitNumber) || undefined,
        designation: role === 'admin' ? asString(body.designation) || undefined : undefined,
        securityQuestion: asString(body.securityQuestion),
        securityAnswer: asString(body.securityAnswer),
      },
      { allowAdditionalAdmin: false }
    );

    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }

    saveAccounts(result.data.accounts);
    const session: AuthSession = buildSessionFromAccount(result.data.account);
    const token = createSessionToken(result.data.account.id);

    res.status(201).json({
      ok: true,
      data: {
        session,
        token,
        status: buildStatusSummary(result.data.accounts),
      },
    });
  });

  // Login from any browser / mobile / desktop using User ID + Password + Role
  app.post('/api/auth/login', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid request payload.' });
      return;
    }

    const role = asRole(body.role);
    if (!role) {
      res.status(400).json({ ok: false, error: 'Account role must be resident or admin.' });
      return;
    }

    const username = asString(body.username);
    const password = asString(body.password);
    const bucketKey = `login:${req.ip || 'unknown'}:${normalizeUsername(username) || 'empty'}`;
    const limit = checkRateLimit(bucketKey);
    if (!limit.allowed) {
      res.status(429).json({
        ok: false,
        error: `Too many failed login attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minute(s) and try again.`,
      });
      return;
    }

    const accounts = loadAccounts();
    const result = await authenticateLocalAccount(accounts, username, password, role);
    if (!result.ok) {
      recordFailedAttempt(bucketKey);
      res.status(401).json({ ok: false, error: result.error });
      return;
    }

    clearRateLimit(bucketKey);
    const token = createSessionToken(result.data.accountId);
    res.json({
      ok: true,
      data: {
        session: result.data,
        token,
        status: buildStatusSummary(accounts),
      },
    });
  });

  // Logout (revokes current Bearer token)
  app.post('/api/auth/logout', (req, res) => {
    const token = extractBearerToken(req);
    if (token) {
      activeSessions.delete(token);
    }
    res.json({ ok: true });
  });

  // Step 1 of Password Reset: lookup saved Security Question by User ID (no email required)
  app.post('/api/auth/recovery-question', (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid request payload.' });
      return;
    }

    const username = asString(body.username);
    const bucketKey = `recovery-q:${req.ip || 'unknown'}`;
    const limit = checkRateLimit(bucketKey);
    if (!limit.allowed) {
      res.status(429).json({
        ok: false,
        error: `Too many password recovery lookups. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minute(s) and try again.`,
      });
      return;
    }

    const accounts = loadAccounts();
    const result = getRecoveryQuestion(accounts, username);
    if (!result.ok) {
      recordFailedAttempt(bucketKey);
      res.status(404).json({ ok: false, error: result.error });
      return;
    }

    res.json({
      ok: true,
      data: result.data,
    });
  });

  // Step 2 of Password Reset: verify Security Answer and set New Password
  app.post('/api/auth/reset-password', async (req, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid request payload.' });
      return;
    }

    const username = asString(body.username);
    const bucketKey = `reset:${req.ip || 'unknown'}:${normalizeUsername(username) || 'empty'}`;
    const limit = checkRateLimit(bucketKey);
    if (!limit.allowed) {
      res.status(429).json({
        ok: false,
        error: `Too many password reset attempts. Please wait ${Math.ceil(limit.retryAfterSec / 60)} minute(s) and try again.`,
      });
      return;
    }

    const accounts = loadAccounts();
    const result = await resetAccountPasswordWithAnswer(accounts, {
      username,
      securityAnswer: asString(body.securityAnswer),
      newPassword: asString(body.newPassword),
      confirmPassword: asString(body.confirmPassword),
    });

    if (!result.ok) {
      recordFailedAttempt(bucketKey);
      res.status(400).json({ ok: false, error: result.error });
      return;
    }

    clearRateLimit(bucketKey);
    saveAccounts(result.data.accounts);
    // Invalidate all existing sessions for this account after password reset
    revokeSessionsForAccount(result.data.account.id);

    res.json({
      ok: true,
      data: {
        username: result.data.account.username,
        role: result.data.account.role,
      },
    });
  });

  // Admin: list registered accounts (sanitized PublicAccount DTO — zero hashes or salts)
  app.get('/api/auth/accounts', requireAdmin, (_req, res) => {
    const accounts = loadAccounts();
    res.json({
      ok: true,
      data: {
        accounts: accounts.map(toPublicAccount),
        status: buildStatusSummary(accounts),
      },
    });
  });

  // Admin: create a Resident account (additional Admins come strictly by promoting up to 2 Residents)
  app.post('/api/auth/accounts', requireAdmin, async (req: AuthenticatedRequest, res) => {
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ ok: false, error: 'Invalid request payload.' });
      return;
    }

    const requestedRole = asRole(body.role) ?? 'resident';
    if (requestedRole !== 'resident') {
      res.status(400).json({
        ok: false,
        error:
          'Create the account as a Resident first, then the 1st Admin can change up to 2 Resident accounts to Admin (3 Admins maximum).',
      });
      return;
    }

    const accounts = loadAccounts();
    const result = await registerLocalAccount(
      accounts,
      {
        fullName: asString(body.fullName),
        username: asString(body.username),
        password: asString(body.password),
        confirmPassword: asString(body.confirmPassword),
        role: 'resident',
        unitNumber: asString(body.unitNumber) || undefined,
        securityQuestion: asString(body.securityQuestion),
        securityAnswer: asString(body.securityAnswer),
      },
      { allowAdditionalAdmin: false }
    );

    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }

    saveAccounts(result.data.accounts);
    res.status(201).json({
      ok: true,
      data: {
        account: toPublicAccount(result.data.account),
        accounts: result.data.accounts.map(toPublicAccount),
        status: buildStatusSummary(result.data.accounts),
      },
    });
  });

  // 1st Admin: change a Resident account to Admin (maximum 2 promoted = 3 Admins total)
  app.post(
    '/api/auth/accounts/:id/promote',
    requirePrimaryAdmin,
    (req: AuthenticatedRequest, res) => {
      const targetId = String(req.params.id ?? '');
      const actorId = req.authAccount!.id;
      const accounts = loadAccounts();
      const result = promoteResidentToAdmin(accounts, targetId, actorId);
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      saveAccounts(result.data.accounts);
      revokeSessionsForAccount(targetId);

      res.json({
        ok: true,
        data: {
          account: toPublicAccount(result.data.account),
          accounts: result.data.accounts.map(toPublicAccount),
          status: buildStatusSummary(result.data.accounts),
        },
      });
    }
  );

  // 1st Admin: change an added Admin account back to Resident
  app.post(
    '/api/auth/accounts/:id/demote',
    requirePrimaryAdmin,
    (req: AuthenticatedRequest, res) => {
      const targetId = String(req.params.id ?? '');
      const actorId = req.authAccount!.id;
      const accounts = loadAccounts();
      const result = demoteAdminToResident(accounts, targetId, actorId);
      if (!result.ok) {
        res.status(400).json({ ok: false, error: result.error });
        return;
      }

      saveAccounts(result.data.accounts);
      revokeSessionsForAccount(targetId);

      res.json({
        ok: true,
        data: {
          account: toPublicAccount(result.data.account),
          accounts: result.data.accounts.map(toPublicAccount),
          status: buildStatusSummary(result.data.accounts),
        },
      });
    }
  );

  // Admin: remove an account (1st Admin required to remove an added Admin)
  app.delete('/api/auth/accounts/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const targetId = String(req.params.id ?? '');
    const actorId = req.authAccount!.id;
    const accounts = loadAccounts();
    const result = removeLocalAccount(accounts, targetId, actorId);
    if (!result.ok) {
      res.status(400).json({ ok: false, error: result.error });
      return;
    }

    saveAccounts(result.data);
    revokeSessionsForAccount(targetId);

    res.json({
      ok: true,
      data: {
        accounts: result.data.map(toPublicAccount),
        status: buildStatusSummary(result.data),
      },
    });
  });

  // Unknown API routes return clean JSON 404 (Express 4 compatible)
  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'API route not found.' });
  });

  // Mount Vite middleware in development, or serve built dist/ in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TOWER 3 HD server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start TOWER 3 HD server:', err);
  process.exit(1);
});
