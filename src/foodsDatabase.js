/**
 * FitPulse – Core Foods Database (Source Data)
 *
 * Rules for entries in this file:
 *  1. DO NOT add a `categoryName` property – it is injected automatically at
 *     runtime by FoodDatabaseManager based on the `category` id.
 *  2. `category` MUST be one of the ids defined in src/foodCategories.js.
 *  3. Optional nutrient fields may be omitted; the manager defaults them to 0.
 *  4. `calories` are per 100 g unless `nutritionBasis: 'serving'` is set.
 *
 * Browser: sets window.FitPulse.foodsDatabase
 * Node.js: also sets module.exports
 *
 * @typedef {import('./types').FoodItem} FoodItem
 */

(function (root) {
  'use strict';

  /** @type {FoodItem[]} */
  var foodsDatabase = [

    // ─── Fast Food Chains ──────────────────────────────────────────────────────
    {
      id: 'ff_mcd_bigmac',
      name: "McDonald's Big Mac",
      category: 'chains',
      tags: ['burger', 'beef', 'fast food', 'מקדונלדס', 'המבורגר'],
      defaultGrams: 215, unitName: 'מנה',
      calories: 256,
      protein: 11.6, carbs: 20.9, fat: 14.0, fiber: 1.4,
      sodium: 470, sugar: 4.2, potassium: 177, omega3: 0.09, omega6: 1.6,
      icon: '🍔',
      source: 'Branded reference estimate; check the current package label.',
    },
    {
      id: 'ff_mcd_nuggets_10',
      name: "McDonald's Chicken McNuggets",
      category: 'chains',
      tags: ['chicken', 'nuggets', 'fast food', 'מקדונלדס', 'עוף'],
      defaultGrams: 160, unitName: 'מנה',
      calories: 263,
      protein: 15.0, carbs: 15.6, fat: 15.0, fiber: 0.9,
      sodium: 525, sugar: 0.3, potassium: 200, omega3: 0.06, omega6: 2.3,
      icon: '🍗',
      source: 'Branded reference estimate; check the current package label.',
    },
    {
      id: 'ff_aroma_halloumi_salad',
      name: 'Halloumi Salad with Dressing',
      category: 'chains',
      tags: ['salad', 'halloumi', 'cheese', 'ארומה', 'חלומי'],
      defaultGrams: 350, unitName: 'קערה',
      calories: 194,
      protein: 8.0, carbs: 6.3, fat: 14.9, fiber: 1.7,
      sodium: 357, sugar: 2.3, potassium: 154, omega3: 0.11, omega6: 1.7,
      icon: '🥗',
      source: 'Restaurant recipe estimate; ingredients and portions vary.',
    },
    {
      id: 'ff_dominos_pizza_slice',
      name: "Domino's Cheese Pizza",
      category: 'chains',
      tags: ['pizza', 'cheese', 'fast food', 'דומינוס'],
      defaultGrams: 105, unitName: 'משולש',
      calories: 257,
      protein: 10.5, carbs: 30.5, fat: 10.0, fiber: 1.9,
      sodium: 552, sugar: 3.3, potassium: 171, omega3: 0.10, omega6: 1.7,
      icon: '🍕',
      source: 'Branded reference estimate; recipe varies by region.',
    },
    {
      id: 'ff_bbb_burger_220',
      name: 'Beef Burger Patty, 80/20',
      category: 'chains',
      tags: ['beef', 'burger', 'בשר', 'המבורגר'],
      defaultGrams: 220, unitName: 'קציצה',
      calories: 218,
      protein: 19.1, carbs: 0.5, fat: 15.5,
      sodium: 282, potassium: 223, omega3: 0.14, omega6: 0.95,
      icon: '🥩',
      source: 'Generic cooked beef reference; restaurant patties vary.',
    },

    // ─── Proteins & Meat ────────────────────────────────────────────────────────
    {
      id: 'f_salmon_fillet',
      name: 'Atlantic Salmon, Farmed, Raw',
      category: 'protein',
      tags: ['salmon', 'fish', 'omega-3', 'סלמון', 'דג'],
      defaultGrams: 150, unitName: 'גרם',
      calories: 208,
      protein: 20.42, fat: 13.42,
      sodium: 59, potassium: 363, omega3: 2.26, omega6: 0.17,
      icon: '🐟',
      fdcId: '175167',
      source: 'USDA FoodData Central, FDC ID 175167, farmed Atlantic salmon, raw. Per 100 g.',
    },
    {
      id: 'f_chicken_breast',
      name: 'Chicken Breast, Roasted',
      category: 'protein',
      tags: ['chicken', 'poultry', 'lean protein', 'עוף', 'חזה עוף'],
      defaultGrams: 150, unitName: 'גרם',
      calories: 165,
      protein: 31.02, fat: 3.57,
      sodium: 74, potassium: 256, omega3: 0.03, omega6: 0.74,
      icon: '🍗',
      fdcId: '171477',
      source: 'USDA FoodData Central, FDC ID 171477, roasted chicken breast, meat only. Per 100 g.',
    },

    // ─── Fats & Nuts ────────────────────────────────────────────────────────────
    {
      id: 'f_walnuts',
      name: 'Walnuts, English',
      category: 'fats',
      tags: ['nuts', 'omega-3', 'אגוזים', 'אגוזי מלך'],
      defaultGrams: 30, unitName: 'חופן (30 גרם)',
      calories: 654,
      protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7,
      sodium: 2, sugar: 2.6, potassium: 441, omega3: 9.08, omega6: 38.09,
      icon: '🌰',
      fdcId: '170187',
      source: 'USDA FoodData Central generic English walnuts reference.',
    },
    {
      id: 'f_olive_oil',
      name: 'Olive Oil',
      category: 'fats',
      tags: ['olive', 'oil', 'fat', 'שמן זית'],
      defaultGrams: 14, unitName: 'כף (14 גרם)',
      calories: 884,
      fat: 100,
      sodium: 2, potassium: 1, omega3: 0.76, omega6: 9.76,
      icon: '🫒',
      fdcId: '171413',
      source: 'USDA FoodData Central olive oil reference.',
    },

    // ─── Fruit ──────────────────────────────────────────────────────────────────
    {
      id: 'f_banana',
      name: 'Banana, Raw',
      category: 'fruit',
      tags: ['fruit', 'carbohydrate', 'banana', 'בננה', 'פרי'],
      defaultGrams: 118, unitName: 'בננה בינונית',
      calories: 89,
      protein: 1.09, carbs: 22.84, fat: 0.33, fiber: 2.6,
      sodium: 1, sugar: 12.23, potassium: 358, omega3: 0.03, omega6: 0.05,
      icon: '🍌',
      fdcId: '173944',
      source: 'USDA FoodData Central generic raw banana reference.',
    },
    {
      id: 'f_avocado',
      name: 'Avocado, Raw',
      category: 'fruit',
      tags: ['avocado', 'fiber', 'אבוקדו'],
      defaultGrams: 100, unitName: 'גרם',
      calories: 160,
      protein: 2, carbs: 8.53, fat: 14.66, fiber: 6.7,
      sodium: 7, sugar: 0.66, potassium: 485, omega3: 0.11, omega6: 1.67,
      icon: '🥑',
      fdcId: '171705',
      source: 'USDA FoodData Central generic raw avocado reference.',
    },

    // ─── Grains & Carbohydrates ──────────────────────────────────────────────────
    {
      id: 'f_oats',
      name: 'Oats, Dry',
      category: 'grains',
      tags: ['oats', 'whole grain', 'fiber', 'שיבולת שועל'],
      defaultGrams: 40, unitName: 'מנה (40 גרם)',
      calories: 379,
      protein: 13.15, carbs: 67.7, fat: 6.52, fiber: 10.1,
      sodium: 6, sugar: 0.99, potassium: 362, omega3: 0.11, omega6: 2.42,
      icon: '🥣',
      fdcId: '173904',
      source: 'USDA FoodData Central generic dry oats reference.',
    },
    {
      id: 'f_rice',
      name: 'White Rice, Cooked',
      category: 'grains',
      tags: ['rice', 'carbohydrate', 'אורז'],
      defaultGrams: 150, unitName: 'מנה',
      calories: 130,
      protein: 2.69, carbs: 28.17, fat: 0.28, fiber: 0.4,
      sodium: 1, sugar: 0.05, potassium: 35, omega3: 0.01, omega6: 0.06,
      icon: '🍚',
      fdcId: '168878',
      source: 'USDA FoodData Central generic cooked white rice reference.',
    },

    // ─── Dairy & Eggs ───────────────────────────────────────────────────────────
    {
      id: 'f_egg',
      name: 'Egg, Hard-Boiled',
      category: 'dairy',
      tags: ['egg', 'protein', 'ביצה'],
      defaultGrams: 50, unitName: 'ביצה',
      calories: 155,
      protein: 12.58, carbs: 1.12, fat: 10.61,
      sodium: 124, sugar: 1.12, potassium: 126, omega3: 0.04, omega6: 1.22,
      icon: '🥚',
      fdcId: '173424',
      source: 'USDA FoodData Central generic hard-boiled egg reference.',
    },
    {
      id: 'f_greek_yogurt',
      name: 'Greek Yogurt, Plain, Nonfat',
      category: 'dairy',
      tags: ['yogurt', 'dairy', 'protein', 'יוגורט'],
      defaultGrams: 170, unitName: 'גביע',
      calories: 59,
      protein: 10.19, carbs: 3.6, fat: 0.39,
      sodium: 36, sugar: 3.24, potassium: 141, omega3: 0.01, omega6: 0.02,
      icon: '🥛',
      source: 'USDA FoodData Central generic plain nonfat Greek yogurt reference.',
    },

    // ─── Vegetables ─────────────────────────────────────────────────────────────
    {
      id: 'f_broccoli',
      name: 'Broccoli, Cooked',
      category: 'vegetables',
      tags: ['broccoli', 'vegetable', 'fiber', 'ברוקולי'],
      defaultGrams: 100, unitName: 'גרם',
      calories: 35,
      protein: 2.38, carbs: 7.18, fat: 0.41, fiber: 3.3,
      sodium: 41, sugar: 1.39, potassium: 293, omega3: 0.10, omega6: 0.03,
      icon: '🥦',
      source: 'USDA FoodData Central generic cooked broccoli reference.',
    },

    // ─── Israeli Fast Food – McDonald's Israel ─────────────────────────────────
    {
      id: 'il_mcd_mcroyal_spicy_patty',
      name: "McDonald's Israel McRoyal Spicy Patty",
      category: 'chains',
      tags: ['mcdonalds', 'mcroyal', 'beef', 'patty', 'מקדונלדס'],
      defaultGrams: 100, unitName: 'קציצה (אומדן 100 גרם)',
      calories: 160,
      unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
      icon: '🍔',
      source: "User-provided approximate calorie value; not verified against a current McDonald's Israel nutrition label. Other nutrients unavailable.",
    },
    {
      id: 'il_mcd_kids_meal_estimate',
      name: "McDonald's Israel Kids Meal (upper-bound estimate)",
      category: 'chains',
      tags: ['mcdonalds', 'kids meal', 'children', 'מקדונלדס', 'ילדים'],
      defaultGrams: 1, unitName: 'ארוחה',
      nutritionBasis: 'serving',
      calories: 499,
      unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
      icon: '🍟',
      source: 'User-provided upper-bound estimate (<500 kcal), represented as 499 kcal per meal. The exact meal varies and this is not verified manufacturer nutrition data; other nutrients unavailable.',
    },

    // ─── Israeli Fast Food – BBB ───────────────────────────────────────────────
    {
      id: 'il_bbb_classic_burger_160',
      name: 'BBB Classic Burger, 160 g',
      category: 'chains',
      tags: ['bbb', 'classic burger', 'burger', 'המבורגר'],
      defaultGrams: 160, unitName: 'המבורגר (160 גרם)',
      calories: 281.25,
      unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
      icon: '🍔',
      source: 'User-provided approximate estimate: about 450 kcal per 160 g burger. Not verified against a current BBB nutrition label; other nutrients unavailable.',
    },
    {
      id: 'il_bbb_butcher_burger_225',
      name: 'BBB Butcher Burger, 225 g',
      category: 'chains',
      tags: ['bbb', 'butcher burger', 'burger', 'המבורגר'],
      defaultGrams: 225, unitName: 'המבורגר (225 גרם)',
      calories: 275.56,
      unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
      icon: '🥩',
      source: 'User-provided approximate estimate: about 620 kcal per 225 g burger. Not verified against a current BBB nutrition label; other nutrients unavailable.',
    },
    {
      id: 'il_bbb_burger_bun_estimate',
      name: 'BBB Burger Bun (estimated)',
      // Moved from 'chains' → 'bakery_pastry' (more accurate subcategory).
      category: 'bakery_pastry',
      tags: ['bbb', 'bun', 'bread', 'לחמנייה'],
      defaultGrams: 1, unitName: 'לחמנייה',
      nutritionBasis: 'serving',
      calories: 120,
      unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
      icon: '🍞',
      source: 'User-provided approximate estimate of about 120 kcal per bun. Not verified against a current BBB nutrition label; other nutrients unavailable.',
    },
  ];

  root.FitPulse = root.FitPulse || {};
  root.FitPulse.foodsDatabase = foodsDatabase;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { foodsDatabase: foodsDatabase };
  }

}(typeof window !== 'undefined' ? window : global));
