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
    normalizeRole,
    roleImpliesTrainer,
    relationIdFor,
    FULL_PERMISSIONS: Object.freeze({
      canViewSleep: true,
      canViewNutrition: true,
      canViewWorkouts: true,
      canViewDailyLogs: true
    })
  };
})(typeof window !== 'undefined' ? window : globalThis);
