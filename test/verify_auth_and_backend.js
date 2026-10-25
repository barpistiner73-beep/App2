const assert = require('assert');
const { FitPulseDatabase: Database } = require('../database');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('--- Starting Auth & Backend Verification Tests ---');

  // Test with isolated test db
  const testDbPath = path.join(__dirname, 'test_db_auth.json');
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  const db = new Database(testDbPath);

  // 1. Initial State: Only 3 special users
  const initialUsers = db.getUsers();
  assert.strictEqual(initialUsers.length, 3, 'Must start with exactly 3 special users');
  const userIds = initialUsers.map(u => u.id).sort();
  assert.deepStrictEqual(userIds, ['usr_coach_real', 'usr_mgr', 'usr_trainee_real'].sort());
  console.log('✓ Initial users verified: exactly 3 special users present.');

  // 2. Authenticate the 3 special users
  const mgrAuth = db.authenticate('manager@fitpulse.com', 'ManagerPass123!');
  assert.strictEqual(mgrAuth.success, true);
  assert.strictEqual(mgrAuth.user.role, 'manager');
  assert.strictEqual(mgrAuth.user.isSpecial, true);

  const coachAuth = db.authenticate('coach.real@fitpulse.com', 'TrainerPass123!');
  assert.strictEqual(coachAuth.success, true);
  assert.strictEqual(coachAuth.user.role, 'coach');
  assert.strictEqual(coachAuth.user.isSpecial, true);

  const traineeAuth = db.authenticate('trainee.real@fitpulse.com', 'TraineePass123!');
  assert.strictEqual(traineeAuth.success, true);
  assert.strictEqual(traineeAuth.user.role, 'trainee');
  assert.strictEqual(traineeAuth.user.isSpecial, true);
  console.log('✓ Special users authentication verified.');

  // 3. Protection: Cannot delete, suspend or reject special users
  assert.throws(() => db.deleteUser('usr_mgr'), /לא ניתן למחוק/);
  assert.throws(() => db.deleteUser('usr_coach_real'), /לא ניתן למחוק/);
  assert.throws(() => db.deleteUser('usr_trainee_real'), /לא ניתן למחוק/);

  assert.throws(() => db.setUserStatus('usr_mgr', 'suspended'), /להשעות|להשעותו/);
  assert.throws(() => db.rejectUser('usr_coach_real'), /לדחות|לדחותו/);
  console.log('✓ Special users protection verified: cannot delete, suspend or reject.');

  // 4. New Google User Registration Flow
  const newGoogleProfile = {
    uid: 'google_user_123',
    email: 'newuser@gmail.com',
    displayName: 'ישראל ישראלי',
    photoURL: 'https://example.com/avatar.jpg'
  };

  const regResult = db.registerOrLoginGoogleUser(newGoogleProfile);
  assert.strictEqual(regResult.success, true);
  assert.strictEqual(regResult.isPending, true);
  assert.strictEqual(regResult.user.status, 'pending_approval');
  assert.strictEqual(regResult.user.approvalStatus, 'pending');
  console.log('✓ Brand new Google user auto-registered as pending approval.');

  // Attempting login while pending should fail
  const pendingLogin = db.authenticate('newuser@gmail.com');
  assert.strictEqual(pendingLogin.success, false);
  assert.strictEqual(pendingLogin.status, 'pending_approval');
  console.log('✓ Pending user cannot log in before approval.');

  // 5. Admin Approves New User
  const approved = db.approveUser('google_user_123', 'usr_mgr');
  assert.strictEqual(approved.status, 'active');
  assert.strictEqual(approved.approvalStatus, 'approved');

  // Now approved user can log in
  const approvedLogin = db.authenticate('newuser@gmail.com');
  assert.strictEqual(approvedLogin.success, true);
  assert.strictEqual(approvedLogin.user.id, 'google_user_123');
  console.log('✓ Approved user successfully logs in.');

  // 6. Admin Suspends User
  const suspended = db.setUserStatus('google_user_123', 'suspended');
  assert.strictEqual(suspended.status, 'suspended');

  // Suspended user cannot log in (403 condition)
  const suspendedLogin = db.authenticate('newuser@gmail.com');
  assert.strictEqual(suspendedLogin.success, false);
  assert.strictEqual(suspendedLogin.status, 'suspended');
  console.log('✓ Suspended user login blocked.');

  // 7. Admin Unsuspends User -> Must reset to pending_approval (NOT active!)
  const unsuspended = db.setUserStatus('google_user_123', 'pending_approval');
  assert.strictEqual(unsuspended.status, 'pending_approval');
  assert.strictEqual(unsuspended.approvalStatus, 'pending');
  console.log('✓ Unsuspend resets user to pending_approval for re-review.');

  // 8. Admin Rejects User
  const rejected = db.rejectUser('google_user_123', 'usr_mgr');
  assert.strictEqual(rejected.status, 'rejected');
  assert.strictEqual(rejected.approvalStatus, 'rejected');

  const rejectedLogin = db.authenticate('newuser@gmail.com');
  assert.strictEqual(rejectedLogin.success, false);
  assert.strictEqual(rejectedLogin.status, 'rejected');
  console.log('✓ Rejected user login blocked.');

  // 9. Admin Cancels Rejection -> Must reset to pending_approval (NOT active!)
  const cancelledRejection = db.setUserStatus('google_user_123', 'pending_approval');
  assert.strictEqual(cancelledRejection.status, 'pending_approval');
  assert.strictEqual(cancelledRejection.approvalStatus, 'pending');
  console.log('✓ Cancel rejection resets user to pending_approval for re-review.');

  // 10. Admin Permanently Deletes User
  const deleted = db.deleteUser('google_user_123');
  assert.ok(deleted && deleted.id === 'google_user_123');
  const remainingUsers = db.getUsers();
  assert.strictEqual(remainingUsers.length, 3, 'Only 3 special users must remain after deletion');
  assert.strictEqual(db.getUserByIdOrEmail('google_user_123'), null);
  console.log('✓ User permanent deletion verified.');

  // Clean up test file
  if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

  console.log('--- All Auth & Backend Tests Passed Successfully! ---');
}

runTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
