/**
 * FitPulse – Canonical Food Categories
 *
 * Single source of truth for all food category definitions.
 * Compatible with both browser (globals) and Node.js environments.
 *
 * Browser: sets window.FitPulse.foodCategories
 * Node.js: also sets module.exports (for unit-testing or server use)
 *
 * @typedef {import('./types').FoodCategory} FoodCategory
 */

(function (root) {
  'use strict';

  /** @type {FoodCategory[]} */
  var foodCategories = [
    { id: 'all',                 name: 'הכל' },
    { id: 'custom',              name: '⭐ המצרכים שלי' },
    { id: 'meal_ideas',          name: '💡 רעיונות לארוחות' },
    { id: 'chains',              name: '🍔 מסעדות ורשתות' },
    { id: 'protein',             name: 'חלבונים ובשר' },
    { id: 'dairy',               name: 'מוצרי חלב וביצים' },
    { id: 'dairy_protein',       name: 'מוצרי פרוטאין' },
    { id: 'grains',              name: 'פחמימות ודגנים' },
    { id: 'fats',                name: 'שומנים ואגוזים' },
    { id: 'fruit',               name: 'פירות' },
    { id: 'vegetables',          name: 'ירקות' },
    { id: 'hummus_falafel',      name: 'חומוסיות ופלאפל' },
    { id: 'shawarma_meat',       name: 'שווארמה ובשרים' },
    { id: 'bakery_pastry',       name: 'מאפיות ולחמים' },
    { id: 'supermarket_staples', name: 'מזווה ישראלי' },
    { id: 'healthy_fitness',     name: 'ספורט ובריאות' },
    { id: 'street_food',         name: 'אוכל רחוב ישראלי' },
    { id: 'sweets_desserts',     name: 'קינוחים ומתוקים' },
    { id: 'scanned',             name: 'נסרקו' },
  ];

  // Expose on the shared FitPulse namespace (browser) or module.exports (Node).
  root.FitPulse = root.FitPulse || {};
  root.FitPulse.foodCategories = foodCategories;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { foodCategories: foodCategories };
  }

}(typeof window !== 'undefined' ? window : global));
