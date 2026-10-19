// Fitness Coaching Service - Flutter & Cloud Firestore
// Integrates client-side Firestore operations, Streams, and Self-Training logic

import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/fitness_models.dart';

class FitnessFirestoreService {
  final FirebaseFirestore _firestore;

  FitnessFirestoreService({FirebaseFirestore? firestore})
      : _firestore = firestore ?? FirebaseFirestore.instance;

  // =========================================================================
  // 1. User Management & Self-Training Initialization
  // =========================================================================

  /// Stream user profile for real-time state changes
  Stream<UserModel?> streamUserProfile(String userId) {
    return _firestore
        .collection('users')
        .doc(userId)
        .snapshots()
        .map((snapshot) => snapshot.exists ? UserModel.fromFirestore(snapshot) : null);
  }

  /// Registers or updates a user. If isTrainer is true, auto-provisions self-training.
  Future<void> saveUserProfile(UserModel user) async {
    final userRef = _firestore.collection('users').doc(user.userId);
    await userRef.set(user.toMap(), SetOptions(merge: true));

    if (user.isTrainer) {
      await initializeSelfTraining(user.userId);
    }
  }

  /// Automatically provisions the self-training record:
  /// trainerId == traineeId, status == 'active', all permissions == true.
  Future<void> initializeSelfTraining(String trainerId) async {
    final relationId = TrainershipModel.generateRelationId(trainerId, trainerId);
    final relationRef = _firestore.collection('trainerships').doc(relationId);

    final snapshot = await relationRef.get();
    if (!snapshot.exists) {
      final selfTrainership = TrainershipModel(
        relationId: relationId,
        trainerId: trainerId,
        traineeId: trainerId,
        status: TrainershipStatus.active,
        permissions: const TrainershipPermissions(
          canViewSleep: true,
          canViewNutrition: true,
          canViewWorkouts: true,
          canViewDailyLogs: true,
        ),
        createdAt: DateTime.now(),
      );

      await relationRef.set(selfTrainership.toMap());
    }
  }

  // =========================================================================
  // 2. Trainerships & Permissions
  // =========================================================================

