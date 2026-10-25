/**
 * FitPulse Core Database Engine
 * Clean, unified JSON database with transactional atomic writes.
 */

const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'fitpulse_db.json');

const SPECIAL_USERS = [
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
    createdAt: '2026-01-01T00:00:00.000Z'
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
    createdAt: '2026-01-01T00:00:00.000Z'
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
    createdAt: '2026-01-01T00:00:00.000Z'
  }
];

class FitPulseDatabase {
  constructor(dbFilePath = DB_FILE) {
    this.dbFile = dbFilePath;
    this.data = {
      users: [],
      trainees: [],
      dailyReports: {},
      trainerships: [],
      connectionRequests: [],
      auditLogs: []
    };
    this.init();
  }

  isSpecialUser(userOrId) {
    if (!userOrId) return false;
    const val = typeof userOrId === 'string'
      ? userOrId.toLowerCase().trim()
      : (((userOrId.email || userOrId.id || userOrId.userId || '') + '')).toLowerCase().trim();
    const specialEmails = ['manager@fitpulse.com', 'coach.real@fitpulse.com', 'trainee.real@fitpulse.com'];
    const specialIds = ['usr_mgr', 'usr_coach_real', 'usr_trainee_real', 'coach_real', 'trainee_real'];
    return specialEmails.includes(val) || specialIds.includes(val);
  }

  init() {
    try {
      if (fs.existsSync(this.dbFile)) {
        const raw = fs.readFileSync(this.dbFile, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          trainees: Array.isArray(parsed.trainees) ? parsed.trainees : [],
          dailyReports: parsed.dailyReports && typeof parsed.dailyReports === 'object' ? parsed.dailyReports : {},
          trainerships: Array.isArray(parsed.trainerships) ? parsed.trainerships : [],
          connectionRequests: Array.isArray(parsed.connectionRequests) ? parsed.connectionRequests : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : []
        };
      }
    } catch (err) {
      console.warn('[Database] Read warning:', err.message);
    }

    // Ensure the 3 special users are always present and active
    this.ensureSpecialUsers();
  }

  ensureSpecialUsers() {
    if (!Array.isArray(this.data.users)) this.data.users = [];

    SPECIAL_USERS.forEach(special => {
      const idx = this.data.users.findIndex(u =>
        u.id === special.id ||
        (u.email && u.email.toLowerCase() === special.email.toLowerCase())
      );
      if (idx >= 0) {
        // Enforce active status and special protection
        this.data.users[idx] = {
          ...this.data.users[idx],
          name: special.name,
          fullName: special.fullName,
          role: special.role,
          isTrainer: special.isTrainer,
          status: 'active',
          approvalStatus: 'approved',
          isSpecial: true
        };
      } else {
        this.data.users.push({ ...special });
      }
    });

    // Ensure default trainee profile for the special trainee
    if (!Array.isArray(this.data.trainees)) this.data.trainees = [];
    const tIdx = this.data.trainees.findIndex(t => t.id === 'usr_trainee_real');
    const traineeRecord = {
      id: 'usr_trainee_real',
      traineeId: 'usr_trainee_real',
      uid: 'usr_trainee_real',
      name: 'מתאמן (חשבון אמת)',
      fullName: 'מתאמן (חשבון אמת)',
      email: 'trainee.real@fitpulse.com',
      role: 'trainee',
      avatar: 'מת',
      age: 25,
      gender: 'male',
      weight: 75,
      height: 178,
      targetCalories: 2200,
      targetProtein: 160,
      targetWaterMl: 3000,
      targetSleepHours: 8,
      assignedRoutine: 'Push-Pull-Legs 4D',
      activeRoutine: 'Push-Pull-Legs 4D',
      notes: 'חשבון מתאמן (חשבון אמת) מיוחד לבדיקות ופיתוח'
    };
    if (tIdx >= 0) {
      this.data.trainees[tIdx] = { ...this.data.trainees[tIdx], ...traineeRecord };
    } else {
      this.data.trainees.push(traineeRecord);
    }

    this.save();
  }

