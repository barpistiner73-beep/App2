/**
 * FitPulse - Firebase Configuration & Cloud Database Integration
 * Project: fitnessnutritionapp-ab381
 */

// 1. Firebase Web App Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmZ55Vlmy7pUeY3AV4K1XjbWWvxbAb7hE",
  authDomain: "fitnessnutritionapp-ab381.firebaseapp.com",
  projectId: "fitnessnutritionapp-ab381",
  storageBucket: "fitnessnutritionapp-ab381.firebasestorage.app",
  messagingSenderId: "389126781153",
  appId: "1:389126781153:web:e412cf6337b50da177dfa0",
  measurementId: "G-J225BZ94H2"
};

// 2. FitPulse Firebase Service Layer (Real-time Firestore Sync)
const FitPulseFirebase = {
  isConfigured: false,
  db: null,
  auth: null,
  analytics: null,
  unsubscribers: [],

  init() {
    if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes("YOUR_API_KEY")) {
      console.info("[FitPulse Firebase] Missing API key. Operating in local mode.");
      this.isConfigured = false;
      return false;
    }

    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }
      this.db = firebase.firestore();
      this.auth = firebase.auth();
      if (typeof firebase.analytics === 'function') {
        try { this.analytics = firebase.analytics(); } catch (e) { /* ignore analytics on file/local */ }
      }
      this.isConfigured = true;
      console.log(`[FitPulse Firebase] Connected to Cloud Firestore (${firebaseConfig.projectId})!`);

      // Attempt offline persistence
      this.db.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('[FitPulse Firebase] Offline persistence failed: Multiple tabs open');
        } else if (err.code === 'unimplemented') {
          console.warn('[FitPulse Firebase] Offline persistence not supported by this browser');
        }
      });

      // Check and seed initial data if needed
      this.checkAndSeedInitialData();

      return true;
    } catch (err) {
      console.error("[FitPulse Firebase] Initialization error:", err);
      this.isConfigured = false;
      return false;
    }
  },

  // Auth methods
  async signIn(email, password) {
    if (!this.isConfigured || !this.auth) return null;
    try {
      const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
      this.logAudit('USER_LOGIN', `התחברות משתמש: ${email}`);
      return userCredential;
    } catch (err) {
      console.warn("[FitPulse Firebase] Sign in error:", err.message);
      throw err;
    }
  },

  async signInWithGoogle() {
    if (!this.isConfigured || !this.auth) {
      throw new Error("Firebase Auth אינו מוגדר או מאותחל");
    }
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      provider.setCustomParameters({ prompt: 'select_account' });

      const userCredential = await this.auth.signInWithPopup(provider);
      const user = userCredential.user;

      // Check if user profile already exists in Firestore 'users'
      let profile = await this.getUserProfile(user.uid);
      if (!profile) {
        // First-time sign-up from Google! Create unified user profile in 'users'
        const newProfile = {
          userId: user.uid,
          fullName: (user.displayName || user.email.split('@')[0]).slice(0, 100),
          email: user.email,
          isTrainer: false, // Default role is trainee per domain logic
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (user.photoURL && user.photoURL.startsWith('http')) {
          newProfile.profileImageUrl = user.photoURL.slice(0, 1000);
        }
        try {
          await this.db.collection('users').doc(user.uid).set(newProfile);
          profile = newProfile;
        } catch (err) {
          console.warn("[FitPulse Firebase] User doc write notice:", err.message);
          profile = newProfile;
        }

        // Also write to trainees collection for roster compatibility
        try {
          await this.db.collection('trainees').doc(user.uid).set({
            id: user.uid,
            name: newProfile.fullName,
            email: user.email,
            role: 'trainee',
            avatar: user.photoURL || newProfile.fullName.slice(0, 2),
            targetCalories: 2200,
            targetProtein: 160,
            targetCarbs: 220,
            targetFat: 70,
            targetWater: 3000,
            createdAt: new Date().toISOString()
          }, { merge: true });
        } catch (err) {}
      }

      this.logAudit('USER_LOGIN_GOOGLE', `התחברות/הרשמה עם Google: ${user.email} (${user.uid})`);
      return { user, profile };
    } catch (err) {
      console.warn("[FitPulse Firebase] Google Sign-In error:", err.message);
      throw err;
    }
  },

  async getUserProfile(uid) {
    if (!this.isConfigured || !this.db) return null;
    try {
      const doc = await this.db.collection('users').doc(uid).get();
      return doc.exists ? doc.data() : null;
    } catch (e) {
      console.warn("[FitPulse Firebase] Error fetching user profile:", e);
      return null;
    }
  },

  async signOut() {
    if (!this.isConfigured || !this.auth) return;
    try {
      await this.auth.signOut();
    } catch (err) {
      console.warn("[FitPulse Firebase] Sign out error:", err.message);
    }
  },

  onAuthStateChanged(callback) {
    if (!this.isConfigured || !this.auth) return () => {};
    return this.auth.onAuthStateChanged(callback);
  },

  // Coach creates a new trainee in Firebase Auth without logging out the coach
  async registerNewTraineeAuth(email, password, traineeData) {
    if (!this.isConfigured) return null;
    let secondaryApp = null;
    try {
      const appName = `TraineeReg_${Date.now()}`;
      secondaryApp = firebase.initializeApp(firebaseConfig, appName);
      const userCredential = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      if (this.db) {
        const coachUid = this.auth?.currentUser?.uid;
        const now = firebase.firestore.FieldValue.serverTimestamp();

        // 1. Unified users/{userId} collection
        const userRef = secondaryApp.firestore().collection('users').doc(uid);
        await userRef.set({
          userId: uid,
          fullName: traineeData.name,
          email: email,
          isTrainer: false,
          createdAt: now
        }, { merge: true });

        // 2. Establish trainership relation if coach is logged in
        if (coachUid) {
          const relationId = `${coachUid}_${uid}`;
          // Secondary app (trainee) creates/accepts active trainership
          await secondaryApp.firestore().collection('trainerships').doc(relationId).set({
            relationId,
            trainerId: coachUid,
            traineeId: uid,
            status: 'active',
            permissions: {
              canViewSleep: true,
              canViewNutrition: true,
              canViewWorkouts: true,
              canViewDailyLogs: true
            },
            createdAt: now
          }, { merge: true });
        }

        // 3. Legacy compatibility records
        const traineeDoc = {
          ...traineeData,
          uid,
          email,
          role: 'trainee',
          createdAt: new Date().toISOString()
        };
        await this.db.collection('trainees').doc(traineeData.id || uid).set(traineeDoc, { merge: true });
      }

      this.logAudit('USER_REGISTERED', `נרשם מתאמן חדש: ${traineeData.name} (${email}) ע"י המאמן`);
      return { uid, email };
    } catch (err) {
      console.error("[FitPulse Firebase] Error registering trainee auth:", err);
      throw err;
    } finally {
      if (secondaryApp) {
        try { await secondaryApp.delete(); } catch (e) {}
      }
    }
  },

  // Audit and system logging in Firestore
  async logAudit(type, description, meta = {}) {
    if (!this.isConfigured || !this.db) return;
    try {
      const doc = {
        type,
        description,
        meta,
        timestamp: new Date().toISOString()
      };
      await this.db.collection('auditLogs').add(doc);
    } catch (err) {
      // non-critical
    }
  },

  // Subscribe to live audit logs for App Manager
  subscribeToAuditLogs(onUpdate) {
    if (!this.isConfigured || !this.db) return null;
    try {
      const unsub = this.db.collection('auditLogs')
        .orderBy('timestamp', 'desc')
        .limit(40)
        .onSnapshot(snapshot => {
          const logs = [];
          snapshot.forEach(d => logs.push({ id: d.id, ...d.data() }));
          onUpdate(logs);
        }, err => {
          console.warn("[FitPulse Firebase] Audit logs subscription notice:", err.message);
        });
      this.unsubscribers.push(unsub);
      return unsub;
    } catch (e) {
      return null;
    }
  },

  // Save or update daily report draft in Firestore
  async saveReportDraft(report) {
    if (!this.isConfigured || !this.db) return false;
    try {
      const docId = report.id || `${report.traineeId}_${report.date}`;
      const payload = {
        ...report,
        id: docId,
        updatedAt: new Date().toISOString()
      };
      await this.db.collection('dailyReports').doc(docId).set(payload, { merge: true });
      return true;
    } catch (err) {
      console.error("[FitPulse Firebase] Error saving report:", err);
      return false;
    }
  },

  // Finalize daily report
  async finalizeReport(docId) {
    if (!this.isConfigured || !this.db) return false;
    try {
      await this.db.collection('dailyReports').doc(docId).update({
        status: 'finalized',
        finalizedAt: new Date().toISOString()
      });
      return true;
    } catch (err) {
      console.error("[FitPulse Firebase] Error finalizing report:", err);
      return false;
    }
  },

  // Save coach feedback
  async saveCoachFeedback(docId, feedback) {
    if (!this.isConfigured || !this.db) return false;
    try {
      await this.db.collection('dailyReports').doc(docId).update({
        coachFeedback: {
          ...feedback,
          updatedAt: new Date().toISOString()
        }
      });
      return true;
    } catch (err) {
      console.error("[FitPulse Firebase] Error saving coach feedback:", err);
      return false;
    }
  },

  // Real-time subscription to a trainee's daily reports (no composite index needed)
  subscribeToTraineeReports(traineeId, daysLimit, onUpdate) {
    if (!this.isConfigured || !this.db) return null;

    const query = this.db.collection('dailyReports').where('traineeId', '==', traineeId);

    const unsub = query.onSnapshot(snapshot => {
      const reports = [];
      snapshot.forEach(doc => {
        reports.push(doc.data());
      });
      // Sort client-side descending by date (safest, no composite index needed)
      reports.sort((a, b) => b.date.localeCompare(a.date));

      const limit = daysLimit === 'all' ? reports.length : (parseInt(daysLimit, 10) || 14);
      onUpdate(reports.slice(0, limit));
    }, err => {
      console.error("[FitPulse Firebase] Reports subscription error:", err);
    });

    this.unsubscribers.push(unsub);
    return unsub;
  },

  // Fetch or subscribe to Trainees roster
  subscribeToTrainees(onUpdate) {
    if (!this.isConfigured || !this.db) return null;

    const unsub = this.db.collection('trainees').onSnapshot(async snapshot => {
      if (snapshot.empty) {
        console.log("[FitPulse Firebase] Trainees collection empty. Seeding initial roster...");
        await this.seedInitialTrainees();
        return;
      }
      const trainees = [];
      snapshot.forEach(doc => {
        trainees.push(doc.data());
      });
      onUpdate(trainees);
    }, err => {
      console.error("[FitPulse Firebase] Trainees subscription error:", err);
    });

    this.unsubscribers.push(unsub);
    return unsub;
  },

  // Check and seed initial trainees & 14 days of reports if Firestore is clean
  async checkAndSeedInitialData() {
    if (!this.isConfigured || !this.db) return;
    try {
      const snap = await this.db.collection('trainees').limit(1).get();
      if (snap.empty) {
        await this.seedInitialTrainees();
        await this.seedHistoricalReports();
      }
    } catch (err) {
      console.warn("[FitPulse Firebase] Check initial data notice:", err.message);
    }
  },

  async seedInitialTrainees() {
    const trainees = [
      { id: "client_1", name: "דניאל כהן", age: 28, weight: 78.4, targetCalories: 2400, targetProtein: 160, targetWaterMl: 3000, activeWorkout: "Push A - חזה וכתפיים", hasWorkedOutToday: true },
      { id: "client_2", name: "שירה לוי", age: 25, weight: 61.2, targetCalories: 1850, targetProtein: 125, targetWaterMl: 2500, activeWorkout: "Lower Body Focus", hasWorkedOutToday: true },
      { id: "client_3", name: "יונתן ברק", age: 34, weight: 84.0, targetCalories: 2650, targetProtein: 180, targetWaterMl: 3200, activeWorkout: "Upper Power", hasWorkedOutToday: false },
      { id: "client_4", name: "מאיה אברהם", age: 30, weight: 57.8, targetCalories: 1950, targetProtein: 130, targetWaterMl: 2400, activeWorkout: "Glutes & Core", hasWorkedOutToday: true },
      { id: "client_5", name: "איתי גולדשטיין", age: 22, weight: 72.5, targetCalories: 2800, targetProtein: 190, targetWaterMl: 3500, activeWorkout: "Push Heavy", hasWorkedOutToday: false }
    ];

    const batch = this.db.batch();
    for (const t of trainees) {
      const ref = this.db.collection('trainees').doc(t.id);
      batch.set(ref, t);
    }
    await batch.commit();
    console.log("[FitPulse Firebase] Initial trainees seeded to Firestore.");
  },

  async seedHistoricalReports() {
    const batch = this.db.batch();
    const now = new Date();

    for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
      const d = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const isToday = dayOffset === 0;
      const status = isToday ? 'draft' : 'finalized';
      const weight = (78.4 + (dayOffset * 0.08) - (dayOffset % 2 === 0 ? 0.15 : 0)).toFixed(1);
      const docId = `client_1_${dateStr}`;

      const report = {
        id: docId,
        traineeId: "client_1",
        date: dateStr,
        status: status,
        createdAt: `${dateStr}T07:15:00.000Z`,
        finalizedAt: isToday ? null : `${dateStr}T21:45:00.000Z`,
        checkIn: {
          morningWeight: parseFloat(weight),
          waterLiters: isToday ? 2.2 : (2.5 + (dayOffset % 3) * 0.3),
          sleepHours: isToday ? 7.5 : (6.5 + (dayOffset % 4) * 0.5),
          sleepQuality: 4,
          steps: 9000 + (dayOffset * 450) % 3500,
          digestion: 5,
          hungerLevel: 3,
          energyLevel: 4,
          stressLevel: 2,
          notes: isToday ? 'מרגיש מצוין ורענן לקראת האימון.' : 'היה יום עמוס בעבודה אך עמדתי בכל יעדי התזונה.'
        },
        nutrition: {
          totalCalories: 2350,
          targetCalories: 2400,
          totalProtein: 165,
          targetProtein: 160,
          meals: [
            { id: `m1_${dayOffset}`, name: "חביתת 3 ביצים, לחם כפרי וטחינה", calories: 520, protein: 32, time: "08:15", loggedAt: `${dateStr}T08:15:00.000Z` },
            { id: `m2_${dayOffset}`, name: "חזה עוף מוקפץ עם אורז בסמטי ושעועית ירוקה", calories: 740, protein: 55, time: "13:20", loggedAt: `${dateStr}T13:20:00.000Z` },
            { id: `m3_${dayOffset}`, name: "יוגורט פרו 20 גרם חלבון עם בננה ואגוזי מלך", calories: 340, protein: 24, time: "17:10", loggedAt: `${dateStr}T17:10:00.000Z` },
            { id: `m4_${dayOffset}`, name: "פילה סלמון בתנור, בטטה קלויה וסלט קצוץ", calories: 750, protein: 54, time: "20:30", loggedAt: `${dateStr}T20:30:00.000Z` }
          ]
        },
        workouts: dayOffset % 2 === 0 ? [{
          planName: "Push A - חזה וכתפיים",
          durationMinutes: 52,
          startedAt: `${dateStr}T18:00:00.000Z`,
          completedAt: `${dateStr}T18:52:00.000Z`,
          time: "18:00",
          exercises: [
            { name: "לחיצת חזה במוט (Bench Press)", sets: [{ weight: 80, reps: 8, completed: true }, { weight: 80, reps: 8, completed: true }, { weight: 82.5, reps: 6, completed: true }] },
            { name: "לחיצת כתפיים בדאמבלים בישיבה", sets: [{ weight: 24, reps: 10, completed: true }, { weight: 24, reps: 9, completed: true }, { weight: 26, reps: 8, completed: true }] }
          ]
        }] : [],
        coachFeedback: dayOffset > 1 ? {
          reviewed: true,
          reviewedAt: `${dateStr}T22:30:00.000Z`,
          notes: "עבודה מעולה על הדחיפה! שים לב לשמור על קצב ירידה מבוקר בסט השלישי של הבנץ'.",
          coachRating: 5
        } : null
      };

      const ref = this.db.collection('dailyReports').doc(docId);
      batch.set(ref, report);
    }

    await batch.commit();
    console.log("[FitPulse Firebase] Initial 14-day history seeded to Firestore.");
  }
};

// Global export
if (typeof window !== 'undefined') {
  window.FitPulseFirebase = FitPulseFirebase;
}