  /// Stream of active trainees for a trainer
  Stream<List<TrainershipModel>> streamActiveTrainees(String trainerId) {
    return _firestore
        .collection('trainerships')
        .where('trainerId', '==', trainerId)
        .where('status', '==', TrainershipStatus.active.name)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => TrainershipModel.fromFirestore(doc)).toList());
  }

  /// Stream of active trainers for a trainee
  Stream<List<TrainershipModel>> streamActiveTrainers(String traineeId) {
    return _firestore
        .collection('trainerships')
        .where('traineeId', '==', traineeId)
        .where('status', '==', TrainershipStatus.active.name)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => TrainershipModel.fromFirestore(doc)).toList());
  }

  /// Send an invite from Trainer to Trainee
  Future<void> requestTrainership({
    required String trainerId,
    required String traineeId,
    TrainershipPermissions permissions = const TrainershipPermissions(),
  }) async {
    if (trainerId == traineeId) {
      await initializeSelfTraining(trainerId);
      return;
    }

    final relationId = TrainershipModel.generateRelationId(trainerId, traineeId);
    final relationRef = _firestore.collection('trainerships').doc(relationId);

    final trainership = TrainershipModel(
      relationId: relationId,
      trainerId: trainerId,
      traineeId: traineeId,
      status: TrainershipStatus.pending,
      permissions: permissions,
      createdAt: DateTime.now(),
    );

    await relationRef.set(trainership.toMap(), SetOptions(merge: true));
  }

  /// Trainee accepts or rejects an invite
  Future<void> respondToTrainership({
    required String trainerId,
    required String traineeId,
    required bool accept,
  }) async {
    final relationId = TrainershipModel.generateRelationId(trainerId, traineeId);
    final relationRef = _firestore.collection('trainerships').doc(relationId);

    await relationRef.update({
      'status': accept ? TrainershipStatus.active.name : TrainershipStatus.rejected.name,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Trainee updates data sharing permissions
  Future<void> updatePermissions({
    required String trainerId,
    required String traineeId,
    required TrainershipPermissions permissions,
  }) async {
    // If self-training, permissions remain strictly true
    if (trainerId == traineeId) return;

    final relationId = TrainershipModel.generateRelationId(trainerId, traineeId);
    final relationRef = _firestore.collection('trainerships').doc(relationId);

    await relationRef.update({
      'permissions': permissions.toMap(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  /// Terminate a trainership
  Future<void> terminateTrainership({
    required String trainerId,
    required String traineeId,
  }) async {
    if (trainerId == traineeId) return; // Prevent terminating self-training

    final relationId = TrainershipModel.generateRelationId(trainerId, traineeId);
    final relationRef = _firestore.collection('trainerships').doc(relationId);

    await relationRef.update({
      'status': TrainershipStatus.terminated.name,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // =========================================================================
  // 3. Daily Logs
  // Path: users/{userId}/dailyLogs/{logId}
  // =========================================================================

  /// Stream trainee's daily logs
  Stream<List<DailyLogModel>> streamDailyLogs(String userId, {int limit = 30}) {
    return _firestore
        .collection('users')
        .doc(userId)
        .collection('dailyLogs')
        .orderBy('logDate', descending: true)
        .limit(limit)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => DailyLogModel.fromFirestore(doc, userId)).toList());
  }

  /// Save or update a daily log
  Future<void> saveDailyLog(DailyLogModel log) async {
    final logRef = _firestore
        .collection('users')
        .doc(log.userId)
        .collection('dailyLogs')
        .doc(log.logId.isNotEmpty ? log.logId : log.logDate);

    await logRef.set(log.toMap(), SetOptions(merge: true));
  }

  // =========================================================================
  // 4 & 5. Workout Templates & Nested Exercises
  // Path: workoutTemplates/{templateId}
  // Sub-path: workoutTemplates/{templateId}/exercises/{exerciseId}
  // =========================================================================

  /// Stream assigned workout templates for a trainee
  Stream<List<WorkoutTemplateModel>> streamAssignedTemplates(String traineeId) {
    return _firestore
        .collection('workoutTemplates')
        .where('assignedToId', '==', traineeId)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => WorkoutTemplateModel.fromFirestore(doc)).toList());
  }

  /// Stream exercises for a specific template
  Stream<List<WorkoutExerciseModel>> streamTemplateExercises(String templateId) {
    return _firestore
        .collection('workoutTemplates')
        .doc(templateId)
        .collection('exercises')
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => WorkoutExerciseModel.fromFirestore(doc)).toList());
  }

  /// Atomically create a template and its exercises
  Future<String> createWorkoutTemplate({
    required WorkoutTemplateModel template,
    required List<WorkoutExerciseModel> exercises,
  }) async {
    final batch = _firestore.batch();
    final templateRef = _firestore.collection('workoutTemplates').doc();
    final templateId = templateRef.id;

    batch.set(templateRef, template.toMap());

    for (final ex in exercises) {
      final exRef = templateRef.collection('exercises').doc();
      batch.set(exRef, ex.toMap());
    }

    await batch.commit();
    return templateId;
  }

  // =========================================================================
  // 6. Workout Logs
  // Path: workoutLogs/{workoutLogId}
  // =========================================================================

  Stream<List<WorkoutLogModel>> streamWorkoutLogs(String userId, {int limit = 20}) {
    return _firestore
        .collection('workoutLogs')
        .where('userId', '==', userId)
        .orderBy('completedAt', descending: true)
        .limit(limit)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => WorkoutLogModel.fromFirestore(doc)).toList());
  }

  Future<void> logWorkout(WorkoutLogModel workoutLog) async {
    final docRef = _firestore.collection('workoutLogs').doc();
    await docRef.set(workoutLog.toMap());
  }

  // =========================================================================
  // 7. Nutrition Goals
  // Path: nutritionGoals/{goalId}
  // =========================================================================

  Stream<NutritionGoalModel?> streamActiveNutritionGoal(String traineeId) {
    return _firestore
        .collection('nutritionGoals')
        .where('traineeId', '==', traineeId)
        .where('isActive', '==', true)
        .limit(1)
        .snapshots()
        .map((snapshot) {
      if (snapshot.docs.isEmpty) return null;
      return NutritionGoalModel.fromFirestore(snapshot.docs.first);
    });
  }

  /// Sets a new active nutrition goal and marks previous active goals as inactive
  Future<void> setActiveNutritionGoal(NutritionGoalModel goal) async {
    final batch = _firestore.batch();
    final activeQuery = await _firestore
        .collection('nutritionGoals')
        .where('traineeId', '==', goal.traineeId)
        .where('isActive', '==', true)
        .get();

    for (final doc in activeQuery.docs) {
      batch.update(doc.reference, {'isActive': false});
    }

    final newGoalRef = _firestore.collection('nutritionGoals').doc();
    batch.set(newGoalRef, goal.toMap());
    await batch.commit();
  }
}