  save() {
    try {
      const file = this.dbFile || DB_FILE;
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const tmpFile = `${file}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tmpFile, file);
      return true;
    } catch (err) {
      console.error('[Database] Failed to write to disk:', err.message);
      return false;
    }
  }

  // --- Authentication Engine ---

  authenticate(identifier, password) {
    if (!identifier) return { error: 'נא להזין אימייל או שם משתמש' };
    const cleanId = String(identifier).trim().toLowerCase();

    // Check users
    const user = this.data.users.find(u =>
      (u.email && u.email.toLowerCase() === cleanId) ||
      (u.id && u.id.toLowerCase() === cleanId) ||
      (u.name && u.name.toLowerCase() === cleanId)
    );

    if (!user) {
      return { success: false, error: 'פרטי ההתחברות אינם נכונים. המשתמש אינו קיים במערכת.' };
    }

    // Access Status Guard: Block Denied Users
    if (user.status === 'rejected' || user.approvalStatus === 'rejected') {
      return {
        success: false,
        error: 'בקשת הגישה שלך נדחתה על ידי מנהל המערכת. לא ניתן להתחבר.',
        code: 'account-rejected',
        status: 'rejected',
        user: { id: user.id, email: user.email, status: 'rejected' }
      };
    }

    if (user.status === 'suspended' || user.status === 'disabled') {
      return {
        success: false,
        error: 'חשבונך הושעה על ידי מנהל המערכת. לא ניתן להתחבר.',
        code: 'account-suspended',
        status: 'suspended',
        user: { id: user.id, email: user.email, status: 'suspended' }
      };
    }

    if (user.status === 'pending_approval' || user.approvalStatus === 'pending') {
      return {
        success: false,
        error: 'חשבונך ממתין לאישור מנהל המערכת.',
        code: 'account-pending',
        isPending: true,
        status: 'pending_approval',
        user: {
          id: user.id,
          name: user.name || user.fullName,
          email: user.email,
          role: user.role,
          status: 'pending_approval',
          approvalStatus: 'pending'
        }
      };
    }

    this.logActivity('USER_LOGIN', `התחברות משתמש: ${user.name} (${user.email || user.id})`, { userId: user.id });
    return { success: true, user };
  }

  registerOrLoginGoogleUser(googleUser) {
    if (!googleUser || (!googleUser.email && !googleUser.uid)) {
      return { error: 'פרטי משתמש Google חסרים' };
    }

    const email = (googleUser.email || '').trim().toLowerCase();
    const uid = googleUser.uid || `g_${Date.now()}`;
    const displayName = (googleUser.displayName || email.split('@')[0] || 'משתמש Google').trim();

    // Look for existing user
    let user = this.data.users.find(u =>
      (u.email && u.email.toLowerCase() === email) ||
      (u.id && u.id === uid) ||
      (u.userId && u.userId === uid)
    );

    if (user) {
      // Access Guard: Block Denied Users
      if (user.status === 'rejected' || user.approvalStatus === 'rejected') {
        return {
          error: 'בקשת הגישה שלך נדחתה על ידי מנהל המערכת. לא ניתן להתחבר.',
          code: 'account-rejected',
          user: { id: user.id, email: user.email, status: 'rejected' }
        };
      }
      if (user.status === 'suspended' || user.status === 'disabled') {
        return {
          error: 'חשבונך הושעה על ידי מנהל המערכת. לא ניתן להתחבר.',
          code: 'account-suspended',
          user: { id: user.id, email: user.email, status: 'suspended' }
        };
      }
      if (user.status === 'pending_approval' || user.approvalStatus === 'pending') {
        return {
          success: true,
          isPending: true,
          user: {
            id: user.id,
            name: user.name || user.fullName,
            email: user.email,
            role: user.role,
            status: 'pending_approval',
            approvalStatus: 'pending'
          }
        };
      }
      this.logActivity('USER_LOGIN_GOOGLE', `כניסת משתמש Google קיים: ${email}`, { userId: user.id });
      return { success: true, user };
    }

    // New Google User -> Auto-create with pending_approval
    const newUser = {
      id: uid,
      userId: uid,
      name: displayName,
      fullName: displayName,
      email: email,
      photoURL: googleUser.photoURL || null,
      role: 'trainee',
      isTrainer: false,
      status: 'pending_approval',
      approvalStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    this.data.users.push(newUser);
    this.save();
    this.logActivity('USER_NEW_GOOGLE_REGISTER', `נרשם משתמש Google חדש וממתין לאישור מנהל: ${email} (${uid})`, { userId: uid });

    return {
      success: true,
      isNewUser: true,
      isPending: true,
      user: newUser
    };
  }

  // --- User Administration ---

  getUsers(filter = {}) {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.filter(u => {
      if (filter.role && filter.role !== 'all' && u.role !== filter.role) return false;
      if (filter.status && filter.status !== 'all' && u.status !== filter.status) return false;
      return true;
    });
  }

  getPendingApprovals() {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.filter(u => u.status === 'pending_approval' || u.approvalStatus === 'pending');
  }

  getUserByIdOrEmail(identifier) {
    if (!identifier) return null;
    const clean = String(identifier).trim().toLowerCase();
    return this.data.users.find(u =>
      (u.id && u.id.toLowerCase() === clean) ||
      (u.userId && u.userId.toLowerCase() === clean) ||
      (u.email && u.email.toLowerCase() === clean)
    ) || null;
  }

  registerUser(userData) {
    if (!userData) return null;
    const uid = userData.id || userData.userId || `usr_${Date.now()}`;
    const email = (userData.email || '').trim();
    const fullName = (userData.name || userData.fullName || email.split('@')[0] || 'משתמש חדש').trim();
    const isTrainer = userData.isTrainer === true || userData.role === 'coach';
    const role = isTrainer ? 'coach' : 'trainee';

    const existingIdx = this.data.users.findIndex(u =>
      (u.id && u.id === uid) ||
      (u.userId && u.userId === uid) ||
      (email && u.email && u.email.toLowerCase() === email.toLowerCase())
    );

    const doc = {
      id: uid,
      userId: uid,
      name: fullName,
      fullName: fullName,
      email: email,
      role: role,
      isTrainer: isTrainer,
      status: 'pending_approval',
      approvalStatus: 'pending',
      createdAt: new Date().toISOString()
    };

    if (existingIdx >= 0) {
      this.data.users[existingIdx] = { ...this.data.users[existingIdx], ...doc };
    } else {
      this.data.users.push(doc);
    }
    this.save();
    return doc;
  }

  approveUser(userId, managerId = 'system') {
    const user = this.getUserByIdOrEmail(userId);
    if (!user) {
      return { userId, status: 'active', approvalStatus: 'approved', _localNotFound: true };
    }
    user.status = 'active';
    user.approvalStatus = 'approved';
    user.approvedAt = new Date().toISOString();
    user.approvedBy = managerId;

    // Provision trainee profile if newly approved trainee
    if (user.role === 'trainee') {
      const tIdx = this.data.trainees.findIndex(t => t.id === user.id);
      if (tIdx < 0) {
        this.data.trainees.push({
          id: user.id,
          traineeId: user.id,
          name: user.name || user.fullName,
          email: user.email,
          avatar: (user.name || user.fullName || 'מ').slice(0, 2),
          age: 25,
          gender: 'other',
          weight: 70,
          height: 175,
          targetCalories: 2200,
          targetProtein: 160,
          targetWaterMl: 3000,
          targetSleepHours: 8,
          assignedRoutine: 'Push-Pull-Legs 4D',
          notes: 'חשבון מתאמן מאושר'
        });
      }
    }

    this.save();
    this.logActivity('USER_APPROVED', `אושר חשבון משתמש (${user.role}): ${user.name} (${user.email})`, { userId: user.id });
    return user;
  }

  rejectUser(userId, reason = 'לא אושר על ידי מנהל מערכת') {
    if (this.isSpecialUser(userId)) {
      throw new Error('משתמש זה הינו משתמש מיוחד לבדיקות ולא ניתן להשעותו או לדחותו.');
    }
    const user = this.getUserByIdOrEmail(userId);
    if (!user) {
      return { userId, status: 'rejected', approvalStatus: 'rejected', _localNotFound: true };
    }
    user.status = 'rejected';
    user.approvalStatus = 'rejected';
    user.rejectedReason = reason;
    this.save();
    this.logActivity('USER_REJECTED', `נדחה חשבון (${user.id}): ${reason}`);
    return user;
  }

  setUserStatus(userId, status, managerId = 'system') {
    if (this.isSpecialUser(userId) && (status === 'suspended' || status === 'rejected')) {
      throw new Error('משתמש זה הינו משתמש מיוחד לבדיקות ולא ניתן להשעותו או לדחותו.');
    }

    const user = this.getUserByIdOrEmail(userId);
    if (!user) {
      return { userId, status, _localNotFound: true };
    }

    user.status = status;
    if (status === 'pending_approval') {
      user.approvalStatus = 'pending';
      delete user.approvedAt;
      delete user.approvedBy;
    } else if (status === 'active') {
      user.approvalStatus = 'approved';
      user.approvedAt = new Date().toISOString();
      user.approvedBy = managerId;
    } else if (status === 'rejected') {
      user.approvalStatus = 'rejected';
    } else if (status === 'suspended') {
      user.approvalStatus = user.approvalStatus || 'pending';
    }

    this.save();
    this.logActivity('USER_STATUS_CHANGED', `עודכן סטטוס משתמש ${userId} ל-${status}`, { userId, status });
    return user;
  }

  setUserRole(userId, role, managerId = 'system') {
    const user = this.getUserByIdOrEmail(userId);
    if (!user) {
      return { userId, role, isTrainer: role === 'coach', _localNotFound: true };
    }
    user.role = role;
    user.isTrainer = role === 'coach';
    this.save();
    this.logActivity('USER_ROLE_CHANGED', `שונה תפקיד משתמש ${userId} ל-${role}`, { userId, role });
    return user;
  }

  deleteUser(userId) {
    if (this.isSpecialUser(userId)) {
      throw new Error('משתמש זה הינו משתמש מיוחד לבדיקות ולא ניתן למחוק אותו.');
    }

    const idx = this.data.users.findIndex(u =>
      (u.id && u.id === userId) ||
      (u.userId && u.userId === userId) ||
      (u.email && u.email.toLowerCase() === String(userId).toLowerCase())
    );

    if (idx < 0) {
      return { userId, _localNotFound: true };
    }

    if (this.isSpecialUser(this.data.users[idx])) {
      throw new Error('משתמש זה הינו משתמש מיוחד לבדיקות ולא ניתן למחוק אותו.');
    }

    const [removed] = this.data.users.splice(idx, 1);
    this.save();
    this.logActivity('USER_DELETED', `נמחק חשבון משתמש לצמיתות: ${removed.email || userId}`, { userId });
    return removed;
  }

  // --- Coach Visibility & Directory ---

  setCoachVisibility(userId, isPublicVisible) {
    const user = this.getUserByIdOrEmail(userId);
    if (!user) {
      throw new Error(`משתמש (${userId}) לא נמצא במסד הנתונים.`);
    }
    user.isPublicVisible = Boolean(isPublicVisible);
    this.save();
    this.logActivity(
      'COACH_VISIBILITY_UPDATED',
      `עודכנה חשיפה למתאמנים חדשים עבור ${user.name || user.email}: ${user.isPublicVisible ? 'פעיל' : 'כבוי'}`,
      { userId: user.id, isPublicVisible: user.isPublicVisible }
    );
    return user;
  }

  getCoachPublicDirectory() {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.filter(u =>
      (u.role === 'coach' || (u.isTrainer === true && u.role !== 'manager')) &&
      u.role !== 'manager' &&
      u.email !== 'manager@fitpulse.com' &&
      u.id !== 'usr_mgr' &&
      u.isPublicVisible === true &&
      (!u.status || u.status === 'active')
    ).map(u => ({
      id: u.id,
      userId: u.id,
      name: u.name || u.fullName || 'מאמן',
      displayName: u.name || u.fullName || 'מאמן',
      email: u.email,
      role: 'coach',
      isTrainer: true,
      isPublicVisible: true,
      avatar: u.avatar || u.profileImageUrl || null
    }));
  }

  // --- Trainerships & Connections ---

  requestCoachConnection(traineeId, coachId, traineeName = '') {
    const trainee = this.getUserByIdOrEmail(traineeId);
    const coach = this.getUserByIdOrEmail(coachId);

    if (!trainee) throw new Error('מתאמן לא נמצא.');
    if (!coach) throw new Error('מאמן לא נמצא.');
    if (coach.role === 'manager' || coach.id === 'usr_mgr') {
      throw new Error('לא ניתן לבחור את מנהל המערכת כמאמן.');
    }
    if (!coach.isPublicVisible) {
      throw new Error('המאמן אינו זמין כעת לקבלת מתאמנים חדשים.');
    }

    if (!Array.isArray(this.data.connectionRequests)) this.data.connectionRequests = [];

    // Cancel any previous pending request from this trainee
    this.data.connectionRequests.forEach(r => {
      if (r.traineeId === trainee.id && r.status === 'pending') {
        r.status = 'cancelled';
      }
    });

    const request = {
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      traineeId: trainee.id,
      traineeName: traineeName || trainee.name || trainee.fullName || 'מתאמן',
      traineeEmail: trainee.email || '',
      coachId: coach.id,
      coachName: coach.name || coach.fullName || 'מאמן',
      coachEmail: coach.email || '',
      status: 'pending',
      initiatedBy: 'trainee',
      createdAt: new Date().toISOString()
    };

    this.data.connectionRequests.push(request);
    this.save();

    this.logActivity(
      'COACH_CONNECTION_REQUESTED',
      `בקשת חיבור חדשה ממתאמן: ${request.traineeName} אל המאמן: ${request.coachName}`,
      { requestId: request.id, traineeId: trainee.id, coachId: coach.id }
    );

    return request;
  }

  respondCoachConnection(requestId, accept, coachName = '') {
    if (!Array.isArray(this.data.connectionRequests)) this.data.connectionRequests = [];
    if (!Array.isArray(this.data.trainerships)) this.data.trainerships = [];

    const req = this.data.connectionRequests.find(r => r.id === requestId);
    if (!req) throw new Error('בקשת החיבור לא נמצאה.');

    req.status = accept ? 'accepted' : 'rejected';
    req.respondedAt = new Date().toISOString();

    if (accept) {
      const relId = `${req.coachId}_${req.traineeId}`;
      const existingIdx = this.data.trainerships.findIndex(t => t.id === relId || (t.coachId === req.coachId && t.traineeId === req.traineeId));
      const trainershipDoc = {
        id: relId,
        relationId: relId,
        trainerId: req.coachId,
        coachId: req.coachId,
        coachName: req.coachName,
        traineeId: req.traineeId,
        traineeName: req.traineeName,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        this.data.trainerships[existingIdx] = trainershipDoc;
      } else {
        this.data.trainerships.push(trainershipDoc);
      }

      const traineeUser = this.getUserByIdOrEmail(req.traineeId);
      if (traineeUser) {
        traineeUser.coachId = req.coachId;
        traineeUser.coachName = req.coachName;
      }

      this.logActivity(
        'COACH_CONNECTION_ACCEPTED',
        `המאמן ${req.coachName} אישר את בקשת החיבור של המתאמן ${req.traineeName}`,
        { requestId: req.id, coachId: req.coachId, traineeId: req.traineeId }
      );
    } else {
      this.logActivity(
        'COACH_CONNECTION_REJECTED',
        `המאמן ${req.coachName} דחה את בקשת החיבור של המתאמן ${req.traineeName}`,
        { requestId: req.id, coachId: req.coachId, traineeId: req.traineeId }
      );
    }

    this.save();
    return req;
  }

  cancelCoachConnectionRequest(traineeId) {
    if (!Array.isArray(this.data.connectionRequests)) this.data.connectionRequests = [];
    const cleanTrainee = String(traineeId).toLowerCase();
    const req = this.data.connectionRequests.find(r =>
      r.traineeId && r.traineeId.toLowerCase() === cleanTrainee && r.status === 'pending'
    );
    if (req) {
      req.status = 'cancelled';
      this.save();
      this.logActivity('COACH_CONNECTION_CANCELLED', `ביטול בקשת חיבור למאמן ${req.coachName} ע"י ${req.traineeName}`, { requestId: req.id });
      return true;
    }
    return false;
  }

