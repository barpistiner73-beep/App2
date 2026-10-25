(function () {
  'use strict';

  const STORAGE_KEYS = {
    profile: 'fitpulse_user_profile',
    workouts: 'fitpulse_workout_logs',
    nutrition: 'fitpulse_nutrition_logs',
    weights: 'fitpulse_weight_logs',
    sharedRoutines: 'fitpulse_shared_routines',
    customRoutines: 'fitpulse_custom_routines',
    equivalentExercises: 'fitpulse_equivalent_exercises',
    water: 'fitpulse_daily_water',
    sleep: 'fitpulse_daily_sleep',
    scannedFoods: 'fitpulse_scanned_foods',
    dailyReports: 'fitpulse_daily_reports',
    coachMode: 'fitpulse_coach_mode'
  };

  let state;

  function getUserStorageKey(key) {
    if (!state?.currentUser) return key;
    const u = state.currentUser;
    const isDemo = (u.id && u.id.startsWith('usr_')) || 
                   (u.email && (u.email === 'daniel@fitpulse.com' || u.email === 'shira@fitpulse.com' || u.email === 'coach@fitpulse.com' || u.email === 'manager@fitpulse.com'));
    if (isDemo) return key;
    const scopedKeys = [
      STORAGE_KEYS.profile,
      STORAGE_KEYS.workouts,
      STORAGE_KEYS.nutrition,
      STORAGE_KEYS.weights,
      STORAGE_KEYS.water,
      STORAGE_KEYS.sleep,
      STORAGE_KEYS.dailyReports,
      STORAGE_KEYS.customRoutines,
      STORAGE_KEYS.coachMode
    ];
    if (scopedKeys.includes(key)) {
      return `${key}_${u.id || u.uid}`;
    }
    return key;
  }

  function readStorage(key, fallback) {
    try {
      const storageKey = getUserStorageKey(key);
      const value = localStorage.getItem(storageKey);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error(`Could not read FitPulse data from local storage (${key}).`, error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      const storageKey = getUserStorageKey(key);
      localStorage.setItem(storageKey, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Could not save FitPulse data to local storage (${key}).`, error);
      alert('לא ניתן לשמור את הנתונים בדפדפן. בדקו את נפח האחסון וההרשאות.');
      return false;
    }
  }

  function readSession(key, fallback) {
    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeSession(key, value) {
    try {
      if (value === null || value === undefined) {
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  let profileListenerUnsubscribe = null;
  state = {
    currentDate: localDateKey(new Date()),
    profile: { ...FIT_DATA.defaultProfile, ...readStorage(STORAGE_KEYS.profile, {}) },
    workoutLogs: readStorage(STORAGE_KEYS.workouts, {}),
    nutritionLogs: readStorage(STORAGE_KEYS.nutrition, {}),
    weightLogs: readStorage(STORAGE_KEYS.weights, []),
    sharedRoutines: readStorage(STORAGE_KEYS.sharedRoutines, {}),
    customRoutines: readStorage(STORAGE_KEYS.customRoutines, []),
    equivalentExerciseGroups: readStorage(STORAGE_KEYS.equivalentExercises, []),
    waterLogs: readStorage(STORAGE_KEYS.water, {}),
    sleepLogs: readStorage(STORAGE_KEYS.sleep, {}),
    scannedFoods: readStorage(STORAGE_KEYS.scannedFoods, []),
    activeTab: 'tab-dashboard',
    coachViewMode: 'coaching',
    coachModeUserId: null,
    isTimeCrunchActive: false,
    activeSession: null,
    foodQuery: '',
    foodCategory: 'all',
    workoutFilter: 'all',
    workoutCategory: 'all',
    workoutQuery: '',
    exerciseQuery: '',
    exerciseMuscle: 'all',
    exerciseEquipment: 'all',
    scannerControls: null,
    scannerReader: null,
    remoteFoodController: null,
    remoteFoods: [],
    remoteFoodStatus: '',
    selectedExercises: new Set(),
    exerciseLibrarySelection: null,
    exerciseLibraryOnToggle: null,
    exerciseLibraryOnDone: null,
    exerciseLibraryMode: 'multi',
    exerciseLibraryOnPick: null,
    selectedTraineeId: FIT_DATA.coachTrainees[0]?.id || 'client_1',
    coachSubpage: 'management',
    coachActivityFilter: 'all',
    dailyReportDate: localDateKey(new Date()),
    dailyReports: readStorage(STORAGE_KEYS.dailyReports, {}),
    coachHistoryRange: 14,
    coachHistoricalReports: [],
    activeReportsUnsub: null,
    activeCoachAccessUnsub: null,
    coachAccessSubscriptionKey: '',
    coachDailyReportAccess: false,
    currentUser: readSession('fitpulse_auth_session', null),
    systemUsers: [
      {
        id: 'usr_mgr',
        userId: 'usr_mgr',
        name: 'מנהל מערכת',
        fullName: 'מנהל מערכת',
        email: 'manager@fitpulse.com',
        role: 'manager',
        isTrainer: true,
        status: 'active',
        approvalStatus: 'approved',
        isSpecial: true,
        createdAt: '2026-01-01'
      },
      {
        id: 'usr_coach_real',
        userId: 'usr_coach_real',
        name: 'מאמן (חשבון אמת)',
        fullName: 'מאמן (חשבון אמת)',
        email: 'coach.real@fitpulse.com',
        role: 'coach',
        isTrainer: true,
        isPublicVisible: true,
        status: 'active',
        approvalStatus: 'approved',
        isSpecial: true,
        createdAt: '2026-01-01'
      },
      {
        id: 'usr_trainee_real',
        userId: 'usr_trainee_real',
        name: 'מתאמן (חשבון אמת)',
        fullName: 'מתאמן (חשבון אמת)',
        email: 'trainee.real@fitpulse.com',
        role: 'trainee',
        isTrainer: false,
        traineeId: 'usr_trainee_real',
        routine: 'Push-Pull-Legs 4D',
        status: 'active',
        approvalStatus: 'approved',
        isSpecial: true,
        createdAt: '2026-01-01'
      }
    ],
    managerRoleFilter: 'all',
    managerUserSearch: '',
    auditLogs: []
  };
  state.equivalentExerciseGroups = Array.isArray(state.equivalentExerciseGroups)
    ? state.equivalentExerciseGroups.filter(group =>
      group && typeof group.id === 'string' &&
      FIT_DATA.muscleGroups.some(item => item.id === group.muscleGroup) &&
      typeof group.subgroup === 'string' &&
      getExercise(group.preferredExerciseId) &&
      getExercise(group.preferredExerciseId).muscle === group.muscleGroup &&
      getExerciseSubgroup(getExercise(group.preferredExerciseId)) === group.subgroup &&
      Array.isArray(group.equivalentExerciseIds) &&
      group.equivalentExerciseIds.length > 0 &&
      group.equivalentExerciseIds.every(id => getExercise(id) &&
        id !== group.preferredExerciseId &&
        getExercise(id).muscle === group.muscleGroup &&
        getExerciseSubgroup(getExercise(id)) === group.subgroup))
    : [];
  let editingEquivalentGroupId = null;

  const numberFormat = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 1 });
  let exerciseAnimationId = 0;
  const WORKOUT_CARD_LABELS = {
    session_push: 'אימון פוש (דחיפה)',
    session_pull: 'אימון פול (משיכה)',
    session_legs: 'אימון רגליים (Legs)',
    session_upper: 'אימון פלג גוף עליון (Upper)',
    session_lower: 'אימון פלג גוף תחתון (Lower)',
    session_full_body: 'אימון גוף מלא (Full Body)',
    session_chest_back: 'אימון חזה וגב',
    session_shoulders_arms: 'אימון כתפיים וידיים',
    session_back_shoulders: 'אימון גב וכתפיים',
    session_chest_arms: 'אימון חזה וידיים',
    // Fallbacks for legacy/stored logs
    split_ppl: 'אימון פוש-פול-רגליים (ישן)',
    split_upper_lower: 'אימון עליון-תחתון (ישן)',
    split_full_body: 'אימון גוף מלא (ישן)',
    session_legs_hebrew: 'אימון רגליים'
  };
  const WORKOUT_CARD_ORDER = [
    'session_push', 'session_pull', 'session_legs',
    'session_upper', 'session_lower', 'session_full_body',
    'session_chest_back', 'session_shoulders_arms',
    'session_back_shoulders', 'session_chest_arms'
  ];
  const WORKOUT_FILTERS = [
    ['all', 'כל השרירים'], ['chest', 'חזה (Chest)'], ['back', 'גב (Back)'], ['legs', 'רגליים (Legs)'],
    ['shoulders', 'כתפיים (Shoulders)'], ['arms', 'זרועות (Arms)'], ['core', 'ליבה (Core)']
  ];

  function getPreviousSets(exerciseId) {
    if (!exerciseId) return [];
    const allWorkouts = Object.values(state.workoutLogs || {})
      .flatMap(workouts => Array.isArray(workouts) ? workouts : [])
      .sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
    for (const workout of allWorkouts) {
      if (!Array.isArray(workout.setLogs)) continue;
      const matchingSets = workout.setLogs
        .filter(set => set.exerciseId === exerciseId && set.completed)
        .sort((left, right) => Number(left.setNumber || 0) - Number(right.setNumber || 0));
      if (matchingSets.length) {
        return matchingSets.map(set => ({
          weight: Number(set.weight) || 0,
          reps: Number(set.reps) || 0
        }));
      }
    }
    return [];
  }

  function getPreviousExercisePerformance(exerciseId) {
    const matchingSets = getPreviousSets(exerciseId);
    if (!matchingSets.length) return null;
    const bestSet = matchingSets.reduce((prev, curr) => (Number(curr.weight) > Number(prev.weight) ? curr : prev), matchingSets[0]);
    return { weight: bestSet.weight, reps: bestSet.reps };
  }

  let exerciseSwapContext = null;
  state.customRoutines = Array.isArray(state.customRoutines)
    ? state.customRoutines.filter(validateRoutine)
    : [];
  FIT_DATA.presetWorkouts.push(...state.customRoutines);
  state.scannedFoods = Array.isArray(state.scannedFoods)
    ? state.scannedFoods.filter(food => food && typeof food.id === 'string' && food.id.startsWith('off-') && typeof food.name === 'string' && Number.isFinite(food.calories))
    : [];
  FIT_DATA.foodsDatabase.push(...state.scannedFoods.filter(cached => !FIT_DATA.foodsDatabase.some(food => food.id === cached.id)));
  const todayMeals = () => state.nutritionLogs[state.currentDate] || [];
  const todayWorkouts = () => state.workoutLogs[state.currentDate] || [];
  const byId = id => document.getElementById(id);

  function formatNumber(value) {
    return numberFormat.format(Number(value) || 0);
  }

  function nutrientValueText(item, nutrient, unit = '') {
    const unknown = Array.isArray(item?.unknownNutrients) && item.unknownNutrients.includes(nutrient);
    if (unknown || typeof item?.[nutrient] !== 'number' || !Number.isFinite(item[nutrient])) return 'לא דווח';
    return `${formatNumber(item[nutrient])}${unit}`;
  }

  function getUserRole() {
    const domain = window.FitPulseDomain;
    const raw = state.currentUser?.role || state.profile.role;
    if (domain && typeof domain.normalizeRole === 'function') {
      return domain.normalizeRole(raw, String(raw || '').toLowerCase() === 'trainer_admin');
    }
    return String(raw || '').trim().toLowerCase() === 'trainer_admin' ? 'coach' : (raw || 'trainee');
  }

  function isManagerRole() {
    return getUserRole() === 'manager';
  }

  function isCoachRole() {
    return getUserRole() === 'coach';
  }

  function isTrainerRole() {
    return isCoachModeActive();
  }

  function isCoachModeActive() {
    return isCoachRole() && state.coachViewMode === 'coaching';
  }

  function isTraineeModeActive() {
    return getUserRole() === 'trainee' || (isCoachRole() && state.coachViewMode === 'training');
  }

  function isTabAllowedForRole(tabId) {
    if (isManagerRole()) return tabId === 'tab-app-manager';
    if (isCoachModeActive()) return ['tab-coach', 'tab-equivalents'].includes(tabId);
    if (isTraineeModeActive()) return !['tab-coach', 'tab-equivalents', 'tab-app-manager'].includes(tabId);
    return false;
  }

  function defaultTabForRole() {
    if (isManagerRole()) return 'tab-app-manager';
    return isCoachModeActive() ? 'tab-coach' : 'tab-dashboard';
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  const UI_ICONS = {
    close: 'M18 6 6 18M6 6l12 12',
    trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
    swap: 'M7 8h13M16 5l4 3-4 3M17 16H4M8 19l-4-3 4-3',
    grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
    check: 'M5 13l4 4L19 7',
    plus: 'M12 5v14M5 12h14',
    up: 'M6 14l6-6 6 6',
    down: 'M6 10l6 6 6-6'
  };

  function createSvgIcon(iconKey) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('ui-icon');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', UI_ICONS[iconKey] || UI_ICONS.close);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', iconKey === 'grip' ? '3.4' : '2');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.append(path);
    return svg;
  }

  function createIconButton(className, label, iconKey) {
    const button = createElement('button', className);
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(createSvgIcon(iconKey));
    return button;
  }

  function suggestedWeightForExercise(exercise) {
    if (!exercise) return 0;
    const previous = getPreviousSets(exercise.id)[0];
    if (previous) return previous.weight;
    const profileWeight = Number(state.profile.weight) || Number(FIT_DATA.defaultProfile.weight);
    const profileScale = Math.max(0.6, Math.min(1.4, profileWeight / Number(FIT_DATA.defaultProfile.weight)));
    return Math.round((Number(exercise.defaultWeight) || 0) * profileScale * 2) / 2;
  }

  function applyExerciseToBuilderRow(row, exerciseId) {
    const exercise = getExercise(exerciseId);
    if (!exercise) return;
    row.preferredExerciseId = exercise.id;
    row.muscleGroup = exercise.muscle;
    row.subgroup = getExerciseSubgroup(exercise);
    row.sets = Number(exercise.defaultSets) || 3;
    row.reps = Number(exercise.defaultReps) || 10;
    row.weight = suggestedWeightForExercise(exercise);
    const previous = getPreviousSets(exercise.id);
    const count = Math.max(1, Number(row.sets) || 3);
    row.setPrescriptions = Array.from({ length: count }, (_, index) => ({
      weight: previous[index]?.weight ?? row.weight,
      reps: previous[index]?.reps ?? row.reps
    }));
  }

  function ensureBuilderPrescriptions(row) {
    const count = Math.max(1, Number(row.sets) || (row.setPrescriptions?.length) || 3);
    if (!Array.isArray(row.setPrescriptions) || !row.setPrescriptions.length) {
      row.setPrescriptions = Array.from({ length: count }, () => ({
        weight: Number(row.weight) || 0,
        reps: Number(row.reps) || 10
      }));
    }
    row.sets = row.setPrescriptions.length;
    row.weight = Number(row.setPrescriptions[0]?.weight) || 0;
    row.reps = Number(row.setPrescriptions[0]?.reps) || 10;
    return row.setPrescriptions;
  }

  function setTab(tabId) {
    if (!isTabAllowedForRole(tabId)) tabId = defaultTabForRole();
    state.activeTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(button => {
      const selected = button.getAttribute('data-tab') === tabId;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-current', selected ? 'page' : 'false');
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === tabId);
    });
    if (tabId === 'tab-progress') drawWeightChart();
    if (tabId === 'tab-equivalents') renderEquivalentExerciseManager();
    if (tabId === 'tab-daily-report') renderDailyReportTab();
    if (tabId === 'tab-coach') renderCoach();
    if (tabId === 'tab-app-manager') renderAppManager();
  }

  function getDailyNutrition() {
    return todayMeals().reduce((totals, meal) => {
      ['calories', 'protein', 'carbs', 'fat', 'saturatedFats', 'transFats', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'calcium', 'iron', 'vitaminC', 'omega3', 'omega6'].forEach(key => {
        totals[key] += Number(meal[key]) || 0;
      });
      const unknown = Array.isArray(meal.unknownNutrients)
        ? meal.unknownNutrients
        : ['fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'].filter(key => typeof meal[key] !== 'number');
      unknown.forEach(key => totals.unknownNutrients.add(key));
      if (meal.addedSugarKnown) totals.addedSugarKnown = true;
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, saturatedFats: 0, transFats: 0, fiber: 0, sodium: 0, sugar: 0, addedSugar: 0, potassium: 0, calcium: 0, iron: 0, vitaminC: 0, omega3: 0, omega6: 0, addedSugarKnown: false, unknownNutrients: new Set() });
  }

  function findFoodCategoryName(category) {
    return FIT_DATA.foodCategories.find(item => item.id === category)?.name || category || 'מזון';
  }

  function addFoodToLog(food, grams, options = {}) {
    if (!food || !Number.isFinite(grams) || grams <= 0) {
      alert('לא ניתן להוסיף את המזון: בדקו את פרטי המנה.');
      return false;
    }
    const multiplier = food.nutritionBasis === 'serving' ? grams : grams / 100;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    const meal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      foodId: food.id,
      name: food.name,
      grams: food.nutritionBasis === 'serving' ? null : grams,
      amount: grams,
      unitName: food.nutritionBasis === 'serving' ? food.unitName || 'מנה' : 'גרם',
      nutritionBasis: food.nutritionBasis || '100g',
      icon: food.icon || '🍽️',
      source: food.source || options.source || 'FoodData Central reference data per 100 g.',
      addedSugarKnown: typeof food.addedSugar === 'number' && Number.isFinite(food.addedSugar),
      loggedAt: now.toISOString(),
      time: timeStr
    };
    meal.unknownNutrients = Array.isArray(food.unknownNutrients)
      ? [...food.unknownNutrients]
      : ['fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6']
        .filter(key => typeof food[key] !== 'number' || !Number.isFinite(food[key]));
    ['calories', 'protein', 'carbs', 'fat', 'saturatedFats', 'transFats', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'calcium', 'iron', 'vitaminC', 'omega3', 'omega6'].forEach(key => {
      meal[key] = typeof food[key] === 'number' && Number.isFinite(food[key]) ? food[key] * multiplier : 0;
    });
    state.nutritionLogs[state.currentDate] = [...todayMeals(), meal];
    if (!writeStorage(STORAGE_KEYS.nutrition, state.nutritionLogs)) return false;
    if (!options.skipCloudPersistence) persistPersonalFoodLog(meal);
    renderNutrition();
    renderDashboard();
    syncDailyReportDraft();
    return true;
  }

  function persistPersonalFoodLog(meal) {
    const fb = window.FitPulseFirebase;
    if (!fb?.addPersonalFoodLog || typeof fb.currentUid !== 'function' || !fb.currentUid()) return;
    const grams = Number(meal.grams || meal.amount);
    if (!Number.isFinite(grams) || grams <= 0) return;
    fb.addPersonalFoodLog({
      logDate: state.currentDate,
      foodId: meal.foodId || meal.barcode || null,
      name: meal.name,
      grams,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      saturatedFats: meal.saturatedFats || 0,
      transFats: meal.transFats || 0,
      sodium: meal.sodium || 0,
      potassium: meal.potassium || 0,
      calcium: meal.calcium || 0,
      iron: meal.iron || 0,
      vitaminC: meal.vitaminC || 0,
      omega3: meal.omega3 || 0,
      omega6: meal.omega6 || 0,
      source: String(meal.source || 'personal-diary').slice(0, 300)
    }).catch(err => console.warn('[FitPulse] foodLogs sync notice:', err.message));
  }

  function getAuthUserId() {
    return window.FitPulseFirebase?.currentUid?.() || state.currentUser?.uid || state.currentUser?.id || null;
  }

  function firestoreFoodToLocal(doc) {
    if (!doc) return null;
    const macros = doc.macrosPer100g || {};
    const calories = Number(doc.calories ?? macros.calories);
    const protein = Number(doc.protein ?? macros.protein);
    const carbs = Number(doc.carbs ?? macros.carbs);
    const fat = Number(doc.fat ?? macros.fats ?? macros.fat);
    if (!doc.name || !Number.isFinite(calories)) return null;
    return {
      id: doc.barcode || doc.id,
      barcode: doc.barcode || doc.id,
      name: doc.name,
      brand: doc.brand || '',
      category: doc.category || 'scanned',
      categoryName: doc.categoryName || (doc.brand ? `מאגר שיתופי · ${doc.brand}` : 'מאגר מזון שיתופי'),
      defaultGrams: Number(doc.defaultGrams) || 100,
      unitName: doc.servingSize || doc.unitName || '100g',
      calories,
      protein: Number.isFinite(protein) ? protein : 0,
      carbs: Number.isFinite(carbs) ? carbs : 0,
      fat: Number.isFinite(fat) ? fat : 0,
      saturatedFats: Number(macros.saturatedFats) || 0,
      transFats: Number(macros.transFats) || 0,
      sodium: Number(doc.micronutrients?.sodium) || 0,
      potassium: Number(doc.micronutrients?.potassium) || 0,
      calcium: Number(doc.micronutrients?.calcium) || 0,
      iron: Number(doc.micronutrients?.iron) || 0,
      vitaminC: Number(doc.micronutrients?.vitaminC) || 0,
      omega3: Number(doc.fattyAcids?.omega3) || 0,
      omega6: Number(doc.fattyAcids?.omega6) || 0,
      icon: '📦',
      source: doc.source === 'manual'
        ? 'Crowdsourced Food Database (manual)'
        : (doc.source === 'scraped' ? 'Crowdsourced Food Database (scraped)' : (doc.source || 'Cloud Firestore foods collection')),
      crowdsourced: Boolean(doc.macrosPer100g)
    };
  }

  function cacheLocalFood(food) {
    if (!food?.id) return;
    const cachedIndex = state.scannedFoods.findIndex(item => item.id === food.id || item.barcode === food.barcode);
    if (cachedIndex >= 0) state.scannedFoods[cachedIndex] = food;
    else state.scannedFoods.push(food);
    writeStorage(STORAGE_KEYS.scannedFoods, state.scannedFoods);
    const catalogIndex = FIT_DATA.foodsDatabase.findIndex(item => item.id === food.id);
    if (catalogIndex >= 0) FIT_DATA.foodsDatabase[catalogIndex] = food;
    else FIT_DATA.foodsDatabase.push(food);
  }

  function renderDashboard() {
    const totals = getDailyNutrition();
    const target = Number(state.profile.targetCalories) || 0;
    const remaining = Math.max(0, target - totals.calories);
    const progress = target ? Math.min(1, totals.calories / target) : 0;
    const calorieExcess = totals.calories - target;
    const ring = byId('ringCalories');
    if (ring) ring.style.strokeDashoffset = String(408.4 * (1 - progress));
    if (ring) ring.classList.toggle('over-target', target > 0 && calorieExcess > 150);
    if (byId('ringConsumedCals')) byId('ringConsumedCals').textContent = formatNumber(totals.calories);
    if (byId('ringRemainingCals')) byId('ringRemainingCals').textContent = formatNumber(remaining);
    if (byId('calorieTarget')) byId('calorieTarget').textContent = formatNumber(target);
    if (byId('calorieConsumed')) byId('calorieConsumed').textContent = formatNumber(totals.calories);
    const calorieNotice = byId('calorieBalanceNotice');
    if (calorieNotice) {
      const isEvening = new Date().getHours() >= 20;
      if (target > 0 && calorieExcess > 150) {
        calorieNotice.hidden = false;
        calorieNotice.className = 'calorie-balance-notice warning';
        calorieNotice.textContent = `הצריכה הקלורית גבוהה מהיעד ב־${formatNumber(calorieExcess)} קלוריות (יותר מ־150).`;
      } else if (target > 0 && isEvening && target - totals.calories >= 400) {
        calorieNotice.hidden = false;
        calorieNotice.className = 'calorie-balance-notice evening';
        calorieNotice.textContent = `לקראת סוף היום, הצריכה נמוכה מהיעד ב־${formatNumber(target - totals.calories)} קלוריות.`;
      } else {
        calorieNotice.hidden = true;
        calorieNotice.textContent = '';
        calorieNotice.className = 'calorie-balance-notice';
      }
    }
    const targetsForm = byId('dailyTargetsForm');
    if (targetsForm) {
      ['targetCalories', 'targetProtein', 'targetCarbs', 'targetFat'].forEach(key => {
        const input = targetsForm.elements.namedItem(key);
        if (input && document.activeElement !== input) input.value = String(Number(state.profile[key]) || 0);
      });
    }
    const macros = [
      ['protein', totals.protein, Number(state.profile.targetProtein) || 0],
      ['carbs', totals.carbs, Number(state.profile.targetCarbs) || 0],
      ['fat', totals.fat, Number(state.profile.targetFat) || 0]
    ];
    macros.forEach(([name, current, goal]) => {
      const currentNode = byId(`dash${name[0].toUpperCase()}${name.slice(1)}Current`);
      const goalNode = byId(`dash${name[0].toUpperCase()}${name.slice(1)}Target`);
      const progressNode = byId(`${name}Progress`);
      if (currentNode) currentNode.textContent = formatNumber(current);
      if (goalNode) goalNode.textContent = formatNumber(goal);
      if (progressNode) progressNode.style.width = `${goal ? Math.min(100, (current / goal) * 100) : 0}%`;
    });

    const now = new Date();
    const dateText = new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }).format(now);
    if (byId('dashboardGreeting')) byId('dashboardGreeting').textContent = `שלום, ${state.profile.name || 'מתאמן'}`;
    if (byId('dashboardDate')) byId('dashboardDate').textContent = 'זה הסיכום שלך להיום. התקדמות קטנה בכל יום מצטברת לתוצאות גדולות.';
    if (byId('todayDateChip')) byId('todayDateChip').textContent = dateText;

    const weeklyWorkoutCount = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - index);
      return state.workoutLogs[localDateKey(date)] || [];
    }).reduce((sum, entries) => sum + entries.length, 0);
    const weeklyProgress = Math.min(weeklyWorkoutCount / 5, 1);
    if (byId('weeklyWorkoutCount')) byId('weeklyWorkoutCount').textContent = `${Math.min(weeklyWorkoutCount, 5)}/5`;
    if (byId('weeklyWorkoutHeadline')) byId('weeklyWorkoutHeadline').textContent = `${weeklyWorkoutCount} מתוך 5 אימונים`;
    const workoutRing = document.querySelector('.workout-mini-ring');
    if (workoutRing) workoutRing.style.setProperty('--ring-progress', `${weeklyProgress * 360}deg`);
    const mealProgress = Math.min(todayMeals().length / 4, 1);
    if (byId('todayMealCount')) byId('todayMealCount').textContent = `${Math.min(todayMeals().length, 4)}/4`;
    if (byId('mealProgressHeadline')) byId('mealProgressHeadline').textContent = `${todayMeals().length} מתוך 4 ארוחות`;
    const mealRing = document.querySelector('.meals-mini-ring');
    if (mealRing) mealRing.style.setProperty('--ring-progress', `${mealProgress * 360}deg`);

    const waterTarget = Number(state.profile.targetWaterMl) || 2800;
    const waterAmount = Number(state.waterLogs[state.currentDate]) || 0;
    if (byId('waterProgressText')) byId('waterProgressText').textContent = `${formatNumber(waterAmount)} / ${formatNumber(waterTarget)}`;
    if (byId('waterProgressBar')) byId('waterProgressBar').style.width = `${waterTarget ? Math.min(100, (waterAmount / waterTarget) * 100) : 0}%`;
    const sleepGoal = Number(state.profile.targetSleepHours) || 8;
    const sleepHours = Number(state.sleepLogs[state.currentDate] ?? state.profile.sleepHours) || 0;
    if (byId('sleepHoursValue')) byId('sleepHoursValue').textContent = formatNumber(sleepHours);
    if (byId('sleepGoalText')) byId('sleepGoalText').textContent = `יעד ${formatNumber(sleepGoal)} שעות`;
    const sleepInput = byId('sleepHoursInput');
    if (sleepInput) sleepInput.value = String(sleepHours);

    const omegaDataMissing = [...todayMeals()].some(meal => {
      const unknown = Array.isArray(meal.unknownNutrients) ? meal.unknownNutrients : [];
      return unknown.includes('omega3') || unknown.includes('omega6');
    });
    const omegaRatio = todayMeals().length && !omegaDataMissing && totals.omega3
      ? totals.omega6 / totals.omega3
      : null;
    if (byId('omega3Val')) byId('omega3Val').textContent = `${formatNumber(totals.omega3)}g`;
    if (byId('omega6Val')) byId('omega6Val').textContent = `${formatNumber(totals.omega6)}g`;
    if (byId('calculatedOmegaRatio')) {
      byId('calculatedOmegaRatio').textContent = omegaRatio === null
        ? '—'
        : `1 : ${formatNumber(omegaRatio)}`;
    }
    const badge = byId('omegaRatioBadge');
    if (badge) {
      badge.classList.remove('good', 'warning');
      badge.textContent = omegaRatio === null
        ? !todayMeals().length ? 'הוסיפו מזון לחישוב' : omegaDataMissing ? 'חסרים נתוני אומגה' : 'לא נרשמה אומגה 3'
        : omegaRatio >= 1 && omegaRatio <= 4
          ? `בטווח 1:1–4:1 · אומדן`
          : `מחוץ לטווח 1:1–4:1 · אומדן`;
      if (omegaRatio !== null) badge.classList.add(omegaRatio >= 1 && omegaRatio <= 4 ? 'good' : 'warning');
    }
    if (byId('omegaAdviceNote')) {
      byId('omegaAdviceNote').textContent = omegaRatio === null
        ? omegaDataMissing
          ? 'היחס אינו מחושב כי לא נרשמו נתוני חומצות שומן מלאים. היחס אינו ערך ייחוס רפואי או מדד להתאוששות.'
          : todayMeals().length
            ? 'ביומן לא נרשמה אומגה 3 בכמות מדידה, ולכן אי אפשר לחשב יחס. היחס אינו מדד רפואי או מדד להתאוששות.'
            : 'הוסיפו מזון ליומן כדי לחשב אומדן יחסי של חומצות השומן. היחס אינו ערך ייחוס רפואי או מדד להתאוששות.'
        : omegaRatio >= 1 && omegaRatio <= 4
          ? 'יחס אומדן אומגה 6:אומגה 3 בטווח המוצג (1:1 עד 4:1). זהו סיכום המזון המדווח, לא יעד רפואי.'
          : 'יחס אומדן אומגה 6:אומגה 3 מחוץ לטווח 1:1 עד 4:1. בדקו את נתוני המזון; היחס אינו יעד רפואי.';
    }
    const microMetrics = [
      ['sodium', totals.sodium, 2300],
      ['sugar', totals.addedSugarKnown ? totals.addedSugar : 0, 50],
      ['potassium', totals.potassium, 4700],
      ['fiber', totals.fiber, 28]
    ];
    microMetrics.forEach(([name, value, goal]) => {
      const valueNode = byId(`${name}Value`);
      const progressNode = byId(`${name}Progress`);
      if (valueNode) valueNode.textContent = formatNumber(value);
      if (progressNode) progressNode.style.width = `${goal ? Math.min(100, value / goal * 100) : 0}%`;
    });
    if (byId('sugarReferenceLabel')) {
      byId('sugarReferenceLabel').textContent = totals.addedSugarKnown
        ? 'יעד ייחוס לסוכר מוסף: 50 גרם'
        : 'נתוני סוכר מוסף אינם זמינים עדיין';
    }
    if (byId('nutritionInsight')) {
      let insight;
      if (totals.sodium > 2300) {
        insight = `הנתרן שנרשם היום (${formatNumber(totals.sodium)} מ״ג) עבר את ערך הייחוס היומי של 2,300 מ״ג.`;
      } else if (totals.addedSugarKnown && totals.addedSugar > 50) {
        insight = `הסוכר המוסף שנרשם (${formatNumber(totals.addedSugar)} גרם) עבר את ערך הייחוס של 50 גרם.`;
      } else if (totals.unknownNutrients.has('sodium')) {
        insight = 'חלק מהמאכלים ביומן אינם כוללים נתוני נתרן מלאים, ולכן לא ניתן לאמת את סך הנתרן מול ערך הייחוס.';
      } else if (totals.unknownNutrients.has('addedSugar') && totals.sugar > 50) {
        insight = 'הסוכר הכולל שנרשם גבוה מ־50 גרם; מוצר אחד או יותר לא מציג סוכר מוסף, ולכן אי אפשר לקבוע אם עבר את ערך הייחוס.';
      } else if (totals.omegaDataMeals && omegaRatio !== null && omegaRatio <= 4) {
        insight = 'דגים שמנים ואגוזים הם מקורות תזונתיים לאומגה 3. היחס שנרשם הוא אומדן בלבד, ואינו יעד רפואי או מדד להתאוששות.';
      } else if (omegaRatio !== null && totals.omega3 > 0 && omegaRatio > 4) {
        insight = 'ביומן נרשמה פחות אומגה 3 יחסית לאומגה 6. דגים שמנים ואגוזים הם מקורות תזונתיים לאומגה 3; היחס אינו יעד רפואי.';
      } else if (totals.sugar > 50 && !totals.addedSugarKnown && !totals.unknownNutrients.has('addedSugar')) {
        insight = 'הסוכר הכולל שנרשם עבר 50 גרם; הנתון כולל סוכרים טבעיים ואינו מאפשר לקבוע כמה מהם סוכר מוסף.';
      } else if (totals.unknownNutrients.has('omega3') || totals.unknownNutrients.has('omega6')) {
        insight = 'נתוני חומצות השומן חסרים בחלק מהמוצרים, ולכן יחס אומגה 3:6 אינו מחושב עד שיהיו נתונים מלאים.';
      } else if (totals.unknownNutrients.size) {
        insight = 'חלק מהנתונים התזונתיים חסרים במוצר שנסרק; היומן מציג רק את הערכים שדווחו ולא מניח שמידע חסר הוא אפס.';
      } else {
        insight = totals.omegaDataMeals
          ? 'נתוני המיקרו מתעדכנים עם רישום המזון. נתרן מעל 2,300 מ״ג וסוכר מוסף מעל 50 גרם יסומנו ביומן.'
          : 'הוסיפו מזון ליומן כדי לעקוב אחר מיקרו־נוטריאנטים ולקבל תובנות יומיות.';
      }
      byId('nutritionInsight').textContent = insight;
    }

    const summary = byId('todaySummary');
    if (summary) summary.textContent = `${formatNumber(target ? (totals.calories / target) * 100 : 0)}% מיעד הקלוריות · ${todayWorkouts().length} אימונים היום`;
    renderTraineeTasks();
  }

  let traineeTaskRenderVersion = 0;
  let traineeTasksCache = null;
  let traineeTasksLoadedAt = 0;
  let traineeTasksCacheUid = null;

  async function renderTraineeTasks(forceRefresh = false) {
    const container = byId('traineePendingTasks');
    const uid = window.FitPulseFirebase?.currentUid?.();
    if (!container || !window.FitPulseFirebase?.isConfigured || !uid) {
      if (container) container.textContent = 'התחברו לחשבון כדי לראות משימות מהמאמן.';
      return;
    }
    const renderVersion = ++traineeTaskRenderVersion;
    if (!forceRefresh && traineeTasksCacheUid === uid && traineeTasksCache && Date.now() - traineeTasksLoadedAt < 10000) {
      renderTraineeTaskItems(container, traineeTasksCache);
      return;
    }
    container.textContent = 'טוען משימות…';
    try {
      const tasks = await window.FitPulseFirebase.getMyPendingTasks();
      if (renderVersion !== traineeTaskRenderVersion) return;
      traineeTasksCache = tasks;
      traineeTasksLoadedAt = Date.now();
      traineeTasksCacheUid = uid;
      renderTraineeTaskItems(container, tasks);
    } catch (error) {
      if (renderVersion !== traineeTaskRenderVersion) return;
      console.error('Could not load trainee tasks.', error);
      container.textContent = 'לא ניתן לטעון את המשימות כרגע. בדקו את החיבור ונסו לרענן.';
    }
  }

  function renderTraineeTaskItems(container, tasks) {
    container.replaceChildren();
    if (!tasks.length) {
      container.textContent = 'אין משימות ממתינות.';
      return;
    }
    tasks.forEach(task => {
      const row = createElement('div', 'coach-pending-item');
      row.append(createElement('strong', '', task.title));
      row.append(createElement('span', '', task.type === 'weight_check'
        ? 'השלימו שקילה בטופס מעקב המשקל כדי לסיים משימה זו.'
        : 'המשימה ממתינה להשלמה.'));
      if (task.type !== 'weight_check') {
        const button = createElement('button', 'btn-action-secondary', 'סימון כהושלם');
        button.type = 'button';
        button.addEventListener('click', async () => {
          button.disabled = true;
          try {
            await window.FitPulseFirebase.completeNonWeightTask(task.id);
            await renderTraineeTasks(true);
          } catch (error) {
            console.error('Could not complete trainee task.', error);
            button.disabled = false;
            row.append(createElement('span', 'coach-link-status', error.message || 'השלמת המשימה נכשלה.'));
          }
        });
        row.append(button);
      }
      container.append(row);
    });
  }

  function getExercise(exerciseId) {
    return FIT_DATA.exercises.find(exercise => exercise.id === exerciseId);
  }

  function getExerciseSubgroup(exercise) {
    return getExerciseActivations(exercise)[0]?.label || muscleLabel(exercise?.muscle);
  }

  function getRoutineCandidateExerciseIds(entry) {
    const preferredExerciseId = entry.preferredExerciseId || entry.exerciseId;
    const preferred = getExercise(preferredExerciseId);
    const group = state.equivalentExerciseGroups.find(item =>
      item.preferredExerciseId === preferredExerciseId &&
      item.muscleGroup === (entry.muscleGroup || preferred?.muscle) &&
      item.subgroup === (entry.subgroup || (preferred ? getExerciseSubgroup(preferred) : '')));
    return [...new Set([preferredExerciseId, ...(group?.equivalentExerciseIds || [])])];
  }

  function muscleLabel(muscleId) {
    return FIT_DATA.muscleGroups.find(group => group.id === muscleId)?.name || muscleId || 'Other';
  }

  function getExerciseActivations(exercise) {
    return (exercise.activationRanks || [{ muscle: exercise.muscle, rank: 5, order: 1 }])
      .map(({ muscle, label, rank, order }) => ({ muscle, label: label || muscleLabel(muscle), rank, order }));
  }

  function renderMuscleActivation(exercise) {
    const activations = getExerciseActivations(exercise);
    const list = createElement('div', 'muscle-activation-list');
    list.append(createElement('span', 'muscle-activation-caption', 'שרירים פעילים · דירוג יחסי משוער'));
    activations.forEach(activation => {
      const item = createElement('span', `muscle-activation-chip activation-rank-${activation.rank}`);
      item.append(
        createElement('strong', '', `#${activation.order}`),
        createElement('span', '', activation.label),
        createElement('small', '', activation.rank === 5 ? 'גבוהה' : activation.rank === 4 ? 'בינונית-גבוהה' : activation.rank === 3 ? 'בינונית' : 'תומכת')
      );
      item.title = `דירוג הפעלה יחסי משוער: ${activation.label} — ${activation.rank}/5. אינו מדידה פיזיולוגית.`;
      list.append(item);
    });
    list.append(createElement('small', 'activation-disclaimer', 'הדירוג הוא אומדן כללי לפי תבנית התנועה, לא מדידה או הנחיה רפואית.'));
    return list;
  }

  function renderWorkoutCard(plan) {
    const card = createElement('article', 'workout-plan-card');
    const badgeRow = createElement('div', 'plan-badge-row');
    if (plan.badge) {
      badgeRow.append(createElement('span', 'plan-badge', plan.badge));
    }
    badgeRow.append(createElement('span', 'plan-duration', `${plan.durationMinutes || 0} דק׳`));
    card.append(badgeRow, createElement('h3', 'plan-title', WORKOUT_CARD_LABELS[plan.id] || plan.hebrewName || plan.name));
    if (plan.subtitle) card.append(createElement('p', 'plan-sub', plan.subtitle));

    const details = createElement('p', 'plan-meta', `${plan.level || 'כל הרמות'} · ${plan.exercises.length} תרגילים`);
    card.append(details);
    if (plan.exercises[0]) {
      const previewExercise = getExercise(plan.exercises[0].exerciseId);
      if (previewExercise) {
        const preview = createElement('div', 'plan-exercise-preview');
        const textSpan = createElement('strong', 'exercise-name-en', previewExercise.name);
        textSpan.dir = 'ltr';
        const pill = createElement('span', 'exercise-badge-pill', previewExercise.equipment || muscleLabel(previewExercise.muscle));
        preview.append(textSpan, pill);
        card.append(preview);
      }
    }
    const actions = createElement('div', 'plan-actions');
    const startButton = createElement('button', 'btn-action-primary', 'להתחל');
    startButton.type = 'button';
    startButton.addEventListener('click', () => startWorkout(plan));
    actions.append(startButton);

    const moreOptions = document.createElement('details');
    moreOptions.className = 'plan-more-options';
    const moreSummary = createElement('summary', 'plan-more-summary', 'עוד פעולות');
    const moreMenu = createElement('div', 'plan-more-menu');
    const crunchStartButton = createElement('button', 'btn-action-secondary crunch-start-btn', 'להתחל קצר בזמן');
    crunchStartButton.type = 'button';
    crunchStartButton.addEventListener('click', () => {
      startWorkout(plan);
      if (state.activeSession && !state.isTimeCrunchActive) toggleTimeCrunchMode();
    });
    const shareButton = createElement('button', 'btn-action-secondary share-btn', 'שתף ↗');
    shareButton.type = 'button';
    shareButton.setAttribute('aria-label', `שתף את ${plan.name}`);
    shareButton.addEventListener('click', () => shareWorkoutPlan(plan));
    const editButton = createElement('button', 'btn-action-secondary edit-plan-btn', 'עריכת תרגילים וסטים');
    editButton.type = 'button';
    editButton.addEventListener('click', () => createWorkoutModal(plan));
    const duplicateButton = createElement('button', 'btn-action-secondary duplicate-plan-btn', 'שכפול כתבנית חדשה');
    duplicateButton.type = 'button';
    duplicateButton.addEventListener('click', () => createWorkoutModal({
      ...plan,
      isDuplicate: true,
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: `${plan.name} (עותק)`,
      sourceRoutineId: undefined,
      audienceTraineeId: undefined,
      exercises: plan.exercises.map(entry => ({ ...entry }))
    }));
    moreMenu.append(editButton, duplicateButton, crunchStartButton, shareButton);
    moreOptions.append(moreSummary, moreMenu);
    actions.append(moreOptions);
    card.append(actions);
    return card;
  }

  function createExerciseAnimation() {
    return document.createDocumentFragment();
  }

  function renderWorkoutsTab() {
    const columnsContainer = byId('workoutCategoriesColumns');
    const weeklyGrid = byId('weeklySplitsGrid');
    const sessionGrid = byId('individualSessionsGrid');
    const recentGrid = byId('recentWorkoutGrid');
    const recentSection = byId('recentWorkoutsSection');

    if (columnsContainer) columnsContainer.replaceChildren();
    if (weeklyGrid) weeklyGrid.replaceChildren();
    if (sessionGrid) sessionGrid.replaceChildren();

    const search = byId('workoutTemplateSearch');
    if (search && search.value !== state.workoutQuery) search.value = state.workoutQuery;

    // Render Workout Category Tabs (Push, Pull, Legs, Upper, Lower, Full Body, Specialized)
    const categoryTabsContainer = byId('workoutCategoryTabs');
    if (categoryTabsContainer && (!categoryTabsContainer.childElementCount || categoryTabsContainer.dataset.rendered !== 'true')) {
      categoryTabsContainer.replaceChildren();
      const categories = FIT_DATA.workoutCategories || [
        { id: 'all', name: 'כל האימונים', icon: '' },
        { id: 'push', name: 'אימוני דחיפה (Push)', icon: '' },
        { id: 'pull', name: 'אימוני משיכה (Pull)', icon: '' },
        { id: 'legs', name: 'אימוני רגליים (Legs)', icon: '' },
        { id: 'upper', name: 'פלג גוף עליון (Upper)', icon: '' },
        { id: 'lower', name: 'פלג גוף תחתון (Lower)', icon: '' },
        { id: 'full_body', name: 'גוף מלא (Full Body)', icon: '' },
        { id: 'specialized', name: 'שילובים ממוקדים (Splits)', icon: '' }
      ];
      categories.forEach(cat => {
        const chip = createElement('button', `workout-category-chip${state.workoutCategory === cat.id ? ' active' : ''}`);
        chip.type = 'button';
        chip.dataset.categoryId = cat.id;
        if (cat.icon) {
          chip.append(createElement('span', 'chip-icon', cat.icon));
        }
        chip.append(createElement('span', 'chip-name', cat.name));
        chip.setAttribute('aria-pressed', String(state.workoutCategory === cat.id));
        chip.addEventListener('click', () => {
          state.workoutCategory = cat.id;
          renderWorkoutsTab();
        });
        categoryTabsContainer.append(chip);
      });
      categoryTabsContainer.dataset.rendered = 'true';
    }
    categoryTabsContainer?.querySelectorAll('[data-category-id]').forEach(chip => {
      const active = chip.dataset.categoryId === state.workoutCategory;
      chip.classList.toggle('active', active);
      chip.setAttribute('aria-pressed', String(active));
    });

    // Render Muscle Filters
    const filterContainer = byId('workoutTemplateFilters');
    if (filterContainer && !filterContainer.childElementCount) {
      WORKOUT_FILTERS.forEach(([id, label]) => {
        const button = createElement('button', 'category-chip', label);
        button.type = 'button';
        button.dataset.muscle = id;
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => {
          state.workoutFilter = id;
          renderWorkoutsTab();
        });
        filterContainer.append(button);
      });
    }
    filterContainer?.querySelectorAll('[data-muscle]').forEach(button => {
      const active = button.dataset.muscle === state.workoutFilter;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    const demoTraineeId = state.profile.demoTraineeId || FIT_DATA.coachTrainees[0]?.id;
    const plans = FIT_DATA.presetWorkouts.filter(plan =>
      !plan.audienceTraineeId || isTrainerRole() || plan.audienceTraineeId === demoTraineeId
    );
    const assignments = readStorage('fitpulse_demo_assignments', {});
    const assignedPlans = Array.isArray(assignments?.[demoTraineeId])
      ? assignments[demoTraineeId].filter(validateRoutine)
      : [];
    assignedPlans.forEach(plan => {
      if (!plans.some(existing => existing.id === plan.id || existing.sourceRoutineId === plan.id)) {
        plans.push({ ...plan, id: `assigned-${plan.id}`, sourceRoutineId: plan.id, audienceTraineeId: demoTraineeId });
      }
    });
    plans.sort((left, right) => {
      const leftIndex = WORKOUT_CARD_ORDER.indexOf(left.id);
      const rightIndex = WORKOUT_CARD_ORDER.indexOf(right.id);
      if (leftIndex < 0 && rightIndex < 0) return 0;
      if (leftIndex < 0) return 1;
      if (rightIndex < 0) return -1;
      return leftIndex - rightIndex;
    });

    // Recent workouts
    if (recentGrid && recentSection) {
      recentGrid.replaceChildren();
      const latestWorkouts = Object.values(state.workoutLogs || {})
        .flatMap(workouts => Array.isArray(workouts) ? workouts : [])
        .sort((left, right) => String(right.completedAt || '').localeCompare(String(left.completedAt || '')));
      const recentPlans = [];
      const seenPlanIds = new Set();
      latestWorkouts.forEach(workout => {
        const plan = plans.find(item => item.id === workout.routineId) ||
          plans.find(item => item.name === workout.name);
        if (plan && !seenPlanIds.has(plan.id)) {
          seenPlanIds.add(plan.id);
          recentPlans.push({ plan, workout });
        }
      });
      recentPlans.slice(0, 3).forEach(({ plan, workout }) => {
        const card = createElement('article', 'recent-workout-card');
        const date = workout.completedAt ? new Date(workout.completedAt) : null;
        card.append(
          createElement('strong', '', WORKOUT_CARD_LABELS[plan.id] || plan.hebrewName || plan.name),
          createElement('span', '', date && !Number.isNaN(date.getTime())
            ? `אימון אחרון · ${date.toLocaleDateString()}`
            : 'אימון שבוצע לאחרונה')
        );
        const start = createElement('button', 'btn-action-secondary', 'להתחיל שוב');
        start.type = 'button';
        start.addEventListener('click', () => startWorkout(plan));
        card.append(start);
        recentGrid.append(card);
      });
      recentSection.hidden = !recentPlans.length || Boolean(state.workoutQuery.trim()) || state.workoutFilter !== 'all' || state.workoutCategory !== 'all';
    }

    // Filter plans by Search, Muscle filter, and Category filter
    const query = state.workoutQuery.trim().toLocaleLowerCase();
    const filteredPlans = plans.filter(plan => {
      const matchingExercises = plan.exercises.map(entry => getExercise(entry.exerciseId)).filter(Boolean);
      const muscleMatches = state.workoutFilter === 'all' || matchingExercises.some(exercise =>
        (plan.exercises.find(entry => entry.exerciseId === exercise.id)?.muscleGroup || exercise.muscle) === state.workoutFilter ||
        exercise.muscle === state.workoutFilter);

      const categoryMatches = state.workoutCategory === 'all' ||
        plan.category === state.workoutCategory ||
        (state.workoutCategory === 'specialized' && !['push', 'pull', 'legs', 'upper', 'lower', 'full_body'].includes(plan.category));

      const searchableText = [
        WORKOUT_CARD_LABELS[plan.id] || plan.name, plan.hebrewName || '', plan.name, plan.subtitle || '',
        ...matchingExercises.flatMap(exercise => [exercise.name, exercise.category, exercise.muscle])
      ].join(' ').toLocaleLowerCase();

      return muscleMatches && categoryMatches && (!query || searchableText.includes(query));
    });

    // Render into dedicated columns / categories in columnsContainer
    const categoriesToRender = (FIT_DATA.workoutCategories || []).filter(cat => cat.id !== 'all');
    let totalRendered = 0;

    categoriesToRender.forEach(cat => {
      if (state.workoutCategory !== 'all' && state.workoutCategory !== cat.id) return;
      const plansInCat = filteredPlans.filter(plan => {
        if (cat.id === 'specialized') {
          return plan.category === 'specialized' || (!['push', 'pull', 'legs', 'upper', 'lower', 'full_body'].includes(plan.category) && !plan.id.startsWith('custom-'));
        }
        return plan.category === cat.id;
      });

      if (!plansInCat.length && (state.workoutCategory === 'all' || query)) return;

      const column = createElement('section', 'workout-category-column');
      column.dataset.category = cat.id;

      const header = createElement('div', 'workout-category-header');
      const titleGroup = createElement('div', 'workout-category-title-group');
      if (cat.icon) {
        titleGroup.append(createElement('span', 'workout-category-icon', cat.icon));
      }
      const textGroup = createElement('div', '', '');
      textGroup.append(
        createElement('h3', 'workout-category-title', cat.name),
        createElement('p', 'workout-category-desc', cat.desc || '')
      );
      titleGroup.append(textGroup);

      const badge = createElement('span', 'workout-category-count-badge', `${plansInCat.length} אימונים`);
      header.append(titleGroup, badge);
      column.append(header);

      const grid = createElement('div', 'preset-workouts-grid');
      plansInCat.forEach(plan => {
        grid.append(renderWorkoutCard(plan));
        totalRendered++;
      });
      column.append(grid);
      columnsContainer?.append(column);
    });

    // Custom routines section if any
    const customPlans = filteredPlans.filter(plan => plan.id.startsWith('custom-'));
    if (customPlans.length && (state.workoutCategory === 'all' || state.workoutCategory === 'specialized')) {
      const customCol = createElement('section', 'workout-category-column custom-workouts-column');
      const header = createElement('div', 'workout-category-header');
      const titleGroup = createElement('div', 'workout-category-title-group');
      const textGroup = createElement('div', '', '');
      textGroup.append(
        createElement('h3', 'workout-category-title', 'אימונים מותאמים אישית (Custom)'),
        createElement('p', 'workout-category-desc', 'שגרות שנבנו או יובאו על ידך')
      );
      titleGroup.append(textGroup);
      header.append(titleGroup, createElement('span', 'workout-category-count-badge', `${customPlans.length} אימונים`));
      customCol.append(header);
      const grid = createElement('div', 'preset-workouts-grid');
      customPlans.forEach(plan => {
        grid.append(renderWorkoutCard(plan));
        totalRendered++;
      });
      customCol.append(grid);
      columnsContainer?.append(customCol);
    }

    // Populate legacy grids if present
    filteredPlans.forEach(plan => {
      const grid = plan.section === 'weekly_split' ? weeklyGrid : sessionGrid;
      grid?.append(renderWorkoutCard(plan));
    });

    const status = byId('workoutTemplateStatus');
    if (status) {
      status.textContent = totalRendered
        ? `${totalRendered} תוכניות אימון מחולקות לעמודות ייעודיות ונפרדות · Push, Pull, Legs וכל סוגי האימון בנפרד`
        : 'לא נמצאו תוכניות מתאימות. נסו לשנות את החיפוש, קבוצת השרירים או עמודת האימון.';
    }

    renderWeeklyMuscleVolume();
  }

  function renderWeeklyMuscleVolume() {
    const grid = byId('weeklyMuscleVolumeGrid');
    if (!grid) return;
    grid.replaceChildren();
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - 6);
    const totals = new Map(FIT_DATA.muscleGroups
      .filter(group => group.id !== 'all')
      .map(group => [group.id, 0]));
    Object.entries(state.workoutLogs || {}).forEach(([date, workouts]) => {
      if (date < localDateKey(since) || !Array.isArray(workouts)) return;
      workouts.forEach(workout => {
        (workout.setLogs || []).filter(set => set.completed).forEach(set => {
          const exercise = getExercise(set.exerciseId);
          const primaryMuscle = set.muscleGroup || exercise?.muscle;
          if (totals.has(primaryMuscle)) totals.set(primaryMuscle, totals.get(primaryMuscle) + 1);
        });
      });
    });
    totals.forEach((sets, muscle) => {
      const card = createElement('article', 'weekly-muscle-volume-card');
      card.append(createElement('span', '', muscleLabel(muscle)), createElement('strong', '', String(sets)),
        createElement('small', '', 'סטים'));
      grid.append(card);
    });
  }

  function renderNutrition() {
    const container = byId('mealsContainer');
    if (!container) return;
    container.replaceChildren();
    const searchInput = byId('foodSearchInput');
    if (searchInput && searchInput.value !== state.foodQuery) searchInput.value = state.foodQuery;
    const filterContainer = byId('foodCategoryFilters');
    if (filterContainer) {
      filterContainer.replaceChildren();
      FIT_DATA.foodCategories.forEach(category => {
        const button = createElement('button', `category-chip${state.foodCategory === category.id ? ' active' : ''}`, category.name);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(state.foodCategory === category.id));
        button.addEventListener('click', () => {
          state.foodCategory = category.id;
          searchRemoteFoods(state.foodQuery);
        });
        filterContainer.append(button);
      });
    }
    const query = state.foodQuery.trim().toLocaleLowerCase();
    const foodCatalog = [...FIT_DATA.foodsDatabase, ...state.remoteFoods]
      .filter((food, index, foods) => foods.findIndex(item => item.id === food.id) === index);
    const filteredFoods = foodCatalog.filter(food => {
      const categoryMatches = state.foodCategory === 'all' || food.category === state.foodCategory;
      const searchable = [food.name, food.categoryName, findFoodCategoryName(food.category), ...(food.tags || [])]
        .join(' ').toLocaleLowerCase();
      return categoryMatches && (!query || searchable.includes(query));
    });
    const searchStatus = byId('foodSearchStatus');
    if (searchStatus) searchStatus.textContent = state.remoteFoodStatus || `${filteredFoods.length} מאכלים תואמים · ערכים ל־100 גרם; חיפוש רשת משתמש בנתוני Open Food Facts שעשויים להיות קהילתיים`;

    const form = createElement('form', 'nutrition-form');
    form.id = 'nutritionForm';
    const foodLabel = createElement('label', '', 'בחירת מזון');
    const foodSelect = document.createElement('select');
    foodSelect.name = 'foodId';
    foodSelect.required = true;
    filteredFoods.forEach(food => {
      const option = document.createElement('option');
      option.value = food.id;
      option.textContent = `${food.icon || '🍽️'} ${food.name}`;
      foodSelect.append(option);
    });
    if (!filteredFoods.length) {
      const option = document.createElement('option');
      option.textContent = 'לא נמצאו מאכלים מתאימים';
      option.disabled = true;
      foodSelect.append(option);
    }
    foodLabel.append(foodSelect);

    const gramsLabel = createElement('label', '', filteredFoods[0]?.nutritionBasis === 'serving' ? 'כמות (מנות)' : 'כמות (גרם)');
    const gramsInput = document.createElement('input');
    gramsInput.name = 'grams';
    gramsInput.type = 'number';
    gramsInput.min = '1';
    gramsInput.step = '1';
    gramsInput.value = String(filteredFoods[0]?.defaultGrams || 100);
    gramsInput.required = true;
    gramsLabel.append(gramsInput);
    foodSelect.addEventListener('change', () => {
      const selectedFood = filteredFoods.find(item => item.id === foodSelect.value);
      if (!selectedFood) return;
      gramsInput.value = String(selectedFood.defaultGrams || (selectedFood.nutritionBasis === 'serving' ? 1 : 100));
      if (gramsLabel.firstChild) {
        gramsLabel.firstChild.textContent = selectedFood.nutritionBasis === 'serving' ? 'כמות (מנות)' : 'כמות (גרם)';
      }
    });

    const submit = createElement('button', 'btn-action-primary', 'הוספת מזון ליומן +');
    submit.type = 'submit';
    form.append(foodLabel, gramsLabel, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const food = filteredFoods.find(item => item.id === foodSelect.value);
      const grams = Number(gramsInput.value);
      addFoodToLog(food, grams);
    });
    container.append(form);

    const totals = getDailyNutrition();
    const summary = createElement('div', 'nutrition-summary');
    const omegaComplete = ![...todayMeals()].some(meal => meal.unknownNutrients?.includes('omega3') || meal.unknownNutrients?.includes('omega6'));
    const omegaRatioText = omegaComplete && totals.omega3 > 0
      ? `1:${formatNumber(totals.omega6 / totals.omega3)}`
      : omegaComplete && todayMeals().length ? 'אין אומגה 3 מדווחת' : 'נתונים חסרים';
    summary.textContent = `היום: ${formatNumber(totals.calories)} קל׳ · חלבון ${formatNumber(totals.protein)} ג׳ · פחמימות ${formatNumber(totals.carbs)} ג׳ · שומן ${formatNumber(totals.fat)} ג׳ · סוכר כולל ${formatNumber(totals.sugar)} ג׳ · סיבים ${formatNumber(totals.fiber)} ג׳ · נתרן ${formatNumber(totals.sodium)} מ״ג · אשלגן ${formatNumber(totals.potassium)} מ״ג · אומגה 3:6 ${omegaRatioText}`;
    container.append(summary);

    const resultGrid = createElement('div', 'food-search-results');
    if (!filteredFoods.length) {
      resultGrid.append(createElement('p', 'empty-state', 'לא נמצאו מאכלים. נסו מונח אחר או סרקו ברקוד.'));
    }
    filteredFoods.forEach(food => {
      const card = createElement('article', 'food-result-card');
      const title = createElement('div', 'food-result-title');
      title.append(createElement('span', 'food-result-icon', food.icon || '🍽️'));
      const details = createElement('div');
      details.append(createElement('strong', '', food.name), createElement('span', 'food-result-category',
        `${food.categoryName || findFoodCategoryName(food.category)} · ${food.nutritionBasis === 'serving' ? 'למנה' : 'ל־100 גרם'}`));
      title.append(details);
      const nutrients = createElement('p', 'food-result-nutrients',
        `${formatNumber(food.calories)} קל׳ · חלבון ${nutrientValueText(food, 'protein', ' ג׳')} · פחמימות ${nutrientValueText(food, 'carbs', ' ג׳')} · שומן ${nutrientValueText(food, 'fat', ' ג׳')}`);
      const source = createElement('p', 'food-result-source', food.source || 'ערך ייחוס תזונתי ל־100 גרם');
      const actions = createElement('div', 'food-result-actions');
      const portion = createElement('span', 'food-portion', food.nutritionBasis === 'serving'
        ? `מנה: ${food.defaultGrams || 1} ${food.unitName || 'מנות'}`
        : `מנה: ${food.defaultGrams || 100} גרם`);
      const addButton = createElement('button', 'btn-action-secondary', '＋ הוספת מנה');
      addButton.type = 'button';
      addButton.addEventListener('click', () => addFoodToLog(food,
        Number(food.defaultGrams) || (food.nutritionBasis === 'serving' ? 1 : 100)));
      actions.append(portion, addButton);
      card.append(title, nutrients, source, actions);
      resultGrid.append(card);
    });
    container.append(resultGrid);

    const list = createElement('div', 'meal-list');
    if (!todayMeals().length) {
      list.append(createElement('p', 'empty-state', 'עדיין לא נרשמו ארוחות היום. הוסיפו מזון כדי להתחיל לעקוב.'));
    }
    todayMeals().forEach(meal => {
      const item = createElement('article', 'meal-item');
      const title = createElement('div', 'meal-item-title');
      if (meal.time || meal.loggedAt) {
        const timeStr = meal.time || new Date(meal.loggedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
        const timeBadge = createElement('span', 'timeline-time-badge', timeStr);
        timeBadge.style.marginInlineEnd = '8px';
        title.append(timeBadge);
      }
      title.append(createElement('span', 'meal-icon', meal.icon || '🍽️'));
      const name = createElement('div');
      name.append(createElement('strong', '', meal.name), createElement('span', 'meal-portion',
        `${formatNumber(meal.amount ?? meal.grams)} ${meal.unitName || 'גרם'} · ${formatNumber(meal.calories)} קל׳`));
      title.append(name);
      const macros = createElement('span', 'meal-macros',
        `חלבון ${nutrientValueText(meal, 'protein', ' ג׳')} · סיבים ${nutrientValueText(meal, 'fiber', ' ג׳')} · נתרן ${nutrientValueText(meal, 'sodium', ' מ״ג')}`);
      const source = createElement('span', 'meal-source', meal.source || 'ערכי ייחוס למזון');
      source.title = source.textContent;
      const remove = createElement('button', 'icon-button', 'הסרה');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        state.nutritionLogs[state.currentDate] = todayMeals().filter(entry => entry.id !== meal.id);
        if (writeStorage(STORAGE_KEYS.nutrition, state.nutritionLogs)) {
          renderNutrition();
          renderDashboard();
        }
      });
      item.append(title, macros, source, remove);
      list.append(item);
    });
    container.append(list);
  }

  let nutritionSpeechRecognition = null;
  let isListeningNutrition = false;

  function parseVoiceMealText(text) {
    if (!text || typeof text !== 'string') return { foodName: '', grams: null };
    const cleaned = text.trim();

    let grams = null;
    let foodName = cleaned;

    const gramsRegex1 = /(\d+(?:\.\d+)?)\s*(?:גרם|גר['״]|ג['״]|grams?|g\b)/i;
    const gramsRegex2 = /\s+(\d+(?:\.\d+)?)$/;
    const gramsRegex3 = /^(\d+(?:\.\d+)?)\s+/;

    let match = cleaned.match(gramsRegex1);
    if (match) {
      grams = parseFloat(match[1]);
      foodName = cleaned.replace(match[0], ' ').trim();
    } else {
      match = cleaned.match(gramsRegex2);
      if (match) {
        grams = parseFloat(match[1]);
        foodName = cleaned.replace(match[0], ' ').trim();
      } else {
        match = cleaned.match(gramsRegex3);
        if (match && parseFloat(match[1]) > 5) {
          grams = parseFloat(match[1]);
          foodName = cleaned.replace(match[0], ' ').trim();
        }
      }
    }

    foodName = foodName
      .replace(/^(אכלתי|תוסיף|הוסף|תרשום|רשום|דיאטה|ארוחה)\s+/i, '')
      .replace(/\s+במשקל\s*$/i, '')
      .replace(/[.,!?]/g, '')
      .trim();

    return { foodName: foodName || cleaned, grams };
  }

  function startVoiceNutritionRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const voiceBtn = byId('voiceNutritionBtn');
    const statusBanner = byId('voiceNutritionStatus');
    const statusText = byId('voiceNutritionStatusText');

    if (!SpeechRecognition) {
      alert('הדפדפן שלך אינו תומך בזיהוי קולי (Web Speech API). מומלץ להשתמש ב-Google Chrome, Microsoft Edge או Safari.');
      return;
    }

    if (isListeningNutrition && nutritionSpeechRecognition) {
      nutritionSpeechRecognition.stop();
      return;
    }

    try {
      nutritionSpeechRecognition = new SpeechRecognition();
      nutritionSpeechRecognition.lang = 'he-IL';
      nutritionSpeechRecognition.interimResults = true;
      nutritionSpeechRecognition.maxAlternatives = 3;

      nutritionSpeechRecognition.onstart = () => {
        isListeningNutrition = true;
        if (voiceBtn) {
          voiceBtn.classList.add('recording');
          voiceBtn.innerHTML = '⏹️ מקשיב...';
        }
        if (statusBanner) statusBanner.hidden = false;
        if (statusText) statusText.textContent = 'מקשיב... אמרו שם מאכל וכמות (לדוגמה: "חזה עוף 200 גרם")';
      };

      nutritionSpeechRecognition.onresult = event => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (statusText) statusText.textContent = `נקלט: "${transcript}"`;

        if (event.results[event.results.length - 1].isFinal) {
          const parsed = parseVoiceMealText(transcript);
          if (parsed.foodName) {
            state.foodQuery = parsed.foodName;
            const searchInput = byId('foodSearchInput');
            if (searchInput) searchInput.value = parsed.foodName;
            searchRemoteFoods(parsed.foodName);
            renderNutrition();

            if (parsed.grams && parsed.grams > 0) {
              const form = byId('nutritionForm');
              const gramsInput = form?.querySelector('input[name="grams"]');
              if (gramsInput) gramsInput.value = String(parsed.grams);
            }
            if (statusText) {
              statusText.textContent = `זוהה: "${parsed.foodName}"${parsed.grams ? ` (${parsed.grams} גרם)` : ''} - נבחר בטופס!`;
            }
          }
        }
      };

      nutritionSpeechRecognition.onerror = event => {
        console.warn('Speech recognition error:', event.error);
        if (statusText) {
          if (event.error === 'not-allowed') {
            statusText.textContent = 'הגישה למיקרופון נדחתה. יש לאשר הרשאת מיקרופון בדפדפן.';
          } else if (event.error === 'no-speech') {
            statusText.textContent = 'לא נקלט דיבור. נסו שוב ודברו בקול ברור ליד המיקרופון.';
          } else {
            statusText.textContent = `שגיאת זיהוי קולי: ${event.error}`;
          }
        }
        stopVoiceNutritionRecording();
      };

      nutritionSpeechRecognition.onend = () => {
        stopVoiceNutritionRecording();
      };

      nutritionSpeechRecognition.start();
    } catch (err) {
      console.error('Could not start speech recognition:', err);
      stopVoiceNutritionRecording();
    }
  }

  function stopVoiceNutritionRecording() {
    isListeningNutrition = false;
    const voiceBtn = byId('voiceNutritionBtn');
    if (voiceBtn) {
      voiceBtn.classList.remove('recording');
      voiceBtn.innerHTML = 'הקלטה קולית';
    }
    if (nutritionSpeechRecognition) {
      try { nutritionSpeechRecognition.abort(); } catch (e) {}
      nutritionSpeechRecognition = null;
    }
  }

  function normalizeScannedProduct(barcode, product) {
    const nutrients = product.nutriments || {};
    const readPer100 = (...keys) => {
      for (const key of keys) {
        const value = Number(nutrients[key]);
        if (Number.isFinite(value) && value >= 0) return value;
      }
      return null;
    };
    const sodiumGrams = readPer100('sodium_100g');
    const saltGrams = readPer100('salt_100g');
    const nutrientMg = (...keys) => {
      const value = readPer100(...keys);
      return value === null ? null : value * 1000;
    };
    let calories = readPer100('energy-kcal_100g', 'energy-kcal_value');
    if (calories === null) {
      const kilojoules = readPer100('energy_100g', 'energy_value');
      if (kilojoules !== null) calories = kilojoules / 4.184;
    }
    const productName = String(product.product_name || product.product_name_en || '').trim();
    if (!productName || calories === null) return null;
    const categories = String(product.categories || '').split(',').map(value => value.trim()).filter(Boolean);
    const labels = [product.brands, ...categories, product.generic_name, ...(product._keywords || [])]
      .filter(Boolean).map(value => String(value));
    const optional = value => value === null ? null : value;
    const omega3 = optional(readPer100('omega-3-fat_100g', 'omega-3_100g'));
    const omega6 = optional(readPer100('omega-6-fat_100g', 'omega-6_100g'));
    const addedSugar = optional(readPer100('added-sugars_100g', 'added_sugars_100g'));
    const fiber = readPer100('fiber_100g');
    const sodium = sodiumGrams !== null ? sodiumGrams * 1000 : saltGrams !== null ? saltGrams * 393.4 : null;
    const sugar = readPer100('sugars_100g');
    const potassium = nutrientMg('potassium_100g');
    const micronutrients = {
      sodium: sodium ?? 0,
      potassium: potassium ?? 0,
      calcium: nutrientMg('calcium_100g') ?? 0,
      iron: nutrientMg('iron_100g') ?? 0,
      vitaminC: nutrientMg('vitamin-c_100g', 'vitamin_c_100g') ?? 0
    };
    const fattyAcids = { omega3: omega3 ?? 0, omega6: omega6 ?? 0 };
    const unknownNutrients = Object.entries({ fiber, sodium, sugar, addedSugar, potassium, omega3, omega6 })
      .filter(([, value]) => value === null)
      .map(([key]) => key);
    return {
      id: `off-${barcode}`,
      barcode,
      name: productName,
      category: 'scanned',
      categoryName: 'סריקה · Open Food Facts',
      tags: labels,
      defaultGrams: 100,
      unitName: '100 גרם',
      calories,
      protein: readPer100('proteins_100g') ?? 0,
      carbs: readPer100('carbohydrates_100g') ?? 0,
      fat: readPer100('fat_100g') ?? 0,
      saturatedFats: readPer100('saturated-fat_100g') ?? 0,
      transFats: readPer100('trans-fat_100g') ?? 0,
      fiber,
      sodium,
      sugar,
      addedSugar,
      potassium,
      omega3,
      omega6,
      micronutrients,
      fattyAcids,
      icon: '📦',
      unknownNutrients,
      source: 'Open Food Facts product label; values per 100 g. Database values may be community-submitted.'
    };
  }

  async function searchRemoteFoods(query) {
    if (state.remoteFoodController) state.remoteFoodController.abort();
    state.remoteFoodController = null;
    state.remoteFoodStatus = '';
    state.remoteFoods = [];
    const search = query.trim();
    if (search.length < 3 || !['all', 'scanned'].includes(state.foodCategory)) {
      state.remoteFoods = [];
      renderNutrition();
      return;
    }
    const controller = new AbortController();
    state.remoteFoodController = controller;
    state.remoteFoodStatus = 'מחפש גם ב־Open Food Facts…';
    renderNutrition();
    try {
      const params = new URLSearchParams({
        search_terms: search,
        page_size: '12',
        fields: 'code,product_name,product_name_en,brands,categories,generic_name,_keywords,nutriments'
      });
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/search?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Open Food Facts returned HTTP ${response.status}.`);
      const result = await response.json();
      if (state.remoteFoodController !== controller) return;
      state.remoteFoods = (result.products || [])
        .filter(product => /^\d{8,14}$/.test(String(product.code || '')))
        .map(product => normalizeScannedProduct(String(product.code), product))
        .filter(Boolean)
        .filter((food, index, foods) => foods.findIndex(item => item.id === food.id) === index);
      state.remoteFoodStatus = `${state.remoteFoods.length} תוצאות רשת נוספו לחיפוש. נתוני Open Food Facts קהילתיים; בדקו תווית מוצר.`;
      renderNutrition();
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Could not search Open Food Facts.', error);
      state.remoteFoods = [];
      state.remoteFoodStatus = 'חיפוש רשת לא זמין כרגע; תוצאות הקטלוג המקומי עדיין מוצגות.';
      renderNutrition();
    } finally {
      if (state.remoteFoodController === controller) state.remoteFoodController = null;
    }
  }

  function setBarcodeEditorError(message) {
    const errorEl = byId('barcodeFoodEditorError');
    if (!errorEl) return;
    errorEl.hidden = !message;
    errorEl.textContent = message || '';
  }

  function openBarcodeFoodEditor(options = {}) {
    const dialog = byId('barcodeFoodEditorDialog');
    if (!dialog) return;
    dialog.hidden = false;
    const loading = byId('barcodeFoodEditorLoading');
    const form = byId('barcodeFoodEditorForm');
    if (loading) loading.hidden = !options.loading;
    if (form) form.hidden = Boolean(options.loading);
    if (byId('barcodeFoodEditorTitle')) {
      byId('barcodeFoodEditorTitle').textContent = options.title || 'אישור מוצר';
    }
    if (byId('barcodeFoodEditorEyebrow')) {
      byId('barcodeFoodEditorEyebrow').textContent = options.eyebrow || 'מאגר מזון שיתופי';
    }
    if (byId('barcodeFoodEditorHint')) {
      byId('barcodeFoodEditorHint').textContent = options.hint || 'בדקו את הערכים ל־100 גרם לפני הוספה ליומן ולמאגר.';
    }
    if (options.loading) return;
    byId('barcodeFoodCodeField').value = options.barcode || '';
    byId('barcodeFoodCodeField').readOnly = Boolean(options.barcode);
    [
      'barcodeFoodNameField', 'barcodeFoodBrandField', 'barcodeFoodCaloriesField',
      'barcodeFoodProteinField', 'barcodeFoodCarbsField', 'barcodeFoodFatsField',
      'barcodeFoodSaturatedFatsField', 'barcodeFoodTransFatsField',
      'barcodeFoodSodiumField', 'barcodeFoodPotassiumField', 'barcodeFoodCalciumField',
      'barcodeFoodIronField', 'barcodeFoodVitaminCField', 'barcodeFoodOmega3Field',
      'barcodeFoodOmega6Field'
    ].forEach(id => { byId(id).readOnly = Boolean(options.exists); });
    byId('barcodeFoodNameField').value = options.name || '';
    byId('barcodeFoodBrandField').value = options.brand || '';
    byId('barcodeFoodCaloriesField').value = options.calories ?? '';
    byId('barcodeFoodProteinField').value = options.protein ?? '';
    byId('barcodeFoodCarbsField').value = options.carbs ?? '';
    byId('barcodeFoodFatsField').value = options.fats ?? options.fat ?? '';
    byId('barcodeFoodSaturatedFatsField').value = options.saturatedFats ?? 0;
    byId('barcodeFoodTransFatsField').value = options.transFats ?? 0;
    byId('barcodeFoodSodiumField').value = options.sodium ?? 0;
    byId('barcodeFoodPotassiumField').value = options.potassium ?? 0;
    byId('barcodeFoodCalciumField').value = options.calcium ?? 0;
    byId('barcodeFoodIronField').value = options.iron ?? 0;
    byId('barcodeFoodVitaminCField').value = options.vitaminC ?? 0;
    byId('barcodeFoodOmega3Field').value = options.omega3 ?? 0;
    byId('barcodeFoodOmega6Field').value = options.omega6 ?? 0;
    byId('barcodeFoodGramsField').value = options.grams || 100;
    byId('barcodeFoodSourceField').value = options.source || 'manual';
    if (form) form.dataset.exists = options.exists ? '1' : '';
    if (byId('barcodeFoodSaveBtn')) {
      byId('barcodeFoodSaveBtn').textContent = options.exists
        ? 'הוספה ליומן הארוחות'
        : 'אישור, שמירה למאגר והוספה ליומן';
    }
    setBarcodeEditorError('');
  }

  function closeBarcodeFoodEditor() {
    const dialog = byId('barcodeFoodEditorDialog');
    if (dialog) dialog.hidden = true;
  }

  function parseNutritionValue(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const match = String(value || '').replace(',', '.').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  }

  function parseNutrientAmount(value, targetUnit) {
    const amount = parseNutritionValue(value);
    if (amount === null) return 0;
    const unit = String(value || '').toLowerCase();
    if (targetUnit === 'mg') {
      if (/(?:ug|µg|mcg)\s*$/.test(unit)) return amount / 1000;
      if (/g\s*$/.test(unit) && !/mg\s*$/.test(unit)) return amount * 1000;
      return amount;
    }
    if (/mg\s*$/.test(unit)) return amount / 1000;
    return amount;
  }

  async function readLimitedResponseText(response, limitBytes) {
    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      if (text.length > limitBytes) throw new Error('Product page is too large to parse.');
      return text;
    }
    const decoder = new TextDecoder();
    let text = '';
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limitBytes) {
        await reader.cancel();
        throw new Error('Product page is too large to parse.');
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  }

  function productFromJsonLd(value) {
    const entries = Array.isArray(value) ? value : [value];
    const products = entries.flatMap(entry => entry && Array.isArray(entry['@graph']) ? entry['@graph'] : [entry]);
    const product = products.find(entry => {
      const type = entry?.['@type'];
      return String(type).endsWith('Product') ||
        (Array.isArray(type) && type.some(value => String(value).endsWith('Product')));
    });
    const nutrition = product?.nutrition || product?.nutritionInformation;
    if (!product || !nutrition || !/100\s*(g|gram|grams|גרם)/i.test(String(nutrition.servingSize || ''))) return null;
    const calories = nutrition.calories !== undefined && nutrition.calories !== null
      ? parseNutritionValue(nutrition.calories)
      : /kj/i.test(String(nutrition.energyContent || ''))
        ? (parseNutritionValue(nutrition.energyContent) || 0) / 4.184
        : parseNutritionValue(nutrition.energyContent);
    const protein = parseNutritionValue(nutrition.proteinContent);
    const carbs = parseNutritionValue(nutrition.carbohydrateContent);
    const fats = parseNutritionValue(nutrition.fatContent);
    const name = typeof product.name === 'string' ? product.name.trim() : '';
    const brand = typeof product.brand === 'string' ? product.brand : product.brand?.name || '';
    if (!name || [calories, protein, carbs, fats].some(value => value === null)) return null;
    return {
      name, brand, calories, protein, carbs, fats,
      saturatedFats: parseNutrientAmount(nutrition.saturatedFatContent, 'g'),
      transFats: parseNutrientAmount(nutrition.transFatContent, 'g'),
      sodium: parseNutrientAmount(nutrition.sodiumContent, 'mg'),
      potassium: parseNutrientAmount(nutrition.potassiumContent, 'mg'),
      calcium: parseNutrientAmount(nutrition.calciumContent, 'mg'),
      iron: parseNutrientAmount(nutrition.ironContent, 'mg'),
      vitaminC: parseNutrientAmount(nutrition.vitaminCContent, 'mg'),
      omega3: parseNutrientAmount(nutrition.omega3Content, 'g'),
      omega6: parseNutrientAmount(nutrition.omega6Content, 'g')
    };
  }

  async function scrapeNutritionFromUrl(value) {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || !hostname || url.username || url.password ||
        hostname === 'localhost' || hostname.endsWith('.local') ||
        /^(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
        hostname.includes(':')) {
      throw new Error('Only public HTTPS product pages can be parsed.');
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(url.href, {
        signal: controller.signal,
        credentials: 'omit',
        redirect: 'error',
        headers: { Accept: 'text/html, application/ld+json, application/json' }
      });
      if (!response.ok) throw new Error(`Product page returned HTTP ${response.status}.`);
      const contentLength = Number(response.headers.get('content-length'));
      if (contentLength > 1000000) throw new Error('Product page is too large to parse.');
      const text = await readLimitedResponseText(response, 1000000);
      const contentType = String(response.headers.get('content-type') || '');
      if (contentType.includes('json')) {
        const json = JSON.parse(text);
        const jsonLdProduct = productFromJsonLd(json);
        if (jsonLdProduct) return jsonLdProduct;
        const candidate = json.product || json;
        const macros = candidate.macrosPer100g || candidate.nutriments || {};
        const explicitPer100g = candidate.macrosPer100g ||
          (macros['energy-kcal_100g'] !== undefined && macros.proteins_100g !== undefined &&
           macros.carbohydrates_100g !== undefined && macros.fat_100g !== undefined);
        const servingSize = String(candidate.servingSize || candidate.serving_size || '');
        if (explicitPer100g || /100\s*(g|gram|grams|גרם)/i.test(servingSize)) {
          const product = {
            name: String(candidate.name || candidate.product_name || candidate.title || '').trim(),
            brand: String(candidate.brand || candidate.brands || ''),
            calories: parseNutritionValue(macros.calories ?? macros['energy-kcal_100g'] ?? candidate.calories),
            protein: parseNutritionValue(macros.protein ?? macros.proteins_100g ?? candidate.protein),
            carbs: parseNutritionValue(macros.carbs ?? macros.carbohydrates_100g ?? candidate.carbs ?? candidate.carbohydrates),
            fats: parseNutritionValue(macros.fats ?? macros.fat ?? macros.fat_100g ?? candidate.fat),
            saturatedFats: parseNutrientAmount(macros.saturatedFats ?? candidate.saturatedFats, 'g'),
            transFats: parseNutrientAmount(macros.transFats ?? candidate.transFats, 'g'),
            sodium: parseNutrientAmount(candidate.micronutrients?.sodium ?? macros.sodium ?? candidate.sodium, 'mg'),
            potassium: parseNutrientAmount(candidate.micronutrients?.potassium ?? macros.potassium ?? candidate.potassium, 'mg'),
            calcium: parseNutrientAmount(candidate.micronutrients?.calcium ?? macros.calcium ?? candidate.calcium, 'mg'),
            iron: parseNutrientAmount(candidate.micronutrients?.iron ?? macros.iron ?? candidate.iron, 'mg'),
            vitaminC: parseNutrientAmount(candidate.micronutrients?.vitaminC ?? macros.vitaminC ?? candidate.vitaminC, 'mg'),
            omega3: parseNutrientAmount(candidate.fattyAcids?.omega3 ?? macros.omega3 ?? candidate.omega3, 'g'),
            omega6: parseNutrientAmount(candidate.fattyAcids?.omega6 ?? macros.omega6 ?? candidate.omega6, 'g')
          };
          if (product.name && [product.calories, product.protein, product.carbs, product.fats].every(Number.isFinite)) {
            return product;
          }
        }
        return null;
      }
      const page = new DOMParser().parseFromString(text, 'text/html');
      for (const script of page.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const parsed = productFromJsonLd(JSON.parse(script.textContent || ''));
          if (parsed) return parsed;
        } catch (error) {
          console.warn('Ignoring invalid product JSON-LD.', error);
        }
      }
      return null;
    } finally {
      window.clearTimeout(timer);
    }
  }

  async function lookupOpenFoodFacts(barcode) {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,brands,categories,generic_name,_keywords,nutriments`);
    if (!response.ok) return null;
    const result = await response.json();
    if (result.status !== 1 || !result.product) return null;
    return normalizeScannedProduct(barcode, result.product);
  }

  async function resolveScannedCode(rawValue) {
    const domain = window.FitPulseDomain || {};
    const parsed = typeof domain.parseScanPayload === 'function'
      ? domain.parseScanPayload(rawValue)
      : { raw: String(rawValue || ''), barcode: String(rawValue || '').trim(), sourceUrl: '' };
    const status = byId('barcodeScannerStatus');
    if (!parsed.barcode) {
      if (status) status.textContent = 'הסריקה לא זוהתה כברקוד או קישור קריא.';
      openBarcodeFoodEditor({
        title: 'הזנת מוצר חדש',
        hint: 'הזינו ידנית את שם המוצר והערכים ל־100 גרם.',
        source: 'manual'
      });
      return;
    }
    if (status) status.textContent = `מחפש את ${parsed.barcode} במאגר השיתופי…`;
    openBarcodeFoodEditor({
      loading: true,
      title: 'בודק במאגר השיתופי',
      hint: 'שולפים את המוצר מ־Firestore לפי מזהה הברקוד.'
    });
    try {
      const existing = await window.FitPulseFirebase?.getFoodByBarcode?.(parsed.barcode);
      const localExisting = firestoreFoodToLocal(existing);
      if (localExisting) {
        if (status) status.textContent = `${localExisting.name} נמצא במאגר השיתופי.`;
        openBarcodeFoodEditor({
          title: 'מוצר קיים במאגר',
          hint: 'המוצר כבר במאגר השיתופי. אשרו כדי להוסיף ליומן הארוחות בלבד.',
          exists: true,
          source: existing.source || 'scraped',
          barcode: localExisting.barcode,
          name: localExisting.name,
          brand: localExisting.brand,
          calories: localExisting.calories,
          protein: localExisting.protein,
          carbs: localExisting.carbs,
          fats: localExisting.fat,
          saturatedFats: localExisting.saturatedFats,
          transFats: localExisting.transFats,
          sodium: localExisting.sodium,
          potassium: localExisting.potassium,
          calcium: localExisting.calcium,
          iron: localExisting.iron,
          vitaminC: localExisting.vitaminC,
          omega3: localExisting.omega3,
          omega6: localExisting.omega6,
          grams: 100
        });
        return;
      }

      if (parsed.sourceUrl) {
        if (status) status.textContent = 'המוצר חדש. מחלץ ערכים תזונתיים מהקישור…';
        const scraped = await scrapeNutritionFromUrl(parsed.sourceUrl);
        if (scraped) {
          openBarcodeFoodEditor({
            title: 'אישור מהיר אחרי חילוץ',
            hint: 'הערכים חולצו אוטומטית. אשרו או תקנו לפני שמירה למאגר השיתופי.',
            source: 'scraped',
            barcode: parsed.barcode,
            name: scraped.name,
            brand: scraped.brand,
            calories: scraped.calories,
            protein: scraped.protein,
            carbs: scraped.carbs,
            fats: scraped.fats,
            saturatedFats: scraped.saturatedFats,
            transFats: scraped.transFats,
            sodium: scraped.sodium,
            potassium: scraped.potassium,
            calcium: scraped.calcium,
            iron: scraped.iron,
            vitaminC: scraped.vitaminC,
            omega3: scraped.omega3,
            omega6: scraped.omega6
          });
          if (status) status.textContent = 'החילוץ הצליח. ממתינים לאישור.';
          return;
        }
      }

      if (/^\d{8,14}$/.test(parsed.barcode)) {
        if (status) status.textContent = 'לא נמצא במאגר. מנסה לחלץ ממאגר חיצוני…';
        const offFood = await lookupOpenFoodFacts(parsed.barcode).catch(() => null);
        if (offFood) {
          openBarcodeFoodEditor({
            title: 'אישור מהיר אחרי חילוץ',
            hint: 'חולצו ערכים ממקור חיצוני. אשרו כדי לשמור במאגר השיתופי ולהוסיף ליומן.',
            source: 'scraped',
            barcode: parsed.barcode,
            name: offFood.name,
            brand: Array.isArray(offFood.tags) ? String(offFood.tags[0] || '') : '',
            calories: offFood.calories,
            protein: offFood.protein,
            carbs: offFood.carbs,
            fats: offFood.fat,
            saturatedFats: offFood.saturatedFats,
            transFats: offFood.transFats,
            sodium: offFood.micronutrients?.sodium,
            potassium: offFood.micronutrients?.potassium,
            calcium: offFood.micronutrients?.calcium,
            iron: offFood.micronutrients?.iron,
            vitaminC: offFood.micronutrients?.vitaminC,
            omega3: offFood.fattyAcids?.omega3,
            omega6: offFood.fattyAcids?.omega6,
            saturatedFats: offFood.saturatedFats,
            transFats: offFood.transFats,
            sodium: offFood.micronutrients?.sodium,
            potassium: offFood.micronutrients?.potassium,
            calcium: offFood.micronutrients?.calcium,
            iron: offFood.micronutrients?.iron,
            vitaminC: offFood.micronutrients?.vitaminC,
            omega3: offFood.fattyAcids?.omega3,
            omega6: offFood.fattyAcids?.omega6
          });
          return;
        }
      }

      if (status) status.textContent = 'המוצר אינו במאגר. נדרשת הזנה ידנית.';
      openBarcodeFoodEditor({
        title: 'הזנת מוצר חדש',
        hint: 'החילוץ האוטומטי לא הצליח או שאין קישור קריא. הזינו את הערכים ל־100 גרם.',
        source: 'manual',
        barcode: parsed.barcode
      });
    } catch (error) {
      console.error('Barcode catalog lookup failed.', error);
      if (status) status.textContent = 'שגיאה בחיפוש במאגר. ניתן להזין ידנית.';
      openBarcodeFoodEditor({
        title: 'הזנת מוצר חדש',
        hint: 'לא ניתן היה לבדוק את Firestore. הזינו ידנית את פרטי המוצר.',
        source: 'manual',
        barcode: parsed.barcode
      });
    }
  }

  async function submitBarcodeFoodEditor(event) {
    event.preventDefault();
    const domain = window.FitPulseDomain || {};
    const alreadyInCatalog = byId('barcodeFoodEditorForm')?.dataset.exists === '1';
    const input = {
      barcode: byId('barcodeFoodCodeField')?.value,
      name: byId('barcodeFoodNameField')?.value,
      brand: byId('barcodeFoodBrandField')?.value,
      servingSize: '100g',
      source: byId('barcodeFoodSourceField')?.value || 'manual',
      gramsToLog: byId('barcodeFoodGramsField')?.value,
      macrosPer100g: {
        calories: byId('barcodeFoodCaloriesField')?.value,
        protein: byId('barcodeFoodProteinField')?.value,
        carbs: byId('barcodeFoodCarbsField')?.value,
        fats: byId('barcodeFoodFatsField')?.value,
        saturatedFats: byId('barcodeFoodSaturatedFatsField')?.value,
        transFats: byId('barcodeFoodTransFatsField')?.value
      },
      micronutrients: {
        sodium: byId('barcodeFoodSodiumField')?.value,
        potassium: byId('barcodeFoodPotassiumField')?.value,
        calcium: byId('barcodeFoodCalciumField')?.value,
        iron: byId('barcodeFoodIronField')?.value,
        vitaminC: byId('barcodeFoodVitaminCField')?.value
      },
      fattyAcids: {
        omega3: byId('barcodeFoodOmega3Field')?.value,
        omega6: byId('barcodeFoodOmega6Field')?.value
      }
    };
    const validated = typeof domain.validateCrowdsourcedFoodInput === 'function'
      ? domain.validateCrowdsourcedFoodInput(input)
      : { ok: false, error: 'ולידציה לא זמינה.' };
    if (!validated.ok) {
      setBarcodeEditorError(validated.error);
      return;
    }
    const grams = Number(input.gramsToLog) || 100;
    const saveBtn = byId('barcodeFoodSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = 'שומר…';
    }
    try {
      const result = await window.FitPulseFirebase?.createCrowdsourcedFoodAndLog?.(
        validated.food,
        grams,
        state.currentDate
      );
      if (!result?.food) throw new Error('לא ניתן לשמור את המוצר ואת הארוחה.');
      const food = firestoreFoodToLocal(result.food) || {
        id: validated.food.barcode,
        barcode: validated.food.barcode,
        name: validated.food.name,
        brand: validated.food.brand,
        category: 'scanned',
        categoryName: 'מאגר מזון שיתופי',
        defaultGrams: 100,
        unitName: '100g',
        calories: validated.food.macrosPer100g.calories,
        protein: validated.food.macrosPer100g.protein,
        carbs: validated.food.macrosPer100g.carbs,
        fat: validated.food.macrosPer100g.fats,
        icon: '📦',
        source: validated.food.source === 'manual'
          ? 'Crowdsourced Food Database (manual)'
          : 'Crowdsourced Food Database (scraped)'
      };
      cacheLocalFood(food);
      if (!addFoodToLog(food, grams, { source: food.source, skipCloudPersistence: true })) {
        setBarcodeEditorError('המוצר נשמר במאגר, אך ההוספה ליומן נכשלה.');
        return;
      }
      closeBarcodeFoodEditor();
      stopBarcodeScanner();
      if (byId('barcodeScannerDialog')) byId('barcodeScannerDialog').hidden = true;
      setTab('tab-nutrition');
    } catch (error) {
      console.error('Could not save crowdsourced food.', error);
      setBarcodeEditorError(error.message || 'שמירת המוצר נכשלה.');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.textContent = alreadyInCatalog ? 'הוספה ליומן הארוחות' : 'אישור, שמירה למאגר והוספה ליומן';
      }
    }
  }

  function stopBarcodeScanner() {
    if (state.scannerControls) {
      state.scannerControls.stop();
      state.scannerControls = null;
    }
    if (state.scannerReader) {
      state.scannerReader.reset();
      state.scannerReader = null;
    }
    const video = byId('barcodeVideo');
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach(track => track.stop());
      video.srcObject = null;
    }
  }

  async function startBarcodeScanner() {
    const status = byId('barcodeScannerStatus');
    const video = byId('barcodeVideo');
    if (!navigator.mediaDevices?.getUserMedia) {
      if (status) status.textContent = 'המצלמה דורשת חיבור HTTPS או localhost ודפדפן תומך.';
      return;
    }
    if (status) status.textContent = 'מבקש הרשאה למצלמה…';
    try {
      const nativeFormats = 'BarcodeDetector' in window && typeof window.BarcodeDetector.getSupportedFormats === 'function'
        ? await window.BarcodeDetector.getSupportedFormats()
        : [];
      const preferredFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128'];
      const supportedFormats = preferredFormats.filter(format => nativeFormats.includes(format));
      const isUsableScan = (value) => /^\d{8,14}$/.test(value) || /^https:\/\//i.test(value);
      if (supportedFormats.length) {
        const detector = new window.BarcodeDetector({ formats: supportedFormats });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        video.srcObject = stream;
        await video.play();
        if (status) status.textContent = 'מכוונים את המצלמה לברקוד או לקוד QR…';
        const scanFrame = async () => {
          if (!video.srcObject) return;
          try {
            const results = await detector.detect(video);
            if (results.length) {
              const barcode = String(results[0].rawValue || '').trim();
              if (isUsableScan(barcode)) {
                stopBarcodeScanner();
                await resolveScannedCode(barcode);
                return;
              }
            }
          } catch (error) {
            console.error('Barcode detection failed.', error);
            if (status) status.textContent = 'הקריאה נכשלה. נסו להחזיק את הברקוד מול המצלמה.';
          }
          if (video.srcObject) window.requestAnimationFrame(scanFrame);
        };
        window.requestAnimationFrame(scanFrame);
        return;
      }
      if (!window.ZXing?.BrowserMultiFormatReader) {
        if (status) status.textContent = 'ספריית הסריקה לא נטענה. נסו לרענן או להזין ברקוד ידנית.';
        return;
      }
      const reader = new window.ZXing.BrowserMultiFormatReader();
      state.scannerReader = reader;
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result, error) => {
        if (result) {
          const barcode = String(result.getText() || '').trim();
          if (isUsableScan(barcode)) {
            stopBarcodeScanner();
            resolveScannedCode(barcode);
          }
        } else if (error && !(error instanceof window.ZXing.NotFoundException)) {
          console.error('Barcode camera scan failed.', error);
        }
      });
      state.scannerControls = controls;
      if (status) status.textContent = 'מכוונים את המצלמה לברקוד או לקוד QR…';
    } catch (error) {
      console.error('Could not start the barcode camera.', error);
      if (status) status.textContent = 'לא ניתן להפעיל את המצלמה. אשרו הרשאה ובדקו שחיבור HTTPS פעיל.';
      stopBarcodeScanner();
    }
  }

  function addProgressControls() {
    const pane = byId('tab-progress');
    const chart = byId('weightChart');
    if (!pane || !chart || byId('progressControls')) return;
    const controls = createElement('div', 'progress-controls');
    controls.id = 'progressControls';
    const heading = createElement('div', 'card-header-flex');
    heading.append(createElement('h3', '', 'חישוב אישי ומעקב משקל'));
    const form = createElement('form', 'progress-form');
    form.id = 'profileForm';
    const fields = [
      ['age', 'גיל', 1, 120, state.profile.age],
      ['weight', 'משקל (ק״ג)', 20, 400, state.profile.weight],
      ['height', 'גובה (ס״מ)', 100, 250, state.profile.height]
    ];
    fields.forEach(([name, label, min, max, value]) => {
      const wrapper = createElement('label', '', label);
      const input = document.createElement('input');
      input.type = 'number';
      input.name = name;
      input.min = String(min);
      input.max = String(max);
      input.step = 'any';
      input.value = String(value);
      input.required = true;
      wrapper.append(input);
      form.append(wrapper);
    });
    const genderLabel = createElement('label', '', 'חישוב');
    const gender = document.createElement('select');
    gender.name = 'gender';
    [['male', 'גבר'], ['female', 'אישה']].forEach(([value, text]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      option.selected = state.profile.gender === value;
      gender.append(option);
    });
    genderLabel.append(gender);
    form.append(genderLabel);
    const save = createElement('button', 'btn-action-primary', 'עדכון פרופיל');
    save.type = 'submit';
    form.append(save);
    form.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(form);
      const age = Number(values.get('age'));
      const weight = Number(values.get('weight'));
      const height = Number(values.get('height'));
      if (![age, weight, height].every(Number.isFinite) || age <= 0 || weight <= 0 || height <= 0) return;
      state.profile = { ...state.profile, age, weight, height, gender: values.get('gender') };
      if (writeStorage(STORAGE_KEYS.profile, state.profile)) renderProgress();
    });
    controls.append(heading, form);

    const weightForm = createElement('form', 'weight-form');
    weightForm.id = 'weightForm';
    const weightTitle = createElement('h3', '', 'רישום שקילה');
    const weightInput = document.createElement('input');
    weightInput.type = 'number';
    weightInput.name = 'weight';
    weightInput.min = '20';
    weightInput.max = '400';
    weightInput.step = '0.1';
    weightInput.placeholder = 'משקל בק״ג';
    weightInput.value = String(state.profile.weight);
    weightInput.required = true;
    const weightSave = createElement('button', 'btn-action-secondary', 'שמירת שקילה');
    weightSave.type = 'submit';
    weightForm.append(weightTitle, weightInput, weightSave);
    weightForm.addEventListener('submit', async event => {
      event.preventDefault();
      const weight = Number(weightInput.value);
      if (!Number.isFinite(weight) || weight < 20 || weight > 400) return;
      state.weightLogs = state.weightLogs.filter(entry => entry.date !== state.currentDate);
      state.weightLogs.push({ date: state.currentDate, weight });
      state.weightLogs.sort((a, b) => a.date.localeCompare(b.date));
      state.profile = { ...state.profile, weight };
      if (writeStorage(STORAGE_KEYS.weights, state.weightLogs) &&
        writeStorage(STORAGE_KEYS.profile, state.profile)) {
        renderProgress();
        if (window.FitPulseFirebase?.getSignedInUid?.()) {
          try {
            const completedTask = await window.FitPulseFirebase.completeWeightCheckTask(weight);
            if (completedTask) {
              await renderTraineeTasks(true);
              alert('השקילה נשמרה ומשימת המאמן הושלמה.');
            }
          } catch (error) {
            console.error('Could not complete weigh-in task.', error);
            alert(`השקילה נשמרה במכשיר, אך לא ניתן היה לעדכן את משימת המאמן: ${error.message}`);
          }
        }
      }
    });
    controls.append(weightForm);
    chart.insertAdjacentElement('beforebegin', controls);
    chart.insertAdjacentElement('afterend', createElement('p', 'chart-caption', 'משקל גוף לאורך זמן · הנתונים נשמרים בדפדפן זה בלבד.'));
  }

  function renderProgress() {
    const bmi = state.profile.weight / ((state.profile.height / 100) ** 2);
    const bmr = state.profile.gender === 'female'
      ? 10 * state.profile.weight + 6.25 * state.profile.height - 5 * state.profile.age - 161
      : 10 * state.profile.weight + 6.25 * state.profile.height - 5 * state.profile.age + 5;
    const tdee = Math.round(bmr * 1.45);
    let summary = byId('progressSummary');
    if (!summary) {
      summary = createElement('div', 'progress-summary');
      summary.id = 'progressSummary';
      const controls = byId('progressControls');
      if (controls) controls.append(summary);
    }
    summary.replaceChildren();
    [
      ['BMI', formatNumber(bmi)],
      ['חילוף חומרים במנוחה', `${formatNumber(bmr)} קל׳`],
      ['הוצאה יומית משוערת (פעילות בינונית)', `${formatNumber(tdee)} קל׳`]
    ].forEach(([label, value]) => {
      const item = createElement('div', 'progress-stat');
      item.append(createElement('span', '', label), createElement('strong', '', value));
      summary.append(item);
    });
    const formWeight = document.querySelector('#weightForm input[name="weight"]');
    if (formWeight) formWeight.value = String(state.profile.weight);
    drawWeightChart();
  }

  function drawWeightChart() {
    const canvas = byId('weightChart');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(300, rect.width);
    const height = 240;
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.height = `${height}px`;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.scale(scale, scale);
    context.clearRect(0, 0, width, height);
    const values = [...state.weightLogs];
    if (!values.some(entry => entry.date === state.currentDate)) {
      values.push({ date: state.currentDate, weight: Number(state.profile.weight) });
    }
    values.sort((a, b) => a.date.localeCompare(b.date));
    const padding = { left: 42, right: 16, top: 18, bottom: 34 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const weights = values.map(entry => Number(entry.weight)).filter(Number.isFinite);
    if (!weights.length) return;
    const min = Math.floor(Math.min(...weights) - 2);
    const max = Math.ceil(Math.max(...weights) + 2) || min + 1;
    context.font = '12px Rubik, sans-serif';
    context.textAlign = 'right';
    context.fillStyle = '#8b96aa';
    context.strokeStyle = 'rgba(148, 163, 184, 0.16)';
    for (let index = 0; index < 4; index += 1) {
      const y = padding.top + (plotHeight * index) / 3;
      const label = max - ((max - min) * index) / 3;
      context.beginPath();
      context.moveTo(padding.left, y);
      context.lineTo(width - padding.right, y);
      context.stroke();
      context.fillText(label.toFixed(1), padding.left - 8, y + 4);
    }
    const xAt = index => values.length < 2
      ? padding.left + plotWidth / 2
      : padding.left + (plotWidth * index) / (values.length - 1);
    const yAt = weight => padding.top + ((max - weight) / (max - min || 1)) * plotHeight;
    if (values.length > 1) {
      context.beginPath();
      values.forEach((entry, index) => {
        const x = xAt(index);
        const y = yAt(Number(entry.weight));
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = '#8b7bff';
      context.lineWidth = 3;
      context.stroke();
    }
    values.forEach((entry, index) => {
      const x = xAt(index);
      const y = yAt(Number(entry.weight));
      context.beginPath();
      context.arc(x, y, 4, 0, Math.PI * 2);
      context.fillStyle = '#a99bff';
      context.fill();
      context.textAlign = index === 0 ? 'left' : index === values.length - 1 ? 'right' : 'center';
      context.fillStyle = '#aeb8ca';
      context.fillText(entry.date.slice(5), x, height - 10);
    });
  }

  // ==========================================================================
  // DAILY TRAINEE REPORT & PIPELINE (דוח יומי למתאמן ולמאמן)
  // ==========================================================================
  let dailyReportSaveTimeout = null;

  function getOrCreateDailyReport(traineeId, date) {
    const localKey = `${traineeId}_${date}`;
    const existing = state.dailyReports[localKey];

    const meals = (state.nutritionLogs[date] || []).map(m => ({
      id: m.id,
      loggedAt: m.loggedAt || `${date}T12:00:00.000Z`,
      time: m.time || (m.loggedAt ? new Date(m.loggedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '12:00'),
      name: m.name,
      amount: m.amount || m.grams,
      unitName: m.unitName || 'גרם',
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      source: m.source
    }));
    const totalCals = meals.reduce((s, m) => s + (Number(m.calories) || 0), 0);
    const totalProt = meals.reduce((s, m) => s + (Number(m.protein) || 0), 0);
    const totalCarb = meals.reduce((s, m) => s + (Number(m.carbs) || 0), 0);
    const totalFat = meals.reduce((s, m) => s + (Number(m.fat) || 0), 0);

    const workouts = (state.workoutLogs[date] || []).map(w => ({
      id: w.id,
      routineId: w.routineId,
      name: w.name,
      startedAt: w.startedAt || `${date}T18:00:00.000Z`,
      completedAt: w.completedAt || `${date}T19:00:00.000Z`,
      time: w.time || (w.completedAt ? new Date(w.completedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '18:00'),
      durationMinutes: w.durationMinutes || 60,
      completedSets: w.completedSets || 0,
      totalSets: w.totalSets || 0,
      totalVolume: w.totalVolume || 0,
      difficulty: w.difficulty || 8,
      notes: w.notes || '',
      exercises: (w.setLogs || []).reduce((acc, set) => {
        let ex = acc.find(e => e.name === set.exerciseName);
        if (!ex) {
          ex = { name: set.exerciseName, exerciseId: set.exerciseId, sets: [] };
          acc.push(ex);
        }
        ex.sets.push({
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          completed: set.completed,
          time: set.time || w.time || '18:30'
        });
        return acc;
      }, [])
    }));

    const isPast = date < state.currentDate;
    const status = existing?.status || (isPast ? 'auto_closed' : 'draft');

    const report = {
      id: localKey,
      traineeId,
      date,
      status,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      finalizedAt: status === 'draft' ? null : (existing?.finalizedAt || `${date}T23:59:59.000Z`),
      metrics: {
        morningWeightKg: existing?.metrics?.morningWeightKg ?? (state.weightLogs.find(w => w.date === date)?.weight || null),
        sleepHours: existing?.metrics?.sleepHours ?? (state.sleepLogs[date] || 7.5),
        sleepQuality: existing?.metrics?.sleepQuality ?? 8,
        waterMl: existing?.metrics?.waterMl ?? (state.waterLogs[date] || 2500),
        steps: existing?.metrics?.steps ?? 9000,
        energyLevel: existing?.metrics?.energyLevel ?? 4,
        hungerLevel: existing?.metrics?.hungerLevel ?? 2,
        stressLevel: existing?.metrics?.stressLevel ?? 2,
        digestion: existing?.metrics?.digestion ?? 'good',
        traineeNotes: existing?.metrics?.traineeNotes ?? ''
      },
      nutrition: {
        totalCalories: totalCals,
        totalProtein: totalProt,
        totalCarbs: totalCarb,
        totalFat: totalFat,
        totalFiber: 30,
        totalSodium: 2100,
        targetCalories: Number(state.profile.targetCalories) || 2400,
        targetProtein: Number(state.profile.targetProtein) || 175,
        meals
      },
      workouts,
      coachFeedback: existing?.coachFeedback || null
    };

    state.dailyReports[localKey] = report;
    writeStorage(STORAGE_KEYS.dailyReports, state.dailyReports);
    return report;
  }

  function syncDailyReportDraft() {
    const traineeId = state.profile.demoTraineeId || 'client_1';
    const date = state.currentDate;
    const report = getOrCreateDailyReport(traineeId, date);

    if (dailyReportSaveTimeout) clearTimeout(dailyReportSaveTimeout);
    dailyReportSaveTimeout = setTimeout(async () => {
      // 1. Sync to Firebase Cloud Firestore if configured
      if (window.FitPulseFirebase?.isConfigured) {
        await window.FitPulseFirebase.saveReportDraft(report);
      }
      // 2. Sync to local REST API
      try {
        await fetch('/api/reports/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report)
        });
        const syncEl = byId('dailyReportSyncTime');
        if (syncEl) {
          const timeNow = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
          const cloudTag = window.FitPulseFirebase?.isConfigured ? ' (Cloud + Local)' : '';
          syncEl.textContent = `סונכרן למסד הנתונים ב-${timeNow}${cloudTag}`;
        }
      } catch (err) {
        console.warn('[DailyReport] Auto-save error, preserved locally:', err);
      }
    }, 500);
  }

  async function finalizeDailyReport() {
    const traineeId = state.profile.demoTraineeId || 'client_1';
    const date = state.dailyReportDate || state.currentDate;
    const report = getOrCreateDailyReport(traineeId, date);
    report.status = 'finalized';
    report.finalizedAt = new Date().toISOString();
    report.updatedAt = new Date().toISOString();

    const localKey = `${traineeId}_${date}`;
    state.dailyReports[localKey] = report;
    writeStorage(STORAGE_KEYS.dailyReports, state.dailyReports);

    // 1. Finalize in Firebase Cloud Firestore if configured
    if (window.FitPulseFirebase?.isConfigured) {
      await window.FitPulseFirebase.finalizeReport(report.id || `${traineeId}_${date}`);
    }

    // 2. Finalize in local REST API
    try {
      const res = await fetch('/api/reports/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId, date })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.report) state.dailyReports[localKey] = data.report;
      }
    } catch (err) {
      console.warn('[DailyReport] Server finalize error, finalized locally:', err);
    }

    renderDailyReportTab();
    alert('דוח הפעילות היומי ננעל, נחתם ונשלח בהצלחה למאמן!');
  }

  async function renderDailyReportTab() {
    const traineeId = state.profile.demoTraineeId || 'client_1';
    const date = state.dailyReportDate || state.currentDate;

    // Fetch latest from server or fallback
    let report = null;
    try {
      const res = await fetch(`/api/reports/${traineeId}/${date}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.report) {
          report = data.report;
          state.dailyReports[`${traineeId}_${date}`] = report;
        }
      }
    } catch (err) {
      // Offline fallback
    }
    if (!report) {
      report = getOrCreateDailyReport(traineeId, date);
    }

    // 1. Date label & picker
    const dateLabel = byId('dailyReportDateLabel');
    if (dateLabel) {
      const isToday = date === state.currentDate;
      const d = new Date(date + 'T00:00:00');
      const dayNames = ['יום ראשון', 'יום שני', 'יום שלישי', 'יום רביעי', 'יום חמישי', 'יום שישי', 'יום שבת'];
      dateLabel.textContent = isToday ? `היום, ${dayNames[d.getDay()]} (${date})` : `${dayNames[d.getDay()]}, ${date}`;
    }
    const datePicker = byId('dailyReportDatePicker');
    if (datePicker) datePicker.value = date;

    // 2. Status Badge
    const badge = byId('dailyReportStatusBadge');
    if (badge) {
      badge.className = `status-pill status-${report.status}`;
      if (report.status === 'finalized') {
        const finTime = report.finalizedAt ? new Date(report.finalizedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';
        badge.textContent = `נחתם ונשלח למאמן ✓ ${finTime ? '(' + finTime + ')' : ''}`;
      } else if (report.status === 'auto_closed') {
        badge.textContent = 'נסגר אוטומטית (סוף יום)';
      } else {
        badge.textContent = 'טיוטה פעילה · מסתנכרן אוטומטית';
      }
    }

    // 3. Finalize button
    const finalizeBtn = byId('dailyReportFinalizeBtn');
    if (finalizeBtn) {
      if (report.status === 'finalized') {
        finalizeBtn.textContent = 'הדוח חתום ונעול ✓';
        finalizeBtn.disabled = true;
        finalizeBtn.style.opacity = '0.7';
      } else {
        finalizeBtn.textContent = 'נעילה ושליחת דוח יומי למאמן';
        finalizeBtn.disabled = false;
        finalizeBtn.style.opacity = '1';
      }
    }

    // 4. Quick Summary Cards
    const targetCals = report.nutrition?.targetCalories || Number(state.profile.targetCalories) || 2400;
    const consumedCals = report.nutrition?.totalCalories || 0;
    if (byId('reportCaloriesSummary')) byId('reportCaloriesSummary').textContent = `${formatNumber(consumedCals)} / ${formatNumber(targetCals)} קק"ל`;
    if (byId('reportMacrosSummary')) byId('reportMacrosSummary').textContent = `חלבון: ${formatNumber(report.nutrition?.totalProtein || 0)}g · פחמימות: ${formatNumber(report.nutrition?.totalCarbs || 0)}g · שומן: ${formatNumber(report.nutrition?.totalFat || 0)}g`;
    const pct = targetCals > 0 ? Math.min(100, Math.round(consumedCals / targetCals * 100)) : 0;
    if (byId('reportCalorieProgress')) byId('reportCalorieProgress').style.width = `${pct}%`;

    const workouts = report.workouts || [];
    if (byId('reportWorkoutSummary')) byId('reportWorkoutSummary').textContent = workouts.length > 0 ? workouts.map(w => w.name).join(', ') : 'טרם בוצע אימון היום';
    const totalVol = workouts.reduce((s, w) => s + (Number(w.totalVolume) || 0), 0);
    const completedSets = workouts.reduce((s, w) => s + (w.completedSets || 0), 0);
    if (byId('reportWorkoutVolume')) byId('reportWorkoutVolume').textContent = workouts.length > 0 ? `נפח כולל: ${formatNumber(totalVol)} ק"ג (${completedSets} סטים)` : 'נפח כולל: 0 ק"ג';

    const weightStr = report.metrics?.morningWeightKg ? `${report.metrics.morningWeightKg} ק"ג` : '-- ק"ג';
    const waterStr = report.metrics?.waterMl ? `${formatNumber(report.metrics.waterMl)} מ"ל` : '0 מ"ל';
    if (byId('reportWeightWaterSummary')) byId('reportWeightWaterSummary').textContent = `${weightStr} · ${waterStr}`;
    if (byId('reportSleepSummary')) byId('reportSleepSummary').textContent = `שינה: ${report.metrics?.sleepHours || '--'} שעות (איכות: ${report.metrics?.sleepQuality || '--'}/10)`;

    // 5. Check-in Form Inputs
    if (byId('checkinWeight')) byId('checkinWeight').value = report.metrics?.morningWeightKg || '';
    if (byId('checkinWater')) byId('checkinWater').value = report.metrics?.waterMl || '';
    if (byId('checkinSleepHours')) byId('checkinSleepHours').value = report.metrics?.sleepHours || '';
    if (byId('checkinSleepQuality')) byId('checkinSleepQuality').value = report.metrics?.sleepQuality || 8;
    if (byId('checkinSleepQualityVal')) byId('checkinSleepQualityVal').textContent = `${report.metrics?.sleepQuality || 8}/10`;
    if (byId('checkinSteps')) byId('checkinSteps').value = report.metrics?.steps || '';
    if (byId('checkinDigestion')) byId('checkinDigestion').value = report.metrics?.digestion || 'good';
    if (byId('checkinNotes')) byId('checkinNotes').value = report.metrics?.traineeNotes || '';

    // Rating pills
    ['energy', 'hunger', 'stress'].forEach(ratingType => {
      const val = report.metrics?.[`${ratingType}Level`] || (ratingType === 'energy' ? 4 : (ratingType === 'hunger' ? 2 : 1));
      const container = byId(`${ratingType}RatingPills`);
      if (container) {
        container.querySelectorAll('.rating-pill').forEach(btn => {
          btn.classList.toggle('active', parseInt(btn.getAttribute('data-val'), 10) === Number(val));
        });
      }
    });

    // 6. Time-stamped Activity Stream
    const timeline = byId('dailyReportTimeline');
    if (timeline) {
      timeline.replaceChildren();
      const items = [];
      (report.nutrition?.meals || []).forEach(m => items.push({ type: 'meal', time: m.time || '12:00', data: m }));
      (report.workouts || []).forEach(w => items.push({ type: 'workout', time: w.time || '18:00', data: w }));
      items.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      if (!items.length) {
        timeline.append(createElement('p', 'empty-state', 'טרם נרשמו ארוחות או אימונים לתאריך זה. כל פריט שיירשם ביומן התזונה או האימונים יופיע כאן מיד עם שעת התיעוד המדויקת.'));
      } else {
        items.forEach(item => {
          const card = createElement('article', 'timeline-card');
          const timeBadge = createElement('span', 'timeline-time-badge', item.time);
          const content = createElement('div', 'timeline-content');

          if (item.type === 'meal') {
            const m = item.data;
            content.append(
              createElement('div', 'timeline-title', `ארוחה: ${m.name}`),
              createElement('div', 'timeline-sub', `${formatNumber(m.amount)} ${m.unitName || 'גרם'} · ${formatNumber(m.calories)} קק"ל · חלבון: ${formatNumber(m.protein)}g · פחמימות: ${formatNumber(m.carbs)}g · שומן: ${formatNumber(m.fat)}g`)
            );
          } else {
            const w = item.data;
            content.append(
              createElement('div', 'timeline-title', `אימון: ${w.name}`),
              createElement('div', 'timeline-sub', `${w.durationMinutes} דקות · ${w.completedSets} סטים · נפח כולל: ${formatNumber(w.totalVolume)} ק"ג · RPE: ${w.difficulty}/10`)
            );
          }
          card.append(timeBadge, content);
          timeline.append(card);
        });
      }
    }
  }

  // ==========================================================================
  // COACH DASHBOARD & HISTORICAL DRILL-DOWN (לוח מאמן והיסטוריה)
  // ==========================================================================

  function setCoachSubpage(page) {
    const content = byId('coachAdminContent');
    if (!content) return;
    state.coachSubpage = page;
    content.querySelectorAll('[data-coach-page]').forEach(element => {
      element.hidden = element.dataset.coachPage !== page;
    });
    byId('coachWorkspaceNav')?.querySelectorAll('[data-coach-subpage]').forEach(button => {
      const active = button.dataset.coachSubpage === page;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function initializeCoachWorkspace() {
    const content = byId('coachAdminContent');
    if (!content) return;
    const markSection = (element, page) => {
      const section = element?.closest('section');
      if (section && content.contains(section)) section.dataset.coachPage = page;
    };
    markSection(byId('coachPendingLinksCard'), 'management');
    markSection(byId('coachDirectoryCard'), 'management');
    markSection(byId('coachPermissionRequestCard'), 'management');
    markSection(byId('coachPermissionRequestForm'), 'management');
    markSection(byId('coachConnectionRequests'), 'management');
    markSection(byId('coachConnectionsList'), 'management');
    markSection(byId('coachTaskForm'), 'activity');
    const profile = byId('coachTraineeProfileBar');
    if (profile) profile.dataset.coachPage = 'activity';
    markSection(byId('coachReportsHistoryRows'), 'activity');
    markSection(byId('coachTraineesGrid'), 'management');
    markSection(byId('coachDataAccessStatus'), 'management');
    const nav = byId('coachWorkspaceNav');
    if (nav && nav.dataset.bound !== 'true') {
      nav.dataset.bound = 'true';
      nav.querySelectorAll('[data-coach-subpage]').forEach(button => {
        button.addEventListener('click', () => setCoachSubpage(button.dataset.coachSubpage));
      });
    }
    setCoachSubpage(state.coachSubpage || 'management');
  }

  function openCoachWorkoutEditor(plan = null) {
    if (!state.selectedTraineeId) {
      const status = byId('coachWeeklyPlanStatus');
      if (status) status.textContent = 'בחרו מתאמן לפני עריכת אימון.';
      return;
    }
    setCoachSubpage('editor');
    createWorkoutModal(plan);
  }

  async function renderCoachPlanPages(trainee, isDemoCoach) {
    initializeCoachWorkspace();
    const workoutList = byId('coachWeeklyWorkoutList');
    const editorList = byId('coachEditorWorkoutList');
    const workoutStatus = byId('coachWeeklyPlanStatus');
    const targetStatus = byId('coachNutritionTargetsStatus');
    const targetForm = byId('coachNutritionTargetsForm');
    [workoutList, editorList].forEach(list => list?.replaceChildren());
    if (!trainee) {
      if (workoutStatus) workoutStatus.textContent = 'בחרו מתאמן מחובר כדי לטעון תוכנית שבועית.';
      if (targetStatus) targetStatus.textContent = 'בחרו מתאמן מחובר כדי לערוך יעדי תזונה.';
      if (targetForm) targetForm.querySelectorAll('input, button').forEach(input => { input.disabled = true; });
      return;
    }

    const calories = byId('coachTargetCalories');
    const protein = byId('coachTargetProtein');
    const carbs = byId('coachTargetCarbs');
    const fats = byId('coachTargetFats');
    let plans = [];
    let canEditNutrition = isDemoCoach;
    let canEditWorkouts = isDemoCoach;
    if (isDemoCoach) {
      const demoTargets = readStorage('fitpulse_demo_nutrition_targets', {})[trainee.id] || trainee;
      if (calories) calories.value = String(demoTargets.targetCalories || 2200);
      if (protein) protein.value = String(demoTargets.targetProtein || 160);
      if (carbs) carbs.value = String(demoTargets.targetCarbs || 250);
      if (fats) fats.value = String(demoTargets.targetFats || 70);
      const demoAssignments = readStorage('fitpulse_demo_assignments', {});
      plans = Array.isArray(demoAssignments[trainee.id]) ? demoAssignments[trainee.id] : [];
      if (targetStatus) targetStatus.textContent = 'יעדים אלה נשמרים בדפדפן המקומי בלבד בתצוגת הדגמה.';
      if (workoutStatus) workoutStatus.textContent = plans.length ? 'תוכנית הדגמה מקומית.' : 'אין אימונים משויכים עדיין.';
    } else if (window.FitPulseFirebase?.isConfigured) {
      try {
        const coachId = getAuthUserId();
        const scope = await window.FitPulseFirebase.getCoachPermissionScope(coachId, trainee.id);
        canEditNutrition = scope?.status === 'active' && scope.categories?.nutrition_logs === true;
        canEditWorkouts = scope?.status === 'active' && scope.categories?.workout_history === true;
        if (canEditNutrition) {
          const goal = await window.FitPulseFirebase.getCoachNutritionGoal(trainee.id);
          if (calories) calories.value = String(goal?.targetCalories ?? '');
          if (protein) protein.value = String(goal?.targetProteinGrams ?? '');
          if (carbs) carbs.value = String(goal?.targetCarbsGrams ?? '');
          if (fats) fats.value = String(goal?.targetFatsGrams ?? '');
          if (targetStatus) targetStatus.textContent = 'היעדים יוצגו ויישמרו רק במסגרת הרשאת התזונה הפעילה.';
        } else if (targetStatus) {
          targetStatus.textContent = 'נדרשת הסכמת המתאמן לקטגוריית יומני תזונה כדי לצפות או לערוך יעדים.';
        }
        if (canEditWorkouts) {
          plans = await window.FitPulseFirebase.getCoachWeeklyPlan(trainee.id);
          if (workoutStatus) workoutStatus.textContent = plans.length ? 'התוכנית השבועית נטענה מהענן.' : 'אין אימונים משויכים עדיין.';
        } else if (workoutStatus) {
          workoutStatus.textContent = 'נדרשת הסכמה לקטגוריית היסטוריית אימונים כדי לנהל תוכנית בענן.';
        }
      } catch (error) {
        console.error('[Coach] Could not load plan or nutrition permissions.', error);
        if (workoutStatus) workoutStatus.textContent = 'לא ניתן לטעון את התוכנית. בדקו חיבור והרשאות.';
        if (targetStatus) targetStatus.textContent = 'לא ניתן לאמת הרשאה ליעדי תזונה; המידע נשאר מוסתר.';
        canEditNutrition = false;
        canEditWorkouts = false;
      }
    } else {
      if (workoutStatus) workoutStatus.textContent = 'חיבור Firestore אינו זמין.';
      if (targetStatus) targetStatus.textContent = 'חיבור Firestore אינו זמין.';
    }
    if (targetForm) targetForm.querySelectorAll('input, button').forEach(input => { input.disabled = !canEditNutrition; });
    const addButtons = [byId('coachAddWorkoutBtn'), byId('coachEditorAddWorkoutBtn')];
    addButtons.forEach(button => { if (button) button.disabled = !canEditWorkouts; });
    const renderCards = list => {
      if (!list) return;
      if (!plans.length) {
        list.append(createElement('p', 'empty-state', 'אין אימונים בתוכנית השבועית.'));
        return;
      }
      plans.forEach(plan => {
        const card = createElement('article', 'coach-card');
        card.append(createElement('strong', '', plan.name || 'אימון שבועי'));
        const weekday = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][Number(plan.scheduledDay)] || '';
        card.append(createElement('p', '', `${weekday ? `${weekday} · ` : ''}${plan.exercises?.length || 0} תרגילים`));
        const edit = createElement('button', 'btn-action-secondary', 'עריכת אימון');
        edit.type = 'button';
        edit.addEventListener('click', () => openCoachWorkoutEditor(plan));
        card.append(edit);
        list.append(card);
      });
    };
    renderCards(workoutList);
    renderCards(editorList);
  }

  async function renderCoachTaskHistory(trainee, isDemoCoach) {
    const list = byId('coachTaskHistoryList');
    if (!list) return;
    list.replaceChildren();
    if (!trainee) {
      list.append(createElement('p', 'empty-state', 'בחרו מתאמן כדי לראות את המשימות.'));
      return;
    }
    if (isDemoCoach || !window.FitPulseFirebase?.isConfigured) {
      list.append(createElement('p', 'empty-state', 'סטטוס משימות זמין למערכות המחוברות ל-Firestore.'));
      return;
    }
    try {
      const tasks = await window.FitPulseFirebase.getCoachTasks(trainee.id);
      if (!tasks.length) {
        list.append(createElement('p', 'empty-state', 'לא נשלחו משימות למתאמן זה.'));
        return;
      }
      tasks.sort((left, right) => Number(right.createdAt?.toMillis?.() || 0) - Number(left.createdAt?.toMillis?.() || 0));
      tasks.forEach(task => {
        const row = createElement('div', 'coach-pending-row');
        const status = task.status === 'completed' ? 'הושלמה' : 'ממתינה';
        row.append(createElement('strong', '', task.title || 'משימת מאמן'),
          createElement('span', '', `${task.type} · ${status}`));
        list.append(row);
      });
    } catch (error) {
      console.error('[Coach] Could not load task status.', error);
      list.append(createElement('p', 'empty-state', 'לא ניתן לטעון את סטטוס המשימות; בדקו קשר פעיל והרשאות.'));
    }
  }

  async function renderCoach() {
    const isTrainer = isTrainerRole();
    if (byId('coachAccessNotice')) byId('coachAccessNotice').hidden = isTrainer;
    if (byId('coachAdminContent')) byId('coachAdminContent').hidden = !isTrainer;
    if (byId('demoRoleToggleBtn')) byId('demoRoleToggleBtn').textContent = isTrainer
      ? 'מעבר למתאמן (הדגמה)'
      : 'הצגת מצב מאמן (הדגמה)';
    if (byId('navTabEquivalents')) byId('navTabEquivalents').hidden = !isTrainer;
    if (byId('manageEquivalentExercisesBtn')) byId('manageEquivalentExercisesBtn').hidden = !isTrainer;
    if (!isTrainer) return;

    const firebaseUid = window.FitPulseFirebase?.currentUid?.();
    const isDemoCoach = !firebaseUid && (!state.currentUser ||
      (state.currentUser.id && state.currentUser.id.startsWith('usr_')) ||
      (state.currentUser.email && (state.currentUser.email === 'coach@fitpulse.com' || state.currentUser.email === 'manager@fitpulse.com')));
    let trainees = FIT_DATA.coachTrainees || [];
    try {
      const cRes = await fetch(`/api/coach/trainees?coachId=${encodeURIComponent(state.currentUser?.id || 'usr_coach_real')}`);
      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData.success && Array.isArray(cData.activeTrainees) && cData.activeTrainees.length) {
          trainees = cData.activeTrainees;
        }
      }
    } catch (e) {}

    if (isDemoCoach) {
      try {
        const res = await fetch('/api/trainees');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.trainees)) {
            if (!trainees.length) trainees = data.trainees;
            FIT_DATA.coachTrainees = trainees;
          }
        }
      } catch (err) {
        console.warn('[Coach] Could not fetch demo trainees:', err);
      }
    } else if (window.FitPulseFirebase?.isConfigured) {
      try {
        const connections = await window.FitPulseFirebase.getActiveCoachConnections();
        trainees = connections.map(connection => ({
          id: connection.id,
          name: connection.name,
          avatar: connection.name.slice(0, 2),
          targetCalories: null,
          targetProtein: null,
          weight: null,
          targetSleepHours: null,
          hasWorkedOutToday: false
        }));
      } catch (error) {
        trainees = [];
        console.error('[Coach] Could not load authorized trainee roster:', error);
      }
    } else {
      trainees = [];
    }

    const searchInput = byId('coachTraineeSearch');
    const query = (searchInput?.value || '').trim().toLocaleLowerCase();
    const activityFilter = byId('coachTraineeFilter');
    if (activityFilter) activityFilter.value = state.coachActivityFilter;

    const filteredTrainees = trainees.filter(trainee => {
      const matchesQuery = trainee.name.toLocaleLowerCase().includes(query);
      const matchesActivity = state.coachActivityFilter === 'all' ||
        (state.coachActivityFilter === 'active' ? trainee.hasWorkedOutToday : !trainee.hasWorkedOutToday);
      return matchesQuery && matchesActivity;
    });

    // 2. Trainee Selector Dropdown
    const select = byId('coachTraineeSelect');
    if (select) {
      const current = state.selectedTraineeId || trainees[0]?.id;
      select.replaceChildren();
      trainees.forEach(trainee => {
        const option = document.createElement('option');
        option.value = trainee.id;
        option.textContent = trainee.name;
        select.append(option);
      });
      if (trainees.some(t => t.id === current)) {
        select.value = current;
        state.selectedTraineeId = current;
      } else if (trainees[0]) {
        state.selectedTraineeId = trainees[0].id;
        select.value = trainees[0].id;
      } else {
        state.selectedTraineeId = null;
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'אין מתאמנים מחוברים';
        select.append(option);
      }
    }

    const currentTrainee = trainees.find(t => t.id === state.selectedTraineeId) || trainees[0];
    await renderCoachPlanPages(currentTrainee, isDemoCoach);
    await renderCoachTaskHistory(currentTrainee, isDemoCoach);

    // 3. Trainee Quick Profile Bar
    const profileBar = byId('coachTraineeProfileBar');
    if (profileBar && currentTrainee) {
      profileBar.replaceChildren();
      if (!isDemoCoach) {
        profileBar.append(
          createElement('strong', '', currentTrainee.name),
          createElement('span', 'coach-link-status', 'פרטי מתאמן ומדדים יוצגו רק לאחר הסכמה לקטגוריית המידע המתאימה.')
        );
      } else {
        const meta = createElement('div', 'coach-trainee-meta');
        const avatar = createElement('div', 'coach-trainee-avatar', currentTrainee.avatar || currentTrainee.name.slice(0, 2));
        const info = createElement('div', 'coach-trainee-info');
        const ageGenderText = currentTrainee.age
          ? ` (${currentTrainee.age}${currentTrainee.gender ? ` · ${currentTrainee.gender === 'male' ? 'גבר' : 'אישה'}` : ''})`
          : '';
        info.append(
          createElement('strong', '', `${currentTrainee.name}${ageGenderText}`),
          createElement('span', '', `תוכנית משויכת: ${currentTrainee.assignedRoutine || 'בניית תוכנית חדשה'} · גובה: ${currentTrainee.height || 175} ס"מ`)
        );
        meta.append(avatar, info);

        const stats = createElement('div', 'coach-trainee-stats');
        [
          ['משקל עדכני', `${currentTrainee.weight || 75} ק"ג`],
          ['יעד קלוריות', `${formatNumber(currentTrainee.targetCalories || 2200)} קק"ל`],
          ['יעד חלבון', `${formatNumber(currentTrainee.targetProtein || 160)}g`],
          ['יעד מים', `${formatNumber(currentTrainee.targetWaterMl || 3000)} מ"ל`]
        ].forEach(([label, val]) => {
          const box = createElement('div', 'coach-stat-box');
          box.append(createElement('span', 'stat-label', label), createElement('strong', 'stat-val', val));
          stats.append(box);
        });

        profileBar.append(meta, stats);
      }
    }

    // 4. Fetch & Render Historical Reports for Selected Trainee (Default 14 Days)
    const rangeSelect = byId('coachRangeFilter');
    const rangeDays = rangeSelect?.value === 'all' ? 9999 : (parseInt(rangeSelect?.value, 10) || 14);

    let reports = [];
    let canViewReports = isDemoCoach;
    let currentScope = null;
    try {
      if (isDemoCoach) {
        const res = await fetch(`/api/reports?traineeId=${state.selectedTraineeId}&days=${rangeDays}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.reports)) reports = data.reports;
        }
      } else if (state.selectedTraineeId && window.FitPulseFirebase?.isConfigured) {
        currentScope = await window.FitPulseFirebase.getCoachPermissionScope(
          getAuthUserId(),
          state.selectedTraineeId
        );
        canViewReports = currentScope?.status === 'active' && currentScope.categories?.daily_reports === true;
      }
    } catch (err) {
      console.error('[Coach] Could not verify daily-report permission:', err);
    }

    if (isDemoCoach && !reports.length) {
      // Local fallback
      reports = Object.values(state.dailyReports)
        .filter(r => r.traineeId === state.selectedTraineeId)
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    if (canViewReports) {
      const emptyState = byId('coachReportsEmptyState');
      if (emptyState) emptyState.textContent = 'לא נמצאו דוחות יומיים עבור טווח זה.';
      renderCoachReportsTable(reports, currentTrainee);
    } else {
      if (typeof state.activeReportsUnsub === 'function') {
        state.activeReportsUnsub();
        state.activeReportsUnsub = null;
      }
      state.coachHistoricalReports = [];
      renderCoachReportsTable([], currentTrainee);
      const emptyState = byId('coachReportsEmptyState');
      if (emptyState) emptyState.textContent = 'המתאמן טרם העניק הרשאה לצפייה בדוחות היומיים.';
      if (byId('coachReportDetailModal')) byId('coachReportDetailModal').hidden = true;
    }

    if (!isDemoCoach && state.selectedTraineeId && window.FitPulseFirebase?.isConfigured) {
      const coachId = getAuthUserId();
      const traineeId = state.selectedTraineeId;
      const subscriptionKey = `${coachId}_${traineeId}`;
      if (state.coachAccessSubscriptionKey !== subscriptionKey) {
        stopCoachDataSubscriptions();
        state.coachAccessSubscriptionKey = subscriptionKey;
        state.coachDailyReportAccess = canViewReports;
        state.activeCoachAccessUnsub = window.FitPulseFirebase.subscribeToCoachAccess(
          coachId,
          traineeId,
          access => {
            if (state.coachAccessSubscriptionKey !== subscriptionKey) return;
            const allowed = access.active &&
              access.scope?.status === 'active' &&
              access.request?.status === 'accepted' &&
              access.scope.categories?.daily_reports === true;
            if (allowed === state.coachDailyReportAccess) return;
            state.coachDailyReportAccess = allowed;
            if (allowed) {
              renderCoach();
            } else {
              if (typeof state.activeReportsUnsub === 'function') state.activeReportsUnsub();
              state.activeReportsUnsub = null;
              state.coachHistoricalReports = [];
              renderCoachReportsTable([], currentTrainee);
              const emptyState = byId('coachReportsEmptyState');
              if (emptyState) emptyState.textContent = 'ההרשאה לצפייה בדוחות אינה פעילה.';
              if (byId('coachReportDetailModal')) byId('coachReportDetailModal').hidden = true;
            }
          },
          error => {
            console.error('[Coach] Could not monitor trainee permission changes:', error);
            if (state.coachAccessSubscriptionKey !== subscriptionKey) return;
            state.coachDailyReportAccess = false;
            if (typeof state.activeReportsUnsub === 'function') state.activeReportsUnsub();
            state.activeReportsUnsub = null;
            state.coachHistoricalReports = [];
            renderCoachReportsTable([], currentTrainee);
            const emptyState = byId('coachReportsEmptyState');
            if (emptyState) emptyState.textContent = 'לא ניתן לאמת הרשאות גישה לדוחות.';
            if (byId('coachReportDetailModal')) byId('coachReportDetailModal').hidden = true;
          }
        );
      } else {
        state.coachDailyReportAccess = canViewReports;
      }
    } else {
      stopCoachDataSubscriptions();
    }

    // Live real-time Firestore sync
    if (!isDemoCoach && window.FitPulseFirebase?.isConfigured && canViewReports && state.selectedTraineeId) {
      if (typeof state.activeReportsUnsub === 'function') {
        state.activeReportsUnsub();
        state.activeReportsUnsub = null;
      }
      state.activeReportsUnsub = window.FitPulseFirebase.subscribeToTraineeReports(state.selectedTraineeId, rangeDays, (cloudReports) => {
        renderCoachReportsTable(cloudReports || [], currentTrainee);
      }, error => {
        console.error('[Coach] Trainee report query was denied or failed:', error);
        state.coachDailyReportAccess = false;
        state.coachHistoricalReports = [];
        renderCoachReportsTable([], currentTrainee);
        const emptyState = byId('coachReportsEmptyState');
        if (emptyState) emptyState.textContent = 'לא ניתן לטעון דוחות ללא הרשאה פעילה.';
        if (byId('coachReportDetailModal')) byId('coachReportDetailModal').hidden = true;
      });
    } else if (typeof state.activeReportsUnsub === 'function') {
      state.activeReportsUnsub();
      state.activeReportsUnsub = null;
    }

    // 5. Render General Trainee Grid
    const grid = byId('coachTraineesGrid');
    if (grid) {
      grid.replaceChildren();
      if (!filteredTrainees.length) {
        const emptyDiv = createElement('div', 'empty-pending-banner', 'אין עדיין מתאמנים משויכים לחשבונך. תוכל להוסיף מתאמן חדש בלחיצה על "הוספת מתאמן חדש" למעלה.');
        emptyDiv.style.gridColumn = '1 / -1';
        emptyDiv.style.padding = '24px 20px';
        grid.append(emptyDiv);
      } else {
        filteredTrainees.forEach(trainee => {
          const card = createElement('article', 'coach-card');
        const header = createElement('div', 'coach-card-header');
        header.append(createElement('span', 'coach-avatar', trainee.avatar || trainee.name.slice(0, 2)), createElement('div', '', trainee.name));
        card.append(header);

        const metrics = createElement('div', 'coach-metrics');
        [
          [`${formatNumber(trainee.targetCalories)} kcal`, 'יעד קלוריות'],
          [`${formatNumber(trainee.targetProtein)}g`, 'יעד חלבון'],
          [`${formatNumber(trainee.weight)} ק"ג`, 'משקל'],
          [`${trainee.targetSleepHours || 8} שעות`, 'יעד שינה']
        ].forEach(([value, label]) => {
          const metric = createElement('div', 'coach-metric');
          metric.append(createElement('strong', '', value), createElement('span', '', label));
          metrics.append(metric);
        });
        card.append(metrics);

        const selectBtn = createElement('button', 'btn-action-primary', 'מעבר לתיק מתאמן');
        selectBtn.style.marginTop = '12px';
        selectBtn.type = 'button';
        selectBtn.addEventListener('click', () => {
          state.selectedTraineeId = trainee.id;
          if (select) select.value = trainee.id;
          renderCoach();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        card.append(selectBtn);

        const terminateBtn = createElement('button', 'btn-action-ghost', '❌ סיום הקשר');
        terminateBtn.style.marginTop = '6px';
        terminateBtn.style.color = 'var(--danger, #ef4444)';
        terminateBtn.style.fontSize = '0.78rem';
        terminateBtn.type = 'button';
        terminateBtn.addEventListener('click', async () => {
          if (!confirm(`האם אתה בטוח שברצונך לסיים את הקשר עם המתאמן ${trainee.name}?`)) return;
          terminateBtn.disabled = true;
          try {
            if (window.FitPulseFirebase?.terminateTrainership) {
              await window.FitPulseFirebase.terminateTrainership(trainee.id, state.currentUser?.id, 'coach');
            }
            alert(`קשר האימון עם ${trainee.name} הסתיים בהצלחה.`);
            renderCoach();
          } catch (e) {
            alert(`שגיאה בסיום הקשר: ${e.message}`);
            terminateBtn.disabled = false;
          }
        });
        card.append(terminateBtn);

        grid.append(card);
      });
      }
    }
  }

  function renderCoachReportsTable(reports, currentTrainee) {
    state.coachHistoricalReports = reports;
    const tbody = byId('coachReportsHistoryRows');
    const emptyState = byId('coachReportsEmptyState');
    if (!tbody) return;
    tbody.replaceChildren();

    if (!reports || !reports.length) {
      if (emptyState) emptyState.hidden = false;
      return;
    }
    if (emptyState) emptyState.hidden = true;

    reports.forEach(report => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';

      // Date & Day
      const d = new Date(report.date + 'T00:00:00');
      const dayNamesShort = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
      const dateCell = createElement('td', '', '');
      dateCell.innerHTML = `<strong>${report.date}</strong> <span style="color:var(--text-muted); font-size:0.75rem;">(יום ${dayNamesShort[d.getDay()]})</span>`;

      // Status
      const statusCell = createElement('td', '', '');
      const statusClass = report.status === 'finalized' ? 'status-finalized' : (report.status === 'auto_closed' ? 'status-auto_closed' : 'status-draft');
      const statusText = report.status === 'finalized' ? 'נחתם ✓' : (report.status === 'auto_closed' ? 'סגור אוטומטית' : 'טיוטה');
      statusCell.innerHTML = `<span class="status-pill ${statusClass}">${statusText}</span>`;

      // Submission Time
      const subTime = report.finalizedAt ? new Date(report.finalizedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—';
      const timeCell = createElement('td', '', subTime);
      timeCell.style.fontFamily = 'monospace';

      // Calories
      const calsConsumed = report.nutrition?.totalCalories || 0;
      const calsTarget = report.nutrition?.targetCalories || currentTrainee?.targetCalories || 2400;
      const calDiff = calsConsumed - calsTarget;
      const calColor = Math.abs(calDiff) <= 150 ? '#22c55e' : (calDiff > 150 ? '#ef4444' : '#f59e0b');
      const calCell = createElement('td', '', '');
      calCell.innerHTML = `<strong style="color:${calColor};">${formatNumber(calsConsumed)}</strong> / ${formatNumber(calsTarget)} kcal`;

      // Protein
      const prot = report.nutrition?.totalProtein || 0;
      const protTarget = report.nutrition?.targetProtein || currentTrainee?.targetProtein || 175;
      const protColor = prot >= protTarget - 10 ? '#22c55e' : '#f59e0b';
      const protCell = createElement('td', '', '');
      protCell.innerHTML = `<strong style="color:${protColor};">${formatNumber(prot)}g</strong>`;

      // Workout
      const workouts = report.workouts || [];
      const woCell = createElement('td', '', '');
      if (workouts.length) {
        const wo = workouts[0];
        const dur = wo.durationMinutes || 45;
        const vol = wo.totalVolume ? ` · ${formatNumber(wo.totalVolume)} ק"ג` : '';
        woCell.innerHTML = `<strong>${wo.planName || wo.name || 'אימון'}</strong> <span style="color:var(--text-muted); font-size:0.72rem;">(${dur} דק׳${vol})</span>`;
      } else {
        woCell.innerHTML = '<span style="color:var(--text-muted);">מנוחה</span>';
      }

      // Water
      const water = report.checkIn?.waterLiters ? `${report.checkIn.waterLiters}L` : (report.metrics?.waterMl ? `${formatNumber(report.metrics.waterMl)} מ"ל` : '—');
      const waterCell = createElement('td', '', water);

      // Sleep
      const sleep = report.checkIn?.sleepHours || report.metrics?.sleepHours || '—';
      const sleepCell = createElement('td', '', `${sleep} שעות`);

      // Weight
      const weight = report.checkIn?.morningWeight ? `${report.checkIn.morningWeight} ק"ג` : (report.metrics?.morningWeightKg ? `${report.metrics.morningWeightKg} ק"ג` : '—');
      const weightCell = createElement('td', '', weight);

      // Energy / Stress
      const energy = report.checkIn?.energyLevel || report.metrics?.energyLevel || '—';
      const stress = report.checkIn?.stressLevel || report.metrics?.stressLevel || '—';
      const ratingsCell = createElement('td', '', `אנרגיה: ${energy}/5 · סטרס: ${stress}/5`);
      ratingsCell.style.fontSize = '0.72rem';
      ratingsCell.style.color = 'var(--text-muted)';

      // Action: Deep Dive Button
      const actionCell = createElement('td', '', '');
      const drillBtn = createElement('button', 'btn-drilldown', 'צפייה מעמיקה');
      drillBtn.type = 'button';
      drillBtn.addEventListener('click', event => {
        event.stopPropagation();
        openCoachDrilldownModal(report);
      });
      actionCell.append(drillBtn);

      tr.append(dateCell, statusCell, timeCell, calCell, protCell, woCell, waterCell, sleepCell, weightCell, ratingsCell, actionCell);
      tr.addEventListener('click', () => openCoachDrilldownModal(report));
      tbody.append(tr);
    });
  }

  // ==========================================================================
  // COACH DRILL-DOWN MODAL (צפייה מעמיקה בדוח יומי)
  // ==========================================================================

  function openCoachDrilldownModal(report) {
    const modal = byId('coachReportDetailModal');
    const content = byId('drilldownModalContent');
    const title = byId('drilldownTitle');
    const badge = byId('drilldownTraineeBadge');
    if (!modal || !content) return;

    document.body.appendChild(modal);

    const trainee = (FIT_DATA.coachTrainees || []).find(t => t.id === report.traineeId) || { name: 'מתאמן' };
    if (badge) badge.textContent = `דוח יומי מעמיק · ${trainee.name}`;
    if (title) title.textContent = `פירוט דוח יומי - ${report.date}`;

    content.replaceChildren();
    const wrapper = createElement('div', 'drilldown-scroll-content');

    // Header info pill
    const headerBanner = createElement('div', '', '');
    headerBanner.style.display = 'flex';
    headerBanner.style.alignItems = 'center';
    headerBanner.style.justifyContent = 'space-between';
    headerBanner.style.flexWrap = 'wrap';
    headerBanner.style.gap = '10px';
    headerBanner.style.padding = '10px 14px';
    headerBanner.style.background = 'rgba(255, 255, 255, 0.02)';
    headerBanner.style.borderRadius = '10px';
    headerBanner.style.border = '1px solid var(--border)';

    const statusPillClass = report.status === 'finalized' ? 'status-finalized' : (report.status === 'auto_closed' ? 'status-auto_closed' : 'status-draft');
    const statusPillText = report.status === 'finalized' ? 'נחתם ונשלח למאמן ✓' : (report.status === 'auto_closed' ? 'נסגר אוטומטית (סוף יום)' : 'טיוטה פעילה');
    const finTime = report.finalizedAt ? new Date(report.finalizedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

    headerBanner.innerHTML = `
      <span class="status-pill ${statusPillClass}">${statusPillText}</span>
      <span style="font-size:0.75rem; color:var(--text-muted);">שעת נעילה/הגשה: ${finTime || 'טרם ננעל'} · עדכון אחרון: ${new Date(report.updatedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>
    `;
    wrapper.append(headerBanner);

    // --- SECTION 1: LIFESTYLE & METRICS ---
    const sec1 = createElement('section', 'drilldown-section');
    sec1.append(createElement('div', 'drilldown-section-title', 'מדדי בוקר וסגנון חיים'));
    const grid1 = createElement('div', 'drilldown-metrics-grid');

    const m = report.metrics || {};
    const metricItems = [
      ['משקל בוקר', m.morningWeightKg ? `${m.morningWeightKg} ק"ג` : 'לא דווח'],
      ['שתיית מים', m.waterMl ? `${formatNumber(m.waterMl)} מ"ל` : 'לא דווח'],
      ['שעות שינה', m.sleepHours ? `${m.sleepHours} שעות` : 'לא דווח'],
      ['איכות שינה', m.sleepQuality ? `${m.sleepQuality}/10` : 'לא דווח'],
      ['צעדים / פעילות', m.steps ? `${formatNumber(m.steps)}` : 'לא דווח'],
      ['רמת אנרגיה', m.energyLevel ? `${m.energyLevel}/5` : 'לא דווח'],
      ['רמת רעב', m.hungerLevel ? `${m.hungerLevel}/5` : 'לא דווח'],
      ['רמת סטרס', m.stressLevel ? `${m.stressLevel}/5` : 'לא דווח'],
      ['מערכת עיכול', m.digestion === 'good' ? 'תקין (ללא נפיחות)' : (m.digestion === 'bloated' ? 'נפיחות קלה' : 'רגיל')]
    ];
    metricItems.forEach(([label, val]) => {
      const box = createElement('div', 'drilldown-metric-box');
      box.append(createElement('span', 'box-label', label), createElement('strong', 'box-val', val));
      grid1.append(box);
    });
    sec1.append(grid1);

    if (m.traineeNotes) {
      const notesBox = createElement('div', 'drilldown-trainee-notes', `הערות אישיות מהמתאמן: "${m.traineeNotes}"`);
      notesBox.style.marginTop = '12px';
      sec1.append(notesBox);
    }
    wrapper.append(sec1);

    // --- SECTION 2: DETAILED NUTRITION & EXACT TIMESTAMPS ---
    const sec2 = createElement('section', 'drilldown-section');
    const nutrHeader = createElement('div', 'drilldown-section-title');
    nutrHeader.append(
      createElement('span', '', 'פירוט תזונה מלא · חותמות שעה מדויקות'),
      createElement('span', 'card-caption', `${formatNumber(report.nutrition?.totalCalories || 0)} / ${formatNumber(report.nutrition?.targetCalories || 2400)} קק"ל · חלבון: ${formatNumber(report.nutrition?.totalProtein || 0)}g`)
    );
    sec2.append(nutrHeader);

    const mealsList = createElement('div', 'drilldown-items-list');
    const meals = report.nutrition?.meals || [];
    if (!meals.length) {
      mealsList.append(createElement('p', 'empty-state', 'אין תיעוד ארוחות ליום זה.'));
    } else {
      meals.forEach(meal => {
        const card = createElement('div', 'drilldown-item-card');
        const timeBadge = createElement('span', 'timeline-time-badge', meal.time || '12:00');
        const info = createElement('div', 'timeline-content');
        info.append(
          createElement('div', 'timeline-title', meal.name),
          createElement('div', 'timeline-sub', `${formatNumber(meal.amount)} ${meal.unitName || 'גרם'} · ${formatNumber(meal.calories)} קק"ל · חלבון: ${formatNumber(meal.protein)}g · פחמימות: ${formatNumber(meal.carbs)}g · שומן: ${formatNumber(meal.fat)}g`)
        );
        card.append(timeBadge, info);
        mealsList.append(card);
      });
    }
    sec2.append(mealsList);
    wrapper.append(sec2);

    // --- SECTION 3: DETAILED WORKOUTS & EXACT TIMESTAMPS ---
    const sec3 = createElement('section', 'drilldown-section');
    sec3.append(createElement('div', 'drilldown-section-title', 'פירוט אימונים וסטים · ביצועים מדויקים'));
    const workoutsList = createElement('div', 'drilldown-items-list');
    const workouts = report.workouts || [];

    if (!workouts.length) {
      workoutsList.append(createElement('p', 'empty-state', 'יום מנוחה / לא בוצע אימון בתאריך זה.'));
    } else {
      workouts.forEach(wo => {
        const woCard = createElement('div', 'drilldown-item-card');
        woCard.style.flexDirection = 'column';
        const topRow = createElement('div', '', '');
        topRow.style.display = 'flex';
        topRow.style.alignItems = 'center';
        topRow.style.gap = '10px';
        topRow.style.width = '100%';
        const timeBadge = createElement('span', 'timeline-time-badge', wo.time || '18:15');
        const woTitle = createElement('strong', 'timeline-title', `${wo.name} (${wo.durationMinutes} דקות · נפח: ${formatNumber(wo.totalVolume)} ק"ג · RPE ${wo.difficulty}/10)`);
        topRow.append(timeBadge, woTitle);
        woCard.append(topRow);

        if (wo.notes) {
          const woNote = createElement('p', 'timeline-sub', `הערות אימון: ${wo.notes}`);
          woNote.style.margin = '6px 0';
          woCard.append(woNote);
        }

        if (Array.isArray(wo.exercises) && wo.exercises.length) {
          const table = createElement('table', 'drilldown-exercise-table');
          table.innerHTML = '<thead><tr><th>תרגיל</th><th>סט</th><th>משקל</th><th>חזרות</th><th>שעה</th><th>סטטוס</th></tr></thead>';
          const tbodyEl = document.createElement('tbody');
          wo.exercises.forEach(ex => {
            (ex.sets || []).forEach(set => {
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td><strong>${ex.name}</strong></td>
                <td>${set.setNumber}</td>
                <td>${set.weight} ק"ג</td>
                <td>${set.reps}</td>
                <td><span style="font-family:monospace; color:#a78bfa;">${set.time || wo.time || '--'}</span></td>
                <td><span style="color:#22c55e; font-weight:bold;">${set.completed ? '✓ הושלם' : '—'}</span></td>
              `;
              tbodyEl.append(tr);
            });
          });
          table.append(tbodyEl);
          woCard.append(table);
        }
        workoutsList.append(woCard);
      });
    }
    sec3.append(workoutsList);
    wrapper.append(sec3);

    // --- SECTION 4: COACH FEEDBACK & INSTRUCTIONS ---
    const sec4 = createElement('section', 'drilldown-section');
    sec4.append(createElement('div', 'drilldown-section-title', 'משוב והנחיות המאמן'));
    const feedbackForm = createElement('form', 'drilldown-feedback-form');
    feedbackForm.addEventListener('submit', async event => {
      event.preventDefault();
      const notesInput = feedbackForm.querySelector('textarea');
      const notes = notesInput?.value.trim() || '';
      // 1. Sync to Firebase Cloud Firestore if configured
      if (window.FitPulseFirebase?.isConfigured) {
        await window.FitPulseFirebase.saveCoachFeedback(report.id || `${report.traineeId}_${report.date}`, {
          notes,
          coachRating: 5
        });
      }

      // 2. Sync to local REST API
      try {
        const res = await fetch('/api/reports/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            traineeId: report.traineeId,
            date: report.date,
            notes,
            coachRating: 5
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.report) report.coachFeedback = data.report.coachFeedback;
        }
        alert('משוב המאמן נשמר ונשלח בהצלחה למתאמן!');
      } catch (err) {
        console.warn('[CoachFeedback] Server save error:', err);
        alert('משוב המאמן נשמר מקומית.');
      }
    });

    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.placeholder = 'הקלידו כאן הנחיות, דגשים לטכניקה או חיזוקים למתאמן עבור יום זה...';
    textarea.value = report.coachFeedback?.notes || '';

    const actions = createElement('div', 'drilldown-feedback-actions');
    const saveBtn = createElement('button', 'btn-action-primary', 'שמירת משוב מאמן');
    saveBtn.type = 'submit';
    actions.append(createElement('span', 'timeline-sub', report.coachFeedback?.reviewed ? `נבדק ונשלח ב-${new Date(report.coachFeedback.reviewedAt).toLocaleDateString('he-IL')}` : 'טרם נשלח משוב ליום זה'), saveBtn);

    feedbackForm.append(textarea, actions);
    sec4.append(feedbackForm);
    wrapper.append(sec4);

    content.append(wrapper);
    modal.hidden = false;
  }

  function renderAll() {
    updateHeaderUserChip();
    renderDashboard();
    renderTraineeCoachLinkCard();
    renderNutrition();
    renderWorkoutsTab();
    renderDailyReportTab();
    if (isCoachModeActive()) {
      renderCoach();
      renderCoachPendingLinks();
    } else {
      stopCoachDataSubscriptions();
    }
    if (isManagerRole()) renderAppManager();
    renderProgress();
  }

  function stopCoachDataSubscriptions() {
    if (typeof state.activeReportsUnsub === 'function') state.activeReportsUnsub();
    if (typeof state.activeCoachAccessUnsub === 'function') state.activeCoachAccessUnsub();
    state.activeReportsUnsub = null;
    state.activeCoachAccessUnsub = null;
    state.coachAccessSubscriptionKey = '';
    state.coachDailyReportAccess = false;
  }

  function trainershipStatusLabel(status) {
    if (status === 'active') return 'מחובר';
    if (status === 'pending') return 'ממתין לאישור';
    if (status === 'rejected') return 'נדחה';
    if (status === 'terminated') return 'הופסק';
    return status || '';
  }

  async function renderTraineeCoachLinkCard() {
    const card = byId('traineeCoachLinkCard');
    if (!card) return;
    const isTrainee = isTraineeModeActive();
    card.hidden = !isTrainee || !state.currentUser;
    if (card.hidden) return;

    const statusEl = byId('traineeCoachLinkStatus');
    const noCoachBox = byId('traineeNoCoachBox');
    const form = byId('traineeCoachLinkForm');
    const btnOpen = byId('btnOpenAssignCoach');
    const pendingBox = byId('traineePendingCoachBox');
    const pendingDesc = byId('traineePendingCoachDesc');
    const activeBox = byId('traineeCoachActiveBox');
    const select = byId('traineeCoachSelect');
    const headerBadge = byId('traineeCoachHeaderBadge');

    const uid = getAuthUserId() || state.currentUser?.id;

    // Reset visibility of boxes
    if (noCoachBox) noCoachBox.hidden = true;
    if (pendingBox) pendingBox.hidden = true;
    if (activeBox) activeBox.hidden = true;
    if (form) form.hidden = true;

    try {
      // 1. Fetch trainership status from backend API
      let trainershipData = null;
      try {
        const res = await fetch(`/api/coach/status?traineeId=${encodeURIComponent(uid)}`);
        if (res.ok) {
          trainershipData = await res.json();
        }
      } catch (e) {}

      // 2. Fetch public coaches list (strictly excludes managers and require isPublicVisible == true)
      const availableCoaches = (await window.FitPulseFirebase?.listCoaches?.() || []).filter(coach =>
        coach.id !== uid &&
        coach.role !== 'manager' &&
        coach.id !== 'usr_mgr' &&
        coach.email !== 'manager@fitpulse.com' &&
        coach.isPublicVisible === true
      );

      // Populate coach dropdown
      if (select) {
        select.replaceChildren();
        if (availableCoaches.length) {
          availableCoaches.forEach(coach => {
            const opt = document.createElement('option');
            opt.value = coach.id;
            opt.textContent = `${coach.name} (${coach.email || 'מאמן מוסמך'})`;
            select.append(opt);
          });
        } else {
          const opt = document.createElement('option');
          opt.value = '';
          opt.textContent = 'אין כרגע מאמנים שחשופים לקבלת מתאמנים חדשים';
          select.append(opt);
        }
      }

      // Check STATE 3: Active Coach Connected
      if (trainershipData?.hasCoach && trainershipData.coach) {
        const coach = trainershipData.coach;
        if (statusEl) statusEl.textContent = 'מחובר למאמן אישי.';
        if (headerBadge) {
          headerBadge.hidden = false;
          headerBadge.textContent = 'מאמן פעיל';
        }
        if (activeBox) {
          activeBox.hidden = false;
          if (byId('activeCoachName')) byId('activeCoachName').textContent = coach.name || 'מאמן אישי';
          if (byId('activeCoachEmail')) byId('activeCoachEmail').textContent = coach.email || '';
          const avatarEl = byId('activeCoachAvatar');
          if (avatarEl) avatarEl.textContent = coach.name ? coach.name.slice(0, 2) : '👑';

          const btnTerminate = byId('btnTerminateCoachRelationship');
          if (btnTerminate) {
            btnTerminate.onclick = async () => {
              if (!confirm(`האם אתה בטוח שברצונך לסיים את הקשר עם המאמן ${coach.name}?`)) return;
              btnTerminate.disabled = true;
              try {
                if (window.FitPulseFirebase?.terminateTrainership) {
                  await window.FitPulseFirebase.terminateTrainership(uid, coach.id, 'trainee');
                }
                alert(`הקשר עם המאמן ${coach.name} הסתיים.`);
                await renderTraineeCoachLinkCard();
              } catch (err) {
                alert(`שגיאה בסיום הקשר: ${err.message}`);
                btnTerminate.disabled = false;
              }
            };
          }
        }
        return;
      }

      if (headerBadge) headerBadge.hidden = true;

      // Check STATE 2: Pending request awaiting coach approval
      if (trainershipData?.status === 'pending' && trainershipData.pendingRequest) {
        const req = trainershipData.pendingRequest;
        if (statusEl) statusEl.textContent = 'בקשת החיבור שלך ממתינה לתשובת המאמן.';
        if (pendingBox) {
          pendingBox.hidden = false;
          if (pendingDesc) {
            const dateStr = req.createdAt ? new Date(req.createdAt).toLocaleDateString('he-IL') : '';
            pendingDesc.textContent = `נשלחה בקשת חיבור אל ${req.coachName || 'המאמן'} ${dateStr ? `(${dateStr})` : ''}, וממתינה לאישורו.`;
          }
          const btnCancel = byId('btnCancelPendingCoachRequest');
          if (btnCancel) {
            btnCancel.onclick = async () => {
              if (!confirm('האם לבטל את בקשת החיבור שנשלחה למאמן?')) return;
              btnCancel.disabled = true;
              try {
                if (window.FitPulseFirebase?.cancelCoachConnectionRequest) {
                  await window.FitPulseFirebase.cancelCoachConnectionRequest(uid);
                }
                await renderTraineeCoachLinkCard();
              } catch (err) {
                alert(`שגיאה בביטול הבקשה: ${err.message}`);
                btnCancel.disabled = false;
              }
            };
          }
        }
        return;
      }

      // Check STATE 1: No Coach -> Show "קבע מאמן אישי"
      if (statusEl) statusEl.textContent = 'עדיין לא הוגדר מאמן אישי לחשבון זה.';
      if (noCoachBox) {
        noCoachBox.hidden = false;
        if (btnOpen) {
          btnOpen.hidden = false;
          btnOpen.onclick = () => {
            btnOpen.hidden = true;
            if (form) form.hidden = false;
          };
        }
        const btnCancelAssign = byId('btnCancelAssignCoach');
        if (btnCancelAssign) {
          btnCancelAssign.onclick = () => {
            if (form) form.hidden = true;
            if (btnOpen) btnOpen.hidden = false;
          };
        }
      }

    } catch (err) {
      console.error('[TraineeCoachCard] Error rendering coach link card:', err);
      if (statusEl) statusEl.textContent = 'לא ניתן לטעון את פרטי המאמן כרגע.';
    }
  }

  const permissionCategoryLabels = {
    nutrition_logs: 'יומני תזונה',
    workout_history: 'היסטוריית אימונים',
    body_metrics: 'מדדי גוף',
    sleep_logs: 'נתוני שינה',
    daily_reports: 'דוחות יומיים'
  };

  async function renderTraineePermissionControls(uid) {
    const [requests, relationships] = await Promise.all([
      window.FitPulseFirebase.getTraineePermissionRequests(),
      window.FitPulseFirebase.listMyTrainerships()
    ]);
    const activeCoachIds = new Set(relationships
      .filter(link => link.traineeId === uid && link.status === 'active')
      .map(link => link.trainerId));
    const requestsEl = byId('traineePermissionRequests');
    const scopesEl = byId('traineePermissionScopes');
    if (!requestsEl || !scopesEl) return;
    requestsEl.replaceChildren();
    scopesEl.replaceChildren();
    for (const request of requests) {
      if (!activeCoachIds.has(request.coachId)) continue;
      if (request.status === 'pending') {
        const panel = createElement('section', 'coach-pending-row');
        panel.append(createElement('strong', '', `${request.coachDisplayName || 'המאמן'} מבקש גישה לנתונים:`));
        (request.requestedCategories || []).forEach(category => {
          if (!permissionCategoryLabels[category]) return;
          const label = createElement('label');
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = category;
          input.checked = true;
          label.append(input, document.createTextNode(` ${permissionCategoryLabels[category]}`));
          panel.append(label);
        });
        const actions = createElement('div', 'coach-pending-actions');
        const accept = createElement('button', 'btn-action-primary', 'שמירת הסכמה');
        accept.type = 'button';
        accept.addEventListener('click', async () => {
          const categories = [...panel.querySelectorAll('input:checked')].map(input => input.value);
          try {
            await window.FitPulseFirebase.respondToCoachPermissionRequest(request.id, request.coachId, uid, categories);
            await renderTraineeCoachLinkCard();
          } catch (error) {
            alert(error.message || 'שמירת ההרשאות נכשלה.');
          }
        });
        const reject = createElement('button', 'btn-action-secondary', 'דחיית הבקשה');
        reject.type = 'button';
        reject.addEventListener('click', async () => {
          try {
            await window.FitPulseFirebase.rejectCoachPermissionRequest(request.id, uid);
            await renderTraineeCoachLinkCard();
          } catch (error) {
            alert(error.message || 'דחיית הבקשה נכשלה.');
          }
        });
        actions.append(accept, reject);
        panel.append(actions);
        requestsEl.append(panel);
      } else if (request.status === 'accepted') {
        const scope = await window.FitPulseFirebase.getCoachPermissionScope(request.coachId, uid);
        if (!scope) continue;
        const panel = createElement('section', 'coach-pending-row');
        panel.append(createElement('strong', '', `הרשאות עבור ${request.coachDisplayName || 'המאמן'}`));
        Object.entries(permissionCategoryLabels).forEach(([category, labelText]) => {
          if (!(request.requestedCategories || []).includes(category)) return;
          const label = createElement('label');
          const input = document.createElement('input');
          input.type = 'checkbox';
          input.value = category;
          input.checked = scope.categories?.[category] === true;
          label.append(input, document.createTextNode(` ${labelText}`));
          panel.append(label);
        });
        const save = createElement('button', 'btn-action-secondary', 'עדכון הרשאות');
        save.type = 'button';
        save.addEventListener('click', async () => {
          const categories = [...panel.querySelectorAll('input:checked')].map(input => input.value);
          try {
            await window.FitPulseFirebase.updateCoachPermissionScope(request.coachId, uid, categories);
            await renderTraineeCoachLinkCard();
          } catch (error) {
            alert(error.message || 'עדכון ההרשאות נכשל.');
          }
        });
        panel.append(save);
        scopesEl.append(panel);
      }
    }
  }

  async function renderCoachPendingLinks() {
    const list = byId('coachPendingLinksList');
    if (!list || !isCoachModeActive()) return;

    try {
      const uid = getAuthUserId() || state.currentUser?.id;
      let serverPending = [];
      try {
        const sRes = await fetch(`/api/coach/trainees?coachId=${encodeURIComponent(uid)}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.success && Array.isArray(sData.pendingRequests)) {
            serverPending = sData.pendingRequests.map(r => ({
              id: r.id,
              coachId: r.coachId,
              traineeId: r.traineeId,
              traineeDisplayName: r.traineeName || 'מתאמן',
              status: 'pending',
              initiatedBy: r.initiatedBy || 'trainee'
            }));
          }
        }
      } catch (e) {}

      let requests = [...serverPending];
      let links = [];
      let listing = null;
      let permissionRequests = [];

      if (window.FitPulseFirebase?.isConfigured && window.FitPulseFirebase?.getCoachConnectionRequests) {
        try {
          const [fbRequests, fbLinks, fbListing, fbPerms] = await Promise.all([
            window.FitPulseFirebase.getCoachConnectionRequests().catch(() => []),
            window.FitPulseFirebase.listMyTrainerships().catch(() => []),
            window.FitPulseFirebase.getOwnCoachDirectoryListing().catch(() => null),
            window.FitPulseFirebase.getCoachPermissionRequests().catch(() => [])
          ]);
          fbRequests.forEach(fr => {
            if (!requests.some(r => r.id === fr.id || (r.traineeId === fr.traineeId && r.coachId === fr.coachId))) {
              requests.push(fr);
            }
          });
          links = fbLinks || [];
          listing = fbListing;
          permissionRequests = fbPerms || [];
        } catch (e) {}
      }
      const optIn = byId('coachDirectoryOptIn');
      if (optIn) {
        optIn.checked = listing?.isPublicVisible === true || listing?.isDiscoverable === true || state.currentUser?.isPublicVisible === true;
        const dirStatus = byId('coachDirectoryStatus');
        if (dirStatus) {
          dirStatus.textContent = optIn.checked
            ? 'חשיפה למתאמנים חדשים: פעיל (מופיע במדריך הציבורי)'
            : 'חשיפה למתאמנים חדשים: כבוי (מוסתר מהמדריך)';
        }
      }
      const selectedPermissionRequest = permissionRequests.find(request => request.traineeId === state.selectedTraineeId);
      const permissionStatus = byId('coachPermissionRequestStatus');
      if (permissionStatus && selectedPermissionRequest) {
        permissionStatus.textContent = `סטטוס בקשת הגישה: ${
          selectedPermissionRequest.status === 'pending' ? 'ממתינה להסכמת המתאמן' :
            selectedPermissionRequest.status === 'accepted' ? 'אושרה' : 'נדחתה'
        }.`;
      }
      const mine = links.filter(link => link.trainerId === uid && link.trainerId !== link.traineeId);
      const pending = requests.filter(request => request.status === 'pending');
      const active = mine.filter(link => link.status === 'active');
      if (!pending.length && !active.length) {
        list.textContent = 'אין בקשות ממתינות ואין מתאמנים מחוברים עדיין.';
        return;
      }
      list.replaceChildren();
      pending.forEach(link => {
        const row = createElement('div', 'coach-pending-row');
        const info = createElement('div');
        info.append(createElement('strong', '', link.initiatedBy === 'coach' ? 'בקשת חיבור נשלחה' : 'בקשת חיבור ממתינה'),
          createElement('span', '', link.initiatedBy === 'coach'
            ? `ממתינים לאישור UID ${link.traineeId}`
            : (link.traineeDisplayName || 'מתאמן')));
        if (link.initiatedBy === 'coach') {
          row.append(info, createElement('span', 'coach-link-status', 'ממתין לתשובת המשתמש'));
          list.append(row);
          return;
        }
        const actions = createElement('div', 'coach-pending-actions');
        const accept = createElement('button', 'btn-action-primary', 'אישור חיבור');
        accept.type = 'button';
        accept.addEventListener('click', async () => {
          accept.disabled = true;
          try {
            try {
              await fetch('/api/coach/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: link.id, accept: true, coachName: state.currentUser?.name })
              });
            } catch (be) {}
            if (window.FitPulseFirebase?.respondToCoachConnection) {
              await window.FitPulseFirebase.respondToCoachConnection(link.id, link.coachId, link.traineeId, true);
            }
            alert('✓ בקשת החיבור אושרה בהצלחה! המתאמן נוסף לרשימת המתאמנים שלך.');
            renderCoach();
            renderTraineeCoachLinkCard();
          } catch (err) {
            alert(err.message || 'אישור החיבור נכשל.');
            accept.disabled = false;
          }
        });
        const reject = createElement('button', 'btn-action-secondary', 'דחייה');
        reject.type = 'button';
        reject.addEventListener('click', async () => {
          if (!confirm('האם לדחות את בקשת החיבור?')) return;
          reject.disabled = true;
          try {
            try {
              await fetch('/api/coach/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: link.id, accept: false, coachName: state.currentUser?.name })
              });
            } catch (be) {}
            if (window.FitPulseFirebase?.respondToCoachConnection) {
              await window.FitPulseFirebase.respondToCoachConnection(link.id, link.coachId, link.traineeId, false);
            }
            renderCoach();
            renderTraineeCoachLinkCard();
          } catch (err) {
            alert(err.message || 'דחיית החיבור נכשלה.');
            reject.disabled = false;
          }
        });
        actions.append(accept, reject);
        row.append(info, actions);
        list.append(row);
      });
      active.forEach(link => {
        const row = createElement('div', 'coach-pending-row');
        row.append(createElement('div', '', ''), createElement('span', '', trainershipStatusLabel(link.status)));
        row.firstChild.append(createElement('strong', '', 'מתאמן מחובר'),
          createElement('span', '', link.traineeId));
        list.append(row);
      });
    } catch (error) {
      list.textContent = 'לא ניתן לטעון בקשות חיבור.';
      console.warn('[FitPulse] pending links notice:', error.message);
    }
  }

  function sendRoutineToTrainee(trainee) {
    const routines = state.customRoutines.length ? state.customRoutines : FIT_DATA.presetWorkouts;
    const choices = routines.map((routine, index) => `${index + 1}. ${routine.name}`).join('\n');
    const selected = window.prompt(`בחרו תוכנית לשליחה אל ${trainee.name} לפי מספר:\n${choices}`);
    if (!selected) return;
    const index = Number(selected) - 1;
    const plan = routines[index];
    if (!plan) {
      alert('מספר התוכנית אינו תקין.');
      return;
    }
    const assignments = readStorage('fitpulse_demo_assignments', {});
    assignments[trainee.id] = [...(assignments[trainee.id] || []), { ...plan, assignedAt: new Date().toISOString() }];
    if (writeStorage('fitpulse_demo_assignments', assignments)) {
      alert(`התוכנית נשמרה עבור ${trainee.name} בדפדפן זה בלבד. לשיתוף מחוץ לדפדפן, יש להשתמש בקישור שמועתק כעת.`);
      shareWorkoutPlan(plan);
    }
  }

  function renderExerciseLibrary(selection, onToggle) {
    const list = byId('exerciseLibraryList');
    const filters = byId('exerciseMuscleFilters');
    if (!list || !filters) return;
    filters.replaceChildren();
    FIT_DATA.muscleGroups.forEach(group => {
      const button = createElement('button', `category-chip${state.exerciseMuscle === group.id ? ' active' : ''}`, group.name);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(state.exerciseMuscle === group.id));
      button.addEventListener('click', () => {
        state.exerciseMuscle = group.id;
        renderExerciseLibrary(selection, onToggle);
      });
      filters.append(button);
    });
    list.replaceChildren();
    const query = state.exerciseQuery.trim().toLocaleLowerCase();
    const filtered = FIT_DATA.exercises.filter(exercise => {
      const muscleMatches = state.exerciseMuscle === 'all' || exercise.muscle === state.exerciseMuscle;
      const equipmentMatches = state.exerciseEquipment === 'all' || exercise.equipment === state.exerciseEquipment;
      const searchable = `${exercise.name} ${exercise.category} ${exercise.muscle} ${exercise.equipment} ${exercise.unilateral ? 'unilateral single-arm single-leg' : 'bilateral'}`;
      return muscleMatches && equipmentMatches && (!query || searchable.toLocaleLowerCase().includes(query));
    });
    const libraryStatus = byId('exerciseLibraryStatus');
    if (libraryStatus) libraryStatus.textContent = `${filtered.length} תרגילים תואמים מתוך ${FIT_DATA.exercises.length}. מוצגים עד 40 תוצאות; חפשו או סננו כדי לצמצם.`;
    if (!filtered.length) list.append(createElement('p', 'empty-state', 'לא נמצאו תרגילים מתאימים.'));
    filtered.slice(0, 40).forEach(exercise => {
      const card = createElement('article', 'library-exercise-card');
      const details = createElement('div', 'library-exercise-details');
      const name = createElement('strong', 'exercise-name-en', exercise.name);
      name.dir = 'ltr';
      details.append(
        name,
        createElement('span', '', `${muscleLabel(exercise.muscle)} · ${exercise.equipment} · ${exercise.defaultSets} × ${exercise.defaultReps}`)
      );
      const pickExercise = () => {
        if (state.exerciseLibraryMode === 'single') {
          state.exerciseLibraryOnPick?.(exercise.id);
          closeExerciseLibrary();
          return;
        }
        if (selection.has(exercise.id)) selection.delete(exercise.id);
        else selection.add(exercise.id);
        onToggle();
        renderExerciseLibrary(selection, onToggle);
      };
      const toggle = createElement('button',
        `btn-action-secondary${selection.has(exercise.id) ? ' selected' : ''}`,
        state.exerciseLibraryMode === 'single' ? 'בחירה' : (selection.has(exercise.id) ? 'נבחר ✓' : '＋ הוספה'));
      toggle.type = 'button';
      toggle.addEventListener('click', pickExercise);
      card.append(details, toggle);
      card.addEventListener('click', event => {
        if (event.target.closest('button')) return;
        if (state.exerciseLibraryMode === 'single') pickExercise();
      });
      list.append(card);
    });
  }

  function closeExerciseLibrary() {
    const dialog = byId('exerciseLibraryDialog');
    if (dialog) dialog.hidden = true;
    state.exerciseLibraryMode = 'multi';
    state.exerciseLibraryOnPick = null;
  }

  function openExerciseLibrary(selection, onToggle, onDone = null, options = {}) {
    const dialog = byId('exerciseLibraryDialog');
    if (!dialog) return;
    document.body.appendChild(dialog);
    state.exerciseQuery = '';
    state.exerciseMuscle = 'all';
    state.exerciseLibrarySelection = selection;
    state.exerciseLibraryOnToggle = onToggle;
    state.exerciseLibraryOnDone = onDone;
    state.exerciseLibraryMode = options.mode || 'multi';
    state.exerciseLibraryOnPick = options.onPick || null;
    const search = byId('exerciseLibrarySearch');
    if (search) search.value = '';
    const done = byId('exerciseLibraryDoneBtn');
    if (done) done.hidden = state.exerciseLibraryMode === 'single';
    const hint = byId('exerciseLibraryHint');
    if (hint) hint.textContent = state.exerciseLibraryMode === 'single'
      ? 'חפשו תרגיל ובחרו אותו. אפשר לסנן לפי שריר או ציוד, בלי לעבור בין תפריטים בכרטיס האימון.'
      : 'חפשו תרגיל וסננו לפי קבוצת שרירים וציוד במאגר המקומי. הוסיפו או הסירו אותו מתוכנית האימון.';
    renderExerciseLibrary(selection, onToggle);
    dialog.hidden = false;
    search?.focus();
  }

  function pickExerciseFromLibrary(onPick) {
    openExerciseLibrary(new Set(), () => {}, null, { mode: 'single', onPick });
  }

  function closeExerciseSwap() {
    const dialog = byId('exerciseSwapDialog');
    if (dialog) dialog.hidden = true;
    exerciseSwapContext = null;
  }

  function openExerciseSwap(context) {
    const dialog = byId('exerciseSwapDialog');
    if (!dialog) return;
    document.body.appendChild(dialog);
    exerciseSwapContext = {
      tab: 'equiv',
      query: '',
      equipment: 'all',
      ...context
    };
    const current = getExercise(exerciseSwapContext.currentId);
    const name = byId('swapTargetExerciseName');
    const badge = byId('swapTargetExerciseBadge');
    if (name) {
      name.textContent = current?.name || 'תרגיל';
      name.dir = 'ltr';
    }
    if (badge) badge.textContent = current ? `${muscleLabel(current.muscle)} · ${current.equipment}` : '';
    const search = byId('exerciseSwapSearch');
    if (search) search.value = '';
    const equipment = byId('exerciseSwapEquipmentFilter');
    if (equipment) equipment.value = 'all';
    setExerciseSwapTab('equiv');
    renderExerciseSwapList();
    dialog.hidden = false;
    search?.focus();
  }

  function setExerciseSwapTab(tab) {
    if (!exerciseSwapContext) return;
    exerciseSwapContext.tab = tab;
    [
      ['swapTabEquiv', 'equiv'],
      ['swapTabMuscle', 'muscle'],
      ['swapTabAll', 'all']
    ].forEach(([id, value]) => {
      const button = byId(id);
      if (!button) return;
      const active = value === tab;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function renderExerciseSwapList() {
    const list = byId('exerciseSwapList');
    const status = byId('exerciseSwapStatus');
    if (!list || !exerciseSwapContext) return;
    const current = getExercise(exerciseSwapContext.currentId);
    const query = (exerciseSwapContext.query || '').trim().toLocaleLowerCase();
    const equipment = exerciseSwapContext.equipment || 'all';
    const sessionEquipment = exerciseSwapContext.sessionEquipment;
    const allowedIds = exerciseSwapContext.allowedIds;
    const focusMuscle = exerciseSwapContext.muscle || current?.muscle;
    const currentSubgroup = current ? getExerciseSubgroup(current) : null;

    let candidates = [];

    if (exerciseSwapContext.tab === 'equiv') {
      const pool = FIT_DATA.exercises.filter(ex => ex.id !== exerciseSwapContext.currentId);
      const scored = pool.map(ex => {
        let score = 0;
        const isAllowed = allowedIds instanceof Set && allowedIds.has(ex.id);
        const isSameMuscle = Boolean(focusMuscle && ex.muscle === focusMuscle);
        const isSameSubgroup = Boolean(currentSubgroup && getExerciseSubgroup(ex) === currentSubgroup);
        const isSameEquipment = Boolean(current && ex.equipment === current.equipment);

        if (isAllowed) score += 100;
        if (isSameMuscle) score += 30;
        if (isSameSubgroup) score += 40;
        if (isSameEquipment) score += 10;

        return { exercise: ex, score };
      });

      const filteredScored = scored.filter(item => item.score > 0);
      filteredScored.sort((a, b) => b.score - a.score || a.exercise.name.localeCompare(b.exercise.name));
      candidates = (filteredScored.length ? filteredScored : scored).map(item => item.exercise);
    } else if (exerciseSwapContext.tab === 'muscle') {
      candidates = FIT_DATA.exercises.filter(ex =>
        ex.id !== exerciseSwapContext.currentId && (!focusMuscle || ex.muscle === focusMuscle)
      );
    } else {
      candidates = FIT_DATA.exercises.filter(ex => ex.id !== exerciseSwapContext.currentId);
    }

    if (equipment !== 'all') {
      candidates = candidates.filter(exercise => exercise.equipment === equipment);
    }
    if (sessionEquipment instanceof Set && sessionEquipment.size > 0) {
      candidates = candidates.filter(exercise => sessionEquipment.has(exercise.equipment));
    }
    if (query) {
      candidates = candidates.filter(exercise =>
        `${exercise.name} ${exercise.equipment} ${muscleLabel(exercise.muscle)} ${exercise.category || ''}`
          .toLocaleLowerCase()
          .includes(query)
      );
    }

    if (status) {
      status.textContent = candidates.length
        ? `${candidates.length} תרגילים חלופיים זמינים לבחירה מיידית`
        : 'לא נמצאו תרגילים תואמים. נסו חיפוש אחר או לשונית אחרת.';
    }

    list.replaceChildren();
    if (!candidates.length) {
      list.append(createElement('p', 'empty-state', 'לא נמצאו תרגילים מתאימים לסינון הנוכחי.'));
      return;
    }

    candidates.slice(0, 60).forEach(exercise => {
      const card = createElement('article', 'swap-candidate-card');
      card.style.cursor = 'pointer';
      const info = createElement('div', 'swap-candidate-info');
      const name = createElement('strong', 'swap-candidate-name', exercise.name);
      name.dir = 'ltr';
      info.append(name, createElement('span', 'swap-candidate-meta',
        `${muscleLabel(exercise.muscle)} · ${exercise.equipment}${exercise.category ? ' · ' + exercise.category : ''}`));
      
      const select = createElement('button', 'swap-select-btn', 'בחירה');
      select.type = 'button';

      const handleSelect = () => {
        const onSelect = exerciseSwapContext?.onSelect;
        closeExerciseSwap();
        onSelect?.(exercise.id);
      };

      select.addEventListener('click', handleSelect);
      card.addEventListener('click', event => {
        if (event.target.closest('button')) return;
        handleSelect();
      });

      card.append(info, select);
      list.append(card);
    });
  }

  function getExerciseSubgroups(muscleGroup) {
    return [...new Set(FIT_DATA.exercises
      .filter(exercise => exercise.muscle === muscleGroup)
      .map(getExerciseSubgroup))].sort((left, right) => left.localeCompare(right));
  }

  function getSubgroupExercises(muscleGroup, subgroup) {
    return FIT_DATA.exercises.filter(exercise =>
      exercise.muscle === muscleGroup && getExerciseSubgroup(exercise) === subgroup);
  }

  function fillSelect(select, options, selectedValue, placeholder = '') {
    select.replaceChildren();
    if (placeholder) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = placeholder;
      select.append(option);
    }
    options.forEach(item => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.append(option);
    });
    if (selectedValue != null && [...select.options].some(option => option.value === String(selectedValue))) {
      select.value = String(selectedValue);
    }
  }

  function renderEquivalentExerciseManager() {
    const muscleSelect = byId('equivalentMuscleSelect');
    const subgroupSelect = byId('equivalentSubgroupSelect');
    const preferredSelect = byId('equivalentPreferredSelect');
    const alternativesSelect = byId('equivalentAlternativesSelect');
    const list = byId('equivalentGroupsList');
    if (!muscleSelect || !subgroupSelect || !preferredSelect || !alternativesSelect || !list) return;
    const editing = state.equivalentExerciseGroups.find(group => group.id === editingEquivalentGroupId);
    const muscleGroups = FIT_DATA.muscleGroups.filter(group => group.id !== 'all' && group.id !== 'cardio');
    fillSelect(muscleSelect, muscleGroups.map(group => ({ value: group.id, label: muscleLabel(group.id) })),
      editing?.muscleGroup || muscleGroups[0]?.id);
    const subgroups = getExerciseSubgroups(muscleSelect.value);
    fillSelect(subgroupSelect, subgroups.map(subgroup => ({ value: subgroup, label: subgroup })),
      editing?.subgroup || subgroups[0]);
    const exercises = getSubgroupExercises(muscleSelect.value, subgroupSelect.value);
    fillSelect(preferredSelect, exercises.map(exercise => ({
      value: exercise.id, label: `${exercise.name} · ${exercise.equipment}`
    })), editing?.preferredExerciseId || exercises[0]?.id);
    const alternatives = exercises.filter(exercise => exercise.id !== preferredSelect.value);
    fillSelect(alternativesSelect, alternatives.map(exercise => ({
      value: exercise.id, label: `${exercise.name} · ${exercise.equipment}`
    })));
    const selectedAlternatives = new Set(editing?.equivalentExerciseIds || []);
    [...alternativesSelect.options].forEach(option => { option.selected = selectedAlternatives.has(option.value); });
    const cancel = byId('cancelEquivalentEditBtn');
    if (cancel) cancel.hidden = !editing;
    const saveButton = byId('saveEquivalentGroupBtn');
    if (saveButton) saveButton.textContent = editing ? 'עדכון שקילות' : 'שמירת שקילות';
    list.replaceChildren();
    if (!state.equivalentExerciseGroups.length) {
      list.append(createElement('p', 'empty-state', 'עדיין לא הוגדרו תרגילים שקולים. בחרו תרגיל מועדף והוסיפו לו חלופות מתאימות.'));
      return;
    }
    state.equivalentExerciseGroups.forEach(group => {
      const preferred = getExercise(group.preferredExerciseId);
      const card = createElement('article', 'equivalent-group-card');
      const heading = createElement('div', 'equivalent-group-heading');
      heading.append(createElement('strong', '', preferred?.name || 'תרגיל מועדף'),
        createElement('span', '', `${muscleLabel(group.muscleGroup)} · ${group.subgroup}`));
      const alternativesList = createElement('p', 'equivalent-group-alternatives',
        (group.equivalentExerciseIds || []).map(id => getExercise(id)?.name).filter(Boolean).join(' · ') || 'אין חלופות');
      const actions = createElement('div', 'equivalent-group-actions');
      const edit = createElement('button', 'btn-action-secondary', 'עריכה');
      edit.type = 'button';
      edit.addEventListener('click', () => {
        editingEquivalentGroupId = group.id;
        renderEquivalentExerciseManager();
        byId('equivalentMuscleSelect')?.focus();
      });
      const remove = createElement('button', 'icon-button', 'הסרה');
      remove.type = 'button';
      remove.addEventListener('click', () => {
        state.equivalentExerciseGroups = state.equivalentExerciseGroups.filter(item => item.id !== group.id);
        if (!writeStorage(STORAGE_KEYS.equivalentExercises, state.equivalentExerciseGroups)) return;
        if (editingEquivalentGroupId === group.id) editingEquivalentGroupId = null;
        renderEquivalentExerciseManager();
      });
      actions.append(edit, remove);
      card.append(heading, alternativesList, actions);
      list.append(card);
    });
  }

  function refreshEquivalentSubgroups() {
    const muscleSelect = byId('equivalentMuscleSelect');
    const subgroupSelect = byId('equivalentSubgroupSelect');
    if (!muscleSelect || !subgroupSelect) return;
    const options = getExerciseSubgroups(muscleSelect.value);
    fillSelect(subgroupSelect, options.map(value => ({ value, label: value })), options[0]);
    refreshEquivalentExercises();
  }

  function refreshEquivalentExercises() {
    const muscleSelect = byId('equivalentMuscleSelect');
    const subgroupSelect = byId('equivalentSubgroupSelect');
    const preferredSelect = byId('equivalentPreferredSelect');
    const alternativesSelect = byId('equivalentAlternativesSelect');
    if (!muscleSelect || !subgroupSelect || !preferredSelect || !alternativesSelect) return;
    const exercises = getSubgroupExercises(muscleSelect.value, subgroupSelect.value);
    fillSelect(preferredSelect, exercises.map(exercise => ({
      value: exercise.id, label: `${exercise.name} · ${exercise.equipment}`
    })), exercises[0]?.id);
    fillSelect(alternativesSelect, exercises.filter(exercise => exercise.id !== preferredSelect.value).map(exercise => ({
      value: exercise.id, label: `${exercise.name} · ${exercise.equipment}`
    })));
  }

  function refreshEquivalentAlternatives() {
    const muscleGroup = byId('equivalentMuscleSelect')?.value;
    const subgroup = byId('equivalentSubgroupSelect')?.value;
    const preferredId = byId('equivalentPreferredSelect')?.value;
    const alternativesSelect = byId('equivalentAlternativesSelect');
    if (!alternativesSelect) return;
    const selected = new Set([...alternativesSelect.selectedOptions].map(option => option.value));
    const exercises = getSubgroupExercises(muscleGroup, subgroup).filter(exercise => exercise.id !== preferredId);
    fillSelect(alternativesSelect, exercises.map(exercise => ({
      value: exercise.id, label: `${exercise.name} · ${exercise.equipment}`
    })));
    [...alternativesSelect.options].forEach(option => { option.selected = selected.has(option.value); });
  }

  function saveEquivalentExerciseGroup(event) {
    event.preventDefault();
    const muscleGroup = byId('equivalentMuscleSelect')?.value;
    const subgroup = byId('equivalentSubgroupSelect')?.value;
    const preferredExerciseId = byId('equivalentPreferredSelect')?.value;
    const equivalentExerciseIds = [...(byId('equivalentAlternativesSelect')?.selectedOptions || [])]
      .map(option => option.value);
    const preferred = getExercise(preferredExerciseId);
    if (!preferred || preferred.muscle !== muscleGroup || getExerciseSubgroup(preferred) !== subgroup ||
      !equivalentExerciseIds.length || equivalentExerciseIds.some(id => {
        const exercise = getExercise(id);
        return !exercise || exercise.id === preferredExerciseId ||
          exercise.muscle !== muscleGroup || getExerciseSubgroup(exercise) !== subgroup;
      })) {
      alert('בחרו תרגיל מועדף ולפחות תרגיל שקול מאותה קבוצת שריר ותת־קבוצה.');
      return;
    }
    const id = editingEquivalentGroupId || `equivalent-${Date.now()}`;
    const group = { id, muscleGroup, subgroup, preferredExerciseId, equivalentExerciseIds };
    state.equivalentExerciseGroups = state.equivalentExerciseGroups
      .filter(item => item.id !== id && item.preferredExerciseId !== preferredExerciseId);
    state.equivalentExerciseGroups.push(group);
    if (!writeStorage(STORAGE_KEYS.equivalentExercises, state.equivalentExerciseGroups)) return;
    editingEquivalentGroupId = null;
    renderEquivalentExerciseManager();
  }

  function createWorkoutModal(existingPlan = null) {
    const overlay = createElement('div', 'dialog-backdrop');
    overlay.id = 'createWorkoutDialog';
    const dialog = createElement('section', 'dialog-card workout-builder-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'createWorkoutTitle');
    const header = createElement('div', 'dialog-header');
    const title = createElement('h2', '', existingPlan?.isDuplicate ? 'שכפול תבנית' : existingPlan ? 'עריכת אימון' : 'בניית אימון חדש');
    title.id = 'createWorkoutTitle';
    const close = createIconButton('icon-button icon-button-ghost', 'סגירה', 'close');
    close.addEventListener('click', () => overlay.remove());
    header.append(title, close);
    const form = createElement('form', 'workout-builder-form');
    const recoveryGoals = [
      { id: 'quick', label: 'חזרה מהירה · 60 שניות', seconds: 60 },
      { id: 'balanced', label: 'התאוששות מאוזנת · 90 שניות', seconds: 90 },
      { id: 'full', label: 'התאוששות מלאה · 180 שניות', seconds: 180 }
    ];
    const rows = (existingPlan?.exercises || []).map(entry => {
      const preferredExerciseId = entry.preferredExerciseId || entry.exerciseId;
      const exercise = getExercise(preferredExerciseId);
      const row = {
        muscleGroup: entry.muscleGroup || exercise?.muscle || '',
        subgroup: entry.subgroup || (exercise ? getExerciseSubgroup(exercise) : ''),
        preferredExerciseId,
        sets: Number(entry.sets) || exercise?.defaultSets || 3,
        reps: Number(entry.reps) || exercise?.defaultReps || 10,
        weight: Number(entry.weight ?? exercise?.defaultWeight) || 0,
        setPrescriptions: Array.isArray(entry.setPrescriptions) ? entry.setPrescriptions.map(item => ({ ...item })) : null
      };
      ensureBuilderPrescriptions(row);
      return row;
    });
    const note = createElement('p', 'muscle-activation-note', 'בחרו תרגיל מהמאגר, ואז ערכו סטים, משקל וחזרות בטבלה. ציוד וחלופות שקולות נבחרים בתחילת האימון.');
    const categoryLabel = createElement('label', 'builder-category-field', 'קטגוריית האימון');
    const categorySelect = document.createElement('select');
    categorySelect.name = 'category';
    const personal = document.createElement('option');
    personal.value = 'custom';
    personal.textContent = 'אימון אישי';
    categorySelect.append(personal);
    WORKOUT_CARD_ORDER.forEach(id => {
      const template = FIT_DATA.presetWorkouts.find(plan => plan.id === id);
      if (!template) return;
      const option = document.createElement('option');
      option.value = id;
      option.textContent = WORKOUT_CARD_LABELS[id] || template.name;
      categorySelect.append(option);
    });
    categorySelect.value = existingPlan?.categoryId || (WORKOUT_CARD_ORDER.includes(existingPlan?.id) ? existingPlan.id : 'custom');
    const nameLabel = createElement('label', '', 'שם האימון');
    const nameInput = document.createElement('input');
    nameInput.name = 'name';
    nameInput.required = true;
    nameInput.maxLength = 60;
    nameInput.placeholder = 'למשל: אימון גוף מלא';
    nameInput.value = existingPlan?.name || '';
    categorySelect.addEventListener('change', () => {
      const template = FIT_DATA.presetWorkouts.find(plan => plan.id === categorySelect.value);
      if (template && (!nameInput.value.trim() || nameInput.dataset.autofilled === 'true')) {
        nameInput.value = WORKOUT_CARD_LABELS[template.id] || template.name;
        nameInput.dataset.autofilled = 'true';
      }
    });
    nameInput.addEventListener('input', () => { nameInput.dataset.autofilled = 'false'; });
    categoryLabel.append(categorySelect);
    nameLabel.append(nameInput);

    const exerciseList = createElement('div', 'builder-exercise-list');
    const moveRow = (from, to) => {
      if (to < 0 || to >= rows.length || from === to) return;
      const [moved] = rows.splice(from, 1);
      rows.splice(to, 0, moved);
      renderRows();
    };
    const renderRows = () => {
      exerciseList.replaceChildren();
      if (!rows.length) exerciseList.append(createElement('p', 'empty-state', 'הרשימה ריקה. הוסיפו תרגיל כדי להתחיל לבנות את האימון.'));
      rows.forEach((row, index) => {
        const exercise = getExercise(row.preferredExerciseId);
        const prescriptions = ensureBuilderPrescriptions(row);
        const previousSets = getPreviousSets(row.preferredExerciseId);
        const card = createElement('article', 'hevy-exercise-card builder-exercise-card');
        card.draggable = true;
        card.addEventListener('dragstart', event => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', String(index));
          card.classList.add('is-dragging');
        });
        card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
        card.addEventListener('dragover', event => {
          event.preventDefault();
          card.classList.add('drop-target');
        });
        card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
        card.addEventListener('drop', event => {
          event.preventDefault();
          card.classList.remove('drop-target');
          const from = Number(event.dataTransfer.getData('text/plain'));
          if (Number.isInteger(from)) moveRow(from, index);
        });
        const heading = createElement('div', 'hevy-card-header');
        const titleArea = createElement('div', 'hevy-title-area');
        const nameRow = createElement('div', 'hevy-exercise-name');
        const handle = createElement('span', 'drag-handle');
        handle.append(createSvgIcon('grip'));
        handle.setAttribute('aria-hidden', 'true');
        nameRow.append(handle, createElement('span', 'hevy-exercise-index', `${index + 1}`));
        if (exercise) {
          const name = createElement('button', 'exercise-picker-btn exercise-name-en', exercise.name);
          name.type = 'button';
          name.dir = 'ltr';
          name.addEventListener('click', () => {
            pickExerciseFromLibrary(exerciseId => {
              applyExerciseToBuilderRow(row, exerciseId);
              renderRows();
            });
          });
          nameRow.append(name);
        } else {
          const picker = createElement('button', 'exercise-picker-btn exercise-picker-empty', 'בחרו תרגיל מהמאגר');
          picker.type = 'button';
          picker.addEventListener('click', () => {
            pickExerciseFromLibrary(exerciseId => {
              applyExerciseToBuilderRow(row, exerciseId);
              renderRows();
            });
          });
          nameRow.append(picker);
        }
        titleArea.append(nameRow);
        if (exercise) {
          const tags = createElement('div', 'hevy-meta-tags');
          tags.append(
            createElement('span', 'hevy-tag hevy-tag-primary', muscleLabel(exercise.muscle)),
            createElement('span', 'hevy-tag hevy-tag-equipment', exercise.equipment)
          );
          titleArea.append(tags);
        }
        const actions = createElement('div', 'hevy-card-actions');
        const up = createIconButton('icon-btn', 'העברה למעלה', 'up');
        up.disabled = index === 0;
        up.addEventListener('click', () => moveRow(index, index - 1));
        const down = createIconButton('icon-btn', 'העברה למטה', 'down');
        down.disabled = index === rows.length - 1;
        down.addEventListener('click', () => moveRow(index, index + 1));
        const swap = createIconButton('icon-btn', 'החלפת תרגיל', 'swap');
        swap.addEventListener('click', () => {
          openExerciseSwap({
            currentId: row.preferredExerciseId,
            muscle: row.muscleGroup || exercise?.muscle,
            onSelect: exerciseId => {
              applyExerciseToBuilderRow(row, exerciseId);
              renderRows();
            }
          });
        });
        const remove = createIconButton('icon-btn icon-btn-danger', 'הסרת תרגיל', 'trash');
        remove.addEventListener('click', () => {
          rows.splice(index, 1);
          renderRows();
        });
        actions.append(up, down, swap, remove);
        heading.append(titleArea, actions);
        card.append(heading);
        if (exercise) {
          const tableWrap = createElement('div', 'hevy-table-container');
          const table = createElement('table', 'hevy-set-table');
          table.innerHTML = '<thead><tr><th>סט</th><th>קודם</th><th>משקל (kg)</th><th>חזרות</th><th></th></tr></thead>';
          const tbody = document.createElement('tbody');
          prescriptions.forEach((setRow, setIndex) => {
            const tr = createElement('tr', 'hevy-set-row');
            const setCell = document.createElement('td');
            setCell.append(createElement('span', 'hevy-set-type-badge', String(setIndex + 1)));
            const prevCell = document.createElement('td');
            const ghost = createElement('span', 'hevy-ghost-cell', previousSets[setIndex]
              ? `${previousSets[setIndex].weight} × ${previousSets[setIndex].reps}` : '—');
            ghost.dir = 'ltr';
            prevCell.append(ghost);
            const weightCell = document.createElement('td');
            const weightInput = document.createElement('input');
            weightInput.className = 'hevy-num-input';
            weightInput.type = 'number';
            weightInput.min = '0';
            weightInput.max = '1000';
            weightInput.step = '0.5';
            weightInput.dir = 'ltr';
            weightInput.value = String(setRow.weight ?? 0);
            weightInput.addEventListener('input', () => {
              setRow.weight = Number(weightInput.value);
              row.weight = Number(prescriptions[0]?.weight) || 0;
            });
            weightCell.append(weightInput);
            const repsCell = document.createElement('td');
            const repsInput = document.createElement('input');
            repsInput.className = 'hevy-num-input';
            repsInput.type = 'number';
            repsInput.min = '1';
            repsInput.max = '1000';
            repsInput.step = '1';
            repsInput.dir = 'ltr';
            repsInput.value = String(setRow.reps ?? 10);
            repsInput.addEventListener('input', () => {
              setRow.reps = Number(repsInput.value);
              row.reps = Number(prescriptions[0]?.reps) || 10;
            });
            repsCell.append(repsInput);
            const removeCell = document.createElement('td');
            const removeSet = createIconButton('icon-btn icon-btn-tiny', 'הסרת סט', 'close');
            removeSet.disabled = prescriptions.length <= 1;
            removeSet.addEventListener('click', () => {
              if (prescriptions.length <= 1) return;
              prescriptions.splice(setIndex, 1);
              row.sets = prescriptions.length;
              renderRows();
            });
            removeCell.append(removeSet);
            tr.append(setCell, prevCell, weightCell, repsCell, removeCell);
            tbody.append(tr);
          });
          table.append(tbody);
          tableWrap.append(table);
          const footer = createElement('div', 'hevy-card-footer');
          const addSet = createElement('button', 'hevy-add-set-btn', '＋ הוספת סט');
          addSet.type = 'button';
          addSet.addEventListener('click', () => {
            if (prescriptions.length >= 20) return;
            const last = prescriptions[prescriptions.length - 1] || { weight: row.weight, reps: row.reps };
            prescriptions.push({ weight: Number(last.weight) || 0, reps: Number(last.reps) || 10 });
            row.sets = prescriptions.length;
            renderRows();
          });
          footer.append(addSet);
          card.append(tableWrap, footer);
        }
        exerciseList.append(card);
      });
    };
    renderRows();
    const addExercise = createElement('button', 'btn-action-secondary builder-add-exercise', '＋ הוספת תרגיל');
    addExercise.type = 'button';
    addExercise.addEventListener('click', () => {
      pickExerciseFromLibrary(exerciseId => {
        const row = { muscleGroup: '', subgroup: '', preferredExerciseId: '', sets: 3, reps: 10, weight: 0 };
        applyExerciseToBuilderRow(row, exerciseId);
        rows.push(row);
        renderRows();
        exerciseList.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
    });

    const durationLabel = createElement('label', '', 'משך משוער (דקות)');
    const durationInput = document.createElement('input');
    durationInput.type = 'number';
    durationInput.name = 'duration';
    durationInput.min = '10';
    durationInput.max = '240';
    durationInput.value = String(existingPlan?.durationMinutes || 45);
    durationInput.required = true;
    durationLabel.append(durationInput);
    const recoveryLabel = createElement('label', 'builder-recovery-field', 'מטרת התאוששות בין הסטים');
    const recoverySelect = document.createElement('select');
    recoveryGoals.forEach(goal => {
      const option = document.createElement('option');
      option.value = goal.id;
      option.textContent = goal.label;
      recoverySelect.append(option);
    });
    recoverySelect.value = existingPlan?.recoveryGoal ||
      recoveryGoals.find(goal => goal.seconds === Number(existingPlan?.defaultRestSeconds))?.id || 'balanced';
    recoveryLabel.append(recoverySelect);
    const scheduleDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const scheduledDayLabel = createElement('label', '', 'יום בתוכנית השבועית');
    const scheduledDaySelect = document.createElement('select');
    scheduledDaySelect.name = 'scheduledDay';
    scheduleDays.forEach((day, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = day;
      scheduledDaySelect.append(option);
    });
    scheduledDaySelect.value = String(Number(existingPlan?.scheduledDay) || 0);
    scheduledDayLabel.append(scheduledDaySelect);
    const restLabel = createElement('label', 'builder-rest-field', 'מנוחה מוצעת (שניות)');
    const restInput = document.createElement('input');
    restInput.type = 'number';
    restInput.name = 'restBetweenSets';
    restInput.min = '0';
    restInput.max = '900';
    restInput.step = '15';
    restInput.value = String(existingPlan?.defaultRestSeconds ?? 90);
    restLabel.append(restInput);
    recoverySelect.addEventListener('change', () => {
      const goal = recoveryGoals.find(item => item.id === recoverySelect.value);
      if (goal) restInput.value = String(goal.seconds);
    });
    const submit = createElement('button', 'btn-action-primary builder-submit', 'שמירת אימון');
    submit.type = 'submit';
    form.append(note, categoryLabel, nameLabel, scheduledDayLabel, exerciseList, addExercise, durationLabel, recoveryLabel, restLabel, submit);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!nameInput.value.trim()) {
        alert('הזינו שם לאימון.');
        nameInput.focus();
        return;
      }
      if (!rows.length || rows.some(row => !row.preferredExerciseId)) {
        alert('הוסיפו לפחות תרגיל אחד ובחרו תרגיל לכל כרטיס.');
        return;
      }
      const exercises = rows.map(row => {
        const prescriptions = ensureBuilderPrescriptions(row);
        return {
          exerciseId: row.preferredExerciseId,
          preferredExerciseId: row.preferredExerciseId,
          muscleGroup: row.muscleGroup,
          subgroup: row.subgroup,
          sets: prescriptions.length,
          reps: Number(prescriptions[0]?.reps) || Number(row.reps),
          weight: Number(prescriptions[0]?.weight) || Number(row.weight),
          setPrescriptions: prescriptions.map(item => ({
            weight: Number(item.weight) || 0,
            reps: Number(item.reps) || 1
          })),
          exerciseName: getExercise(row.preferredExerciseId)?.name || row.preferredExerciseId
        };
      });
      if (exercises.some(entry => !Number.isInteger(entry.sets) || entry.sets < 1 || entry.sets > 20 ||
        !Number.isInteger(entry.reps) || entry.reps < 1 || entry.reps > 1000 ||
        !Number.isFinite(entry.weight) || entry.weight < 0 || entry.weight > 1000) ||
        !Number.isInteger(Number(restInput.value)) || Number(restInput.value) < 0 || Number(restInput.value) > 900) {
        alert('בדקו שמספר הסטים, החזרות, המשקל וזמן המנוחה תקינים.');
        return;
      }
      const plan = {
        id: existingPlan && (existingPlan.id.startsWith('custom-') || existingPlan.id.startsWith('imported-')) && !existingPlan.sourceRoutineId
          ? existingPlan.id : `custom-${Date.now()}`,
        section: FIT_DATA.presetWorkouts.find(template => template.id === categorySelect.value)?.section || existingPlan?.section || 'individual_session',
        categoryId: categorySelect.value === 'custom' ? undefined : categorySelect.value,
        name: nameInput.value.trim(), subtitle: existingPlan?.subtitle || 'תוכנית אימון אישית',
        durationMinutes: Number(durationInput.value), level: existingPlan?.level || 'אישי',
        badge: existingPlan?.badge || 'אימון אישי', defaultRestSeconds: Number(restInput.value),
        recoveryGoal: recoverySelect.value,
        scheduledDay: Number(scheduledDaySelect.value),
        ...(isTrainerRole() && state.selectedTraineeId
          ? { audienceTraineeId: state.selectedTraineeId }
          : existingPlan?.audienceTraineeId ? { audienceTraineeId: existingPlan.audienceTraineeId } : {}),
        ...((existingPlan?.sourceRoutineId || existingPlan?.id.startsWith('assigned-'))
          ? { sourceRoutineId: existingPlan.sourceRoutineId || existingPlan.id.slice('assigned-'.length) } : {}),
        exercises
      };
      const cloudCoach = window.FitPulseFirebase?.isConfigured &&
        window.FitPulseFirebase.currentUid?.() === state.currentUser?.id;
      if (isTrainerRole() && state.selectedTraineeId && cloudCoach) {
        submit.disabled = true;
        try {
          const saved = await window.FitPulseFirebase.saveCoachWorkoutPlan(state.selectedTraineeId, plan);
          plan.id = saved.id;
        } catch (error) {
          console.error('[Coach] Could not save workout to the selected trainee plan.', error);
          alert(`לא ניתן לשמור את האימון בתוכנית המתאמן: ${error.message || error}`);
          submit.disabled = false;
          return;
        }
      }
      const existingIndex = FIT_DATA.presetWorkouts.findIndex(item => item.id === plan.id);
      if (existingIndex >= 0) FIT_DATA.presetWorkouts[existingIndex] = plan;
      else FIT_DATA.presetWorkouts.push(plan);
      const savedIndex = state.customRoutines.findIndex(item => item.id === plan.id);
      if (savedIndex >= 0) state.customRoutines[savedIndex] = plan;
      else state.customRoutines.push(plan);
      if (!writeStorage(STORAGE_KEYS.customRoutines, state.customRoutines)) return;
      if (isTrainerRole() && state.selectedTraineeId && !cloudCoach) {
        const assignments = readStorage('fitpulse_demo_assignments', {});
        const traineeAssignments = assignments[state.selectedTraineeId] || [];
        const assignedIndex = traineeAssignments.findIndex(item => item.id === plan.sourceRoutineId);
        if (assignedIndex >= 0) traineeAssignments[assignedIndex] = plan;
        else traineeAssignments.push(plan);
        assignments[state.selectedTraineeId] = traineeAssignments;
        if (writeStorage('fitpulse_demo_assignments', assignments)) {
          alert('התוכנית נשמרה בתצוגת ההדגמה בדפדפן זה בלבד; אין סנכרון לחשבון מתאמן אחר.');
        }
      }
      renderWorkoutsTab();
      if (isTrainerRole() && state.selectedTraineeId) {
        setCoachSubpage('plan');
        renderCoach();
      } else {
        setTab('tab-workouts');
      }
      overlay.remove();
    });
    dialog.append(header, form);
    overlay.append(dialog);
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    document.body.append(overlay);
    nameInput.focus();
  }

  function getProgressiveOverloadSuggestion(exerciseId, targetReps) {
    const latestExposure = Object.entries(state.workoutLogs)
      .flatMap(([date, workouts]) => (Array.isArray(workouts) ? workouts : []).map(workout => ({ date, workout })))
      .sort((left, right) =>
        String(right.workout.completedAt || right.date).localeCompare(String(left.workout.completedAt || left.date)))
      .map(({ workout }) => (workout.setLogs || []).filter(set => set.exerciseId === exerciseId))
      .find(sets => sets.length > 0);
    if (!latestExposure || latestExposure.some(set =>
      !set.completed || Number(set.reps) < Number(set.targetReps ?? targetReps))) return null;
    const priorWeight = Math.max(...latestExposure.map(set => Number(set.weight) || 0));
    const increase = Math.max(2.5, Math.round(priorWeight * 0.05 * 2) / 2);
    return { weight: Math.round((priorWeight + increase) * 2) / 2, increase };
  }

  function startWorkout(plan) {
    if (!Array.isArray(plan.exercises) || !plan.exercises.length) {
      alert('בתוכנית הזו אין תרגילים שאפשר להתחיל.');
      return;
    }
    const workoutPlan = {
      ...plan,
      availableEquipment: Array.isArray(plan.availableEquipment) && plan.availableEquipment.length
        ? [...plan.availableEquipment]
        : [...new Set(plan.exercises.map(entry => getExercise(entry.preferredExerciseId || entry.exerciseId)?.equipment).filter(Boolean))],
      exercises: plan.exercises.map(entry => ({
        ...entry,
        preferredExerciseId: entry.preferredExerciseId || entry.exerciseId,
        exerciseId: entry.exerciseId || entry.preferredExerciseId
      }))
    };
    launchWorkoutSession(workoutPlan);
  }

  function launchWorkoutSession(plan) {
    if (!Array.isArray(plan.exercises) || !plan.exercises.length) {
      alert('בתוכנית הזו אין תרגילים שאפשר להתחיל.');
      return;
    }
    const workoutPlan = {
      ...plan,
      availableEquipment: Array.isArray(plan.availableEquipment)
        ? [...plan.availableEquipment]
        : [...new Set(plan.exercises.map(entry => getExercise(entry.exerciseId)?.equipment).filter(Boolean))],
      exercises: plan.exercises.map(entry => ({ ...entry }))
    };
    state.activeSession = {
      plan: workoutPlan,
      startedAt: Date.now(),
      completed: new Set(),
      setLogs: {},
      originalRests: {},
      editedRests: new Set(),
      restSeconds: Number.isFinite(Number(workoutPlan.defaultRestSeconds)) ? Number(workoutPlan.defaultRestSeconds) : 90,
      normalRestSeconds: Number.isFinite(Number(workoutPlan.defaultRestSeconds)) ? Number(workoutPlan.defaultRestSeconds) : 90,
      timeCrunch: false,
      expandedSetKey: null,
      sequence: createSetSequence(workoutPlan, false),
      timer: null
    };
    state.isTimeCrunchActive = false;
    byId('timeCrunchToggleBtn')?.classList.remove('active');
    if (byId('timeCrunchToggleBtn')) byId('timeCrunchToggleBtn').textContent = 'מצב קצר בזמן: כבוי';
    if (byId('timeCrunchBanner')) byId('timeCrunchBanner').style.display = 'none';
    if (byId('activeWorkoutTitle')) byId('activeWorkoutTitle').textContent = plan.name;
    const restInput = byId('sessionRestSeconds');
    if (restInput) restInput.value = String(state.activeSession.restSeconds);
    if (restInput) restInput.onchange = updateSessionRest;
    renderActiveExercises();
    const modal = byId('activeWorkoutModal');
    modal?.classList.add('active');
    modal?.setAttribute('aria-hidden', 'false');
    updateWorkoutTimer();
    state.activeSession.timer = window.setInterval(updateWorkoutTimer, 1000);
  }

  function ensureSessionSetLog(session, exerciseIndex, setNumber) {
    const entry = session.plan.exercises[exerciseIndex];
    const key = `${exerciseIndex}-${setNumber}`;
    if (!session.setLogs[key]) {
      const prescription = entry.setPrescriptions?.[setNumber - 1];
      session.setLogs[key] = {
        exerciseId: entry.exerciseId,
        weight: Number(prescription?.weight ?? entry.weight) || 0,
        reps: Number(prescription?.reps ?? entry.reps) || 0,
        rir: entry.targetRir ?? '',
        setType: 'working'
      };
    }
    return session.setLogs[key];
  }

  function replaceSessionExercise(exerciseIndex, exerciseId) {
    const session = state.activeSession;
    const entry = session?.plan.exercises[exerciseIndex];
    const replacement = getExercise(exerciseId);
    if (!session || !entry || !replacement) return;
    entry.exerciseId = replacement.id;
    entry.preferredExerciseId = replacement.id;
    entry.muscleGroup = replacement.muscle;
    entry.subgroup = getExerciseSubgroup(replacement);
    const previous = getPreviousSets(replacement.id);
    const setCount = Math.max(1, Number(entry.sets) || 1);
    for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
      const key = `${exerciseIndex}-${setNumber}`;
      const log = session.setLogs[key] || ensureSessionSetLog(session, exerciseIndex, setNumber);
      log.exerciseId = replacement.id;
      if (!session.completed.has(key)) {
        log.weight = previous[setNumber - 1]?.weight ?? suggestedWeightForExercise(replacement);
        log.reps = previous[setNumber - 1]?.reps ?? (Number(replacement.defaultReps) || Number(entry.reps) || 10);
      }
    }
    renderActiveExercises();
  }

  function removeSessionExercise(exerciseIndex) {
    const session = state.activeSession;
    if (!session || session.plan.exercises.length <= 1) {
      alert('חייבים להשאיר לפחות תרגיל אחד באימון.');
      return;
    }
    const nextLogs = {};
    const nextCompleted = new Set();
    Object.entries(session.setLogs).forEach(([key, log]) => {
      const [oldIndex, setNumber] = key.split('-').map(Number);
      if (oldIndex === exerciseIndex) return;
      const nextIndex = oldIndex > exerciseIndex ? oldIndex - 1 : oldIndex;
      const nextKey = `${nextIndex}-${setNumber}`;
      nextLogs[nextKey] = log;
      if (session.completed.has(key)) nextCompleted.add(nextKey);
    });
    session.plan.exercises.splice(exerciseIndex, 1);
    session.setLogs = nextLogs;
    session.completed = nextCompleted;
    session.sequence = createSetSequence(session.plan, session.timeCrunch);
    renderActiveExercises();
  }

  function renderActiveExercises() {
    const list = byId('activeExercisesList');
    const session = state.activeSession;
    if (!list || !session) return;
    list.replaceChildren();
    session.plan.exercises.forEach((entry, exerciseIndex) => {
      const setCount = Math.max(1, Number(entry.sets) || 1);
      for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
        ensureSessionSetLog(session, exerciseIndex, setNumber);
      }
      const firstLog = session.setLogs[`${exerciseIndex}-1`];
      const exercise = getExercise(firstLog?.exerciseId) || getExercise(entry.exerciseId);
      const previousSets = getPreviousSets(exercise?.id);
      const item = createElement('article', 'hevy-exercise-card active-exercise-card');
      const heading = createElement('div', 'hevy-card-header');
      const titleArea = createElement('div', 'hevy-title-area');
      const nameRow = createElement('div', 'hevy-exercise-name');
      nameRow.append(createElement('span', 'hevy-exercise-index', `${exerciseIndex + 1}`));
      const name = createElement('strong', 'exercise-name-en', exercise?.name || 'Exercise');
      name.dir = 'ltr';
      nameRow.append(name);
      titleArea.append(nameRow);
      if (exercise) {
        const tags = createElement('div', 'hevy-meta-tags');
        tags.append(
          createElement('span', 'hevy-tag hevy-tag-primary', muscleLabel(exercise.muscle)),
          createElement('span', 'hevy-tag hevy-tag-equipment', exercise.equipment)
        );
        titleArea.append(tags);
      }
      const actions = createElement('div', 'hevy-card-actions');
      const swap = createIconButton('icon-btn', 'החלפת תרגיל', 'swap');
      swap.addEventListener('click', () => {
        const sessionEquipment = new Set(session.plan.availableEquipment || []);
        openExerciseSwap({
          currentId: exercise?.id,
          muscle: entry.muscleGroup || exercise?.muscle,
          allowedIds: new Set(getRoutineCandidateExerciseIds(entry)),
          sessionEquipment,
          onSelect: exerciseId => replaceSessionExercise(exerciseIndex, exerciseId)
        });
      });
      const remove = createIconButton('icon-btn icon-btn-danger', 'הסרת תרגיל', 'trash');
      remove.addEventListener('click', () => removeSessionExercise(exerciseIndex));
      actions.append(swap, remove);
      heading.append(titleArea, actions);
      item.append(heading);
      const suggestion = exercise ? getProgressiveOverloadSuggestion(exercise.id, Number(entry.reps) || 0) : null;
      if (suggestion) {
        item.append(createElement('p', 'hevy-overload-banner',
          `הצעת עומס: ${formatNumber(suggestion.weight)} ק״ג (+${formatNumber(suggestion.increase)})`));
      }
      const tableWrap = createElement('div', 'hevy-table-container');
      const table = createElement('table', 'hevy-set-table');
      table.innerHTML = '<thead><tr><th>סט</th><th>קודם</th><th>משקל (kg)</th><th>חזרות</th><th>✓</th></tr></thead>';
      const tbody = document.createElement('tbody');
      for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
        const key = `${exerciseIndex}-${setNumber}`;
        const log = session.setLogs[key];
        const completed = session.completed.has(key);
        const tr = createElement('tr', `hevy-set-row${completed ? ' completed' : ''}`);
        const setCell = document.createElement('td');
        const setType = log.setType || 'working';
        const badge = createElement('button', `hevy-set-type-badge type-${setType}`,
          setType === 'warmup' ? 'W' : setType === 'drop' ? 'D' : setType === 'failure' ? 'F' : String(setNumber));
        badge.type = 'button';
        badge.title = 'לחיצה מחליפה סוג סט';
        badge.addEventListener('click', () => {
          const order = ['working', 'warmup', 'drop', 'failure'];
          const next = order[(order.indexOf(log.setType || 'working') + 1) % order.length];
          log.setType = next;
          badge.className = `hevy-set-type-badge type-${next}`;
          badge.textContent = next === 'warmup' ? 'W' : next === 'drop' ? 'D' : next === 'failure' ? 'F' : String(setNumber);
        });
        setCell.append(badge);
        const prevCell = document.createElement('td');
        const ghost = createElement('span', 'hevy-ghost-cell', previousSets[setNumber - 1]
          ? `${previousSets[setNumber - 1].weight} × ${previousSets[setNumber - 1].reps}` : '—');
        ghost.dir = 'ltr';
        prevCell.append(ghost);
        const weightCell = document.createElement('td');
        const weightInput = document.createElement('input');
        weightInput.className = 'hevy-num-input';
        weightInput.type = 'number';
        weightInput.min = '0';
        weightInput.max = '1000';
        weightInput.step = '0.5';
        weightInput.dir = 'ltr';
        weightInput.value = String(log.weight ?? 0);
        weightInput.addEventListener('change', () => {
          const value = Number(weightInput.value);
          if (!Number.isFinite(value) || value < 0 || value > 1000) {
            weightInput.value = String(log.weight);
            return;
          }
          log.weight = Math.round(value * 2) / 2;
          weightInput.value = String(log.weight);
        });
        weightCell.append(weightInput);
        const repsCell = document.createElement('td');
        const repsInput = document.createElement('input');
        repsInput.className = 'hevy-num-input';
        repsInput.type = 'number';
        repsInput.min = '0';
        repsInput.max = '1000';
        repsInput.step = '1';
        repsInput.dir = 'ltr';
        repsInput.value = String(log.reps ?? 0);
        repsInput.addEventListener('change', () => {
          const value = Number(repsInput.value);
          if (!Number.isInteger(value) || value < 0 || value > 1000) {
            repsInput.value = String(log.reps);
            return;
          }
          log.reps = value;
        });
        repsCell.append(repsInput);
        const checkCell = document.createElement('td');
        const check = createElement('button', `hevy-check-btn${completed ? ' checked' : ''}`, completed ? '✓' : '');
        check.type = 'button';
        check.setAttribute('aria-label', completed ? 'בטל השלמת סט' : 'סמן סט כהושלם');
        check.setAttribute('aria-pressed', String(completed));
        check.addEventListener('click', () => {
          if (session.completed.has(key)) {
            session.completed.delete(key);
            delete log.completedAt;
          } else {
            session.completed.add(key);
            log.completedAt = new Date().toISOString();
            if (session.restSeconds > 0) startRestTimer(session.restSeconds, key);
          }
          const isDone = session.completed.has(key);
          tr.classList.toggle('completed', isDone);
          check.classList.toggle('checked', isDone);
          check.textContent = isDone ? '✓' : '';
          check.setAttribute('aria-pressed', String(isDone));
        });
        checkCell.append(check);
        tr.append(setCell, prevCell, weightCell, repsCell, checkCell);
        tbody.append(tr);
      }
      table.append(tbody);
      tableWrap.append(table);
      const footer = createElement('div', 'hevy-card-footer');
      const addSet = createElement('button', 'hevy-add-set-btn', '＋ הוספת סט');
      addSet.type = 'button';
      addSet.disabled = setCount >= 20;
      addSet.addEventListener('click', () => {
        const previous = session.setLogs[`${exerciseIndex}-${setCount}`];
        entry.sets = Math.min(20, setCount + 1);
        session.setLogs[`${exerciseIndex}-${entry.sets}`] = {
          exerciseId: previous?.exerciseId || entry.exerciseId,
          weight: Number(previous?.weight) || 0,
          reps: Number(previous?.reps) || Number(entry.reps) || 0,
          rir: previous?.rir ?? '',
          setType: previous?.setType || 'working'
        };
        session.sequence = createSetSequence(session.plan, session.timeCrunch);
        renderActiveExercises();
      });
      footer.append(addSet);
      item.append(tableWrap, footer);
      list.append(item);
    });
  }

  function updateSessionRest(event) {
    const requestedValue = Number(event.currentTarget.value);
    const value = state.activeSession?.timeCrunch ? Math.min(requestedValue, 20) : requestedValue;
    if (!Number.isInteger(requestedValue) || requestedValue < 0 || requestedValue > 900 || !state.activeSession) {
      if (event.currentTarget && state.activeSession) event.currentTarget.value = String(state.activeSession.restSeconds);
      return;
    }
    state.activeSession.normalRestSeconds = requestedValue;
    state.activeSession.restSeconds = value;
    event.currentTarget.value = String(value);
    if (state.activeSession.restTimer && !state.activeSession.restTimer.completed) {
      updateRestTimer(state.activeSession);
    }
  }

  function createSetSequence(plan, timeCrunch) {
    const sequence = [];
    if (!timeCrunch) {
      plan.exercises.forEach((entry, exerciseIndex) => {
        for (let setNumber = 1; setNumber <= Math.max(1, Number(entry.sets) || 1); setNumber += 1) {
          sequence.push({ exerciseIndex, setNumber });
        }
      });
      return sequence;
    }
    const groups = new Map();
    plan.exercises.forEach((entry, exerciseIndex) => {
      const muscle = entry.muscleGroup || getExercise(entry.exerciseId)?.muscle || 'other';
      if (!groups.has(muscle)) groups.set(muscle, []);
      groups.get(muscle).push({
        exerciseIndex,
        remaining: Math.max(1, Number(entry.sets) || 1),
        setNumber: 0
      });
    });
    groups.forEach(exercises => {
      const plannedSets = exercises.reduce((sum, exercise) => sum + exercise.remaining, 0);
      if (plannedSets < 2) exercises[0].remaining += 2 - plannedSets;
    });
    const muscleQueues = [...groups.values()].map(exercises => ({ exercises, pointer: 0 }));
    while (muscleQueues.some(queue => queue.exercises.some(exercise => exercise.remaining > 0))) {
      muscleQueues.forEach(queue => {
        let nextIndex = -1;
        for (let offset = 0; offset < queue.exercises.length; offset += 1) {
          const candidate = (queue.pointer + offset) % queue.exercises.length;
          if (queue.exercises[candidate].remaining > 0) {
            nextIndex = candidate;
            break;
          }
        }
        if (nextIndex < 0) return;
        const next = queue.exercises[nextIndex];
        next.remaining -= 1;
        next.setNumber += 1;
        queue.pointer = (nextIndex + 1) % queue.exercises.length;
        sequence.push({ exerciseIndex: next.exerciseIndex, setNumber: next.setNumber });
      });
    }
    return sequence;
  }

  function formatRestClock(seconds) {
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    const remainder = String(seconds % 60).padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  function hideRestHud() {
    const banner = byId('activeWorkoutRestBanner');
    if (banner) banner.style.display = 'none';
  }

  function startRestTimer(seconds, key) {
    const session = state.activeSession;
    if (!session) return;
    if (session.restInterval) window.clearInterval(session.restInterval);
    const remaining = Math.max(0, Number(seconds) || 0);
    if (remaining === 0) {
      session.restTimer = null;
      hideRestHud();
      return;
    }
    session.restTimer = {
      key,
      endsAt: Date.now() + remaining * 1000,
      completed: false
    };
    const banner = byId('activeWorkoutRestBanner');
    if (banner) banner.style.display = 'flex';
    updateRestTimer(session);
    session.restInterval = window.setInterval(() => updateRestTimer(session), 250);
  }

  function skipRestTimer() {
    const session = state.activeSession;
    if (!session) return;
    if (session.restInterval) window.clearInterval(session.restInterval);
    session.restInterval = null;
    session.restTimer = null;
    hideRestHud();
  }

  function adjustRestTimer(deltaSeconds) {
    const session = state.activeSession;
    if (!session?.restTimer || session.restTimer.completed) return;
    session.restTimer.endsAt = Math.max(Date.now(), session.restTimer.endsAt + deltaSeconds * 1000);
    updateRestTimer(session);
  }

  function updateRestTimer(session) {
    const timer = session?.restTimer;
    const countdown = byId('activeRestCountdown');
    if (!timer || !countdown) return;
    const remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
    countdown.textContent = formatRestClock(remaining);
    if (remaining === 0) {
      if (session.restInterval) window.clearInterval(session.restInterval);
      session.restInterval = null;
      timer.completed = true;
      hideRestHud();
    }
  }

  function updateWorkoutTimer() {
    if (!state.activeSession || !byId('workoutElapsed')) return;
    const elapsed = Math.floor((Date.now() - state.activeSession.startedAt) / 1000);
    const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
    const seconds = String(elapsed % 60).padStart(2, '0');
    byId('workoutElapsed').textContent = `${minutes}:${seconds}`;
  }

  function finishWorkout() {
    const session = state.activeSession;
    if (!session) return;
    if (session.timer) window.clearInterval(session.timer);
    if (session.restInterval) window.clearInterval(session.restInterval);
    const loggedSets = session.sequence.map(({ exerciseIndex, setNumber }) => {
      const log = session.setLogs[`${exerciseIndex}-${setNumber}`] || {};
      const exPlan = session.plan?.exercises?.[exerciseIndex] || {};
      const exId = log.exerciseId || exPlan.exerciseId;
      const exMeta = getExercise(exId);
      return {
        ...log,
        exerciseName: exMeta?.name || exPlan.name || 'Exercise',
        exerciseId: exId,
        setNumber,
        targetReps: Number(exPlan.reps) || 0,
        muscleGroup: exPlan.muscleGroup || exMeta?.muscle || '',
        completed: session.completed.has(`${exerciseIndex}-${setNumber}`)
      };
    });
    const totalSets = session.sequence.length;
    const completedSets = loggedSets.filter(set => set.completed);
    const totalVolume = completedSets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);
    const primaryMuscleSetCounts = completedSets.reduce((counts, set) => {
      const primaryMuscle = set.muscleGroup || getExercise(set.exerciseId)?.muscle;
      if (primaryMuscle) counts[primaryMuscle] = (counts[primaryMuscle] || 0) + 1;
      return counts;
    }, {});
    const now = new Date();
    const timeStr = now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
    const workout = {
      id: `workout-${Date.now()}`,
      routineId: session.plan.id,
      name: session.plan.name,
      startedAt: new Date(session.startedAt).toISOString(),
      completedAt: now.toISOString(),
      time: timeStr,
      durationMinutes: Math.max(1, Math.round((Date.now() - session.startedAt) / 60000)),
      completedSets: completedSets.length,
      totalSets,
      calories: Number(session.plan.caloriesBurnEstimate) || 0,
      totalVolume,
      primaryMuscleSetCounts,
      restBetweenSetsSeconds: session.restSeconds,
      setLogs: loggedSets
    };
    state.workoutLogs[state.currentDate] = [...todayWorkouts(), workout];
    const saved = writeStorage(STORAGE_KEYS.workouts, state.workoutLogs);
    syncDailyReportDraft();
    state.activeSession = null;
    hideRestHud();
    const modal = byId('activeWorkoutModal');
    modal?.classList.remove('active');
    modal?.setAttribute('aria-hidden', 'true');
    renderDashboard();
    renderWorkoutsTab();
    renderCoach();
    if (saved) {
      const perMuscleSummary = Object.entries(primaryMuscleSetCounts)
        .map(([muscle, sets]) => `${muscleLabel(muscle)}: ${sets}`)
        .join(' · ');
      alert(`האימון נשמר. הושלמו ${workout.completedSets} מתוך ${totalSets} סטים; סטים לפי שריר ראשי: ${perMuscleSummary || 'אין'}.`);
    }
  }

  function toggleTimeCrunchMode() {
    state.isTimeCrunchActive = !state.isTimeCrunchActive;
    const button = byId('timeCrunchToggleBtn');
    const banner = byId('timeCrunchBanner');
    button?.classList.toggle('active', state.isTimeCrunchActive);
    if (button) button.textContent = state.isTimeCrunchActive
      ? 'מצב קצר בזמן: פעיל ✓'
      : 'מצב קצר בזמן: כבוי';
    if (banner) banner.style.display = state.isTimeCrunchActive ? 'block' : 'none';
    if (state.activeSession) {
      state.activeSession.timeCrunch = state.isTimeCrunchActive;
      state.activeSession.sequence = createSetSequence(state.activeSession.plan, state.isTimeCrunchActive);
      if (state.isTimeCrunchActive) {
        state.activeSession.normalRestSeconds = state.activeSession.restSeconds;
        state.activeSession.restSeconds = Math.min(state.activeSession.restSeconds, 20);
      } else {
        state.activeSession.restSeconds = state.activeSession.normalRestSeconds;
      }
      if (byId('sessionRestSeconds')) byId('sessionRestSeconds').value = String(state.activeSession.restSeconds);
      if (byId('timeCrunchBanner')) byId('timeCrunchBanner').textContent = state.isTimeCrunchActive
        ? 'מצב קצר בזמן פעיל: סבב בין קבוצות שרירים, מנוחה קצרה של עד 20 שניות בין סטים, ולפחות שני סטים מתוכננים לכל קבוצת שריר (או סט אחד לכל תרגיל כשאין אפשרות אחרת).'
        : 'מצב קצר בזמן כבוי: הסטים מוצגים לפי סדר התרגילים בתוכנית.';
      renderActiveExercises();
    }
  }

  function validateRoutine(value) {
    return value && typeof value === 'object' &&
      typeof value.name === 'string' && value.name.trim().length > 0 && value.name.length <= 60 &&
      Array.isArray(value.exercises) &&
      value.exercises.length > 0 && value.exercises.length <= 40 &&
      (value.categoryId == null || WORKOUT_CARD_ORDER.includes(value.categoryId)) &&
      (value.recoveryGoal == null || ['quick', 'balanced', 'full'].includes(value.recoveryGoal)) &&
      (value.availableEquipment == null ||
        (Array.isArray(value.availableEquipment) &&
          value.availableEquipment.every(item => FIT_DATA.exercises.some(exercise => exercise.equipment === item)))) &&
      value.exercises.every(entry => {
        return entry && getExercise(entry.exerciseId) &&
          Number.isInteger(Number(entry.sets)) && Number(entry.sets) >= 1 && Number(entry.sets) <= 20 &&
          Number.isFinite(Number(entry.reps)) && Number(entry.reps) >= 1 && Number(entry.reps) <= 1000 &&
          Number.isFinite(Number(entry.weight)) && Number(entry.weight) >= 0 && Number(entry.weight) <= 1000 &&
          (entry.muscleGroup == null || FIT_DATA.muscleGroups.some(group => group.id === entry.muscleGroup)) &&
          (entry.subgroup == null || (typeof entry.subgroup === 'string' &&
            getExercise(entry.preferredExerciseId || entry.exerciseId)?.muscle === (entry.muscleGroup || getExercise(entry.exerciseId)?.muscle) &&
            getExerciseSubgroup(getExercise(entry.preferredExerciseId || entry.exerciseId)) === entry.subgroup)) &&
          (entry.preferredExerciseId == null || (getExercise(entry.preferredExerciseId) &&
            getExercise(entry.preferredExerciseId).muscle === (entry.muscleGroup || getExercise(entry.exerciseId)?.muscle))) &&
          (entry.intensity == null || ['light', 'moderate', 'hard'].includes(entry.intensity)) &&
          (entry.volume == null || ['low', 'balanced', 'high', 'custom'].includes(entry.volume)) &&
          (entry.restSeconds == null || (Number.isFinite(Number(entry.restSeconds)) && Number(entry.restSeconds) >= 0 && Number(entry.restSeconds) <= 900)) &&
          (entry.targetRir == null || entry.targetRir === '' || (Number.isInteger(Number(entry.targetRir)) && Number(entry.targetRir) >= 0 && Number(entry.targetRir) <= 4));
      });
  }

  async function shareWorkoutPlan(plan) {
    let code;
    do {
      code = String(Math.floor(100000 + Math.random() * 900000));
    } while (state.sharedRoutines[code]);
    state.sharedRoutines[code] = plan;
    if (!writeStorage(STORAGE_KEYS.sharedRoutines, state.sharedRoutines)) return;
    const routine = encodeURIComponent(JSON.stringify(plan));
    const shareUrl = `${window.location.href.split('#')[0]}#routine=${routine}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API is unavailable.');
      await navigator.clipboard.writeText(shareUrl);
      alert(`קוד מקומי לתוכנית ${plan.name}: ${code}\nהקישור המלא הועתק ללוח. אפשר לייבא אותו גם בדפדפן אחר.`);
    } catch (error) {
      console.warn('Could not write the routine link to the clipboard.', error);
      window.prompt(`קוד מקומי: ${code}. העתיקו את הקישור הבא לשיתוף:`, shareUrl);
    }
  }

  function importRoutine() {
    const value = window.prompt('הדביקו קישור שיתוף מלא או הזינו קוד בן 6 ספרות שנוצר בדפדפן זה:');
    if (!value) return;
    let plan;
    const code = value.trim();
    if (/^\d{6}$/.test(code)) {
      plan = state.sharedRoutines[code];
      if (!plan) {
        alert('הקוד לא נמצא בדפדפן זה. לשיתוף בין מכשירים השתמשו בקישור המלא.');
        return;
      }
    } else {
      try {
        const url = new URL(code, window.location.href);
        const match = url.hash.match(/(?:^#|&)routine=([^&]+)/);
        if (!match) throw new Error('The link does not contain a routine.');
        plan = JSON.parse(decodeURIComponent(match[1]));
      } catch (error) {
        console.error('Could not import the workout routine.', error);
        alert('הקישור לא תקין או שהתוכנית אינה נתמכת.');
        return;
      }
    }
    if (!validateRoutine(plan)) {
      alert('התוכנית אינה תקינה או שהיא כוללת תרגילים שאינם קיימים במאגר.');
      return;
    }
    const imported = {
      ...plan,
      id: `imported-${Date.now()}`,
      section: 'individual_session',
      badge: 'תוכנית מיובאת',
      defaultRestSeconds: Number.isInteger(Number(plan.defaultRestSeconds))
        ? Number(plan.defaultRestSeconds)
        : Number(plan.exercises.find(entry => Number.isFinite(Number(entry.restSeconds)))?.restSeconds) || 90,
      exercises: plan.exercises.map(entry => {
        const { restSeconds, ...setConfig } = entry;
        return { ...setConfig, muscleGroup: setConfig.muscleGroup || getExercise(setConfig.exerciseId)?.muscle };
      })
    };
    delete imported.audienceTraineeId;
    delete imported.sourceRoutineId;
    FIT_DATA.presetWorkouts.push(imported);
    state.customRoutines.push(imported);
    writeStorage(STORAGE_KEYS.customRoutines, state.customRoutines);
    renderWorkoutsTab();
    setTab('tab-workouts');
    alert(`התוכנית "${imported.name}" נוספה לאימונים.`);
  }

  function updateHeaderUserChip() {
    const chip = byId('headerUserChip');
    const loginBtn = byId('headerLoginBtn');
    const avatar = byId('headerUserAvatar');
    const nameEl = byId('headerUserName');
    const badgeEl = byId('headerUserRoleBadge');
    if (!chip) return;

    if (!state.currentUser) {
      chip.style.display = 'none';
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      return;
    }
    chip.style.display = 'inline-flex';
    if (loginBtn) loginBtn.style.display = 'none';

    const role = getUserRole();
    const displayName = state.currentUser.name || (role === 'manager' ? 'מנהל מערכת' : role === 'coach' ? 'מאמן ראשי' : 'מתאמן');
    if (nameEl) nameEl.textContent = displayName;

    let initials = 'FP';
    if (displayName) {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        initials = (parts[0][0] + parts[1][0]);
      } else {
        initials = parts[0].slice(0, 2);
      }
    }
    if (avatar) avatar.textContent = initials;

    if (badgeEl) {
      badgeEl.className = 'header-user-role-badge';
      if (role === 'manager') {
        badgeEl.classList.add('role-manager');
        badgeEl.textContent = 'מנהל מערכת';
      } else if (role === 'coach') {
        badgeEl.classList.add('role-coach');
        badgeEl.textContent = 'מאמן';
      } else {
        badgeEl.classList.add('role-trainee');
        badgeEl.textContent = 'מתאמן';
      }
    }
  }

  function applyRoleAuthority(role) {
    const currentUserId = state.currentUser?.id || state.currentUser?.uid;
    if (role === 'coach' && currentUserId && state.coachModeUserId !== currentUserId) {
      const savedMode = readStorage(STORAGE_KEYS.coachMode, 'coaching');
      state.coachViewMode = savedMode === 'training' ? 'training' : 'coaching';
      state.coachModeUserId = currentUserId;
    }
    if (role !== 'coach') {
      state.coachViewMode = 'coaching';
      state.coachModeUserId = null;
    }

    const coachTab = byId('navTabCoach');
    const managerTab = byId('navTabAppManager');
    const equivTab = byId('navTabEquivalents');
    const equivBtn = byId('manageEquivalentExercisesBtn');
    const coachModeButton = byId('headerCoachModeToggleBtn');
    const showCoachPages = role === 'coach' && state.coachViewMode === 'coaching';
    const isManager = role === 'manager';
    const traineeMode = role === 'trainee' || (role === 'coach' && state.coachViewMode === 'training');

    if (coachTab) coachTab.hidden = !showCoachPages;
    if (managerTab) managerTab.hidden = !isManager;
    if (equivTab) equivTab.hidden = !showCoachPages;
    if (equivBtn) equivBtn.hidden = !showCoachPages;
    if (coachModeButton) {
      coachModeButton.hidden = role !== 'coach';
      coachModeButton.textContent = state.coachViewMode === 'coaching' ? 'מצב אימון' : 'מצב התאמנות';
      coachModeButton.setAttribute('aria-pressed', String(state.coachViewMode === 'coaching'));
      coachModeButton.title = state.coachViewMode === 'coaching'
        ? 'החלפה למצב התאמנות'
        : 'החלפה למצב אימון';
    }
    const coachSearchTab = byId('navTabCoachSearch');
    if (coachSearchTab) coachSearchTab.hidden = !traineeMode;
    document.querySelectorAll('.nav-tab-btn').forEach(button => {
      button.hidden = !isTabAllowedForRole(button.getAttribute('data-tab'));
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.hidden = !isTabAllowedForRole(pane.id);
    });
    if (byId('headerStartWorkoutBtn')) byId('headerStartWorkoutBtn').hidden = !traineeMode;

    const isTrainer = showCoachPages;
    if (byId('coachAccessNotice')) byId('coachAccessNotice').hidden = isTrainer;
    if (byId('coachAdminContent')) byId('coachAdminContent').hidden = !isTrainer;
    if (!isTabAllowedForRole(state.activeTab)) setTab(defaultTabForRole());
  }

  function showAuthView(viewName) {
    const loginView = byId('authViewLogin');
    const guideView = byId('authViewGuide');
    const onboardingView = byId('authViewOnboarding');
    const pendingView = byId('authViewPendingApproval');
    const tabSwitch = document.querySelector('.auth-tab-switch');
    const tabLogin = byId('authTabLoginBtn');
    const tabGuide = byId('authTabGuideBtn');
    const errorBox = byId('authErrorMessage');
    const onboardingErr = byId('onboardingErrorMessage');
    const pendingNotice = byId('pendingStatusNotice');
    if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
    if (onboardingErr) { onboardingErr.hidden = true; onboardingErr.textContent = ''; }
    if (pendingNotice) { pendingNotice.hidden = true; pendingNotice.textContent = ''; }

    // Hide all views first
    if (loginView) { loginView.hidden = true; loginView.classList.remove('active'); }
    if (guideView) { guideView.hidden = true; guideView.classList.remove('active'); }
    if (onboardingView) { onboardingView.hidden = true; onboardingView.classList.remove('active'); }
    if (pendingView) { pendingView.hidden = true; pendingView.classList.remove('active'); }

    if (viewName === 'pending') {
      if (pendingView) { pendingView.hidden = false; pendingView.classList.add('active'); }
      if (tabSwitch) tabSwitch.style.display = 'none';
    } else if (viewName === 'onboarding') {
      if (onboardingView) { onboardingView.hidden = false; onboardingView.classList.add('active'); }
      if (tabSwitch) tabSwitch.style.display = 'none'; // hide login/guide tabs during onboarding
    } else if (viewName === 'guide') {
      if (tabSwitch) tabSwitch.style.display = 'flex';
      if (guideView) { guideView.hidden = false; guideView.classList.add('active'); }
      if (tabLogin) tabLogin.classList.remove('active');
      if (tabGuide) tabGuide.classList.add('active');
    } else {
      // default 'login'
      if (tabSwitch) tabSwitch.style.display = 'flex';
      if (loginView) { loginView.hidden = false; loginView.classList.add('active'); }
      if (tabLogin) tabLogin.classList.add('active');
      if (tabGuide) tabGuide.classList.remove('active');
    }
  }

  function reloadUserScopedState(user) {
    const isDemo = (user.id && user.id.startsWith('usr_')) || 
                   (user.email && (user.email === 'daniel@fitpulse.com' || user.email === 'shira@fitpulse.com' || user.email === 'coach@fitpulse.com' || user.email === 'manager@fitpulse.com'));

    if (isDemo) {
      if (user.role === 'trainee') {
        state.profile.name = user.name;
        if (user.traineeId) {
          state.profile.demoTraineeId = user.traineeId;
          state.selectedTraineeId = user.traineeId;
        }
      } else if (user.role === 'coach') {
        state.profile.role = 'trainer_admin';
      }
    } else {
      // REAL / NEW USER: STRICTLY CLEAN SLATE!
      const userKey = user.id || user.uid;
      state.profile = {
        name: user.name,
        email: user.email,
        role: user.role,
        gender: 'other',
        age: 25,
        weight: null,
        height: 175,
        demoTraineeId: userKey,
        targetCalories: Number(user.targetCalories) || 2200,
        targetProtein: Number(user.targetProtein) || 160,
        targetWaterMl: Number(user.targetWaterMl) || 3000,
        targetSleepHours: Number(user.targetSleepHours) || 8
      };
      state.selectedTraineeId = userKey;

      if (user.role === 'trainee') {
        state.profile.role = 'trainee';
        state.workoutLogs = readStorage(STORAGE_KEYS.workouts, {});
        state.nutritionLogs = readStorage(STORAGE_KEYS.nutrition, {});
        state.weightLogs = readStorage(STORAGE_KEYS.weights, []);
        state.waterLogs = readStorage(STORAGE_KEYS.water, {});
        state.sleepLogs = readStorage(STORAGE_KEYS.sleep, {});
        state.dailyReports = readStorage(STORAGE_KEYS.dailyReports, {});
        state.customRoutines = readStorage(STORAGE_KEYS.customRoutines, []);
      } else if (user.role === 'coach') {
        state.profile.role = 'trainer_admin';
        state.coachHistoricalReports = [];
        state.customRoutines = readStorage(STORAGE_KEYS.customRoutines, []);
      }
    }
  }

  function isSpecialUser(userOrId) {
    if (!userOrId) return false;
    const val = typeof userOrId === 'string'
      ? userOrId.toLowerCase().trim()
      : (((userOrId.email || userOrId.id || userOrId.userId || '') + '')).toLowerCase().trim();
    const specialEmails = ['manager@fitpulse.com', 'coach.real@fitpulse.com', 'trainee.real@fitpulse.com'];
    const specialIds = ['usr_mgr', 'usr_coach_real', 'usr_trainee_real', 'coach_real', 'trainee_real'];
    return specialEmails.includes(val) || specialIds.includes(val);
  }

  function accountAccessMessage(profile) {
    if (!profile) return '';
    if (profile?.status === 'rejected' || profile?.approvalStatus === 'rejected') {
      return 'בקשת הגישה שלך נדחתה על ידי מנהל המערכת. לא ניתן להתחבר.';
    }
    if (profile?.status === 'suspended' || profile?.status === 'disabled') {
      return 'חשבונך הושעה על ידי מנהל המערכת. לא ניתן להתחבר.';
    }
    if (profile?.status === 'pending_approval' || profile?.approvalStatus === 'pending') {
      return 'חשבונך ממתין לאישור מנהל המערכת.';
    }
    return '';
  }

  function loginUser(user) {
    if (!user) return;
    const accessError = accountAccessMessage(user);
    if (accessError) {
      console.warn('[AuthGuard] Blocked login for restricted user:', user.email || user.id, accessError);
      const errorBox = byId('authErrorMessage');
      if (errorBox) {
        errorBox.textContent = accessError;
        errorBox.hidden = false;
      }
      if (window.FitPulseFirebase?.signOut) {
        window.FitPulseFirebase.signOut().catch(() => {});
      }
      logoutUser();
      showAuthView('login');
      return;
    }
    if (typeof profileListenerUnsubscribe === 'function') profileListenerUnsubscribe();
    profileListenerUnsubscribe = null;
    state.currentUser = user;
    writeSession('fitpulse_auth_session', user);
    localStorage.removeItem('fitpulse_auth_session');

    reloadUserScopedState(user);

    const overlay = byId('authGateOverlay');
    if (overlay) {
      overlay.hidden = true;
      overlay.style.display = 'none';
    }

    applyRoleAuthority(user.role);
    updateHeaderUserChip();
    if (user.id && getAuthUserId() === user.id && window.FitPulseFirebase?.subscribeUserProfile) {
      try {
        profileListenerUnsubscribe = window.FitPulseFirebase.subscribeUserProfile(user.id, profile => {
          if (!profile || !state.currentUser || state.currentUser.id !== user.id) return;
          const restrictedMessage = accountAccessMessage(profile);
          if (restrictedMessage) {
            logoutUser();
            const errorBox = byId('authErrorMessage');
            if (errorBox) {
              errorBox.textContent = restrictedMessage;
              errorBox.hidden = false;
            }
            return;
          }
          const previousRole = state.currentUser.role;
          const role = ['manager', 'admin'].includes(profile.role) ? 'manager' :
            (profile.role === 'coach' || profile.isTrainer === true ? 'coach' : 'trainee');
          state.currentUser = {
            ...state.currentUser,
            role,
            isTrainer: role !== 'trainee',
            name: profile.fullName || state.currentUser.name
          };
          writeSession('fitpulse_auth_session', state.currentUser);
          applyRoleAuthority(role);
          updateHeaderUserChip();
          if ((state.activeTab === 'tab-coach' && role === 'trainee') ||
              (state.activeTab === 'tab-app-manager' && role !== 'manager')) {
            setTab('tab-dashboard');
          } else if (role === 'coach' && state.activeTab === 'tab-app-manager') {
            setTab('tab-coach');
          } else if (role === 'coach' && previousRole !== 'coach' && state.activeTab === 'tab-dashboard') {
            setTab('tab-coach');
          }
        }, error => console.error('[Auth] User role/profile subscription failed.', error));
      } catch (error) {
        console.error('[Auth] Could not subscribe to the signed-in user profile.', error);
      }
    }

    if (window.FitPulseFirebase?.logAudit) {
      window.FitPulseFirebase.logAudit('USER_LOGIN', `התחברות משתמש: ${user.name} (${user.email || user.id})`, {
        role: user.role,
        email: user.email,
        timestamp: new Date().toISOString()
      });
    }

    if (user.role === 'manager') {
      setTab('tab-app-manager');
    } else if (user.role === 'coach') {
      setTab('tab-coach');
    } else {
      setTab('tab-dashboard');
    }

    renderAll();
  }

  function logoutUser() {
    const prevUser = state.currentUser;
    if (typeof profileListenerUnsubscribe === 'function') profileListenerUnsubscribe();
    profileListenerUnsubscribe = null;
    state.currentUser = null;
    sessionStorage.removeItem('fitpulse_auth_session');
    localStorage.removeItem('fitpulse_auth_session');

    if (window.FitPulseFirebase?.signOut) {
      window.FitPulseFirebase.signOut().catch(err => console.warn('Firebase signout error:', err));
    }

    applyRoleAuthority('trainee');
    updateHeaderUserChip();

    const overlay = byId('authGateOverlay');
    if (overlay) {
      overlay.hidden = false;
      overlay.style.display = 'flex';
    }
    showAuthView('login');

    if (prevUser && window.FitPulseFirebase?.logAudit) {
      window.FitPulseFirebase.logAudit('USER_LOGOUT', `התנתקות משתמש: ${prevUser.name} (${prevUser.email || prevUser.id})`, {
        email: prevUser.email
      });
    }
  }

  function initAuthAndGates() {
    byId('authTabLoginBtn')?.addEventListener('click', () => showAuthView('login'));
    byId('authTabGuideBtn')?.addEventListener('click', () => showAuthView('guide'));
    byId('guideGoToLoginBtn')?.addEventListener('click', () => showAuthView('login'));
    byId('headerLoginBtn')?.addEventListener('click', () => {
      const overlay = byId('authGateOverlay');
      if (overlay) {
        overlay.hidden = false;
        overlay.style.display = 'flex';
      }
      showAuthView('login');
    });

    document.querySelectorAll('.auth-demo-pill').forEach(pill => {
      pill.addEventListener('click', async () => {
        const email = pill.getAttribute('data-demo-email') || '';
        const pass = pill.getAttribute('data-demo-pass') || '';
        const role = pill.getAttribute('data-demo-role') || 'trainee';
        const name = pill.getAttribute('data-demo-name') || '';

        const emailInput = byId('authEmailInput');
        const passInput = byId('authPasswordInput');
        if (emailInput) emailInput.value = email;
        if (passInput) passInput.value = pass || '123456';

        const errorBox = byId('authErrorMessage');
        if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }

        // Attempt server API login first
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier: email, password: pass })
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            loginUser(data.user);
            return;
          }
          if (data.error) {
            if (errorBox) {
              errorBox.textContent = data.error;
              errorBox.hidden = false;
            }
            return;
          }
        } catch (e) {
          console.warn('[Auth] Server login fetch error, using local fallback:', e.message);
        }

        const found = state.systemUsers.find(u => u.email.toLowerCase() === email.toLowerCase()) || {
          id: role === 'manager' ? 'usr_mgr' : (role === 'coach' ? 'usr_coach_real' : 'usr_trainee_real'),
          name,
          email,
          role,
          isTrainer: role !== 'trainee',
          traineeId: role === 'trainee' ? 'usr_trainee_real' : undefined,
          status: 'active',
          approvalStatus: 'approved',
          isSpecial: true
        };

        const restrictedMessage = accountAccessMessage(found);
        if (restrictedMessage) {
          if (errorBox) {
            errorBox.textContent = restrictedMessage;
            errorBox.hidden = false;
          }
          return;
        }

        loginUser(found);
      });
    });

    byId('authLoginForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const emailInput = byId('authEmailInput')?.value.trim();
      const passwordInput = byId('authPasswordInput')?.value;
      const errorBox = byId('authErrorMessage');
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }

      if (!emailInput || !passwordInput) {
        if (errorBox) {
          errorBox.textContent = 'יש להזין אימייל/שם משתמש וסיסמה.';
          errorBox.hidden = false;
        }
        return;
      }

      // 1. Try server API login
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: emailInput, password: passwordInput })
        });
        const data = await res.json();
        if (res.ok && data.success && data.user) {
          loginUser(data.user);
          return;
        }
        if (res.status === 403 || (data.status && ['rejected', 'suspended', 'pending_approval'].includes(data.status))) {
          if (errorBox) {
            errorBox.textContent = data.error || 'הגישה למערכת חסומה עבור חשבון זה.';
            errorBox.hidden = false;
          }
          return;
        }
      } catch (err) {
        console.warn('[Auth] Server login unreachable, falling back to client auth:', err.message);
      }

      // 2. Firebase live auth if available
      let authenticatedUser = null;
      if (window.FitPulseFirebase?.signIn && emailInput.includes('@')) {
        try {
          const userCred = await window.FitPulseFirebase.signIn(emailInput, passwordInput);
          const user = userCred?.user || userCred;
          if (user && user.uid) {
            let profile = null;
            if (window.FitPulseFirebase?.getUserProfile) {
              profile = await window.FitPulseFirebase.getUserProfile(user.uid);
            }
            const role = ['manager', 'admin'].includes(profile?.role) ? 'manager' :
              (profile?.role === 'coach' || profile?.isTrainer === true ? 'coach' : 'trainee');
            authenticatedUser = {
              id: user.uid,
              email: user.email || emailInput,
              name: profile?.fullName || user.displayName || emailInput.split('@')[0],
              role,
              status: profile?.status || 'active',
              approvalStatus: profile?.approvalStatus || 'approved',
              traineeId: role === 'trainee' ? (profile?.userId || user.uid) : undefined
            };
          }
        } catch (fbErr) {
          console.warn('[Auth] Firebase Auth sign-in error:', fbErr.message);
        }
      }

      // 3. Fallback to special users
      if (!authenticatedUser) {
        const lowered = emailInput.toLowerCase();
        authenticatedUser = state.systemUsers.find(u =>
          u.email.toLowerCase() === lowered ||
          u.id.toLowerCase() === lowered ||
          u.name.toLowerCase() === lowered ||
          (u.email.toLowerCase().startsWith(lowered + '@'))
        );

        if (!authenticatedUser) {
          if (lowered === 'manager' || lowered === 'admin') {
            authenticatedUser = state.systemUsers.find(u => u.role === 'manager');
          } else if (lowered === 'coach' || lowered === 'trainer') {
            authenticatedUser = state.systemUsers.find(u => u.email === 'coach.real@fitpulse.com') ||
                                state.systemUsers.find(u => u.role === 'coach');
          } else if (lowered === 'trainee') {
            authenticatedUser = state.systemUsers.find(u => u.email === 'trainee.real@fitpulse.com') ||
                                state.systemUsers.find(u => u.role === 'trainee');
          }
        }
      }

      const restrictedMessage = accountAccessMessage(authenticatedUser);
      if (restrictedMessage) {
        if (errorBox) {
          errorBox.textContent = restrictedMessage;
          errorBox.hidden = false;
        }
        return;
      }

      if (authenticatedUser) {
        loginUser(authenticatedUser);
      } else {
        if (errorBox) {
          errorBox.textContent = 'פרטי ההתחברות אינם תואמים. בדקו את כתובת האימייל והסיסמה, או היעזרו בכפתורי הכניסה המהירה מטה.';
          errorBox.hidden = false;
        }
      }
    });

    // Google Sign-In Handler
    byId('authGoogleSignInBtn')?.addEventListener('click', async () => {
      const errorBox = byId('authErrorMessage');
      const googleBtn = byId('authGoogleSignInBtn');
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }

      if (!window.FitPulseFirebase?.signInWithGoogle) {
        if (errorBox) {
          errorBox.textContent = 'שירות Firebase Auth אינו זמין כעת.';
          errorBox.hidden = false;
        }
        return;
      }

      try {
        if (googleBtn) {
          googleBtn.disabled = true;
          googleBtn.dataset.originalText = googleBtn.innerHTML;
          googleBtn.innerHTML = '<span>מתחבר לחשבון Google...</span>';
        }

        const { user, profile, isNewUser, isPendingApproval, isRejected, isSuspended } = await window.FitPulseFirebase.signInWithGoogle();

        if (!user || !user.uid) {
          throw new Error('לא התקבלו נתוני משתמש מ-Google.');
        }

        // Post to backend /api/auth/google
        let backendResult = null;
        try {
          const res = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || profile?.fullName || '',
              photoURL: user.photoURL || ''
            })
          });
          backendResult = await res.json();
          if (res.status === 403 || backendResult.status === 'rejected' || backendResult.status === 'suspended') {
            if (errorBox) {
              errorBox.textContent = backendResult.error || 'הגישה למערכת חסומה עבור משתמש זה.';
              errorBox.hidden = false;
            }
            if (window.FitPulseFirebase?.signOut) {
              try { await window.FitPulseFirebase.signOut(); } catch (e) {}
            }
            return;
          }
          if (backendResult.isPending || backendResult.user?.status === 'pending_approval') {
            state.pendingGoogleUser = user;
            const p = backendResult.user || user;
            if (byId('pendingUserName')) byId('pendingUserName').textContent = p.name || p.displayName || user.displayName || user.email.split('@')[0];
            if (byId('pendingUserEmail')) byId('pendingUserEmail').textContent = p.email || user.email || '';
            if (byId('pendingUserRoleBadge')) byId('pendingUserRoleBadge').textContent = 'ממתין לאישור מנהל';
            const img = byId('pendingUserAvatarImg');
            const fallback = byId('pendingUserAvatarFallback');
            if ((p.photoURL || user.photoURL) && img) {
              img.src = p.photoURL || user.photoURL;
              img.hidden = false;
              if (fallback) fallback.hidden = true;
            } else {
              if (img) img.hidden = true;
              if (fallback) fallback.hidden = false;
            }
            showAuthView('pending');
            return;
          }
          if (res.ok && backendResult.success && backendResult.user) {
            loginUser(backendResult.user);
            return;
          }
        } catch (beErr) {
          console.warn('[Auth] Backend /api/auth/google notice:', beErr.message);
        }

        // Fallback to client profile
        if (isRejected || profile?.status === 'rejected' || profile?.approvalStatus === 'rejected') {
          if (errorBox) {
            errorBox.textContent = 'חשבונך נדחה על ידי מנהל המערכת. אנא פנה למנהל האפליקציה.';
            errorBox.hidden = false;
          }
          if (window.FitPulseFirebase?.signOut) {
            try { await window.FitPulseFirebase.signOut(); } catch (e) {}
          }
          return;
        }

        if (isSuspended || profile?.status === 'suspended' || profile?.status === 'disabled') {
          if (errorBox) {
            errorBox.textContent = 'חשבונך הושעה על ידי מנהל המערכת. אנא פנה למנהל האפליקציה.';
            errorBox.hidden = false;
          }
          if (window.FitPulseFirebase?.signOut) {
            try { await window.FitPulseFirebase.signOut(); } catch (e) {}
          }
          return;
        }

        if (isNewUser || isPendingApproval || profile?.status === 'pending_approval' || profile?.approvalStatus === 'pending') {
          state.pendingGoogleUser = user;
          if (byId('pendingUserName')) byId('pendingUserName').textContent = user.displayName || user.email.split('@')[0];
          if (byId('pendingUserEmail')) byId('pendingUserEmail').textContent = user.email || '';
          if (byId('pendingUserRoleBadge')) byId('pendingUserRoleBadge').textContent = 'ממתין לאישור מנהל';
          showAuthView('pending');
          return;
        }

        const role = ['manager', 'admin'].includes(profile?.role) ? 'manager' :
          (profile?.role === 'coach' || profile?.isTrainer === true ? 'coach' : 'trainee');
        const appUser = {
          id: user.uid,
          name: profile?.fullName || user.displayName || user.email.split('@')[0],
          email: user.email,
          role,
          isTrainer: role !== 'trainee',
          avatar: profile?.profileImageUrl || user.photoURL || null,
          traineeId: role === 'trainee' ? (profile?.userId || user.uid) : undefined
        };

        loginUser(appUser);
      } catch (err) {
        console.error("Google sign in error:", err);
        if (errorBox) {
          if (err.code === 'auth/popup-closed-by-user') {
            errorBox.textContent = 'חלון ההתחברות של Google נסגר לפני סיום הפעולה.';
          } else if (err.code === 'auth/unauthorized-domain') {
            errorBox.textContent = 'הדומיין המקומי טרם אושר ב-Firebase Console.';
          } else if (err.code === 'auth/popup-blocked') {
            errorBox.textContent = 'חלון ההתחברות נחסם ע"י הדפדפן. יש לאשר חלונות קופצים (Popups) עבור אתר זה.';
          } else {
            errorBox.textContent = `שגיאה בהתחברות באמצעות Google: ${err.message || 'נסה שוב'}`;
          }
          errorBox.hidden = false;
        }
      } finally {
        if (googleBtn) {
          googleBtn.disabled = false;
          if (googleBtn.dataset.originalText) {
            googleBtn.innerHTML = googleBtn.dataset.originalText;
          }
        }
      }
    });

        // Onboarding Role Switcher Handlers & State
    function setOnboardingRole(role) {
      state.onboardingRole = role;
      const isCoach = role === 'coach';
      const cardTrainee = byId('roleCardTrainee');
      const cardCoach = byId('roleCardCoach');
      const secTrainee = byId('onboardingTraineeSection');
      const secCoach = byId('onboardingCoachSection');

      if (cardCoach) cardCoach.classList.toggle('active', isCoach);
      if (cardTrainee) cardTrainee.classList.toggle('active', !isCoach);

      const radioCoach = cardCoach?.querySelector('input');
      const radioTrainee = cardTrainee?.querySelector('input');
      if (radioCoach) radioCoach.checked = isCoach;
      if (radioTrainee) radioTrainee.checked = !isCoach;

      if (secCoach) secCoach.hidden = !isCoach;
      if (secTrainee) secTrainee.hidden = isCoach;
    }

    byId('roleCardTrainee')?.addEventListener('click', (e) => {
      setOnboardingRole('trainee');
    });

    byId('roleCardCoach')?.addEventListener('click', (e) => {
      setOnboardingRole('coach');
    });

    document.querySelectorAll('input[name="onboardingRole"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        setOnboardingRole(e.target.value);
      });
    });

    byId('onboardingCancelBtn')?.addEventListener('click', async () => {
      state.pendingGoogleUser = null;
      if (window.FitPulseFirebase?.signOut) {
        try { await window.FitPulseFirebase.signOut(); } catch (e) { /* ignore */ }
      }
      showAuthView('login');
    });

    // Onboarding Form Submit Handler (Submits registration for Manager Approval)
    byId('authOnboardingForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const errBox = byId('onboardingErrorMessage');
      const submitBtn = byId('onboardingSubmitBtn');
      if (errBox) { errBox.hidden = true; errBox.textContent = ''; }

      const user = state.pendingGoogleUser;
      if (!user) {
        if (errBox) {
          errBox.textContent = 'פג תוקף נתוני Google. יש להתחבר מחדש.';
          errBox.hidden = false;
        }
        showAuthView('login');
        return;
      }

      const roleInput = state.onboardingRole || document.querySelector('input[name="onboardingRole"]:checked')?.value || 'trainee';
      const fullName = byId('onboardingFullName')?.value.trim();
      if (!fullName) {
        if (errBox) {
          errBox.textContent = 'יש להזין שם מלא.';
          errBox.hidden = false;
        }
        return;
      }

      const regPayload = {
        role: roleInput,
        fullName,
        targetCalories: byId('onboardingCalories')?.value || 2200,
        targetProtein: byId('onboardingProtein')?.value || 160,
        targetWater: byId('onboardingWater')?.value || 3000,
        specialty: byId('onboardingSpecialty')?.value || '',
        selfTraining: byId('onboardingSelfTraining')?.checked ?? true
      };

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'מגיש בקשה למנהל המערכת...';
        }

        const registeredProfile = await window.FitPulseFirebase.completeUserRegistration(user, regPayload);

        // Update local state.systemUsers so manager view sees them too
        const existingIdx = state.systemUsers.findIndex(u => u.id === user.uid || u.email === user.email);
        const newUserEntry = {
          id: user.uid,
          userId: user.uid,
          name: registeredProfile.fullName,
          email: user.email,
          role: registeredProfile.role,
          isTrainer: registeredProfile.role === 'coach',
          status: 'pending_approval',
          createdAt: new Date().toISOString()
        };
        if (existingIdx >= 0) {
          state.systemUsers[existingIdx] = { ...state.systemUsers[existingIdx], ...newUserEntry };
        } else {
          state.systemUsers.push(newUserEntry);
        }

        // Populate Pending Approval view
        if (byId('pendingUserName')) byId('pendingUserName').textContent = registeredProfile.fullName;
        if (byId('pendingUserEmail')) byId('pendingUserEmail').textContent = user.email;
        if (byId('pendingUserRoleBadge')) {
          byId('pendingUserRoleBadge').textContent = registeredProfile.role === 'coach'
            ? '👑 מאמן (ממתין לאישור מנהל)'
            : '🏋️ מתאמן (ממתין לאישור מנהל)';
        }
        const img = byId('pendingUserAvatarImg');
        const fallback = byId('pendingUserAvatarFallback');
        if (user.photoURL && img) {
          img.src = user.photoURL;
          img.hidden = false;
          if (fallback) fallback.hidden = true;
        } else {
          if (img) img.hidden = true;
          if (fallback) fallback.hidden = false;
        }

        showAuthView('pending');
      } catch (err) {
        console.error("Registration error:", err);
        if (err.code === 'fitpulse/account-rejected' || err.code === 'fitpulse/account-suspended' || err.message?.includes('נדחתה') || err.message?.includes('הושעה')) {
          state.pendingGoogleUser = null;
          logoutUser();
          const errorBox = byId('authErrorMessage');
          if (errorBox) {
            errorBox.textContent = err.message || 'בקשת הגישה שלך נדחתה על ידי מנהל המערכת. לא ניתן להתחבר.';
            errorBox.hidden = false;
          }
          showAuthView('login');
          return;
        }
        if (errBox) {
          errBox.textContent = `שגיאה בהגשת ההרשמה: ${err.message || 'נסה שוב'}`;
          errBox.hidden = false;
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'סיום הרשמה והגשה לאישור מנהל ✓';
        }
      }
    });

    // Check Approval Status Button (User waiting for manager)
    byId('checkApprovalStatusBtn')?.addEventListener('click', async () => {
      const user = state.pendingGoogleUser;
      const notice = byId('pendingStatusNotice');
      const btn = byId('checkApprovalStatusBtn');
      if (notice) { notice.hidden = true; notice.textContent = ''; }

      if (!user) {
        showAuthView('login');
        return;
      }

      try {
        if (btn) {
          btn.disabled = true;
          btn.textContent = 'בודק סטטוס מול השרת...';
        }

        let profile = null;

        // 1. Check Server API directly
        try {
          const sRes = await fetch(`/api/users/status?userId=${encodeURIComponent(user.uid)}&email=${encodeURIComponent(user.email || '')}`);
          if (sRes.ok) {
            const sData = await sRes.json();
            if (sData.success && sData.user) {
              profile = sData.user;
            }
          }
        } catch (e) {}

        // 2. Check Firestore profile
        if (!profile || profile.status === 'pending_approval') {
          try {
            const fbProfile = await window.FitPulseFirebase?.getUserProfile(user.uid);
            if (fbProfile) profile = { ...profile, ...fbProfile };
          } catch (e) {}
        }

        const restrictedMessage = accountAccessMessage(profile);
        if (restrictedMessage) {
          if (notice) {
            notice.textContent = restrictedMessage;
            notice.hidden = false;
          }
          state.pendingGoogleUser = null;
          if (window.FitPulseFirebase?.signOut) await window.FitPulseFirebase.signOut();
          return;
        }

        if (profile && (profile.status === 'active' || profile.approvalStatus === 'approved')) {
          // Clean stale pending cache in localStorage
          try {
            const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
            const filtered = localPending.filter(u => u.userId !== user.uid && u.id !== user.uid && u.email !== user.email);
            localStorage.setItem('fitpulse_pending_users', JSON.stringify(filtered));
          } catch (e) {}

          const role = ['manager', 'admin'].includes(profile.role) ? 'manager' :
            (profile.role === 'coach' || profile.isTrainer === true ? 'coach' : 'trainee');
          const appUser = {
            id: user.uid,
            name: profile.fullName || profile.name || user.displayName || user.email.split('@')[0],
            email: user.email,
            role,
            isTrainer: role !== 'trainee',
            avatar: profile.profileImageUrl || user.photoURL || null,
            traineeId: role === 'trainee' ? (profile.userId || user.uid) : undefined,
            status: 'active',
            approvalStatus: 'approved'
          };
          state.pendingGoogleUser = null;
          loginUser(appUser);
          alert('✓ חשבונך אושר בהצלחה על ידי מנהל המערכת! ברוך הבא ל-FitPulse.');
          return;
        }

        if (profile && (profile.status === 'rejected' || profile.approvalStatus === 'rejected')) {
          if (notice) {
            notice.textContent = '✕ לצערנו, בקשת ההרשמה נדחתה על ידי מנהל המערכת.';
            notice.hidden = false;
          }
          return;
        }

        if (notice) {
          notice.textContent = '⏳ החשבון עדיין ממתין לאישור מנהל המערכת. נסה לבדוק שוב לאחר שהמנהל יאשר.';
          notice.hidden = false;
        }
      } catch (err) {
        if (notice) {
          notice.textContent = `שגיאה בבדיקת סטטוס: ${err.message}`;
          notice.hidden = false;
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '🔄 בדוק סטטוס אישור כעת';
        }
      }
    });

    // Logout from Pending View
    byId('pendingApprovalLogoutBtn')?.addEventListener('click', async () => {
      state.pendingGoogleUser = null;
      if (window.FitPulseFirebase?.signOut) {
        try { await window.FitPulseFirebase.signOut(); } catch (e) {}
      }
      showAuthView('login');
    });

    byId('headerLogoutBtn')?.addEventListener('click', logoutUser);
    byId('headerCoachModeToggleBtn')?.addEventListener('click', () => {
      if (!isCoachRole() || !state.currentUser) return;
      const previousMode = state.coachViewMode;
      state.coachViewMode = previousMode === 'coaching' ? 'training' : 'coaching';
      if (!writeStorage(STORAGE_KEYS.coachMode, state.coachViewMode)) {
        state.coachViewMode = previousMode;
        applyRoleAuthority('coach');
        return;
      }
      applyRoleAuthority('coach');
      renderAll();
    });

    // If not authenticated in the current session, or URL requests #login, force gate
    if (!sessionStorage.getItem('fitpulse_auth_session') || window.location.hash === '#login') {
      state.currentUser = null;
      localStorage.removeItem('fitpulse_auth_session');
      sessionStorage.removeItem('fitpulse_auth_session');
    }

    // Active session status watcher: immediately kicks out suspended users and updates roles
    async function checkActiveSessionStatus() {
      if (!state.currentUser || isSpecialUser(state.currentUser)) return;
      const uid = state.currentUser.id || state.currentUser.uid;
      if (!uid) return;

      try {
        const res = await fetch(`/api/users/status?userId=${encodeURIComponent(uid)}&email=${encodeURIComponent(state.currentUser.email || '')}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.success || !data.user) return;
        const userDoc = data.user;

        // 1. Kickout suspended or rejected user immediately
        const restriction = accountAccessMessage(userDoc);
        if (restriction) {
          console.warn('[SessionGuard] Active user account was restricted:', restriction);
          logoutUser();
          const errorBox = byId('authErrorMessage');
          if (errorBox) {
            errorBox.textContent = restriction;
            errorBox.hidden = false;
          }
          showAuthView('login');
          return;
        }

        // 2. Synchronize role change (e.g. upgraded to coach or trainee)
        if (userDoc.role && userDoc.role !== state.currentUser.role) {
          console.log(`[SessionGuard] Role updated: ${state.currentUser.role} -> ${userDoc.role}`);
          const newRole = userDoc.role;
          state.currentUser.role = newRole;
          state.currentUser.isTrainer = (newRole === 'coach');
          writeSession('fitpulse_auth_session', state.currentUser);
          applyRoleAuthority(newRole);
          updateHeaderUserChip();
          if (newRole === 'coach' && state.activeTab === 'tab-dashboard') {
            setTab('tab-coach');
          } else if (newRole === 'trainee' && state.activeTab === 'tab-coach') {
            setTab('tab-dashboard');
          }
          renderAll();
        }
      } catch (e) {}
    }

    // Check status immediately on load, on focus, and every 3 seconds
    if (state.currentUser && !isSpecialUser(state.currentUser)) {
      checkActiveSessionStatus();
    }
    setInterval(checkActiveSessionStatus, 3000);
    window.addEventListener('focus', checkActiveSessionStatus);

    // Strict Auth Guard on startup session
    if (state.currentUser) {
      const startupRestriction = accountAccessMessage(state.currentUser);
      if (startupRestriction) {
        logoutUser();
        const errorBox = byId('authErrorMessage');
        if (errorBox) {
          errorBox.textContent = startupRestriction;
          errorBox.hidden = false;
        }
        showAuthView('login');
      } else {
        const overlay = byId('authGateOverlay');
        if (overlay) {
          overlay.hidden = true;
          overlay.style.display = 'none';
        }
        applyRoleAuthority(state.currentUser.role);
        updateHeaderUserChip();
      }
    } else {
      const overlay = byId('authGateOverlay');
      if (overlay) {
        overlay.hidden = false;
        overlay.style.display = 'flex';
      }
      showAuthView('login');
      applyRoleAuthority('trainee');
      updateHeaderUserChip();
    }
    if (window.FitPulseFirebase?.isConfigured && window.FitPulseFirebase?.onAuthStateChanged) {
      window.FitPulseFirebase.onAuthStateChanged(async authUser => {
        if (!authUser) return;
        // CRITICAL GUARD: Never touch or kick out special user sessions
        if (state.currentUser && isSpecialUser(state.currentUser)) return;

        if (state.currentUser && state.currentUser.id === authUser.uid) {
          try {
            const profile = await window.FitPulseFirebase.getLoginProfile(authUser) ||
                            await window.FitPulseFirebase.getUserProfile(authUser.uid);
            const restrictedMessage = accountAccessMessage(profile);
            if (restrictedMessage) {
              if (window.FitPulseFirebase?.signOut) {
                try { await window.FitPulseFirebase.signOut(); } catch (e) {}
              }
              logoutUser();
              const errorBox = byId('authErrorMessage');
              if (errorBox) {
                errorBox.textContent = restrictedMessage;
                errorBox.hidden = false;
              }
              showAuthView('login');
              return;
            }
          } catch (error) {
            console.error('[Auth] Could not verify account status.', error);
          }
        }
      });
    }
  }

  function initCoachRegisterModal() {
    const modal = byId('coachRegisterTraineeModal');
    const openButtons = [byId('coachRegisterTraineeBtn'), byId('coachConnectTraineeBtn')].filter(Boolean);
    const closeBtn = byId('closeRegisterTraineeModalBtn');
    const cancelBtn = byId('cancelRegisterTraineeBtn');
    const form = byId('coachRegisterTraineeForm');
    const traineeIdInput = byId('coachTraineeUid');
    const status = byId('coachConnectionRequestStatus');

    const closeModal = () => {
      if (modal) modal.hidden = true;
    };

    openButtons.forEach(button => button.addEventListener('click', () => {
      if (modal) modal.hidden = false;
      if (status) status.textContent = '';
      traineeIdInput?.focus();
    }));
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', event => {
      if (event.target === modal) closeModal();
    });

    form?.addEventListener('submit', async event => {
      event.preventDefault();
      const traineeId = traineeIdInput?.value.trim();
      const submitBtn = byId('submitRegisterTraineeBtn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'שולח בקשה...';
      }

      try {
        if (!traineeId) throw new Error('יש להזין UID של מתאמן קיים.');
        const coachName = state.currentUser?.name || state.currentUser?.displayName || 'מאמן';
        await window.FitPulseFirebase.requestTraineeConnection(traineeId, coachName);
        closeModal();
        form.reset();
        if (status) status.textContent = 'בקשת החיבור נשלחה. המשתמש יצטרך לאשר לפני יצירת קשר פעיל.';
        await renderCoachPendingLinks();
      } catch (error) {
        console.error('[Coach] Could not send trainee connection request.', error);
        if (status) status.textContent = `לא ניתן לשלוח את הבקשה: ${error.message || error}`;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'שליחת בקשת חיבור';
        }
      }
    });
  }

  let auditLogsSubscribed = false;

  async function renderAppManager() {
    if (!isManagerRole()) return;

    let systemData = null;
    const startTime = performance.now();
    try {
      const res = await fetch('/api/system/status');
      if (res.ok) {
        systemData = await res.json();
        const latencyMs = Math.round(performance.now() - startTime);
        if (byId('managerFirestoreLatency')) {
          byId('managerFirestoreLatency').textContent = `זמן תגובה: ~${latencyMs}ms`;
        }
      }
    } catch (err) {
      console.warn('[AppManager] Could not fetch system status:', err);
    }

    if (systemData?.database) {
      if (byId('managerTotalReportsMetric')) {
        byId('managerTotalReportsMetric').textContent = `${systemData.database.totalReportsLogged || 192} דוחות מאוחסנים`;
      }
      if (byId('managerTraineesCountMetric')) {
        byId('managerTraineesCountMetric').textContent = `${systemData.database.traineesCount || 4} תיקיות מתאמנים פעילות`;
      }
    }

    const renderLogs = (logs) => {
      const container = byId('managerActivityStream');
      if (!container) return;
      if (!logs || !logs.length) {
        container.innerHTML = '<div class="manager-log-item"><span class="manager-log-desc">אין תיעוד פעילות זמין כעת.</span></div>';
        return;
      }
      container.replaceChildren();
      logs.slice(0, 30).forEach(log => {
        const item = createElement('div', 'manager-log-item');
        const descSpan = createElement('span', 'manager-log-desc');
        const badge = createElement('span', `header-user-role-badge ${log.type?.includes('LOGIN') ? 'role-coach' : log.type?.includes('REGISTER') ? 'role-manager' : 'role-trainee'}`);
        badge.style.marginInlineEnd = '8px';
        badge.textContent = log.type || 'EVENT';
        descSpan.append(badge, document.createTextNode(log.description || ''));

        const date = log.timestamp ? new Date(log.timestamp) : new Date();
        const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const dateStr = date.toLocaleDateString('he-IL');
        const timeSpan = createElement('span', 'manager-log-time', `${dateStr} ${timeStr}`);

        item.append(descSpan, timeSpan);
        container.append(item);
      });
    };

    if (systemData?.auditLogs && Array.isArray(systemData.auditLogs)) {
      state.auditLogs = systemData.auditLogs;
      renderLogs(state.auditLogs);
    }

    if (!auditLogsSubscribed && window.FitPulseFirebase?.subscribeToAuditLogs) {
      auditLogsSubscribed = true;
      window.FitPulseFirebase.subscribeToAuditLogs(liveLogs => {
        if (Array.isArray(liveLogs) && liveLogs.length) {
          state.auditLogs = liveLogs;
          renderLogs(state.auditLogs);
        }
      });
    }

    try {
      const uRes = await fetch('/api/users');
      if (uRes.ok) {
        const uData = await uRes.json();
        if (uData.success && Array.isArray(uData.users)) {
          uData.users.forEach(sUser => {
            const idx = state.systemUsers.findIndex(u => u.id === sUser.id || (u.email && u.email.toLowerCase() === (sUser.email || '').toLowerCase()));
            if (idx >= 0) {
              state.systemUsers[idx] = { ...state.systemUsers[idx], ...sUser };
            } else {
              state.systemUsers.push(sUser);
            }
          });
        }
      }
    } catch (uErr) {
      console.warn('[AppManager] Could not fetch server users:', uErr.message);
    }

    if (window.FitPulseFirebase?.isConfigured && window.FitPulseFirebase?.listManagedUsers) {
      try {
        const cloudUsers = await window.FitPulseFirebase.listManagedUsers();
        cloudUsers.forEach(cloudUser => {
          const idx = state.systemUsers.findIndex(user =>
            user.id === cloudUser.id ||
            user.id === cloudUser.userId ||
            (user.email && user.email.toLowerCase() === (cloudUser.email || '').toLowerCase())
          );
          if (idx >= 0) state.systemUsers[idx] = { ...state.systemUsers[idx], ...cloudUser };
          else state.systemUsers.push(cloudUser);
        });
      } catch (error) {
        console.warn('[AppManager] Could not refresh users from Firestore:', error.message);
      }
    }

    renderManagerPendingApprovals();
    renderManagerUsersTable();

    if (!byId('managerPingFirebaseBtn')?.hasAttribute('data-bound')) {
      byId('managerPingFirebaseBtn')?.setAttribute('data-bound', 'true');
      byId('managerPingFirebaseBtn')?.addEventListener('click', async () => {
        const btn = byId('managerPingFirebaseBtn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'בודק Ping...';
        const start = performance.now();
        try {
          const res = await fetch('/api/system/status');
          const elapsed = Math.round(performance.now() - start);
          if (res.ok) {
            alert(`חיבור הענן תקין!\nזמן תגובה (Latency): ${elapsed}ms\nסטטוס Firestore: me-west1 (ישראל) מחובר.\nכל השירותים פועלים ללא תקלות.`);
          } else {
            alert(`תגובת השרת: ${res.status} (זמן: ${elapsed}ms)`);
          }
        } catch (e) {
          alert('שגיאת תקשורת בבדיקת פינג: ' + e.message);
        } finally {
          btn.disabled = false;
          btn.textContent = originalText;
          renderAppManager();
        }
      });
    }

    if (!byId('managerResyncBtn')?.hasAttribute('data-bound')) {
      byId('managerResyncBtn')?.setAttribute('data-bound', 'true');
      byId('managerResyncBtn')?.addEventListener('click', () => {
        renderAppManager();
        renderCoach();
        alert('כל הנתונים, הדוחות ומדדי המערכת סונכרנו בהצלחה מול השרת.');
      });
    }

    if (!byId('managerUserSearch')?.hasAttribute('data-bound')) {
      byId('managerUserSearch')?.setAttribute('data-bound', 'true');
      byId('managerUserSearch')?.addEventListener('input', event => {
        state.managerUserSearch = event.currentTarget.value.trim().toLowerCase();
        renderManagerUsersTable();
      });
    }

    if (!byId('managerRoleFilter')?.hasAttribute('data-bound')) {
      byId('managerRoleFilter')?.setAttribute('data-bound', 'true');
      byId('managerRoleFilter')?.addEventListener('change', event => {
        state.managerRoleFilter = event.currentTarget.value;
        renderManagerUsersTable();
      });
    }
  }

  async function renderManagerPendingApprovals() {
    const badge = byId('managerPendingCountBadge');
    const emptyNotice = byId('emptyPendingNotice');
    const tableWrapper = byId('pendingApprovalsTableWrapper');
    const tbody = byId('managerPendingTableRows');
    if (!tbody) return;

    let cloudPending = [];
    if (window.FitPulseFirebase?.getPendingApprovals) {
      try {
        cloudPending = await window.FitPulseFirebase.getPendingApprovals();
      } catch (e) {
        console.warn("[AppManager] Could not fetch cloud pending approvals:", e.message);
      }
    }

    const localPending = (state.systemUsers || []).filter(u => u.status === 'pending_approval');
    const combined = [...localPending];
    cloudPending.forEach(cp => {
      const exists = combined.some(u => (u.id === cp.userId || u.id === cp.uid || u.email === cp.email));
      if (!exists) {
        combined.push({
          id: cp.userId || cp.uid,
          name: cp.fullName || cp.email.split('@')[0],
          email: cp.email,
          role: cp.role || (cp.isTrainer ? 'coach' : 'trainee'),
          status: 'pending_approval',
          createdAt: cp.createdAt?.toDate ? cp.createdAt.toDate().toISOString() : new Date().toISOString()
        });
      }
    });

    if (badge) {
      badge.textContent = `${combined.length} ממתינים`;
      badge.style.background = combined.length ? 'rgba(245, 158, 11, 0.25)' : 'rgba(16, 185, 129, 0.15)';
      badge.style.color = combined.length ? '#fbbf24' : '#34d399';
    }

    tbody.replaceChildren();

    if (!combined.length) {
      if (emptyNotice) emptyNotice.hidden = false;
      if (tableWrapper) tableWrapper.hidden = true;
      return;
    }

    if (emptyNotice) emptyNotice.hidden = true;
    if (tableWrapper) tableWrapper.hidden = false;

    combined.forEach(pUser => {
      const tr = createElement('tr', '');

      // Name & Avatar
      const tdName = createElement('td', '');
      const nameWrap = createElement('div', '');
      nameWrap.style.display = 'flex';
      nameWrap.style.alignItems = 'center';
      nameWrap.style.gap = '8px';
      const av = createElement('span', 'header-user-avatar', pUser.name ? pUser.name.slice(0, 2) : 'FP');
      av.style.width = '26px';
      av.style.height = '26px';
      av.style.fontSize = '0.72rem';
      const strong = createElement('strong', '', pUser.name || 'משתמש חדש');
      nameWrap.append(av, strong);
      tdName.append(nameWrap);

      // Email
      const tdEmail = createElement('td', 'timeline-sub', pUser.email || pUser.id);

      // Role badge
      const tdRole = createElement('td', '');
      const isCoach = pUser.role === 'coach';
      const roleBadge = createElement('span', `header-user-role-badge ${isCoach ? 'role-coach' : 'role-trainee'}`);
      roleBadge.textContent = isCoach ? '👑 מאמן (Trainer)' : '🏋️ מתאמן (Trainee)';
      tdRole.append(roleBadge);

      // Date
      const regDate = pUser.createdAt ? new Date(pUser.createdAt) : new Date();
      const tdDate = createElement('td', 'timeline-sub', `${regDate.toLocaleDateString('he-IL')} ${regDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`);

      // Actions
      const tdActions = createElement('td', '');
      const approveBtn = createElement('button', 'btn-approve-user', '✓ אשר חשבון');
      const rejectBtn = createElement('button', 'btn-reject-user', '✕ דחה');

      approveBtn.addEventListener('click', async () => {
        approveBtn.disabled = true;
        approveBtn.textContent = 'מאשר...';
        try {
          try {
            await fetch('/api/users/approve', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: pUser.id })
            });
          } catch (be) {}
          if (window.FitPulseFirebase?.approveUser) {
            await window.FitPulseFirebase.approveUser(pUser.id);
          }
          const found = state.systemUsers.find(u => u.id === pUser.id || u.email === pUser.email);
          if (found) {
            found.status = 'active';
          } else {
            state.systemUsers.push({ ...pUser, status: 'active' });
          }
          alert(`✓ החשבון של ${pUser.name} (${pUser.email}) אושר בהצלחה כ-${isCoach ? 'מאמן' : 'מתאמן'}!`);
          renderAppManager();
        } catch (err) {
          alert(`שגיאה באישור המשתמש: ${err.message}`);
          approveBtn.disabled = false;
          approveBtn.textContent = '✓ אשר חשבון';
        }
      });

      rejectBtn.addEventListener('click', async () => {
        if (!confirm(`האם אתה בטוח שברצונך לדחות את בקשת ההרשמה של ${pUser.name}?`)) return;
        rejectBtn.disabled = true;
        try {
          try {
            await fetch('/api/users/reject', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: pUser.id })
            });
          } catch (be) {}
          if (window.FitPulseFirebase?.rejectUser) {
            await window.FitPulseFirebase.rejectUser(pUser.id);
          }
          const found = state.systemUsers.find(u => u.id === pUser.id || u.email === pUser.email);
          if (found) found.status = 'rejected';
          renderAppManager();
        } catch (err) {
          alert(`שגיאה בדחיית המשתמש: ${err.message}`);
          rejectBtn.disabled = false;
        }
      });

      tdActions.append(approveBtn, rejectBtn);
      tr.append(tdName, tdEmail, tdRole, tdDate, tdActions);
      tbody.append(tr);
    });
  }

  function renderManagerUsersTable() {
    const tbody = byId('managerUsersTableRows');
    if (!tbody) return;
    tbody.replaceChildren();

    const query = state.managerUserSearch || '';
    const roleFilter = state.managerRoleFilter || 'all';

    const filtered = state.systemUsers.filter(user => {
      const matchesQuery = !query ||
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.id?.toLowerCase().includes(query);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesQuery && matchesRole;
    });

    if (!filtered.length) {
      const row = createElement('tr', '');
      const cell = createElement('td', '', 'לא נמצאו משתמשים התואמים את הסינון.');
      cell.setAttribute('colspan', '6');
      cell.style.textAlign = 'center';
      cell.style.padding = '20px';
      cell.style.color = 'var(--text-dim)';
      row.append(cell);
      tbody.append(row);
      return;
    }

    filtered.forEach(user => {
      const tr = createElement('tr', '');

      const tdName = createElement('td', '');
      const nameWrap = createElement('div', '');
      nameWrap.style.display = 'flex';
      nameWrap.style.alignItems = 'center';
      nameWrap.style.gap = '8px';
      const avatar = createElement('span', 'header-user-avatar', user.name ? user.name.slice(0, 2) : 'FP');
      avatar.style.width = '26px';
      avatar.style.height = '26px';
      avatar.style.fontSize = '0.72rem';
      const strong = createElement('strong', '', user.name || 'משתמש');
      nameWrap.append(avatar, strong);
      tdName.append(nameWrap);

      const tdEmail = createElement('td', 'timeline-sub', user.email || user.id);

      const tdRole = createElement('td', '');
      const roleBadge = createElement('span', `header-user-role-badge ${user.role === 'manager' ? 'role-manager' : user.role === 'coach' ? 'role-coach' : 'role-trainee'}`);
      roleBadge.textContent = user.role === 'manager' ? 'מנהל מערכת' : user.role === 'coach' ? 'מאמן ראשי' : 'מתאמן';
      tdRole.append(roleBadge);

      const tdRoutine = createElement('td', 'timeline-sub', user.routine || (user.role === 'manager' ? 'ניהול על' : user.role === 'coach' ? 'צוות אימון' : 'ללא תוכנית'));

      const tdStatus = createElement('td', '');
      let statusText = 'פעיל';
      let statusClass = 'manager-status-indicator status-online';
      if (user.status === 'pending_approval') {
        statusText = 'ממתין לאישור';
        statusClass = 'manager-status-indicator status-busy';
      } else if (user.status === 'suspended') {
        statusText = 'מושעה';
        statusClass = 'manager-status-indicator status-offline';
      } else if (user.status === 'rejected') {
        statusText = 'נדחה';
        statusClass = 'manager-status-indicator status-offline';
      }
      const statusBadge = createElement('span', statusClass, statusText);
      tdStatus.append(statusBadge);

      const tdActions = createElement('td', '');
      if (user.status === 'pending_approval') {
        const approveQuickBtn = createElement('button', 'btn-approve-user', '✓ אשר כעת');
        approveQuickBtn.addEventListener('click', async () => {
          approveQuickBtn.disabled = true;
          try {
            try {
              await fetch('/api/users/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
              });
            } catch (be) {}
            if (window.FitPulseFirebase?.approveUser) {
              await window.FitPulseFirebase.approveUser(user.id);
            }
            user.status = 'active';
            renderAppManager();
            alert(`✓ החשבון של ${user.name} אושר בהצלחה!`);
          } catch (e) {
            alert('שגיאה באישור: ' + e.message);
            approveQuickBtn.disabled = false;
          }
        });
        tdActions.append(approveQuickBtn);
      } else {
        const isUserRejected = user.status === 'rejected' || user.approvalStatus === 'rejected';
        const isUserSuspended = user.status === 'suspended';
        const isProtectedSpecial = isSpecialUser(user);

        if (isProtectedSpecial) {
          const specialTag = createElement('span', 'manager-special-badge', '⭐ משתמש מוגן לבדיקות');
          specialTag.style.cssText = 'font-size: 0.72rem; color: #38bdf8; font-weight: 600; padding: 2px 8px; border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 4px; background: rgba(56, 189, 248, 0.08);';
          tdActions.append(specialTag);
        } else {
          // Suspend / Unsuspend toggle (shown for non-rejected, non-manager users)
          if (!isUserRejected && user.role !== 'manager') {
            if (isUserSuspended) {
              // "Unsuspend" → resets to pending_approval for review, not instant active
              const unsuspendBtn = createElement('button', 'btn-action-primary', 'בטל השעיה');
              unsuspendBtn.type = 'button';
              unsuspendBtn.style.marginInlineEnd = '6px';
              unsuspendBtn.addEventListener('click', async () => {
                unsuspendBtn.disabled = true;
                try {
                  try {
                    await fetch('/api/users/status', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, status: 'pending_approval', approvalStatus: 'pending' })
                    });
                  } catch (be) {}
                  if (window.FitPulseFirebase?.setUserStatus) {
                    await window.FitPulseFirebase.setUserStatus(user.id, 'pending_approval');
                  }
                  user.status = 'pending_approval';
                  user.approvalStatus = 'pending';
                  renderManagerUsersTable();
                } catch (error) {
                  console.error('[AppManager] Could not unsuspend user.', error);
                  alert(`לא ניתן לבטל את ההשעיה: ${error.message || error}`);
                  unsuspendBtn.disabled = false;
                }
              });
              tdActions.append(unsuspendBtn);
            } else {
              // Suspend active user
              const suspendBtn = createElement('button', 'btn-action-ghost', 'השעה');
              suspendBtn.type = 'button';
              suspendBtn.style.marginInlineEnd = '6px';
              suspendBtn.style.color = 'var(--danger, #e53935)';
              suspendBtn.addEventListener('click', async () => {
                if (!confirm(`להשעות את החשבון של ${user.name}?`)) return;
                suspendBtn.disabled = true;
                try {
                  try {
                    await fetch('/api/users/status', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, status: 'suspended' })
                    });
                  } catch (be) {}
                  if (window.FitPulseFirebase?.setUserStatus) {
                    await window.FitPulseFirebase.setUserStatus(user.id, 'suspended');
                  }
                  user.status = 'suspended';
                  renderManagerUsersTable();
                } catch (error) {
                  console.error('[AppManager] Could not suspend user.', error);
                  alert(`לא ניתן להשעות את המשתמש: ${error.message || error}`);
                  suspendBtn.disabled = false;
                }
              });
              tdActions.append(suspendBtn);
            }
          }

          // "Cancel Rejection" → resets to pending_approval for re-review (NOT instant active)
          if (isUserRejected) {
            const cancelRejectionBtn = createElement('button', 'btn-action-primary', 'ביטול דחייה');
            cancelRejectionBtn.type = 'button';
            cancelRejectionBtn.style.marginInlineEnd = '6px';
            cancelRejectionBtn.addEventListener('click', async () => {
              cancelRejectionBtn.disabled = true;
              try {
                try {
                  await fetch('/api/users/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, status: 'pending_approval', approvalStatus: 'pending' })
                  });
                } catch (be) {}
                if (window.FitPulseFirebase?.setUserStatus) {
                  await window.FitPulseFirebase.setUserStatus(user.id, 'pending_approval');
                }
                user.status = 'pending_approval';
                user.approvalStatus = 'pending';
                renderManagerUsersTable();
              } catch (error) {
                console.error('[AppManager] Could not cancel user rejection.', error);
                alert(`לא ניתן לבטל את דחיית המשתמש: ${error.message || error}`);
                cancelRejectionBtn.disabled = false;
              }
            });
            tdActions.append(cancelRejectionBtn);

            // Permanent Delete (only shown for rejected users)
            const deleteBtn = createElement('button', 'btn-action-ghost', '🗑 מחק לצמיתות');
            deleteBtn.type = 'button';
            deleteBtn.style.color = 'var(--danger, #e53935)';
            deleteBtn.style.fontSize = '0.72rem';
            deleteBtn.addEventListener('click', async () => {
              if (!confirm(`למחוק לצמיתות את החשבון של ${user.name || user.email}? פעולה זו אינה הפיכה!`)) return;
              deleteBtn.disabled = true;
              try {
                try {
                  await fetch(`/api/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
                } catch (be) {}
                if (window.FitPulseFirebase?.deleteUserAccount) {
                  await window.FitPulseFirebase.deleteUserAccount(user.id);
                }
                state.systemUsers = state.systemUsers.filter(u => u.id !== user.id);
                renderManagerUsersTable();
                alert(`✓ החשבון של ${user.name || user.email} נמחק לצמיתות.`);
              } catch (error) {
                console.error('[AppManager] Could not delete user.', error);
                alert(`לא ניתן למחוק את המשתמש: ${error.message || error}`);
                deleteBtn.disabled = false;
              }
            });
            tdActions.append(deleteBtn);
          }

          // Role toggle — hidden for rejected users and managers
          if (!isUserRejected && !isUserSuspended && user.role !== 'manager') {
            const toggleRoleBtn = createElement('button', 'btn-action-ghost', user.role === 'trainee' ? 'שדרוג למאמן' : 'שינוי למתאמן');
            toggleRoleBtn.style.padding = '3px 8px';
            toggleRoleBtn.style.fontSize = '0.72rem';

            toggleRoleBtn.addEventListener('click', async () => {
              const nextRole = user.role === 'trainee' ? 'coach' : 'trainee';
              toggleRoleBtn.disabled = true;
              try {
                try {
                  await fetch('/api/users/role', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, role: nextRole })
                  });
                } catch (be) {}
                if (window.FitPulseFirebase?.setUserRole) {
                  await window.FitPulseFirebase.setUserRole(user.id, nextRole);
                }
                user.role = nextRole;
                user.isTrainer = nextRole === 'coach';
                renderManagerUsersTable();
                if (state.currentUser?.id === user.id) {
                  state.currentUser = { ...state.currentUser, role: nextRole, isTrainer: user.isTrainer };
                  writeSession('fitpulse_auth_session', state.currentUser);
                  applyRoleAuthority(nextRole);
                  updateHeaderUserChip();
                  setTab(nextRole === 'coach' ? 'tab-coach' : 'tab-dashboard');
                }
              } catch (error) {
                console.error('[AppManager] Could not persist user role change.', error);
                alert(`לא ניתן לשנות את תפקיד המשתמש: ${error.message || error}`);
                toggleRoleBtn.disabled = false;
              }
            });
            tdActions.append(toggleRoleBtn);
          }
        }
      }

      tr.append(tdName, tdEmail, tdRole, tdRoutine, tdStatus, tdActions);
      tbody.append(tr);
    });
  }

  function bindEvents() {
    document.querySelectorAll('.nav-tab-btn').forEach(button => {
      button.addEventListener('click', () => setTab(button.getAttribute('data-tab')));
    });
    byId('brandHomeBtn')?.addEventListener('click', () => setTab('tab-dashboard'));
    byId('brandHomeBtn')?.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') setTab('tab-dashboard');
    });
    byId('headerStartWorkoutBtn')?.addEventListener('click', () => {
      const plan = FIT_DATA.presetWorkouts.find(item => item.section === 'individual_session') ||
        FIT_DATA.presetWorkouts[0];
      if (plan) startWorkout(plan);
    });
    byId('demoRoleToggleBtn')?.addEventListener('click', () => {
      state.profile.role = isTrainerRole() ? 'trainee' : 'trainer_admin';
      if (state.profile.role === 'trainee' && state.selectedTraineeId) {
        state.profile.demoTraineeId = state.selectedTraineeId;
      }
      if (!writeStorage(STORAGE_KEYS.profile, state.profile)) return;
      if (isTrainerRole()) {
        window.location.hash = '#/admin/dashboard';
        setTab('tab-coach');
      } else {
        window.location.hash = '#/';
        setTab('tab-dashboard');
      }
      renderAll();
    });
    byId('dashboardAddMealBtn')?.addEventListener('click', () => setTab('tab-nutrition'));
    let searchDebounce;
    byId('foodSearchInput')?.addEventListener('input', event => {
      const query = event.currentTarget.value;
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(() => {
        state.foodQuery = query;
        searchRemoteFoods(query);
        byId('foodSearchInput')?.focus();
      }, 200);
    });
    byId('workoutTemplateSearch')?.addEventListener('input', event => {
      state.workoutQuery = event.currentTarget.value;
      renderWorkoutsTab();
      byId('workoutTemplateSearch')?.focus();
    });
    byId('openBarcodeScannerBtn')?.addEventListener('click', () => {
      const dialog = byId('barcodeScannerDialog');
      if (dialog) dialog.hidden = false;
      if (byId('barcodeScannerStatus')) byId('barcodeScannerStatus').textContent = 'המצלמה עדיין לא הופעלה.';
    });
    byId('voiceNutritionBtn')?.addEventListener('click', startVoiceNutritionRecording);
    byId('voiceNutritionStopBtn')?.addEventListener('click', stopVoiceNutritionRecording);
    byId('closeBarcodeScannerBtn')?.addEventListener('click', () => {
      stopBarcodeScanner();
      if (byId('barcodeScannerDialog')) byId('barcodeScannerDialog').hidden = true;
    });
    byId('startBarcodeScannerBtn')?.addEventListener('click', startBarcodeScanner);
    byId('barcodeManualLookupForm')?.addEventListener('submit', event => {
      event.preventDefault();
      stopBarcodeScanner();
      resolveScannedCode(byId('barcodeManualInput')?.value || '');
    });
    byId('openManualFoodBtn')?.addEventListener('click', () => {
      stopBarcodeScanner();
      openBarcodeFoodEditor({
        title: 'הזנת מוצר חדש',
        hint: 'הזינו ידנית את שם המוצר והערכים ל־100 גרם.',
        source: 'manual'
      });
    });
    byId('barcodeFoodEditorForm')?.addEventListener('submit', submitBarcodeFoodEditor);
    byId('closeBarcodeFoodEditorBtn')?.addEventListener('click', closeBarcodeFoodEditor);
    byId('traineeCoachLinkForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const select = byId('traineeCoachSelect');
      const submitBtn = byId('traineeCoachLinkBtn');
      const coachId = select?.value;
      if (!coachId) {
        alert('יש לבחור מאמן מתוך הרשימה.');
        return;
      }
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'שולח בקשה...';
      }
      try {
        const traineeId = getAuthUserId() || state.currentUser?.id;
        const traineeName = state.currentUser?.name || state.profile.name || 'מתאמן';
        if (window.FitPulseFirebase?.requestCoachConnection) {
          await window.FitPulseFirebase.requestCoachConnection(traineeId, coachId, traineeName);
        }
        alert('✓ בקשת החיבור נשלחה בהצלחה למאמן וממתינה לאישורו!');
        await renderTraineeCoachLinkCard();
      } catch (error) {
        alert(error.message || 'שליחת בקשת החיבור נכשלה.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'שלח בקשה';
        }
      }
    });
    byId('traineeCoachSearchInput')?.addEventListener('input', renderTraineeCoachLinkCard);
    byId('coachDirectoryOptIn')?.addEventListener('change', async event => {
      const status = byId('coachDirectoryStatus');
      const checkbox = event.currentTarget;
      if (!isCoachModeActive()) {
        checkbox.checked = false;
        if (status) status.textContent = '';
        return;
      }
      checkbox.disabled = true;
      if (status) status.textContent = 'שומר הגדרה…';
      try {
        await window.FitPulseFirebase.setCoachDirectoryListing(
          checkbox.checked,
          state.currentUser?.name || state.profile.name || 'מאמן'
        );
        if (state.currentUser) {
          state.currentUser.isPublicVisible = checkbox.checked;
          writeSession('fitpulse_auth_session', state.currentUser);
        }
        if (status) status.textContent = checkbox.checked
          ? 'חשיפה למתאמנים חדשים: פעיל (מופיע במדריך הציבורי)'
          : 'חשיפה למתאמנים חדשים: כבוי (מוסתר מהמדריך)';
      } catch (error) {
        checkbox.checked = !checkbox.checked;
        if (status) status.textContent = error.message || 'עדכון המדריך נכשל.';
      } finally {
        checkbox.disabled = false;
      }
    });
    byId('coachPermissionRequestForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const status = byId('coachPermissionRequestStatus');
      const traineeId = state.selectedTraineeId;
      const categories = [...event.currentTarget.querySelectorAll('input[name="coachPermissionCategory"]:checked')]
        .map(input => input.value);
      try {
        if (!traineeId) throw new Error('בחרו מתאמן מחובר לפני שליחת בקשת הרשאה.');
        await window.FitPulseFirebase.createCoachPermissionRequest(
          traineeId,
          categories,
          state.currentUser?.name || state.profile.name || 'מאמן'
        );
        if (status) status.textContent = 'בקשת ההרשאה נשלחה למתאמן.';
        event.currentTarget.reset();
      } catch (error) {
        if (status) status.textContent = error.message || 'שליחת בקשת ההרשאה נכשלה.';
      }
    });
    byId('coachTaskForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const status = byId('coachTaskStatus');
      const traineeId = state.selectedTraineeId;
      const validated = window.FitPulseDomain?.validateCoachTask?.({
        type: byId('coachTaskType')?.value,
        title: byId('coachTaskTitle')?.value
      });
      try {
        if (!traineeId) throw new Error('בחרו מתאמן מחובר לפני שליחת משימה.');
        if (!validated?.ok) throw new Error(validated?.error || 'פרטי המשימה אינם תקינים.');
        await window.FitPulseFirebase.createCoachTask(traineeId, validated.task.type, validated.task.title);
        if (status) status.textContent = 'המשימה נשלחה למתאמן.';
        event.currentTarget.reset();
        if (byId('coachTaskTitle')) byId('coachTaskTitle').value = 'נדרשת שקילה';
      } catch (error) {
        console.error('Could not assign coach task.', error);
        if (status) status.textContent = error.message || 'שליחת המשימה נכשלה.';
      }
    });
    byId('barcodeScannerDialog')?.addEventListener('click', event => {
      if (event.target === byId('barcodeScannerDialog')) {
        stopBarcodeScanner();
        byId('barcodeScannerDialog').hidden = true;
      }
    });
    byId('closeExerciseLibraryBtn')?.addEventListener('click', closeExerciseLibrary);
    byId('exerciseLibraryDoneBtn')?.addEventListener('click', () => {
      state.exerciseLibraryOnDone?.(state.exerciseLibrarySelection);
      closeExerciseLibrary();
    });
    byId('closeExerciseSwapBtn')?.addEventListener('click', closeExerciseSwap);
    byId('exerciseSwapDialog')?.addEventListener('click', event => {
      if (event.target === byId('exerciseSwapDialog')) closeExerciseSwap();
    });
    byId('exerciseSwapSearch')?.addEventListener('input', event => {
      if (!exerciseSwapContext) return;
      exerciseSwapContext.query = event.currentTarget.value;
      renderExerciseSwapList();
    });
    byId('exerciseSwapEquipmentFilter')?.addEventListener('change', event => {
      if (!exerciseSwapContext) return;
      exerciseSwapContext.equipment = event.currentTarget.value;
      renderExerciseSwapList();
    });
    byId('swapTabEquiv')?.addEventListener('click', () => {
      setExerciseSwapTab('equiv');
      renderExerciseSwapList();
    });
    byId('swapTabMuscle')?.addEventListener('click', () => {
      setExerciseSwapTab('muscle');
      renderExerciseSwapList();
    });
    byId('swapTabAll')?.addEventListener('click', () => {
      setExerciseSwapTab('all');
      renderExerciseSwapList();
    });
    byId('restHudAdd30Btn')?.addEventListener('click', () => adjustRestTimer(30));
    byId('restHudSub15Btn')?.addEventListener('click', () => adjustRestTimer(-15));
    byId('restHudSkipBtn')?.addEventListener('click', skipRestTimer);
    byId('exerciseLibrarySearch')?.addEventListener('input', event => {
      state.exerciseQuery = event.currentTarget.value;
      if (state.exerciseLibrarySelection && state.exerciseLibraryOnToggle) {
        renderExerciseLibrary(state.exerciseLibrarySelection, state.exerciseLibraryOnToggle);
        byId('exerciseLibrarySearch').value = state.exerciseQuery;
        byId('exerciseLibrarySearch').focus();
      }
    });
    byId('exerciseEquipmentFilter')?.addEventListener('change', event => {
      state.exerciseEquipment = event.currentTarget.value;
      if (state.exerciseLibrarySelection && state.exerciseLibraryOnToggle) {
        renderExerciseLibrary(state.exerciseLibrarySelection, state.exerciseLibraryOnToggle);
        byId('exerciseLibrarySearch').value = state.exerciseQuery;
      }
    });
    byId('exerciseLibraryDialog')?.addEventListener('click', event => {
      if (event.target === byId('exerciseLibraryDialog')) closeExerciseLibrary();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (byId('barcodeScannerDialog') && !byId('barcodeScannerDialog').hidden) {
          stopBarcodeScanner();
          byId('barcodeScannerDialog').hidden = true;
          return;
        }
        if (byId('exerciseSwapDialog') && !byId('exerciseSwapDialog').hidden) {
          closeExerciseSwap();
          return;
        }
        if (byId('exerciseLibraryDialog') && !byId('exerciseLibraryDialog').hidden) {
          closeExerciseLibrary();
          return;
        }
        if (byId('coachReportDetailModal') && !byId('coachReportDetailModal').hidden) {
          byId('coachReportDetailModal').hidden = true;
          return;
        }
        if (byId('coachRegisterTraineeModal') && !byId('coachRegisterTraineeModal').hidden) {
          byId('coachRegisterTraineeModal').hidden = true;
          return;
        }
        if (byId('createWorkoutDialog')) {
          if (confirm('האם לסגור את עורך האימון? שינויים שלא נשמרו יאבדו.')) {
            byId('createWorkoutDialog')?.remove();
          }
        }
      }
    });
    document.querySelectorAll('[data-open-tab]').forEach(button => {
      button.addEventListener('click', () => setTab(button.getAttribute('data-open-tab')));
    });
    byId('addWaterBtn')?.addEventListener('click', () => {
      state.waterLogs[state.currentDate] = (Number(state.waterLogs[state.currentDate]) || 0) + 250;
      if (writeStorage(STORAGE_KEYS.water, state.waterLogs)) renderDashboard();
    });
    byId('sleepForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const hours = Number(new FormData(event.currentTarget).get('hours'));
      if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        alert('יש להזין מספר שעות בין 0 ל־24.');
        return;
      }
      state.sleepLogs[state.currentDate] = hours;
      if (writeStorage(STORAGE_KEYS.sleep, state.sleepLogs)) renderDashboard();
    });
    byId('dailyTargetsForm')?.addEventListener('submit', event => {
      event.preventDefault();
      const values = new FormData(event.currentTarget);
      const nextTargets = {
        targetCalories: Number(values.get('targetCalories')),
        targetProtein: Number(values.get('targetProtein')),
        targetCarbs: Number(values.get('targetCarbs')),
        targetFat: Number(values.get('targetFat'))
      };
      if (!Number.isInteger(nextTargets.targetCalories) || nextTargets.targetCalories < 500 ||
        nextTargets.targetCalories > 10000 || !Number.isInteger(nextTargets.targetProtein) ||
        nextTargets.targetProtein < 0 || nextTargets.targetProtein > 1000 ||
        !Number.isInteger(nextTargets.targetCarbs) || nextTargets.targetCarbs < 0 ||
        nextTargets.targetCarbs > 1500 || !Number.isInteger(nextTargets.targetFat) ||
        nextTargets.targetFat < 0 || nextTargets.targetFat > 1000) {
        alert('בדקו את יעדי הצריכה: קלוריות 500–10,000, חלבון ושומן 0–1,000 גרם, ופחמימות 0–1,500 גרם.');
        return;
      }
      state.profile = { ...state.profile, ...nextTargets };
      if (writeStorage(STORAGE_KEYS.profile, state.profile)) renderDashboard();
    });
    byId('openCreateWorkoutModalBtn')?.addEventListener('click', () => createWorkoutModal());
    byId('coachBuildProgramBtn')?.addEventListener('click', () => openCoachWorkoutEditor());
    byId('coachAddWorkoutBtn')?.addEventListener('click', () => openCoachWorkoutEditor());
    byId('coachEditorAddWorkoutBtn')?.addEventListener('click', () => openCoachWorkoutEditor());
    byId('coachNutritionTargetsForm')?.addEventListener('submit', async event => {
      event.preventDefault();
      const status = byId('coachNutritionTargetsStatus');
      const traineeId = state.selectedTraineeId;
      const targets = {
        targetCalories: Number(byId('coachTargetCalories')?.value),
        targetProteinGrams: Number(byId('coachTargetProtein')?.value),
        targetCarbsGrams: Number(byId('coachTargetCarbs')?.value),
        targetFatsGrams: Number(byId('coachTargetFats')?.value)
      };
      try {
        if (!traineeId) throw new Error('בחרו מתאמן לפני שמירת היעדים.');
        if (!Number.isFinite(targets.targetCalories) || targets.targetCalories <= 0 || targets.targetCalories > 15000 ||
            !Number.isFinite(targets.targetProteinGrams) || targets.targetProteinGrams < 0 || targets.targetProteinGrams > 1000 ||
            !Number.isFinite(targets.targetCarbsGrams) || targets.targetCarbsGrams < 0 || targets.targetCarbsGrams > 2000 ||
            !Number.isFinite(targets.targetFatsGrams) || targets.targetFatsGrams < 0 || targets.targetFatsGrams > 1000) {
          throw new Error('הזינו ערכי תזונה תקינים בטווח המותר.');
        }
        if (window.FitPulseFirebase?.isConfigured && getAuthUserId() === state.currentUser?.id) {
          await window.FitPulseFirebase.saveCoachNutritionGoal(traineeId, targets);
        } else {
          const demoTargets = readStorage('fitpulse_demo_nutrition_targets', {});
          demoTargets[traineeId] = {
            targetCalories: targets.targetCalories,
            targetProtein: targets.targetProteinGrams,
            targetCarbs: targets.targetCarbsGrams,
            targetFats: targets.targetFatsGrams
          };
          if (!writeStorage('fitpulse_demo_nutrition_targets', demoTargets)) {
            throw new Error('לא ניתן לשמור את היעדים באחסון המקומי.');
          }
        }
        if (status) status.textContent = 'יעדי התזונה נשמרו.';
      } catch (error) {
        console.error('[Coach] Could not save nutrition targets.', error);
        if (status) status.textContent = `לא ניתן לשמור יעדים: ${error.message || error}`;
      }
    });
    byId('manageEquivalentExercisesBtn')?.addEventListener('click', () => setTab('tab-equivalents'));
    byId('equivalentsBackBtn')?.addEventListener('click', () => setTab('tab-workouts'));
    byId('equivalentExerciseForm')?.addEventListener('submit', saveEquivalentExerciseGroup);
    byId('equivalentMuscleSelect')?.addEventListener('change', () => {
      refreshEquivalentSubgroups();
    });
    byId('equivalentSubgroupSelect')?.addEventListener('change', () => {
      refreshEquivalentExercises();
    });
    byId('equivalentPreferredSelect')?.addEventListener('change', () => {
      refreshEquivalentAlternatives();
    });
    byId('cancelEquivalentEditBtn')?.addEventListener('click', () => {
      editingEquivalentGroupId = null;
      renderEquivalentExerciseManager();
    });
    byId('activeExerciseLibraryBtn')?.addEventListener('click', () => {
      const session = state.activeSession;
      if (!session) return;
      openExerciseLibrary(new Set(), () => {}, selected => {
        selected.forEach(exerciseId => {
          const exercise = getExercise(exerciseId);
          if (!exercise || session.plan.exercises.some(entry => entry.exerciseId === exerciseId)) return;
          session.plan.exercises.push({
            exerciseId,
            sets: exercise.defaultSets,
            reps: exercise.defaultReps,
            weight: exercise.defaultWeight,
            muscleGroup: exercise.muscle,
            subgroup: getExerciseSubgroup(exercise),
            preferredExerciseId: exercise.id,
            targetRir: ''
          });
        });
        session.sequence = createSetSequence(session.plan, session.timeCrunch);
        renderActiveExercises();
      });
    });
    byId('coachTraineeSearch')?.addEventListener('input', renderCoach);
    byId('coachTraineeFilter')?.addEventListener('change', event => {
      state.coachActivityFilter = event.currentTarget.value;
      renderCoach();
    });
    byId('coachTraineeSelect')?.addEventListener('change', event => {
      state.selectedTraineeId = event.currentTarget.value;
      renderCoach();
    });
    byId('coachRangeFilter')?.addEventListener('change', () => {
      renderCoach();
    });
    byId('closeDrilldownModalBtn')?.addEventListener('click', () => {
      const modal = byId('coachReportDetailModal');
      if (modal) modal.hidden = true;
    });
    byId('coachReportDetailModal')?.addEventListener('click', event => {
      if (event.target === byId('coachReportDetailModal')) {
        byId('coachReportDetailModal').hidden = true;
      }
    });

    // Daily Trainee Report events
    byId('dailyReportPrevDayBtn')?.addEventListener('click', () => {
      const d = new Date(state.dailyReportDate + 'T00:00:00');
      d.setDate(d.getDate() - 1);
      state.dailyReportDate = localDateKey(d);
      renderDailyReportTab();
    });
    byId('dailyReportNextDayBtn')?.addEventListener('click', () => {
      const d = new Date(state.dailyReportDate + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      state.dailyReportDate = localDateKey(d);
      renderDailyReportTab();
    });
    byId('dailyReportDatePicker')?.addEventListener('change', event => {
      if (event.currentTarget.value) {
        state.dailyReportDate = event.currentTarget.value;
        renderDailyReportTab();
      }
    });
    byId('dailyReportFinalizeBtn')?.addEventListener('click', finalizeDailyReport);

    // Auto-save checkin form inputs
    const bindCheckinInput = (id, prop, isNumber = false) => {
      const el = byId(id);
      if (!el) return;
      const handler = () => {
        const traineeId = state.profile.demoTraineeId || 'client_1';
        const date = state.dailyReportDate || state.currentDate;
        const report = getOrCreateDailyReport(traineeId, date);
        report.metrics[prop] = isNumber ? (parseFloat(el.value) || null) : el.value;
        if (id === 'checkinSleepQuality' && byId('checkinSleepQualityVal')) {
          byId('checkinSleepQualityVal').textContent = `${el.value}/10`;
        }
        syncDailyReportDraft();
      };
      el.addEventListener('input', handler);
      el.addEventListener('change', handler);
    };

    bindCheckinInput('checkinWeight', 'morningWeightKg', true);
    bindCheckinInput('checkinWater', 'waterMl', true);
    bindCheckinInput('checkinSleepHours', 'sleepHours', true);
    bindCheckinInput('checkinSleepQuality', 'sleepQuality', true);
    bindCheckinInput('checkinSteps', 'steps', true);
    bindCheckinInput('checkinDigestion', 'digestion', false);
    bindCheckinInput('checkinNotes', 'traineeNotes', false);

    // Rating pills handlers
    ['energy', 'hunger', 'stress'].forEach(ratingType => {
      const container = byId(`${ratingType}RatingPills`);
      if (!container) return;
      container.querySelectorAll('.rating-pill').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = parseInt(btn.getAttribute('data-val'), 10);
          const traineeId = state.profile.demoTraineeId || 'client_1';
          const date = state.dailyReportDate || state.currentDate;
          const report = getOrCreateDailyReport(traineeId, date);
          report.metrics[`${ratingType}Level`] = val;
          container.querySelectorAll('.rating-pill').forEach(b => b.classList.toggle('active', b === btn));
          syncDailyReportDraft();
        });
      });
    });
    byId('importRoutineCodeBtn')?.addEventListener('click', importRoutine);
    byId('timeCrunchToggleBtn')?.addEventListener('click', toggleTimeCrunchMode);
    byId('finishWorkoutBtn')?.addEventListener('click', finishWorkout);
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#login') {
        logoutUser();
        return;
      }
      if (window.location.hash === '#/admin/dashboard') {
        if (!isCoachRole() && !isManagerRole()) {
          alert('הנתיב מוגן בתצוגה המקומית. יש להיכנס למצב מאמן הדגמה, שאינו אימות מאובטח.');
          window.location.hash = '#/';
          setTab('tab-dashboard');
          return;
        }
        setTab(defaultTabForRole());
      }
    });
    window.addEventListener('resize', () => {
      if (state.activeTab === 'tab-progress') drawWeightChart();
    });
  }

  function init() {
    if (window.FitPulseFirebase) {
      window.FitPulseFirebase.init();
      // Synchronize latest foods from Cloud Firestore foods collection
      if (typeof window.FitPulseFirebase.getFoods === 'function') {
        window.FitPulseFirebase.getFoods(250).then(firestoreFoods => {
          if (firestoreFoods && firestoreFoods.length > 0 && window.FIT_DATA && Array.isArray(window.FIT_DATA.foodsDatabase)) {
            const existingIds = new Set(window.FIT_DATA.foodsDatabase.map(f => f.id));
            let addedCount = 0;
            firestoreFoods.forEach(food => {
              if (!existingIds.has(food.id)) {
                window.FIT_DATA.foodsDatabase.push({
                  id: food.id,
                  name: food.name,
                  nameEn: food.nameEn || '',
                  brand: food.brand || '',
                  category: food.category || 'street_food',
                  categoryName: food.categoryName || '',
                  unitName: food.unitName || '100 גרם',
                  defaultGrams: food.defaultGrams || 100,
                  calories: food.calories || 0,
                  protein: food.protein || 0,
                  carbs: food.carbs || 0,
                  fat: food.fat || 0,
                  fiber: food.fiber || 0,
                  sodium: food.sodium || 0,
                  sugar: food.sugar || 0,
                  tags: food.dietaryTags || [],
                  icon: food.category === 'dairy_protein' ? '🥛' : food.category === 'hummus_falafel' ? '🧆' : food.category === 'shawarma_meat' ? '🥩' : food.category === 'bakery_pastry' ? '🥐' : food.category === 'sweets_desserts' ? '🍦' : food.category === 'supermarket_staples' ? '🛒' : food.category === 'healthy_fitness' ? '💪' : food.category === 'street_food' ? '🌯' : '🍽️',
                  source: 'Cloud Firestore foods collection'
                });
                existingIds.add(food.id);
                addedCount++;
              }
            });
            console.log(`[FitPulse Firebase] Synchronized ${firestoreFoods.length} foods (${addedCount} new) from Cloud Firestore 'foods' collection.`);
            if (state.activeTab === 'tab-nutrition') {
              renderNutrition();
            }
          }
        }).catch(e => console.warn('[FitPulse Firebase] Foods sync notice:', e.message));
      }
    }
    addProgressControls();
    bindEvents();
    initAuthAndGates();
    initCoachRegisterModal();
    renderAll();
    window.setInterval(() => {
      const currentDate = localDateKey(new Date());
      if (state.currentDate !== currentDate) {
        state.currentDate = currentDate;
        renderAll();
      } else {
        renderDashboard();
      }
    }, 60000);
    if (window.location.hash === '#/admin/dashboard') {
      if (isCoachRole() || isManagerRole()) setTab(defaultTabForRole());
      else {
        window.location.hash = '#/';
        setTab('tab-dashboard');
      }
    }
    const shared = window.location.hash.match(/(?:^#|&)routine=/);
    if (shared) {
      setTab('tab-workouts');
      window.setTimeout(importRoutine, 0);
    }
  }

  init();
})();
