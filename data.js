/**
 * FitPulse - Master Data & Preset Libraries
 * מסד נתונים עשיר ומעודכן הכולל תרגילים באנגלית, רשתות מזון מהיר, יחס אומגה 3/6, ותמיכה בשיתוף אימונים
 */

const FIT_DATA = {
  // קטגוריות שרירים
  muscleGroups: [
    { id: 'all', name: 'All Muscles', icon: '⚡' },
    { id: 'chest', name: 'Chest', icon: '⚡' },
    { id: 'back', name: 'Back', icon: '🦅' },
    { id: 'legs', name: 'Legs & Glutes', icon: '🦵' },
    { id: 'shoulders', name: 'Shoulders', icon: '🛡️' },
    { id: 'arms', name: 'Arms', icon: '💪' },
    { id: 'core', name: 'Core', icon: '🎯' },
    { id: 'cardio', name: 'Cardio', icon: '🔥' }
  ],

  // אפשרויות זמן מנוחה בין סטים לבחירה
  restTimeOptions: [
    { seconds: 90, label: '1.5 Minutes (90s)' },
    { seconds: 120, label: '2 Minutes (120s)' },
    { seconds: 150, label: '2.5 Minutes (150s)' },
    { seconds: 180, label: '3 Minutes (180s)' },
    { seconds: 210, label: '3.5 Minutes (210s)' },
    { seconds: 240, label: '4 Minutes (240s)' },
    { seconds: 300, label: '5 Minutes (300s)' }
  ],

  // סולם דרגת קושי (RPE 1-10) בסיום אימון
  difficultyScale: [
    { level: 1, label: 'Very Easy', desc: 'Light recovery, zero effort', color: '#10b981' },
    { level: 2, label: 'Extremely Light', desc: 'Light warm-up, completely normal breathing', color: '#10b981' },
    { level: 3, label: 'Easy', desc: 'Light effort, can talk easily', color: '#34d399' },
    { level: 4, label: 'Moderate', desc: 'Heart rate rising, comfortable effort', color: '#6ee7b7' },
    { level: 5, label: 'Medium', desc: 'Good work, plenty of energy left', color: '#fbbf24' },
    { level: 6, label: 'Medium-Hard', desc: 'Slightly heavy breathing, ~4 reps left in reserve', color: '#f59e0b' },
    { level: 7, label: 'Hard & Intense', desc: 'Challenging, ~3 reps left in reserve', color: '#f97316' },
    { level: 8, label: 'Very Hard (Optimal)', desc: 'Strong effort, 1-2 reps left (RPE 8)', color: '#ea580c' },
    { level: 9, label: 'Extremely Hard', desc: 'Near total muscle failure (1 rep left)', color: '#f43f5e' },
    { level: 10, label: 'Absolute Failure', desc: 'Complete muscle failure! Could not perform another rep', color: '#ef4444' }
  ],

  // מאגר תרגילים באנגלית מלאה עם אנימציות בסגנון Hevy
  exercises: [
    // --- CHEST ---
    { id: 'ex_pec_deck', name: 'Pec Deck Fly', muscle: 'chest', category: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: 45, tips: 'Keep chest lifted and squeeze pectorals together at full contraction' },
    { id: 'ex_bench_press', name: 'Barbell Bench Press', muscle: 'chest', category: 'Chest', defaultSets: 4, defaultReps: 8, defaultWeight: 70, tips: 'Keep feet planted firm and elbows tucked at a 75-degree angle' },
    { id: 'ex_incline_db_press', name: 'Incline Dumbbell Press', muscle: 'chest', category: 'Chest', defaultSets: 3, defaultReps: 10, defaultWeight: 24, tips: 'Set bench to a 30-degree incline and focus on upper chest contraction' },
    { id: 'ex_cable_fly', name: 'Cable Crossover Fly', muscle: 'chest', category: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: 15, tips: 'Maintain a slight bend in elbows and hug forward for constant tension' },
    { id: 'ex_dips', name: 'Chest Dips', muscle: 'chest', category: 'Chest', defaultSets: 3, defaultReps: 12, defaultWeight: 0, tips: 'Lean torso forward slightly to place primary emphasis on lower chest' },
    { id: 'ex_pushups', name: 'Push-Ups', muscle: 'chest', category: 'Chest', defaultSets: 3, defaultReps: 20, defaultWeight: 0, tips: 'Maintain a rigid plank posture and lower chest to an inch off the ground' },
    { id: 'ex_decline_press', name: 'Decline Bench Press', muscle: 'chest', category: 'Chest', defaultSets: 3, defaultReps: 10, defaultWeight: 65, tips: 'Isolates lower chest fibers while reducing front delt strain' },

    // --- BACK ---
    { id: 'ex_lat_pulldown', name: 'Lat Pulldown', muscle: 'back', category: 'Back', defaultSets: 4, defaultReps: 10, defaultWeight: 55, tips: 'Avoid swinging your lower back; drive down through your elbows' },
    { id: 'ex_pullups', name: 'Wide-Grip Pull-Up', muscle: 'back', category: 'Back', defaultSets: 4, defaultReps: 8, defaultWeight: 0, tips: 'Pull chest toward bar while retracting shoulder blades down and back' },
    { id: 'ex_barbell_row', name: 'Bent-Over Barbell Row', muscle: 'back', category: 'Back', defaultSets: 4, defaultReps: 8, defaultWeight: 60, tips: 'Keep spine flat, core engaged, and pull bar directly toward belly button' },
    { id: 'ex_seated_cable_row', name: 'Seated Cable Row', muscle: 'back', category: 'Back', defaultSets: 3, defaultReps: 12, defaultWeight: 50, tips: 'Full stretch forward followed by maximum scapular squeeze backwards' },
    { id: 'ex_one_arm_db_row', name: 'One-Arm Dumbbell Row', muscle: 'back', category: 'Back', defaultSets: 3, defaultReps: 10, defaultWeight: 26, tips: 'Pull dumbbell toward hip crease while maintaining square shoulders' },
    { id: 'ex_deadlift', name: 'Conventional Barbell Deadlift', muscle: 'back', category: 'Back', defaultSets: 4, defaultReps: 6, defaultWeight: 110, tips: 'Ultimate power lift: drive the floor away and keep neutral spine' },
    { id: 'ex_pullover_cable', name: 'Straight-Arm Cable Pulldown', muscle: 'back', category: 'Back', defaultSets: 3, defaultReps: 15, defaultWeight: 25, tips: 'Isolates latissimus dorsi without bicep fatigue' },

    // --- LEGS & GLUTES ---
    { id: 'ex_squat', name: 'Barbell Back Squat', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 4, defaultReps: 8, defaultWeight: 90, tips: 'Squat below parallel with heels firmly planted on the floor' },
    { id: 'ex_front_squat', name: 'Barbell Front Squat', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 3, defaultReps: 8, defaultWeight: 65, tips: 'High elbow position emphasizes quad isolation and upright posture' },
    { id: 'ex_leg_press', name: 'Leg Press', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 4, defaultReps: 10, defaultWeight: 140, tips: 'Do not lock knees out at the top to protect joints' },
    { id: 'ex_rdl', name: 'Romanian Deadlift', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 3, defaultReps: 10, defaultWeight: 65, tips: 'Hinge hips backwards with soft knees to stretch hamstrings fully' },
    { id: 'ex_lunges', name: 'Dumbbell Walking Lunges', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 3, defaultReps: 12, defaultWeight: 16, tips: 'Take long strides maintaining 90-degree bend in both knees' },
    { id: 'ex_bulgarian_split_squat', name: 'Bulgarian Split Squat', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 3, defaultReps: 10, defaultWeight: 14, tips: 'Unilateral leg strength builder with high quad/glute activation' },
    { id: 'ex_leg_extension', name: 'Leg Extension', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 3, defaultReps: 12, defaultWeight: 50, tips: 'Isolates quadriceps at full extension with 1-second pause' },
    { id: 'ex_hamstring_curl', name: 'Lying Leg Curl', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 3, defaultReps: 12, defaultWeight: 45, tips: 'Controlled eccentric phase for optimal hamstring fiber loading' },
    { id: 'ex_hip_thrust', name: 'Barbell Hip Thrust', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 4, defaultReps: 10, defaultWeight: 80, tips: 'Maximum glute squeeze at top lockout with chin tucked' },
    { id: 'ex_calf_raise', name: 'Standing Calf Raise', muscle: 'legs', category: 'Legs & Glutes', defaultSets: 4, defaultReps: 15, defaultWeight: 45, tips: 'Pause for 1 second at full stretch and contraction' },

    // --- SHOULDERS ---
    { id: 'ex_ohp', name: 'Overhead Barbell Press (OHP)', muscle: 'shoulders', category: 'Shoulders', defaultSets: 4, defaultReps: 8, defaultWeight: 45, tips: 'Squeeze glutes and abs tightly to support spinal posture' },
    { id: 'ex_db_shoulder_press', name: 'Seated Dumbbell Shoulder Press', muscle: 'shoulders', category: 'Shoulders', defaultSets: 3, defaultReps: 10, defaultWeight: 22, tips: 'Full range of motion without arching lower back' },
    { id: 'ex_db_lateral_raise', name: 'Dumbbell Lateral Raise', muscle: 'shoulders', category: 'Shoulders', defaultSets: 4, defaultReps: 12, defaultWeight: 10, tips: 'Raise to shoulder height leading with elbows slightly' },
    { id: 'ex_cable_lateral_raise', name: 'Cable Lateral Raise', muscle: 'shoulders', category: 'Shoulders', defaultSets: 3, defaultReps: 12, defaultWeight: 7.5, tips: 'Provides constant cable tension throughout movement' },
    { id: 'ex_face_pull', name: 'Cable Rope Face Pull', muscle: 'shoulders', category: 'Shoulders', defaultSets: 4, defaultReps: 15, defaultWeight: 20, tips: 'Pull rope toward eyes while externally rotating shoulders' },
    { id: 'ex_reverse_pec_deck', name: 'Reverse Pec Deck Fly', muscle: 'shoulders', category: 'Shoulders', defaultSets: 3, defaultReps: 15, defaultWeight: 35, tips: 'Strengthens rear deltoids and postural upper back' },

    // --- ARMS ---
    { id: 'ex_bicep_curl', name: 'EZ-Bar Bicep Curl', muscle: 'arms', category: 'Arms', defaultSets: 3, defaultReps: 10, defaultWeight: 30, tips: 'Keep elbows pinned to sides without swinging torso' },
    { id: 'ex_db_incline_curl', name: 'Incline Dumbbell Curl', muscle: 'arms', category: 'Arms', defaultSets: 3, defaultReps: 10, defaultWeight: 12, tips: 'Deep stretch on the long head of the bicep' },
    { id: 'ex_hammer_curl', name: 'Dumbbell Hammer Curl', muscle: 'arms', category: 'Arms', defaultSets: 3, defaultReps: 12, defaultWeight: 14, tips: 'Targets brachialis and forearm thickness' },
    { id: 'ex_tricep_pushdown', name: 'Cable Rope Tricep Pushdown', muscle: 'arms', category: 'Arms', defaultSets: 3, defaultReps: 12, defaultWeight: 25, tips: 'Lock elbows in place and spread rope apart at lockout' },
    { id: 'ex_skull_crushers', name: 'EZ-Bar Skullcrushers', muscle: 'arms', category: 'Arms', defaultSets: 3, defaultReps: 10, defaultWeight: 25, tips: 'Lower bar toward forehead keeping elbows fixed' },

    // --- CORE & CARDIO ---
    { id: 'ex_plank', name: 'Forearm Plank', muscle: 'core', category: 'Core', defaultSets: 3, defaultReps: 60, defaultWeight: 0, tips: 'Hold rigid body alignment with tight abs and glutes' },
    { id: 'ex_hanging_leg_raise', name: 'Hanging Leg Raise', muscle: 'core', category: 'Core', defaultSets: 3, defaultReps: 12, defaultWeight: 0, tips: 'Curl pelvis upward to flex abdominals effectively' },
    { id: 'ex_hiit_sprints', name: 'Treadmill HIIT Sprints', muscle: 'cardio', category: 'Cardio', defaultSets: 8, defaultReps: 30, defaultWeight: 0, tips: '30 seconds sprint at 90% intensity followed by 45s walk' }
  ],

  // קטגוריות ועמודות אימון ייעודיות ונפרדות לכל סוג אימון
  workoutCategories: [
    { id: 'all', name: 'כל האימונים', icon: '⚡' },
    { id: 'push', name: 'אימוני דחיפה (Push)', icon: '🏋️‍♂️', desc: 'חזה, כתפיים ויד אחורית' },
    { id: 'pull', name: 'אימוני משיכה (Pull)', icon: '🦅', desc: 'גב, דלתא אחורית ויד קדמית' },
    { id: 'legs', name: 'אימוני רגליים (Legs)', icon: '🦵', desc: 'ארבע ראשי, המסטרינגס, ישבן ותאומים' },
    { id: 'upper', name: 'פלג גוף עליון (Upper)', icon: '💪', desc: 'אימון מקיף לפלג הגוף העליון' },
    { id: 'lower', name: 'פלג גוף תחתון (Lower)', icon: '🦿', desc: 'כוח והיפרטרופיה לפלג הגוף התחתון' },
    { id: 'full_body', name: 'גוף מלא (Full Body)', icon: '🔥', desc: 'תרכובות מורכבות לכל הגוף' },
    { id: 'specialized', name: 'שילובים ממוקדים (Splits)', icon: '🎯', desc: 'חזה-גב, כתפיים-ידיים ועוד' }
  ],

  // מאגר אימונים מסודר בעמודות וקטגוריות נפרדות (ללא איחוד שגוי או כפילויות)
  presetWorkouts: [
    // --- 1. PUSH (דחיפה) ---
    {
      id: 'session_push',
      category: 'push',
      section: 'individual_session',
      name: 'Push Session',
      hebrewName: 'אימון פוש (דחיפה)',
      subtitle: 'חזה, כתפיים ויד אחורית (Chest, Shoulders & Triceps Focus)',
      level: 'Intermediate',
      durationMinutes: 60,
      caloriesBurnEstimate: 420,
      defaultRestSeconds: 90,
      badge: '🏋️‍♂️ Push',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 70 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 24 },
        { exerciseId: 'ex_machine_chest_press', sets: 3, reps: 10, weight: 55 },
        { exerciseId: 'ex_pec_deck', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_ohp', sets: 3, reps: 8, weight: 40 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 4, reps: 12, weight: 7.5 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_overhead_cable_triceps', sets: 3, reps: 12, weight: 20 }
      ]
    },

    // --- 2. PULL (משיכה) ---
    {
      id: 'session_pull',
      category: 'pull',
      section: 'individual_session',
      name: 'Pull Session',
      hebrewName: 'אימון פול (משיכה)',
      subtitle: 'גב, דלתא אחורית ויד קדמית (Back, Rear Delts & Biceps Focus)',
      level: 'Intermediate',
      durationMinutes: 60,
      caloriesBurnEstimate: 410,
      defaultRestSeconds: 90,
      badge: '🦅 Pull',
      exercises: [
        { exerciseId: 'ex_lat_pulldown', sets: 4, reps: 10, weight: 55 },
        { exerciseId: 'ex_pullups', sets: 4, reps: 8, weight: 0 },
        { exerciseId: 'ex_barbell_row', sets: 4, reps: 8, weight: 60 },
        { exerciseId: 'ex_seated_cable_row', sets: 3, reps: 12, weight: 50 },
        { exerciseId: 'ex_pullover_cable', sets: 3, reps: 15, weight: 25 },
        { exerciseId: 'ex_face_pull', sets: 4, reps: 15, weight: 20 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 10, weight: 30 },
        { exerciseId: 'ex_db_incline_curl', sets: 3, reps: 12, weight: 12 }
      ]
    },

    // --- 3. LEGS (רגליים) ---
    {
      id: 'session_legs',
      category: 'legs',
      section: 'individual_session',
      name: 'Legs Session',
      hebrewName: 'אימון רגליים (Legs)',
      subtitle: 'ארבע ראשי, המסטרינגס, ישבן ותאומים (Quads, Hamstrings & Glutes Focus)',
      level: 'Advanced',
      durationMinutes: 65,
      caloriesBurnEstimate: 480,
      defaultRestSeconds: 120,
      badge: '🦵 Legs',
      exercises: [
        { exerciseId: 'ex_squat', sets: 4, reps: 8, weight: 90 },
        { exerciseId: 'ex_leg_press', sets: 4, reps: 10, weight: 140 },
        { exerciseId: 'ex_rdl', sets: 3, reps: 10, weight: 65 },
        { exerciseId: 'ex_bulgarian_split_squat', sets: 3, reps: 10, weight: 14 },
        { exerciseId: 'ex_leg_extension', sets: 3, reps: 12, weight: 50 },
        { exerciseId: 'ex_hamstring_curl', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_hip_thrust', sets: 3, reps: 10, weight: 80 },
        { exerciseId: 'ex_calf_raise', sets: 4, reps: 15, weight: 45 }
      ]
    },

    // --- 4. UPPER BODY (פלג גוף עליון) ---
    {
      id: 'session_upper',
      category: 'upper',
      section: 'individual_session',
      name: 'Upper Body Session',
      hebrewName: 'אימון פלג גוף עליון (Upper)',
      subtitle: 'חזה, גב, כתפיים וידיים (Complete Upper Body Hypertrophy)',
      level: 'All Levels',
      durationMinutes: 60,
      caloriesBurnEstimate: 430,
      defaultRestSeconds: 90,
      badge: '💪 Upper',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 65 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 22 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 55 },
        { exerciseId: 'ex_lat_pulldown', sets: 3, reps: 10, weight: 50 },
        { exerciseId: 'ex_db_shoulder_press', sets: 3, reps: 10, weight: 20 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 3, reps: 12, weight: 7.5 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 }
      ]
    },

    // --- 5. LOWER BODY (פלג גוף תחתון) ---
    {
      id: 'session_lower',
      category: 'lower',
      section: 'individual_session',
      name: 'Lower Body Session',
      hebrewName: 'אימון פלג גוף תחתון (Lower)',
      subtitle: 'כוח והיפרטרופיה לכל פלג הגוף התחתון (Quads, Posterior Chain & Calves)',
      level: 'All Levels',
      durationMinutes: 60,
      caloriesBurnEstimate: 450,
      defaultRestSeconds: 120,
      badge: '🦿 Lower',
      exercises: [
        { exerciseId: 'ex_squat', sets: 4, reps: 8, weight: 85 },
        { exerciseId: 'ex_rdl', sets: 3, reps: 10, weight: 60 },
        { exerciseId: 'ex_leg_press', sets: 3, reps: 10, weight: 130 },
        { exerciseId: 'ex_bulgarian_split_squat', sets: 3, reps: 10, weight: 14 },
        { exerciseId: 'ex_leg_extension', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_hamstring_curl', sets: 3, reps: 12, weight: 40 },
        { exerciseId: 'ex_calf_raise', sets: 4, reps: 15, weight: 40 },
        { exerciseId: 'ex_hanging_leg_raise', sets: 3, reps: 12, weight: 0 }
      ]
    },

    // --- 6. FULL BODY (גוף מלא) ---
    {
      id: 'session_full_body',
      category: 'full_body',
      section: 'individual_session',
      name: 'Full Body Session',
      hebrewName: 'אימון גוף מלא (Full Body)',
      subtitle: 'תרכובות מורכבות לכל הגוף (Efficient Compound Total Body Routine)',
      level: 'All Levels',
      durationMinutes: 60,
      caloriesBurnEstimate: 460,
      defaultRestSeconds: 90,
      badge: '🔥 Full Body',
      exercises: [
        { exerciseId: 'ex_squat', sets: 3, reps: 8, weight: 80 },
        { exerciseId: 'ex_bench_press', sets: 3, reps: 8, weight: 65 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 55 },
        { exerciseId: 'ex_ohp', sets: 3, reps: 10, weight: 35 },
        { exerciseId: 'ex_rdl', sets: 3, reps: 8, weight: 65 },
        { exerciseId: 'ex_lat_pulldown', sets: 3, reps: 10, weight: 50 },
        { exerciseId: 'ex_bicep_curl', sets: 2, reps: 12, weight: 25 },
        { exerciseId: 'ex_plank', sets: 3, reps: 60, weight: 0 }
      ]
    },

    // --- 7. SPECIALIZED SPLITS (שילובים ממוקדים) ---
    {
      id: 'session_chest_back',
      category: 'specialized',
      section: 'individual_session',
      name: 'Chest & Back',
      hebrewName: 'אימון חזה וגב',
      subtitle: 'אנטגוניסטים עליונים מקיף (Antagonistic Upper Body Session)',
      level: 'Intermediate',
      durationMinutes: 55,
      caloriesBurnEstimate: 420,
      defaultRestSeconds: 90,
      badge: '🎯 Chest & Back',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 70 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 24 },
        { exerciseId: 'ex_pec_deck', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_lat_pulldown', sets: 4, reps: 10, weight: 55 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 60 },
        { exerciseId: 'ex_seated_cable_row', sets: 3, reps: 12, weight: 50 },
        { exerciseId: 'ex_pullover_cable', sets: 3, reps: 15, weight: 25 }
      ]
    },
    {
      id: 'session_shoulders_arms',
      category: 'specialized',
      section: 'individual_session',
      name: 'Shoulders & Arms',
      hebrewName: 'אימון כתפיים וידיים',
      subtitle: 'פיסול ובידוד כתפיים, יד קדמית ואחורית (Delts, Biceps & Triceps)',
      level: 'Intermediate',
      durationMinutes: 55,
      caloriesBurnEstimate: 390,
      defaultRestSeconds: 90,
      badge: '🎯 Shoulders & Arms',
      exercises: [
        { exerciseId: 'ex_ohp', sets: 3, reps: 8, weight: 40 },
        { exerciseId: 'ex_db_shoulder_press', sets: 3, reps: 10, weight: 22 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 4, reps: 12, weight: 10 },
        { exerciseId: 'ex_face_pull', sets: 3, reps: 15, weight: 20 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 10, weight: 30 },
        { exerciseId: 'ex_db_incline_curl', sets: 3, reps: 12, weight: 12 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_skull_crushers', sets: 3, reps: 10, weight: 25 }
      ]
    },
    {
      id: 'session_back_shoulders',
      category: 'specialized',
      section: 'individual_session',
      name: 'Back & Shoulders',
      hebrewName: 'אימון גב וכתפיים',
      subtitle: 'גב, דלתא אחורית ורוחב כתפיים (Back & Shoulders V-Taper)',
      level: 'All Levels',
      durationMinutes: 55,
      caloriesBurnEstimate: 400,
      defaultRestSeconds: 90,
      badge: '🎯 Back & Shoulders',
      exercises: [
        { exerciseId: 'ex_lat_pulldown', sets: 4, reps: 10, weight: 50 },
        { exerciseId: 'ex_barbell_row', sets: 3, reps: 8, weight: 55 },
        { exerciseId: 'ex_seated_cable_row', sets: 3, reps: 12, weight: 45 },
        { exerciseId: 'ex_pullover_cable', sets: 3, reps: 15, weight: 20 },
        { exerciseId: 'ex_db_shoulder_press', sets: 3, reps: 10, weight: 18 },
        { exerciseId: 'ex_cable_lateral_raise', sets: 3, reps: 12, weight: 7.5 },
        { exerciseId: 'ex_reverse_pec_deck', sets: 3, reps: 15, weight: 30 },
        { exerciseId: 'ex_face_pull', sets: 3, reps: 15, weight: 20 }
      ]
    },
    {
      id: 'session_chest_arms',
      category: 'specialized',
      section: 'individual_session',
      name: 'Chest & Arms',
      hebrewName: 'אימון חזה וידיים',
      subtitle: 'חזה, יד קדמית ואחורית (Chest, Biceps & Triceps Hypertrophy)',
      level: 'All Levels',
      durationMinutes: 55,
      caloriesBurnEstimate: 390,
      defaultRestSeconds: 90,
      badge: '🎯 Chest & Arms',
      exercises: [
        { exerciseId: 'ex_bench_press', sets: 4, reps: 8, weight: 65 },
        { exerciseId: 'ex_incline_db_press', sets: 3, reps: 10, weight: 22 },
        { exerciseId: 'ex_cable_fly', sets: 3, reps: 12, weight: 15 },
        { exerciseId: 'ex_dips', sets: 3, reps: 10, weight: 0 },
        { exerciseId: 'ex_bicep_curl', sets: 3, reps: 10, weight: 25 },
        { exerciseId: 'ex_hammer_curl', sets: 3, reps: 12, weight: 14 },
        { exerciseId: 'ex_tricep_pushdown', sets: 3, reps: 12, weight: 25 },
        { exerciseId: 'ex_skull_crushers', sets: 3, reps: 10, weight: 20 }
      ]
    }
  ],

  // קטגוריות מזון כולל רשתות מזון מהיר
  foodCategories: [
    { id: 'all', name: 'הכל' },
    { id: 'chains', name: '🍔 רשתות מזון מהיר' },
    { id: 'protein', name: 'חלבונים ובשר' },
    { id: 'dairy', name: 'מוצרי חלב וביצים' },
    { id: 'grains', name: 'פחמימות ודגנים' },
    { id: 'fats', name: 'שומנים ואגוזים' },
    { id: 'fruit', name: 'פירות' },
    { id: 'vegetables', name: 'ירקות' },
    { id: 'scanned', name: '📷 נסרקו' }
  ],

  // Nutrient values are per 100 g; branded foods are representative estimates, not live manufacturer labels.
  foodsDatabase: [
    { id: 'ff_mcd_bigmac', name: "McDonald's Big Mac", category: 'chains', categoryName: 'רשתות מזון', tags: ['burger', 'beef', 'fast food', 'מקדונלדס', 'המבורגר'], defaultGrams: 215, unitName: 'מנה', calories: 256, protein: 11.6, carbs: 20.9, fat: 14.0, fiber: 1.4, sodium: 470, sugar: 4.2, potassium: 177, omega3: 0.09, omega6: 1.6, icon: '🍔', source: 'Branded reference estimate; check the current package label.' },
    { id: 'ff_mcd_nuggets_10', name: "McDonald's Chicken McNuggets", category: 'chains', categoryName: 'רשתות מזון', tags: ['chicken', 'nuggets', 'fast food', 'מקדונלדס', 'עוף'], defaultGrams: 160, unitName: 'מנה', calories: 263, protein: 15.0, carbs: 15.6, fat: 15.0, fiber: 0.9, sodium: 525, sugar: 0.3, potassium: 200, omega3: 0.06, omega6: 2.3, icon: '🍗', source: 'Branded reference estimate; check the current package label.' },
    { id: 'ff_aroma_halloumi_salad', name: 'Halloumi Salad with Dressing', category: 'chains', categoryName: 'רשתות מזון', tags: ['salad', 'halloumi', 'cheese', 'ארומה', 'חלומי'], defaultGrams: 350, unitName: 'קערה', calories: 194, protein: 8.0, carbs: 6.3, fat: 14.9, fiber: 1.7, sodium: 357, sugar: 2.3, potassium: 154, omega3: 0.11, omega6: 1.7, icon: '🥗', source: 'Restaurant recipe estimate; ingredients and portions vary.' },
    { id: 'ff_dominos_pizza_slice', name: "Domino's Cheese Pizza", category: 'chains', categoryName: 'רשתות מזון', tags: ['pizza', 'cheese', 'fast food', 'דומינוס'], defaultGrams: 105, unitName: 'משולש', calories: 257, protein: 10.5, carbs: 30.5, fat: 10.0, fiber: 1.9, sodium: 552, sugar: 3.3, potassium: 171, omega3: 0.10, omega6: 1.7, icon: '🍕', source: 'Branded reference estimate; recipe varies by region.' },
    { id: 'ff_bbb_burger_220', name: 'Beef Burger Patty, 80/20', category: 'chains', categoryName: 'רשתות מזון', tags: ['beef', 'burger', 'בשר', 'המבורגר'], defaultGrams: 220, unitName: 'קציצה', calories: 218, protein: 19.1, carbs: 0.5, fat: 15.5, fiber: 0, sodium: 282, sugar: 0, potassium: 223, omega3: 0.14, omega6: 0.95, icon: '🥩', source: 'Generic cooked beef reference; restaurant patties vary.' },
    { id: 'f_salmon_fillet', name: 'Atlantic Salmon, Farmed, Raw', category: 'protein', categoryName: 'חלבונים ובשר', tags: ['salmon', 'fish', 'omega-3', 'סלמון', 'דג'], defaultGrams: 150, unitName: 'גרם', calories: 208, protein: 20.42, carbs: 0, fat: 13.42, fiber: 0, sodium: 59, sugar: 0, potassium: 363, omega3: 2.26, omega6: 0.17, icon: '🐟', fdcId: '175167', source: 'USDA FoodData Central, FDC ID 175167, farmed Atlantic salmon, raw. Per 100 g.' },
    { id: 'f_chicken_breast', name: 'Chicken Breast, Roasted', category: 'protein', categoryName: 'חלבונים ובשר', tags: ['chicken', 'poultry', 'lean protein', 'עוף', 'חזה עוף'], defaultGrams: 150, unitName: 'גרם', calories: 165, protein: 31.02, carbs: 0, fat: 3.57, fiber: 0, sodium: 74, sugar: 0, potassium: 256, omega3: 0.03, omega6: 0.74, icon: '🍗', fdcId: '171477', source: 'USDA FoodData Central, FDC ID 171477, roasted chicken breast, meat only. Per 100 g.' },
    { id: 'f_walnuts', name: 'Walnuts, English', category: 'fats', categoryName: 'שומנים ואגוזים', tags: ['nuts', 'omega-3', 'אגוזים', 'אגוזי מלך'], defaultGrams: 30, unitName: 'חופן (30 גרם)', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, sodium: 2, sugar: 2.6, potassium: 441, omega3: 9.08, omega6: 38.09, icon: '🌰', fdcId: '170187', source: 'USDA FoodData Central generic English walnuts reference.' },
    { id: 'f_olive_oil', name: 'Olive Oil', category: 'fats', categoryName: 'שומנים ואגוזים', tags: ['olive', 'oil', 'fat', 'שמן זית'], defaultGrams: 14, unitName: 'כף (14 גרם)', calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sodium: 2, sugar: 0, potassium: 1, omega3: 0.76, omega6: 9.76, icon: '🫒', fdcId: '171413', source: 'USDA FoodData Central olive oil reference.' },
    { id: 'f_banana', name: 'Banana, Raw', category: 'fruit', categoryName: 'פירות', tags: ['fruit', 'carbohydrate', 'banana', 'בננה', 'פרי'], defaultGrams: 118, unitName: 'בננה בינונית', calories: 89, protein: 1.09, carbs: 22.84, fat: 0.33, fiber: 2.6, sodium: 1, sugar: 12.23, potassium: 358, omega3: 0.03, omega6: 0.05, icon: '🍌', fdcId: '173944', source: 'USDA FoodData Central generic raw banana reference.' },
    { id: 'f_oats', name: 'Oats, Dry', category: 'grains', categoryName: 'דגנים', tags: ['oats', 'whole grain', 'fiber', 'שיבולת שועל'], defaultGrams: 40, unitName: 'מנה (40 גרם)', calories: 379, protein: 13.15, carbs: 67.7, fat: 6.52, fiber: 10.1, sodium: 6, sugar: 0.99, potassium: 362, omega3: 0.11, omega6: 2.42, icon: '🥣', fdcId: '173904', source: 'USDA FoodData Central generic dry oats reference.' },
    { id: 'f_rice', name: 'White Rice, Cooked', category: 'grains', categoryName: 'דגנים', tags: ['rice', 'carbohydrate', 'אורז'], defaultGrams: 150, unitName: 'מנה', calories: 130, protein: 2.69, carbs: 28.17, fat: 0.28, fiber: 0.4, sodium: 1, sugar: 0.05, potassium: 35, omega3: 0.01, omega6: 0.06, icon: '🍚', fdcId: '168878', source: 'USDA FoodData Central generic cooked white rice reference.' },
    { id: 'f_egg', name: 'Egg, Hard-Boiled', category: 'dairy', categoryName: 'מוצרי חלב וביצים', tags: ['egg', 'protein', 'ביצה'], defaultGrams: 50, unitName: 'ביצה', calories: 155, protein: 12.58, carbs: 1.12, fat: 10.61, fiber: 0, sodium: 124, sugar: 1.12, potassium: 126, omega3: 0.04, omega6: 1.22, icon: '🥚', fdcId: '173424', source: 'USDA FoodData Central generic hard-boiled egg reference.' },
    { id: 'f_greek_yogurt', name: 'Greek Yogurt, Plain, Nonfat', category: 'dairy', categoryName: 'מוצרי חלב וביצים', tags: ['yogurt', 'dairy', 'protein', 'יוגורט'], defaultGrams: 170, unitName: 'גביע', calories: 59, protein: 10.19, carbs: 3.6, fat: 0.39, fiber: 0, sodium: 36, sugar: 3.24, potassium: 141, omega3: 0.01, omega6: 0.02, icon: '🥛', source: 'USDA FoodData Central generic plain nonfat Greek yogurt reference.' },
    { id: 'f_avocado', name: 'Avocado, Raw', category: 'fruit', categoryName: 'פירות', tags: ['avocado', 'fiber', 'אבוקדו'], defaultGrams: 100, unitName: 'גרם', calories: 160, protein: 2, carbs: 8.53, fat: 14.66, fiber: 6.7, sodium: 7, sugar: 0.66, potassium: 485, omega3: 0.11, omega6: 1.67, icon: '🥑', fdcId: '171705', source: 'USDA FoodData Central generic raw avocado reference.' },
    { id: 'f_broccoli', name: 'Broccoli, Cooked', category: 'vegetables', categoryName: 'ירקות', tags: ['broccoli', 'vegetable', 'fiber', 'ברוקולי'], defaultGrams: 100, unitName: 'גרם', calories: 35, protein: 2.38, carbs: 7.18, fat: 0.41, fiber: 3.3, sodium: 41, sugar: 1.39, potassium: 293, omega3: 0.10, omega6: 0.03, icon: '🥦', source: 'USDA FoodData Central generic cooked broccoli reference.' }
  ],

  // נתוני מתאמנים בלעדיים למאמן
  coachTrainees: [
    {
      id: 'client_1',
      name: 'דניאל כהן',
      avatar: '👨‍🦱',
      age: 28,
      weight: 82.0,
      targetCalories: 2400,
      consumedCalories: 2150,
      consumedProtein: 172,
      burnedCalories: 380,
      waterMl: 2600,
      sleepHours: 7.5,
      hasWorkedOutToday: true,
      lastWorkout: {
        title: 'Push Session',
        durationMinutes: 52,
        completedSets: 20,
        totalVolume: 1620,
        difficulty: 8,
        difficultyLabel: 'Very Hard (RPE 8)',
        notes: 'Pec Deck Fly weights increased!',
        exercises: [
          { name: 'Pec Deck Fly', sets: 4, reps: 12, weight: 50 },
          { name: 'Barbell Bench Press', sets: 4, reps: 8, weight: 75 }
        ]
      },
      mealsToday: [
        { name: 'Protein Shake & Oats', calories: 420, protein: 38 },
        { name: 'Chicken Breast & Rice', calories: 720, protein: 62 }
      ]
    }
  ],

  defaultProfile: {
    name: 'מתאמן',
    role: 'trainee',
    demoTraineeId: 'client_1',
    gender: 'male',
    age: 26,
    weight: 78.5,
    height: 178,
    targetCalories: 2250,
    targetProtein: 165,
    targetCarbs: 210,
    targetFat: 65,
    targetWaterMl: 2800,
    targetFiber: 28,
    maxSodium: 2300,
    maxSugar: 45,
    targetPotassium: 4700,
    sleepHours: 7.5,
    targetSleepHours: 8.0,
    streakDays: 4
  }
};