  terminateTrainership(traineeId, coachId, initiatedBy = 'user') {
    if (!Array.isArray(this.data.trainerships)) this.data.trainerships = [];

    const cleanTrainee = String(traineeId).toLowerCase();
    const cleanCoach = coachId ? String(coachId).toLowerCase() : null;

    let terminatedRel = null;

    this.data.trainerships.forEach(t => {
      const matchTrainee = (t.traineeId && t.traineeId.toLowerCase() === cleanTrainee);
      const matchCoach = !cleanCoach || (t.coachId && t.coachId.toLowerCase() === cleanCoach) || (t.trainerId && t.trainerId.toLowerCase() === cleanCoach);
      if (matchTrainee && matchCoach && t.status === 'active') {
        t.status = 'terminated';
        t.terminatedAt = new Date().toISOString();
        t.terminatedBy = initiatedBy;
        terminatedRel = t;
      }
    });

    const traineeUser = this.getUserByIdOrEmail(traineeId);
    if (traineeUser) {
      delete traineeUser.coachId;
      delete traineeUser.coachName;
    }

    if (Array.isArray(this.data.connectionRequests)) {
      this.data.connectionRequests.forEach(r => {
        if (r.traineeId && r.traineeId.toLowerCase() === cleanTrainee && r.status === 'pending') {
          r.status = 'cancelled';
        }
      });
    }

    const tName = traineeUser?.name || traineeId;
    const cName = terminatedRel?.coachName || coachId || 'המאמן';

    this.logActivity(
      'TRAINERSHIP_TERMINATED',
      `סיום קשר אימון בין המתאמן ${tName} לבין המאמן ${cName} (ביוזמת ${initiatedBy === 'coach' ? 'המאמן' : 'המתאמן'})`,
      { traineeId, coachId, initiatedBy }
    );

    this.save();
    return { success: true, terminatedRel };
  }

