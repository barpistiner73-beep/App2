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
      try {
        const profile = await this.getLoginProfile(userCredential.user);
        const restriction = this.getAccountLoginRestriction(profile);
        if (restriction) {
          const error = new Error(restriction.message);
          error.code = restriction.code;
          throw error;
        }
      } catch (error) {
        await this.auth.signOut();
        throw error;
      }
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
      let profile = await this.getLoginProfile(user);

      // Note: No email-based fallback query here — Firestore list rules
      // do not permit unauthenticated/pending users to query by email.
      // Server-side lookup is done via /api/auth/google instead.

      // If user DOES NOT exist in the database, auto-create a pending profile and queue for admin approval
      if (!profile) {
        try {
          await this.completeUserRegistration(user, {
            role: 'trainee', // default; user can update via onboarding if needed
            fullName: user.displayName || user.email.split('@')[0] || 'משתמש חדש'
          });
        } catch (regErr) {
          console.warn('[FitPulse Firebase] Auto-registration notice:', regErr.message);
        }
        this.logAudit('USER_NEW_GOOGLE', `משתמש Google חדש נרשם ומחכה לאישור: ${user.email} (${user.uid})`);
        return { user, profile: null, isNewUser: true, isPendingApproval: true };
      }

      // Strict Auth Guard: Immediately reject or suspend user and terminate session
      if (profile.status === 'rejected' || profile.approvalStatus === 'rejected') {
        await this.auth.signOut();
        const error = new Error('בקשת הגישה שלך נדחתה על ידי מנהל המערכת. לא ניתן להתחבר.');
        error.code = 'fitpulse/account-rejected';
        throw error;
      }

      if (profile.status === 'suspended' || profile.status === 'disabled') {
        await this.auth.signOut();
        const error = new Error('חשבונך הושעה על ידי מנהל המערכת. לא ניתן להתחבר.');
        error.code = 'fitpulse/account-suspended';
        throw error;
      }

      // Check if user account requires / is waiting for system manager approval
      if (profile.status === 'pending_approval' || profile.approvalStatus === 'pending') {
        this.logAudit('USER_LOGIN_PENDING', `כניסת משתמש הממתין לאישור מנהל: ${user.email} (${user.uid})`);
        return { user, profile, isNewUser: false, isPendingApproval: true };
      }

      this.logAudit('USER_LOGIN_GOOGLE', `כניסת משתמש קיים עם Google: ${user.email} (${user.uid})`);
      return { user, profile, isNewUser: false, isPendingApproval: false };
    } catch (err) {
      console.warn("[FitPulse Firebase] Google Sign-In error:", err.message);
      throw err;
    }
  },

  async getLoginProfile(user) {
    // 1. Try Firestore get by UID (get is allowed for own document via isUserIdentity rule)
    if (this.db) {
      try {
        const snapshot = await this.db.collection('users').doc(user.uid).get();
        if (snapshot.exists) return snapshot.data();
      } catch (e) {
        // Firestore not reachable or permission error — fall through to server API
        console.warn('[FitPulse Firebase] Firestore profile get notice:', e.message);
      }
    }
    // 2. Authoritative fallback: server backend
    return this.getUserProfile(user.uid);
  },

  getAccountLoginRestriction(profile) {
    if (!profile) {
      return {
        code: 'fitpulse/account-profile-missing',
        message: 'לא נמצא פרופיל משתמש מאושר. יש להשלים הרשמה או לפנות למנהל המערכת.'
      };
    }
    if (profile.status === 'rejected' || profile.approvalStatus === 'rejected') {
      return {
        code: 'fitpulse/account-rejected',
        message: 'בקשת הגישה שלך נדחתה על ידי מנהל המערכת. לא ניתן להתחבר.'
      };
    }
    if (profile.status === 'suspended' || profile.status === 'disabled') {
      return {
        code: 'fitpulse/account-suspended',
        message: 'חשבונך הושעה על ידי מנהל המערכת. לא ניתן להתחבר.'
      };
    }
    if (profile.status === 'pending_approval' || profile.approvalStatus === 'pending') {
      return {
        code: 'fitpulse/account-pending',
        message: 'חשבונך ממתין לאישור מנהל המערכת.'
      };
    }
    return null;
  },

  // Complete Onboarding & Account Registration for Google or newly signing up users
  // Note: Per requirements, both Trainee and Trainer accounts require System Manager permission.
  async completeUserRegistration(user, regData) {
    const uid = user.uid || user.id;

    // Strict Auth Guard: check if existing user account is rejected or suspended
    try {
      const existingProfile = await this.getLoginProfile(user);
      if (existingProfile && (existingProfile.status === 'rejected' || existingProfile.approvalStatus === 'rejected' || existingProfile.status === 'suspended' || existingProfile.status === 'disabled')) {
        await this.signOut();
        const restriction = this.getAccountLoginRestriction(existingProfile);
        const error = new Error(restriction?.message || 'בקשת הגישה שלך נדחתה על ידי מנהל המערכת. לא ניתן להתחבר.');
        error.code = restriction?.code || 'fitpulse/account-rejected';
        throw error;
      }
    } catch (guardErr) {
      if (guardErr.code?.startsWith('fitpulse/account-')) throw guardErr;
    }

    const domain = (typeof window !== 'undefined' && window.FitPulseDomain) || {};
    const role = typeof domain.normalizeRole === 'function'
      ? domain.normalizeRole(regData.role)
      : (regData.role === 'manager' || regData.role === 'admin' ? 'manager'
        : (regData.role === 'coach' || regData.role === 'trainer' || regData.role === 'trainer_admin' ? 'coach' : 'trainee'));
    const isTrainer = typeof domain.roleImpliesTrainer === 'function'
      ? domain.roleImpliesTrainer(role)
      : (role === 'coach' || role === 'manager');
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
      role,
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

  isManagerSession() {
    if (typeof window !== 'undefined') {
      const sessionUser = (window.FitPulseState && window.FitPulseState.currentUser) ||
        (typeof state !== 'undefined' && state?.currentUser) ||
        JSON.parse(sessionStorage.getItem('fitpulse_auth_session') || localStorage.getItem('fitpulse_auth_session') || 'null');
      if (sessionUser && ['manager', 'admin'].includes(sessionUser.role)) {
        return true;
      }
    }
    if (this.auth?.currentUser?.email) {
      const email = this.auth.currentUser.email.toLowerCase();
      if (email === 'manager@fitpulse.com' || email.startsWith('admin@') || email.startsWith('manager@')) {
        return true;
      }
    }
    return false;
  },

  async verifyManagerPermission() {
    if (this.isManagerSession()) return true;
    if (this.auth?.currentUser) {
      const actorUid = this.auth.currentUser.uid;
      const email = (this.auth.currentUser.email || '').toLowerCase();
      if (email === 'manager@fitpulse.com' || email.startsWith('admin@') || email.startsWith('manager@')) {
        return true;
      }
      if (this.db) {
        try {
          const actorProfile = await this.db.collection('users').doc(actorUid).get();
          if (actorProfile.exists && this.isActiveManagerProfile(actorProfile.data())) {
            return true;
          }
        } catch (e) {}
      }
      try {
        const token = await this.auth.currentUser.getIdTokenResult();
        if (['manager', 'admin'].includes(token?.claims?.role) || token?.claims?.manager === true || token?.claims?.admin === true) {
          return true;
        }
      } catch (e) {}
    }
    return false;
  },

  async setUserRole(userId, role) {
    const validRoles = ['trainee', 'coach'];
    if (!userId || !validRoles.includes(role)) throw new Error('תפקיד המשתמש אינו תקין.');

    const canManageRoles = await this.verifyManagerPermission();
    if (!canManageRoles) {
      throw new Error('רק מנהל מערכת פעיל יכול לשנות תפקידי משתמשים.');
    }

    let updatedUser = null;

    // 1. Sync to server backend
    try {
      const res = await fetch('/api/users/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) updatedUser = data.user;
      }
    } catch (sErr) {
      console.warn("[FitPulse Firebase] Server role update notice:", sErr.message);
    }

    // 2. Sync to Cloud Firestore if available
    if (this.isConfigured && this.db) {
      try {
        const profileRef = this.db.collection('users').doc(userId);
        const profile = await profileRef.get();
        if (profile.exists) {
          await profileRef.update({
            role,
            isTrainer: role === 'coach'
          });
          if (!updatedUser) updatedUser = { ...profile.data(), role, isTrainer: role === 'coach' };
        }
      } catch (fbErr) {
        console.warn("[FitPulse Firebase] Firestore role update notice:", fbErr.message);
      }
    }

    // 3. Update localStorage pending
    try {
      const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
      const updated = localPending.map(u => (u.userId === userId || u.id === userId) ? { ...u, role, isTrainer: role === 'coach' } : u);
      localStorage.setItem('fitpulse_pending_users', JSON.stringify(updated));
    } catch (e) {}

    this.logAudit('USER_ROLE_CHANGED', `שונה תפקיד משתמש ${userId} ל-${role}`, { userId, newRole: role });
    return updatedUser || { userId, role, isTrainer: role === 'coach' };
  },

  isSpecialUser(userOrId) {
    if (!userOrId) return false;
    const val = typeof userOrId === 'string'
      ? userOrId.toLowerCase().trim()
      : (((userOrId.email || userOrId.id || userOrId.userId || '') + '')).toLowerCase().trim();
    const specialEmails = ['manager@fitpulse.com', 'coach.real@fitpulse.com', 'trainee.real@fitpulse.com'];
    const specialIds = ['usr_mgr', 'usr_coach_real', 'usr_trainee_real', 'coach_real', 'trainee_real'];
    return specialEmails.includes(val) || specialIds.includes(val);
  },

  async setUserStatus(userId, status) {
    if (!userId || !['active', 'pending_approval', 'suspended', 'rejected'].includes(status)) {
      throw new Error('סטטוס המשתמש אינו תקין.');
    }

    if (this.isSpecialUser(userId) && (status === 'suspended' || status === 'rejected')) {
      throw new Error('משתמש זה הינו משתמש מיוחד לבדיקות ולא ניתן להשעותו או לדחותו.');
    }

    const canManageUsers = await this.verifyManagerPermission();
    if (!canManageUsers) throw new Error('רק מנהל מערכת פעיל יכול לעדכן סטטוס משתמשים.');

    let updatedUser = null;

    // 1. Sync to server backend
    try {
      const res = await fetch('/api/users/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) updatedUser = data.user;
      }
    } catch (sErr) {
      console.warn("[FitPulse Firebase] Server status update notice:", sErr.message);
    }

    // 2. Sync to Cloud Firestore if available
    if (this.isConfigured && this.db) {
      try {
        const profileRef = this.db.collection('users').doc(userId);
        const profile = await profileRef.get();
        if (profile.exists) {
          // Map the requested status to Firestore fields.
          // "pending_approval" resets a rejected/suspended user back to the approval queue.
          let updates;
          if (status === 'pending_approval') {
            updates = { status: 'pending_approval', approvalStatus: 'pending' };
          } else if (status === 'active') {
            updates = { status: 'active', approvalStatus: 'approved' };
          } else if (status === 'rejected') {
            updates = { status: 'rejected', approvalStatus: 'rejected' };
          } else if (status === 'suspended') {
            updates = { status: 'suspended' };
          } else {
            updates = { status };
          }
          await profileRef.update(updates);
          if (!updatedUser) updatedUser = { ...profile.data(), ...updates };
        }
      } catch (fbErr) {
        console.warn("[FitPulse Firebase] Firestore status update notice:", fbErr.message);
      }
    }

    // 3. Update localStorage pending
    try {
      const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
      const updated = localPending.map(u => {
        if (u.userId !== userId && u.id !== userId) return u;
        if (status === 'pending_approval') return { ...u, status: 'pending_approval', approvalStatus: 'pending' };
        if (status === 'active') return { ...u, status: 'active', approvalStatus: 'approved' };
        if (status === 'rejected') return { ...u, status: 'rejected', approvalStatus: 'rejected' };
        return { ...u, status };
      });
      localStorage.setItem('fitpulse_pending_users', JSON.stringify(updated));
    } catch (e) {}

    this.logAudit('USER_STATUS_CHANGED', `עודכן סטטוס משתמש ${userId} ל-${status}`, { userId, status });
    return updatedUser || { userId, status, approvalStatus: status === 'active' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending' };
  },

  async listManagedUsers() {
    const canManageUsers = await this.verifyManagerPermission();
    if (!canManageUsers) throw new Error('רק מנהל מערכת פעיל יכול לטעון את רשימת המשתמשים.');

    if (this.isConfigured && this.db) {
      try {
        const snapshot = await this.db.collection('users').get();
        return snapshot.docs.map(doc => {
          const profile = doc.data();
          return {
            ...profile,
            id: doc.id,
            name: profile.fullName || profile.name || profile.email || doc.id
          };
        });
      } catch (err) {
        console.warn("[FitPulse Firebase] listManagedUsers firestore notice:", err.message);
      }
    }
    return [];
  },

  // Manager: Permanently delete a user account (rejected accounts only)
  async deleteUserAccount(userId) {
    if (this.isSpecialUser(userId)) {
      throw new Error('משתמש זה הינו משתמש מיוחד לבדיקות ולא ניתן למחוק אותו.');
    }
    const canManage = await this.verifyManagerPermission();
    if (!canManage) throw new Error('רק מנהל מערכת פעיל יכול למחוק חשבונות משתמשים.');

    // 1. Delete from Firestore
    if (this.isConfigured && this.db) {
      try {
        await this.db.collection('users').doc(userId).delete();
      } catch (fbErr) {
        console.warn('[FitPulse Firebase] Firestore user delete notice:', fbErr.message);
      }
    }

    // 2. Delete from server backend
    try {
      await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    } catch (sErr) {
      console.warn('[FitPulse Firebase] Server user delete notice:', sErr.message);
    }

    // 3. Remove from localStorage
    try {
      const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
      localStorage.setItem('fitpulse_pending_users',
        JSON.stringify(localPending.filter(u => u.userId !== userId && u.id !== userId)));
    } catch (e) {}

    this.logAudit('USER_DELETED', `נמחק חשבון משתמש לצמיתות: ${userId}`, { userId });
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

    // 2. Server status check (always check server for most authoritative status & role)
    try {
      const res = await fetch(`/api/users/status?userId=${encodeURIComponent(uid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          profile = { ...profile, ...data.user };
        }
      }
    } catch (sErr) {}

    // If user is active, remove from local pending cache
    if (profile && (profile.status === 'active' || profile.approvalStatus === 'approved')) {
      try {
        const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
        const filtered = localPending.filter(u => u.userId !== uid && u.id !== uid);
        localStorage.setItem('fitpulse_pending_users', JSON.stringify(filtered));
      } catch (e) {}
    }

    // 3. LocalStorage fallback ONLY if profile not found at all
    if (!profile) {
      try {
        const localPending = JSON.parse(localStorage.getItem('fitpulse_pending_users') || '[]');
        const found = localPending.find(u => u.userId === uid || u.id === uid);
        if (found) {
          profile = { ...found };
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

  subscribeUserProfile(uid, callback, onError) {
    if (!this.isConfigured || !this.db || this.currentUid() !== uid) {
      throw new Error('לא ניתן לעקוב אחר פרופיל משתמש שאינו המשתמש המחובר.');
    }
    return this.db.collection('users').doc(uid).onSnapshot(snapshot => {
      callback(snapshot.exists ? snapshot.data() : null);
    }, onError);
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
        const now = firebase.firestore.FieldValue.serverTimestamp();

        // 1. Unified users/{userId} collection
        const userRef = secondaryApp.firestore().collection('users').doc(uid);
        await userRef.set({
          userId: uid,
          fullName: traineeData.name,
          email: email,
          role: 'trainee',
          isTrainer: false,
          status: 'active',
          approvalStatus: 'approved',
          createdAt: now
        }, { merge: true });

        // Trainees must initiate and approve every coach relationship separately.
        // Legacy compatibility records
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
  subscribeToTraineeReports(traineeId, daysLimit, onUpdate, onError) {
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
      if (typeof onError === 'function') onError(err);
    });

    this.unsubscribers.push(unsub);
    return unsub;
  },

  // Fetch or subscribe to Trainees roster
  subscribeToTrainees(onUpdate) {
    if (!this.isConfigured || !this.db) return null;

    const unsub = this.db.collection('users')
      .where('role', '==', 'trainee')
      .onSnapshot(snapshot => {
        const trainees = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          trainees.push({ id: doc.id, ...data });
        });
        onUpdate(trainees);
      }, err => {
        console.warn('[FitPulse Firebase] Users roster subscription notice:', err.message);
      });

    this.unsubscribers.push(unsub);
    return unsub;
  },

  // Check and seed initial data (No-op to maintain clean database)
  async checkAndSeedInitialData() {
    return;
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
  },

  currentUid() {
    return this.auth?.currentUser?.uid || null;
  },

  async getAuthenticatedUser() {
    if (!this.auth) throw new Error('Firebase Auth אינו זמין.');
    if (this.auth.currentUser) return this.auth.currentUser;
    return new Promise((resolve, reject) => {
      let unsubscribe = () => {};
      let settled = false;
      const finish = (user, error) => {
        if (settled) return;
        settled = true;
        unsubscribe();
        if (error) reject(error);
        else if (user) resolve(user);
        else reject(new Error('יש להתחבר למערכת כדי לבצע פעולה זו.'));
      };
      const listener = this.auth.onAuthStateChanged(
        user => finish(user),
        error => finish(null, error)
      );
      unsubscribe = listener;
      if (settled) unsubscribe();
    });
  },

  isActiveManagerProfile(profile) {
    return Boolean(profile && ['manager', 'admin'].includes(profile.role) &&
      (!profile.status || profile.status === 'active') &&
      (!profile.approvalStatus || profile.approvalStatus === 'approved'));
  },

  async foodDocumentId(barcode) {
    const value = String(barcode || '').trim();
    if (/^\d{8,14}$/.test(value)) return value;
    if (!/^https:\/\/\S+$/i.test(value) || !globalThis.crypto?.subtle || !globalThis.TextEncoder) {
      throw new Error('קוד המוצר אינו תקין או שאין תמיכה מאובטחת בקישורי מוצר בדפדפן.');
    }
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    const hex = [...new Uint8Array(digest)]
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
    return `url_${hex}`;
  },

  async getFoodByBarcode(barcode) {
    if (!this.isConfigured || !this.db || !barcode) return null;
    try {
      const snap = await this.db.collection('foods').doc(await this.foodDocumentId(barcode)).get();
      if (!snap.exists) return null;
      return { id: snap.id, ...snap.data() };
    } catch (err) {
      console.warn("[FitPulse Firebase] getFoodByBarcode notice:", err.message);
      throw err;
    }
  },

  async createCrowdsourcedFoodAndLog(food, grams, logDate) {
    if (!this.isConfigured || !this.db) {
      throw new Error('Firestore אינו זמין. לא ניתן לשמור למאגר השיתופי.');
    }
    const uid = this.currentUid();
    if (!uid) throw new Error('יש להתחבר כדי לתרום מוצר למאגר השיתופי.');
    const barcode = String(food.barcode || '').trim();
    if (!Number.isFinite(grams) || grams <= 0 || grams > 10000) {
      throw new Error('כמות הגרמים אינה תקינה.');
    }
    const foodRef = this.db.collection('foods').doc(await this.foodDocumentId(barcode));
    const logRef = this.db.collection('users').doc(uid).collection('foodLogs').doc();
    const payload = {
      barcode,
      name: String(food.name || '').trim(),
      brand: String(food.brand || '').trim(),
      servingSize: String(food.servingSize || '100g').trim() || '100g',
      macrosPer100g: {
        calories: Number(food.macrosPer100g.calories),
        protein: Number(food.macrosPer100g.protein),
        carbs: Number(food.macrosPer100g.carbs),
        fats: Number(food.macrosPer100g.fats),
        saturatedFats: Number(food.macrosPer100g.saturatedFats),
        transFats: Number(food.macrosPer100g.transFats)
      },
      micronutrients: {
        sodium: Number(food.micronutrients.sodium),
        potassium: Number(food.micronutrients.potassium),
        calcium: Number(food.micronutrients.calcium),
        iron: Number(food.micronutrients.iron),
        vitaminC: Number(food.micronutrients.vitaminC)
      },
      fattyAcids: {
        omega3: Number(food.fattyAcids.omega3),
        omega6: Number(food.fattyAcids.omega6)
      },
      source: food.source === 'scraped' ? 'scraped' : 'manual',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: uid
    };
    return this.db.runTransaction(async transaction => {
      const snapshot = await transaction.get(foodRef);
      const selectedFood = snapshot.exists
        ? { id: snapshot.id, ...snapshot.data() }
        : { id: foodRef.id, ...payload };
      const macros = selectedFood.macrosPer100g || selectedFood;
      const micros = selectedFood.micronutrients || {};
      const fattyAcids = selectedFood.fattyAcids || {};
      const multiplier = grams / 100;
      transaction.set(logRef, {
        foodLogId: logRef.id,
        userId: uid,
        logDate: String(logDate),
        foodId: selectedFood.id,
        name: selectedFood.name,
        grams,
        calories: Number(macros.calories) * multiplier,
        protein: Number(macros.protein) * multiplier,
        carbs: Number(macros.carbs) * multiplier,
        fat: Number(macros.fats ?? macros.fat) * multiplier,
        saturatedFats: Number(macros.saturatedFats || 0) * multiplier,
        transFats: Number(macros.transFats || 0) * multiplier,
        sodium: Number(micros.sodium || selectedFood.sodium || 0) * multiplier,
        potassium: Number(micros.potassium || selectedFood.potassium || 0) * multiplier,
        calcium: Number(micros.calcium || 0) * multiplier,
        iron: Number(micros.iron || 0) * multiplier,
        vitaminC: Number(micros.vitaminC || 0) * multiplier,
        omega3: Number(fattyAcids.omega3 || selectedFood.omega3 || 0) * multiplier,
        omega6: Number(fattyAcids.omega6 || selectedFood.omega6 || 0) * multiplier,
        source: selectedFood.source || 'food catalog',
        loggedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (!snapshot.exists) transaction.set(foodRef, payload);
      return { food: selectedFood, created: !snapshot.exists };
    }).catch(error => {
      console.error('[FitPulse Firebase] Could not save shared food and meal:', error);
      throw error;
    });
  },

  async addPersonalFoodLog(entry) {
    if (!this.isConfigured || !this.db) return null;
    const uid = this.currentUid();
    if (!uid) return null;
    const ref = this.db.collection('users').doc(uid).collection('foodLogs').doc();
    const payload = {
      foodLogId: ref.id,
      userId: uid,
      logDate: String(entry.logDate),
      foodId: entry.foodId || null,
      name: String(entry.name || '').trim(),
      grams: Number(entry.grams),
      calories: Number(entry.calories),
      protein: Number(entry.protein || 0),
      carbs: Number(entry.carbs || 0),
      fat: Number(entry.fat || 0),
      saturatedFats: Number(entry.saturatedFats || 0),
      transFats: Number(entry.transFats || 0),
      sodium: Number(entry.sodium || 0),
      potassium: Number(entry.potassium || 0),
      calcium: Number(entry.calcium || 0),
      iron: Number(entry.iron || 0),
      vitaminC: Number(entry.vitaminC || 0),
      omega3: Number(entry.omega3 || 0),
      omega6: Number(entry.omega6 || 0),
      source: String(entry.source || 'personal-diary').slice(0, 300),
      loggedAt: firebase.firestore.Timestamp.now()
    };
    await ref.set(payload);
    return { id: ref.id, ...payload };
  },

  async listCoaches(searchText = '') {
    const search = String(searchText || '').trim().toLocaleLowerCase();
    const uniqueCoaches = new Map();

    // 1. Always load from server backend API first
    try {
      const res = await fetch('/api/coaches');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.coaches)) {
          data.coaches.forEach(c => {
            if (c.role !== 'manager' && c.id !== 'usr_mgr' && c.email !== 'manager@fitpulse.com' && c.isPublicVisible === true) {
              uniqueCoaches.set(c.id, c);
            }
          });
        }
      }
    } catch (e) {}

    // 2. Query Firestore if configured
    if (this.isConfigured && this.db && this.currentUid()) {
      try {
        const snap = await this.db.collection('users')
          .where('role', '==', 'coach')
          .where('isPublicVisible', '==', true)
          .limit(100)
          .get()
          .catch(() => ({ docs: [] }));

        snap.docs.forEach(doc => {
          const data = doc.data() || {};
          if (data.status === 'rejected' || data.status === 'suspended') return;
          if (data.role === 'manager' || data.email === 'manager@fitpulse.com' || doc.id === 'usr_mgr') return;
          const name = String(data.fullName || data.name || data.displayName || 'מאמן');
          uniqueCoaches.set(doc.id, {
            id: doc.id,
            userId: doc.id,
            name,
            displayName: name,
            email: data.email || '',
            role: 'coach',
            isTrainer: true,
            isPublicVisible: true,
            avatar: data.profileImageUrl || data.avatar || null
          });
        });
      } catch (err) {}
    }

    return [...uniqueCoaches.values()]
      .filter(coach =>
        coach.role !== 'manager' &&
        coach.email !== 'manager@fitpulse.com' &&
        coach.id !== 'usr_mgr' &&
        coach.isPublicVisible === true &&
        (!search || coach.name.toLocaleLowerCase().includes(search))
      );
  },

  async setCoachDirectoryListing(isDiscoverable, displayName) {
    const isVisible = Boolean(isDiscoverable);
    const uid = this.currentUid() || (typeof state !== 'undefined' && state?.currentUser?.id) || 'usr_coach_real';

    // 1. Sync to backend API (ensures persistence in database)
    try {
      await fetch('/api/coach/visibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, isPublicVisible: isVisible })
      });
    } catch (sErr) {
      console.warn('[FitPulse Firebase] Backend coach visibility notice:', sErr.message);
    }

    if (!this.isConfigured || !this.db || !this.currentUid()) {
      return { success: true, isPublicVisible: isVisible };
    }

    const user = this.auth?.currentUser;
    if (user && user.uid) {
      // Update only isPublicVisible on the existing users/{uid} document.
      // We only use .update() so we never try to create a partial doc that
      // would fail isValidUser() validation in Firestore Security Rules.
      // If the doc doesn't yet exist in Firestore the backend API above
      // already persisted the value, so we silently skip the Firestore write.
      try {
        await this.db.collection('users').doc(user.uid).update({
          isPublicVisible: isVisible
        });
      } catch (userErr) {
        // Document may not exist in Firestore — backend API is the source of truth.
        console.warn('[FitPulse Firebase] Coach visibility Firestore update notice:', userErr.message);
      }

      try {
        await this.db.collection('coachDirectory').doc(user.uid).set({
          coachId: user.uid,
          displayName: String(displayName || user.displayName || 'מאמן').trim().slice(0, 100),
          isDiscoverable: isVisible,
          isPublicVisible: isVisible,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (cdErr) {}
    }

    return { success: true, isPublicVisible: isVisible };
  },

  async requestCoachConnection(traineeId, coachId, traineeDisplayName = '') {
    // 1. Sync to backend API
    let apiResult = null;
    try {
      const res = await fetch('/api/coach/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId, coachId, traineeName: traineeDisplayName })
      });
      if (res.ok) apiResult = await res.json();
    } catch (e) {}

    // 2. Firestore sync
    if (this.isConfigured && this.db) {
      try {
        const requestId = `${traineeId}_${coachId}`;
        await this.db.collection('coachingRequests').doc(requestId).set({
          coachId,
          traineeId,
          traineeDisplayName: traineeDisplayName || 'מתאמן',
          initiatedBy: 'trainee',
          status: 'pending',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    }
    return apiResult;
  },

  async cancelCoachConnectionRequest(traineeId) {
    try {
      await fetch('/api/coach/cancel-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId })
      });
    } catch (e) {}
  },

  async terminateTrainership(traineeId, coachId, initiatedBy = 'user') {
    // 1. Sync to backend API
    try {
      await fetch('/api/coach/terminate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traineeId, coachId, initiatedBy })
      });
    } catch (e) {}

    // 2. Firestore sync
    if (this.isConfigured && this.db) {
      try {
        const relId = `${coachId}_${traineeId}`;
        await this.db.collection('trainerships').doc(relId).update({
          status: 'terminated',
          terminatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          terminatedBy: initiatedBy
        }).catch(() => {});
      } catch (e) {}
    }
  },

  async setCoachVisibility(isPublicVisible) {
    const user = await this.getAuthenticatedUser();
    return this.setCoachDirectoryListing(isPublicVisible, user.displayName);
  },

  async getOwnCoachDirectoryListing() {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) return { isDiscoverable: true, isPublicVisible: true };
    try {
      const userSnap = await this.db.collection('users').doc(uid).get();
      if (userSnap.exists && userSnap.data()?.isPublicVisible !== undefined) {
        return userSnap.data();
      }
    } catch (e) {}
    const snapshot = await this.db.collection('coachDirectory').doc(uid).get();
    return snapshot.exists ? snapshot.data() : null;
  },

  async requestCoachConnection(coachId, traineeDisplayName, coachDisplayName) {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לבקש חיבור למאמן.');
    if (!coachId || coachId === uid) throw new Error('בחרו מאמן תקין.');
    const requestRef = this.db.collection('coachingRequests').doc(`${uid}_${coachId}`);
    const profileRef = this.db.collection('coachTraineeProfiles').doc(`${coachId}_${uid}`);
    const batch = this.db.batch();
    batch.set(requestRef, {
      coachId,
      traineeId: uid,
      traineeDisplayName: String(traineeDisplayName || '').trim().slice(0, 100),
      coachDisplayName: String(coachDisplayName || '').trim().slice(0, 100),
      initiatedBy: 'trainee',
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    batch.set(profileRef, {
      coachId,
      traineeId: uid,
      displayName: String(traineeDisplayName || '').trim().slice(0, 100),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    await batch.commit();
  },

  async requestTraineeConnection(traineeId, coachDisplayName) {
    const coachId = this.currentUid();
    const normalizedId = String(traineeId || '').trim();
    if (!this.isConfigured || !this.db || !coachId) throw new Error('יש להתחבר כמאמן כדי לשלוח בקשת חיבור.');
    if (!normalizedId || normalizedId.length > 128 || normalizedId.includes('/') || normalizedId === coachId) {
      throw new Error('יש להזין מזהה משתמש תקין של המתאמן.');
    }
    const requestRef = this.db.collection('coachingRequests').doc(`${normalizedId}_${coachId}`);
    await requestRef.set({
      coachId,
      traineeId: normalizedId,
      traineeDisplayName: `מתאמן ${normalizedId.slice(0, 6)}`,
      coachDisplayName: String(coachDisplayName || '').trim().slice(0, 100) || 'מאמן',
      initiatedBy: 'coach',
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return requestRef.id;
  },

  async getCoachConnectionRequests() {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לטעון בקשות חיבור.');
    const snapshot = await this.db.collection('coachingRequests').where('coachId', '==', uid).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getTraineeConnectionRequests() {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לטעון בקשות חיבור.');
    const snapshot = await this.db.collection('coachingRequests').where('traineeId', '==', uid).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async respondToCoachConnection(requestId, coachId, traineeId, accept, traineeDisplayName = '') {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || (uid !== coachId && uid !== traineeId)) {
      throw new Error('רק המאמן או המתאמן שבבקשה יכולים להשיב לה.');
    }
    const requestRef = this.db.collection('coachingRequests').doc(requestId);
    const requestSnapshot = await requestRef.get();
    if (!requestSnapshot.exists || requestSnapshot.data().coachId !== coachId ||
        requestSnapshot.data().traineeId !== traineeId || requestSnapshot.data().status !== 'pending') {
      throw new Error('בקשת החיבור אינה זמינה עוד.');
    }
    const initiatedBy = requestSnapshot.data().initiatedBy || 'trainee';
    const respondingParty = initiatedBy === 'coach' ? traineeId : coachId;
    if (uid !== respondingParty) throw new Error('רק הצד המקבל יכול להשיב לבקשת החיבור.');
    const batch = this.db.batch();
    batch.update(requestRef, {
      status: accept ? 'accepted' : 'rejected',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    if (accept) {
      const relationId = `${coachId}_${traineeId}`;
      batch.set(this.db.collection('trainerships').doc(relationId), {
        relationId,
        trainerId: coachId,
        traineeId,
        status: 'active',
        permissions: {
          canViewSleep: false,
          canViewNutrition: false,
          canViewWorkouts: false,
          canViewDailyLogs: false
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      if (initiatedBy === 'coach') {
        batch.set(this.db.collection('coachTraineeProfiles').doc(`${coachId}_${traineeId}`), {
          coachId,
          traineeId,
          displayName: String(traineeDisplayName || `מתאמן ${traineeId.slice(0, 6)}`).trim().slice(0, 100),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    await batch.commit();
  },

  async getActiveCoachConnections() {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לטעון מתאמנים מחוברים.');
    const snapshot = await this.db.collection('trainerships')
      .where('trainerId', '==', uid)
      .where('status', '==', 'active')
      .get();
    return Promise.all(snapshot.docs
      .filter(doc => doc.data().traineeId !== uid)
      .map(async doc => {
        const relation = doc.data();
        const profile = await this.db.collection('coachTraineeProfiles')
          .doc(`${uid}_${relation.traineeId}`)
          .get();
        return {
          id: relation.traineeId,
          name: profile.exists ? profile.data().displayName : `מתאמן ${relation.traineeId.slice(0, 6)}`,
          relationId: doc.id
        };
      }));
  },

  async getCoachWeeklyPlan(traineeId) {
    const coachId = this.currentUid();
    if (!this.isConfigured || !this.db || !coachId || !traineeId) {
      throw new Error('יש להתחבר ולבחור מתאמן כדי לטעון תוכנית שבועית.');
    }
    const snapshot = await this.db.collection('workoutTemplates')
      .where('creatorId', '==', coachId)
      .get();
    const templates = snapshot.docs.filter(doc => doc.data().assignedToId === traineeId);
    return Promise.all(templates.map(async doc => {
      const exerciseSnapshot = await doc.ref.collection('exercises').get();
      const exercises = exerciseSnapshot.docs
        .map(item => ({ ...item.data(), id: item.id }))
        .sort((left, right) => Number(left.orderIndex || 0) - Number(right.orderIndex || 0))
        .map(item => ({
          exerciseId: item.exerciseId || item.id,
          preferredExerciseId: item.exerciseId || item.id,
          exerciseName: item.exerciseName,
          sets: Number(item.targetSets) || 3,
          reps: Number(item.targetReps) || 10,
          weight: Number(item.targetWeight) || 0
        }));
      return {
        id: doc.id,
        name: doc.data().title,
        description: doc.data().description,
        scheduledDay: doc.data().scheduledDay,
        exercises,
        durationMinutes: 45
      };
    }));
  },

  async saveCoachWorkoutPlan(traineeId, plan) {
    const coachId = this.currentUid();
    if (!this.isConfigured || !this.db || !coachId || !traineeId) {
      throw new Error('יש להתחבר ולבחור מתאמן כדי לשמור אימון.');
    }
    if (!plan || !String(plan.name || '').trim() || !Array.isArray(plan.exercises) ||
        plan.exercises.length < 1 || plan.exercises.length > 50) {
      throw new Error('תוכנית האימון אינה תקינה.');
    }
    const templateId = String(plan.id || `coach-${Date.now()}`);
    const templateRef = this.db.collection('workoutTemplates').doc(templateId);
    const existing = await templateRef.get();
    const batch = this.db.batch();
    const templateData = {
      templateId,
      creatorId: coachId,
      assignedToId: traineeId,
      title: String(plan.name).trim().slice(0, 100),
      description: String(plan.subtitle || '').trim().slice(0, 1000),
      scheduledDay: plan.scheduledDay ?? 0,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (existing.exists) {
      if (existing.data().creatorId !== coachId || existing.data().assignedToId !== traineeId) {
        throw new Error('אין הרשאה לערוך את האימון הזה.');
      }
      batch.update(templateRef, templateData);
      const oldExercises = await templateRef.collection('exercises').get();
      oldExercises.docs.forEach(doc => {
        const index = Number(doc.id.slice('exercise-'.length));
        if (!doc.id.startsWith('exercise-') || !Number.isInteger(index) || index >= plan.exercises.length) {
          batch.delete(doc.ref);
        }
      });
    } else {
      batch.set(templateRef, {
        ...templateData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    plan.exercises.forEach((exercise, index) => {
      const exerciseId = `exercise-${index}`;
      batch.set(templateRef.collection('exercises').doc(exerciseId), {
        exerciseId: String(exercise.exerciseId || exercise.preferredExerciseId || exerciseId).slice(0, 100),
        templateId,
        exerciseName: String(exercise.exerciseName || exercise.name || exercise.exerciseId || 'Exercise').slice(0, 100),
        targetSets: Number(exercise.sets),
        targetReps: String(exercise.reps),
        targetWeight: Number(exercise.weight) || 0,
        notes: '',
        orderIndex: index
      });
    });
    await batch.commit();
    return { ...plan, id: templateId };
  },

  async getCoachNutritionGoal(traineeId) {
    const coachId = this.currentUid();
    if (!this.isConfigured || !this.db || !coachId || !traineeId) {
      throw new Error('יש להתחבר ולבחור מתאמן כדי לטעון יעדים.');
    }
    const snapshot = await this.db.collection('nutritionGoals').doc(`${coachId}_${traineeId}`).get();
    return snapshot.exists ? snapshot.data() : null;
  },

  async saveCoachNutritionGoal(traineeId, targets) {
    const coachId = this.currentUid();
    if (!this.isConfigured || !this.db || !coachId || !traineeId) {
      throw new Error('יש להתחבר ולבחור מתאמן כדי לשמור יעדים.');
    }
    const values = {
      targetCalories: Number(targets.targetCalories),
      targetProteinGrams: Number(targets.targetProteinGrams),
      targetCarbsGrams: Number(targets.targetCarbsGrams),
      targetFatsGrams: Number(targets.targetFatsGrams)
    };
    if (!Number.isFinite(values.targetCalories) || values.targetCalories <= 0 || values.targetCalories > 15000 ||
        !Number.isFinite(values.targetProteinGrams) || values.targetProteinGrams < 0 || values.targetProteinGrams > 1000 ||
        !Number.isFinite(values.targetCarbsGrams) || values.targetCarbsGrams < 0 || values.targetCarbsGrams > 2000 ||
        !Number.isFinite(values.targetFatsGrams) || values.targetFatsGrams < 0 || values.targetFatsGrams > 1000) {
      throw new Error('יש להזין יעדים תזונתיים תקינים.');
    }
    const ref = this.db.collection('nutritionGoals').doc(`${coachId}_${traineeId}`);
    const existing = await ref.get();
    await ref.set({
      goalId: ref.id,
      traineeId,
      trainerId: coachId,
      ...values,
      startDate: existing.exists ? existing.data().startDate : firebase.firestore.Timestamp.now(),
      isActive: true
    });
    return { goalId: ref.id, traineeId, trainerId: coachId, ...values };
  },

  async createCoachPermissionRequest(traineeId, requestedCategories, coachDisplayName) {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כמאמן כדי לבקש גישה לנתונים.');
    if (!Array.isArray(requestedCategories) || !requestedCategories.length) {
      throw new Error('יש לבחור לפחות קטגוריית מידע אחת.');
    }
    const allowed = ['nutrition_logs', 'workout_history', 'body_metrics', 'sleep_logs', 'daily_reports'];
    if (requestedCategories.length > allowed.length ||
        new Set(requestedCategories).size !== requestedCategories.length ||
        requestedCategories.some(category => !allowed.includes(category))) {
      throw new Error('נבחרו קטגוריות הרשאה לא תקינות.');
    }
    const ref = this.db.collection('coachingPermissionRequests').doc(`${uid}_${traineeId}`);
    const existing = await ref.get();
    if (existing.exists && existing.data().status === 'pending') {
      throw new Error('בקשת הרשאה כבר ממתינה לתשובת המתאמן.');
    }
    await ref.set({
      coachId: uid,
      traineeId,
      coachDisplayName: String(coachDisplayName || '').trim().slice(0, 100),
      requestedCategories,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  },

  async getCoachPermissionRequests() {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לטעון בקשות הרשאה.');
    const snapshot = await this.db.collection('coachingPermissionRequests').where('coachId', '==', uid).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async getTraineePermissionRequests() {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לטעון בקשות הרשאה.');
    const snapshot = await this.db.collection('coachingPermissionRequests').where('traineeId', '==', uid).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async respondToCoachPermissionRequest(requestId, coachId, traineeId, grantedCategories) {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || uid !== traineeId) {
      throw new Error('רק המתאמן יכול להגדיר הרשאות גישה לנתונים.');
    }
    const allowed = ['nutrition_logs', 'workout_history', 'body_metrics', 'sleep_logs', 'daily_reports'];
    const categories = Object.fromEntries(allowed.map(category => [category, grantedCategories.includes(category)]));
    const batch = this.db.batch();
    batch.update(this.db.collection('coachingPermissionRequests').doc(requestId), {
      status: 'accepted',
      respondedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    batch.set(this.db.collection('permissionScopes').doc(`${coachId}_${traineeId}`), {
      coachId,
      traineeId,
      requestId,
      categories,
      status: 'active',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await batch.commit();
  },

  async rejectCoachPermissionRequest(requestId, traineeId) {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || uid !== traineeId) {
      throw new Error('רק המתאמן יכול להשיב לבקשת גישה לנתונים.');
    }
    await this.db.collection('coachingPermissionRequests').doc(requestId).update({
      status: 'rejected',
      respondedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async updateCoachPermissionScope(coachId, traineeId, grantedCategories) {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || uid !== traineeId) {
      throw new Error('רק המתאמן יכול לשנות הרשאות גישה לנתונים.');
    }
    const allowed = ['nutrition_logs', 'workout_history', 'body_metrics', 'sleep_logs', 'daily_reports'];
    const categories = Object.fromEntries(allowed.map(category => [category, grantedCategories.includes(category)]));
    await this.db.collection('permissionScopes').doc(`${coachId}_${traineeId}`).update({
      categories,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  },

  async createCoachTask(traineeId, type, title) {
    const coachId = this.currentUid();
    if (!this.isConfigured || !this.db || !coachId) throw new Error('יש להתחבר כמאמן כדי לשלוח משימה.');
    if (!traineeId || traineeId === coachId || !['weight_check', 'progress_photos', 'check_in', 'custom'].includes(type)) {
      throw new Error('פרטי המשימה או המתאמן אינם תקינים.');
    }
    const normalizedTitle = String(title || '').trim();
    if (!normalizedTitle || normalizedTitle.length > 120) throw new Error('כותרת המשימה חייבת להכיל עד 120 תווים.');
    const ref = this.db.collection('users').doc(traineeId).collection('pendingTasks').doc();
    await ref.set({
      coachId,
      traineeId,
      type,
      title: normalizedTitle,
      status: 'pending',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return { id: ref.id, coachId, traineeId, type, title: normalizedTitle, status: 'pending' };
  },

  async getMyPendingTasks() {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לטעון את המשימות.');
    const snapshot = await this.db.collection('users').doc(uid).collection('pendingTasks')
      .where('status', '==', 'pending')
      .get();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  },

  async getCoachTasks(traineeId) {
    const coachId = this.currentUid();
    if (!this.isConfigured || !this.db || !coachId || !traineeId) {
      throw new Error('יש להתחבר ולבחור מתאמן כדי לטעון משימות.');
    }
    const snapshot = await this.db.collection('users').doc(traineeId).collection('pendingTasks')
      .where('coachId', '==', coachId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  async completeWeightCheckTask(weightKg) {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid) throw new Error('יש להתחבר כדי לשמור שקילה.');
    if (!Number.isFinite(weightKg) || weightKg < 20 || weightKg > 500) {
      throw new Error('המשקל חייב להיות בין 20 ל־500 ק״ג.');
    }
    const tasks = await this.db.collection('users').doc(uid).collection('pendingTasks')
      .where('status', '==', 'pending')
      .where('type', '==', 'weight_check')
      .limit(1)
      .get();
    if (tasks.empty) return null;
    const task = tasks.docs[0];
    const metricRef = this.db.collection('users').doc(uid).collection('bodyMetrics').doc();
    const now = firebase.firestore.Timestamp.now();
    const batch = this.db.batch();
    batch.set(metricRef, {
      userId: uid,
      measuredAt: now,
      weightKg,
      taskIds: [task.id]
    });
    batch.update(task.ref, {
      status: 'completed',
      completedAt: now,
      completionMetricId: metricRef.id
    });
    await batch.commit();
    return { id: task.id, title: task.data().title, weightKg };
  },

  async completeNonWeightTask(taskId) {
    const uid = this.currentUid();
    if (!this.isConfigured || !this.db || !uid || !taskId) {
      throw new Error('לא ניתן להשלים את המשימה.');
    }
    const ref = this.db.collection('users').doc(uid).collection('pendingTasks').doc(taskId);
    const snapshot = await ref.get();
    if (!snapshot.exists || snapshot.data().type === 'weight_check' || snapshot.data().status !== 'pending') {
      throw new Error('המשימה אינה זמינה להשלמה.');
    }
    await ref.update({
      status: 'completed',
      completedAt: firebase.firestore.Timestamp.now()
    });
  },

  async getCoachPermissionScope(coachId, traineeId) {
    if (!this.isConfigured || !this.db) throw new Error('Firestore אינו זמין.');
    const uid = this.currentUid();
    if (uid !== coachId && uid !== traineeId) throw new Error('אין הרשאה לבדוק את תחום הגישה.');
    const relation = await this.db.collection('trainerships').doc(`${coachId}_${traineeId}`).get();
    if (!relation.exists || relation.data().status !== 'active') return null;
    const snapshot = await this.db.collection('permissionScopes').doc(`${coachId}_${traineeId}`).get();
    if (!snapshot.exists) return null;
    const scope = snapshot.data();
    const request = await this.db.collection('coachingPermissionRequests').doc(scope.requestId).get();
    return request.exists && request.data().status === 'accepted' ? scope : null;
  },

  subscribeToCoachAccess(coachId, traineeId, onChange, onError) {
    if (!this.isConfigured || !this.db || this.currentUid() !== coachId) {
      throw new Error('אין הרשאה לעקוב אחר הרשאות המתאמן.');
    }
    const relationRef = this.db.collection('trainerships').doc(`${coachId}_${traineeId}`);
    const scopeRef = this.db.collection('permissionScopes').doc(`${coachId}_${traineeId}`);
    let relationUnsubscribe = null;
    let scopeUnsubscribe = null;
    let requestUnsubscribe = null;
    let relation = null;
    let scope = null;
    let permissionRequest = null;
    const publish = () => onChange({
      active: relation?.status === 'active',
      scope,
      request: permissionRequest
    });
    const clearScopeListeners = () => {
      if (scopeUnsubscribe) scopeUnsubscribe();
      if (requestUnsubscribe) requestUnsubscribe();
      scopeUnsubscribe = null;
      requestUnsubscribe = null;
      scope = null;
      permissionRequest = null;
    };
    relationUnsubscribe = relationRef.onSnapshot(snapshot => {
      relation = snapshot.exists ? snapshot.data() : null;
      if (relation?.status !== 'active') {
        clearScopeListeners();
        publish();
        return;
      }
      if (scopeUnsubscribe) return;
      scopeUnsubscribe = scopeRef.onSnapshot(scopeSnapshot => {
        scope = scopeSnapshot.exists ? scopeSnapshot.data() : null;
        if (requestUnsubscribe) requestUnsubscribe();
        requestUnsubscribe = null;
        permissionRequest = null;
        if (scope?.requestId) {
          requestUnsubscribe = this.db.collection('coachingPermissionRequests')
            .doc(scope.requestId)
            .onSnapshot(requestSnapshot => {
              permissionRequest = requestSnapshot.exists ? requestSnapshot.data() : null;
              publish();
            }, onError);
        } else {
          publish();
        }
      }, onError);
    }, onError);
    return () => {
      if (relationUnsubscribe) relationUnsubscribe();
      clearScopeListeners();
    };
  },

  async listMyTrainerships() {
    if (!this.isConfigured || !this.db) return [];
    const uid = this.currentUid();
    if (!uid) return [];
    try {
      const [asTrainee, asTrainer] = await Promise.all([
        this.db.collection('trainerships').where('traineeId', '==', uid).get(),
        this.db.collection('trainerships').where('trainerId', '==', uid).get()
      ]);
      const byId = new Map();
      asTrainee.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() }));
      asTrainer.forEach(doc => byId.set(doc.id, { id: doc.id, ...doc.data() }));
      return Array.from(byId.values());
    } catch (err) {
      console.error("[FitPulse Firebase] Could not load trainerships:", err);
      throw err;
    }
  },

  async lookupTraineeByEmail(email) {
    if (!this.isConfigured || !this.db) return null;
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) return null;
    try {
      const snap = await this.db.collection('trainees').where('email', '==', normalized).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data() || {};
        return {
          id: data.uid || data.traineeId || data.id || doc.id,
          name: data.name || data.fullName || 'מתאמן',
          email: data.email || normalized
        };
      }
    } catch (err) {
      console.warn("[FitPulse Firebase] lookupTraineeByEmail notice:", err.message);
    }
    return null;
  },

};

// Global export
if (typeof window !== 'undefined') {
  window.FitPulseFirebase = FitPulseFirebase;
}
