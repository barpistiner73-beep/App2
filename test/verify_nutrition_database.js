const assert = require('assert');

// Set window on global for browser-like testing
global.window = global;

require('../src/foodCategories.js');
require('../src/foodDatabaseManager.js');
require('../src/foodsDatabase.js');
require('../src/index.js');
require('../data.js');
require('../data/israeli_culinary_database/israeli_food_data.js');

const db = global.FIT_DATA;
assert(db, 'FIT_DATA must exist');
assert(Array.isArray(db.foodCategories), 'foodCategories must be an array');
assert(Array.isArray(db.foodsDatabase), 'foodsDatabase must be an array');

console.log('✅ FIT_DATA initialized successfully.');
console.log('Categories count:', db.foodCategories.length);
console.log('Total foods registered:', db.foodsDatabase.length);

const chains = db.foodsDatabase.filter(f => f.category === 'chains');
console.log('Chains foods:', chains.length);

const mealIdeas = db.foodsDatabase.filter(f => f.category === 'meal_ideas');
console.log('Meal ideas:', mealIdeas.length);

const aroma = db.foodsDatabase.filter(f => (f.tags||[]).includes('ארומה') || f.name.includes('ארומה'));
console.log('Aroma dishes:', aroma.length);

const giraffe = db.foodsDatabase.filter(f => (f.tags||[]).includes('ג\'ירף') || (f.tags||[]).includes('גירף') || f.name.includes('ג\'ירף'));
console.log('Giraffe dishes:', giraffe.length);

const bbb = db.foodsDatabase.filter(f => (f.tags||[]).includes('bbb') || f.name.includes('BBB'));
console.log('BBB dishes:', bbb.length);

const mcd = db.foodsDatabase.filter(f => (f.tags||[]).includes('מקדונלדס') || (f.tags||[]).includes('mcdonalds') || f.name.includes('מקדונלד'));
console.log('McDonalds dishes:', mcd.length);

const rebar = db.foodsDatabase.filter(f => (f.tags||[]).includes('rebar') || (f.tags||[]).includes('ריבר') || f.name.includes('rebar'));
console.log('rebar items:', rebar.length);

const golda = db.foodsDatabase.filter(f => (f.tags||[]).includes('גולדה') || f.name.includes('גולדה'));
console.log('Golda items:', golda.length);

const breakfasts = db.foodsDatabase.filter(f => (f.tags||[]).includes('ארוחת בוקר') || (f.tags||[]).includes('בוקר'));
console.log('Breakfasts:', breakfasts.length);

const lunches = db.foodsDatabase.filter(f => (f.tags||[]).includes('ארוחת צהריים') || (f.tags||[]).includes('צהריים'));
console.log('Lunches:', lunches.length);

const dinners = db.foodsDatabase.filter(f => (f.tags||[]).includes('ארוחת ערב') || (f.tags||[]).includes('ערב'));
console.log('Dinners:', dinners.length);

const snacks = db.foodsDatabase.filter(f => (f.tags||[]).includes('נשנוש') || (f.tags||[]).includes('snack'));
console.log('Snacks:', snacks.length);

// Verify newly added staple foods
const staples = [
  'staple_steak_entrecote',
  'staple_steak_sirloin',
  'staple_beef_tenderloin_fillet',
  'staple_beef_ground_lean',
  'staple_asado_beef_ribs',
  'staple_pasta_regular_cooked',
  'staple_pasta_whole_wheat_cooked',
  'staple_rice_white_jasmine_cooked',
  'staple_rice_brown_cooked',
  'staple_bread_white_sliced',
  'staple_bread_light_sliced',
  'staple_bread_sourdough_rye',
  'staple_pita_white_standard',
  'staple_pita_light',
  'staple_bun_burger_standard',
  'staple_butter_unsalted_82',
  'staple_butter_spreadable_light',
  'staple_cheese_emek_28',
  'staple_cheese_emek_light_15',
  'staple_cheese_mozzarella_grated',
  'staple_hummus_spread_commercial',
  'staple_tahini_prepared_dip',
  'staple_tahini_raw_pure',
  'staple_canned_tuna_in_oil'
];

staples.forEach(id => {
  const item = db.foodsDatabase.find(f => f.id === id);
  assert(item, `Staple item ${id} must exist in foodsDatabase`);
  assert(typeof item.calories === 'number', `${id} calories must be number`);
  assert(typeof item.protein === 'number', `${id} protein must be number`);
  assert(typeof item.carbs === 'number', `${id} carbs must be number`);
  assert(typeof item.fat === 'number', `${id} fat must be number`);
  assert(item.unitName, `${id} must have unitName`);
});
console.log(`✅ All ${staples.length} simple everyday staples verified.`);

assert(db.foodsDatabase.length >= 300, 'Should have over 300 foods total');
assert(aroma.length >= 10, 'Should have at least 10 Aroma dishes');
assert(giraffe.length >= 7, 'Should have at least 7 Giraffe dishes');
assert(bbb.length >= 8, 'Should have at least 8 BBB dishes');
assert(mcd.length >= 8, 'Should have at least 8 McDonald\'s dishes');
assert(mealIdeas.length >= 25, 'Should have at least 25 meal ideas');

console.log('🎉 ALL NUTRITION CHECKS PASSED PERFECTLY!');