const FIT_EXERCISE_EXPANSION = [
  ['ex_flat_db_press', 'Flat Dumbbell Press', 'chest', 'Chest', 'Dumbbell', false, 'Keep wrists stacked over elbows and lower with control.'],
  ['ex_decline_db_press', 'Decline Dumbbell Press', 'chest', 'Chest', 'Dumbbell', false, 'Use a comfortable range and keep shoulder blades supported.'],
  ['ex_smith_bench_press', 'Smith Machine Bench Press', 'chest', 'Chest', 'Smith Machine', false, 'Set the bar path and safety stops before loading.'],
  ['ex_smith_incline_press', 'Smith Machine Incline Press', 'chest', 'Chest', 'Smith Machine', false, 'Keep shoulder blades stable against the bench.'],
  ['ex_machine_chest_press', 'Machine Chest Press', 'chest', 'Chest', 'Machine', false, 'Adjust handles to mid-chest height.'],
  ['ex_low_cable_fly', 'Low-to-High Cable Fly', 'chest', 'Chest', 'Cable', false, 'Bring hands together without shrugging.'],
  ['ex_high_cable_fly', 'High-to-Low Cable Fly', 'chest', 'Chest', 'Cable', false, 'Keep a soft elbow bend and control the stretch.'],
  ['ex_single_cable_fly', 'Single-Arm Cable Fly', 'chest', 'Chest', 'Cable', true, 'Brace your trunk and avoid rotating toward the stack.'],
  ['ex_band_chest_press', 'Resistance Band Chest Press', 'chest', 'Chest', 'Resistance Band', false, 'Anchor the band securely behind you.'],
  ['ex_close_grip_pushup', 'Close-Grip Push-Up', 'chest', 'Chest', 'Bodyweight', false, 'Keep elbows near your sides and maintain a straight body line.'],
  ['ex_chest_press_single', 'Single-Arm Machine Chest Press', 'chest', 'Chest', 'Machine', true, 'Keep hips and shoulders square throughout each repetition.'],
  ['ex_chest_supported_row', 'Chest-Supported Machine Row', 'back', 'Back', 'Machine', false, 'Pull elbows back without lifting your chest from the pad.'],
  ['ex_t_bar_row', 'T-Bar Row', 'back', 'Back', 'Machine', false, 'Keep your torso braced and pull toward the lower ribs.'],
  ['ex_chest_supported_db_row', 'Chest-Supported Dumbbell Row', 'back', 'Back', 'Dumbbell', false, 'Let shoulder blades move naturally at the bottom.'],
  ['ex_single_cable_row', 'Single-Arm Cable Row', 'back', 'Back', 'Cable', true, 'Avoid twisting; finish with the elbow near your hip.'],
  ['ex_close_lat_pulldown', 'Close-Grip Lat Pulldown', 'back', 'Back', 'Cable', false, 'Pull to the upper chest while keeping your torso steady.'],
  ['ex_neutral_lat_pulldown', 'Neutral-Grip Lat Pulldown', 'back', 'Back', 'Cable', false, 'Drive elbows down and pause briefly at the bottom.'],
  ['ex_assisted_pullup', 'Assisted Pull-Up', 'back', 'Back', 'Machine', false, 'Use assistance that allows a controlled full range.'],
  ['ex_band_assisted_pullup', 'Resistance Band Assisted Pull-Up', 'back', 'Back', 'Resistance Band', false, 'Secure the band carefully and avoid bouncing.'],
  ['ex_single_arm_pulldown', 'Single-Arm Kneeling Lat Pulldown', 'back', 'Back', 'Cable', true, 'Keep ribs stacked over hips as you pull.'],
  ['ex_smith_bent_row', 'Smith Machine Bent-Over Row', 'back', 'Back', 'Smith Machine', false, 'Hinge at the hips and keep the bar close to your body.'],
  ['ex_band_row', 'Resistance Band Row', 'back', 'Back', 'Resistance Band', false, 'Anchor the band at chest height and control the return.'],
  ['ex_trap_bar_deadlift', 'Trap Bar Deadlift', 'back', 'Back', 'Barbell', false, 'Brace before lifting and push evenly through both feet.'],
  ['ex_goblet_squat', 'Dumbbell Goblet Squat', 'legs', 'Legs & Glutes', 'Dumbbell', false, 'Keep the dumbbell close and knees tracking over toes.'],
  ['ex_smith_squat', 'Smith Machine Squat', 'legs', 'Legs & Glutes', 'Smith Machine', false, 'Choose a stable stance and use the machine safety stops.'],
  ['ex_hack_squat', 'Hack Squat', 'legs', 'Legs & Glutes', 'Machine', false, 'Keep your lower back supported and avoid locking knees.'],
  ['ex_single_leg_press', 'Single-Leg Press', 'legs', 'Legs & Glutes', 'Machine', true, 'Use a comfortable depth and keep the pelvis level.'],
  ['ex_stepup', 'Dumbbell Step-Up', 'legs', 'Legs & Glutes', 'Dumbbell', true, 'Drive through the elevated foot without pushing off the trailing leg.'],
  ['ex_reverse_lunge', 'Dumbbell Reverse Lunge', 'legs', 'Legs & Glutes', 'Dumbbell', true, 'Step back under control and keep the front foot planted.'],
  ['ex_single_leg_rdl', 'Single-Leg Romanian Deadlift', 'legs', 'Legs & Glutes', 'Dumbbell', true, 'Keep hips square and use support if needed for balance.'],
  ['ex_barbell_good_morning', 'Barbell Good Morning', 'legs', 'Legs & Glutes', 'Barbell', false, 'Use a light load and hinge while maintaining a neutral spine.'],
  ['ex_seated_leg_curl', 'Seated Leg Curl', 'legs', 'Legs & Glutes', 'Machine', false, 'Align the knee joint with the machine pivot.'],
  ['ex_single_leg_curl', 'Single-Leg Seated Leg Curl', 'legs', 'Legs & Glutes', 'Machine', true, 'Move smoothly and keep your hips on the seat.'],
  ['ex_band_leg_curl', 'Resistance Band Leg Curl', 'legs', 'Legs & Glutes', 'Resistance Band', false, 'Anchor the band securely and avoid arching your back.'],
  ['ex_cable_pullthrough', 'Cable Pull-Through', 'legs', 'Legs & Glutes', 'Cable', false, 'Hinge at the hips and finish by squeezing the glutes.'],
  ['ex_glute_kickback', 'Cable Glute Kickback', 'legs', 'Legs & Glutes', 'Cable', true, 'Keep your pelvis stable and use a controlled range.'],
  ['ex_hip_abduction', 'Hip Abduction Machine', 'legs', 'Legs & Glutes', 'Machine', false, 'Move without bouncing and keep your torso upright.'],
  ['ex_seated_calf_raise', 'Seated Calf Raise', 'legs', 'Legs & Glutes', 'Machine', false, 'Pause at the stretched and shortened positions.'],
  ['ex_single_calf_raise', 'Single-Leg Standing Calf Raise', 'legs', 'Legs & Glutes', 'Bodyweight', true, 'Use a full comfortable range and hold support for balance.'],
  ['ex_machine_shoulder_press', 'Machine Shoulder Press', 'shoulders', 'Shoulders', 'Machine', false, 'Set the seat so handles begin around shoulder height.'],
  ['ex_arnold_press', 'Dumbbell Arnold Press', 'shoulders', 'Shoulders', 'Dumbbell', false, 'Rotate smoothly without forcing the shoulder range.'],
  ['ex_single_db_lateral', 'Single-Arm Dumbbell Lateral Raise', 'shoulders', 'Shoulders', 'Dumbbell', true, 'Raise in the scapular plane and avoid momentum.'],
  ['ex_single_cable_lateral', 'Single-Arm Cable Lateral Raise', 'shoulders', 'Shoulders', 'Cable', true, 'Start with light tension and keep the shoulder relaxed.'],
  ['ex_band_lateral_raise', 'Resistance Band Lateral Raise', 'shoulders', 'Shoulders', 'Resistance Band', false, 'Stand on the band securely and raise with control.'],
  ['ex_smith_ohp', 'Smith Machine Overhead Press', 'shoulders', 'Shoulders', 'Smith Machine', false, 'Set safety stops and avoid leaning back excessively.'],
  ['ex_cable_rear_delt', 'Cable Rear Delt Fly', 'shoulders', 'Shoulders', 'Cable', false, 'Keep a soft elbow bend and move from the shoulders.'],
  ['ex_db_rear_delt', 'Dumbbell Rear Delt Fly', 'shoulders', 'Shoulders', 'Dumbbell', false, 'Hinge at the hips and keep your neck relaxed.'],
  ['ex_barbell_curl', 'Barbell Biceps Curl', 'arms', 'Arms', 'Barbell', false, 'Keep elbows near your sides and avoid swinging.'],
  ['ex_cable_curl', 'Cable Biceps Curl', 'arms', 'Arms', 'Cable', false, 'Maintain tension and lower the handle slowly.'],
  ['ex_single_cable_curl', 'Single-Arm Cable Curl', 'arms', 'Arms', 'Cable', true, 'Keep your upper arm still throughout the curl.'],
  ['ex_preacher_curl', 'Machine Preacher Curl', 'arms', 'Arms', 'Machine', false, 'Keep upper arms supported and avoid forceful lockout.'],
  ['ex_concentration_curl', 'Dumbbell Concentration Curl', 'arms', 'Arms', 'Dumbbell', true, 'Brace your upper arm against your inner thigh.'],
  ['ex_overhead_cable_triceps', 'Cable Overhead Triceps Extension', 'arms', 'Arms', 'Cable', false, 'Keep elbows pointed forward and ribs stacked.'],
  ['ex_single_triceps_pushdown', 'Single-Arm Cable Triceps Pushdown', 'arms', 'Arms', 'Cable', true, 'Keep your shoulder still and extend fully without snapping.'],
  ['ex_band_triceps', 'Resistance Band Triceps Pushdown', 'arms', 'Arms', 'Resistance Band', false, 'Anchor overhead securely and control the return.'],
  ['ex_cable_kickback', 'Single-Arm Cable Triceps Kickback', 'arms', 'Arms', 'Cable', true, 'Keep your upper arm fixed as you extend.'],
  ['ex_diamond_pushup', 'Diamond Push-Up', 'arms', 'Arms', 'Bodyweight', false, 'Keep wrists comfortable and maintain a rigid trunk.'],
  ['ex_cable_crunch', 'Cable Crunch', 'core', 'Core', 'Cable', false, 'Flex through the trunk without pulling with your arms.'],
  ['ex_pallof_press', 'Pallof Press', 'core', 'Core', 'Cable', true, 'Resist rotation and keep hips facing forward.'],
  ['ex_band_pallof', 'Resistance Band Pallof Press', 'core', 'Core', 'Resistance Band', true, 'Secure the band at chest height before starting.'],
  ['ex_dead_bug', 'Dead Bug', 'core', 'Core', 'Bodyweight', true, 'Keep your lower back gently supported as limbs extend.'],
  ['ex_side_plank', 'Side Plank', 'core', 'Core', 'Bodyweight', true, 'Keep shoulders stacked and hips lifted.'],
  ['ex_cable_woodchop', 'Cable Wood Chop', 'core', 'Core', 'Cable', true, 'Rotate through the trunk while keeping the movement controlled.'],
  ['ex_smith_calf_raise', 'Smith Machine Calf Raise', 'legs', 'Legs & Glutes', 'Smith Machine', false, 'Use a stable platform and a controlled full range.'],
  ['ex_band_pullapart', 'Resistance Band Pull-Apart', 'shoulders', 'Shoulders', 'Resistance Band', false, 'Keep ribs down and pull the band apart at chest height.'],
  ['ex_band_face_pull', 'Resistance Band Face Pull', 'shoulders', 'Shoulders', 'Resistance Band', false, 'Pull toward eye level and rotate thumbs behind you.'],
  ['ex_smith_split_squat', 'Smith Machine Split Squat', 'legs', 'Legs & Glutes', 'Smith Machine', true, 'Use a stance that lets the front heel remain planted.'],
  ['ex_machine_dip', 'Assisted Dip Machine', 'arms', 'Arms', 'Machine', false, 'Adjust assistance and keep shoulders comfortable.'],
  ['ex_incline_pushup', 'Incline Push-Up', 'chest', 'Chest', 'Bodyweight', false, 'Keep your body in a straight line from head to heels.'],
  ['ex_decline_pushup', 'Decline Push-Up', 'chest', 'Chest', 'Bodyweight', false, 'Brace your trunk and use a stable foot support.'],
  ['ex_walking', 'Treadmill Walking', 'cardio', 'Cardio', 'Machine', false, 'Choose a pace and incline appropriate to your fitness.'],
  ['ex_stationary_bike', 'Stationary Bike', 'cardio', 'Cardio', 'Machine', false, 'Adjust seat height so the knee remains slightly bent at the bottom.'],

  // --- NEW EXERCISES FOR MASSIVE EXPANSION & VARIETY ---
  // Chest
  ['ex_incline_cable_fly', 'Incline Cable Fly', 'chest', 'Chest', 'Cable', false, 'Set pulleys low and fly upwards to target clavicular pectorals.'],
  ['ex_weighted_dips', 'Weighted Chest Dips', 'chest', 'Chest', 'Bodyweight', false, 'Lean forward with dipping belt to overload lower chest.'],
  ['ex_dumbbell_pullover', 'Dumbbell Pullover', 'chest', 'Chest', 'Dumbbell', false, 'Lie perpendicular across bench and stretch ribcage under control.'],
  ['ex_hex_press', 'Dumbbell Squeeze / Hex Press', 'chest', 'Chest', 'Dumbbell', false, 'Press two dumbbells squeezed firmly together throughout range.'],
  ['ex_floor_press', 'Barbell Floor Press', 'chest', 'Chest', 'Barbell', false, 'Pause triceps gently on floor to build pressing power and triceps lockout.'],

  // Back
  ['ex_meadows_row', 'Meadows Landmine Row', 'back', 'Back', 'Barbell', true, 'Unilateral landmine row popularized by John Meadows for lat width.'],
  ['ex_seal_row', 'Barbell Seal Row', 'back', 'Back', 'Barbell', false, 'Lie prone on elevated bench and row without momentum or spinal strain.'],
  ['ex_rack_pull', 'Barbell Rack Pull', 'back', 'Back', 'Barbell', false, 'Set bar just below knees on power rack pins to overload upper back and traps.'],
  ['ex_lat_prayer', 'Kneeling Cable Lat Prayer', 'back', 'Back', 'Cable', false, 'Kneel in front of high cable rope and arc down for peak lat stretch.'],
  ['ex_neutral_pullup', 'Neutral-Grip Pull-Up', 'back', 'Back', 'Bodyweight', false, 'Palms facing each other reduces shoulder impingement while recruiting lats.'],

  // Legs & Glutes
  ['ex_sissy_squat', 'Sissy Squat', 'legs', 'Legs & Glutes', 'Bodyweight', false, 'Isolates the rectus femoris quadriceps at maximum knee flexion.'],
  ['ex_stiff_leg_deadlift', 'Stiff-Legged Barbell Deadlift', 'legs', 'Legs & Glutes', 'Barbell', false, 'Keep knees almost straight and hips high to deeply load hamstrings.'],
  ['ex_hip_adduction', 'Hip Adduction Machine', 'legs', 'Legs & Glutes', 'Machine', false, 'Strengthens inner thighs and groin stabilizers.'],
  ['ex_belt_squat', 'Belt Squat Machine', 'legs', 'Legs & Glutes', 'Machine', false, 'Heavy quad and glute loading with zero axial spinal compression.'],
  ['ex_nordic_curl', 'Nordic Hamstring Curl', 'legs', 'Legs & Glutes', 'Bodyweight', false, 'Elite eccentric hamstring exercise for injury prevention and strength.'],
  ['ex_tibialis_raise', 'Standing Tibialis Anterior Raise', 'legs', 'Legs & Glutes', 'Bodyweight', false, 'Strengthens shin muscles to protect knees and improve ankle mobility.'],
  ['ex_donkey_calf_raise', 'Donkey Calf Raise', 'legs', 'Legs & Glutes', 'Machine', false, 'Hinged at 90 degrees for optimal stretch on the gastrocnemius.'],

  // Shoulders
  ['ex_cable_front_raise', 'Cable Front Raise', 'shoulders', 'Shoulders', 'Cable', false, 'Smooth constant resistance targeting the anterior deltoid.'],
  ['ex_lu_raise', 'Lu Dumbbell Lateral Raise', 'shoulders', 'Shoulders', 'Dumbbell', false, 'Full range lateral raise overhead popularized by Olympic weightlifter Lu Xiaojun.'],
  ['ex_barbell_upright_row', 'Barbell Upright Row', 'shoulders', 'Shoulders', 'Barbell', false, 'Pull bar toward upper chest leading with high elbows.'],
  ['ex_cable_y_raise', 'Cable Incline Y-Raise', 'shoulders', 'Shoulders', 'Cable', false, 'Lie on incline bench and raise cables in a 30-degree Y shape for lateral/rear delts.'],
  ['ex_rear_delt_row', 'Dumbbell Rear Delt Row', 'shoulders', 'Shoulders', 'Dumbbell', false, 'Flared elbows at 90 degrees pulling wide to target posterior delts.'],

  // Arms
  ['ex_spider_curl', 'Incline Bench Spider Curl', 'arms', 'Arms', 'Dumbbell', false, 'Chest against 45-degree incline bench prevents bicep cheating.'],
  ['ex_bayesian_curl', 'Behind-the-Back Cable Bayesian Curl', 'arms', 'Arms', 'Cable', true, 'Face away from low pulley to stretch the long head of the bicep.'],
  ['ex_jm_press', 'Barbell JM Press', 'arms', 'Arms', 'Barbell', false, 'Hybrid between close-grip bench press and skullcrusher for tricep mass.'],
  ['ex_cable_cross_body_triceps', 'Cross-Body Cable Triceps Extension', 'arms', 'Arms', 'Cable', false, 'Dual cable cross extension aligning with tricep lateral and long heads.'],
  ['ex_incline_hammer_curl', 'Incline Dumbbell Hammer Curl', 'arms', 'Arms', 'Dumbbell', false, 'Neutral grip curl on an incline for brachialis and forearms.'],
  ['ex_reverse_ez_curl', 'Reverse EZ-Bar Forearm Curl', 'arms', 'Arms', 'Barbell', false, 'Pronated grip curl building forearm extensors and brachioradialis.'],
  ['ex_wrist_curl', 'Barbell Wrist Curl', 'arms', 'Arms', 'Barbell', false, 'Rest forearms on bench and flex wrists to build forearm mass and grip.'],

  // Core
  ['ex_ab_wheel', 'Ab Wheel Rollout', 'core', 'Core', 'Bodyweight', false, 'High anti-extension core challenge from knees to full extension.'],
  ['ex_dragon_flag', 'Dragon Flag', 'core', 'Core', 'Bodyweight', false, 'Full body rigid lever raise inspired by Bruce Lee.'],
  ['ex_russian_twist', 'Weighted Russian Twist', 'core', 'Core', 'Dumbbell', false, 'Rotational oblique exercise performed with feet elevated.'],
  ['ex_hanging_windshield_wipers', 'Hanging Windshield Wipers', 'core', 'Core', 'Bodyweight', false, 'Rotates legs side-to-side while hanging for maximum oblique power.'],
  ['ex_cable_side_bend', 'Cable Side Bend', 'core', 'Core', 'Cable', true, 'Stand lateral to low pulley and flex laterally through obliques.'],

  // Cardio
  ['ex_rowing_machine', 'Concept2 Rowing Machine', 'cardio', 'Cardio', 'Machine', false, 'Full body cardiovascular endurance with powerful drive and recovery.'],
  ['ex_assault_bike', 'Air / Assault Bike Sprints', 'cardio', 'Cardio', 'Machine', false, 'Max effort metabolic conditioning engaging both upper and lower body.'],
  ['ex_jump_rope', 'Jump Rope / Double Unders', 'cardio', 'Cardio', 'Bodyweight', false, 'Fast footwork and high heart-rate conditioning.'],
  ['ex_stair_climber', 'Stair Climber / StairMaster', 'cardio', 'Cardio', 'Machine', false, 'Continuous aerobic climbing targeting glutes, quads, and calves.']
];

