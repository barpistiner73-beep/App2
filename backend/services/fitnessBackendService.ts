/**
 * Fitness Coaching Backend Service - Firestore Operations & Domain Logic
 * Handles:
 *  - Unified User profiles & Role transitions
 *  - Deterministic Trainership relationship management & granular permissions
 *  - Automated Self-Training initialization (trainerId == traineeId)
 *  - Sub-collection Daily Logs
 *  - Atomic Workout Templates & Nested Exercises
 *  - Workout Logs with execution RPE & notes
 *  - Nutrition Goals with single-active-goal transactional enforcement
 */

import {
  Firestore,
  FieldValue,
  Timestamp,
  Transaction,
  WriteBatch
} from 'firebase-admin/firestore';

import {
  UserProfile,
  CreateUserInput,
  UpdateUserInput,
  Trainership,
  TrainershipStatus,
  TrainershipPermissions,
  CreateTrainershipInput,
  UpdateTrainershipPermissionsInput,
  DailyLog,
  CreateDailyLogInput,
  UpdateDailyLogInput,
  WorkoutTemplate,
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
  WorkoutExercise,
  CreateWorkoutExerciseInput,
  WorkoutLog,
  CreateWorkoutLogInput,
  NutritionGoal,
  CreateNutritionGoalInput,
  UpdateNutritionGoalInput,
  FULL_PERMISSIONS,
  DEFAULT_TRAINEE_PERMISSIONS,
  AppRole,
  AccountStatus,
  normalizeRole,
  roleImpliesTrainer
} from '../types/schema';
import { COLLECTIONS, SUBCOLLECTIONS } from '../collections';

export class FitnessBackendService {
  constructor(private db: Firestore) {}

  // =========================================================================
  // Helper: Deterministic Relation ID
  // =========================================================================
  /**
   * Generates a predictable, unique relationship document ID.
   * This is critical for O(1) Firestore Security Rules exists() / get() evaluations.
   */
  public static getRelationId(trainerId: string, traineeId: string): string {
    return `${trainerId}_${traineeId}`;
  }

  // =========================================================================
  // 1. Users & Self-Training Initialization
  // =========================================================================

  /**
   * Creates or updates a user profile.
   * Automatically initializes self-training if the user is a trainer.
   */
  async registerUser(input: CreateUserInput): Promise<UserProfile> {
    const userRef = this.db.collection(COLLECTIONS.users).doc(input.userId);
    const now = Timestamp.now();
    const role = normalizeRole(input.role, input.isTrainer);
    const isTrainer = roleImpliesTrainer(role);
    const status: AccountStatus = input.status || 'pending_approval';

    const userProfile: UserProfile = {
      userId: input.userId,
      fullName: input.fullName.trim(),
      email: input.email.toLowerCase().trim(),
      role,
      isTrainer,
      status,
      approvalStatus: input.approvalStatus || (status === 'active' ? 'approved' : 'pending'),
      profileImageUrl: input.profileImageUrl || '',
      createdAt: input.createdAt || now,
    };

    await userRef.set(userProfile, { merge: true });

    if (userProfile.isTrainer) {
      await this.initializeSelfTraining(userProfile.userId);
    }

    return userProfile;
  }

  /**
   * Sets the stored role. Coach/manager also flip isTrainer and self-training.
   */
  async setUserRole(userId: string, roleOrTrainer: AppRole | boolean): Promise<void> {
    const role = typeof roleOrTrainer === 'boolean'
      ? normalizeRole(undefined, roleOrTrainer)
      : normalizeRole(roleOrTrainer);
    const isTrainer = roleImpliesTrainer(role);
    const userRef = this.db.collection(COLLECTIONS.users).doc(userId);
    await userRef.update({ role, isTrainer });

    if (isTrainer) {
      await this.initializeSelfTraining(userId);
    }
  }

