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
    scannedFoods: 'fitpulse_scanned_foods'
  };

  function readStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.error(`Could not read FitPulse data from local storage (${key}).`, error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Could not save FitPulse data to local storage (${key}).`, error);
      alert('לא ניתן לשמור את הנתונים בדפדפן. בדקו את נפח האחסון וההרשאות.');
      return false;
    }
  }

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const state = {
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
    isTimeCrunchActive: false,
    activeSession: null,
    foodQuery: '',
    foodCategory: 'all',
    workoutFilter: 'all',
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
    selectedTraineeId: FIT_DATA.coachTrainees[0]?.id || '',
    coachActivityFilter: 'all'
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
    session_push: 'פוס',
    session_pull: 'פול',
    session_legs: 'לגס',
    session_upper: 'אפפר',
    session_lower: 'לוואר',
    split_ppl: 'פוס,פול,לגס',
    split_upper_lower: 'אפפר לוואר',
    split_full_body: 'פול באדי',
    session_shoulders_arms: 'כתפיים ידיים',
    session_chest_back: 'חזה גב',
    session_chest_arms: 'חזה ידיים',
    session_back_shoulders: 'גב כתפיים',
    session_legs_hebrew: 'רגליים'
  };
  const WORKOUT_CARD_ORDER = [
    'split_ppl', 'split_upper_lower', 'split_full_body',
    'session_push', 'session_pull', 'session_legs', 'session_upper', 'session_lower',
    'session_shoulders_arms', 'session_chest_back', 'session_chest_arms',
    'session_back_shoulders', 'session_legs_hebrew'
  ];
  const WORKOUT_FILTERS = [
    ['all', 'הכל'], ['chest', 'Chest'], ['back', 'Back'], ['legs', 'Legs'],
    ['shoulders', 'Shoulders'], ['arms', 'Arms'], ['core', 'Core']
  ];
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

  function isTrainerRole() {
    return String(state.profile.role || '').trim().toLowerCase() === 'trainer_admin';
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function setTab(tabId) {
    if (['tab-coach', 'tab-equivalents'].includes(tabId) && !isTrainerRole()) {
      alert('אין הרשאה לכלי המאמן בחשבון המתאמן המקומי.');
      tabId = 'tab-dashboard';
    }
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
  }

  function getDailyNutrition() {
    return todayMeals().reduce((totals, meal) => {
      ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'].forEach(key => {
        totals[key] += Number(meal[key]) || 0;
      });
      const unknown = Array.isArray(meal.unknownNutrients)
        ? meal.unknownNutrients
        : ['fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'].filter(key => typeof meal[key] !== 'number');
      unknown.forEach(key => totals.unknownNutrients.add(key));
      if (meal.addedSugarKnown) totals.addedSugarKnown = true;
      return totals;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0, addedSugar: 0, potassium: 0, omega3: 0, omega6: 0, addedSugarKnown: false, unknownNutrients: new Set() });
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
      addedSugarKnown: typeof food.addedSugar === 'number' && Number.isFinite(food.addedSugar)
    };
    meal.unknownNutrients = Array.isArray(food.unknownNutrients)
      ? [...food.unknownNutrients]
      : ['fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6']
        .filter(key => typeof food[key] !== 'number' || !Number.isFinite(food[key]));
    ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'].forEach(key => {
      meal[key] = typeof food[key] === 'number' && Number.isFinite(food[key]) ? food[key] * multiplier : 0;
    });
    state.nutritionLogs[state.currentDate] = [...todayMeals(), meal];
    if (!writeStorage(STORAGE_KEYS.nutrition, state.nutritionLogs)) return false;
    renderNutrition();
    renderDashboard();
    return true;
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
    if (byId('dashboardGreeting')) byId('dashboardGreeting').textContent = `שלום, ${state.profile.name || 'מתאמן'} 👋`;
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
    card.append(createElement('span', 'plan-duration', `⏱️ ${plan.durationMinutes || 0} דק׳`),
      createElement('h3', 'plan-title', WORKOUT_CARD_LABELS[plan.id] || plan.name));
    if (plan.subtitle) card.append(createElement('p', 'plan-sub', plan.subtitle));

    const details = createElement('p', 'plan-meta', `${plan.level || 'כל הרמות'} · ${plan.exercises.length} תרגילים`);
    card.append(details);
    if (plan.exercises[0]) {
      const previewExercise = getExercise(plan.exercises[0].exerciseId);
      if (previewExercise) {
        const preview = createElement('div', 'plan-exercise-preview');
        preview.append(createExerciseAnimation(previewExercise), createElement('span', '', previewExercise.name));
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
    const crunchStartButton = createElement('button', 'btn-action-secondary crunch-start-btn', 'להתחל קצר בזמן ⏱️');
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

  function createExerciseAnimation(exercise, compact = false) {
    const trajectory = {
      squat: 'M38 15 C24 26 23 35 38 44',
      lunges: 'M38 14 C29 26 27 36 39 46',
      bicep_curl: 'M33 42 C20 35 19 22 31 15',
      tricep_pushdown: 'M34 13 C45 24 45 34 35 45',
      shoulder_press: 'M31 43 C19 30 21 18 37 10',
      lateral_raise: 'M29 38 C17 31 16 20 28 14',
      pullup: 'M36 11 C23 17 23 33 37 42',
      lat_pulldown: 'M36 10 C25 18 25 33 37 44',
      rowing: 'M26 38 C17 30 23 20 37 17',
      deadlift: 'M37 12 C25 20 20 33 34 43',
      bench_press: 'M17 22 C25 12 37 12 47 21',
      incline_press: 'M18 28 C27 15 37 13 47 20',
      cable_fly: 'M17 17 C25 35 38 35 47 17',
      pec_deck: 'M21 17 C18 33 44 33 42 17',
      dips: 'M38 12 C26 20 26 34 38 43',
      plank: 'M17 28 C26 23 37 23 47 28'
    }[exercise.animType] || 'M20 35 C23 15 39 15 44 35';
    const figure = createElement('div', `exercise-demo${compact ? ' compact' : ''}`);
    const markerId = `demoArrow${exerciseAnimationId++}`;
    figure.setAttribute('role', 'img');
    figure.setAttribute('aria-label', `הדגמת תנועה וקטורית: ${exercise.name}`);
    figure.innerHTML = `<svg viewBox="0 0 64 56" aria-hidden="true" focusable="false">
      <path class="demo-floor" d="M8 48h48"></path>
      <circle class="demo-head" cx="32" cy="8" r="4"></circle>
      <path class="demo-body" d="M32 13v19m-10-12 10 5 10-5m-10 12-8 14m8-14 8 14"></path>
      <path class="demo-trajectory" d="${trajectory}" marker-end="url(#${markerId})"></path>
      <circle class="demo-moving-weight" r="3"><animateMotion dur="1.8s" repeatCount="indefinite" path="${trajectory}"></animateMotion></circle>
      <defs><marker id="${markerId}" markerWidth="5" markerHeight="5" refX="2" refY="2" orient="auto"><path d="M0 0 4 2 0 4" class="demo-arrow"></path></marker></defs>
    </svg>`;
    return figure;
  }

  function renderWorkoutsTab() {
    const weeklyGrid = byId('weeklySplitsGrid');
    const sessionGrid = byId('individualSessionsGrid');
    const recentGrid = byId('recentWorkoutGrid');
    const recentSection = byId('recentWorkoutsSection');
    if (!weeklyGrid || !sessionGrid) return;
    weeklyGrid.replaceChildren();
    sessionGrid.replaceChildren();
    const search = byId('workoutTemplateSearch');
    if (search && search.value !== state.workoutQuery) search.value = state.workoutQuery;
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
          createElement('strong', '', WORKOUT_CARD_LABELS[plan.id] || plan.name),
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
      recentSection.hidden = !recentPlans.length || Boolean(state.workoutQuery.trim()) || state.workoutFilter !== 'all';
    }
    const query = state.workoutQuery.trim().toLocaleLowerCase();
    const filteredPlans = plans.filter(plan => {
      const matchingExercises = plan.exercises.map(entry => getExercise(entry.exerciseId)).filter(Boolean);
      const muscleMatches = state.workoutFilter === 'all' || matchingExercises.some(exercise =>
        (plan.exercises.find(entry => entry.exerciseId === exercise.id)?.muscleGroup || exercise.muscle) === state.workoutFilter ||
        exercise.muscle === state.workoutFilter);
      const searchableText = [
        WORKOUT_CARD_LABELS[plan.id] || plan.name, plan.name, plan.subtitle || '',
        ...matchingExercises.flatMap(exercise => [exercise.name, exercise.category, exercise.muscle])
      ].join(' ').toLocaleLowerCase();
      return muscleMatches && (!query || searchableText.includes(query));
    });
    filteredPlans.forEach(plan => {
      if (plan.id.startsWith('custom-') &&
        FIT_DATA.presetWorkouts.some(preset => WORKOUT_CARD_LABELS[preset.id] && preset.name === plan.name)) return;
      const grid = plan.section === 'weekly_split' ? weeklyGrid : sessionGrid;
      grid.append(renderWorkoutCard(plan));
    });
    const count = weeklyGrid.childElementCount + sessionGrid.childElementCount;
    if (byId('workoutTemplateStatus')) {
      byId('workoutTemplateStatus').textContent = count
        ? `${count} תוכניות · מסננים תרגילים לפי שם וקבוצת שרירים`
        : 'לא נמצאו תוכניות מתאימות. נסו לשנות את החיפוש או המסנן.';
    }
    document.querySelectorAll('.workouts-section').forEach(section => {
      const grid = section.querySelector('.preset-workouts-grid');
      section.hidden = !grid?.childElementCount;
    });
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
    const potassium = readPer100('potassium_100g');
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
      fiber,
      sodium,
      sugar,
      addedSugar,
      potassium,
      omega3,
      omega6,
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

  async function addScannedBarcode(barcode) {
    const status = byId('barcodeScannerStatus');
    if (status) status.textContent = `מחפש מוצר ${barcode} ב־Open Food Facts…`;
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=product_name,product_name_en,brands,categories,generic_name,_keywords,nutriments`);
      if (!response.ok) throw new Error(`Open Food Facts returned HTTP ${response.status}.`);
      const result = await response.json();
      if (result.status !== 1 || !result.product) {
        if (status) status.textContent = 'המוצר לא נמצא. בדקו את הברקוד או הזינו את המזון בחיפוש.';
        return;
      }
      const food = normalizeScannedProduct(barcode, result.product);
      if (!food) {
        if (status) status.textContent = 'המוצר נמצא, אך חסרים שם מוצר או ערך קלורי ל־100 גרם.';
        return;
      }
      const cachedIndex = state.scannedFoods.findIndex(item => item.barcode === barcode);
      if (cachedIndex >= 0) state.scannedFoods[cachedIndex] = food;
      else state.scannedFoods.push(food);
      if (!writeStorage(STORAGE_KEYS.scannedFoods, state.scannedFoods)) return;
      const catalogIndex = FIT_DATA.foodsDatabase.findIndex(item => item.id === food.id);
      if (catalogIndex >= 0) FIT_DATA.foodsDatabase[catalogIndex] = food;
      else FIT_DATA.foodsDatabase.push(food);
      state.foodQuery = '';
      state.foodCategory = 'all';
      if (status) status.textContent = `${food.name} נמצא. מוסיף 100 גרם ליומן…`;
      if (addFoodToLog(food, 100, { source: food.source })) {
        stopBarcodeScanner();
        byId('barcodeScannerDialog').hidden = true;
      }
    } catch (error) {
      console.error('Could not retrieve barcode product details from Open Food Facts.', error);
      if (status) status.textContent = 'לא ניתן להתחבר למאגר המזון. בדקו את החיבור ונסו שוב.';
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
      const supportedFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter(format => nativeFormats.includes(format));
      if (supportedFormats.length) {
        const detector = new window.BarcodeDetector({ formats: supportedFormats });
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } });
        video.srcObject = stream;
        await video.play();
        if (status) status.textContent = 'מכוונים את המצלמה לברקוד EAN או UPC…';
        const scanFrame = async () => {
          if (!video.srcObject) return;
          try {
            const results = await detector.detect(video);
            if (results.length) {
              const barcode = results[0].rawValue;
              if (/^\d{8,14}$/.test(barcode)) {
                stopBarcodeScanner();
                await addScannedBarcode(barcode);
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
        if (status) status.textContent = 'ספריית הסריקה לא נטענה. נסו לרענן או להשתמש בחיפוש המזון.';
        return;
      }
      const reader = new window.ZXing.BrowserMultiFormatReader();
      state.scannerReader = reader;
      const controls = await reader.decodeFromVideoDevice(undefined, video, (result, error) => {
        if (result) {
          const barcode = result.getText();
          if (/^\d{8,14}$/.test(barcode)) {
            stopBarcodeScanner();
            addScannedBarcode(barcode);
          }
        } else if (error && !(error instanceof window.ZXing.NotFoundException)) {
          console.error('Barcode camera scan failed.', error);
        }
      });
      state.scannerControls = controls;
      if (status) status.textContent = 'מכוונים את המצלמה לברקוד EAN או UPC…';
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
    weightForm.addEventListener('submit', event => {
      event.preventDefault();
      const weight = Number(weightInput.value);
      if (!Number.isFinite(weight) || weight < 20 || weight > 400) return;
      state.weightLogs = state.weightLogs.filter(entry => entry.date !== state.currentDate);
      state.weightLogs.push({ date: state.currentDate, weight });
      state.weightLogs.sort((a, b) => a.date.localeCompare(b.date));
      state.profile = { ...state.profile, weight };
      if (writeStorage(STORAGE_KEYS.weights, state.weightLogs) &&
        writeStorage(STORAGE_KEYS.profile, state.profile)) renderProgress();
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

  function renderCoach() {
    const grid = byId('coachTraineesGrid');
    if (!grid) return;
    grid.replaceChildren();
    const isTrainer = isTrainerRole();
    if (byId('coachAccessNotice')) byId('coachAccessNotice').hidden = isTrainer;
    if (byId('coachAdminContent')) byId('coachAdminContent').hidden = !isTrainer;
    if (byId('demoRoleToggleBtn')) byId('demoRoleToggleBtn').textContent = isTrainer
      ? 'מעבר למתאמן (הדגמה)'
      : 'הצגת מצב מאמן (הדגמה)';
    if (byId('navTabEquivalents')) byId('navTabEquivalents').hidden = !isTrainer;
    if (byId('manageEquivalentExercisesBtn')) byId('manageEquivalentExercisesBtn').hidden = !isTrainer;
    if (!isTrainer) return;
    const searchInput = byId('coachTraineeSearch');
    const query = (searchInput?.value || '').trim().toLocaleLowerCase();
    const activityFilter = byId('coachTraineeFilter');
    if (activityFilter) activityFilter.value = state.coachActivityFilter;
    const trainees = FIT_DATA.coachTrainees.filter(trainee => {
      const matchesQuery = trainee.name.toLocaleLowerCase().includes(query);
      const matchesActivity = state.coachActivityFilter === 'all' ||
        (state.coachActivityFilter === 'active' ? trainee.hasWorkedOutToday : !trainee.hasWorkedOutToday);
      return matchesQuery && matchesActivity;
    });
    const select = byId('coachTraineeSelect');
    if (select) {
      const current = state.selectedTraineeId;
      select.replaceChildren();
      trainees.forEach(trainee => {
        const option = document.createElement('option');
        option.value = trainee.id;
        option.textContent = trainee.name;
        select.append(option);
      });
      if (trainees.some(trainee => trainee.id === current)) select.value = current;
      else if (trainees[0]) {
        state.selectedTraineeId = trainees[0].id;
        select.value = trainees[0].id;
      } else {
        state.selectedTraineeId = '';
      }
    }
    const nutritionRows = byId('coachNutritionRows');
    if (nutritionRows) {
      nutritionRows.replaceChildren();
      trainees.forEach(trainee => {
        const row = document.createElement('tr');
        [
          trainee.name,
          `${formatNumber(trainee.targetCalories)} / ${formatNumber(trainee.consumedCalories)} kcal`,
          `${formatNumber(trainee.consumedProtein)} g`,
          '—',
          '—',
          `${formatNumber(trainee.waterMl)} ml`
        ].forEach(value => row.append(createElement('td', '', value)));
        nutritionRows.append(row);
      });
      const currentTotals = getDailyNutrition();
      const localRow = document.createElement('tr');
      [
        `${state.profile.name || 'המתאמן בדפדפן'} · נתונים מקומיים`,
        `${formatNumber(state.profile.targetCalories)} / ${formatNumber(currentTotals.calories)} kcal`,
        `${formatNumber(currentTotals.protein)} g`,
        `${formatNumber(currentTotals.carbs)} g`,
        `${formatNumber(currentTotals.fat)} g`,
        `${formatNumber(state.waterLogs[state.currentDate] || 0)} ml`
      ].forEach(value => localRow.append(createElement('td', '', value)));
      nutritionRows.append(localRow);
    }
    let compliance = byId('coachComplianceScore');
    if (!compliance) {
      compliance = createElement('p', 'coach-compliance-score');
      compliance.id = 'coachComplianceScore';
      byId('coachAdminContent')?.insertBefore(compliance, byId('coachAdminContent').firstChild?.nextSibling || null);
    }
    const today = new Date();
    const weekWorkouts = Array.from({ length: 7 }, (_, index) => {
      const date = localDateKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - index));
      return (state.workoutLogs[date] || []).length;
    }).reduce((total, count) => total + count, 0);
    const compliancePercent = Math.min(100, Math.round(weekWorkouts / 5 * 100));
    compliance.textContent = `עמידה שבועית · היומן המקומי: ${compliancePercent}% (${Math.min(weekWorkouts, 5)}/5 אימונים; יעד שבועי של 5)`;
    const feed = byId('coachLiveFeed');
    if (feed) {
      feed.replaceChildren();
      const sampleEntries = FIT_DATA.coachTrainees.filter(trainee => trainee.lastWorkout);
      sampleEntries.forEach(trainee => {
        const workout = trainee.lastWorkout;
        const article = createElement('article', 'coach-feed-item');
        article.append(
          createElement('strong', '', `דוגמה סטטית · ${trainee.name} · ${workout.title}`),
          createElement('span', '', `${workout.durationMinutes} דקות · ${workout.completedSets} סטים · נפח ${formatNumber(workout.totalVolume)} ק״ג · ${formatNumber(trainee.burnedCalories)} קלוריות משוערות`)
        );
        (workout.exercises || []).forEach(exercise => {
          article.append(createElement('small', '', `${exercise.name}: ${exercise.weight} ק״ג × ${exercise.reps} · ${exercise.sets} סטים`));
        });
        feed.append(article);
      });
      const localEntries = Object.entries(state.workoutLogs).flatMap(([date, entries]) =>
        (Array.isArray(entries) ? entries : []).map(workout => ({ date, name: state.profile.name || 'דפדפן נוכחי', workout })));
      localEntries.forEach(({ date, name, workout }) => {
        const article = createElement('article', 'coach-feed-item');
        article.append(
          createElement('strong', '', `${name} · ${workout.name || workout.title || 'אימון'}`),
          createElement('span', '', `${workout.completedAt ? new Date(workout.completedAt).toLocaleString('he-IL') : date} · ${workout.durationMinutes || 0} דקות · ${workout.completedSets || 0} סטים · נפח ${formatNumber(workout.totalVolume || 0)} ק״ג · ${formatNumber(workout.calories || 0)} קלוריות משוערות`)
        );
        (workout.setLogs || []).filter(entry => entry.completed).forEach(entry => {
          article.append(createElement('small', '', `${entry.exerciseName}: ${entry.weight} ק״ג × ${entry.reps}${entry.rir === '' || entry.rir == null ? '' : ` · RIR ${entry.rir}`}${entry.completedAt ? ` · ${new Date(entry.completedAt).toLocaleTimeString('he-IL')}` : ''}`));
        });
        feed.append(article);
      });
      if (!localEntries.length && !sampleEntries.length) feed.append(createElement('p', 'empty-state', 'אין עדיין אימונים שנשמרו בדפדפן זה.'));
    }
    trainees.forEach(trainee => {
      const card = createElement('article', 'coach-card');
      const header = createElement('div', 'coach-card-header');
      header.append(createElement('span', 'coach-avatar', trainee.avatar), createElement('div', '', trainee.name));
      card.append(header);
      const metrics = createElement('div', 'coach-metrics');
      [
        [`${formatNumber(trainee.consumedCalories)} / ${formatNumber(trainee.targetCalories)}`, 'קלוריות'],
        [`${formatNumber(trainee.consumedProtein)}g`, 'חלבון'],
        [`${formatNumber(trainee.weight)} ק״ג`, 'משקל'],
        [`${formatNumber(trainee.sleepHours)} שעות`, 'שינה']
      ].forEach(([value, label]) => {
        const metric = createElement('div', 'coach-metric');
        metric.append(createElement('strong', '', value), createElement('span', '', label));
        metrics.append(metric);
      });
      card.append(metrics);
      const workout = trainee.lastWorkout;
      card.append(createElement('h3', '', workout ? 'האימון האחרון' : 'עדיין אין אימונים'));
      if (workout) {
        card.append(createElement('p', 'coach-workout', `${workout.title} · ${workout.durationMinutes} דקות · RPE ${workout.difficulty}/10`));
        if (workout.notes) card.append(createElement('p', 'coach-note', workout.notes));
      }
      const profileDetails = document.createElement('details');
      profileDetails.className = 'coach-profile-details';
      const profileSummary = document.createElement('summary');
      profileSummary.textContent = 'פרופיל ויומן תזונה לדוגמה';
      profileDetails.append(profileSummary);
      profileDetails.append(createElement('p', '', `גיל ${trainee.age} · משקל ${formatNumber(trainee.weight)} ק״ג · יעד ${formatNumber(trainee.targetCalories)} קלוריות · מים ${formatNumber(trainee.waterMl)} מ״ל`));
      (trainee.mealsToday || []).forEach(meal => {
        profileDetails.append(createElement('small', '', `${meal.name}: ${formatNumber(meal.calories)} kcal · חלבון ${formatNumber(meal.protein)} g`));
      });
      card.append(profileDetails);
      const sendButton = createElement('button', 'btn-action-secondary', 'שליחה למתאמן ↗');
      sendButton.type = 'button';
      sendButton.addEventListener('click', () => sendRoutineToTrainee(trainee));
      card.append(sendButton, createElement('p', 'coach-note', 'העברה נשמרת בדפדפן ההדגמה בלבד; היא אינה מגיעה לחשבון אחר.'));
      grid.append(card);
    });
    if (!trainees.length) grid.append(createElement('p', 'empty-state', 'לא נמצאו מתאמנים לפי החיפוש והסינון.'));
  }

  function renderAll() {
    renderDashboard();
    renderNutrition();
    renderWorkoutsTab();
    renderCoach();
    renderProgress();
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
      const button = createElement('button', `category-chip${state.exerciseMuscle === group.id ? ' active' : ''}`, `${group.icon} ${group.name}`);
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
      card.append(createExerciseAnimation(exercise, true));
      const details = createElement('div', 'library-exercise-details');
      details.append(
        createElement('strong', '', exercise.name),
        createElement('span', '', `${exercise.category} · ${exercise.equipment} · ${exercise.unilateral ? 'Unilateral' : 'Bilateral'} · ${exercise.defaultSets} סטים × ${exercise.defaultReps} חזרות`)
      );
      details.append(renderMuscleActivation(exercise));
      if (exercise.tips) details.append(createElement('p', '', exercise.tips));
      const toggle = createElement('button', `btn-action-secondary${selection.has(exercise.id) ? ' selected' : ''}`, selection.has(exercise.id) ? 'נבחר ✓' : '＋ הוספה');
      toggle.type = 'button';
      toggle.setAttribute('aria-pressed', String(selection.has(exercise.id)));
      toggle.addEventListener('click', () => {
        if (selection.has(exercise.id)) selection.delete(exercise.id);
        else selection.add(exercise.id);
        onToggle();
        renderExerciseLibrary(selection, onToggle);
      });
      card.append(details, toggle);
      list.append(card);
    });
  }

  function openExerciseLibrary(selection, onToggle, onDone = null) {
    const dialog = byId('exerciseLibraryDialog');
    if (!dialog) return;
    state.exerciseQuery = '';
    state.exerciseLibrarySelection = selection;
    state.exerciseLibraryOnToggle = onToggle;
    state.exerciseLibraryOnDone = onDone;
    const search = byId('exerciseLibrarySearch');
    if (search) search.value = '';
    renderExerciseLibrary(selection, onToggle);
    dialog.hidden = false;
    byId('exerciseLibraryDoneBtn')?.focus();
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
    const dialog = createElement('section', 'dialog-card');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'createWorkoutTitle');
    const header = createElement('div', 'dialog-header');
    const title = createElement('h2', '', existingPlan?.isDuplicate ? 'שכפול תבנית' : existingPlan ? 'עריכת אימון' : 'בניית אימון חדש');
    title.id = 'createWorkoutTitle';
    const close = createElement('button', 'icon-button', 'סגירה');
    close.type = 'button';
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
      return {
        muscleGroup: entry.muscleGroup || exercise?.muscle || 'chest',
        subgroup: entry.subgroup || (exercise ? getExerciseSubgroup(exercise) : ''),
        preferredExerciseId, sets: Number(entry.sets) || exercise?.defaultSets || 3,
        reps: Number(entry.reps) || exercise?.defaultReps || 10,
        weight: Number(entry.weight ?? exercise?.defaultWeight) || 0
      };
    });
    const note = createElement('p', 'muscle-activation-note', 'בנו את התוכנית לפי כל תרגיל: הגדירו שריר ראשי, תת־קבוצה ותרגיל מועדף. לרוב העדיפו מכונה יציבה כשמתאימה. ציוד זמין וחלופות שקולות נבחרים בתחילת האימון.');
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
    const renderRows = () => {
      exerciseList.replaceChildren();
      if (!rows.length) exerciseList.append(createElement('p', 'empty-state', 'הרשימה ריקה. הוסיפו תרגיל כדי להתחיל לבנות את האימון.'));
      rows.forEach((row, index) => {
        const card = createElement('article', 'builder-exercise-card');
        const heading = createElement('div', 'builder-row-heading');
        heading.append(createElement('strong', '', `תרגיל ${index + 1}`));
        const remove = createElement('button', 'icon-button', 'הסרה');
        remove.type = 'button';
        remove.addEventListener('click', () => {
          rows.splice(index, 1);
          renderRows();
        });
        heading.append(remove);
        card.append(heading);
        const selectors = createElement('div', 'builder-exercise-selectors');
        const muscleLabelControl = createElement('label', '', 'קבוצת שריר ראשית');
        const muscleSelect = document.createElement('select');
        FIT_DATA.muscleGroups.filter(group => group.id !== 'all').forEach(group => {
          const option = document.createElement('option');
          option.value = group.id;
          option.textContent = muscleLabel(group.id);
          muscleSelect.append(option);
        });
        muscleSelect.value = row.muscleGroup;
        muscleSelect.addEventListener('change', () => {
          row.muscleGroup = muscleSelect.value;
          row.subgroup = '';
          row.preferredExerciseId = '';
          renderRows();
        });
        muscleLabelControl.append(muscleSelect);
        selectors.append(muscleLabelControl);

        const subgroupLabelControl = createElement('label', '', 'תת־קבוצת שרירים');
        const subgroupSelect = document.createElement('select');
        const subgroupChoices = getExerciseSubgroups(row.muscleGroup);
        fillSelect(subgroupSelect, subgroupChoices.map(value => ({ value, label: value })), row.subgroup, 'בחרו תת־קבוצה');
        subgroupSelect.addEventListener('change', () => {
          row.subgroup = subgroupSelect.value;
          row.preferredExerciseId = '';
          renderRows();
        });
        subgroupLabelControl.append(subgroupSelect);
        selectors.append(subgroupLabelControl);

        const preferredLabel = createElement('label', '', 'תרגיל מועדף');
        const preferredSelect = document.createElement('select');
        const candidates = row.subgroup
          ? getSubgroupExercises(row.muscleGroup, row.subgroup)
            .sort((left, right) => Number(right.equipment === 'Machine') - Number(left.equipment === 'Machine'))
          : [];
        fillSelect(preferredSelect, candidates.map(exercise => ({
          value: exercise.id, label: `${exercise.name} · ${exercise.equipment}`
        })), row.preferredExerciseId, 'בחרו תרגיל מועדף');
        preferredSelect.addEventListener('change', () => {
          row.preferredExerciseId = preferredSelect.value;
          const exercise = getExercise(row.preferredExerciseId);
          if (exercise) {
            row.sets = exercise.defaultSets || 3;
            row.reps = exercise.defaultReps || 10;
            const latestSet = Object.values(state.workoutLogs || {}).flatMap(workouts =>
              Array.isArray(workouts) ? workouts : []).flatMap(workout => workout.setLogs || [])
              .filter(set => set.completed && set.exerciseId === exercise.id)
              .sort((left, right) => String(right.completedAt || '').localeCompare(String(left.completedAt || '')))[0];
            const profileWeight = Number(state.profile.weight) || Number(FIT_DATA.defaultProfile.weight);
            const profileScale = Math.max(0.6, Math.min(1.4, profileWeight / Number(FIT_DATA.defaultProfile.weight)));
            row.weight = latestSet
              ? Number(latestSet.weight) || 0
              : Math.round((Number(exercise.defaultWeight) || 0) * profileScale * 2) / 2;
          }
          renderRows();
        });
        preferredLabel.append(preferredSelect);
        selectors.append(preferredLabel);
        card.append(selectors);

        if (row.preferredExerciseId) {
          const targetFields = createElement('div', 'builder-exercise-targets');
          [['sets', 'מספר סטים', 1, 20, 1], ['reps', 'חזרות לסט', 1, 1000, 1], ['weight', 'משקל (ק״ג)', 0, 1000, 0.5]].forEach(([key, label, min, max, step]) => {
            const field = createElement('label', '', label);
            const input = document.createElement('input');
            input.type = 'number';
            input.min = String(min);
            input.max = String(max);
            input.step = String(step);
            input.value = String(row[key]);
            input.addEventListener('input', () => { row[key] = Number(input.value); });
            field.append(input);
            targetFields.append(field);
          });
          card.append(targetFields);
        }
        const orderActions = createElement('div', 'builder-row-actions');
        [['↑', -1], ['↓', 1]].forEach(([label, delta]) => {
          const button = createElement('button', 'icon-button builder-reorder-button', label);
          button.type = 'button';
          button.disabled = index + delta < 0 || index + delta >= rows.length;
          button.setAttribute('aria-label', `${label === '↑' ? 'העברה למעלה' : 'העברה למטה'} · תרגיל ${index + 1}`);
          button.addEventListener('click', () => {
            const destination = index + delta;
            [rows[index], rows[destination]] = [rows[destination], rows[index]];
            renderRows();
          });
          orderActions.append(button);
        });
        card.append(orderActions);
        exerciseList.append(card);
      });
    };
    renderRows();
    const addExercise = createElement('button', 'btn-action-secondary builder-add-exercise', '＋ הוספת תרגיל');
    addExercise.type = 'button';
    addExercise.addEventListener('click', () => {
      rows.push({ muscleGroup: 'chest', subgroup: '', preferredExerciseId: '', sets: 3, reps: 10, weight: 0 });
      renderRows();
      exerciseList.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
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
    form.append(note, categoryLabel, nameLabel, exerciseList, addExercise, durationLabel, recoveryLabel, restLabel, submit);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!nameInput.value.trim()) {
        alert('הזינו שם לאימון.');
        nameInput.focus();
        return;
      }
      if (!rows.length || rows.some(row => !row.preferredExerciseId)) {
        alert('הוסיפו לפחות תרגיל אחד ובחרו לכל תרגיל קבוצת שריר, תת־קבוצה ותרגיל מועדף.');
        return;
      }
      const exercises = rows.map(row => ({
        exerciseId: row.preferredExerciseId,
        preferredExerciseId: row.preferredExerciseId,
        muscleGroup: row.muscleGroup,
        subgroup: row.subgroup,
        sets: Number(row.sets), reps: Number(row.reps), weight: Number(row.weight)
      }));
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
        badge: existingPlan?.badge || '✨ אימון אישי', defaultRestSeconds: Number(restInput.value),
        recoveryGoal: recoverySelect.value,
        ...(isTrainerRole() && state.selectedTraineeId
          ? { audienceTraineeId: state.selectedTraineeId }
          : existingPlan?.audienceTraineeId ? { audienceTraineeId: existingPlan.audienceTraineeId } : {}),
        ...((existingPlan?.sourceRoutineId || existingPlan?.id.startsWith('assigned-'))
          ? { sourceRoutineId: existingPlan.sourceRoutineId || existingPlan.id.slice('assigned-'.length) } : {}),
        exercises
      };
      const existingIndex = FIT_DATA.presetWorkouts.findIndex(item => item.id === plan.id);
      if (existingIndex >= 0) FIT_DATA.presetWorkouts[existingIndex] = plan;
      else FIT_DATA.presetWorkouts.push(plan);
      const savedIndex = state.customRoutines.findIndex(item => item.id === plan.id);
      if (savedIndex >= 0) state.customRoutines[savedIndex] = plan;
      else state.customRoutines.push(plan);
      if (!writeStorage(STORAGE_KEYS.customRoutines, state.customRoutines)) return;
      if (isTrainerRole() && state.selectedTraineeId) {
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
      setTab('tab-workouts');
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
    const equipmentTypes = [...new Set(FIT_DATA.exercises.map(exercise => exercise.equipment).filter(Boolean))];
    const preferredIds = plan.exercises.map(entry => entry.preferredExerciseId || entry.exerciseId);
    const availableEquipment = new Set(preferredIds.map(id => getExercise(id)?.equipment).filter(Boolean));
    const overlay = createElement('div', 'dialog-backdrop');
    overlay.className += ' workout-setup-backdrop';
    const dialog = createElement('section', 'dialog-card workout-setup-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'workoutSetupTitle');
    const header = createElement('div', 'dialog-header');
    const heading = createElement('h2', '', 'הכנה לאימון');
    heading.id = 'workoutSetupTitle';
    const close = createElement('button', 'icon-button', 'סגירה');
    close.type = 'button';
    close.addEventListener('click', () => overlay.remove());
    header.append(heading, close);
    dialog.append(header,
      createElement('p', 'equivalent-page-note', 'סמנו את הציוד שזמין עכשיו. לכל תרגיל יוצגו רק המועדף והחלופות השקולות שסומנו על ידי המאמן, ורק אם הציוד שלהן זמין.'));
    const equipmentSection = createElement('fieldset', 'builder-equipment-section');
    equipmentSection.append(createElement('legend', '', 'הציוד שזמין'));
    const equipmentOptions = createElement('div', 'builder-equipment-options');
    equipmentTypes.forEach(equipment => {
      const label = createElement('label', 'builder-equipment-choice');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = equipment;
      checkbox.checked = availableEquipment.has(equipment);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) availableEquipment.add(equipment);
        else availableEquipment.delete(equipment);
        renderChoices();
      });
      label.append(checkbox, document.createTextNode(equipment));
      equipmentOptions.append(label);
    });
    equipmentSection.append(equipmentOptions);
    dialog.append(equipmentSection);
    const choiceList = createElement('div', 'workout-setup-choices');
    dialog.append(choiceList);
    const startButton = createElement('button', 'btn-action-primary workout-setup-start', 'התחלת אימון');
    startButton.type = 'button';
    startButton.disabled = true;
    dialog.append(startButton);
    const selectors = [];
    function renderChoices() {
      choiceList.replaceChildren();
      selectors.length = 0;
      let missingChoices = 0;
      plan.exercises.forEach((entry, index) => {
        const preferredId = entry.preferredExerciseId || entry.exerciseId;
        const preferred = getExercise(preferredId);
        const candidates = getRoutineCandidateExerciseIds(entry).map(getExercise).filter(exercise =>
          exercise && availableEquipment.has(exercise.equipment));
        const card = createElement('label', 'workout-setup-choice');
        card.append(createElement('strong', '', `${index + 1}. ${preferred?.name || 'תרגיל'}`));
        const select = document.createElement('select');
        select.setAttribute('aria-label', `בחירת תרגיל עבור ${preferred?.name || 'תרגיל'} לפי ציוד זמין`);
        fillSelect(select, candidates.map(exercise => ({
          value: exercise.id, label: `${exercise.name} · ${exercise.equipment}${exercise.id === preferredId ? ' · מועדף' : ' · שקול'}`
        })), candidates.some(exercise => exercise.id === (entry.selectedExerciseId || entry.exerciseId))
          ? (entry.selectedExerciseId || entry.exerciseId) : candidates.some(exercise => exercise.id === preferredId) ? preferredId : candidates[0]?.id,
        candidates.length ? '' : 'אין תרגיל תואם לציוד שנבחר');
        if (!candidates.length) {
          missingChoices += 1;
          select.disabled = true;
        }
        selectors.push({ entry, select });
        card.append(select);
        choiceList.append(card);
      });
      startButton.disabled = missingChoices > 0 || selectors.some(item => !item.select.value);
      const existingNotice = dialog.querySelector('.workout-setup-warning');
      existingNotice?.remove();
      if (missingChoices) {
        dialog.insertBefore(createElement('p', 'workout-setup-warning', `${missingChoices} תרגילים ללא תרגיל תואם. סמנו ציוד נוסף או בקשו מהמאמן להגדיר חלופה שקולה.`), startButton);
      }
    }
    startButton.addEventListener('click', () => {
      if (startButton.disabled) return;
      const workoutPlan = {
        ...plan,
        availableEquipment: [...availableEquipment],
        exercises: plan.exercises.map((entry, index) => ({
          ...entry,
          preferredExerciseId: entry.preferredExerciseId || entry.exerciseId,
          exerciseId: selectors[index].select.value
        }))
      };
      overlay.remove();
      launchWorkoutSession(workoutPlan);
    });
    renderChoices();
    overlay.append(dialog);
    overlay.addEventListener('click', event => { if (event.target === overlay) overlay.remove(); });
    document.body.append(overlay);
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
    if (byId('timeCrunchToggleBtn')) byId('timeCrunchToggleBtn').textContent = '⏱️ מצב קצר בזמן: כבוי';
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

  function renderActiveExercises() {
    const list = byId('activeExercisesList');
    const session = state.activeSession;
    if (!list || !session) return;
    list.replaceChildren();
    const renderedAnimations = new Set();
    session.sequence.forEach(({ exerciseIndex, setNumber }, sequenceIndex) => {
      const entry = session.plan.exercises[exerciseIndex];
      const key = `${exerciseIndex}-${setNumber}`;
      if (!session.setLogs[key]) {
        const defaultWeight = Number(entry.weight) || 0;
        session.setLogs[key] = {
          exerciseId: entry.exerciseId,
          weight: defaultWeight,
          reps: Number(entry.reps) || 0,
          rir: entry.targetRir ?? ''
        };
      }
      const log = session.setLogs[key];
      const exercise = getExercise(log.exerciseId) || getExercise(entry.exerciseId);
      const item = createElement('article', `active-exercise-card set-log-card${session.completed.has(key) ? ' completed' : ''}`);
      item.dataset.setKey = key;
      const disclosure = document.createElement('details');
      disclosure.className = 'active-set-disclosure';
      disclosure.open = session.expandedSetKey === key;
      disclosure.addEventListener('toggle', () => {
        if (disclosure.open) session.expandedSetKey = key;
        else if (session.expandedSetKey === key) session.expandedSetKey = null;
      });
      const titleRow = document.createElement('summary');
      titleRow.className = 'exercise-heading active-set-summary';
      titleRow.append(
        createElement('span', 'exercise-number', `סט ${setNumber}/${entry.sets}`),
        createElement('strong', '', exercise?.name || 'Exercise'),
        createElement('span', 'set-type-summary', log.setType === 'warmup' ? 'W' : log.setType === 'drop' ? 'D' : log.setType === 'failure' ? 'F' : 'Working')
      );
      const expandedContent = createElement('div', 'active-set-expanded-content');
      disclosure.append(titleRow, expandedContent);
      item.append(disclosure);
      if (exercise) {
        const exercisePickerLabel = createElement('label', 'set-exercise-picker', 'תרגיל מועדף או שקול · ציוד זמין');
        const exercisePicker = document.createElement('select');
        exercisePicker.setAttribute('aria-label', `בחירת תרגיל שקול לסט ${setNumber}`);
        const sessionEquipment = new Set(session.plan.availableEquipment || []);
        const focusMuscle = entry.muscleGroup || exercise.muscle;
        const allowedIds = new Set(getRoutineCandidateExerciseIds(entry));
        const alternatives = FIT_DATA.exercises.filter(candidate =>
          allowedIds.has(candidate.id) && candidate.muscle === focusMuscle && sessionEquipment.has(candidate.equipment));
        if (!alternatives.some(candidate => candidate.id === exercise.id)) alternatives.unshift(exercise);
        alternatives.forEach(candidate => {
          const option = document.createElement('option');
          option.value = candidate.id;
          option.textContent = `${candidate.name}${sessionEquipment.has(candidate.equipment) ? '' : ' · ציוד לא זמין'}`;
          exercisePicker.append(option);
        });
        exercisePicker.value = exercise.id;
        exercisePicker.addEventListener('change', () => {
          const replacement = getExercise(exercisePicker.value);
          if (!replacement || !allowedIds.has(replacement.id) ||
            replacement.muscle !== focusMuscle || !sessionEquipment.has(replacement.equipment)) return;
          log.exerciseId = replacement.id;
          log.weight = replacement.defaultWeight;
          log.reps = replacement.defaultReps;
          renderActiveExercises();
        });
        exercisePickerLabel.append(exercisePicker);
        expandedContent.append(exercisePickerLabel, renderMuscleActivation(exercise));
          const suggestion = getProgressiveOverloadSuggestion(exercise.id, Number(entry.reps) || 0);
          if (suggestion && setNumber === 1) {
            expandedContent.append(createElement('p', 'progressive-overload-note',
              `הצעת עומס לאימון הבא: ${formatNumber(suggestion.weight)} ק״ג (+${formatNumber(suggestion.increase)} ק״ג), לאחר השלמת כל חזרות היעד באימון הקודם.`));
          }
          if (entry.muscleGroup && entry.muscleGroup !== exercise.muscle) {
          expandedContent.append(createElement('p', 'muscle-focus-label', `קבוצת מיקוד בתוכנית: ${muscleLabel(entry.muscleGroup)}`));
        }
      }
      if (exercise && !renderedAnimations.has(exercise.id)) {
        expandedContent.append(createExerciseAnimation(exercise, true));
        renderedAnimations.add(exercise.id);
      }
      const fields = createElement('div', 'set-input-grid');
      const setTypePicker = createElement('div', 'set-type-picker');
      setTypePicker.setAttribute('role', 'group');
      setTypePicker.setAttribute('aria-label', 'סוג הסט');
      [
        ['warmup', 'W · חימום'],
        ['working', 'סט עבודה'],
        ['drop', 'D · דרופ'],
        ['failure', 'F · כשל']
      ].forEach(([value, label]) => {
        const option = createElement('button', `set-type-chip${(log.setType || 'working') === value ? ' active' : ''}`, label);
        option.type = 'button';
        option.setAttribute('aria-pressed', String((log.setType || 'working') === value));
        option.addEventListener('click', () => {
          log.setType = value;
          setTypePicker.querySelectorAll('button').forEach(button => {
            const active = button === option;
            button.classList.toggle('active', active);
            button.setAttribute('aria-pressed', String(active));
          });
          titleRow.querySelector('.set-type-summary').textContent = value === 'warmup' ? 'W' : value === 'drop' ? 'D' : value === 'failure' ? 'F' : 'Working';
        });
        setTypePicker.append(option);
      });
      fields.append(setTypePicker);
      [
        ['weight', 'משקל (ק״ג)', 0, 1000, 0.5],
        ['reps', 'חזרות', 0, 1000, 1]
      ].forEach(([field, label, min, max, step]) => {
        const fieldLabel = createElement('label', '', label);
        const adjuster = createElement('div', 'set-field-adjuster');
        const input = document.createElement('input');
        input.type = 'number';
        input.min = String(min);
        input.max = String(max);
        input.step = String(step);
        input.value = String(log[field]);
        adjuster.append(input);
        input.addEventListener('change', () => {
          const value = Number(input.value);
          const validStep = field === 'weight' ? Number.isInteger(value * 2) : Number.isInteger(value);
          if (!Number.isFinite(value) || !validStep || value < Number(min) || value > Number(max)) {
            input.value = String(log[field]);
            return;
          }
          log[field] = value;
        });
        const adjustments = field === 'reps'
          ? [['−1', -1], ['+1', 1]]
          : [['+2.5 kg', 2.5], ['+5 kg', 5]];
        adjustments.forEach(([text, delta]) => {
          const adjust = createElement('button', 'set-adjust-button', text);
          adjust.type = 'button';
          adjust.addEventListener('click', () => {
            const next = Math.max(Number(min), Math.min(Number(max), Number(log[field]) + delta));
            log[field] = Math.round(next * 2) / 2;
            input.value = String(log[field]);
          });
          adjuster.append(adjust);
        });
        fieldLabel.append(adjuster);
        fields.append(fieldLabel);
      });
      const rirLabel = createElement('label', 'rir-field', 'RIR · חזרות שנותרו');
      const rirSelect = document.createElement('select');
      rirSelect.setAttribute('aria-label', 'RIR, כמה חזרות נשארו לפני כשל טכני');
      rirSelect.innerHTML = '<option value="">לא חובה</option><option value="0">0 · כשל</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4+</option>';
      rirSelect.value = log.rir === '' || log.rir == null ? '' : String(log.rir);
      rirSelect.addEventListener('change', () => {
        log.rir = rirSelect.value === '' ? '' : Number(rirSelect.value);
      });
      const rirHelp = createElement('span', 'rir-help', 'ⓘ');
      rirHelp.title = 'RIR הוא מספר החזרות הנוספות שהערכתם שהייתם יכולים לבצע בטכניקה תקינה. 0 = כשל טכני; 1–2 = נותרו חזרה או שתיים.';
      rirHelp.setAttribute('aria-label', rirHelp.title);
      rirLabel.append(rirSelect, rirHelp);
      fields.append(rirLabel);
      expandedContent.append(fields);
      const actions = createElement('div', 'set-log-actions');
      const done = createElement('button', 'set-done-button', session.completed.has(key) ? 'הושלם ✓' : 'סיום סט');
      done.type = 'button';
      done.setAttribute('aria-pressed', String(session.completed.has(key)));
      done.addEventListener('click', () => {
        if (session.completed.has(key)) session.completed.delete(key);
        else session.completed.add(key);
        const completed = session.completed.has(key);
        if (completed) log.completedAt = new Date().toISOString();
        else delete log.completedAt;
        item.classList.toggle('completed', completed);
        done.textContent = completed ? 'הושלם ✓' : 'סיום סט';
        done.setAttribute('aria-pressed', String(completed));
        const nextRestButton = list.querySelector(`[data-rest-after="${key}"]`);
        if (nextRestButton) nextRestButton.disabled = !completed;
        if (!completed && session.restTimer?.key === key) {
          if (session.restInterval) window.clearInterval(session.restInterval);
          session.restInterval = null;
          session.restTimer = null;
        }
        if (completed && nextRestButton && session.restSeconds > 0) {
          startRestTimer(session.restSeconds, nextRestButton);
        }
      });
      actions.append(done);
      expandedContent.append(actions);
      const isLastSetForExercise = !session.sequence.slice(sequenceIndex + 1)
        .some(next => next.exerciseIndex === exerciseIndex);
      if (isLastSetForExercise && Number(entry.sets) < 20) {
        const addSetButton = createElement('button', 'btn-add-set active-add-set', '＋ הוספת סט');
        addSetButton.type = 'button';
        addSetButton.addEventListener('click', () => {
          const previous = session.setLogs[`${exerciseIndex}-${Number(entry.sets)}`] || log;
          entry.sets = Math.min(20, Number(entry.sets) + 1);
          const nextSetNumber = Number(entry.sets);
          session.setLogs[`${exerciseIndex}-${nextSetNumber}`] = {
            exerciseId: previous.exerciseId || entry.exerciseId,
            weight: Number(previous.weight) || 0,
            reps: Number(previous.reps) || Number(entry.reps) || 0,
            rir: previous.rir ?? '',
            setType: previous.setType || 'working'
          };
          session.expandedSetKey = `${exerciseIndex}-${nextSetNumber}`;
          session.sequence = createSetSequence(session.plan, session.timeCrunch);
          renderActiveExercises();
          byId('activeExercisesList')?.querySelector(`[data-set-key="${session.expandedSetKey}"]`)
            ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
        item.append(addSetButton);
      }
      list.append(item);
      if (sequenceIndex < session.sequence.length - 1) {
        const restSlot = createElement('div', 'between-set-rest');
        restSlot.append(createElement('span', '', 'מנוחה עד הסט הבא'));
        const restButton = createElement('button', 'btn-action-secondary', `התחלת מנוחה · ${session.restSeconds} שנ׳`);
        restButton.type = 'button';
        restButton.disabled = !session.completed.has(key);
        restButton.dataset.restAfter = key;
        restButton.addEventListener('click', () => startRestTimer(session.restSeconds, restButton));
        if (session.restTimer?.key === key) {
          session.restTimer.button = restButton;
          updateRestTimer(session);
        }
        restSlot.append(restButton);
        list.append(restSlot);
      }
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
    document.querySelectorAll('.between-set-rest button').forEach(button => {
      if (!button.dataset.remaining) button.textContent = `התחלת מנוחה · ${value} שנ׳`;
    });
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

  function startRestTimer(seconds, button) {
    const session = state.activeSession;
    if (session?.restInterval) window.clearInterval(session.restInterval);
    let remaining = Math.max(0, Number(seconds) || 0);
    if (remaining === 0) {
      if (session) session.restTimer = null;
      button.textContent = 'אין מנוחה מתוכננת ✓';
      return;
    }
    if (!session) return;
    session.restTimer = {
      key: button.dataset.restAfter,
      endsAt: Date.now() + remaining * 1000,
      button,
      completed: false
    };
    updateRestTimer(session);
    session.restInterval = window.setInterval(() => updateRestTimer(session), 250);
  }

  function updateRestTimer(session) {
    const timer = session?.restTimer;
    const button = timer?.button;
    if (!timer || !button) return;
    if (timer.completed) {
      delete button.dataset.remaining;
      button.textContent = 'המנוחה הסתיימה ✓';
      return;
    }
    const remaining = Math.max(0, Math.ceil((timer.endsAt - Date.now()) / 1000));
    if (remaining === 0) {
      if (session.restInterval) window.clearInterval(session.restInterval);
      session.restInterval = null;
      timer.completed = true;
      delete button.dataset.remaining;
      button.textContent = 'המנוחה הסתיימה ✓';
      return;
    }
    button.dataset.remaining = 'true';
    button.textContent = `מנוחה · ${remaining} שנ׳`;
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
      const log = session.setLogs[`${exerciseIndex}-${setNumber}`];
      return { ...log, exerciseName: getExercise(log.exerciseId || session.plan.exercises[exerciseIndex].exerciseId)?.name || 'Exercise',
        exerciseId: log.exerciseId || session.plan.exercises[exerciseIndex].exerciseId, setNumber,
        targetReps: Number(session.plan.exercises[exerciseIndex].reps) || 0,
        muscleGroup: session.plan.exercises[exerciseIndex].muscleGroup || getExercise(log.exerciseId)?.muscle,
        completed: session.completed.has(`${exerciseIndex}-${setNumber}`) };
    });
    const totalSets = session.sequence.length;
    const completedSets = loggedSets.filter(set => set.completed);
    const totalVolume = completedSets.reduce((sum, set) => sum + (Number(set.weight) || 0) * (Number(set.reps) || 0), 0);
    const primaryMuscleSetCounts = completedSets.reduce((counts, set) => {
      const primaryMuscle = set.muscleGroup || getExercise(set.exerciseId)?.muscle;
      if (primaryMuscle) counts[primaryMuscle] = (counts[primaryMuscle] || 0) + 1;
      return counts;
    }, {});
    const workout = {
      id: `workout-${Date.now()}`,
      routineId: session.plan.id,
      name: session.plan.name,
      completedAt: new Date().toISOString(),
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
    state.activeSession = null;
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
      ? '⏱️ מצב קצר בזמן: פעיל ✓'
      : '⏱️ מצב קצר בזמן: כבוי';
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
      badge: '📥 תוכנית מיובאת',
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
    byId('closeBarcodeScannerBtn')?.addEventListener('click', () => {
      stopBarcodeScanner();
      if (byId('barcodeScannerDialog')) byId('barcodeScannerDialog').hidden = true;
    });
    byId('startBarcodeScannerBtn')?.addEventListener('click', startBarcodeScanner);
    byId('barcodeScannerDialog')?.addEventListener('click', event => {
      if (event.target === byId('barcodeScannerDialog')) {
        stopBarcodeScanner();
        byId('barcodeScannerDialog').hidden = true;
      }
    });
    byId('closeExerciseLibraryBtn')?.addEventListener('click', () => {
      byId('exerciseLibraryDialog').hidden = true;
    });
    byId('exerciseLibraryDoneBtn')?.addEventListener('click', () => {
      state.exerciseLibraryOnDone?.(state.exerciseLibrarySelection);
      byId('exerciseLibraryDialog').hidden = true;
    });
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
      if (event.target === byId('exerciseLibraryDialog')) byId('exerciseLibraryDialog').hidden = true;
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (byId('barcodeScannerDialog') && !byId('barcodeScannerDialog').hidden) {
          stopBarcodeScanner();
          byId('barcodeScannerDialog').hidden = true;
        }
        if (byId('exerciseLibraryDialog')) byId('exerciseLibraryDialog').hidden = true;
        byId('createWorkoutDialog')?.remove();
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
    byId('coachBuildProgramBtn')?.addEventListener('click', () => createWorkoutModal());
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
    });
    byId('importRoutineCodeBtn')?.addEventListener('click', importRoutine);
    byId('timeCrunchToggleBtn')?.addEventListener('click', toggleTimeCrunchMode);
    byId('finishWorkoutBtn')?.addEventListener('click', finishWorkout);
    window.addEventListener('hashchange', () => {
      if (window.location.hash === '#/admin/dashboard') {
        if (!isTrainerRole()) {
          alert('הנתיב מוגן בתצוגה המקומית. יש להיכנס למצב מאמן הדגמה, שאינו אימות מאובטח.');
          window.location.hash = '#/';
          setTab('tab-dashboard');
          return;
        }
        setTab('tab-coach');
      }
    });
    window.addEventListener('resize', () => {
      if (state.activeTab === 'tab-progress') drawWeightChart();
    });
  }

  function init() {
    addProgressControls();
    bindEvents();
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
      if (isTrainerRole()) setTab('tab-coach');
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
