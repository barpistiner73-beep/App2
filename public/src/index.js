/**
 * FitPulse – Food Module Entry Point (Browser + Node.js)
 *
 * Initialises the FoodDatabaseManager, registers all core food items, and
 * patches the global FIT_DATA object so the rest of app.js keeps working
 * without any changes.
 *
 * Load order in index.html:
 *   1. src/foodCategories.js        → sets window.FitPulse.foodCategories
 *   2. src/foodDatabaseManager.js   → sets window.FitPulse.FoodDatabaseManager
 *   3. src/foodsDatabase.js         → sets window.FitPulse.foodsDatabase (raw array)
 *   4. src/index.js  (this file)    → bootstraps manager, patches FIT_DATA
 *   5. data.js                      → sets the rest of FIT_DATA (exercises etc.)
 *                                      then calls window.FitPulse._patchFitData(FIT_DATA)
 *   6. data/israeli_culinary_database/israeli_food_data.js → registers more foods
 *   7. app.js
 *
 * @typedef {import('./types').FoodItem}     FoodItem
 * @typedef {import('./types').FoodCategory} FoodCategory
 */

(function (root) {
  'use strict';

  var ns = root.FitPulse;
  if (!ns || !ns.FoodDatabaseManager || !ns.foodCategories || !ns.foodsDatabase) {
    console.error(
      '[FitPulse] src/index.js: Required FitPulse namespace members are missing. ' +
      'Ensure foodCategories.js, foodDatabaseManager.js, and foodsDatabase.js are loaded first.'
    );
    return;
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────────

  /** @type {InstanceType<typeof ns.FoodDatabaseManager>} */
  var dbManager = new ns.FoodDatabaseManager(ns.foodCategories);

  var registered = dbManager.registerFoods(ns.foodsDatabase);
  console.log(
    '[FitPulse FoodDB] Registered ' + registered + ' food items ' +
    'across ' + ns.foodCategories.length + ' categories.'
  );

  // Expose the manager on the namespace so other scripts (e.g. israeli_food_data.js)
  // can call window.FitPulse.dbManager.registerFoods() directly.
  ns.dbManager = dbManager;

  // ── Backward-Compatible FIT_DATA Patch ─────────────────────────────────────
  //
  // data.js sets the full FIT_DATA global.  We patch only the two food-related
  // keys so that:
  //   • FIT_DATA.foodCategories → canonical category list (live reference)
  //   • FIT_DATA.foodsDatabase  → a stable, live array that is always in sync
  //                               with the manager's internal store.
  //
  // KEY DESIGN: We use a STABLE REFERENCE ARRAY (_liveArray) rather than a
  // getter that returns a snapshot.  This is critical because app.js calls
  // FIT_DATA.foodsDatabase.push(...) and accesses items by index — both of
  // which require the same array object across reads.
  //
  // The manager's internal _store Map is the source of truth.  _liveArray is
  // kept in sync by a thin wrapper that:
  //   1. Intercepts pushes to _liveArray → routes to dbManager.registerFoods().
  //   2. Rebuilds _liveArray in-place whenever registerFoods is called.
  //
  // This means:
  //   • FIT_DATA.foodsDatabase.push(food)    → food lands in the manager store ✓
  //   • FIT_DATA.foodsDatabase[i]            → reads from the live array ✓
  //   • FIT_DATA.foodsDatabase.find/filter   → work as expected ✓
  //   • FIT_DATA.foodsDatabase = arr         → calls registerFoods(arr) ✓

  // The live, stable array reference.
  var _liveArray = [];

  /**
   * Rebuilds _liveArray in-place from the manager store.
   * All existing references to _liveArray stay valid.
   */
  function _syncLiveArray() {
    var fresh = dbManager.getAllFoods();
    _liveArray.length = 0;
    for (var i = 0; i < fresh.length; i++) {
      _liveArray[i] = fresh[i];
    }
  }

  // Initial sync — populate _liveArray with the foods registered above.
  _syncLiveArray();

  // Override _liveArray.push so direct push calls are routed through the manager.
  _liveArray.push = function () {
    var items = Array.prototype.slice.call(arguments);
    dbManager.registerFoods(items);
    _syncLiveArray();
    return _liveArray.length;
  };

  function applyPatch(fitData) {
    // Replace inline foodCategories array with the canonical one.
    fitData.foodCategories = ns.foodCategories;

    // Replace inline foodsDatabase with the stable live array.
    // A setter is included so that code that does `FIT_DATA.foodsDatabase = arr`
    // (instead of .push) also routes through the manager.
    Object.defineProperty(fitData, 'foodsDatabase', {
      get: function () { return _liveArray; },
      set: function (arr) {
        if (Array.isArray(arr)) {
          dbManager.registerFoods(arr);
          _syncLiveArray();
        }
      },
      configurable: true,
      enumerable: true,
    });
  }

  // Store patch function so data.js can call it after it defines FIT_DATA.
  ns._patchFitData = applyPatch;

  // Also expose a helper to manually re-sync if needed externally.
  ns._syncFoodArray = _syncLiveArray;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { dbManager: dbManager };
  }

}(typeof window !== 'undefined' ? window : global));
