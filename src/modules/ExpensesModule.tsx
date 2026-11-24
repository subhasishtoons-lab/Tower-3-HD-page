import React, { useMemo, useState } from 'react';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { ExpenseApprovalStatus, ExpenseRecord } from '../types';
import { formatINR, formatMonthLabel, roundCurrency } from '../utils/finance';
import { TOTAL_UNITS } from '../utils/residents';

const EXPENSE_CATEGORIES: ExpenseRecord['category'][] = [
  'Sanitation Supplies',
  'Common Area Repair',
  'Lift Maintenance',
  'Electrical Common',
  'Garden & Grounds',
  'Security',
  'Community Event',
  'Other',
];

interface ExpensesModuleProps {
  store: TowerStore;
}

export function ExpensesModule({ store }: ExpensesModuleProps) {
  const { state, localRole, addExpense, updateExpenseStatus, deleteExpense } = store;
  const isAdmin = localRole === 'admin';

  const [statusFilter, setStatusFilter] = useState<'all' | ExpenseApprovalStatus>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ExpenseRecord | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseRecord['category']>('Common Area Repair');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [billingMonth, setBillingMonth] = useState(new Date().toISOString().slice(0, 7));
  const [vendor, setVendor] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<ExpenseApprovalStatus>('approved');
  const [splitEqually, setSplitEqually] = useState(true);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filteredExpenses = useMemo(
    () =>
      state.expenses
        .filter((e) => (statusFilter === 'all' ? true : e.approvalStatus === statusFilter))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.expenses, statusFilter]
  );

  const totalApproved = useMemo(
    () =>
      roundCurrency(
        state.expenses
          .filter((e) => e.approvalStatus === 'approved')
          .reduce((sum, e) => sum + e.amount, 0)
      ),
    [state.expenses]
  );

  const totalPending = useMemo(
    () =>
      roundCurrency(
        state.expenses
          .filter((e) => e.approvalStatus === 'pending')
          .reduce((sum, e) => sum + e.amount, 0)
      ),
    [state.expenses]
  );

  const parsedAmount = Number(amount);
  const previewPerUnit =
    !Number.isNaN(parsedAmount) && parsedAmount > 0 ? roundCurrency(parsedAmount / TOTAL_UNITS) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || title.trim().length < 3) {
      setError('Please enter an expense title (at least 3 characters).');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount in INR.');
      return;
    }
    if (!vendor.trim()) {
      setError('Please enter the vendor or payee name.');
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(billingMonth)) {
      setError('Please choose a valid billing month.');
      return;
    }

    addExpense({
      title: title.trim(),
      category,
      amount: roundCurrency(parsedAmount),
      date,
      billingMonth,
      vendor: vendor.trim(),
      approvalStatus: isAdmin ? approvalStatus : 'pending',
      splitEqually,
      approvedBy: approvalStatus === 'approved' && isAdmin ? 'Tower 3 Admin (Local)' : undefined,
      notes: notes.trim(),
    });

    setTitle('');
    setAmount('');
    setVendor('');
    setNotes('');
    setError(null);
    setModalOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="Shared Expenses"
        description="Company-allotted OIL quarters — no fixed amounts are pre-filled. Record shared expenses only when required; approved items divide equally across all 24 units by default."
        action={
          <button
            type="button"
            onClick={() => {
              setError(null);
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Expense</span>
          </button>
        }
      />

      {/* Summary Row */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Total Approved Expenses</div>
          <div className="mt-1 font-mono text-xl font-bold text-slate-900 tabular-nums">
            {formatINR(totalApproved)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Included in monthly unit splits</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Pending Approval</div>
          <div className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">
            {formatINR(totalPending)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Excluded from bills until approved</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-medium text-slate-500">Default Division Rule</div>
          <div className="mt-1 font-display text-xl font-bold text-[#0B1F3A]">Equal ÷ 24 Units</div>
          <div className="mt-1 text-xs text-slate-500">
            Variable amounts — added only when needed
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          {(['all', 'approved', 'pending', 'rejected'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filteredExpenses.length === 0 ? (
        <EmptyState
          icon={<Plus className="h-5 w-5" />}
          title="No expenses recorded yet"
          description="No expenses are pre-filled. Use the + Add Expense button whenever a shared Tower 3 expense needs to be logged."
          action={
            <button
              type="button"
              onClick={() => {
                setError(null);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Add Expense</span>
            </button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="px-4 py-3">Date &amp; Month</th>
                  <th className="px-4 py-3">Expense &amp; Vendor</th>
                  <th className="px-4 py-3 text-right">Total Amount</th>
                  <th className="px-4 py-3 text-right">Per Unit (÷24)</th>
                  <th className="px-4 py-3">Approval</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3.5 align-top whitespace-nowrap">
                      <div className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {exp.date}
                      </div>
                      <div className="text-xs text-slate-500">
                        Bill: {formatMonthLabel(exp.billingMonth)}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-semibold text-slate-900">{exp.title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {exp.category} · Vendor: {exp.vendor}
                      </div>
                      {exp.notes && <div className="mt-1 text-xs text-slate-600">{exp.notes}</div>}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right font-mono text-sky-700 tabular-nums">
                      {exp.splitEqually ? formatINR(roundCurrency(exp.amount / TOTAL_UNITS)) : 'Custom'}
                    </td>
                    <td className="px-4 py-3.5 align-top">
                      <div
                        className={`text-xs font-semibold capitalize ${
                          exp.approvalStatus === 'approved'
                            ? 'text-emerald-700'
                            : exp.approvalStatus === 'pending'
                            ? 'text-amber-700'
                            : 'text-red-600'
                        }`}
                      >
                        {exp.approvalStatus}
                      </div>
                      {exp.approvedBy && (
                        <div className="mt-0.5 text-[11px] text-slate-500">By {exp.approvedBy}</div>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {exp.approvalStatus !== 'approved' && (
                            <button
                              type="button"
                              onClick={() => updateExpenseStatus(exp.id, 'approved')}
                              aria-label={`Approve expense ${exp.title}`}
                              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </button>
                          )}
                          {exp.approvalStatus === 'pending' && (
                            <button
                              type="button"
                              onClick={() => updateExpenseStatus(exp.id, 'rejected')}
                              aria-label={`Reject expense ${exp.title}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                            >
                              <X className="h-3.5 w-3.5" />
                              <span>Reject</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(exp)}
                            aria-label={`Delete expense ${exp.title}`}
                            className="inline-flex items-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-700 hover:bg-red-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Record Additional Community Expense"
        subtitle="Approved expenses split equally across all 24 units and sync automatically with unpaid bills for the selected month."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="exp-title" className="block text-xs font-semibold text-slate-700">
              Expense Title *
            </label>
            <input
              id="exp-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lobby LED Bulb Replacement (6 Units)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exp-category" className="block text-xs font-semibold text-slate-700">
                Category
              </label>
              <select
                id="exp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseRecord['category'])}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exp-amount" className="block text-xs font-semibold text-slate-700">
                Total Amount (₹ INR) *
              </label>
              <input
                id="exp-amount"
                type="number"
                min={1}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter total amount"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
              {previewPerUnit > 0 && (
                <p className="mt-1 text-xs text-sky-700 font-mono tabular-nums">
                  Equal share: {formatINR(previewPerUnit)} / unit (÷ 24 units)
                </p>
              )}
            </div>

            <div>
              <label htmlFor="exp-date" className="block text-xs font-semibold text-slate-700">
                Expense Date
              </label>
              <input
                id="exp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="exp-month" className="block text-xs font-semibold text-slate-700">
                Billing Month *
              </label>
              <input
                id="exp-month"
                type="month"
                value={billingMonth}
                onChange={(e) => setBillingMonth(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="exp-vendor" className="block text-xs font-semibold text-slate-700">
                Vendor / Payee *
              </label>
              <input
                id="exp-vendor"
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="e.g., Duliajan Electricals"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="exp-status" className="block text-xs font-semibold text-slate-700">
                Approval Status
              </label>
              <select
                id="exp-status"
                value={isAdmin ? approvalStatus : 'pending'}
                disabled={!isAdmin}
                onChange={(e) => setApprovalStatus(e.target.value as ExpenseApprovalStatus)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="approved">Approved (Include in Billing)</option>
                <option value="pending">Pending Admin Approval</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={splitEqually}
              onChange={(e) => setSplitEqually(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-sky-600"
            />
            <span>Divide equally among all 24 units (default Tower 3 rule)</span>
          </label>

          <div>
            <label htmlFor="exp-notes" className="block text-xs font-semibold text-slate-700">
              Notes / Justification
            </label>
            <textarea
              id="exp-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Receipt number or meeting resolution reference..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Save Expense
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteExpense(deleteTarget.id);
        }}
        title="Delete Expense Record"
        description={
          deleteTarget
            ? `Remove "${deleteTarget.title}" (${formatINR(deleteTarget.amount)})? Unpaid bills for ${formatMonthLabel(deleteTarget.billingMonth)} will recalculate; paid bills remain untouched.`
            : ''
        }
        confirmLabel="Delete Expense"
      />
    </div>
  );
}
