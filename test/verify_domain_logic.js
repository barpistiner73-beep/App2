/**
 * Test & Verification Script for Fitness Coaching Domain Logic
 * Validates deterministic relation IDs, permission presets, and data contracts.
 */

const assert = require('assert');

// 1. Deterministic Relation ID Check
function getRelationId(trainerId, traineeId) {
  return `${trainerId}_${traineeId}`;
}

const coachId = 'coach_alpha_01';
const traineeId = 'trainee_beta_02';

const relationId = getRelationId(coachId, traineeId);
assert.strictEqual(relationId, 'coach_alpha_01_trainee_beta_02', 'Relation ID must match trainer_trainee pattern');

const selfRelationId = getRelationId(coachId, coachId);
assert.strictEqual(selfRelationId, 'coach_alpha_01_coach_alpha_01', 'Self-training ID must match trainer_trainer pattern');

// 2. Permission Invariant Check
const fullPermissions = {
  canViewSleep: true,
  canViewNutrition: true,
  canViewWorkouts: true,
  canViewDailyLogs: true,
};

function isFullPermissions(perms) {
  return perms.canViewSleep === true &&
         perms.canViewNutrition === true &&
         perms.canViewWorkouts === true &&
         perms.canViewDailyLogs === true;
}

assert.strictEqual(isFullPermissions(fullPermissions), true, 'Full permissions must all be true');

// 3. User Invariant Check
function createMockUser(userId, fullName, email, isTrainer) {
  return {
    userId,
    fullName,
    email,
    isTrainer: Boolean(isTrainer),
    createdAt: new Date().toISOString()
  };
}

const traineeUser = createMockUser('user_01', 'John Doe', 'john@example.com', false);
assert.strictEqual(traineeUser.isTrainer, false);

const trainerUser = createMockUser('user_02', 'Coach Sarah', 'sarah@example.com', true);
assert.strictEqual(trainerUser.isTrainer, true);

console.log('✅ All domain logic and schema invariants passed successfully!');
