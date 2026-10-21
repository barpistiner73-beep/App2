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
    { id: 'chains',              name: 'רשתות מזון מהיר' },
    { id: 'protein',             name: 'חלבונים ובשר' },
    { id: 'dairy',               name: 'מוצרי חלב וביצים' },
    { id: 'grains',              name: 'פחמימות ודגנים' },
    { id: 'fats',                name: 'שומנים ואגוזים' },
    { id: 'fruit',               name: 'פירות' },
    { id: 'vegetables',          name: 'ירקות' },
    { id: 'scanned',             name: 'נסרקו' },
    { id: 'dairy_protein',       name: 'מוצרי חלב ופרוטאין' },
    { id: 'hummus_falafel',      name: 'חומוסיות ופלאפל' },
    { id: 'shawarma_meat',       name: 'שווארמה ובשרים' },
    { id: 'bakery_pastry',       name: 'מאפיות ולחמים' },
    { id: 'supermarket_staples', name: 'מזווה ישראלי' },
    { id: 'healthy_fitness',     name: 'ספורט ובריאות' },
    { id: 'sweets_desserts',     name: 'קינוחים ומתוקים' },
    { id: 'street_food',         name: 'אוכל רחוב ישראלי' },
  ];

  // Expose on the shared FitPulse namespace (browser) or module.exports (Node).
  root.FitPulse = root.FitPulse || {};
  root.FitPulse.foodCategories = foodCategories;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { foodCategories: foodCategories };
  }

}(typeof window !== 'undefined' ? window : global));
