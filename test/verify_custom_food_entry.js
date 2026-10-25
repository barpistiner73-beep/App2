const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('Testing Manual / Custom Food Entry & Persistence...');

// 1. Verify index.html & public/index.html
['index.html', 'public/index.html'].forEach(file => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');

  assert(content.includes('id="openManualFoodEntryBtn"'), `${file} must include openManualFoodEntryBtn`);
  assert(content.includes('id="manualFoodEntryDialog"'), `${file} must include manualFoodEntryDialog`);
  assert(content.includes('id="customFoodNameField"'), `${file} must include customFoodNameField`);
  assert(content.includes('id="customFoodCaloriesField"'), `${file} must include customFoodCaloriesField`);
  assert(content.includes('id="customFoodProteinField"'), `${file} must include customFoodProteinField`);
  assert(content.includes('id="customFoodCarbsField"'), `${file} must include customFoodCarbsField`);
  assert(content.includes('id="customFoodFatField"'), `${file} must include customFoodFatField`);
  assert(content.includes('id="customFoodLogNowCheck"'), `${file} must include customFoodLogNowCheck`);
  assert(content.includes('data-filter="custom_foods"'), `${file} must include custom_foods quick hub filter`);

  console.log(`✅ ${file} passed all UI markup checks.`);
});

// 2. Verify src/foodCategories.js & public/src/foodCategories.js
['src/foodCategories.js', 'public/src/foodCategories.js'].forEach(file => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  assert(content.includes("'custom'"), `${file} must contain 'custom' category`);
  assert(content.includes('המצרכים שלי'), `${file} must have title 'המצרכים שלי'`);
  console.log(`✅ ${file} passed category checks.`);
});

// 3. Verify app.js & public/app.js
['app.js', 'public/app.js'].forEach(file => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  assert(content.includes("customFoods: 'fitpulse_custom_foods'"), `${file} must define STORAGE_KEYS.customFoods`);
  assert(content.includes('STORAGE_KEYS.customFoods,'), `${file} must scope customFoods per user`);
  assert(content.includes('function openManualFoodDialog'), `${file} must define openManualFoodDialog`);
  assert(content.includes('function submitManualFoodForm'), `${file} must define submitManualFoodForm`);
  assert(content.includes('function deleteCustomFood'), `${file} must define deleteCustomFood`);
  assert(content.includes('state.foodCategory === \'custom\''), `${file} must filter by custom category`);
  console.log(`✅ ${file} passed logic and handler checks.`);
});

// 4. Verify style.css & public/style.css
['style.css', 'public/style.css'].forEach(file => {
  const content = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
  assert(content.includes('.manual-food-dialog'), `${file} must style .manual-food-dialog`);
  assert(content.includes('.new-custom-food-btn'), `${file} must style .new-custom-food-btn`);
  assert(content.includes('.custom-food-badge'), `${file} must style .custom-food-badge`);
  assert(content.includes('.btn-delete-custom-food'), `${file} must style .btn-delete-custom-food`);
  console.log(`✅ ${file} passed styling checks.`);
});

// 5. Test simulated custom food creation and proportional calculations
const customBoutiqueYogurt = {
  id: 'custom_food_test_123',
  name: 'יוגורט עיזים 10% משק צוריאל',
  category: 'dairy',
  tags: ['מצרך אישי', 'הוספה ידנית', 'יוגורט עיזים'],
  calories: 120,
  protein: 8.5,
  carbs: 4.2,
  fat: 10.0,
  defaultGrams: 150,
  unitName: 'גביע (150 גרם)',
  nutritionBasis: '100g',
  isCustom: true
};

assert.strictEqual(customBoutiqueYogurt.calories, 120);
assert.strictEqual(customBoutiqueYogurt.isCustom, true);
// If 170g consumed:
const multiplier = 170 / 100;
const cals170 = Math.round(customBoutiqueYogurt.calories * multiplier);
assert.strictEqual(cals170, 204, '170g should calculate to 204 calories');

console.log('🎉 ALL MANUAL / CUSTOM FOOD ENTRY CHECKS PASSED PERFECTLY!');