  getTrainershipStatus(traineeId) {
    if (!Array.isArray(this.data.trainerships)) this.data.trainerships = [];
    if (!Array.isArray(this.data.connectionRequests)) this.data.connectionRequests = [];

    const cleanTrainee = String(traineeId).toLowerCase();
    const activeRel = this.data.trainerships.find(t =>
      t.traineeId && t.traineeId.toLowerCase() === cleanTrainee && t.status === 'active'
    );

    if (activeRel) {
      const coach = this.getUserByIdOrEmail(activeRel.coachId || activeRel.trainerId);
      return {
        hasCoach: true,
        status: 'active',
        coach: {
          id: activeRel.coachId || activeRel.trainerId,
          name: coach?.name || activeRel.coachName || 'מאמן',
          email: coach?.email || '',
          avatar: coach?.avatar || coach?.profileImageUrl || null
        }
      };
    }

    const pendingReq = this.data.connectionRequests.find(r =>
      r.traineeId && r.traineeId.toLowerCase() === cleanTrainee && r.status === 'pending'
    );

    if (pendingReq) {
      return {
        hasCoach: false,
        status: 'pending',
        pendingRequest: pendingReq
      };
    }

    return {
      hasCoach: false,
      status: 'none'
    };
  }

  getCoachTrainees(coachId) {
    if (!Array.isArray(this.data.trainerships)) this.data.trainerships = [];
    if (!Array.isArray(this.data.connectionRequests)) this.data.connectionRequests = [];

    const cleanCoach = String(coachId).toLowerCase();
    const activeRels = this.data.trainerships.filter(t =>
      ((t.coachId && t.coachId.toLowerCase() === cleanCoach) || (t.trainerId && t.trainerId.toLowerCase() === cleanCoach)) &&
      t.status === 'active'
    );

    const activeTrainees = activeRels.map(t => {
      const u = this.getUserByIdOrEmail(t.traineeId);
      return {
        id: t.traineeId,
        traineeId: t.traineeId,
        name: u?.name || t.traineeName || 'מתאמן',
        email: u?.email || '',
        avatar: u?.avatar || u?.profileImageUrl || null,
        connectedSince: t.createdAt
      };
    });

    const pendingRequests = this.data.connectionRequests.filter(r =>
      r.coachId && r.coachId.toLowerCase() === cleanCoach && r.status === 'pending'
    );

    return {
      activeTrainees,
      pendingRequests
    };
  }

