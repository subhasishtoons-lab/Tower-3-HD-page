import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_ADDITIONAL_ADMINS,
  MAX_TOTAL_ADMINS,
  authenticateLocalAccount,
  clearAdminAccounts,
  countAdditionalAdmins,
  countTotalAdmins,
  demoteAdminToResident,
  getRecoveryQuestion,
  hasAdminAccount,
  hashPassword,
  promoteResidentToAdmin,
  registerLocalAccount,
  removeLocalAccount,
  resetAccountPasswordWithAnswer,
  toPublicAccount,
  verifyPassword,
} from './auth';
import type { LocalAccount } from '../types';

test('PBKDF2 password hashing generates unique salts and verifies accurately', async () => {
  const first = await hashPassword('Tower3Pass!');
  const second = await hashPassword('Tower3Pass!');
  assert.notEqual(first.salt, second.salt);
  assert.notEqual(first.hash, second.hash);
  assert.equal(await verifyPassword('Tower3Pass!', first.salt, first.hash), true);
  assert.equal(await verifyPassword('WrongPass!', first.salt, first.hash), false);
});

test('Signup requires mandatory Security Question & Answer and strips secrets in toPublicAccount', async () => {
  const missingQuestion = await registerLocalAccount([], {
    fullName: 'Tower Admin',
    username: 't3_admin',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'admin',
    securityQuestion: '',
    securityAnswer: 'duliajan',
  });
  assert.equal(missingQuestion.ok, false);

  const missingAnswer = await registerLocalAccount([], {
    fullName: 'Tower Admin',
    username: 't3_admin',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'admin',
    securityQuestion: 'What is your favourite place in Assam?',
    securityAnswer: ' ',
  });
  assert.equal(missingAnswer.ok, false);

  const created = await registerLocalAccount([], {
    fullName: 'Tower Admin',
    username: 't3_admin',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'admin',
    securityQuestion: 'What is your favourite place in Assam?',
    securityAnswer: 'Duliajan',
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const publicAcc = toPublicAccount(created.data.account);
  assert.equal(publicAcc.username, 't3_admin');
  assert.equal(publicAcc.securityQuestion, 'What is your favourite place in Assam?');
  assert.equal('passwordHash' in publicAcc, false);
  assert.equal('passwordSalt' in publicAcc, false);
  assert.equal('securityAnswerHash' in publicAcc, false);
  assert.equal('securityAnswerSalt' in publicAcc, false);
});

test('First-run Admin signup assigns 1st Admin flag and locks public Admin self-registration afterward', async () => {
  let accounts: LocalAccount[] = [];
  assert.equal(hasAdminAccount(accounts), false);
  assert.equal(MAX_ADDITIONAL_ADMINS, 2);
  assert.equal(MAX_TOTAL_ADMINS, 3);

  const firstAdmin = await registerLocalAccount(accounts, {
    fullName: 'Tower Primary Admin',
    username: 'T3_Admin',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'admin',
    designation: 'Primary Admin',
    unitNumber: '049',
    securityQuestion: 'What is the name of your first school?',
    securityAnswer: 'OIL Higher Secondary',
  });
  assert.equal(firstAdmin.ok, true);
  if (!firstAdmin.ok) return;

  accounts = firstAdmin.data.accounts;
  assert.equal(firstAdmin.data.account.username, 't3_admin');
  assert.equal(firstAdmin.data.account.isPrimaryAdmin, true);
  assert.equal(hasAdminAccount(accounts), true);
  assert.equal(countTotalAdmins(accounts), 1);
  assert.equal(countAdditionalAdmins(accounts), 0);

  // Public signup cannot register a second admin
  const publicSecondAdmin = await registerLocalAccount(accounts, {
    fullName: 'Unauthorized Admin',
    username: 'second_admin',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'admin',
    securityQuestion: 'What is your childhood nickname?',
    securityAnswer: 'raju',
  });
  assert.equal(publicSecondAdmin.ok, false);
});

test('Password reset uses Security Question & Answer (no email) and invalidates old password', async () => {
  const created = await registerLocalAccount([], {
    fullName: 'Arindam Choudhury',
    username: 'arindam_t3',
    password: 'oldPassword1',
    confirmPassword: 'oldPassword1',
    role: 'admin',
    securityQuestion: 'What is your favourite place in Assam?',
    securityAnswer: '  Kaziranga National Park  ',
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;
  let accounts = created.data.accounts;

  // Lookup question by User ID
  const lookup = getRecoveryQuestion(accounts, 'ARINDAM_T3');
  assert.equal(lookup.ok, true);
  if (lookup.ok) {
    assert.equal(lookup.data.securityQuestion, 'What is your favourite place in Assam?');
    assert.equal(lookup.data.role, 'admin');
  }

  // Unknown username fails
  assert.equal(getRecoveryQuestion(accounts, 'nonexistent_user').ok, false);

  // Wrong security answer fails
  const wrongAnswer = await resetAccountPasswordWithAnswer(accounts, {
    username: 'arindam_t3',
    securityAnswer: 'Dibrugarh',
    newPassword: 'newPassword2',
    confirmPassword: 'newPassword2',
  });
  assert.equal(wrongAnswer.ok, false);

  // Mismatched new passwords fails
  const mismatch = await resetAccountPasswordWithAnswer(accounts, {
    username: 'arindam_t3',
    securityAnswer: 'kaziranga national park',
    newPassword: 'newPassword2',
    confirmPassword: 'differentPassword',
  });
  assert.equal(mismatch.ok, false);

  // Correct answer (case-insensitive & whitespace normalized) resets password
  const resetRes = await resetAccountPasswordWithAnswer(accounts, {
    username: 'ARINDAM_T3',
    securityAnswer: 'kaziranga   national park',
    newPassword: 'newPassword2',
    confirmPassword: 'newPassword2',
  });
  assert.equal(resetRes.ok, true);
  if (!resetRes.ok) return;
  accounts = resetRes.data.accounts;

  // Old password no longer works; new password works
  const oldLogin = await authenticateLocalAccount(accounts, 'arindam_t3', 'oldPassword1', 'admin');
  assert.equal(oldLogin.ok, false);

  const newLogin = await authenticateLocalAccount(accounts, 'arindam_t3', 'newPassword2', 'admin');
  assert.equal(newLogin.ok, true);
});

test('1st Admin can promote up to 2 Residents to Admin (3 Admins max), demote back, and promoted Admins cannot manage Admin roles', async () => {
  let accounts: LocalAccount[] = [];

  const firstAdmin = await registerLocalAccount(accounts, {
    fullName: 'Primary Admin',
    username: 'first_admin',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'admin',
    securityQuestion: 'What is your childhood nickname?',
    securityAnswer: 'baba',
  });
  assert.equal(firstAdmin.ok, true);
  if (!firstAdmin.ok) return;
  accounts = firstAdmin.data.accounts;
  const primaryId = firstAdmin.data.account.id;

  // Register 3 residents
  const residentIds: string[] = [];
  for (let i = 1; i <= 3; i++) {
    const unit = String(48 + i).padStart(3, '0');
    const r = await registerLocalAccount(accounts, {
      fullName: `Resident ${i}`,
      username: `res_user_${i}`,
      password: 'password123',
      confirmPassword: 'password123',
      role: 'resident',
      unitNumber: unit,
      securityQuestion: 'What is the name of your first school?',
      securityAnswer: `school ${i}`,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    accounts = r.data.accounts;
    residentIds.push(r.data.account.id);
  }

  // Promote first 2 residents to admin (total 3 admins)
  for (let i = 0; i < MAX_ADDITIONAL_ADMINS; i++) {
    const promoted = promoteResidentToAdmin(accounts, residentIds[i], primaryId);
    assert.equal(promoted.ok, true);
    if (!promoted.ok) return;
    accounts = promoted.data.accounts;
    assert.equal(promoted.data.account.role, 'admin');
    assert.equal(promoted.data.account.isPrimaryAdmin, false);
  }
  assert.equal(countAdditionalAdmins(accounts), 2);
  assert.equal(countTotalAdmins(accounts), 3);

  // 3rd promotion (would be 4th Admin) must be rejected
  const thirdAttempt = promoteResidentToAdmin(accounts, residentIds[2], primaryId);
  assert.equal(thirdAttempt.ok, false);

  // Promoted resident can now sign in as Admin (and cannot sign in as Resident)
  const promotedLogin = await authenticateLocalAccount(accounts, 'res_user_1', 'password123', 'admin');
  assert.equal(promotedLogin.ok, true);
  if (promotedLogin.ok) {
    assert.equal(promotedLogin.data.isPrimaryAdmin, false);
  }
  const promotedAsResident = await authenticateLocalAccount(accounts, 'res_user_1', 'password123', 'resident');
  assert.equal(promotedAsResident.ok, false);

  // Promoted (non-primary) Admin CANNOT demote or promote other accounts or delete 1st Admin
  const promotedId = residentIds[0];
  assert.equal(demoteAdminToResident(accounts, residentIds[1], promotedId).ok, false);
  assert.equal(removeLocalAccount(accounts, primaryId, promotedId).ok, false);
  assert.equal(removeLocalAccount(accounts, residentIds[1], promotedId).ok, false);

  // 1st Admin demotes 1st promoted admin back to resident, freeing a slot
  const demoted = demoteAdminToResident(accounts, promotedId, primaryId);
  assert.equal(demoted.ok, true);
  if (!demoted.ok) return;
  accounts = demoted.data.accounts;
  assert.equal(countAdditionalAdmins(accounts), 1);
  assert.equal(countTotalAdmins(accounts), 2);
  assert.equal(demoted.data.account.role, 'resident');

  // Now 3rd resident can be promoted to fill the 2nd additional admin slot (total 3)
  const thirdNow = promoteResidentToAdmin(accounts, residentIds[2], primaryId);
  assert.equal(thirdNow.ok, true);
  if (!thirdNow.ok) return;
  accounts = thirdNow.data.accounts;
  assert.equal(countAdditionalAdmins(accounts), 2);
  assert.equal(countTotalAdmins(accounts), 3);

  // Clearing admin accounts removes all admins while keeping residents intact
  const onlyResidents = clearAdminAccounts(accounts);
  assert.equal(hasAdminAccount(onlyResidents), false);
  assert.equal(onlyResidents.length, 1);
  assert.equal(onlyResidents[0].username, 'res_user_1');
});

test('Account deletion prevents removing active user or last remaining admin', async () => {
  const adminRes = await registerLocalAccount([], {
    fullName: 'Main Admin',
    username: 'main_admin',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'admin',
    securityQuestion: 'What is your favourite food or dish?',
    securityAnswer: 'pitha',
  });
  assert.equal(adminRes.ok, true);
  if (!adminRes.ok) return;

  const resRes = await registerLocalAccount(adminRes.data.accounts, {
    fullName: 'Unit 050 Resident',
    username: 'unit050',
    password: 'password123',
    confirmPassword: 'password123',
    role: 'resident',
    unitNumber: '050',
    securityQuestion: 'What was the name of your first pet?',
    securityAnswer: 'bruno',
  });
  assert.equal(resRes.ok, true);
  if (!resRes.ok) return;

  const accounts = resRes.data.accounts;
  const adminId = adminRes.data.account.id;
  const residentId = resRes.data.account.id;

  // Cannot delete active signed-in account
  const selfDelete = removeLocalAccount(accounts, adminId, adminId);
  assert.equal(selfDelete.ok, false);

  // Can delete resident account while signed in as admin
  const delResident = removeLocalAccount(accounts, residentId, adminId);
  assert.equal(delResident.ok, true);
  if (delResident.ok) {
    assert.equal(delResident.data.length, 1);
  }
});
