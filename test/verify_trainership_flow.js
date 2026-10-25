const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { FitPulseDatabase } = require('../database');

async function testTrainershipFlow() {
  console.log('--- Starting Trainership & Coach Discovery Flow Verification ---');

  const testDbFile = path.join(__dirname, 'test_trainership_db.json');
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

  const db = new FitPulseDatabase(testDbFile);

  // 1. Initial State: Only 1 coach (usr_coach_real), 1 manager (usr_mgr), 1 trainee (usr_trainee_real)
  const initialCoaches = db.getCoachPublicDirectory();
  assert.strictEqual(initialCoaches.length, 1, 'Should find 1 public coach initially');
  assert.strictEqual(initialCoaches[0].id, 'usr_coach_real');
  assert.strictEqual(initialCoaches[0].role, 'coach');
  assert.ok(!initialCoaches.some(c => c.role === 'manager' || c.id === 'usr_mgr'), 'Manager must never appear in coaches directory');
  console.log('✓ Coach public directory strictly excludes manager and shows only visible coaches.');

  // 2. Coach toggles visibility to false
  db.setCoachVisibility('usr_coach_real', false);
  const hiddenCoaches = db.getCoachPublicDirectory();
  assert.strictEqual(hiddenCoaches.length, 0, 'No coaches should be visible when coach visibility is off');
  console.log('✓ Setting coach visibility to false hides coach from public directory.');

  // Toggling back to true
  db.setCoachVisibility('usr_coach_real', true);
  assert.strictEqual(db.getCoachPublicDirectory().length, 1);
  console.log('✓ Setting coach visibility to true restores coach in public directory.');

  // 3. Trainee sends connection request to Coach
  const req = db.requestCoachConnection('usr_trainee_real', 'usr_coach_real', 'מתאמן (חשבון אמת)');
  assert.strictEqual(req.status, 'pending');
  assert.strictEqual(req.traineeId, 'usr_trainee_real');
  assert.strictEqual(req.coachId, 'usr_coach_real');

  // Trainee status should be pending
  const traineeStatusPending = db.getTrainershipStatus('usr_trainee_real');
  assert.strictEqual(traineeStatusPending.hasCoach, false);
  assert.strictEqual(traineeStatusPending.status, 'pending');
  assert.strictEqual(traineeStatusPending.pendingRequest.coachId, 'usr_coach_real');
  console.log('✓ Trainee request sent and correctly reports pending status.');

  // Check audit log for manager
  const auditLogs = db.getAuditLogs(10);
  assert.ok(auditLogs.some(l => l.type === 'COACH_CONNECTION_REQUESTED'), 'Audit log must record coach connection request');
  console.log('✓ Audit log contains coach connection request for manager review.');

  // 4. Trainee cancels connection request
  const cancelRes = db.cancelCoachConnectionRequest('usr_trainee_real');
  assert.strictEqual(cancelRes, true);
  const traineeStatusCancelled = db.getTrainershipStatus('usr_trainee_real');
  assert.strictEqual(traineeStatusCancelled.hasCoach, false);
  assert.strictEqual(traineeStatusCancelled.status, 'none');
  console.log('✓ Trainee can cancel request; status resets to none ("קבע מאמן אישי").');

  // 5. Send new request and Coach accepts it
  const req2 = db.requestCoachConnection('usr_trainee_real', 'usr_coach_real', 'מתאמן (חשבון אמת)');
  const acceptedReq = db.respondCoachConnection(req2.id, true, 'מאמן (חשבון אמת)');
  assert.strictEqual(acceptedReq.status, 'accepted');

  // Trainee status should now be active
  const traineeStatusActive = db.getTrainershipStatus('usr_trainee_real');
  assert.strictEqual(traineeStatusActive.hasCoach, true);
  assert.strictEqual(traineeStatusActive.status, 'active');
  assert.strictEqual(traineeStatusActive.coach.id, 'usr_coach_real');
  console.log('✓ Coach accepts request -> Trainee status is active with coach profile.');

  // Coach trainees list should contain trainee
  const coachTrainees = db.getCoachTrainees('usr_coach_real');
  assert.strictEqual(coachTrainees.activeTrainees.length, 1);
  assert.strictEqual(coachTrainees.activeTrainees[0].traineeId, 'usr_trainee_real');
  console.log('✓ Coach active trainees list contains connected trainee.');

  // 6. Trainee terminates relationship ("סיום הקשר")
  const termRes = db.terminateTrainership('usr_trainee_real', 'usr_coach_real', 'trainee');
  assert.strictEqual(termRes.success, true);

  const traineeStatusTerminated = db.getTrainershipStatus('usr_trainee_real');
  assert.strictEqual(traineeStatusTerminated.hasCoach, false);
  assert.strictEqual(traineeStatusTerminated.status, 'none');

  const coachTraineesAfterTerm = db.getCoachTrainees('usr_coach_real');
  assert.strictEqual(coachTraineesAfterTerm.activeTrainees.length, 0);
  console.log('✓ Trainee terminates relationship -> both sides reset cleanly.');

  // Check audit log for termination
  const logsAfterTerm = db.getAuditLogs(10);
  assert.ok(logsAfterTerm.some(l => l.type === 'TRAINERSHIP_TERMINATED'), 'Audit log must record trainership termination');
  console.log('✓ Audit log contains TRAINERSHIP_TERMINATED event.');

  // 7. Role upgrade persistence
  db.registerUser({ id: 'user_upgrade_test', email: 'upgradetest@gmail.com', name: 'משתמש שדרוג', role: 'trainee' });
  assert.strictEqual(db.getUserByIdOrEmail('user_upgrade_test').role, 'trainee');

  db.setUserRole('user_upgrade_test', 'coach');
  const upgradedUser = db.getUserByIdOrEmail('user_upgrade_test');
  assert.strictEqual(upgradedUser.role, 'coach');
  assert.strictEqual(upgradedUser.isTrainer, true);
  console.log('✓ User role upgrade to coach persisted in database.');

  // Clean up
  if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile);

  console.log('--- All Trainership & Coach Discovery Tests Passed Successfully! ---');
}

testTrainershipFlow().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
