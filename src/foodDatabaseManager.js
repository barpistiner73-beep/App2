/**
 * FitPulse – Food Database Manager
 *
 * Browser/Node-compatible class that provides:
 *  - Fast category-name resolution via a pre-built Map.
 *  - Duplicate-ID detection (warns & skips on collision).
 *  - Automatic default zero-values for missing optional nutrient fields.
 *  - Dynamic `categoryName` injection — no hardcoding in source data.
 *
 * Browser usage:
 *   Load this script after src/foodCategories.js. The manager is exposed as
 *   window.FitPulse.FoodDatabaseManager.
 *
 * Node.js usage:
 *   const { FoodDatabaseManager } = require('./foodDatabaseManager');
 *
 * @typedef {import('./types').FoodCategory} FoodCategory
 * @typedef {import('./types').FoodItem}     FoodItem
 */

(function (root) {
  'use strict';

  /** Nutrient fields that default to 0 when omitted from a food record. */
  var NUTRIENT_DEFAULTS = {
    protein:    0,
    carbs:      0,
    fat:        0,
    fiber:      0,
    sodium:     0,
    sugar:      0,
    addedSugar: 0,
    potassium:  0,
    omega3:     0,
    omega6:     0,
  };

  /**
   * @constructor
   * @param {FoodCategory[]} [categories] - Category list to build the name map from.
   *   Defaults to window.FitPulse.foodCategories (browser) or the imported array (Node).
   */
  function FoodDatabaseManager(categories) {
    /**
     * Internal store keyed by food ID for O(1) deduplication checks.
     * @type {Map<string, FoodItem>}
     */
    this._store = new Map();

    // Accept categories explicitly, or fall back to the shared namespace.
    var cats = categories
      || (root.FitPulse && root.FitPulse.foodCategories)
      || [];

    /**
     * Pre-built category ID → display name lookup.
     * @type {Map<string, string>}
     */
    this._categoryNameMap = new Map(
      cats.map(function (cat) { return [cat.id, cat.name]; })
    );
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  /**
   * Resolves `categoryName` for a food item using the canonical categories map.
   * Falls back to the existing value or an empty string when the category is unknown.
   *
   * @param {FoodItem} food
   * @returns {string}
   */
  FoodDatabaseManager.prototype._resolveCategoryName = function (food) {
    if (this._categoryNameMap.has(food.category)) {
      return this._categoryNameMap.get(food.category);
    }
    if (food.categoryName) {
      console.warn(
        '[FoodDatabaseManager] Unknown category id "' + food.category +
        '" for food "' + food.id + '". Keeping existing categoryName "' + food.categoryName + '".'
      );
      return food.categoryName;
    }
    console.warn(
      '[FoodDatabaseManager] Unknown category id "' + food.category +
      '" for food "' + food.id + '". categoryName will be empty.'
    );
    return '';
  };

  /**
   * Applies nutrient defaults and resolves `categoryName` for a single item.
   * Returns a NEW object — the original is never mutated.
   *
   * @param {FoodItem} food
   * @returns {FoodItem}
   */
  FoodDatabaseManager.prototype._normalise = function (food) {
    var categoryName = this._resolveCategoryName(food);
    // Spread NUTRIENT_DEFAULTS first so explicit zeros in food data take precedence.
    var normalised = Object.assign({}, NUTRIENT_DEFAULTS, food, { categoryName: categoryName });
    return normalised;
  };

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Registers an array of food items into the database.
   * Duplicate IDs are skipped with a warning; all other items are normalised.
   *
   * @param {FoodItem[]} foods
   * @returns {number} Count of items successfully registered.
   */
  FoodDatabaseManager.prototype.registerFoods = function (foods) {
    var registered = 0;
    var self = this;
    foods.forEach(function (food) {
      if (!food.id) {
        console.warn('[FoodDatabaseManager] Skipping food with no id:', food.name || '(unnamed)');
        return;
      }
      if (self._store.has(food.id)) {
        console.warn(
          '[FoodDatabaseManager] Duplicate food id "' + food.id +
          '" ("' + food.name + '") – skipping.'
        );
        return;
      }
      self._store.set(food.id, self._normalise(food));
      registered++;
    });
    return registered;
  };

  /**
   * Returns all registered food items as an array (insertion order preserved).
   * @returns {FoodItem[]}
   */
  FoodDatabaseManager.prototype.getAllFoods = function () {
    var result = [];
    this._store.forEach(function (food) { result.push(food); });
    return result;
  };

  /**
   * Looks up a single food item by its ID.
   * @param {string} id
   * @returns {FoodItem|undefined}
   */
  FoodDatabaseManager.prototype.getFood = function (id) {
    return this._store.get(id);
  };

  /**
   * Returns all items belonging to a given category ID.
   * Use 'all' to return every item.
   *
   * @param {string} categoryId
   * @returns {FoodItem[]}
   */
  FoodDatabaseManager.prototype.getFoodsByCategory = function (categoryId) {
    if (categoryId === 'all') return this.getAllFoods();
    var result = [];
    this._store.forEach(function (food) {
      if (food.category === categoryId) result.push(food);
    });
    return result;
  };

  /**
   * Total number of registered food items.
   * @returns {number}
   */
  FoodDatabaseManager.prototype.size = function () {
    return this._store.size;
  };

  // Expose on shared namespace (browser) or module.exports (Node).
  root.FitPulse = root.FitPulse || {};
  root.FitPulse.FoodDatabaseManager = FoodDatabaseManager;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FoodDatabaseManager: FoodDatabaseManager };
  }

}(typeof window !== 'undefined' ? window : global));
