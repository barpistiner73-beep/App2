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
    return /^https:\/\/\S+$/i.test(String(value || '').trim());
  }

  function extractBarcodeDigits(raw) {
    const text = String(raw || '').trim();
    if (/^\d{8,14}$/.test(text)) return text;
    const fromUrl = text.match(/(?:^|[^\d])(\d{8,14})(?:[^\d]|$)/);
    return fromUrl ? fromUrl[1] : '';
  }

  function foodDocIdFromScan(raw) {
    const text = String(raw || '').trim();
    if (isHttpUrl(text)) return text.length <= 500 ? text : '';
    const digits = extractBarcodeDigits(text);
    if (digits) return digits;
    return '';
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
    const keys = ['calories', 'protein', 'carbs', 'fats', 'saturatedFats', 'transFats'];
    const limits = { calories: 1500, protein: 100, carbs: 100, fats: 100, saturatedFats: 100, transFats: 100 };
    if (!macros || typeof macros !== 'object') {
      return { ok: false, error: 'חסרים ערכים תזונתיים ל־100 גרם.' };
    }
    const normalized = {};
    for (const key of keys) {
      const rawValue = macros[key];
      const value = Number(rawValue);
      if (rawValue === null || rawValue === undefined || String(rawValue).trim() === '' ||
          !Number.isFinite(value) || value < 0 || value > limits[key]) {
        return { ok: false, error: 'ערכים תזונתיים חייבים להיות מספרים שאינם שליליים.' };
      }
      normalized[key] = Math.round(value * 10) / 10;
    }
    if (normalized.protein + normalized.carbs + normalized.fats > 100) {
      return { ok: false, error: 'סך המאקרו ל־100 גרם אינו יכול לעלות על 100 גרם.' };
    }
    if (normalized.saturatedFats + normalized.transFats > normalized.fats) {
      return { ok: false, error: 'שומן רווי ושומן טראנס אינם יכולים לעלות על סך השומן.' };
    }
    const expectedCalories = normalized.protein * 4 + normalized.carbs * 4 + normalized.fats * 9;
    if (Math.abs(normalized.calories - expectedCalories) > 40) {
      return { ok: false, error: 'הקלוריות אינן תואמות בקירוב לערכי המאקרו.' };
    }
    return { ok: true, macros: normalized };
  }

  function validateNutrientMap(values, keys, limits, label) {
    const normalized = {};
    for (const key of keys) {
      const rawValue = values?.[key] ?? 0;
      const value = Number(rawValue);
      if (String(rawValue).trim() === '' || !Number.isFinite(value) || value < 0 || value > limits[key]) {
        return { ok: false, error: `בדקו את הערכים בשדה ${label}.` };
      }
      normalized[key] = Math.round(value * 10) / 10;
    }
    return { ok: true, values: normalized };
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
    const micronutrientsCheck = validateNutrientMap(
      input?.micronutrients,
      ['sodium', 'potassium', 'calcium', 'iron', 'vitaminC'],
      { sodium: 50000, potassium: 50000, calcium: 10000, iron: 1000, vitaminC: 10000 },
      'המיקרו-נוטריינטים'
    );
    if (!micronutrientsCheck.ok) return micronutrientsCheck;
    const fattyAcidsCheck = validateNutrientMap(
      input?.fattyAcids,
      ['omega3', 'omega6'],
      { omega3: 100, omega6: 100 },
      'חומצות השומן'
    );
    if (!fattyAcidsCheck.ok) return fattyAcidsCheck;
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
        micronutrients: micronutrientsCheck.values,
        fattyAcids: fattyAcidsCheck.values,
        source
      }
    };
  }

  function validateCoachTask(task) {
    const type = String(task?.type || '');
    const title = String(task?.title || '').trim();
    if (!['weight_check', 'progress_photos', 'check_in', 'custom'].includes(type)) {
      return { ok: false, error: 'סוג המשימה אינו תקין.' };
    }
    if (title.length < 1 || title.length > 120) {
      return { ok: false, error: 'כותרת המשימה חייבת להכיל עד 120 תווים.' };
    }
    return { ok: true, task: { type, title } };
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
    validateCoachTask,
    FULL_PERMISSIONS: Object.freeze({
      canViewSleep: true,
      canViewNutrition: true,
      canViewWorkouts: true,
      canViewDailyLogs: true
    })
  };
})(typeof window !== 'undefined' ? window : globalThis);
