import type { ExpenseRecord, MonthlyBill, PaymentMode, UnitInfo } from '../types';
import { TOTAL_UNITS, createId } from './residents';

/**
 * Tower 3 Variable Billing Rules (Company-Allotted Quarters):
 * - No fixed monthly charge is preset; Tower 3 is OIL company-allotted housing, not a private society.
 * - Whenever a shared monthly contribution or approved expense is required, an Admin enters the actual amount
 *   and it is divided equally among the 24 units by default.
 * - Zero electricity, water, or gas charges are collected through TOWER 3 HD.
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculatePerUnitShare(totalAmount: number): number {
  if (!Number.isFinite(totalAmount) || totalAmount <= 0) return 0;
  return roundCurrency(totalAmount / TOTAL_UNITS);
}

export function getApprovedExpensesForMonth(
  expenses: ExpenseRecord[],
  month: string
): ExpenseRecord[] {
  return expenses.filter(
    (e) => e.billingMonth === month && e.approvalStatus === 'approved' && e.splitEqually
  );
}

export function calculateMonthlyExtraShare(
  expenses: ExpenseRecord[],
  month: string
): {
  approvedExpenses: ExpenseRecord[];
  totalApprovedExtra: number;
  perUnitExtraShare: number;
} {
  const approvedExpenses = getApprovedExpensesForMonth(expenses, month);
  const totalApprovedExtra = roundCurrency(
    approvedExpenses.reduce((sum, item) => sum + item.amount, 0)
  );
  const perUnitExtraShare = calculatePerUnitShare(totalApprovedExtra);
  return {
    approvedExpenses,
    totalApprovedExtra,
    perUnitExtraShare,
  };
}

/**
 * Generates or syncs bills for all 24 units for a given YYYY-MM month.
 * - `baseMonthlyAmount` is optional and variable (never fixed). If provided, divided equally across 24 units.
 *   If omitted during an expense re-sync, existing unpaid bills retain their previously set base share.
 * - Paid bills remain strictly immutable so historical records are never altered.
 * - Resident name snapshots are preserved when residents later transfer.
 */
export function generateMonthlyBills(
  existingBills: MonthlyBill[],
  units: UnitInfo[],
  expenses: ExpenseRecord[],
  month: string,
  baseMonthlyAmount?: number
): {
  bills: MonthlyBill[];
  createdCount: number;
  updatedUnpaidCount: number;
  preservedPaidCount: number;
} {
  const explicitBaseShare =
    baseMonthlyAmount !== undefined ? calculatePerUnitShare(baseMonthlyAmount) : undefined;
  const { approvedExpenses, perUnitExtraShare } = calculateMonthlyExtraShare(expenses, month);
  const extraExpenseIds = approvedExpenses.map((e) => e.id);
  const now = new Date().toISOString();

  const existingByUnit = new Map<string, MonthlyBill>();
  for (const bill of existingBills) {
    if (bill.month === month) {
      existingByUnit.set(bill.unitNumber, bill);
    }
  }

  let createdCount = 0;
  let updatedUnpaidCount = 0;
  let preservedPaidCount = 0;

  const otherMonthBills = existingBills.filter((b) => b.month !== month);
  const monthBills: MonthlyBill[] = [];

  for (const unit of units) {
    const existing = existingByUnit.get(unit.unitNumber);
    if (existing) {
      if (existing.status === 'paid') {
        // Paid transactions are strictly immutable
        monthBills.push(existing);
        preservedPaidCount += 1;
      } else {
        const nextBaseShare = explicitBaseShare !== undefined ? explicitBaseShare : existing.cleanerShare;
        const expectedTotal = roundCurrency(nextBaseShare + perUnitExtraShare);
        const shouldFillBlankName = !existing.residentNameSnapshot && Boolean(unit.resident);
        const needsUpdate =
          existing.cleanerShare !== nextBaseShare ||
          existing.extraExpensesShare !== perUnitExtraShare ||
          existing.totalAmount !== expectedTotal ||
          shouldFillBlankName;
        if (needsUpdate) {
          monthBills.push({
            ...existing,
            residentIdSnapshot: shouldFillBlankName
              ? unit.resident?.id ?? null
              : existing.residentIdSnapshot,
            residentNameSnapshot: shouldFillBlankName
              ? unit.resident?.fullName ?? ''
              : existing.residentNameSnapshot,
            cleanerShare: nextBaseShare,
            extraExpensesShare: perUnitExtraShare,
            extraExpenseIds,
            totalAmount: expectedTotal,
          });
          updatedUnpaidCount += 1;
        } else {
          monthBills.push(existing);
        }
      }
    } else {
      const baseShare = explicitBaseShare ?? 0;
      const expectedTotal = roundCurrency(baseShare + perUnitExtraShare);
      monthBills.push({
        id: createId(`bill_${month}_${unit.unitNumber}`),
        month,
        unitNumber: unit.unitNumber,
        residentIdSnapshot: unit.resident ? unit.resident.id : null,
        residentNameSnapshot: unit.resident ? unit.resident.fullName : '',
        cleanerShare: baseShare,
        extraExpensesShare: perUnitExtraShare,
        extraExpenseIds,
        totalAmount: expectedTotal,
        status: 'unpaid',
        generatedAt: now,
      });
      createdCount += 1;
    }
  }

  return {
    bills: [...monthBills, ...otherMonthBills],
    createdCount,
    updatedUnpaidCount,
    preservedPaidCount,
  };
}

