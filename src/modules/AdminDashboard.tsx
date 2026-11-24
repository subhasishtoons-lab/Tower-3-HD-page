import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  DatabaseBackup,
  HelpCircle,
  LogOut,
  Plus,
  ReceiptIndianRupee,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { AuthStore } from '../store/useAuthStore';
import type { TowerStore } from '../store/useTowerStore';
import type { ModuleId, PublicAccount } from '../types';
import { SECURITY_QUESTIONS } from '../utils/auth';
import { formatINR, formatMonthLabel, summarizeMonthFinances } from '../utils/finance';
import { ALL_UNIT_NUMBERS, TOWER_FLOORS } from '../utils/residents';

interface AdminDashboardProps {
  store: TowerStore;
  auth: AuthStore;
  onNavigate: (id: ModuleId) => void;
  onLogout: () => void;
}

const CUSTOM_QUESTION_VALUE = '__custom__';

export function AdminDashboard({ store, auth, onNavigate, onLogout }: AdminDashboardProps) {
  const { state, resetToSeedData } = store;

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Resident account creation modal state (additional Admins are strictly promoted from Residents up to max 2)
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const [newAccFullName, setNewAccFullName] = useState('');
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [newAccConfirm, setNewAccConfirm] = useState('');
  const [newAccUnit, setNewAccUnit] = useState('049');
  const [newAccQuestion, setNewAccQuestion] = useState<string>(SECURITY_QUESTIONS[0]);
  const [newAccCustomQuestion, setNewAccCustomQuestion] = useState('');
  const [newAccAnswer, setNewAccAnswer] = useState('');
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountFeedback, setAccountFeedback] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<PublicAccount | null>(null);

  const isPrimaryAdmin = Boolean(auth.session?.role === 'admin' && auth.session?.isPrimaryAdmin);
  const adminSlotsRemaining = Math.max(0, auth.maxAdditionalAdmins - auth.additionalAdminCount);

  useEffect(() => {
    void auth.refreshAccounts();
  }, [auth.refreshAccounts]);

  const sortedAccounts = useMemo(() => {
    return [...auth.accounts].sort((a, b) => {
      const rank = (acc: PublicAccount) =>
        acc.role === 'admin' ? (acc.isPrimaryAdmin ? 0 : 1) : 2;
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return a.fullName.localeCompare(b.fullName);
    });
  }, [auth.accounts]);

  const months = useMemo(
    () => Array.from(new Set(state.bills.map((b) => b.month))).sort().reverse(),
    [state.bills]
  );

  const monthSummaries = useMemo(
    () => months.map((m) => summarizeMonthFinances(state.bills, state.expenses, m)),
    [months, state.bills, state.expenses]
  );

  const pendingExpensesCount = state.expenses.filter((e) => e.approvalStatus === 'pending').length;
  const openMaintenanceCount = state.maintenanceRequests.filter(
    (m) => m.status === 'open' || m.status === 'in_progress'
  ).length;

  const handleCreateResidentAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    const resolvedQuestion =
      newAccQuestion === CUSTOM_QUESTION_VALUE ? newAccCustomQuestion.trim() : newAccQuestion;

    if (resolvedQuestion.length < 5) {
      setAccountError('Please select or enter a Security Question (at least 5 characters).');
      return;
    }
    if (newAccAnswer.trim().length < 2) {
      setAccountError('Security Answer is mandatory (at least 2 characters).');
      return;
    }

    setAccountBusy(true);
    try {
      const result = await auth.createResidentAccountAsAdmin({
        fullName: newAccFullName,
        username: newAccUsername,
        password: newAccPassword,
        confirmPassword: newAccConfirm,
        unitNumber: newAccUnit,
        securityQuestion: resolvedQuestion,
        securityAnswer: newAccAnswer,
      });
      if (!result.ok) {
        setAccountError(result.error);
        return;
      }
      setAccountFeedback(
        `Created Resident account "@${result.data.username}" (${result.data.fullName}).${
          isPrimaryAdmin && adminSlotsRemaining > 0
            ? ' Use "Make Admin" below if you wish to promote this Resident (max 2 promoted Admins).'
            : ''
        }`
      );
      setNewAccFullName('');
      setNewAccUsername('');
      setNewAccPassword('');
      setNewAccConfirm('');
      setNewAccQuestion(SECURITY_QUESTIONS[0]);
      setNewAccCustomQuestion('');
      setNewAccAnswer('');
      setCreateAccountOpen(false);
    } finally {
      setAccountBusy(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (!deletingAccount) return;
    setAccountBusy(true);
    try {
      const res = await auth.deleteAccountAsAdmin(deletingAccount.id);
      if (!res.ok) {
        setAccountFeedback(res.error);
      } else {
        setAccountFeedback(`Removed account "@${deletingAccount.username}".`);
      }
    } finally {
      setAccountBusy(false);
      setDeletingAccount(null);
    }
  };

  const handlePromoteResident = async (acc: PublicAccount) => {
    setAccountBusy(true);
    try {
      const res = await auth.promoteToAdmin(acc.id);
      if (!res.ok) {
        setAccountFeedback(res.error);
        return;
      }
      setAccountFeedback(
        `Changed "${acc.fullName}" (@${acc.username}) from Resident to Admin. (${auth.additionalAdminCount + 1} / ${auth.maxAdditionalAdmins} Resident-to-Admin slots used · ${auth.totalAdminCount + 1} / ${auth.maxTotalAdmins} total Admins)`
      );
    } finally {
      setAccountBusy(false);
    }
  };

  const handleDemoteAdmin = async (acc: PublicAccount) => {
    setAccountBusy(true);
    try {
      const res = await auth.demoteToResident(acc.id);
      if (!res.ok) {
        setAccountFeedback(res.error);
        return;
      }
      setAccountFeedback(
        `Changed "${acc.fullName}" (@${acc.username}) from Admin back to Resident.`
      );
    } finally {
      setAccountBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Tower 3 OIL quarters management summary across all 6 floors, billing ledgers, pending approvals, and portal accounts."
      />

      {/* Portal Access & Storage Notice */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-950">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div className="space-y-1.5">
            <div className="font-semibold">
              Cross-Device Login Active · Local Prototype Portal Records
            </div>
            <p className="text-xs leading-relaxed text-amber-900">
              Admin and Resident logins (User ID, encrypted password, and Security Question) work
              across web browsers and mobile devices after one-time signup. Community ledgers
              (bills, expenses, notices, and directory entries) remain stored locally in this
              browser — export a JSON backup to move records between devices.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#132d52]"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out &amp; Switch Account</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('backup')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
              >
                <DatabaseBackup className="h-3.5 w-3.5" />
                <span>Backup &amp; Restore JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Shortcuts Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('residents')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sky-300"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Resident Names Added</span>
            <Users className="h-4 w-4 text-sky-600" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {state.units.filter((u) => u.resident !== null).length} / 24
          </div>
          <div className="mt-1 text-xs text-sky-700 font-medium">Manage Residents →</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('expenses')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sky-300"
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Pending Expense Approvals</span>
            <ReceiptIndianRupee className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {pendingExpensesCount}
          </div>
          <div className="mt-1 text-xs text-sky-700 font-medium">Review Expenses →</div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('maintenance')}
          className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-sky-300"
        >
          <div className="text-xs text-slate-500">Active Maintenance Tickets</div>
          <div className="mt-1.5 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {openMaintenanceCount}
          </div>
          <div className="mt-1 text-xs text-sky-700 font-medium">Update Statuses →</div>
        </button>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Last JSON Backup</div>
          <div className="mt-1.5 font-mono text-sm font-bold text-slate-900 tabular-nums">
            {state.lastBackupAt ? state.lastBackupAt.replace('T', ' ').slice(0, 16) : 'Not backed up yet'}
          </div>
          <button
            type="button"
            onClick={() => onNavigate('backup')}
            className="mt-2 text-xs font-semibold text-sky-700 hover:underline"
          >
            Go to Backup &amp; Restore →
          </button>
        </div>
      </div>

      {/* Multi-Month Financial Ledger Summary */}
      <section className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Monthly Financial Summary</h2>
            <p className="text-xs text-slate-500">
              Company-allotted OIL quarters — no fixed monthly fee. Displays billing months created
              by Admin.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('bills')}
            className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap"
          >
            Open Billing Ledger →
          </button>
        </div>
        {monthSummaries.length === 0 ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-slate-600">
              No monthly bills have been created yet. Create a monthly bill whenever a shared
              collection is required.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('bills')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Monthly Bills</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Base Shared</th>
                  <th className="px-4 py-3 text-right">Approved Extras</th>
                  <th className="px-4 py-3 text-right">Collected</th>
                  <th className="px-4 py-3 text-right">Pending</th>
                  <th className="px-4 py-3 text-right">Units Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {monthSummaries.map((ms) => (
                  <tr key={ms.month}>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {formatMonthLabel(ms.month)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {formatINR(ms.baseBudget)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {formatINR(ms.approvedExtrasTotal)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatINR(ms.totalCollected)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-red-600 tabular-nums">
                      {formatINR(ms.totalPending)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {ms.paidCount}/{ms.billCount} ({ms.collectionPercent}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Floor Directory Summary & Local Data Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Floor Directory Summary</h2>
            <p className="text-xs text-slate-500">
              Company-allotted OIL quarters (6 Floors · 24 Units: 049–072 · transferable occupancy)
            </p>
          </div>
          <button
            type="button"
            onClick={() => setResetConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Local Portal Data</span>
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOWER_FLOORS.map((fl) => {
            const floorUnits = state.units.filter((u) => u.floor === fl.floor);
            const named = floorUnits.filter((u) => u.resident !== null).length;
            return (
              <div
                key={fl.floor}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">Floor {fl.floor}</div>
                  <div className="font-mono text-xs text-slate-500">
                    Units {fl.units.join(', ')}
                  </div>
                </div>
                <div className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                  {named} / 4 Named
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Registered Portal Accounts Directory (Max 3 Admins: 1st Admin + up to 2 Residents promoted) */}
      <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-bold text-slate-900">Registered Portal Accounts</h2>
              <span className="font-mono text-xs font-semibold text-[#0B1F3A] bg-sky-50 border border-sky-200 rounded-md px-2 py-0.5 tabular-nums">
                Admins: {auth.totalAdminCount} / {auth.maxTotalAdmins} · Promoted Residents:{' '}
                {auth.additionalAdminCount} / {auth.maxAdditionalAdmins}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Maximum {auth.maxTotalAdmins} Admins allowed (1st Admin + up to{' '}
              {auth.maxAdditionalAdmins} Resident accounts changed to Admin). Only the 1st Admin can
              promote Residents or change them back.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={accountBusy}
              onClick={() => void auth.refreshAccounts()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountError(null);
                setCreateAccountOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-700 whitespace-nowrap"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Add Resident Account</span>
            </button>
          </div>
        </div>

        {!isPrimaryAdmin && (
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-2.5 text-xs text-slate-600">
            Signed in as a promoted Admin. Only the{' '}
            <span className="font-semibold text-slate-800">1st Admin</span> can change up to{' '}
            {auth.maxAdditionalAdmins} Resident accounts to Admin or revert Admin roles.
          </div>
        )}

        {accountFeedback && (
          <div
            role="status"
            className="flex items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-5 py-2.5 text-xs text-sky-900"
          >
            <span>{accountFeedback}</span>
            <button
              type="button"
              onClick={() => setAccountFeedback(null)}
              className="font-semibold text-sky-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="divide-y divide-slate-200">
          {sortedAccounts.map((acc) => {
            const isSelf = auth.session?.accountId === acc.id;
            const isAccPrimary = acc.role === 'admin' && Boolean(acc.isPrimaryAdmin);
            const canDelete =
              !isSelf && !isAccPrimary && (acc.role === 'resident' || isPrimaryAdmin);

            return (
              <div
                key={acc.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      acc.role === 'admin'
                        ? 'bg-[#0B1F3A] text-white'
                        : 'bg-sky-100 text-sky-700'
                    }`}
                  >
                    {acc.role === 'admin' ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <User className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900">{acc.fullName}</span>
                      <span className="font-mono text-xs text-slate-500">@{acc.username}</span>
                      {isSelf && (
                        <span className="text-[11px] font-semibold text-sky-700">(Signed in)</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500">
                      {acc.role === 'admin'
                        ? `${isAccPrimary ? '1st Admin (Primary)' : 'Admin (Promoted from Resident)'}${
                            acc.designation ? ` · ${acc.designation}` : ''
                          }${acc.unitNumber ? ` · Unit ${acc.unitNumber}` : ''}`
                        : `Resident · Unit ${acc.unitNumber || '—'}`}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isPrimaryAdmin && acc.role === 'resident' && (
                    <button
                      type="button"
                      disabled={adminSlotsRemaining === 0 || accountBusy}
                      onClick={() => void handlePromoteResident(acc)}
                      aria-label={`Make ${acc.fullName} Admin`}
                      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        adminSlotsRemaining === 0
                          ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400'
                          : 'bg-[#0B1F3A] text-white hover:bg-[#132d52]'
                      }`}
                    >
                      <ShieldPlus className="h-3.5 w-3.5" />
                      <span>
                        {adminSlotsRemaining === 0
                          ? `Limit Reached (${auth.maxAdditionalAdmins}/${auth.maxAdditionalAdmins})`
                          : 'Make Admin'}
                      </span>
                    </button>
                  )}

                  {isPrimaryAdmin && acc.role === 'admin' && !isAccPrimary && !isSelf && (
                    <button
                      type="button"
                      disabled={accountBusy}
                      onClick={() => void handleDemoteAdmin(acc)}
                      aria-label={`Change ${acc.fullName} to Resident`}
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                      <span>Change to Resident</span>
                    </button>
                  )}

                  {canDelete && (
                    <button
                      type="button"
                      disabled={accountBusy}
                      onClick={() => setDeletingAccount(acc)}
                      aria-label={`Delete account ${acc.username}`}
                      className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Add Resident Account Modal */}
      <Modal
        open={createAccountOpen}
        onClose={() => setCreateAccountOpen(false)}
        title="Add Resident Account"
        subtitle="Create a Resident login (no email needed). The 1st Admin can then promote up to 2 Residents to Admin."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateResidentAccount} className="space-y-4">
          {accountError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {accountError}
            </div>
          )}

          <div>
            <label htmlFor="new-acc-name" className="block text-xs font-semibold text-slate-700">
              Full Name *
            </label>
            <input
              id="new-acc-name"
              type="text"
              value={newAccFullName}
              onChange={(e) => setNewAccFullName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-acc-unit" className="block text-xs font-semibold text-slate-700">
                Tower 3 Unit *
              </label>
              <select
                id="new-acc-unit"
                value={newAccUnit}
                onChange={(e) => setNewAccUnit(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              >
                {ALL_UNIT_NUMBERS.map((u) => (
                  <option key={u} value={u}>
                    Unit {u}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="new-acc-user" className="block text-xs font-semibold text-slate-700">
                User ID *
              </label>
              <input
                id="new-acc-user"
                type="text"
                value={newAccUsername}
                onChange={(e) => setNewAccUsername(e.target.value)}
                placeholder="3–24 chars"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-acc-pass" className="block text-xs font-semibold text-slate-700">
                Password *
              </label>
              <input
                id="new-acc-pass"
                type="password"
                value={newAccPassword}
                onChange={(e) => setNewAccPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="new-acc-confirm" className="block text-xs font-semibold text-slate-700">
                Confirm Password *
              </label>
              <input
                id="new-acc-confirm"
                type="password"
                value={newAccConfirm}
                onChange={(e) => setNewAccConfirm(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2.5 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1F3A]">
              <HelpCircle className="h-3.5 w-3.5 text-sky-600" />
              <span>Security Question &amp; Answer (Mandatory) *</span>
            </div>
            <div>
              <label htmlFor="new-acc-question" className="block text-xs font-semibold text-slate-700">
                Security Question *
              </label>
              <select
                id="new-acc-question"
                value={newAccQuestion}
                onChange={(e) => setNewAccQuestion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
                <option value={CUSTOM_QUESTION_VALUE}>Write custom question...</option>
              </select>
            </div>
            {newAccQuestion === CUSTOM_QUESTION_VALUE && (
              <div>
                <label
                  htmlFor="new-acc-custom-question"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Custom Question *
                </label>
                <input
                  id="new-acc-custom-question"
                  type="text"
                  value={newAccCustomQuestion}
                  onChange={(e) => setNewAccCustomQuestion(e.target.value)}
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            )}
            <div>
              <label htmlFor="new-acc-answer" className="block text-xs font-semibold text-slate-700">
                Security Answer *
              </label>
              <input
                id="new-acc-answer"
                type="text"
                value={newAccAnswer}
                onChange={(e) => setNewAccAnswer(e.target.value)}
                placeholder="Used for password reset"
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCreateAccountOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={accountBusy}
              className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#132d52] disabled:opacity-60"
            >
              {accountBusy ? 'Creating...' : 'Create Resident Account'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingAccount)}
        onClose={() => setDeletingAccount(null)}
        onConfirm={() => void handleConfirmDeleteAccount()}
        title="Remove Portal Account?"
        description={
          deletingAccount
            ? `Remove login "@${deletingAccount.username}" (${deletingAccount.fullName})? Historical billing and directory records will remain intact.`
            : ''
        }
        confirmLabel="Remove Account"
      />

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={resetToSeedData}
        title="Reset Local Browser Data?"
        description="This will clear all locally saved bills, expenses, notices, alerts, meetings, and resident entries in this browser. Export a JSON backup first if you want to keep your changes."
        confirmLabel="Reset Portal Data"
      />
    </div>
  );
}