  // --- Trainees and Reports ---

  getTrainees() {
    return Array.isArray(this.data.trainees) ? this.data.trainees : [];
  }

  getTrainee(traineeId) {
    return this.getTrainees().find(t => t.id === traineeId) || null;
  }

  createTrainee(traineeData) {
    const id = traineeData.id || `client_${Date.now()}`;
    const newTrainee = {
      id,
      name: traineeData.name || 'מתאמן חדש',
      email: traineeData.email || '',
      avatar: (traineeData.name || 'מת').slice(0, 2),
      age: Number(traineeData.age) || 25,
      gender: traineeData.gender || 'other',
      weight: Number(traineeData.weight) || 70,
      height: Number(traineeData.height) || 175,
      targetCalories: Number(traineeData.targetCalories) || 2200,
      targetProtein: Number(traineeData.targetProtein) || 160,
      targetWaterMl: Number(traineeData.targetWaterMl) || 3000,
      targetSleepHours: Number(traineeData.targetSleepHours) || 8,
      assignedRoutine: traineeData.assignedRoutine || 'Push-Pull-Legs 4D',
      notes: traineeData.notes || ''
    };
    this.data.trainees.push(newTrainee);
    this.save();
    return newTrainee;
  }

  getReports(traineeId, options = {}) {
    const reports = Object.values(this.data.dailyReports || {})
      .filter(r => r.traineeId === traineeId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    if (options.days) {
      return reports.slice(0, options.days);
    }
    return reports;
  }

  getReport(traineeId, date) {
    const key = `${traineeId}_${date}`;
    return this.data.dailyReports[key] || null;
  }

  saveReport(reportData) {
    if (!reportData.traineeId || !reportData.date) return null;
    const key = `${reportData.traineeId}_${reportData.date}`;
    const existing = this.data.dailyReports[key] || {};
    const updated = {
      ...existing,
      ...reportData,
      status: reportData.status || existing.status || 'draft',
      updatedAt: new Date().toISOString()
    };
    this.data.dailyReports[key] = updated;
    this.save();
    return updated;
  }

  finalizeReport(traineeId, date) {
    const key = `${traineeId}_${date}`;
    const existing = this.data.dailyReports[key] || { traineeId, date };
    existing.status = 'final';
    existing.finalizedAt = new Date().toISOString();
    this.data.dailyReports[key] = existing;
    this.save();
    return existing;
  }

  addCoachFeedback(traineeId, date, feedbackData) {
    const key = `${traineeId}_${date}`;
    const report = this.data.dailyReports[key] || { traineeId, date, status: 'final' };
    report.coachFeedback = {
      notes: feedbackData.notes || '',
      rating: feedbackData.rating || 5,
      timestamp: new Date().toISOString()
    };
    this.data.dailyReports[key] = report;
    this.save();
    return report;
  }

  autoClosePastReports() {
    const today = new Date().toISOString().substring(0, 10);
    let changed = false;
    Object.values(this.data.dailyReports || {}).forEach(r => {
      if (r.date && r.date < today && r.status === 'draft') {
        r.status = 'final';
        r.autoClosed = true;
        r.finalizedAt = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) this.save();
  }

  logActivity(type, description, meta = {}) {
    const log = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      description,
      meta,
      timestamp: new Date().toISOString()
    };
    if (!Array.isArray(this.data.auditLogs)) this.data.auditLogs = [];
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 200);
    }
    this.save();
    return log;
  }

  getAuditLogs(limit = 30) {
    return (this.data.auditLogs || []).slice(0, limit);
  }
}

const dbInstance = new FitPulseDatabase();
dbInstance.FitPulseDatabase = FitPulseDatabase;
module.exports = dbInstance;
