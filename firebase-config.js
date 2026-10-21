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

      // 1. Check if user already exists in 'users' collection by Auth UID
      let profile = await this.getUserProfile(user.uid);

      // 2. Fallback check by email in 'users'
      if (!profile && user.email) {
        try {
          const snapshot = await this.db.collection('users')
            .where('email', '==', user.email)
            .limit(1)
            .get();
          if (!snapshot.empty) {
            profile = snapshot.docs[0].data();
          }
        } catch (e) {
          console.warn("[FitPulse Firebase] Email lookup notice:", e.message);
        }
      }

      // If user DOES NOT exist in the database, do NOT create placeholder data!
      // Return isNewUser: true so the frontend routes to the Onboarding / Account-Type page.
      if (!profile) {
        return { user, profile: null, isNewUser: true, isPendingApproval: false };
      }

      // Check if user account requires / is waiting for system manager approval
      if (profile.status === 'pending_approval' || profile.approvalStatus === 'pending') {
        this.logAudit('USER_LOGIN_PENDING', `כניסת משתמש הממתין לאישור מנהל: ${user.email} (${user.uid})`);
        return { user, profile, isNewUser: false, isPendingApproval: true };
      }

      if (profile.status === 'rejected' || profile.approvalStatus === 'rejected') {
        return { user, profile, isNewUser: false, isRejected: true };
      }

      this.logAudit('USER_LOGIN_GOOGLE', `כניסת משתמש קיים עם Google: ${user.email} (${user.uid})`);
      return { user, profile, isNewUser: false, isPendingApproval: false };
    } catch (err) {
      console.warn("[FitPulse Firebase] Google Sign-In error:", err.message);
      throw err;
    }
  },

  // Complete Onboarding & Account Registration for Google or newly signing up users
  // Note: Per requirements, both Trainee and Trainer accounts require System Manager permission.
  async completeUserRegistration(user, regData) {
    const uid = user.uid || user.id;
    const isTrainer = regData.role === 'coach';
    const fullName = (regData.fullName || user.displayName || user.email.split('@')[0] || 'משתמש חדש').trim().slice(0, 100);
    const email = user.email;
    const now = (typeof firebase !== 'undefined' && firebase.firestore?.FieldValue?.serverTimestamp)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date().toISOString();

    // 1. Unified User Document
    const userDoc = {
      userId: uid,
      id: uid,
      fullName,
      name: fullName,
      email,
      isTrainer,
      role: regData.role || (isTrainer ? 'coach' : 'trainee'),
      status: 'pending_approval',
      approvalStatus: 'pending',
      specialty: regData.specialty || '',
      selfTraining: regData.selfTraining !== false,
      targetCalories: Number(regData.targetCalories) || 2200,
      targetProtein: Number(regData.targetProtein) || 160,
      targetWater: Number(regData.targetWater) || 3000,
      createdAt: now
    };

    const photoUrl = regData.profileImageUrl || user.photoURL;
    if (photoUrl && typeof photoUrl === 'string' && photoUrl.startsWith('http')) {
      userDoc.profileImageUrl = photoUrl.slice(0, 1000);
      userDoc.avatar = photoUrl.slice(0, 1000);
    }

    // 2. Persist to Firestore if configured
    if (this.isConfigured && this.db) {
      try {
        const firestorePayload = {
          userId: uid,
          fullName,
          email,
          isTrainer,
          role: userDoc.role,
          status: 'pending_approval',
          approvalStatus: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (userDoc.profileImageUrl) {
          firestorePayload.profileImageUrl = userDoc.profileImageUrl;
        }
        await this.db.collection('users').doc(uid).set(firestorePayload);
      } catch (err) {
        console.warn("[FitPulse Firebase] Firestore user doc write notice:", err.message);
      }
    }

    // 3. Persist to Server backend (guarantees manager can see and approve even across browser restarts)
    try {
      await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userDoc)
      });
    } catch (sErr) {
      console.warn("[FitPulse Firebase] Server pending registration notice:", sErr.message);
    }

    // 4. Save to localStorage for instant client recovery
    try {
      const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
      const filtered = localPending.filter(u => u.userId !== uid && u.id !== uid && u.email !== email);
      filtered.push({ ...userDoc, createdAt: new Date().toISOString() });
      localStorage.setItem('fitpulse_pending_users', JSON.stringify(filtered));
    } catch (lErr) {}

    // 5. If Trainee: register initial clean trainee profile card
    if (!isTrainer && this.isConfigured && this.db) {
      const traineeDoc = {
        id: uid,
        traineeId: uid,
        uid: uid,
        name: fullName,
        email,
        role: 'trainee',
        avatar: userDoc.profileImageUrl || fullName.slice(0, 2),
        targetCalories: Number(regData.targetCalories) || 2200,
        targetProtein: Number(regData.targetProtein) || 160,
        targetWaterMl: Number(regData.targetWater) || 3000,
        targetSleepHours: Number(regData.targetSleep) || 8,
        createdAt: new Date().toISOString()
      };
      try {
        await this.db.collection('trainees').doc(uid).set(traineeDoc, { merge: true });
      } catch (err) {
        console.warn("[FitPulse Firebase] Trainees collection notice:", err.message);
      }
    }

    this.logAudit('USER_REGISTRATION_SUBMITTED', `הוגשה בקשת הרשמת משתמש חדש (${isTrainer ? 'מאמן' : 'מתאמן'}): ${email} (${uid}) - ממתין לאישור מנהל`);
    return {
      userId: uid,
      id: uid,
      fullName,
      email,
      isTrainer,
      role: userDoc.role,
      status: 'pending_approval',
      approvalStatus: 'pending',
      profileImageUrl: userDoc.profileImageUrl || null
    };
  },

  // Manager: Fetch all user registrations awaiting approval (Cloud + Server + Local)
  async getPendingApprovals() {
    const listMap = new Map();

    // 1. Fetch from Server API
    try {
      const res = await fetch('/api/users/pending');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.pendingUsers)) {
          data.pendingUsers.forEach(u => {
            const key = u.id || u.userId || u.email;
            if (key) listMap.set(key, u);
          });
        }
      }
    } catch (sErr) {
      console.warn("[FitPulse Firebase] Could not fetch server pending users:", sErr.message);
    }

    // 2. Fetch from Cloud Firestore if available
    if (this.isConfigured && this.db) {
      try {
        const snap = await this.db.collection('users')
          .where('status', '==', 'pending_approval')
          .get();
        snap.forEach(doc => {
          const d = doc.data();
          const key = d.userId || d.id || d.email;
          if (key && !listMap.has(key)) {
            listMap.set(key, d);
          }
        });
      } catch (err) {
        console.warn("[FitPulse Firebase] Firestore pending query notice:", err.message);
      }
    }

    // 3. Merge with localStorage pending
    try {
      const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
      if (Array.isArray(localPending)) {
        localPending.forEach(u => {
          const key = u.userId || u.id || u.email;
          if (key && (u.status === 'pending_approval' || u.approvalStatus === 'pending') && !listMap.has(key)) {
            listMap.set(key, u);
          }
        });
      }
    } catch (e) {}

    return Array.from(listMap.values());
  },

  // Manager: Approve user registration (activates account and creates self-coaching if trainer)
  async approveUser(userId) {
    const managerUid = this.auth?.currentUser?.uid || 'usr_mgr';
    let approvedUser = null;

    // 1. Approve on Server API
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, managerId: managerUid })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          approvedUser = data.user;
        }
      }
    } catch (sErr) {
      console.warn("[FitPulse Firebase] Server approve notice:", sErr.message);
    }

    // 2. Approve on Cloud Firestore
    if (this.isConfigured && this.db) {
      try {
        const userRef = this.db.collection('users').doc(userId);
        const snap = await userRef.get();
        if (snap.exists) {
          const userData = snap.data();
          const now = firebase.firestore.FieldValue.serverTimestamp();
          await userRef.update({
            status: 'active',
            approvalStatus: 'approved',
            approvedAt: now,
            approvedBy: managerUid
          });

          // If Trainer: ensure self-training relation is provisioned
          if (userData.isTrainer) {
            const selfRelId = `${userId}_${userId}`;
            try {
              await this.db.collection('trainerships').doc(selfRelId).set({
                relationId: selfRelId,
                trainerId: userId,
                traineeId: userId,
                status: 'active',
                permissions: {
                  canViewSleep: true,
                  canViewNutrition: true,
                  canViewWorkouts: true,
                  canViewDailyLogs: true
                },
                createdAt: now
              }, { merge: true });
            } catch (tErr) {
              console.warn("[FitPulse Firebase] Self-training relation notice:", tErr.message);
            }
          }
          if (!approvedUser) approvedUser = { ...userData, status: 'active', approvalStatus: 'approved' };
        }
      } catch (fbErr) {
        console.warn("[FitPulse Firebase] Firestore approve notice:", fbErr.message);
      }
    }

    // 3. Update localStorage
    try {
      const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
      const updated = localPending.map(u => (u.userId === userId || u.id === userId) ? { ...u, status: 'active', approvalStatus: 'approved' } : u);
      localStorage.setItem('fitpulse_pending_users', JSON.stringify(updated));
    } catch (e) {}

    this.logAudit('USER_APPROVED', `אושר חשבון משתמש חדש (${approvedUser?.isTrainer ? 'מאמן' : 'מתאמן'}): ${approvedUser?.fullName || approvedUser?.email || userId} ע"י מנהל מערכת`);
    return approvedUser || { userId, status: 'active', approvalStatus: 'approved' };
  },

  // Manager: Reject user registration
  async rejectUser(userId, reason = 'לא אושר על ידי מנהל מערכת') {
    // 1. Server reject
    try {
      await fetch('/api/users/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason })
      });
    } catch (e) {}

    // 2. Firestore reject
    if (this.isConfigured && this.db) {
      try {
        const userRef = this.db.collection('users').doc(userId);
        await userRef.update({
          status: 'rejected',
          approvalStatus: 'rejected'
        });
      } catch (fbErr) {
        console.warn("[FitPulse Firebase] Firestore reject notice:", fbErr.message);
      }
    }

    // 3. Local storage reject
    try {
      const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
      const updated = localPending.map(u => (u.userId === userId || u.id === userId) ? { ...u, status: 'rejected', approvalStatus: 'rejected' } : u);
      localStorage.setItem('fitpulse_pending_users', JSON.stringify(updated));
    } catch (e) {}

    this.logAudit('USER_REJECTED', `נדחה חשבון (${userId}) ע"י מנהל מערכת: ${reason}`);
    return true;
  },

  async getUserProfile(uid) {
    let profile = null;

    // 1. Firestore profile check
    if (this.isConfigured && this.db) {
      try {
        const doc = await this.db.collection('users').doc(uid).get();
        if (doc.exists) {
          profile = doc.data();
        }
      } catch (e) {
        console.warn("[FitPulse Firebase] Error fetching user profile from Firestore:", e.message);
      }
    }

    // 2. Server status check
    if (!profile || profile.status === 'pending_approval') {
      try {
        const res = await fetch(`/api/users/status?userId=${encodeURIComponent(uid)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            profile = { ...profile, ...data.user };
          }
        }
      } catch (sErr) {}
    }

    // 3. LocalStorage check
    if (!profile || profile.status === 'pending_approval') {
      try {
        const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
        const found = localPending.find(u => u.userId === uid || u.id === uid);
        if (found) {
          profile = { ...profile, ...found };
        }
      } catch (lErr) {}
    }

    return profile;
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
  },

  // -------------------------------------------------------------------------
  // Foods Collection Service Methods
  // -------------------------------------------------------------------------
  async getFoods(limitCount = 200) {
    if (!this.isConfigured || !this.db) return [];
    try {
      const snap = await this.db.collection('foods').limit(limitCount).get();
      const list = [];
      snap.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      return list;
    } catch (err) {
      console.warn("[FitPulse Firebase] getFoods notice:", err.message);
      return [];
    }
  },

  async searchFirestoreFoods(queryText = '', category = 'all') {
    if (!this.isConfigured || !this.db) return [];
    try {
      let ref = this.db.collection('foods');
      if (category && category !== 'all') {
        ref = ref.where('category', '==', category);
      }
      const snap = await ref.limit(100).get();
      const results = [];
      const q = (queryText || '').trim().toLowerCase();
      snap.forEach(doc => {
        const data = doc.data();
        const searchable = [data.name, data.nameEn, data.brand, data.categoryName, ...(data.dietaryTags || [])]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!q || searchable.includes(q)) {
          results.push({ id: doc.id, ...data });
        }
      });
      return results;
    } catch (err) {
      console.warn("[FitPulse Firebase] searchFirestoreFoods notice:", err.message);
      return [];
    }
  },

  async addFood(food) {
    if (!this.isConfigured || !this.db) return null;
    try {
      const docId = food.id || `il_custom_${Date.now()}`;
      const payload = {
        name: food.name,
        nameEn: food.nameEn || '',
        brand: food.brand || '',
        category: food.category || 'supermarket_staples',
        categoryName: food.categoryName || '',
        unitName: food.unitName || '100 גרם',
        defaultGrams: Number(food.defaultGrams || 100),
        calories: Number(food.calories || 0),
        protein: Number(food.protein || 0),
        carbs: Number(food.carbs || 0),
        fat: Number(food.fat || 0),
        fiber: Number(food.fiber || 0),
        sodium: Number(food.sodium || 0),
        sugar: Number(food.sugar || 0),
        dietaryTags: Array.isArray(food.dietaryTags) ? food.dietaryTags : (food.tags || []),
        locationType: food.locationType || '',
        region: food.region || '',
        address: food.address || '',
        verified: Boolean(food.verified),
        createdAt: food.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await this.db.collection('foods').doc(docId).set(payload, { merge: true });
      return { id: docId, ...payload };
    } catch (err) {
      console.error("[FitPulse Firebase] addFood error:", err);
      throw err;
    }
  }
};

// Global export
if (typeof window !== 'undefined') {
  window.FitPulseFirebase = FitPulseFirebase;
}
