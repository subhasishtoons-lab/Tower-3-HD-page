import test from 'node:test';
import assert from 'node:assert/strict';
import { NEARBY_DISTANCES, createSeedData } from '../data/seedData';
import type { ExpenseRecord } from '../types';
import {
  calculateMonthlyExtraShare,
  calculatePerUnitShare,
  generateMonthlyBills,
  markBillPayment,
  summarizeMonthFinances,
} from './finance';
import {
  ALL_UNIT_NUMBERS,
  addResidentToUnit,
  removeResidentFromUnit,
  replaceResidentInUnit,
  validateResidentInput,
} from './residents';

test('Tower 3 has exactly 24 units from 049 to 072 and all 6 nearby landmark distances', () => {
  assert.equal(ALL_UNIT_NUMBERS.length, 24);
  assert.equal(ALL_UNIT_NUMBERS[0], '049');
  assert.equal(ALL_UNIT_NUMBERS[23], '072');
  assert.equal(NEARBY_DISTANCES.length, 6);
  assert.equal(NEARBY_DISTANCES.find((d) => d.place === 'OIL Medical')?.distance, '100 metres');
  assert.equal(NEARBY_DISTANCES.find((d) => d.place === 'OIL Co-operative')?.distance, '700 metres');
});

test('Seed data starts clean with zero pre-filled bills, expenses, notices, alerts, meetings, maintenance tickets, or office bearers', () => {
  const seed = createSeedData();
  assert.equal(seed.units.length, 24);
  assert.equal(seed.units.every((u) => u.resident === null), true);
  assert.equal(seed.bills.length, 0);
  assert.equal(seed.expenses.length, 0);
  assert.equal(seed.notices.length, 0);
  assert.equal(seed.emergencies.length, 0);
  assert.equal(seed.meetings.length, 0);
  assert.equal(seed.maintenanceRequests.length, 0);
  assert.equal(seed.discussions.length, 0);
  assert.equal(seed.committeeMembers.length, 0);
  assert.equal(seed.activityLogs.length, 0);
});

test('Variable monthly amount and approved expenses divide equally among 24 units', () => {
  assert.equal(calculatePerUnitShare(0), 0);
  assert.equal(calculatePerUnitShare(6000), 250);

  const sampleExpenses: ExpenseRecord[] = [
    {
      id: 'exp_1',
      title: 'Approved Gate Repair',
      category: 'Common Area Repair',
      amount: 2400,
      date: '2026-11-10',
      billingMonth: '2026-11',
      vendor: 'Local Welder',
      approvalStatus: 'approved',
      splitEqually: true,
      createdAt: '2026-11-10T10:00:00.000Z',
    },
    {
      id: 'exp_2',
      title: 'Pending Glass Work',
      category: 'Common Area Repair',
      amount: 1200,
      date: '2026-11-12',
      billingMonth: '2026-11',
      vendor: 'Glass Shop',
      approvalStatus: 'pending',
      splitEqually: true,
      createdAt: '2026-11-12T10:00:00.000Z',
    },
  ];

  const result = calculateMonthlyExtraShare(sampleExpenses, '2026-11');
  assert.equal(result.totalApprovedExtra, 2400);
  assert.equal(result.perUnitExtraShare, 100);
  assert.equal(result.approvedExpenses.length, 1);
});

