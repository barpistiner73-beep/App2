const assert = require('assert');

function calculateProportionalNutrients(food, amount) {
  if (!food) return null;
  const isServing = food.nutritionBasis === 'serving';
  const numericAmount = Number(amount);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0 
    ? numericAmount 
    : (isServing ? 1 : (Number(food.defaultGrams) || 100));
  const multiplier = isServing ? validAmount : (validAmount / 100);

  const calcVal = (key, decimals = 1) => {
    if (typeof food[key] !== 'number' || !Number.isFinite(food[key])) return null;
    const factor = Math.pow(10, decimals);
    return Math.round(food[key] * multiplier * factor) / factor;
  };

  return {
    isServing,
    amount: validAmount,
    multiplier,
    unitLabel: isServing ? (food.unitName || 'מנה') : 'גרם',
    calories: Math.round((food.calories || 0) * multiplier),
    protein: calcVal('protein', 1) ?? 0,
    carbs: calcVal('carbs', 1) ?? 0,
    fat: calcVal('fat', 1) ?? 0,
    fiber: calcVal('fiber', 1),
    sodium: calcVal('sodium', 0),
    sugar: calcVal('sugar', 1)
  };
}

// Test case 1: 170 grams of entrecote steak (base per 100g)
const entrecote = {
  id: 'staple_steak_entrecote',
  name: 'סטייק אנטרקוט',
  calories: 252,
  protein: 25.5,
  carbs: 0.0,
  fat: 16.8,
  fiber: 0.0,
  sodium: 62
};

const result170 = calculateProportionalNutrients(entrecote, 170);
console.log('Result for 170g entrecote:', result170);

assert.strictEqual(result170.isServing, false, 'Should be recognized as staple (not serving)');
assert.strictEqual(result170.amount, 170, 'Amount should be 170');
assert.strictEqual(result170.multiplier, 1.7, 'Multiplier should be 1.7');
assert.strictEqual(result170.calories, Math.round(252 * 1.7), 'Calories should be 428');
assert.strictEqual(result170.protein, Math.round(25.5 * 1.7 * 10) / 10, 'Protein should be 43.4');
assert.strictEqual(result170.carbs, 0, 'Carbs should be 0');
assert.strictEqual(result170.fat, Math.round(16.8 * 1.7 * 10) / 10, 'Fat should be 28.6');

// Test case 2: Fixed serving meal (nutritionBasis: 'serving')
const aromaSalad = {
  id: 'ff_aroma_chicken_salad',
  name: 'סלט עוף ארומה',
  nutritionBasis: 'serving',
  unitName: 'קערה (ללא לחם)',
  calories: 282,
  protein: 46.0,
  carbs: 8.0,
  fat: 7.0
};

const resultServing2 = calculateProportionalNutrients(aromaSalad, 2);
console.log('Result for 2 servings aroma salad:', resultServing2);
assert.strictEqual(resultServing2.isServing, true, 'Should be recognized as serving');
assert.strictEqual(resultServing2.multiplier, 2, 'Multiplier should be 2');
assert.strictEqual(resultServing2.calories, 564, 'Calories should be 282 * 2 = 564');
assert.strictEqual(resultServing2.protein, 92, 'Protein should be 46 * 2 = 92');

console.log('🎉 All proportional calculations verified perfectly!');
