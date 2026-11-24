import type { AuthSession, LocalAccount, LocalViewRole, PublicAccount } from '../types/index.ts';
import { ALL_UNIT_NUMBERS, createId } from './residents.ts';

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH_BITS = 256;
const SALT_BYTE_LENGTH = 16;

export const MAX_ADDITIONAL_ADMINS = 2; // 1st Admin + up to 2 Residents promoted to Admin
export const MAX_TOTAL_ADMINS = 3; // Strictly 3 Admins maximum

export const SECURITY_QUESTIONS: readonly string[] = [
  'What is your childhood nickname?',
  'What is the name of your first school?',
  'What is your favourite place in Assam?',
  'What was the name of your first pet?',
  'What is your mother’s maiden name?',
  'What is your favourite food or dish?',
];

export interface SignupInput {
  fullName: string;
  username: string;
  password: string;
  confirmPassword: string;
  role: LocalViewRole;
  unitNumber?: string;
  designation?: string;
  securityQuestion: string;
  securityAnswer: string;
}

export interface PasswordResetInput {
  username: string;
  securityAnswer: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RecoveryQuestionInfo {
  username: string;
  securityQuestion: string;
  role: LocalViewRole;
}

export interface SignupOptions {
  /**
   * Public signup allows creating the very first Admin account only.
   * Once the 1st Admin exists, public Admin signup locks permanently across all devices.
   * Additional Admins (up to 2) are added by the 1st Admin promoting Resident accounts.
   */
  allowAdditionalAdmin?: boolean;
}

export type AuthOperationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToBytes(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeSecurityAnswer(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function hashPassword(
  password: string,
  existingSaltBase64?: string
): Promise<{ salt: string; hash: string }> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment.');
  }

  const saltBytes = existingSaltBase64
    ? base64ToBytes(existingSaltBase64)
    : cryptoApi.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));

  const encoder = new TextEncoder();
  const baseKey = await cryptoApi.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    KEY_LENGTH_BITS
  );

  return {
    salt: existingSaltBase64 ?? bytesToBase64(saltBytes),
    hash: bytesToBase64(new Uint8Array(derivedBits)),
  };
}

export async function verifyPassword(
  password: string,
  saltBase64: string,
  expectedHashBase64: string
): Promise<boolean> {
  if (!password || !saltBase64 || !expectedHashBase64) return false;
  const { hash } = await hashPassword(password, saltBase64);
  return constantTimeEqual(base64ToBytes(hash), base64ToBytes(expectedHashBase64));
}

export function hasAdminAccount(accounts: LocalAccount[]): boolean {
  return accounts.some((a) => a.role === 'admin');
}

export function countTotalAdmins(accounts: LocalAccount[]): number {
  return accounts.filter((a) => a.role === 'admin').length;
}

export function countAdditionalAdmins(accounts: LocalAccount[]): number {
  return accounts.filter((a) => a.role === 'admin' && !a.isPrimaryAdmin).length;
}

export function clearAdminAccounts(accounts: LocalAccount[]): LocalAccount[] {
  return accounts.filter((a) => a.role !== 'admin');
}

export function toPublicAccount(account: LocalAccount): PublicAccount {
  return {
    id: account.id,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    isPrimaryAdmin: account.role === 'admin' ? Boolean(account.isPrimaryAdmin) : false,
    unitNumber: account.unitNumber,
    designation: account.designation,
    securityQuestion: account.securityQuestion,
    createdAt: account.createdAt,
  };
}

export function validateSignupInput(
  input: SignupInput,
  existingAccounts: LocalAccount[],
  options: SignupOptions = {}
): string | null {
  const fullName = (input.fullName ?? '').trim();
  if (fullName.length < 2) {
    return 'Full name must be at least 2 characters.';
  }
  if (fullName.length > 80) {
    return 'Full name must be 80 characters or fewer.';
  }

  const username = normalizeUsername(input.username ?? '');
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) {
    return 'User ID must be 3–24 characters using only letters, numbers, dots, hyphens, or underscores (no email required).';
  }

  if (existingAccounts.some((a) => a.username === username)) {
    return `User ID "${username}" is already registered. Choose another User ID or log in.`;
  }

  const password = input.password ?? '';
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  if (password.length > 128) {
    return 'Password must be 128 characters or fewer.';
  }
  if (password !== input.confirmPassword) {
    return 'Passwords do not match.';
  }

  const securityQuestion = (input.securityQuestion ?? '').trim();
  if (securityQuestion.length < 5) {
    return 'Security Question is mandatory (at least 5 characters) for password reset.';
  }
  if (securityQuestion.length > 160) {
    return 'Security Question must be 160 characters or fewer.';
  }

  const normalizedAnswer = normalizeSecurityAnswer(input.securityAnswer ?? '');
  if (normalizedAnswer.length < 2) {
    return 'Security Answer is mandatory (at least 2 characters) for password reset.';
  }
  if (normalizedAnswer.length > 100) {
    return 'Security Answer must be 100 characters or fewer.';
  }

  if (input.role === 'resident') {
    if (!input.unitNumber || !ALL_UNIT_NUMBERS.includes(input.unitNumber)) {
      return 'Please select your Tower 3 unit number (049–072).';
    }
  } else {
    if (input.unitNumber && !ALL_UNIT_NUMBERS.includes(input.unitNumber)) {
      return 'Selected unit number must be between 049 and 072.';
    }
    if (hasAdminAccount(existingAccounts)) {
      if (!options.allowAdditionalAdmin) {
        return `1st Admin is already registered. Maximum ${MAX_TOTAL_ADMINS} Admins allowed — sign in as 1st Admin to change up to ${MAX_ADDITIONAL_ADMINS} Resident accounts to Admin.`;
      }
      if (
        countAdditionalAdmins(existingAccounts) >= MAX_ADDITIONAL_ADMINS ||
        countTotalAdmins(existingAccounts) >= MAX_TOTAL_ADMINS
      ) {
        return `Maximum limit reached: only ${MAX_TOTAL_ADMINS} Admins total (1st Admin + ${MAX_ADDITIONAL_ADMINS} Residents changed to Admin) are allowed.`;
      }
    }
  }

  return null;
}