test('Replacing a resident archives transfer history and preserves historical billing snapshots', () => {
  const seed = createSeedData();

  const initialAdd = addResidentToUnit(seed.units, {
    unitNumber: '049',
    fullName: 'Subhasish Das',
    oilEmployeeId: '',
    department: '',
    phone: '',
    familyMembers: 1,
    vehicleNumbers: '',
    moveInDate: '2026-09-01',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });

  // Admin generates September 2026 bills with a variable base amount of ₹4,800 (₹200/unit)
  const sepGenerated = generateMonthlyBills(
    seed.bills,
    initialAdd.units,
    seed.expenses,
    '2026-09',
    4800
  );
  const sep049 = sepGenerated.bills.find((b) => b.month === '2026-09' && b.unitNumber === '049');
  assert.ok(sep049);
  assert.equal(sep049.residentNameSnapshot, 'Subhasish Das');
  assert.equal(sep049.cleanerShare, 200);
  assert.equal(sep049.totalAmount, 200);

  const paidSepBills = markBillPayment(
    sepGenerated.bills,
    sep049.id,
    'paid',
    'UPI',
    'T3-202609-049',
    '2026-09-10'
  );

  // Replace Unit 049 resident with a new resident
  const transfer = replaceResidentInUnit(
    initialAdd.units,
    seed.residentHistory,
    {
      unitNumber: '049',
      fullName: 'Arup Kumar Baruah',
      oilEmployeeId: 'OIL-PRD-5901',
      department: 'Production',
      phone: '+91 94350 99049',
      familyMembers: 3,
      vehicleNumbers: 'AS-06-ZZ-0049',
      moveInDate: '2026-11-20',
      emergencyContactName: 'Rina Baruah',
      emergencyContactPhone: '+91 94350 99048',
    },
    'Transfer to OIL Noida Office',
    '2026-11-19'
  );

  const unit049 = transfer.units.find((u) => u.unitNumber === '049');
  assert.equal(unit049?.resident?.fullName, 'Arup Kumar Baruah');
  assert.equal(transfer.residentHistory[0].fullName, 'Subhasish Das');

  // Re-generating September 2026 keeps paid record and old resident snapshot untouched
  const regeneratedSep = generateMonthlyBills(paidSepBills, transfer.units, seed.expenses, '2026-09');
  const sep049After = regeneratedSep.bills.find(
    (b) => b.month === '2026-09' && b.unitNumber === '049'
  );
  assert.equal(sep049After?.residentNameSnapshot, 'Subhasish Das');
  assert.equal(sep049After?.status, 'paid');
  assert.equal(regeneratedSep.preservedPaidCount, 1);

  // Generating a brand-new month (2026-12) with ₹7,200 assigns ₹300/unit to the new resident
  const generatedDec = generateMonthlyBills(
    paidSepBills,
    transfer.units,
    seed.expenses,
    '2026-12',
    7200
  );
  const dec049 = generatedDec.bills.find((b) => b.month === '2026-12' && b.unitNumber === '049');
  assert.equal(dec049?.residentNameSnapshot, 'Arup Kumar Baruah');
  assert.equal(dec049?.cleanerShare, 300);
  assert.equal(dec049?.extraExpensesShare, 0);
  assert.equal(dec049?.totalAmount, 300);
});

test('Adding with name only and deleting resident name resets unit cleanly to blank', () => {
  const seed = createSeedData();

  const invalidMsg = validateResidentInput({
    unitNumber: '060',
    fullName: '',
    oilEmployeeId: '',
    department: '',
    phone: '',
    familyMembers: 1,
    vehicleNumbers: '',
    moveInDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  assert.ok(invalidMsg !== null);

  const validNameOnly = validateResidentInput({
    unitNumber: '060',
    fullName: 'Pankaj Kalita',
    oilEmployeeId: '',
    department: '',
    phone: '',
    familyMembers: 1,
    vehicleNumbers: '',
    moveInDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  assert.equal(validNameOnly, null);

  const added = addResidentToUnit(seed.units, {
    unitNumber: '060',
    fullName: 'Pankaj Kalita',
    oilEmployeeId: '',
    department: '',
    phone: '',
    familyMembers: 1,
    vehicleNumbers: '',
    moveInDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  assert.equal(added.units.find((u) => u.unitNumber === '060')?.resident?.fullName, 'Pankaj Kalita');

  const removed = removeResidentFromUnit(
    added.units,
    seed.residentHistory,
    '060',
    'Relocated to Tower 5',
    '2026-12-01'
  );
  assert.equal(removed.units.find((u) => u.unitNumber === '060')?.resident, null);
  assert.equal(removed.residentHistory[0].fullName, 'Pankaj Kalita');
});

test('Marking a bill paid updates collection summary accurately', () => {
  const seed = createSeedData();
  const generated = generateMonthlyBills(seed.bills, seed.units, seed.expenses, '2026-11', 2400);
  const before = summarizeMonthFinances(generated.bills, seed.expenses, '2026-11');
  assert.equal(before.paidCount, 0);
  assert.equal(before.unpaidCount, 24);
  assert.equal(before.totalBilled, 2400);

  const firstBill = generated.bills[0];
  const updatedBills = markBillPayment(
    generated.bills,
    firstBill.id,
    'paid',
    'UPI',
    'UPI-TEST-01',
    '2026-11-21'
  );
  const after = summarizeMonthFinances(updatedBills, seed.expenses, '2026-11');
  assert.equal(after.paidCount, 1);
  assert.equal(after.unpaidCount, 23);
  assert.equal(after.totalCollected, 100);
});