FIT_DATA.exercises.push(...FIT_EXERCISE_EXPANSION.map(([id, name, muscle, category, equipment, unilateral, tips]) => ({
  id, name, muscle, category, equipment, unilateral, tips,
  defaultSets: 3, defaultReps: 10, defaultWeight: 0
})));

FIT_DATA.exercises.forEach(exercise => {
  if (!exercise.equipment) {
    exercise.equipment = /Cable|Pulldown|Crossover|Face Pull|Pushdown/i.test(exercise.name) ? 'Cable'
      : /Machine|Pec Deck|Leg Press|Leg Extension|Curl|Raise/i.test(exercise.name) ? 'Machine'
        : /Dumbbell|DB |EZ-Bar/i.test(exercise.name) ? 'Dumbbell'
          : /Push-Up|Pull-Up|Dips|Plank|Raise/i.test(exercise.name) ? 'Bodyweight'
            : /Barbell|Bench Press|Squat|Deadlift|Row|OHP/i.test(exercise.name) ? 'Barbell'
              : 'Bodyweight';
  }
  if (typeof exercise.unilateral !== 'boolean') {
    exercise.unilateral = /One-Arm|Single-Leg|Walking Lunge|Bulgarian|Hanging Leg Raise/i.test(exercise.name);
  }
  const name = exercise.name.toLocaleLowerCase();
  const primaryLabel = exercise.muscle === 'chest' ? 'Chest / Pectorals'
    : exercise.muscle === 'back' ? (/pulldown|pull-up|pullup/.test(name) ? 'Lats' : /deadlift/.test(name) ? 'Spinal Erectors' : 'Upper Back')
      : exercise.muscle === 'legs' ? (/calf/.test(name) ? 'Calves' : /curl|romanian|good morning/.test(name) ? 'Hamstrings' : /abduction/.test(name) ? 'Gluteus Medius' : /hip thrust|kickback|pull-through/.test(name) ? 'Gluteus Maximus' : 'Quadriceps')
        : exercise.muscle === 'shoulders' ? (/lateral/.test(name) ? 'Lateral Deltoids' : /reverse|rear|face pull|pull-apart/.test(name) ? 'Rear Deltoids' : 'Front Deltoids')
          : exercise.muscle === 'arms' ? (/curl/.test(name) ? 'Biceps' : 'Triceps')
            : exercise.muscle === 'core' ? (/pallof|wood chop|side plank/.test(name) ? 'Obliques' : 'Core') : 'Quadriceps';
  const specificActivations = [[primaryLabel, 5]];
  if (exercise.muscle === 'chest') {
    if (/press|push-up|dips/.test(name)) specificActivations.push(['Triceps', 4], ['Front Deltoids', 3]);
    else specificActivations.push(['Front Deltoids', 3]);
  } else if (exercise.muscle === 'back') {
    if (/pulldown|pull-up|pullup/.test(name)) specificActivations.push(['Biceps', 3], ['Upper Back', 3]);
    else if (/deadlift/.test(name)) specificActivations.push(['Hamstrings', 4], ['Glutes', 4], ['Core', 3]);
    else specificActivations.push(['Lats', 4], ['Biceps', 3], ['Rear Deltoids', 2]);
  } else if (exercise.muscle === 'legs') {
    if (/leg extension/.test(name)) specificActivations.push(['Knee Stabilizers', 2]);
    else if (/leg curl/.test(name)) specificActivations.push(['Calves', 2]);
    else if (/curl|romanian|good morning/.test(name)) specificActivations.push(['Glutes', 4], ['Spinal Erectors', 3]);
    else if (/hip thrust|kickback|abduction|pull-through/.test(name)) specificActivations.push(['Hamstrings', 3], ['Core', 2]);
    else if (/calf/.test(name)) specificActivations.push(['Soleus', 4], ['Glutes', 2]);
    else specificActivations.push(['Glutes', 4], ['Core', 3], ['Hamstrings', 2]);
  } else if (exercise.muscle === 'shoulders') {
    if (/press/.test(name)) specificActivations.push(['Triceps', 4], ['Upper Chest', 2]);
    else if (/lateral/.test(name)) specificActivations.push(['Supraspinatus', 3], ['Upper Trapezius', 2]);
    else specificActivations.push(['Upper Back', 3], ['Rotator Cuff', 2]);
  } else if (exercise.muscle === 'arms') {
    specificActivations.push([/curl/.test(name) ? 'Forearms' : 'Shoulders', 3]);
    if (/push-up|dip/.test(name)) specificActivations.push(['Chest', 3], ['Core', 2]);
  } else if (exercise.muscle === 'core') {
    specificActivations.push(['Hip Flexors', 2], ['Spinal Erectors', 2]);
  } else if (exercise.muscle === 'cardio') {
    specificActivations.push(['Calves', 3], ['Core', 2]);
  }
  exercise.activationRanks = specificActivations
    .filter(([, rank], index, list) => list.findIndex(([label]) => label === list[index][0]) === index && rank >= 2)
    .sort((left, right) => right[1] - left[1])
    .map(([label, rank], index) => ({ muscle: label, label, rank, order: index + 1 }));
  exercise.secondaryMuscles = exercise.activationRanks
    .slice(1)
    .map(item => item.muscle);
});

