import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Plus,
  ReceiptIndianRupee,
  RefreshCw,
  RotateCcw,
  Search,
} from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { TowerStore } from '../store/useTowerStore';
import type { MonthlyBill, PaymentMode } from '../types';
import {
  calculateMonthlyExtraShare,
  calculatePerUnitShare,
  formatINR,
  formatMonthLabel,
  summarizeMonthFinances,
} from '../utils/finance';

interface MonthlyBillsProps {
  store: TowerStore;
}

export function MonthlyBills({ store }: MonthlyBillsProps) {
  const { state, localRole, generateBillsForMonth, updateBillPayment } = store;

  const existingMonths = useMemo(
    () => Array.from(new Set(state.bills.map((b) => b.month))).sort().reverse(),
    [state.bills]
  );

  const defaultCurrentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonthState, setSelectedMonthState] = useState<string>(existingMonths[0] || '');
  const selectedMonth = existingMonths.includes(selectedMonthState)
    ? selectedMonthState
    : existingMonths[0] || '';

  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // Create Monthly Bills Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createMonth, setCreateMonth] = useState(defaultCurrentMonth);
  const [baseAmountInput, setBaseAmountInput] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // Payment Modal
  const [payingBill, setPayingBill] = useState<MonthlyBill | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [receiptRef, setReceiptRef] = useState('');
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));

  const isAdmin = localRole === 'admin';

  const summary = useMemo(
    () =>
      selectedMonth
        ? summarizeMonthFinances(state.bills, state.expenses, selectedMonth)
        : null,
    [state.bills, state.expenses, selectedMonth]
  );

  const extraBreakdown = useMemo(
    () =>
      selectedMonth
        ? calculateMonthlyExtraShare(state.expenses, selectedMonth)
        : { totalApprovedExtra: 0, perUnitExtraShare: 0, approvedExpenses: [] },
    [state.expenses, selectedMonth]
  );

  const createMonthExtraBreakdown = useMemo(
    () => calculateMonthlyExtraShare(state.expenses, createMonth),
    [state.expenses, createMonth]
  );

  const monthBills = useMemo(() => {
    if (!selectedMonth) return [];
    const q = search.trim().toLowerCase();
    return state.bills
      .filter((b) => b.month === selectedMonth)
      .filter((b) => (statusFilter === 'all' ? true : b.status === statusFilter))
      .filter((b) => {
        if (!q) return true;
        return (
          b.unitNumber.includes(q) ||
          b.residentNameSnapshot.toLowerCase().includes(q) ||
          (b.receiptRef?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
  }, [state.bills, selectedMonth, statusFilter, search]);

  const openCreateModal = () => {
    setCreateMonth(defaultCurrentMonth);
    setBaseAmountInput('');
    setCreateError(null);
    setCreateOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}-\d{2}$/.test(createMonth)) {
      setCreateError('Please choose a valid billing month (YYYY-MM).');
      return;
    }

    const trimmedBase = baseAmountInput.trim();
    const parsedBase = trimmedBase === '' ? 0 : Number(trimmedBase);
    if (Number.isNaN(parsedBase) || parsedBase < 0) {
      setCreateError('Base monthly amount cannot be negative.');
      return;
    }

    const result = generateBillsForMonth(createMonth, parsedBase);
    setSelectedMonthState(createMonth);
    setCreateOpen(false);
    setFeedback(
      `${formatMonthLabel(createMonth)}: ${result.createdCount} bills created, ${result.updatedUnpaidCount} unpaid updated, ${result.preservedPaidCount} paid preserved.`
    );
  };

  const handleSyncMonth = () => {
    if (!selectedMonth) return;
    const result = generateBillsForMonth(selectedMonth);
    setFeedback(
      `${formatMonthLabel(selectedMonth)}: ${result.updatedUnpaidCount} unpaid bills synced with latest approved expenses, ${result.preservedPaidCount} paid bills preserved immutable.`
    );
  };

  const openPaymentModal = (bill: MonthlyBill) => {
    setPayingBill(bill);
    setPaymentMode('UPI');
    setReceiptRef(`T3-${bill.month.replace('-', '')}-${bill.unitNumber}`);
    setPaidDate(new Date().toISOString().slice(0, 10));
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingBill) return;
    updateBillPayment(payingBill.id, 'paid', paymentMode, receiptRef, paidDate);
    setFeedback(
      `Recorded ${formatINR(payingBill.totalAmount)} payment for Unit ${payingBill.unitNumber} (${formatMonthLabel(payingBill.month)}).`
    );
    setPayingBill(null);
  };

  const parsedPreviewBase = baseAmountInput.trim() === '' ? 0 : Number(baseAmountInput);
  const previewBasePerUnit =
    !Number.isNaN(parsedPreviewBase) && parsedPreviewBase > 0
      ? calculatePerUnitShare(parsedPreviewBase)
      : 0;

  const averagePerUnitBase =
    summary && summary.billCount > 0 ? summary.baseBudget / summary.billCount : 0;

  return (
    <div>
      <PageHeader
        title="Monthly Maintenance Bills"
        description="Company-allotted OIL India Limited quarters — no fixed monthly amount is pre-set. Admin can create monthly bills with a variable shared amount whenever required. Zero electricity, water, or gas charges."
        action={
          isAdmin ? (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {selectedMonth && (
                <button
                  type="button"
                  onClick={handleSyncMonth}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Sync Unpaid</span>
                </button>
              )}
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 whitespace-nowrap"
              >
                <Plus className="h-4 w-4" />
                <span>Create Monthly Bills</span>
              </button>
            </div>
          ) : null
        }
      />

      {feedback && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900"
        >
          <span>{feedback}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold text-sky-700 hover:underline whitespace-nowrap"
          >
            Dismiss
          </button>
        </div>
      )}

      {existingMonths.length === 0 || !summary ? (
        <EmptyState
          icon={<ReceiptIndianRupee className="h-5 w-5" />}
          title="No monthly bills created yet"
          description="Tower 3 consists of company-allotted OIL quarters with no fixed society fee. When a shared monthly collection is needed, an Admin can create bills for all 24 units using the + button."
          action={
            isAdmin ? (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700"
              >
                <Plus className="h-4 w-4" />
                <span>Create Monthly Bills</span>
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Variable Billing Policy Strip */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <span className="font-semibold text-[#0B1F3A]">
              {formatMonthLabel(selectedMonth)} Breakdown:
            </span>{' '}
            Shared base total{' '}
            <span className="font-mono font-semibold">{formatINR(summary.baseBudget)}</span> (
            <span className="font-mono font-semibold text-sky-700">
              {formatINR(averagePerUnitBase)}
            </span>
            /unit) + approved extra expenses{' '}
            <span className="font-mono font-semibold">
              {formatINR(extraBreakdown.totalApprovedExtra)}
            </span>{' '}
            (
            <span className="font-mono font-semibold text-sky-700">
              {formatINR(extraBreakdown.perUnitExtraShare)}
            </span>
            /unit).{' '}
            <span className="font-medium text-slate-900">
              Zero electricity, water, or gas charges.
            </span>
          </div>

          {/* KPI Summary Cards */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Total Billed (24 Units)</div>
              <div className="mt-1.5 font-mono text-xl font-bold text-slate-900 tabular-nums">
                {formatINR(summary.totalBilled)}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Base share + {extraBreakdown.approvedExpenses.length} approved extra item(s)
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Collected</div>
              <div className="mt-1.5 font-mono text-xl font-bold text-emerald-700 tabular-nums">
                {formatINR(summary.totalCollected)}
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                {summary.paidCount} of {summary.billCount} units ({summary.collectionPercent}%)
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Pending Dues</div>
              <div className="mt-1.5 font-mono text-xl font-bold text-red-600 tabular-nums">
                {formatINR(summary.totalPending)}
              </div>
              <div className="mt-1 text-xs text-slate-500 tabular-nums">
                {summary.unpaidCount} units remaining
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-medium text-slate-500">Per-Unit Total</div>
              <div className="mt-1.5 font-mono text-xl font-bold text-[#0B1F3A] tabular-nums">
                {formatINR(averagePerUnitBase + extraBreakdown.perUnitExtraShare)}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono tabular-nums">
                {formatINR(averagePerUnitBase)} + {formatINR(extraBreakdown.perUnitExtraShare)}
              </div>
            </div>
          </div>

          {/* Month Selector & Filters */}
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="bill-month-select" className="text-xs font-semibold text-slate-600">
                Billing Month:
              </label>
              <select
                id="bill-month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonthState(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-900"
              >
                {existingMonths.map((m) => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)} ({m})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                {(['all', 'unpaid', 'paid'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setStatusFilter(tab)}
                    className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                      statusFilter === tab
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'all'
                      ? `All (${summary.billCount})`
                      : tab === 'paid'
                      ? `Paid (${summary.paidCount})`
                      : `Unpaid (${summary.unpaidCount})`}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search unit or resident..."
                aria-label="Search monthly bills"
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {/* Bills Table */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3">Unit</th>
                    <th className="px-4 py-3">Resident Snapshot</th>
                    <th className="px-4 py-3 text-right">Base Share</th>
                    <th className="px-4 py-3 text-right">Extra Approved</th>
                    <th className="px-4 py-3 text-right">Total Due</th>
                    <th className="px-4 py-3">Payment Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {monthBills.map((bill) => {
                    const currentUnit = state.units.find((u) => u.unitNumber === bill.unitNumber);
                    const residentChangedSinceBill =
                      Boolean(bill.residentNameSnapshot) &&
                      Boolean(currentUnit?.resident) &&
                      bill.residentNameSnapshot !== currentUnit!.resident!.fullName;

                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3 font-mono font-bold text-[#0B1F3A] tabular-nums whitespace-nowrap">
                          Unit {bill.unitNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className={
                              bill.residentNameSnapshot
                                ? 'font-medium text-slate-900'
                                : 'text-slate-400'
                            }
                          >
                            {bill.residentNameSnapshot || '—'}
                          </div>
                          {residentChangedSinceBill && (
                            <div className="text-[11px] text-slate-500">
                              Historical record · Current resident: {currentUnit?.resident?.fullName}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                          {formatINR(bill.cleanerShare)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                          {formatINR(bill.extraExpensesShare)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                          {formatINR(bill.totalAmount)}
                        </td>
                        <td className="px-4 py-3">
                          {bill.status === 'paid' ? (
                            <div>
                              <div className="text-xs font-semibold text-emerald-700">
                                Paid · {bill.paymentMode}
                              </div>
                              <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                                {bill.paidAt} · {bill.receiptRef}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs font-semibold text-red-600">Unpaid</div>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {bill.status === 'unpaid' ? (
                              <button
                                type="button"
                                onClick={() => openPaymentModal(bill)}
                                aria-label={`Mark Unit ${bill.unitNumber} bill paid`}
                                className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Mark Paid</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateBillPayment(bill.id, 'unpaid')}
                                aria-label={`Revert Unit ${bill.unitNumber} payment to unpaid`}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Mark Unpaid</span>
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Create Monthly Bills Modal (Variable Amount) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Monthly Bills (24 Units)"
        subtitle="Enter the variable monthly amount to split equally across Units 049–072. No fixed amount is pre-filled."
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {createError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
            >
              {createError}
            </div>
          )}

          <div>
            <label htmlFor="create-bill-month" className="block text-xs font-semibold text-slate-700">
              Billing Month *
            </label>
            <input
              id="create-bill-month"
              type="month"
              value={createMonth}
              onChange={(e) => setCreateMonth(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>

          <div>
            <label htmlFor="create-bill-base" className="block text-xs font-semibold text-slate-700">
              Total Base Monthly Amount for Tower 3 (₹ INR — Optional)
            </label>
            <input
              id="create-bill-base"
              type="number"
              min={0}
              step="0.01"
              value={baseAmountInput}
              onChange={(e) => setBaseAmountInput(e.target.value)}
              placeholder="Enter variable monthly total (leave blank for ₹0)"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
            {previewBasePerUnit > 0 && (
              <p className="mt-1 text-xs font-mono text-sky-700 tabular-nums">
                Base share per unit: {formatINR(previewBasePerUnit)} (÷ 24 units)
              </p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
            <div className="flex justify-between">
              <span>Approved extra expenses ({formatMonthLabel(createMonth)}):</span>
              <span className="font-mono font-semibold tabular-nums">
                {formatINR(createMonthExtraBreakdown.totalApprovedExtra)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Estimated total per unit (÷ 24):</span>
              <span className="font-mono font-bold text-[#0B1F3A] tabular-nums">
                {formatINR(previewBasePerUnit + createMonthExtraBreakdown.perUnitExtraShare)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              Create 24 Unit Bills
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={Boolean(payingBill)}
        onClose={() => setPayingBill(null)}
        title={payingBill ? `Record Payment — Unit ${payingBill.unitNumber}` : ''}
        subtitle={
          payingBill
            ? `${formatMonthLabel(payingBill.month)}${
                payingBill.residentNameSnapshot ? ` · ${payingBill.residentNameSnapshot}` : ''
              }`
            : ''
        }
        maxWidthClass="max-w-md"
      >
        {payingBill && (
          <form onSubmit={handleConfirmPayment} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Base Monthly Share</span>
                <span className="font-mono tabular-nums">{formatINR(payingBill.cleanerShare)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-600">Approved Extra Expenses Share</span>
                <span className="font-mono tabular-nums">
                  {formatINR(payingBill.extraExpensesShare)}
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Total Amount Received</span>
                <span className="font-mono tabular-nums">{formatINR(payingBill.totalAmount)}</span>
              </div>
            </div>

            <div>
              <label htmlFor="pay-mode" className="block text-xs font-semibold text-slate-700">
                Payment Mode
              </label>
              <select
                id="pay-mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            <div>
              <label htmlFor="pay-date" className="block text-xs font-semibold text-slate-700">
                Payment Date
              </label>
              <input
                id="pay-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label htmlFor="pay-ref" className="block text-xs font-semibold text-slate-700">
                Receipt / Transaction Reference
              </label>
              <input
                id="pay-ref"
                type="text"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setPayingBill(null)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
              >
                Confirm Payment
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
