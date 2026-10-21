/**
 * FitPulse domain helpers for the web client.
 * Keep in sync with backend/types/schema.ts.
 * Loaded as a classic script (attaches to window.FitPulseDomain).
 */
(function (root) {
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

  function relationIdFor(trainerId, traineeId) {
    return trainerId + '_' + traineeId;
  }

  function isHttpUrl(value) {
    return /^https?:\/\/\S+$/i.test(String(value || '').trim());
  }

  function extractBarcodeDigits(raw) {
    const text = String(raw || '').trim();
    if (/^\d{8,14}$/.test(text)) return text;
    const fromUrl = text.match(/(?:^|[^\d])(\d{8,14})(?:[^\d]|$)/);
    return fromUrl ? fromUrl[1] : '';
  }

  function foodDocIdFromScan(raw) {
    const text = String(raw || '').trim();
    const digits = extractBarcodeDigits(text);
    if (digits) return digits;
    if (!text) return '';
    return String(text)
      .replace(/[\/#?&=]+/g, '_')
      .replace(/[^A-Za-z0-9._-]/g, '_')
      .slice(0, 80);
  }

  function parseScanPayload(raw) {
    const text = String(raw || '').trim();
    const barcode = foodDocIdFromScan(text);
    return {
      raw: text,
      barcode,
      sourceUrl: isHttpUrl(text) ? text : ''
    };
  }

  function validateMacrosPer100g(macros) {
    const keys = ['calories', 'protein', 'carbs', 'fats'];
    const limits = { calories: 15000, protein: 1000, carbs: 1000, fats: 1000 };
    if (!macros || typeof macros !== 'object') {
      return { ok: false, error: 'חסרים ערכים תזונתיים ל־100 גרם.' };
    }
    const normalized = {};
    for (const key of keys) {
      const value = Number(macros[key]);
      if (!Number.isFinite(value) || value < 0 || value > limits[key]) {
        return { ok: false, error: 'ערכים תזונתיים חייבים להיות מספרים שאינם שליליים.' };
      }
      normalized[key] = Math.round(value * 10) / 10;
    }
    return { ok: true, macros: normalized };
  }

  function validateCrowdsourcedFoodInput(input) {
    const name = String(input?.name || '').trim();
    const brand = String(input?.brand || '').trim();
    const barcode = foodDocIdFromScan(input?.barcode || '');
    const servingSize = String(input?.servingSize || '100g').trim() || '100g';
    const source = input?.source === 'scraped' ? 'scraped' : 'manual';
    if (!barcode) return { ok: false, error: 'ברקוד לא תקין.' };
    if (name.length < 1 || name.length > 200) return { ok: false, error: 'יש להזין שם מוצר.' };
    if (brand.length > 100) return { ok: false, error: 'שם המותג ארוך מדי.' };
    const macrosCheck = validateMacrosPer100g(input?.macrosPer100g);
    if (!macrosCheck.ok) return macrosCheck;
    const grams = Number(input?.gramsToLog);
    if (input?.gramsToLog != null && (!Number.isFinite(grams) || grams <= 0 || grams > 10000)) {
      return { ok: false, error: 'כמות הגרמים חייבת להיות גדולה מאפס.' };
    }
    return {
      ok: true,
      food: {
        barcode,
        name,
        brand,
        servingSize: servingSize.slice(0, 50),
        macrosPer100g: macrosCheck.macros,
        source
      }
    };
  }

  root.FitPulseDomain = {
    APP_ROLES: ['trainee', 'coach', 'manager'],
    COLLECTIONS: {
      users: 'users',
      trainerships: 'trainerships',
      workoutTemplates: 'workoutTemplates',
      workoutLogs: 'workoutLogs',
      nutritionGoals: 'nutritionGoals',
      foods: 'foods',
      exerciseCatalog: 'exerciseCatalog',
      equivalenceGroups: 'equivalenceGroups'
    },
    SUBCOLLECTIONS: {
      dailyLogs: 'dailyLogs',
      foodLogs: 'foodLogs'
    },
    normalizeRole,
    roleImpliesTrainer,
    relationIdFor,
    isHttpUrl,
    extractBarcodeDigits,
    foodDocIdFromScan,
    parseScanPayload,
    validateMacrosPer100g,
    validateCrowdsourcedFoodInput,
    FULL_PERMISSIONS: Object.freeze({
      canViewSleep: true,
      canViewNutrition: true,
      canViewWorkouts: true,
      canViewDailyLogs: true
    })
  };
})(typeof window !== 'undefined' ? window : globalThis);
