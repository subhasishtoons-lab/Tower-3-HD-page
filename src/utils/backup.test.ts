import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeedData } from '../data/seedData';
import { buildBackupPayload, estimateStorageBytes, validateBackupJson } from './backup';

import { addResidentToUnit } from './residents';

test('Valid backup payload passes schema validation and returns accurate summary', () => {
  const seed = createSeedData();
  const payload = buildBackupPayload(seed, '2026-11-21T08:30:00.000Z');
  const raw = JSON.stringify(payload);

  const result = validateBackupJson(raw);
  assert.equal(result.valid, true);
  assert.ok(result.envelope);
  assert.equal(result.summary?.namedUnits, 0);
  assert.equal(result.summary?.billsCount, 0);
  assert.equal(result.envelope.data.lastBackupAt, '2026-11-21T08:30:00.000Z');

  // Adding a resident name increments namedUnits
  const updatedUnits = addResidentToUnit(seed.units, {
    unitNumber: '049',
    fullName: 'Subhasish Das',
    oilEmployeeId: '',
    department: '',
    phone: '',
    familyMembers: 1,
    vehicleNumbers: '',
    moveInDate: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  }).units;
  const withName = validateBackupJson(
    JSON.stringify(buildBackupPayload({ ...seed, units: updatedUnits }, '2026-11-21T09:00:00.000Z'))
  );
  assert.equal(withName.valid, true);
  assert.equal(withName.summary?.namedUnits, 1);
});

test('Malformed or foreign JSON fails validation with clear error messages', () => {
  const emptyResult = validateBackupJson('   ');
  assert.equal(emptyResult.valid, false);
  assert.match(emptyResult.error || '', /empty/i);

  const syntaxResult = validateBackupJson('{bad json');
  assert.equal(syntaxResult.valid, false);
  assert.match(syntaxResult.error || '', /Invalid JSON/i);

  const wrongAppResult = validateBackupJson(JSON.stringify({ app: 'OTHER APP', data: {} }));
  assert.equal(wrongAppResult.valid, false);
  assert.match(wrongAppResult.error || '', /TOWER 3 HD/);

  const seed = createSeedData();
  const missingUnits = buildBackupPayload(
    { ...seed, units: seed.units.slice(0, 10) },
    '2026-11-21T08:30:00.000Z'
  );
  const unitsResult = validateBackupJson(JSON.stringify(missingUnits));
  assert.equal(unitsResult.valid, false);
  assert.match(unitsResult.error || '', /Expected 24 Tower 3 units/);
});

test('Storage byte estimator returns positive byte count', () => {
  const seed = createSeedData();
  const bytes = estimateStorageBytes(seed);
  assert.ok(bytes > 1000);
});
