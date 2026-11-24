import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuthSession, LocalViewRole, PublicAccount } from '../types';
import {
  MAX_ADDITIONAL_ADMINS,
  MAX_TOTAL_ADMINS,
  type AuthOperationResult,
  type PasswordResetInput,
  type RecoveryQuestionInfo,
  type SignupInput,
} from '../utils/auth';

const LEGACY_STORAGE_KEYS = ['tower3_hd_accounts_v1', 'tower3_hd_accounts_v2'];

interface AuthStatusSummary {
  hasAdmin: boolean;
  hasResident: boolean;
  totalAdminCount: number;
  additionalAdminCount: number;
  maxTotalAdmins: number;
  maxAdditionalAdmins: number;
}

const INITIAL_STATUS: AuthStatusSummary = {
  hasAdmin: false,
  hasResident: false,
  totalAdminCount: 0,
  additionalAdminCount: 0,
  maxTotalAdmins: MAX_TOTAL_ADMINS,
  maxAdditionalAdmins: MAX_ADDITIONAL_ADMINS,
};

async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'DELETE';
    body?: unknown;
    token?: string | null;
  } = {}
): Promise<AuthOperationResult<T>> {
  try {
    const headers: Record<string, string> = {};
    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }
    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });

    const payload = (await response.json().catch(() => null)) as
      | { ok?: boolean; data?: T; error?: string }
      | null;

    if (!response.ok || !payload?.ok) {
      return {
        ok: false,
        error: payload?.error || `Request failed (${response.status}). Please try again.`,
      };
    }

    return { ok: true, data: payload.data as T };
  } catch {
    return {
      ok: false,
      error: 'Unable to reach the Tower 3 HD server. Please check your connection and try again.',
    };
  }
}

