/**
 * FitPulse – Shared Type Definitions (JSDoc)
 *
 * These JSDoc typedefs give editors full auto-complete and type-checking
 * without requiring a TypeScript compilation step.
 * This file has no runtime effect — it is documentation only.
 */

/**
 * @typedef {Object} FoodCategory
 * @property {string} id   - Unique slug (e.g. 'protein', 'grains').
 * @property {string} name - Display name shown in the UI (Hebrew).
 */

/**
 * @typedef {Object} FoodItem
 * @property {string}   id              - Unique food identifier.
 * @property {string}   name            - Display name (English or bilingual).
 * @property {string}   category        - Category ID (must match a FoodCategory id).
 * @property {string}   [categoryName]  - Resolved at runtime; do NOT hardcode in source data.
 * @property {string[]} tags            - Search / filter tags.
 * @property {number}   defaultGrams    - Default serving size in grams (use 1 for "per serving" items).
 * @property {string}   unitName        - Human-readable unit label (e.g. 'גרם', 'מנה').
 * @property {number}   calories        - kcal per 100 g (or per serving when nutritionBasis='serving').
 * @property {number}   [protein]       - Protein g per 100 g.
 * @property {number}   [carbs]         - Carbohydrates g per 100 g.
 * @property {number}   [fat]           - Fat g per 100 g.
 * @property {number}   [fiber]         - Dietary fiber g per 100 g.
 * @property {number}   [sodium]        - Sodium mg per 100 g.
 * @property {number}   [sugar]         - Total sugar g per 100 g.
 * @property {number}   [addedSugar]    - Added sugar g per 100 g.
 * @property {number}   [potassium]     - Potassium mg per 100 g.
 * @property {number}   [omega3]        - Omega-3 g per 100 g.
 * @property {number}   [omega6]        - Omega-6 g per 100 g.
 * @property {string}   [icon]          - Emoji or icon reference.
 * @property {string}   [source]        - Data provenance / citation string.
 * @property {string}   [fdcId]         - USDA FoodData Central ID.
 * @property {'per100g'|'serving'} [nutritionBasis] - Basis for nutrient values (default 'per100g').
 * @property {string[]} [unknownNutrients] - List of nutrient keys whose values are unavailable.
 */