export async function registerLocalAccount(
  existingAccounts: LocalAccount[],
  input: SignupInput,
  options: SignupOptions = {}
): Promise<AuthOperationResult<{ account: LocalAccount; accounts: LocalAccount[] }>> {
  const validationError = validateSignupInput(input, existingAccounts, options);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const isFirstAdmin = input.role === 'admin' && !hasAdminAccount(existingAccounts);
  const { salt: passwordSalt, hash: passwordHash } = await hashPassword(input.password);
  const { salt: securityAnswerSalt, hash: securityAnswerHash } = await hashPassword(
    normalizeSecurityAnswer(input.securityAnswer)
  );

  const account: LocalAccount = {
    id: createId('acc'),
    username: normalizeUsername(input.username),
    fullName: input.fullName.trim(),
    role: input.role,
    isPrimaryAdmin: input.role === 'admin' ? isFirstAdmin : false,
    unitNumber: input.unitNumber?.trim() || undefined,
    designation: input.role === 'admin' ? input.designation?.trim() || undefined : undefined,
    passwordSalt,
    passwordHash,
    securityQuestion: input.securityQuestion.trim(),
    securityAnswerSalt,
    securityAnswerHash,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    data: {
      account,
      accounts: [...existingAccounts, account],
    },
  };
}

export function buildSessionFromAccount(account: LocalAccount): AuthSession {
  return {
    accountId: account.id,
    username: account.username,
    fullName: account.fullName,
    role: account.role,
    isPrimaryAdmin: account.role === 'admin' ? Boolean(account.isPrimaryAdmin) : false,
    unitNumber: account.unitNumber,
    designation: account.designation,
    signedInAt: new Date().toISOString(),
  };
}

export async function authenticateLocalAccount(
  accounts: LocalAccount[],
  rawUsername: string,
  password: string,
  expectedRole: LocalViewRole
): Promise<AuthOperationResult<AuthSession>> {
  const username = normalizeUsername(rawUsername ?? '');
  if (!username || !password) {
    return { ok: false, error: 'Please enter both User ID and Password.' };
  }

  const account = accounts.find((a) => a.username === username);
  if (!account) {
    return { ok: false, error: 'Invalid User ID or Password.' };
  }

  const passwordValid = await verifyPassword(password, account.passwordSalt, account.passwordHash);
  if (!passwordValid) {
    return { ok: false, error: 'Invalid User ID or Password.' };
  }

  if (account.role !== expectedRole) {
    const roleLabel = account.role === 'admin' ? 'Admin' : 'Resident';
    return {
      ok: false,
      error: `This User ID is registered as a ${roleLabel} account. Switch to ${roleLabel} Login to sign in.`,
    };
  }

  return {
    ok: true,
    data: buildSessionFromAccount(account),
  };
}

export function getRecoveryQuestion(
  accounts: LocalAccount[],
  rawUsername: string
): AuthOperationResult<RecoveryQuestionInfo> {
  const username = normalizeUsername(rawUsername ?? '');
  if (!username) {
    return { ok: false, error: 'Please enter your User ID first.' };
  }

  const account = accounts.find((a) => a.username === username);
  if (!account || !account.securityQuestion) {
    return { ok: false, error: 'No account found with that User ID.' };
  }

  return {
    ok: true,
    data: {
      username: account.username,
      securityQuestion: account.securityQuestion,
      role: account.role,
    },
  };
}

