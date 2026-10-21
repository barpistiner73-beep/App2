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
function normalizeRole(raw, isTrainer) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'manager' || value === 'admin') return 'manager';
  if (value === 'coach' || value === 'trainer' || value === 'trainer_admin') return 'coach';
  if (value === 'trainee') return 'trainee';
  return isTrainer ? 'coach' : 'trainee';
}

function roleImpliesTrainer(role) {
  return role === 'coach' || role === 'manager';
}

function createMockUser(userId, fullName, email, roleOrTrainer) {
  const role = typeof roleOrTrainer === 'boolean'
    ? normalizeRole(undefined, roleOrTrainer)
    : normalizeRole(roleOrTrainer);
  return {
    userId,
    fullName,
    email,
    role,
    isTrainer: roleImpliesTrainer(role),
    status: 'active',
    createdAt: new Date().toISOString()
  };
}

const traineeUser = createMockUser('user_01', 'John Doe', 'john@example.com', false);
assert.strictEqual(traineeUser.isTrainer, false);
assert.strictEqual(traineeUser.role, 'trainee');

const trainerUser = createMockUser('user_02', 'Coach Sarah', 'sarah@example.com', true);
assert.strictEqual(trainerUser.isTrainer, true);
assert.strictEqual(trainerUser.role, 'coach');

assert.strictEqual(normalizeRole('trainer_admin'), 'coach');
assert.strictEqual(normalizeRole('admin'), 'manager');
assert.strictEqual(normalizeRole('trainer'), 'coach');

console.log('✅ All domain logic and schema invariants passed successfully!');