export function useAuthStore() {
  // Active session & Bearer token are kept strictly in React memory (never written to localStorage/sessionStorage)
  const [session, setSession] = useState<AuthSession | null>(null);
  const tokenRef = useRef<string | null>(null);

  const [status, setStatus] = useState<AuthStatusSummary>(INITIAL_STATUS);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [accounts, setAccounts] = useState<PublicAccount[]>([]);

  const refreshStatus = useCallback(async () => {
    const res = await apiRequest<AuthStatusSummary>('/api/auth/status');
    if (res.ok) {
      setStatus(res.data);
    }
    setStatusLoaded(true);
  }, []);

  const refreshAccounts = useCallback(async (overrideToken?: string | null) => {
    const token = overrideToken ?? tokenRef.current;
    if (!token) {
      setAccounts([]);
      return;
    }
    const res = await apiRequest<{ accounts: PublicAccount[]; status: AuthStatusSummary }>(
      '/api/auth/accounts',
      { token }
    );
    if (res.ok) {
      setAccounts(res.data.accounts);
      setStatus(res.data.status);
    }
  }, []);

  // Clear legacy browser-only account storage on mount & fetch live server auth status
  useEffect(() => {
    try {
      for (const key of LEGACY_STORAGE_KEYS) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // ignore storage errors
    }
    void refreshStatus();
  }, [refreshStatus]);

  // Whenever an Admin is signed in, keep the sanitized accounts list synchronized
  useEffect(() => {
    if (session?.role === 'admin' && tokenRef.current) {
      void refreshAccounts(tokenRef.current);
    } else {
      setAccounts([]);
    }
  }, [session, refreshAccounts]);

  const login = useCallback(
    async (
      username: string,
      password: string,
      role: LocalViewRole
    ): Promise<AuthOperationResult<AuthSession>> => {
      const res = await apiRequest<{
        session: AuthSession;
        token: string;
        status: AuthStatusSummary;
      }>('/api/auth/login', {
        method: 'POST',
        body: { username, password, role },
      });

      if (!res.ok) {
        return res;
      }

      tokenRef.current = res.data.token;
      setStatus(res.data.status);
      setSession(res.data.session);
      if (res.data.session.role === 'admin') {
        void refreshAccounts(res.data.token);
      }
      return { ok: true, data: res.data.session };
    },
    [refreshAccounts]
  );

  const signup = useCallback(
    async (input: SignupInput): Promise<AuthOperationResult<AuthSession>> => {
      const res = await apiRequest<{
        session: AuthSession;
        token: string;
        status: AuthStatusSummary;
      }>('/api/auth/signup', {
        method: 'POST',
        body: input,
      });

      if (!res.ok) {
        return res;
      }

      tokenRef.current = res.data.token;
      setStatus(res.data.status);
      setSession(res.data.session);
      if (res.data.session.role === 'admin') {
        void refreshAccounts(res.data.token);
      }
      return { ok: true, data: res.data.session };
    },
    [refreshAccounts]
  );

  const getSecurityQuestion = useCallback(
    async (username: string): Promise<AuthOperationResult<RecoveryQuestionInfo>> => {
      return apiRequest<RecoveryQuestionInfo>('/api/auth/recovery-question', {
        method: 'POST',
        body: { username },
      });
    },
    []
  );

  const resetPassword = useCallback(
    async (
      input: PasswordResetInput
    ): Promise<AuthOperationResult<{ username: string; role: LocalViewRole }>> => {
      return apiRequest<{ username: string; role: LocalViewRole }>('/api/auth/reset-password', {
        method: 'POST',
        body: input,
      });
    },
    []
  );

  const createResidentAccountAsAdmin = useCallback(
    async (
      input: Omit<SignupInput, 'role' | 'designation'>
    ): Promise<AuthOperationResult<PublicAccount>> => {
      if (!tokenRef.current || session?.role !== 'admin') {
        return { ok: false, error: 'Only a signed-in Admin can create Resident accounts.' };
      }
      const res = await apiRequest<{
        account: PublicAccount;
        accounts: PublicAccount[];
        status: AuthStatusSummary;
      }>('/api/auth/accounts', {
        method: 'POST',
        token: tokenRef.current,
        body: { ...input, role: 'resident' },
      });

      if (!res.ok) {
        return res;
      }

      setAccounts(res.data.accounts);
      setStatus(res.data.status);
      return { ok: true, data: res.data.account };
    },
    [session]
  );

  const promoteToAdmin = useCallback(
    async (accountId: string): Promise<AuthOperationResult<PublicAccount>> => {
      if (!tokenRef.current || session?.role !== 'admin' || !session.isPrimaryAdmin) {
        return {
          ok: false,
          error: 'Only the 1st Admin can change Resident accounts to Admin (maximum 3 Admins total).',
        };
      }
      const res = await apiRequest<{
        account: PublicAccount;
        accounts: PublicAccount[];
        status: AuthStatusSummary;
      }>(`/api/auth/accounts/${encodeURIComponent(accountId)}/promote`, {
        method: 'POST',
        token: tokenRef.current,
      });

      if (!res.ok) {
        return res;
      }

      setAccounts(res.data.accounts);
      setStatus(res.data.status);
      return { ok: true, data: res.data.account };
    },
    [session]
  );

  const demoteToResident = useCallback(
    async (accountId: string): Promise<AuthOperationResult<PublicAccount>> => {
      if (!tokenRef.current || session?.role !== 'admin' || !session.isPrimaryAdmin) {
        return {
          ok: false,
          error: 'Only the 1st Admin can change an Admin account back to Resident.',
        };
      }
      const res = await apiRequest<{
        account: PublicAccount;
        accounts: PublicAccount[];
        status: AuthStatusSummary;
      }>(`/api/auth/accounts/${encodeURIComponent(accountId)}/demote`, {
        method: 'POST',
        token: tokenRef.current,
      });

      if (!res.ok) {
        return res;
      }

      setAccounts(res.data.accounts);
      setStatus(res.data.status);
      return { ok: true, data: res.data.account };
    },
    [session]
  );

  const deleteAccountAsAdmin = useCallback(
    async (accountId: string): Promise<AuthOperationResult<void>> => {
      if (!tokenRef.current || session?.role !== 'admin') {
        return { ok: false, error: 'Only a signed-in Admin can remove accounts.' };
      }
      const res = await apiRequest<{
        accounts: PublicAccount[];
        status: AuthStatusSummary;
      }>(`/api/auth/accounts/${encodeURIComponent(accountId)}`, {
        method: 'DELETE',
        token: tokenRef.current,
      });

      if (!res.ok) {
        return res;
      }

      setAccounts(res.data.accounts);
      setStatus(res.data.status);
      return { ok: true, data: undefined };
    },
    [session]
  );

  const logout = useCallback(() => {
    const activeToken = tokenRef.current;
    tokenRef.current = null;
    setSession(null);
    setAccounts([]);
    if (activeToken) {
      void apiRequest('/api/auth/logout', { method: 'POST', token: activeToken });
    }
    void refreshStatus();
  }, [refreshStatus]);

  return {
    accounts,
    session,
    statusLoaded,
    hasAdmin: status.hasAdmin,
    hasResident: status.hasResident,
    totalAdminCount: status.totalAdminCount,
    additionalAdminCount: status.additionalAdminCount,
    maxTotalAdmins: status.maxTotalAdmins,
    maxAdditionalAdmins: status.maxAdditionalAdmins,
    login,
    signup,
    getSecurityQuestion,
    resetPassword,
    refreshAccounts,
    createResidentAccountAsAdmin,
    promoteToAdmin,
    demoteToResident,
    deleteAccountAsAdmin,
    logout,
  };
}

export type AuthStore = ReturnType<typeof useAuthStore>;