export async function resetAccountPasswordWithAnswer(
  accounts: LocalAccount[],
  input: PasswordResetInput
): Promise<AuthOperationResult<{ account: LocalAccount; accounts: LocalAccount[] }>> {
  const username = normalizeUsername(input.username ?? '');
  if (!username) {
    return { ok: false, error: 'Please enter your User ID.' };
  }

  const normalizedAnswer = normalizeSecurityAnswer(input.securityAnswer ?? '');
  if (!normalizedAnswer) {
    return { ok: false, error: 'Please enter the answer to your Security Question.' };
  }

  const newPassword = input.newPassword ?? '';
  if (newPassword.length < 6) {
    return { ok: false, error: 'New password must be at least 6 characters long.' };
  }
  if (newPassword.length > 128) {
    return { ok: false, error: 'New password must be 128 characters or fewer.' };
  }
  if (newPassword !== input.confirmPassword) {
    return { ok: false, error: 'New passwords do not match.' };
  }

  const account = accounts.find((a) => a.username === username);
  if (!account || !account.securityAnswerSalt || !account.securityAnswerHash) {
    return { ok: false, error: 'Incorrect User ID or Security Answer.' };
  }

  const answerValid = await verifyPassword(
    normalizedAnswer,
    account.securityAnswerSalt,
    account.securityAnswerHash
  );
  if (!answerValid) {
    return { ok: false, error: 'Incorrect Security Answer. Please try again.' };
  }

  const { salt: passwordSalt, hash: passwordHash } = await hashPassword(newPassword);
  const updatedAccount: LocalAccount = {
    ...account,
    passwordSalt,
    passwordHash,
  };

  return {
    ok: true,
    data: {
      account: updatedAccount,
      accounts: accounts.map((a) => (a.id === updatedAccount.id ? updatedAccount : a)),
    },
  };
}

export function promoteResidentToAdmin(
  accounts: LocalAccount[],
  targetAccountId: string,
  actorAccountId: string
): AuthOperationResult<{ account: LocalAccount; accounts: LocalAccount[] }> {
  const actor = accounts.find((a) => a.id === actorAccountId);
  if (!actor || actor.role !== 'admin' || !actor.isPrimaryAdmin) {
    return {
      ok: false,
      error: 'Only the 1st Admin can change Resident accounts to Admin.',
    };
  }

  const target = accounts.find((a) => a.id === targetAccountId);
  if (!target) {
    return { ok: false, error: 'Resident account not found.' };
  }
  if (target.role !== 'resident') {
    return { ok: false, error: 'This account is already an Admin.' };
  }
  if (
    countAdditionalAdmins(accounts) >= MAX_ADDITIONAL_ADMINS ||
    countTotalAdmins(accounts) >= MAX_TOTAL_ADMINS
  ) {
    return {
      ok: false,
      error: `Maximum limit reached: only ${MAX_TOTAL_ADMINS} Admins total (1st Admin + ${MAX_ADDITIONAL_ADMINS} Resident accounts changed to Admin).`,
    };
  }

  const updatedTarget: LocalAccount = {
    ...target,
    role: 'admin',
    isPrimaryAdmin: false,
  };

  return {
    ok: true,
    data: {
      account: updatedTarget,
      accounts: accounts.map((a) => (a.id === targetAccountId ? updatedTarget : a)),
    },
  };
}

export function demoteAdminToResident(
  accounts: LocalAccount[],
  targetAccountId: string,
  actorAccountId: string
): AuthOperationResult<{ account: LocalAccount; accounts: LocalAccount[] }> {
  const actor = accounts.find((a) => a.id === actorAccountId);
  if (!actor || actor.role !== 'admin' || !actor.isPrimaryAdmin) {
    return {
      ok: false,
      error: 'Only the 1st Admin can change an Admin account back to Resident.',
    };
  }

  const target = accounts.find((a) => a.id === targetAccountId);
  if (!target) {
    return { ok: false, error: 'Account not found.' };
  }
  if (target.role !== 'admin') {
    return { ok: false, error: 'This account is already a Resident.' };
  }
  if (target.isPrimaryAdmin || target.id === actorAccountId) {
    return { ok: false, error: 'The 1st Admin account cannot be changed to Resident.' };
  }

  const updatedTarget: LocalAccount = {
    ...target,
    role: 'resident',
    isPrimaryAdmin: false,
    designation: undefined,
  };

  return {
    ok: true,
    data: {
      account: updatedTarget,
      accounts: accounts.map((a) => (a.id === targetAccountId ? updatedTarget : a)),
    },
  };
}

export function removeLocalAccount(
  accounts: LocalAccount[],
  accountId: string,
  activeSessionAccountId: string
): AuthOperationResult<LocalAccount[]> {
  if (accountId === activeSessionAccountId) {
    return { ok: false, error: 'You cannot delete the account currently signed in.' };
  }
  const actor = accounts.find((a) => a.id === activeSessionAccountId);
  if (!actor || actor.role !== 'admin') {
    return { ok: false, error: 'Only a signed-in Admin can remove accounts.' };
  }
  const target = accounts.find((a) => a.id === accountId);
  if (!target) {
    return { ok: false, error: 'Account not found.' };
  }
  if (target.role === 'admin') {
    if (!actor.isPrimaryAdmin) {
      return { ok: false, error: 'Only the 1st Admin can remove Admin accounts.' };
    }
    if (target.isPrimaryAdmin) {
      return { ok: false, error: 'Cannot delete the 1st Admin account.' };
    }
    const adminCount = accounts.filter((a) => a.role === 'admin').length;
    if (adminCount <= 1) {
      return { ok: false, error: 'Cannot delete the last remaining Admin account.' };
    }
  }
  return {
    ok: true,
    data: accounts.filter((a) => a.id !== accountId),
  };
}
