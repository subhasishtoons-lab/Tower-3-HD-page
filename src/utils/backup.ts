import type { TowerDataState } from '../types';
import { ALL_UNIT_NUMBERS } from './residents';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupEnvelope {
  app: 'TOWER 3 HD';
  colony: 'Oil India Limited Housing Colony, Duliajan, Assam 786602';
  schemaVersion: number;
  exportedAt: string;
  data: TowerDataState;
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  envelope?: BackupEnvelope;
  summary?: {
    exportedAt: string;
    namedUnits: number;
    billsCount: number;
    expensesCount: number;
    noticesCount: number;
    maintenanceCount: number;
    discussionsCount: number;
  };
}

export function buildBackupPayload(state: TowerDataState, exportedAt: string): BackupEnvelope {
  return {
    app: 'TOWER 3 HD',
    colony: 'Oil India Limited Housing Colony, Duliajan, Assam 786602',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    data: {
      ...state,
      lastBackupAt: exportedAt,
    },
  };
}

export function validateBackupJson(rawText: string): BackupValidationResult {
  if (!rawText || !rawText.trim()) {
    return { valid: false, error: 'The backup input is empty. Please upload or paste a valid TOWER 3 HD JSON file.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { valid: false, error: 'Invalid JSON syntax. Please check the file format and try again.' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { valid: false, error: 'Backup root must be a JSON object.' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.app !== 'TOWER 3 HD') {
    return {
      valid: false,
      error: 'Unrecognized backup file. Expected "app": "TOWER 3 HD".',
    };
  }

  if (typeof obj.data !== 'object' || obj.data === null) {
    return { valid: false, error: 'Backup file is missing the required "data" section.' };
  }

  const data = obj.data as Record<string, unknown>;
  const requiredArrays = [
    'units',
    'residentHistory',
    'bills',
    'expenses',
    'notices',
    'emergencies',
    'discussions',
    'maintenanceRequests',
    'meetings',
    'emergencyContacts',
    'activityLogs',
    'committeeMembers',
  ];

  for (const key of requiredArrays) {
    if (!Array.isArray(data[key])) {
      return {
        valid: false,
        error: `Backup data is incomplete or corrupted: missing valid "${key}" list.`,
      };
    }
  }

  const units = data.units as Array<{ unitNumber?: unknown; resident?: unknown }>;
  if (units.length !== 24) {
    return {
      valid: false,
      error: `Expected 24 Tower 3 units (049–072), but found ${units.length}.`,
    };
  }

  const unitNumbers = new Set(units.map((u) => String(u.unitNumber)));
  for (const expectedUnit of ALL_UNIT_NUMBERS) {
    if (!unitNumbers.has(expectedUnit)) {
      return {
        valid: false,
        error: `Backup is missing required Tower 3 unit ${expectedUnit}.`,
      };
    }
  }

  const typedEnvelope = parsed as BackupEnvelope;
  const namedUnits = typedEnvelope.data.units.filter((u) => u.resident !== null).length;

  return {
    valid: true,
    envelope: typedEnvelope,
    summary: {
      exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : 'Unknown date',
      namedUnits,
      billsCount: typedEnvelope.data.bills.length,
      expensesCount: typedEnvelope.data.expenses.length,
      noticesCount: typedEnvelope.data.notices.length,
      maintenanceCount: typedEnvelope.data.maintenanceRequests.length,
      discussionsCount: typedEnvelope.data.discussions.length,
    },
  };
}

export function estimateStorageBytes(state: TowerDataState): number {
  try {
    const serialized = JSON.stringify(state);
    return new TextEncoder().encode(serialized).length;
  } catch {
    return 0;
  }
}