export function markBillPayment(
  bills: MonthlyBill[],
  billId: string,
  status: 'paid' | 'unpaid',
  paymentMode?: PaymentMode,
  receiptRef?: string,
  paidAt?: string
): MonthlyBill[] {
  return bills.map((bill) => {
    if (bill.id !== billId) return bill;
    if (status === 'paid') {
      return {
        ...bill,
        status: 'paid',
        paymentMode: paymentMode || 'UPI',
        receiptRef: receiptRef?.trim() || `T3-${bill.month.replace('-', '')}-${bill.unitNumber}`,
        paidAt: paidAt || new Date().toISOString().slice(0, 10),
      };
    }
    return {
      ...bill,
      status: 'unpaid',
      paymentMode: undefined,
      receiptRef: undefined,
      paidAt: undefined,
    };
  });
}

export interface MonthFinancialSummary {
  month: string;
  billCount: number;
  paidCount: number;
  unpaidCount: number;
  totalBilled: number;
  totalCollected: number;
  totalPending: number;
  baseBudget: number;
  approvedExtrasTotal: number;
  collectionPercent: number;
}

export function summarizeMonthFinances(
  bills: MonthlyBill[],
  expenses: ExpenseRecord[],
  month: string
): MonthFinancialSummary {
  const monthBills = bills.filter((b) => b.month === month);
  const paidBills = monthBills.filter((b) => b.status === 'paid');
  const unpaidBills = monthBills.filter((b) => b.status === 'unpaid');
  const totalBilled = roundCurrency(monthBills.reduce((s, b) => s + b.totalAmount, 0));
  const totalCollected = roundCurrency(paidBills.reduce((s, b) => s + b.totalAmount, 0));
  const totalPending = roundCurrency(unpaidBills.reduce((s, b) => s + b.totalAmount, 0));
  const baseBudget = roundCurrency(monthBills.reduce((s, b) => s + b.cleanerShare, 0));
  const { totalApprovedExtra } = calculateMonthlyExtraShare(expenses, month);
  const collectionPercent =
    totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return {
    month,
    billCount: monthBills.length,
    paidCount: paidBills.length,
    unpaidCount: unpaidBills.length,
    totalBilled,
    totalCollected,
    totalPending,
    baseBudget,
    approvedExtrasTotal: totalApprovedExtra,
    collectionPercent,
  };
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatMonthLabel(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  const year = Number(yearStr);
  const monthIdx = Number(monthStr) - 1;
  if (!year || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) {
    return ym;
  }
  const date = new Date(year, monthIdx, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}