  /**
   * Initializes or repairs self-training for a trainer.
   * Document ID: `${trainerId}_${trainerId}`
   * Rules: trainerId == traineeId, status == 'active', all permissions == true.
   */
  async initializeSelfTraining(trainerId: string): Promise<Trainership> {
    const relationId = FitnessBackendService.getRelationId(trainerId, trainerId);
    const relationRef = this.db.collection(COLLECTIONS.trainerships).doc(relationId);

    const doc = await relationRef.get();
    if (doc.exists) {
      return doc.data() as Trainership;
    }

    const selfTrainership: Trainership = {
      relationId,
      trainerId,
      traineeId: trainerId,
      status: 'active',
      permissions: { ...FULL_PERMISSIONS },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await relationRef.set(selfTrainership);
    return selfTrainership;
  }

  async getUser(userId: string): Promise<UserProfile | null> {
    const doc = await this.db.collection(COLLECTIONS.users).doc(userId).get();
    return doc.exists ? (doc.data() as UserProfile) : null;
  }

  // =========================================================================
  // 2. Trainerships & Permissions Logic
  // =========================================================================

  /**
   * Initiates a connection between a Trainer and a Trainee.
   */
  async requestTrainership(
    trainerId: string,
    traineeId: string,
    customPermissions?: Partial<TrainershipPermissions>
  ): Promise<Trainership> {
    if (trainerId === traineeId) {
      return this.initializeSelfTraining(trainerId);
    }

    const relationId = FitnessBackendService.getRelationId(trainerId, traineeId);
    const relationRef = this.db.collection(COLLECTIONS.trainerships).doc(relationId);

    const existing = await relationRef.get();
    if (existing.exists) {
      const data = existing.data() as Trainership;
      if (data.status === 'active') {
        throw new Error('An active trainership relationship already exists.');
      }
      if (data.status === 'pending') {
        return data;
      }
    }

    const permissions: TrainershipPermissions = {
      ...DEFAULT_TRAINEE_PERMISSIONS,
      ...(customPermissions || {})
    };

    const trainership: Trainership = {
      relationId,
      trainerId,
      traineeId,
      status: 'pending',
      permissions,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await relationRef.set(trainership, { merge: true });
    return trainership;
  }

  /**
   * Responds to a pending trainership invite (accept or reject).
   */
  async respondToTrainership(
    traineeId: string,
    trainerId: string,
    status: 'active' | 'rejected'
  ): Promise<void> {
    const relationId = FitnessBackendService.getRelationId(trainerId, traineeId);
    const relationRef = this.db.collection(COLLECTIONS.trainerships).doc(relationId);

    const doc = await relationRef.get();
    if (!doc.exists) {
      throw new Error(`Trainership request ${relationId} not found.`);
    }

    const data = doc.data() as Trainership;
    if (data.traineeId !== traineeId || data.trainerId !== trainerId) {
      throw new Error('Unauthorized: Trainership parties do not match this request.');
    }

    await relationRef.update({
      status,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Updates granular sharing permissions for an active trainership.
   * Only the trainee (the data owner) or self-trainer can modify these flags.
   */
  async updateTrainershipPermissions(
    traineeId: string,
    trainerId: string,
    permissions: UpdateTrainershipPermissionsInput
  ): Promise<void> {
    const relationId = FitnessBackendService.getRelationId(trainerId, traineeId);
    const relationRef = this.db.collection(COLLECTIONS.trainerships).doc(relationId);

    const doc = await relationRef.get();
    if (!doc.exists) {
      throw new Error(`Trainership ${relationId} not found.`);
    }

    const current = doc.data() as Trainership;
    if (current.traineeId !== traineeId) {
      throw new Error('Unauthorized: Only the trainee can update their data sharing permissions.');
    }

    // Self-training permissions cannot be disabled
    if (trainerId === traineeId) {
      await relationRef.update({
        permissions: { ...FULL_PERMISSIONS },
        updatedAt: Timestamp.now()
      });
      return;
    }

    const updatedPermissions: TrainershipPermissions = {
      ...current.permissions,
      ...permissions
    };

    await relationRef.update({
      permissions: updatedPermissions,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Terminates a trainership. Can be initiated by either the trainer or trainee.
   */
  async terminateTrainership(
    requesterId: string,
    trainerId: string,
    traineeId: string
  ): Promise<void> {
    if (trainerId === traineeId) {
      throw new Error('Self-training relation cannot be terminated.');
    }

    if (requesterId !== trainerId && requesterId !== traineeId) {
      throw new Error('Unauthorized: Only the trainer or trainee can terminate this relation.');
    }

    const relationId = FitnessBackendService.getRelationId(trainerId, traineeId);
    const relationRef = this.db.collection(COLLECTIONS.trainerships).doc(relationId);

    await relationRef.update({
      status: 'terminated',
      updatedAt: Timestamp.now()
    });
  }

  /**
   * Verifies if a trainer has active permission to access a specific trainee resource.
   */
  async checkPermission(
    trainerId: string,
    traineeId: string,
    permissionKey: keyof TrainershipPermissions
  ): Promise<boolean> {
    if (trainerId === traineeId) {
      return true; // Self-coaching has full access
    }

    const relationId = FitnessBackendService.getRelationId(trainerId, traineeId);
    const doc = await this.db.collection(COLLECTIONS.trainerships).doc(relationId).get();

    if (!doc.exists) return false;
    const data = doc.data() as Trainership;

    return data.status === 'active' && Boolean(data.permissions?.[permissionKey]);
  }

  /**
   * Query all active trainees for a trainer.
   */
  async getActiveTraineesForTrainer(trainerId: string): Promise<Trainership[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.trainerships)
      .where('trainerId', '==', trainerId)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(d => d.data() as Trainership);
  }

  /**
   * Query all active trainers for a trainee.
   */
  async getActiveTrainersForTrainee(traineeId: string): Promise<Trainership[]> {
    const snapshot = await this.db
      .collection(COLLECTIONS.trainerships)
      .where('traineeId', '==', traineeId)
      .where('status', '==', 'active')
      .get();

    return snapshot.docs.map(d => d.data() as Trainership);
  }

  // =========================================================================
  // 3. Daily Logs (Sub-collection)
  // Path: users/{userId}/dailyLogs/{logId}
  // =========================================================================

  /**
   * Creates or updates a daily log for a trainee.
   * Uses ISO date (YYYY-MM-DD) as document ID to guarantee 1 log per day.
   */
  async saveDailyLog(input: CreateDailyLogInput): Promise<DailyLog> {
    const logId = input.logId || input.logDate;
    const logRef = this.db
      .collection(COLLECTIONS.users)
      .doc(input.userId)
      .collection(SUBCOLLECTIONS.dailyLogs)
      .doc(logId);

    const logData: DailyLog = {
      logId,
      userId: input.userId,
      logDate: input.logDate,
      status: input.status || 'draft',
      sleepHours: Number(input.sleepHours) || 0,
      waterIntakeMl: Number(input.waterIntakeMl) || 0,
      dailyNotes: input.dailyNotes || '',
      checkIn: input.checkIn,
      nutritionTotals: input.nutritionTotals,
      workoutLogIds: input.workoutLogIds,
      updatedAt: Timestamp.now()
    };

    await logRef.set(logData, { merge: true });
    return logData;
  }

  /**
   * Retrieves daily logs for a user.
   * If requested by a trainer, performs permission check on canViewDailyLogs.
   */
  async getDailyLogs(
    userId: string,
    requesterId: string,
    limitCount: number = 30
  ): Promise<DailyLog[]> {
    if (requesterId !== userId) {
      const allowed = await this.checkPermission(requesterId, userId, 'canViewDailyLogs');
      if (!allowed) {
        throw new Error('Permission denied: You do not have permission to view this trainee\'s daily logs.');
      }
    }

    const snapshot = await this.db
      .collection(COLLECTIONS.users)
      .doc(userId)
      .collection(SUBCOLLECTIONS.dailyLogs)
      .orderBy('logDate', 'desc')
      .limit(limitCount)
      .get();

    return snapshot.docs.map(doc => doc.data() as DailyLog);
  }

  // =========================================================================
  // 4 & 5. Workout Templates & Nested Workout Exercises
  // Path: workoutTemplates/{templateId}
  // Sub-path: workoutTemplates/{templateId}/exercises/{exerciseId}
  // =========================================================================

  /**
   * Atomically creates a workout template and its sub-collection exercises in a batch write.
   */
  async createWorkoutTemplateWithExercises(
    templateInput: CreateWorkoutTemplateInput,
    exercisesInput: Omit<CreateWorkoutExerciseInput, 'templateId'>[]
  ): Promise<{ templateId: string }> {
    // If trainer creates for another trainee, verify active trainership and workout permission
    if (templateInput.creatorId !== templateInput.assignedToId) {
      const allowed = await this.checkPermission(
        templateInput.creatorId,
        templateInput.assignedToId,
        'canViewWorkouts'
      );
      if (!allowed) {
        throw new Error('Permission denied: You cannot assign workout templates to this trainee.');
      }
    }

    const batch = this.db.batch();
    const templateRef = this.db.collection(COLLECTIONS.workoutTemplates).doc();
    const templateId = templateRef.id;

    const templateData: WorkoutTemplate = {
      templateId,
      creatorId: templateInput.creatorId,
      assignedToId: templateInput.assignedToId,
      title: templateInput.title.trim(),
      description: templateInput.description || '',
      kind: templateInput.kind || 'session',
      category: templateInput.category,
      scheduledDay: templateInput.scheduledDay,
      restSeconds: Number(templateInput.restSeconds) || 90,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    batch.set(templateRef, templateData);

    const exercisesCollection = templateRef.collection(SUBCOLLECTIONS.templateExercises);
    exercisesInput.forEach((ex, idx) => {
      const exerciseRef = exercisesCollection.doc();
      const exerciseData: WorkoutExercise = {
        exerciseId: exerciseRef.id,
        templateId,
        exerciseName: ex.exerciseName.trim(),
        primaryMuscleGroup: ex.primaryMuscleGroup,
        primaryMuscleSubgroup: ex.primaryMuscleSubgroup,
        preferredExerciseId: ex.preferredExerciseId,
        targetSets: Number(ex.targetSets) || 3,
        targetReps: String(ex.targetReps || '10'),
        targetWeight: ex.targetWeight !== undefined ? Number(ex.targetWeight) : undefined,
        notes: ex.notes || '',
        orderIndex: ex.orderIndex !== undefined ? ex.orderIndex : idx
      };
      batch.set(exerciseRef, exerciseData);
    });

    await batch.commit();
    return { templateId };
  }

  /**
   * Retrieves all templates assigned to a user, with permission guard.
   */
  async getAssignedWorkoutTemplates(
    traineeId: string,
    requesterId: string
  ): Promise<WorkoutTemplate[]> {
    if (requesterId !== traineeId) {
      const allowed = await this.checkPermission(requesterId, traineeId, 'canViewWorkouts');
      if (!allowed) {
        throw new Error('Permission denied to view workouts for this trainee.');
      }
    }

    const snapshot = await this.db
      .collection(COLLECTIONS.workoutTemplates)
      .where('assignedToId', '==', traineeId)
      .get();

    return snapshot.docs.map(doc => doc.data() as WorkoutTemplate);
  }

  /**
   * Retrieves a template along with its sub-collection exercises.
   */
  async getWorkoutTemplateDetails(
    templateId: string,
    requesterId: string
  ): Promise<{ template: WorkoutTemplate; exercises: WorkoutExercise[] }> {
    const templateRef = this.db.collection(COLLECTIONS.workoutTemplates).doc(templateId);
    const templateDoc = await templateRef.get();

    if (!templateDoc.exists) {
      throw new Error(`Workout template ${templateId} not found.`);
    }

    const template = templateDoc.data() as WorkoutTemplate;

    // Check read permission
    if (requesterId !== template.creatorId && requesterId !== template.assignedToId) {
      const allowed = await this.checkPermission(requesterId, template.assignedToId, 'canViewWorkouts');
      if (!allowed) {
        throw new Error('Permission denied to access this workout template.');
      }
    }

    const exercisesSnapshot = await templateRef
      .collection(SUBCOLLECTIONS.templateExercises)
      .orderBy('orderIndex', 'asc')
      .get();

    const exercises = exercisesSnapshot.docs.map(doc => doc.data() as WorkoutExercise);

    return { template, exercises };
  }

  // =========================================================================
  // 6. Workout Logs
  // Path: workoutLogs/{workoutLogId}
  // =========================================================================

  /**
   * Trainee logs completed workout execution.
   */
  async logWorkoutExecution(input: CreateWorkoutLogInput): Promise<WorkoutLog> {
    const logRef = this.db.collection(COLLECTIONS.workoutLogs).doc();
    const completedAt = input.completedAt || Timestamp.now();
    const logDate = input.logDate || completedAt.toDate().toISOString().slice(0, 10);
    const workoutLog: WorkoutLog = {
      workoutLogId: logRef.id,
      userId: input.userId,
      templateId: input.templateId,
      logDate,
      completedAt,
      healthFeelingScore: Math.min(10, Math.max(1, Number(input.healthFeelingScore) || 5)),
      perceivedExertionRpe: Math.min(10, Math.max(1, Number(input.perceivedExertionRpe) || 5)),
      completionNotes: input.completionNotes || '',
      durationMinutes: input.durationMinutes,
      totalVolume: input.totalVolume,
      sets: input.sets,
    };

    await logRef.set(workoutLog);
    return workoutLog;
  }

  /**
   * Retrieves workout logs for a user with permission verification.
   */
  async getWorkoutLogs(
    userId: string,
    requesterId: string,
    limitCount: number = 20
  ): Promise<WorkoutLog[]> {
    if (requesterId !== userId) {
      const allowed = await this.checkPermission(requesterId, userId, 'canViewWorkouts');
      if (!allowed) {
        throw new Error('Permission denied to view workout logs.');
      }
    }

    const snapshot = await this.db
      .collection(COLLECTIONS.workoutLogs)
      .where('userId', '==', userId)
      .orderBy('completedAt', 'desc')
      .limit(limitCount)
      .get();

    return snapshot.docs.map(doc => doc.data() as WorkoutLog);
  }

  // =========================================================================
  // 7. Nutrition Goals
  // Path: nutritionGoals/{goalId}
  // =========================================================================

  /**
   * Sets or updates nutrition targets for a trainee.
   * Atomically deactivates existing active goals using a Firestore transaction.
   */
  async setActiveNutritionGoal(
    traineeId: string,
    requesterId: string,
    targets: {
      targetCalories: number;
      targetProteinGrams: number;
      targetCarbsGrams: number;
      targetFatsGrams: number;
    }
  ): Promise<NutritionGoal> {
    if (requesterId !== traineeId) {
      const allowed = await this.checkPermission(requesterId, traineeId, 'canViewNutrition');
      if (!allowed) {
        throw new Error('Permission denied: You cannot set nutrition targets for this trainee.');
      }
    }

    return await this.db.runTransaction(async (transaction: Transaction) => {
      // Find current active goals for this trainee
      const activeGoalsQuery = this.db
        .collection(COLLECTIONS.nutritionGoals)
        .where('traineeId', '==', traineeId)
        .where('isActive', '==', true);

      const activeSnapshot = await transaction.get(activeGoalsQuery);

      // Deactivate them
      activeSnapshot.docs.forEach(doc => {
        transaction.update(doc.ref, { isActive: false });
      });

      // Create new active goal
      const newGoalRef = this.db.collection(COLLECTIONS.nutritionGoals).doc();
      const newGoal: NutritionGoal = {
        goalId: newGoalRef.id,
        traineeId,
        trainerId: requesterId !== traineeId ? requesterId : undefined,
        targetCalories: Number(targets.targetCalories),
        targetProteinGrams: Number(targets.targetProteinGrams),
        targetCarbsGrams: Number(targets.targetCarbsGrams),
        targetFatsGrams: Number(targets.targetFatsGrams),
        startDate: Timestamp.now(),
        isActive: true,
      };

      transaction.set(newGoalRef, newGoal);
      return newGoal;
    });
  }

  /**
   * Retrieves the current active nutrition goal for a trainee.
   */
  async getActiveNutritionGoal(
    traineeId: string,
    requesterId: string
  ): Promise<NutritionGoal | null> {
    if (requesterId !== traineeId) {
      const allowed = await this.checkPermission(requesterId, traineeId, 'canViewNutrition');
      if (!allowed) {
        throw new Error('Permission denied to view nutrition targets.');
      }
    }

    const snapshot = await this.db
      .collection(COLLECTIONS.nutritionGoals)
      .where('traineeId', '==', traineeId)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as NutritionGoal;
  }
}
