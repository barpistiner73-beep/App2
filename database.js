/**
 * FitPulse - Database & Reporting Engine
 * Manages trainees, historical daily reports, precise timestamping, and auto-closing.
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'fitpulse_db.json');

function formatDateKey(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeString(d) {
  return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', hour12: false });
}

class FitPulseDatabase {
  constructor() {
    this.data = {
      trainees: [],
      dailyReports: {}, // Keyed by `${traineeId}_${date}`
      users: [],
      auditLogs: []
    };
    this.init();
  }

  loadFromTraineeFolders() {
    const traineesDir = path.join(__dirname, 'data', 'trainees');
    if (!fs.existsSync(traineesDir)) return false;

    const traineeDirs = fs.readdirSync(traineesDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    if (!traineeDirs.length) return false;

    const loadedTrainees = [];
    const loadedReports = {};

    traineeDirs.forEach(tId => {
      const traineeFolder = path.join(traineesDir, tId);
      const statsFile = path.join(traineeFolder, 'current_stats.json');
      
      let tObj = { id: tId, name: tId };
      if (fs.existsSync(statsFile)) {
        try {
          const stats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
          tObj = {
            id: stats.traineeId || tId,
            name: stats.name || tId,
            avatar: stats.avatar || '',
            age: stats.profile?.age || 25,
            gender: stats.profile?.gender || 'other',
            weight: stats.profile?.currentWeightKg || 70,
            height: stats.profile?.heightCm || 175,
            targetCalories: stats.targets?.dailyCalories || 2400,
            targetProtein: stats.targets?.dailyProteinGrams || 160,
            targetWaterMl: stats.targets?.dailyWaterMl || 3000,
            targetSleepHours: stats.targets?.dailySleepHours || 8,
            assignedRoutine: stats.activeRoutine?.name || '',
            notes: stats.activeRoutine?.focus || ''
          };
        } catch (e) {}
      }
      loadedTrainees.push(tObj);

      // Find history folder (e.g. "history client_1")
      const historySubfolders = fs.readdirSync(traineeFolder, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith('history'))
        .map(d => d.name);

      historySubfolders.forEach(hName => {
        const historyPath = path.join(traineeFolder, hName);
        const monthFiles = fs.readdirSync(historyPath).filter(f => f.endsWith('.json'));

        monthFiles.forEach(mFile => {
          try {
            const mData = JSON.parse(fs.readFileSync(path.join(historyPath, mFile), 'utf8'));
            const reports = Array.isArray(mData.reports) ? mData.reports : (Array.isArray(mData) ? mData : []);
            reports.forEach(r => {
              const key = `${r.traineeId || tId}_${r.date}`;
              loadedReports[key] = r;
            });
          } catch (e) {}
        });
      });
    });

    if (loadedTrainees.length && Object.keys(loadedReports).length) {
      this.data.trainees = loadedTrainees;
      this.data.dailyReports = loadedReports;
      console.log(`[Database] Loaded ${loadedTrainees.length} trainees and ${Object.keys(loadedReports).length} reports from per-trainee folder structure.`);
      return true;
    }
    return false;
  }

  init() {
    const loadedFromFolders = this.loadFromTraineeFolders();
    if (!loadedFromFolders) {
      if (fs.existsSync(DB_FILE)) {
        try {
          const raw = fs.readFileSync(DB_FILE, 'utf8');
          this.data = JSON.parse(raw);
          console.log(`[Database] Loaded ${Object.keys(this.data.dailyReports || {}).length} daily reports from disk.`);
        } catch (err) {
          console.error('[Database] Error reading DB file, reinitializing with seed:', err.message);
          this.seedInitialData();
        }
      } else {
        console.log('[Database] No existing DB found. Seeding initial data with 14-day history...');
        this.seedInitialData();
      }
    } else {
      // If loaded from folders, still read DB_FILE for users and auditLogs
      if (fs.existsSync(DB_FILE)) {
        try {
          const raw = fs.readFileSync(DB_FILE, 'utf8');
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.users) && parsed.users.length) {
            this.data.users = parsed.users;
          }
          if (Array.isArray(parsed.auditLogs) && parsed.auditLogs.length) {
            this.data.auditLogs = parsed.auditLogs;
          }
        } catch (e) {}
      }
    }

    if (!Array.isArray(this.data.users) || !this.data.users.length) {
      this.seedSystemUsers();
    }

    // Run auto-close on startup
    this.autoClosePastReports();
  }

  seedSystemUsers() {
    this.data.users = [
      { id: 'usr_mgr', userId: 'usr_mgr', name: 'מנהל מערכת ראשי', fullName: 'מנהל מערכת ראשי', email: 'manager@fitpulse.com', role: 'manager', isTrainer: true, status: 'active', approvalStatus: 'approved', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'usr_coach', userId: 'usr_coach', name: 'מאמן ראשי', fullName: 'מאמן ראשי', email: 'coach@fitpulse.com', role: 'coach', isTrainer: true, status: 'active', approvalStatus: 'approved', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'usr_c1', userId: 'usr_c1', name: 'דניאל כהן', fullName: 'דניאל כהן', email: 'daniel@fitpulse.com', role: 'trainee', isTrainer: false, traineeId: 'client_1', routine: 'Push-Pull-Legs 4D', status: 'active', approvalStatus: 'approved', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'usr_c2', userId: 'usr_c2', name: 'שירה לוי', fullName: 'שירה לוי', email: 'shira@fitpulse.com', role: 'trainee', isTrainer: false, traineeId: 'client_2', routine: 'Upper / Lower 4D', status: 'active', approvalStatus: 'approved', createdAt: '2026-09-05T00:00:00.000Z' },
      { id: 'usr_c3', userId: 'usr_c3', name: 'רון אברהם', fullName: 'רון אברהם', email: 'ron@fitpulse.com', role: 'trainee', isTrainer: false, traineeId: 'client_3', routine: 'Full Body 3D', status: 'active', approvalStatus: 'approved', createdAt: '2026-09-10T00:00:00.000Z' },
      { id: 'usr_c4', userId: 'usr_c4', name: 'יעל שטרן', fullName: 'יעל שטרן', email: 'yael@fitpulse.com', role: 'trainee', isTrainer: false, traineeId: 'client_4', routine: 'Glutes & Legs Focus', status: 'active', approvalStatus: 'approved', createdAt: '2026-09-12T00:00:00.000Z' }
    ];
    this.save();
  }

  save() {
    try {
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpFile, DB_FILE);
      return true;
    } catch (err) {
      console.error('[Database] Failed to write database to disk:', err.message);
      return false;
    }
  }

  /**
   * Automatically closes/finalizes reports from past days that were left in 'draft'.
   */
  autoClosePastReports() {
    const today = formatDateKey(new Date());
    let closedCount = 0;

    for (const key of Object.keys(this.data.dailyReports)) {
      const report = this.data.dailyReports[key];
      if (report && report.date < today && report.status === 'draft') {
        report.status = 'auto_closed';
        report.finalizedAt = `${report.date}T23:59:59.000Z`;
        report.updatedAt = new Date().toISOString();
        report.autoClosedNote = 'הדוח נסגר אוטומטית בחצות בסוף היום ונשמר במסד הנתונים.';
        closedCount++;
        this.saveReportToMonthlyFile(report);
      }
    }

    if (closedCount > 0) {
      console.log(`[Database] Auto-closed ${closedCount} open daily reports from previous days.`);
      this.save();
    }
  }

  seedInitialData() {
    this.data.trainees = [
      {
        id: 'client_1',
        name: 'דניאל כהן',
        avatar: 'דכ',
        age: 28,
        gender: 'male',
        weight: 82.0,
        height: 181,
        targetCalories: 2400,
        targetProtein: 175,
        targetCarbs: 240,
        targetFat: 70,
        targetWaterMl: 3000,
        targetSleepHours: 8.0,
        assignedRoutine: 'Push-Pull-Legs 4D',
        notes: 'מתאמן לקראת חיטוב ועלייה במסת שריר נקייה'
      },
      {
        id: 'client_2',
        name: 'שירה לוי',
        avatar: 'של',
        age: 25,
        gender: 'female',
        weight: 61.5,
        height: 167,
        targetCalories: 1850,
        targetProtein: 130,
        targetCarbs: 190,
        targetFat: 55,
        targetWaterMl: 2500,
        targetSleepHours: 8.0,
        assignedRoutine: 'Upper / Lower 4D',
        notes: 'דגש על פלג גוף תחתון ושיפור כוח בסיסי'
      },
      {
        id: 'client_3',
        name: 'רון אברהם',
        avatar: 'רא',
        age: 32,
        gender: 'male',
        weight: 89.2,
        height: 179,
        targetCalories: 2600,
        targetProtein: 190,
        targetCarbs: 270,
        targetFat: 75,
        targetWaterMl: 3200,
        targetSleepHours: 7.5,
        assignedRoutine: 'Full Body 3D',
        notes: 'יעדי ירידה באחוזי שומן ושימור מסת שריר'
      },
      {
        id: 'client_4',
        name: 'יעל שטרן',
        avatar: 'יש',
        age: 29,
        gender: 'female',
        weight: 58.0,
        height: 164,
        targetCalories: 1900,
        targetProtein: 135,
        targetCarbs: 200,
        targetFat: 55,
        targetWaterMl: 2600,
        targetSleepHours: 8.5,
        assignedRoutine: 'Glutes & Legs Focus',
        notes: 'אימונים מתקדמים והעלאת צריכת חלבון'
      }
    ];

    this.data.dailyReports = {};

    // Generate 14 days of historical reports for trainees
    const now = new Date();
    for (let dayOffset = 14; dayOffset >= 0; dayOffset--) {
      const reportDateObj = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = formatDateKey(reportDateObj);
      const isToday = dayOffset === 0;

      // Seed client_1 (Daniel Cohen)
      this.createSeededReportForClient1(dateStr, reportDateObj, isToday, dayOffset);

      // Seed client_2 (Shira Levi)
      this.createSeededReportForClient2(dateStr, reportDateObj, isToday, dayOffset);
    }

    this.save();
  }

  createSeededReportForClient1(dateStr, dateObj, isToday, dayOffset) {
    const reportKey = `client_1_${dateStr}`;
    const weightTrend = 82.8 - (14 - dayOffset) * 0.06;
    const isWorkoutDay = dayOffset % 4 !== 3; // 3 days on, 1 day off
    const workoutTypes = ['Push Session (דחיפה)', 'Pull Session (משיכה)', 'Legs & Core (רגליים וליבה)'];
    const workoutName = workoutTypes[dayOffset % 3];

    const meals = [
      {
        id: `meal_${dateStr}_1`,
        loggedAt: `${dateStr}T08:15:22.000Z`,
        time: '08:15',
        name: 'שיבולת שועל עם חלבון ופירות יער',
        amount: 80,
        unitName: 'גרם',
        calories: 430,
        protein: 36,
        carbs: 58,
        fat: 7,
        source: 'FoodData Central'
      },
      {
        id: `meal_${dateStr}_2`,
        loggedAt: `${dateStr}T13:20:45.000Z`,
        time: '13:20',
        name: 'חזה עוף צלוי עם אורז בסמטי ושעועית ירוקה',
        amount: 220,
        unitName: 'גרם',
        calories: 680,
        protein: 64,
        carbs: 72,
        fat: 12,
        source: 'FoodData Central'
      },
      {
        id: `meal_${dateStr}_3`,
        loggedAt: `${dateStr}T16:45:10.000Z`,
        time: '16:45',
        name: 'יוגורט פרו 20 גרם חלבון + בננה ושקדים',
        amount: 200,
        unitName: 'גרם',
        calories: 340,
        protein: 26,
        carbs: 42,
        fat: 9,
        source: 'FoodData Central'
      }
    ];

    if (!isToday || new Date().getHours() >= 20) {
      meals.push({
        id: `meal_${dateStr}_4`,
        loggedAt: `${dateStr}T20:30:15.000Z`,
        time: '20:30',
        name: 'סלמון בתנור, בטטה אפויה וסלט ירוק',
        amount: 200,
        unitName: 'גרם',
        calories: 720,
        protein: 48,
        carbs: 54,
        fat: 28,
        source: 'FoodData Central'
      });
    }

    const totalCals = meals.reduce((s, m) => s + m.calories, 0);
    const totalProt = meals.reduce((s, m) => s + m.protein, 0);
    const totalCarb = meals.reduce((s, m) => s + m.carbs, 0);
    const totalFat = meals.reduce((s, m) => s + m.fat, 0);

    const workouts = [];
    if (isWorkoutDay && (!isToday || new Date().getHours() >= 19)) {
      workouts.push({
        id: `wo_${dateStr}_1`,
        routineId: 'session_push',
        name: workoutName,
        startedAt: `${dateStr}T18:15:00.000Z`,
        completedAt: `${dateStr}T19:10:00.000Z`,
        time: '18:15',
        durationMinutes: 55,
        completedSets: 18,
        totalSets: 18,
        totalVolume: 6420,
        difficulty: 8,
        notes: dayOffset % 2 === 0 ? 'אנרגיה מעולה באימון, עליה במשקל בבנץ׳ פרס' : 'אימון אינטנסיבי וממוקד',
        exercises: [
          {
            name: 'Barbell Bench Press',
            exerciseId: 'ex_bench_press',
            sets: [
              { setNumber: 1, weight: 80, reps: 8, completed: true, time: '18:22' },
              { setNumber: 2, weight: 82.5, reps: 8, completed: true, time: '18:25' },
              { setNumber: 3, weight: 85, reps: 7, completed: true, time: '18:29' },
              { setNumber: 4, weight: 85, reps: 6, completed: true, time: '18:33' }
            ]
          },
          {
            name: 'Incline Dumbbell Press',
            exerciseId: 'ex_incline_db_press',
            sets: [
              { setNumber: 1, weight: 30, reps: 10, completed: true, time: '18:40' },
              { setNumber: 2, weight: 32, reps: 9, completed: true, time: '18:44' },
              { setNumber: 3, weight: 32, reps: 8, completed: true, time: '18:48' }
            ]
          },
          {
            name: 'Cable Lateral Raise',
            exerciseId: 'ex_cable_lateral_raise',
            sets: [
              { setNumber: 1, weight: 12.5, reps: 15, completed: true, time: '18:55' },
              { setNumber: 2, weight: 12.5, reps: 14, completed: true, time: '18:58' },
              { setNumber: 3, weight: 15, reps: 12, completed: true, time: '19:02' }
            ]
          }
        ]
      });
    }

    const status = isToday ? 'draft' : (dayOffset % 7 === 5 ? 'auto_closed' : 'finalized');

    this.data.dailyReports[reportKey] = {
      id: reportKey,
      traineeId: 'client_1',
      date: dateStr,
      status,
      createdAt: `${dateStr}T08:00:00.000Z`,
      updatedAt: `${dateStr}T21:30:00.000Z`,
      finalizedAt: status === 'draft' ? null : `${dateStr}T21:45:00.000Z`,
      metrics: {
        morningWeightKg: Number(weightTrend.toFixed(2)),
        sleepHours: 7.5 + (dayOffset % 3) * 0.4,
        sleepQuality: 8 + (dayOffset % 3),
        waterMl: 2900 + (dayOffset % 4) * 200,
        steps: 9200 + (dayOffset % 5) * 800,
        energyLevel: 4 + (dayOffset % 2),
        hungerLevel: 2,
        stressLevel: 2,
        digestion: 'good',
        traineeNotes: dayOffset === 1
          ? 'הרגיש מעולה היום, הקפדתי על שתיית מים מלאה ושעות שינה.'
          : (dayOffset === 3 ? 'משקל בוקר בירידה עקבית, הרגשת קלילות באימון.' : 'הכל לפי התוכנית ללא חריגות.')
      },
      nutrition: {
        totalCalories: totalCals,
        totalProtein: totalProt,
        totalCarbs: totalCarb,
        totalFat: totalFat,
        totalFiber: 32,
        totalSodium: 2100,
        targetCalories: 2400,
        targetProtein: 175,
        meals
      },
      workouts,
      coachFeedback: dayOffset > 2 ? {
        reviewed: true,
        reviewedAt: `${dateStr}T22:15:00.000Z`,
        notes: 'עבודה מצוינת! התקדמות מעולה במשקלי העבודה ובשמירה על מאזן הקלוריות והחלבון.',
        coachRating: 5
      } : null
    };
  }

  createSeededReportForClient2(dateStr, dateObj, isToday, dayOffset) {
    const reportKey = `client_2_${dateStr}`;
    const weightTrend = 62.0 - (14 - dayOffset) * 0.04;
    const isWorkoutDay = dayOffset % 2 === 0;

    const meals = [
      {
        id: `meal_c2_${dateStr}_1`,
        loggedAt: `${dateStr}T08:30:00.000Z`,
        time: '08:30',
        name: 'קערת אסאי עם גרנולה וסקופ חלבון',
        amount: 250,
        unitName: 'גרם',
        calories: 420,
        protein: 28,
        carbs: 52,
        fat: 10,
        source: 'FoodData Central'
      },
      {
        id: `meal_c2_${dateStr}_2`,
        loggedAt: `${dateStr}T13:00:00.000Z`,
        time: '13:00',
        name: 'טופו מוקפץ עם קינואה וירקות אסייתיים',
        amount: 280,
        unitName: 'גרם',
        calories: 540,
        protein: 38,
        carbs: 60,
        fat: 16,
        source: 'FoodData Central'
      },
      {
        id: `meal_c2_${dateStr}_3`,
        loggedAt: `${dateStr}T19:45:00.000Z`,
        time: '19:45',
        name: 'חביתת 3 ביצים, לחם כוסמין, אבוקדו וסלט',
        amount: 200,
        unitName: 'גרם',
        calories: 520,
        protein: 34,
        carbs: 38,
        fat: 22,
        source: 'FoodData Central'
      }
    ];

    const totalCals = meals.reduce((s, m) => s + m.calories, 0);
    const totalProt = meals.reduce((s, m) => s + m.protein, 0);
    const totalCarb = meals.reduce((s, m) => s + m.carbs, 0);
    const totalFat = meals.reduce((s, m) => s + m.fat, 0);

    const workouts = [];
    if (isWorkoutDay) {
      workouts.push({
        id: `wo_c2_${dateStr}_1`,
        routineId: 'session_legs',
        name: 'Lower Body & Glutes (רגליים וישבן)',
        startedAt: `${dateStr}T17:30:00.000Z`,
        completedAt: `${dateStr}T18:25:00.000Z`,
        time: '17:30',
        durationMinutes: 55,
        completedSets: 16,
        totalSets: 16,
        totalVolume: 5120,
        difficulty: 8,
        notes: 'אימון חזק, דגש על טכניקה בסקוואט והיפ ת׳ראסט',
        exercises: [
          {
            name: 'Barbell Hip Thrust',
            exerciseId: 'ex_hip_thrust',
            sets: [
              { setNumber: 1, weight: 90, reps: 10, completed: true, time: '17:38' },
              { setNumber: 2, weight: 100, reps: 10, completed: true, time: '17:42' },
              { setNumber: 3, weight: 105, reps: 8, completed: true, time: '17:46' }
            ]
          },
          {
            name: 'Bulgarian Split Squat',
            exerciseId: 'ex_bulgarian_split_squat',
            sets: [
              { setNumber: 1, weight: 16, reps: 10, completed: true, time: '17:54' },
              { setNumber: 2, weight: 18, reps: 10, completed: true, time: '17:58' },
              { setNumber: 3, weight: 18, reps: 8, completed: true, time: '18:02' }
            ]
          }
        ]
      });
    }

    const status = isToday ? 'draft' : 'finalized';

    this.data.dailyReports[reportKey] = {
      id: reportKey,
      traineeId: 'client_2',
      date: dateStr,
      status,
      createdAt: `${dateStr}T08:00:00.000Z`,
      updatedAt: `${dateStr}T21:00:00.000Z`,
      finalizedAt: status === 'draft' ? null : `${dateStr}T21:15:00.000Z`,
      metrics: {
        morningWeightKg: Number(weightTrend.toFixed(2)),
        sleepHours: 8.0,
        sleepQuality: 9,
        waterMl: 2500,
        steps: 10500,
        energyLevel: 5,
        hungerLevel: 2,
        stressLevel: 2,
        digestion: 'good',
        traineeNotes: 'מרגישה התקדמות יפה בהיפ ת׳ראסט ושיפור בהתאוששות.'
      },
      nutrition: {
        totalCalories: totalCals,
        totalProtein: totalProt,
        totalCarbs: totalCarb,
        totalFat: totalFat,
        totalFiber: 29,
        totalSodium: 1800,
        targetCalories: 1850,
        targetProtein: 130,
        meals
      },
      workouts,
      coachFeedback: dayOffset > 2 ? {
        reviewed: true,
        reviewedAt: `${dateStr}T22:00:00.000Z`,
        notes: 'כל הכבוד על ההתמדה והעלייה במשקלים ברגליים!',
        coachRating: 5
      } : null
    };
  }

  // --- API Methods ---

  getTrainees() {
    return this.data.trainees || [];
  }

  getTrainee(id) {
    return this.data.trainees.find(t => t.id === id) || null;
  }

  createTrainee(traineeData) {
    const id = traineeData.id || `client_${Date.now()}`;
    const name = traineeData.name || 'מתאמן חדש';
    const email = traineeData.email || `${id}@fitpulse.com`;

    const newTrainee = {
      id,
      name,
      email,
      avatar: traineeData.avatar || name.slice(0, 2),
      age: parseInt(traineeData.age, 10) || 25,
      gender: traineeData.gender || 'male',
      weight: parseFloat(traineeData.weight) || 75.0,
      height: parseInt(traineeData.height, 10) || 175,
      targetCalories: parseInt(traineeData.targetCalories, 10) || 2400,
      targetProtein: parseInt(traineeData.targetProtein, 10) || 160,
      targetCarbs: parseInt(traineeData.targetCarbs, 10) || 220,
      targetFat: parseInt(traineeData.targetFat, 10) || 65,
      targetWaterMl: parseInt(traineeData.targetWaterMl, 10) || 3000,
      targetSleepHours: parseFloat(traineeData.targetSleepHours) || 8.0,
      assignedRoutine: traineeData.assignedRoutine || 'תוכנית מותאמת אישית',
      notes: traineeData.notes || 'מתאמן חדש שצורף על ידי המאמן',
      createdAt: new Date().toISOString()
    };

    const existingIdx = this.data.trainees.findIndex(t => t.id === id);
    if (existingIdx >= 0) {
      this.data.trainees[existingIdx] = newTrainee;
    } else {
      this.data.trainees.push(newTrainee);
    }

    const traineeFolders = [
      path.join(__dirname, 'data', 'trainees', id),
      path.join(__dirname, 'data', id)
    ];

    traineeFolders.forEach(dir => {
      const historyDir = path.join(dir, `history ${id}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(historyDir)) fs.mkdirSync(historyDir, { recursive: true });

      const currentStats = {
        traineeId: id,
        name,
        email,
        avatar: newTrainee.avatar,
        profile: {
          age: newTrainee.age,
          gender: newTrainee.gender,
          heightCm: newTrainee.height,
          currentWeightKg: newTrainee.weight,
          startingWeightKg: newTrainee.weight,
          targetWeightKg: parseFloat((newTrainee.weight - 3.0).toFixed(1))
        },
        targets: {
          dailyCalories: newTrainee.targetCalories,
          dailyProteinGrams: newTrainee.targetProtein,
          dailyCarbsGrams: newTrainee.targetCarbs,
          dailyFatGrams: newTrainee.targetFat,
          dailyWaterMl: newTrainee.targetWaterMl,
          dailySleepHours: newTrainee.targetSleepHours
        },
        activeRoutine: {
          name: newTrainee.assignedRoutine,
          focus: newTrainee.notes
        },
        activityMetrics: {
          totalReportsLogged: 0,
          totalWorkoutsCompleted: 0,
          complianceRate: '100%',
          latestCheckInDate: null
        },
        createdAt: newTrainee.createdAt,
        updatedAt: newTrainee.createdAt
      };

      fs.writeFileSync(path.join(dir, 'current_stats.json'), JSON.stringify(currentStats, null, 2), 'utf8');
      fs.writeFileSync(path.join(dir, 'current stats.json'), JSON.stringify(currentStats, null, 2), 'utf8');
    });

    this.save();
    this.logActivity('USER_CREATED', `נרשם מתאמן חדש: ${name} (${email}) ע"י המאמן`);
    return newTrainee;
  }

  logActivity(type, description, meta = {}) {
    if (!this.data.auditLogs) this.data.auditLogs = [];
    const event = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type,
      description,
      meta,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(event);
    if (this.data.auditLogs.length > 100) this.data.auditLogs.pop();
    this.save();
    return event;
  }

  getAuditLogs(limit = 50) {
    if (!this.data.auditLogs || !this.data.auditLogs.length) {
      // Seed initial audit logs if empty
      this.data.auditLogs = [
        { id: 'log_init_1', type: 'SYSTEM_BOOT', description: 'מערכת FitPulse ושרת Firebase הופעלו בהצלחה', timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 'log_init_2', type: 'FIRESTORE_CONNECTED', description: 'חיבור תקין למסד Cloud Firestore באזור me-west1', timestamp: new Date(Date.now() - 3000000).toISOString() },
        { id: 'log_init_3', type: 'AUTH_READY', description: 'ספק אימות Firebase Auth מוגדר ופעיל (אימייל וסיסמה)', timestamp: new Date(Date.now() - 2500000).toISOString() }
      ];
    }
    return this.data.auditLogs.slice(0, limit);
  }

  /**
   * Returns reports for a specific trainee filtered by date range or days count (default 14).
   */
  getReports(traineeId, { days = 14, startDate = null, endDate = null } = {}) {
    this.autoClosePastReports();

    let list = Object.values(this.data.dailyReports).filter(r => r.traineeId === traineeId);

    if (startDate) {
      list = list.filter(r => r.date >= startDate);
    }
    if (endDate) {
      list = list.filter(r => r.date <= endDate);
    }
    if (!startDate && !endDate && days > 0) {
      const cutoff = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
      const cutoffKey = formatDateKey(cutoff);
      list = list.filter(r => r.date >= cutoffKey);
    }

    // Sort descending by date (most recent first)
    list.sort((a, b) => b.date.localeCompare(a.date));
    return list;
  }

  getReport(traineeId, date) {
    this.autoClosePastReports();
    const key = `${traineeId}_${date}`;
    return this.data.dailyReports[key] || null;
  }

  /**
   * Saves or creates a daily report (auto-save or draft sync).
   */
  saveReport(reportData) {
    if (!reportData || !reportData.traineeId || !reportData.date) {
      throw new Error('Report data must include traineeId and date');
    }

    const key = `${reportData.traineeId}_${reportData.date}`;
    const existing = this.data.dailyReports[key] || {};
    const nowIso = new Date().toISOString();

    const merged = {
      ...existing,
      ...reportData,
      id: key,
      traineeId: reportData.traineeId,
      date: reportData.date,
      status: reportData.status || existing.status || 'draft',
      createdAt: existing.createdAt || nowIso,
      updatedAt: nowIso,
      finalizedAt: reportData.status === 'finalized'
        ? (existing.finalizedAt || nowIso)
        : (reportData.finalizedAt || existing.finalizedAt || null),
      metrics: {
        ...(existing.metrics || {}),
        ...(reportData.metrics || {})
      },
      nutrition: {
        ...(existing.nutrition || {}),
        ...(reportData.nutrition || {})
      },
      workouts: Array.isArray(reportData.workouts) ? reportData.workouts : (existing.workouts || [])
    };

    this.data.dailyReports[key] = merged;
    this.save();
    this.saveReportToMonthlyFile(merged);
    return merged;
  }

  /**
   * Manually finalizes and closes a daily report.
   */
  finalizeReport(traineeId, date) {
    const key = `${traineeId}_${date}`;
    const existing = this.data.dailyReports[key];
    const nowIso = new Date().toISOString();

    if (!existing) {
      // Create empty finalized report
      return this.saveReport({
        traineeId,
        date,
        status: 'finalized',
        finalizedAt: nowIso
      });
    }

    existing.status = 'finalized';
    existing.finalizedAt = nowIso;
    existing.updatedAt = nowIso;
    this.save();
    this.saveReportToMonthlyFile(existing);
    return existing;
  }

  /**
   * Adds or updates coach feedback for a specific daily report.
   */
  addCoachFeedback(traineeId, date, feedback) {
    const key = `${traineeId}_${date}`;
    const existing = this.data.dailyReports[key];
    if (!existing) {
      throw new Error(`Report not found for trainee ${traineeId} on date ${date}`);
    }

    existing.coachFeedback = {
      reviewed: true,
      reviewedAt: new Date().toISOString(),
      notes: feedback.notes || '',
      coachRating: feedback.coachRating || 5
    };
    existing.updatedAt = new Date().toISOString();
    this.save();
    this.saveReportToMonthlyFile(existing);
    return existing;
  }

  /**
   * Saves a daily report into its corresponding monthly file inside history {trainee}/
   */
  saveReportToMonthlyFile(report) {
    try {
      const traineeId = report.traineeId;
      const month = report.date.substring(0, 7); // e.g. "2026-10"

      const targetDirs = [
        path.join(__dirname, 'data', 'trainees', traineeId, `history ${traineeId}`),
        path.join(__dirname, 'data', traineeId, `history ${traineeId}`)
      ];

      targetDirs.forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const monthFile = path.join(dir, `${month}.json`);

        let payload = {
          traineeId,
          month,
          totalReports: 0,
          reports: []
        };

        if (fs.existsSync(monthFile)) {
          try {
            payload = JSON.parse(fs.readFileSync(monthFile, 'utf8'));
            if (!Array.isArray(payload.reports)) payload.reports = [];
          } catch (e) {}
        }

        const idx = payload.reports.findIndex(r => r.date === report.date || r.id === report.id);
        if (idx >= 0) {
          payload.reports[idx] = report;
        } else {
          payload.reports.push(report);
        }

        payload.reports.sort((a, b) => a.date.localeCompare(b.date));
        payload.totalReports = payload.reports.length;

        fs.writeFileSync(monthFile, JSON.stringify(payload, null, 2), 'utf8');
      });

      this.updateTraineeCurrentStats(traineeId);
    } catch (err) {
      console.warn('[Database] Error saving to monthly file:', err.message);
    }
  }

  /**
   * Updates current_stats.json for a trainee based on latest activity
   */
  updateTraineeCurrentStats(traineeId) {
    try {
      const trainee = this.getTrainee(traineeId);
      if (!trainee) return;

      const reports = Object.values(this.data.dailyReports)
        .filter(r => r.traineeId === traineeId)
        .sort((a, b) => b.date.localeCompare(a.date));

      const latestReport = reports[0];
      const totalWorkouts = reports.reduce((acc, r) => acc + (r.workouts?.length || 0), 0);

      const targetDirs = [
        path.join(__dirname, 'data', 'trainees', traineeId),
        path.join(__dirname, 'data', traineeId)
      ];

      targetDirs.forEach(dir => {
        fs.mkdirSync(path.join(dir, `history ${traineeId}`), { recursive: true });
        const statsFile = path.join(dir, 'current_stats.json');
        const statsFileSpaced = path.join(dir, 'current stats.json');

        const updated = {
          traineeId,
          name: trainee.name,
          email: trainee.email || '',
          avatar: trainee.avatar,
          profile: {
            age: trainee.age,
            gender: trainee.gender,
            heightCm: trainee.height,
            currentWeightKg: latestReport?.checkIn?.morningWeight || latestReport?.metrics?.morningWeightKg || trainee.weight,
            targetWeightKg: trainee.targetWeight || parseFloat((trainee.weight - 4.0).toFixed(1))
          },
          targets: {
            dailyCalories: trainee.targetCalories,
            dailyProteinGrams: trainee.targetProtein,
            dailyCarbsGrams: trainee.targetCarbs,
            dailyFatGrams: trainee.targetFat,
            dailyWaterMl: trainee.targetWaterMl,
            dailySleepHours: trainee.targetSleepHours
          },
          activeRoutine: {
            name: trainee.assignedRoutine,
            focus: trainee.notes
          },
          activityMetrics: {
            totalReportsLogged: reports.length,
            totalWorkoutsCompleted: totalWorkouts,
            latestCheckInDate: latestReport?.date || null,
            latestCheckInStatus: latestReport?.status || null
          },
          updatedAt: new Date().toISOString()
        };

        fs.writeFileSync(statsFile, JSON.stringify(updated, null, 2), 'utf8');
        fs.writeFileSync(statsFileSpaced, JSON.stringify(updated, null, 2), 'utf8');
      });
    } catch (err) {
      console.warn('[Database] Error updating trainee stats:', err.message);
    }
  }

  /**
   * Retrieves reports from a specific monthly file inside history {trainee}/
   */
  getMonthlyReports(traineeId, month) {
    const monthFile = path.join(__dirname, 'data', 'trainees', traineeId, `history ${traineeId}`, `${month}.json`);
    if (fs.existsSync(monthFile)) {
      try {
        return JSON.parse(fs.readFileSync(monthFile, 'utf8'));
      } catch (e) {}
    }
    // In-memory fallback
    const reports = Object.values(this.data.dailyReports)
      .filter(r => r.traineeId === traineeId && r.date.startsWith(month))
      .sort((a, b) => a.date.localeCompare(b.date));
    return {
      traineeId,
      month,
      totalReports: reports.length,
      reports
    };
  }

  /**
   * Retrieves current_stats.json for a trainee
   */
  getTraineeStats(traineeId) {
    const statsFile = path.join(__dirname, 'data', 'trainees', traineeId, 'current_stats.json');
    if (fs.existsSync(statsFile)) {
      try {
        return JSON.parse(fs.readFileSync(statsFile, 'utf8'));
      } catch (e) {}
    }
    return null;
  }

  // =========================================================================
  // USER ACCOUNT & PENDING APPROVAL MANAGEMENT
  // =========================================================================

  getUsers(filter = {}) {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.filter(u => {
      if (filter.role && filter.role !== 'all' && u.role !== filter.role) return false;
      if (filter.status && u.status !== filter.status) return false;
      return true;
    });
  }

  getPendingApprovals() {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.filter(u => u.status === 'pending_approval' || u.approvalStatus === 'pending');
  }

  getUserByIdOrEmail(identifier) {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const lower = String(identifier || '').trim().toLowerCase();
    return this.data.users.find(u =>
      (u.id && u.id.toLowerCase() === lower) ||
      (u.userId && u.userId.toLowerCase() === lower) ||
      (u.email && u.email.toLowerCase() === lower)
    ) || null;
  }

  registerUser(userData) {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const uid = userData.id || userData.userId || `usr_${Date.now()}`;
    const email = (userData.email || '').trim();
    const isTrainer = userData.isTrainer === true || userData.role === 'coach';
    const role = isTrainer ? 'coach' : 'trainee';
    const fullName = (userData.name || userData.fullName || email.split('@')[0] || 'משתמש חדש').trim();

    const existingIndex = this.data.users.findIndex(u =>
      (u.id && u.id === uid) ||
      (u.userId && u.userId === uid) ||
      (email && u.email && u.email.toLowerCase() === email.toLowerCase())
    );

    const userDoc = {
      id: uid,
      userId: uid,
      name: fullName,
      fullName: fullName,
      email: email,
      isTrainer,
      role,
      status: 'pending_approval',
      approvalStatus: 'pending',
      avatar: userData.avatar || userData.profileImageUrl || (fullName.slice(0, 2)),
      profileImageUrl: userData.profileImageUrl || userData.avatar || null,
      specialty: userData.specialty || '',
      selfTraining: userData.selfTraining !== false,
      targetCalories: Number(userData.targetCalories) || 2200,
      targetProtein: Number(userData.targetProtein) || 160,
      targetWater: Number(userData.targetWater) || 3000,
      createdAt: userData.createdAt || new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.data.users[existingIndex] = { ...this.data.users[existingIndex], ...userDoc };
    } else {
      this.data.users.push(userDoc);
    }
    this.save();
    this.logActivity('USER_REGISTRATION_SUBMITTED', `הוגשה בקשת הרשמה (${isTrainer ? 'מאמן' : 'מתאמן'}): ${fullName} (${email}) - ממתין לאישור מנהל`, { userId: uid, role, email });
    return userDoc;
  }

  approveUser(userId, managerId = 'usr_mgr') {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const user = this.data.users.find(u =>
      (u.id && u.id === userId) ||
      (u.userId && u.userId === userId) ||
      (u.email && u.email.toLowerCase() === String(userId).toLowerCase())
    );
    if (!user) {
      throw new Error(`משתמש (${userId}) לא נמצא במסד הנתונים.`);
    }

    user.status = 'active';
    user.approvalStatus = 'approved';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = managerId;

    // If trainee: provision initial trainee folder if needed
    if (!user.isTrainer && user.role === 'trainee') {
      const traineeId = user.id || user.userId;
      const traineeName = user.name || user.fullName || 'מתאמן חדש';
      if (!traineeId) throw new Error(`למשתמש (${userId}) חסר מזהה מתאמן תקין.`);
      const tIndex = this.data.trainees.findIndex(t => t.id === traineeId);
      const traineeObj = {
        id: traineeId,
        name: traineeName,
        email: user.email || '',
        avatar: user.avatar || traineeName.slice(0, 2),
        age: 26,
        gender: 'other',
        weight: 70,
        height: 175,
        targetCalories: user.targetCalories || 2200,
        targetProtein: user.targetProtein || 160,
        targetCarbs: 220,
        targetFat: 65,
        targetWaterMl: user.targetWater || 3000,
        targetSleepHours: 8,
        assignedRoutine: 'Full Body 3D',
        notes: 'חשבון מתאמן חדש מאושר'
      };
      if (tIndex >= 0) {
        this.data.trainees[tIndex] = { ...this.data.trainees[tIndex], ...traineeObj };
      } else {
        this.data.trainees.push(traineeObj);
      }
      this.updateTraineeCurrentStats(traineeId);
    }

    this.save();
    this.logActivity('USER_APPROVED', `אושר חשבון משתמש חדש (${user.isTrainer ? 'מאמן' : 'מתאמן'}): ${user.name} (${user.email}) ע"י מנהל מערכת`, { userId: user.id, role: user.role });
    return user;
  }

  rejectUser(userId, reason = 'לא אושר על ידי מנהל מערכת') {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const user = this.data.users.find(u =>
      (u.id && u.id === userId) ||
      (u.userId && u.userId === userId) ||
      (u.email && u.email.toLowerCase() === String(userId).toLowerCase())
    );
    if (!user) {
      throw new Error(`משתמש (${userId}) לא נמצא במסד הנתונים.`);
    }
    user.status = 'rejected';
    user.approvalStatus = 'rejected';
    user.rejectedReason = reason;
    this.save();
    this.logActivity('USER_REJECTED', `נדחתה בקשת הרשמה (${user.id}) ע"י מנהל מערכת: ${reason}`);
    return user;
  }
}

module.exports = new FitPulseDatabase();
