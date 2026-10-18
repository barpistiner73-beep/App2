/**
 * Data Organizer & Monthly History Generator for FitPulse
 * Organizes data into per-trainee folders with:
 * - current_stats.json
 * - history {trainee}/
 *     - 2026-09.json
 *     - 2026-10.json
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const TRAINEES_DIR = path.join(DATA_DIR, 'trainees');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TRAINEES_DIR)) fs.mkdirSync(TRAINEES_DIR, { recursive: true });

// Load existing database
const dbFile = path.join(DATA_DIR, 'fitpulse_db.json');
let existingDb = { trainees: [], dailyReports: {} };
if (fs.existsSync(dbFile)) {
  try {
    existingDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  } catch (e) {
    console.error('Error parsing fitpulse_db.json:', e);
  }
}

const trainees = existingDb.trainees && existingDb.trainees.length ? existingDb.trainees : [
  { id: 'client_1', name: 'דניאל כהן', avatar: 'דכ', age: 28, gender: 'male', weight: 82.0, height: 181, targetCalories: 2400, targetProtein: 175, targetCarbs: 240, targetFat: 70, targetWaterMl: 3000, targetSleepHours: 8.0, assignedRoutine: 'Push-Pull-Legs 4D', notes: 'מתאמן לקראת חיטוב ועלייה במסת שריר נקייה' },
  { id: 'client_2', name: 'שירה לוי', avatar: 'של', age: 25, gender: 'female', weight: 61.5, height: 167, targetCalories: 1850, targetProtein: 130, targetCarbs: 190, targetFat: 55, targetWaterMl: 2500, targetSleepHours: 8.0, assignedRoutine: 'Upper / Lower 4D', notes: 'דגש על פלג גוף תחתון ושיפור כוח בסיסי' },
  { id: 'client_3', name: 'רון אברהם', avatar: 'רא', age: 32, gender: 'male', weight: 89.2, height: 179, targetCalories: 2600, targetProtein: 190, targetCarbs: 270, targetFat: 75, targetWaterMl: 3200, targetSleepHours: 7.5, assignedRoutine: 'Full Body 3D', notes: 'יעדי ירידה באחוזי שומן ושימור מסת שריר' },
  { id: 'client_4', name: 'יעל שטרן', avatar: 'יש', age: 29, gender: 'female', weight: 58.0, height: 164, targetCalories: 1900, targetProtein: 135, targetCarbs: 200, targetFat: 55, targetWaterMl: 2600, targetSleepHours: 8.5, assignedRoutine: 'Glutes & Legs Focus', notes: 'אימונים מתקדמים והעלאת צריכת חלבון' }
];

// Helper to generate a realistic daily report
function generateDayReport(trainee, dateStr, isToday, isAutoClosed) {
  const parts = dateStr.split('-');
  const dayNum = parseInt(parts[2], 10);
  const dayOfWeek = new Date(`${dateStr}T12:00:00Z`).getDay();
  const hasWorkout = (dayOfWeek === 0 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5);

  const weightDelta = ((dayNum % 5) - 2) * 0.1;
  const currentWeight = parseFloat((trainee.weight + weightDelta).toFixed(1));

  const calsDelta = ((dayNum * 37) % 250) - 100;
  const cals = trainee.targetCalories + calsDelta;
  const protein = trainee.targetProtein + ((dayNum * 13) % 20) - 5;

  const status = isToday ? 'draft' : (isAutoClosed ? 'auto_closed' : 'finalized');
  const finalizedAt = isToday ? null : `${dateStr}T22:${String(15 + (dayNum % 30)).padStart(2, '0')}:00.000Z`;

  const meals = [
    {
      id: `m1_${dateStr}`,
      name: 'ארוחת בוקר: שיבולת שועל עם חלבון, פירות יער וחמאת בוטנים',
      calories: Math.round(cals * 0.28),
      protein: Math.round(protein * 0.25),
      carbs: 65,
      fat: 16,
      time: '08:15',
      loggedAt: `${dateStr}T08:15:20.000Z`
    },
    {
      id: `m2_${dateStr}`,
      name: 'ארוחת צהריים: חזה עוף צלוי, אורז בסמטי ושעועית ירוקה',
      calories: Math.round(cals * 0.40),
      protein: Math.round(protein * 0.42),
      carbs: 85,
      fat: 14,
      time: '13:30',
      loggedAt: `${dateStr}T13:30:45.000Z`
    },
    {
      id: `m3_${dateStr}`,
      name: 'ארוחת ביניים: יוגורט פרו 20 גרם חלבון עם שקדים',
      calories: Math.round(cals * 0.12),
      protein: Math.round(protein * 0.15),
      carbs: 15,
      fat: 8,
      time: '17:00',
      loggedAt: `${dateStr}T17:00:10.000Z`
    },
    {
      id: `m4_${dateStr}`,
      name: 'ארוחת ערב: פילה סלמון בתנור, בטטה קלויה וסלט ירקות עשיר',
      calories: Math.round(cals * 0.20),
      protein: Math.round(protein * 0.18),
      carbs: 35,
      fat: 18,
      time: '20:45',
      loggedAt: `${dateStr}T20:45:33.000Z`
    }
  ];

  const workouts = hasWorkout ? [
    {
      id: `wo_${dateStr}`,
      name: dayOfWeek === 0 || dayOfWeek === 4 ? 'אימון A - חזה, כתפיים ויד אחורית' : 'אימון B - גב, יד קדמית ורגליים',
      planName: trainee.assignedRoutine,
      durationMinutes: 52 + (dayNum % 15),
      totalVolume: 4200 + (dayNum * 120),
      time: '18:30',
      startedAt: `${dateStr}T18:30:00.000Z`,
      completedAt: `${dateStr}T19:25:00.000Z`,
      exercises: [
        {
          id: 'ex_1',
          name: 'לחיצת חזה במוט (Barbell Bench Press)',
          sets: [
            { setNumber: 1, weight: 80, reps: 10, completed: true, time: '18:38' },
            { setNumber: 2, weight: 82.5, reps: 8, completed: true, time: '18:42' },
            { setNumber: 3, weight: 85, reps: 6, completed: true, time: '18:47' }
          ]
        },
        {
          id: 'ex_2',
          name: 'לחיצת כתפיים בדאמבלים בישיבה',
          sets: [
            { setNumber: 1, weight: 24, reps: 10, completed: true, time: '18:55' },
            { setNumber: 2, weight: 26, reps: 8, completed: true, time: '19:00' },
            { setNumber: 3, weight: 26, reps: 8, completed: true, time: '19:05' }
          ]
        }
      ]
    }
  ] : [];

  return {
    id: `${trainee.id}_${dateStr}`,
    traineeId: trainee.id,
    date: dateStr,
    status,
    createdAt: `${dateStr}T07:30:00.000Z`,
    finalizedAt,
    updatedAt: finalizedAt || `${dateStr}T14:00:00.000Z`,
    checkIn: {
      morningWeight: currentWeight,
      waterLiters: parseFloat(((trainee.targetWaterMl / 1000) - 0.2 + (dayNum % 4) * 0.2).toFixed(1)),
      sleepHours: parseFloat((trainee.targetSleepHours - 0.5 + (dayNum % 3) * 0.5).toFixed(1)),
      sleepQuality: 4 + (dayNum % 2),
      steps: 8500 + ((dayNum * 470) % 4000),
      digestion: 5,
      hungerLevel: 3,
      energyLevel: 4,
      stressLevel: 2,
      notes: isToday
        ? 'מרגיש מצוין ומוכן לאימון הערב!'
        : (hasWorkout ? 'אימון חזק, עלייה במשקל עבודה בבנץ׳.' : 'יום מנוחה והתאוששות מלאה, הקפדה על חלבון.')
    },
    nutrition: {
      totalCalories: cals,
      targetCalories: trainee.targetCalories,
      totalProtein: protein,
      targetProtein: trainee.targetProtein,
      totalCarbs: 200,
      totalFat: 56,
      meals
    },
    workouts,
    coachFeedback: !isToday && (dayNum % 3 === 0) ? {
      reviewed: true,
      reviewedAt: `${dateStr}T23:00:00.000Z`,
      coachName: 'מאמן ראשי',
      coachRating: 5,
      notes: hasWorkout
        ? 'עבודה טכנית מרשימה על הסטים הכבדים. המשך לשמור על עקביות בצריכת המים.'
        : 'יום התאוששות מצוין, תמשיך ככה!'
    } : null
  };
}

console.log('Organizing trainee data into folders...');

const allReportsByTraineeAndMonth = {};

trainees.forEach(trainee => {
  allReportsByTraineeAndMonth[trainee.id] = {
    '2026-09': [],
    '2026-10': []
  };

  // Generate September 2026 (days 1 to 30)
  for (let day = 1; day <= 30; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `2026-09-${dayStr}`;
    const isAutoClosed = day % 7 === 0;
    const report = generateDayReport(trainee, dateStr, false, isAutoClosed);
    allReportsByTraineeAndMonth[trainee.id]['2026-09'].push(report);
  }

  // Generate October 2026 (days 1 to 18)
  for (let day = 1; day <= 18; day++) {
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `2026-10-${dayStr}`;
    const isToday = (day === 18);
    const isAutoClosed = !isToday && (day % 8 === 0);

    // If an existing report exists in db, use it
    const existingKey = `${trainee.id}_${dateStr}`;
    const report = existingDb.dailyReports && existingDb.dailyReports[existingKey]
      ? existingDb.dailyReports[existingKey]
      : generateDayReport(trainee, dateStr, isToday, isAutoClosed);

    allReportsByTraineeAndMonth[trainee.id]['2026-10'].push(report);
  }
});

// Now write each trainee's folder structure
const targetBases = [TRAINEES_DIR, DATA_DIR];

trainees.forEach(trainee => {
  const traineeReportsSept = allReportsByTraineeAndMonth[trainee.id]['2026-09'];
  const traineeReportsOct = allReportsByTraineeAndMonth[trainee.id]['2026-10'];
  const allTraineeReports = [...traineeReportsSept, ...traineeReportsOct];

  const totalWorkouts = allTraineeReports.reduce((acc, r) => acc + (r.workouts?.length || 0), 0);
  const avgCals = Math.round(allTraineeReports.reduce((acc, r) => acc + (r.nutrition?.totalCalories || 0), 0) / allTraineeReports.length);
  const avgProtein = Math.round(allTraineeReports.reduce((acc, r) => acc + (r.nutrition?.totalProtein || 0), 0) / allTraineeReports.length);

  const currentStats = {
    traineeId: trainee.id,
    name: trainee.name,
    avatar: trainee.avatar,
    profile: {
      age: trainee.age,
      gender: trainee.gender,
      heightCm: trainee.height,
      currentWeightKg: trainee.weight,
      startingWeightKg: parseFloat((trainee.weight + 3.2).toFixed(1)),
      targetWeightKg: parseFloat((trainee.weight - 4.0).toFixed(1))
    },
    targets: {
      dailyCalories: trainee.targetCalories,
      dailyProteinGrams: trainee.targetProtein,
      dailyCarbsGrams: trainee.targetCarbs,
      dailyFatGrams: trainee.targetFat,
      dailyWaterMl: trainee.targetWaterMl,
      dailySleepHours: trainee.targetSleepHours,
      dailySteps: 10000
    },
    activeRoutine: {
      name: trainee.assignedRoutine,
      focus: trainee.notes,
      workoutsPerWeek: 4,
      lastWorkoutCompleted: '2026-10-17'
    },
    activityMetrics: {
      totalMonthsTracked: 2,
      totalReportsLogged: allTraineeReports.length,
      totalWorkoutsCompleted: totalWorkouts,
      averageDailyCalories: avgCals,
      averageDailyProteinGrams: avgProtein,
      complianceRate: '94%',
      latestCheckInDate: '2026-10-18',
      latestCheckInStatus: 'draft'
    },
    updatedAt: new Date().toISOString()
  };

  // Write into both data/trainees/{traineeId}/ and data/{traineeId}/
  targetBases.forEach(baseDir => {
    const traineeFolder = path.join(baseDir, trainee.id);
    const historyFolder = path.join(traineeFolder, `history ${trainee.id}`);

    if (!fs.existsSync(traineeFolder)) fs.mkdirSync(traineeFolder, { recursive: true });
    if (!fs.existsSync(historyFolder)) fs.mkdirSync(historyFolder, { recursive: true });

    // 1. current_stats.json and "current stats.json"
    fs.writeFileSync(path.join(traineeFolder, 'current_stats.json'), JSON.stringify(currentStats, null, 2), 'utf8');
    fs.writeFileSync(path.join(traineeFolder, 'current stats.json'), JSON.stringify(currentStats, null, 2), 'utf8');

    // 2. Monthly files inside history {trainee}/
    const septPayload = {
      traineeId: trainee.id,
      traineeName: trainee.name,
      month: '2026-09',
      year: 2026,
      monthNumber: 9,
      totalReports: traineeReportsSept.length,
      workoutsCompleted: traineeReportsSept.reduce((acc, r) => acc + (r.workouts?.length || 0), 0),
      reports: traineeReportsSept
    };
    fs.writeFileSync(path.join(historyFolder, '2026-09.json'), JSON.stringify(septPayload, null, 2), 'utf8');

    const octPayload = {
      traineeId: trainee.id,
      traineeName: trainee.name,
      month: '2026-10',
      year: 2026,
      monthNumber: 10,
      totalReports: traineeReportsOct.length,
      workoutsCompleted: traineeReportsOct.reduce((acc, r) => acc + (r.workouts?.length || 0), 0),
      reports: traineeReportsOct
    };
    fs.writeFileSync(path.join(historyFolder, '2026-10.json'), JSON.stringify(octPayload, null, 2), 'utf8');
  });

  console.log(`[Done] Created folder and history for ${trainee.name} (${trainee.id})`);
});

// Also update master fitpulse_db.json with all combined reports
const combinedReports = {};
Object.keys(allReportsByTraineeAndMonth).forEach(tId => {
  ['2026-09', '2026-10'].forEach(m => {
    allReportsByTraineeAndMonth[tId][m].forEach(r => {
      combinedReports[r.id] = r;
    });
  });
});

existingDb.trainees = trainees;
existingDb.dailyReports = combinedReports;
fs.writeFileSync(dbFile, JSON.stringify(existingDb, null, 2), 'utf8');

console.log(`[Master DB] Total combined reports: ${Object.keys(combinedReports).length}`);
console.log('All per-trainee folders and monthly history files organized successfully!');