FIT_DATA.foodsDatabase.push(
  {
    id: 'il_mcd_mcroyal_spicy_patty',
    name: "McDonald's Israel McRoyal Spicy Patty",
    category: 'chains',
    categoryName: 'רשתות מזון · אומדן ישראלי',
    tags: ['mcdonalds', 'mcroyal', 'beef', 'patty', 'מקדונלדס'],
    defaultGrams: 100,
    unitName: 'קציצה (אומדן 100 גרם)',
    calories: 160,
    unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
    icon: '🍔',
    source: 'User-provided approximate calorie value; not verified against a current McDonald’s Israel nutrition label. Other nutrients unavailable.'
  },
  {
    id: 'il_mcd_kids_meal_estimate',
    name: "McDonald's Israel Kids Meal (upper-bound estimate)",
    category: 'chains',
    categoryName: 'רשתות מזון · אומדן ישראלי',
    tags: ['mcdonalds', 'kids meal', 'children', 'מקדונלדס', 'ילדים'],
    defaultGrams: 1,
    unitName: 'ארוחה',
    nutritionBasis: 'serving',
    calories: 499,
    unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
    icon: '🍟',
    source: 'User-provided upper-bound estimate (<500 kcal), represented as 499 kcal per meal. The exact meal varies and this is not verified manufacturer nutrition data; other nutrients unavailable.'
  },
  {
    id: 'il_bbb_classic_burger_160',
    name: 'BBB Classic Burger, 160 g',
    category: 'chains',
    categoryName: 'רשתות מזון · אומדן ישראלי',
    tags: ['bbb', 'classic burger', 'burger', 'המבורגר'],
    defaultGrams: 160,
    unitName: 'המבורגר (160 גרם)',
    calories: 281.25,
    unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
    icon: '🍔',
    source: 'User-provided approximate estimate: about 450 kcal per 160 g burger. Not verified against a current BBB nutrition label; other nutrients unavailable.'
  },
  {
    id: 'il_bbb_butcher_burger_225',
    name: 'BBB Butcher Burger, 225 g',
    category: 'chains',
    categoryName: 'רשתות מזון · אומדן ישראלי',
    tags: ['bbb', 'butcher burger', 'burger', 'המבורגר'],
    defaultGrams: 225,
    unitName: 'המבורגר (225 גרם)',
    calories: 275.56,
    unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
    icon: '🥩',
    source: 'User-provided approximate estimate: about 620 kcal per 225 g burger. Not verified against a current BBB nutrition label; other nutrients unavailable.'
  },
  {
    id: 'il_bbb_burger_bun_estimate',
    name: 'BBB Burger Bun (estimated)',
    category: 'chains',
    categoryName: 'רשתות מזון · אומדן ישראלי',
    tags: ['bbb', 'bun', 'bread', 'לחמנייה'],
    defaultGrams: 1,
    unitName: 'לחמנייה',
    nutritionBasis: 'serving',
    calories: 120,
    unknownNutrients: ['protein', 'carbs', 'fat', 'fiber', 'sodium', 'sugar', 'addedSugar', 'potassium', 'omega3', 'omega6'],
    icon: '🍞',
    source: 'User-provided approximate estimate of about 120 kcal per bun. Not verified against a current BBB nutrition label; other nutrients unavailable.'
  }
);