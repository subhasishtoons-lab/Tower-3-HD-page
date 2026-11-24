import type { Resident, ResidentTransferRecord, UnitInfo } from '../types';

export const TOWER_FLOORS: ReadonlyArray<{ floor: number; units: readonly string[] }> = [
  { floor: 1, units: ['049', '050', '051', '052'] },
  { floor: 2, units: ['053', '054', '055', '056'] },
  { floor: 3, units: ['057', '058', '059', '060'] },
  { floor: 4, units: ['061', '062', '063', '064'] },
  { floor: 5, units: ['065', '066', '067', '068'] },
  { floor: 6, units: ['069', '070', '071', '072'] },
];

export const ALL_UNIT_NUMBERS: readonly string[] = TOWER_FLOORS.flatMap((f) => f.units);
export const TOTAL_UNITS = 24;

export function getFloorForUnit(unitNumber: string): number {
  const found = TOWER_FLOORS.find((f) => f.units.includes(unitNumber));
  return found ? found.floor : 1;
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface ResidentInput {
  unitNumber: string;
  fullName: string;
  oilEmployeeId: string;
  department: string;
  phone: string;
  familyMembers: number;
  vehicleNumbers: string;
  moveInDate: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes?: string;
}

export function validateResidentInput(input: ResidentInput): string | null {
  if (!ALL_UNIT_NUMBERS.includes(input.unitNumber)) {
    return 'Please select a valid Tower 3 unit (049 to 072).';
  }
  if (!input.fullName.trim() || input.fullName.trim().length < 2) {
    return 'Resident full name is required (at least 2 characters).';
  }
  if (input.phone.trim() && input.phone.replace(/\D/g, '').length < 10) {
    return 'If provided, mobile number must contain at least 10 digits.';
  }
  if (
    input.familyMembers !== undefined &&
    (!Number.isInteger(input.familyMembers) || input.familyMembers < 1 || input.familyMembers > 15)
  ) {
    return 'Family members count must be between 1 and 15.';
  }
  return null;
}

/**
 * Adds a resident name/profile to an unnamed unit. Never mutates historical billing records.
 */
export function addResidentToUnit(
  units: UnitInfo[],
  input: ResidentInput
): { units: UnitInfo[]; resident: Resident } {
  const target = units.find((u) => u.unitNumber === input.unitNumber);
  if (!target) {
    throw new Error(`Unit ${input.unitNumber} does not exist in Tower 3.`);
  }
  if (target.resident !== null) {
    throw new Error(
      `Unit ${input.unitNumber} already has a resident assigned. Use Edit or Replace Resident.`
    );
  }
  const resident: Resident = {
    id: createId('res'),
    unitNumber: input.unitNumber,
    fullName: input.fullName.trim(),
    oilEmployeeId: input.oilEmployeeId.trim(),
    department: input.department.trim(),
    phone: input.phone.trim(),
    familyMembers: input.familyMembers || 1,
    vehicleNumbers: input.vehicleNumbers.trim(),
    moveInDate: input.moveInDate || new Date().toISOString().slice(0, 10),
    emergencyContactName: input.emergencyContactName.trim(),
    emergencyContactPhone: input.emergencyContactPhone.trim(),
    notes: input.notes?.trim() || '',
  };

  return {
    units: units.map((u) => (u.unitNumber === input.unitNumber ? { ...u, resident } : u)),
    resident,
  };
}

/**
 * Updates resident profile details in-place. Historical bills retain their original snapshots.
 */
export function editResidentInUnit(
  units: UnitInfo[],
  input: ResidentInput
): { units: UnitInfo[]; resident: Resident } {
  const target = units.find((u) => u.unitNumber === input.unitNumber);
  if (!target || !target.resident) {
    throw new Error(`Unit ${input.unitNumber} has no resident name to edit.`);
  }
  const updated: Resident = {
    ...target.resident,
    fullName: input.fullName.trim(),
    oilEmployeeId: input.oilEmployeeId.trim(),
    department: input.department.trim(),
    phone: input.phone.trim(),
    familyMembers: input.familyMembers || target.resident.familyMembers || 1,
    vehicleNumbers: input.vehicleNumbers.trim(),
    moveInDate: input.moveInDate || target.resident.moveInDate,
    emergencyContactName: input.emergencyContactName.trim(),
    emergencyContactPhone: input.emergencyContactPhone.trim(),
    notes: input.notes?.trim() || '',
  };

  return {
    units: units.map((u) => (u.unitNumber === input.unitNumber ? { ...u, resident: updated } : u)),
    resident: updated,
  };
}

/**
 * Replaces a unit's resident (transfer/re-allotment).
 * Archives the outgoing resident in residentHistory and never touches existing billing records.
 */
export function replaceResidentInUnit(
  units: UnitInfo[],
  residentHistory: ResidentTransferRecord[],
  input: ResidentInput,
  transferReason: string,
  moveOutDate: string
): {
  units: UnitInfo[];
  residentHistory: ResidentTransferRecord[];
  outgoingResident: Resident;
  incomingResident: Resident;
} {
  const target = units.find((u) => u.unitNumber === input.unitNumber);
  if (!target || !target.resident) {
    throw new Error(`Unit ${input.unitNumber} currently has no resident name. Use Add Name instead.`);
  }
  const outgoingResident = target.resident;
  const archiveRecord: ResidentTransferRecord = {
    id: createId('trf'),
    unitNumber: input.unitNumber,
    residentId: outgoingResident.id,
    fullName: outgoingResident.fullName,
    oilEmployeeId: outgoingResident.oilEmployeeId,
    department: outgoingResident.department,
    moveInDate: outgoingResident.moveInDate,
    moveOutDate: moveOutDate || input.moveInDate || new Date().toISOString().slice(0, 10),
    reason: transferReason.trim() || 'Resident transfer / re-allotment',
    recordedAt: new Date().toISOString(),
  };

  const incomingResident: Resident = {
    id: createId('res'),
    unitNumber: input.unitNumber,
    fullName: input.fullName.trim(),
    oilEmployeeId: input.oilEmployeeId.trim(),
    department: input.department.trim(),
    phone: input.phone.trim(),
    familyMembers: input.familyMembers || 1,
    vehicleNumbers: input.vehicleNumbers.trim(),
    moveInDate: input.moveInDate || new Date().toISOString().slice(0, 10),
    emergencyContactName: input.emergencyContactName.trim(),
    emergencyContactPhone: input.emergencyContactPhone.trim(),
    notes: input.notes?.trim() || '',
  };

  return {
    units: units.map((u) =>
      u.unitNumber === input.unitNumber ? { ...u, resident: incomingResident } : u
    ),
    residentHistory: [archiveRecord, ...residentHistory],
    outgoingResident,
    incomingResident,
  };
}

/**
 * Deletes a resident name from a unit (leaving it blank) while archiving them into residentHistory.
 * Never erases prior bills or transactions.
 */
export function removeResidentFromUnit(
  units: UnitInfo[],
  residentHistory: ResidentTransferRecord[],
  unitNumber: string,
  reason: string,
  moveOutDate: string
): {
  units: UnitInfo[];
  residentHistory: ResidentTransferRecord[];
  outgoingResident: Resident;
} {
  const target = units.find((u) => u.unitNumber === unitNumber);
  if (!target || !target.resident) {
    throw new Error(`Unit ${unitNumber} already has no resident name.`);
  }
  const outgoingResident = target.resident;
  const archiveRecord: ResidentTransferRecord = {
    id: createId('trf'),
    unitNumber,
    residentId: outgoingResident.id,
    fullName: outgoingResident.fullName,
    oilEmployeeId: outgoingResident.oilEmployeeId,
    department: outgoingResident.department,
    moveInDate: outgoingResident.moveInDate,
    moveOutDate: moveOutDate || new Date().toISOString().slice(0, 10),
    reason: reason.trim() || 'Resident name removed',
    recordedAt: new Date().toISOString(),
  };

  return {
    units: units.map((u) => (u.unitNumber === unitNumber ? { ...u, resident: null } : u)),
    residentHistory: [archiveRecord, ...residentHistory],
    outgoingResident,
  };
}
