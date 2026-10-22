/**
 * Test & Verification Script for Fitness Coaching Domain Logic
 * Validates deterministic relation IDs, permission presets, and data contracts.
 */

const assert = require('assert');
require('../src/domainSchema.js');
const domain = globalThis.FitPulseDomain;

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

// 4. Barcode payload and nutrition validation
const ean = '7290000123456';
assert.strictEqual(domain.parseScanPayload(ean).barcode, ean);
const productUrl = 'https://example.com/product/7290000123456';
assert.deepStrictEqual(domain.parseScanPayload(productUrl), {
  raw: productUrl,
  barcode: productUrl,
  sourceUrl: productUrl
});
assert.strictEqual(domain.parseScanPayload('http://example.com/product').barcode, '');

const validFood = domain.validateCrowdsourcedFoodInput({
  barcode: ean,
  name: 'Test food',
  macrosPer100g: { calories: 200, protein: 20, carbs: 20, fats: 8, saturatedFats: 3, transFats: 0 },
  micronutrients: { sodium: 120, potassium: 250, calcium: 80, iron: 1.2, vitaminC: 4 },
  fattyAcids: { omega3: 0.2, omega6: 0.5 },
  gramsToLog: '100'
});
assert.strictEqual(validFood.ok, true);
assert.strictEqual(validFood.food.micronutrients.sodium, 120);
assert.strictEqual(validFood.food.fattyAcids.omega3, 0.2);
assert.strictEqual(domain.validateCrowdsourcedFoodInput({
  barcode: ean,
  name: 'Invalid food',
  macrosPer100g: { calories: -1, protein: 20, carbs: 20, fats: 8, saturatedFats: 0, transFats: 0 }
}).ok, false);
assert.strictEqual(domain.validateCrowdsourcedFoodInput({
  barcode: ean,
  name: 'Invalid food',
  macrosPer100g: { calories: 500, protein: 60, carbs: 30, fats: 20, saturatedFats: 0, transFats: 0 }
}).ok, false);
assert.strictEqual(domain.validateCrowdsourcedFoodInput({
  barcode: ean,
  name: 'Incomplete food',
  macrosPer100g: { calories: '', protein: 0, carbs: 0, fats: 0, saturatedFats: 0, transFats: 0 }
}).ok, false);
assert.strictEqual(domain.validateCrowdsourcedFoodInput({
  barcode: ean,
  name: 'Invalid micronutrient',
  macrosPer100g: { calories: 200, protein: 20, carbs: 20, fats: 8, saturatedFats: 0, transFats: 0 },
  micronutrients: { sodium: -1 }
}).ok, false);
assert.strictEqual(domain.validateCrowdsourcedFoodInput({
  barcode: ean,
  name: 'Invalid fat profile',
  macrosPer100g: { calories: 200, protein: 20, carbs: 20, fats: 8, saturatedFats: 7, transFats: 2 }
}).ok, false);
assert.strictEqual(domain.validateCoachTask({ type: 'weight_check', title: 'Weigh-in required' }).ok, true);
assert.strictEqual(domain.validateCoachTask({ type: 'progress_photos', title: 'Progress photos' }).ok, true);
assert.strictEqual(domain.validateCoachTask({ type: 'invalid', title: 'Task' }).ok, false);

console.log('✅ All domain logic and schema invariants passed successfully!');
