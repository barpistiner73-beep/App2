// Trainers & Trainees - Flutter / Dart Data Models
// Designed for Cloud Firestore & Firebase Auth

import 'package:cloud_firestore/cloud_firestore.dart';

// ============================================================================
// 1. User Model
// Path: users/{userId}
// ============================================================================
class UserModel {
  final String userId;
  final String fullName;
  final String email;
  final bool isTrainer;
  final String? profileImageUrl;
  final DateTime createdAt;

  const UserModel({
    required this.userId,
    required this.fullName,
    required this.email,
    this.isTrainer = false,
    this.profileImageUrl,
    required this.createdAt,
  });

  factory UserModel.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return UserModel(
      userId: doc.id,
      fullName: data['fullName'] as String? ?? '',
      email: data['email'] as String? ?? '',
      isTrainer: data['isTrainer'] as bool? ?? false,
      profileImageUrl: data['profileImageUrl'] as String?,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'fullName': fullName,
      'email': email,
      'isTrainer': isTrainer,
      'profileImageUrl': profileImageUrl,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  UserModel copyWith({
    String? fullName,
    String? email,
    bool? isTrainer,
    String? profileImageUrl,
  }) {
    return UserModel(
      userId: userId,
      fullName: fullName ?? this.fullName,
      email: email ?? this.email,
      isTrainer: isTrainer ?? this.isTrainer,
      profileImageUrl: profileImageUrl ?? this.profileImageUrl,
      createdAt: createdAt,
    );
  }
}

// ============================================================================
// 2. Trainership Permissions & Model
// Path: trainerships/{relationId}
// ============================================================================
class TrainershipPermissions {
  final bool canViewSleep;
  final bool canViewNutrition;
  final bool canViewWorkouts;
  final bool canViewDailyLogs;

  const TrainershipPermissions({
    this.canViewSleep = true,
    this.canViewNutrition = true,
    this.canViewWorkouts = true,
    this.canViewDailyLogs = true,
  });

  factory TrainershipPermissions.fromMap(Map<String, dynamic>? map) {
    if (map == null) return const TrainershipPermissions();
    return TrainershipPermissions(
      canViewSleep: map['canViewSleep'] as bool? ?? true,
      canViewNutrition: map['canViewNutrition'] as bool? ?? true,
      canViewWorkouts: map['canViewWorkouts'] as bool? ?? true,
      canViewDailyLogs: map['canViewDailyLogs'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'canViewSleep': canViewSleep,
      'canViewNutrition': canViewNutrition,
      'canViewWorkouts': canViewWorkouts,
      'canViewDailyLogs': canViewDailyLogs,
    };
  }

  TrainershipPermissions copyWith({
    bool? canViewSleep,
    bool? canViewNutrition,
    bool? canViewWorkouts,
    bool? canViewDailyLogs,
  }) {
    return TrainershipPermissions(
      canViewSleep: canViewSleep ?? this.canViewSleep,
      canViewNutrition: canViewNutrition ?? this.canViewNutrition,
      canViewWorkouts: canViewWorkouts ?? this.canViewWorkouts,
      canViewDailyLogs: canViewDailyLogs ?? this.canViewDailyLogs,
    );
  }
}

enum TrainershipStatus { pending, active, rejected, terminated }

class TrainershipModel {
  final String relationId;
  final String trainerId;
  final String traineeId;
  final TrainershipStatus status;
  final TrainershipPermissions permissions;
  final DateTime createdAt;

  const TrainershipModel({
    required this.relationId,
    required this.trainerId,
    required this.traineeId,
    required this.status,
    required this.permissions,
    required this.createdAt,
  });

  bool get isSelfTraining => trainerId == traineeId;

  static String generateRelationId(String trainerId, String traineeId) {
    return '${trainerId}_$traineeId';
  }

  factory TrainershipModel.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    final statusStr = data['status'] as String? ?? 'pending';
    final status = TrainershipStatus.values.firstWhere(
      (e) => e.name == statusStr,
      orElse: () => TrainershipStatus.pending,
    );

    return TrainershipModel(
      relationId: doc.id,
      trainerId: data['trainerId'] as String? ?? '',
      traineeId: data['traineeId'] as String? ?? '',
      status: status,
      permissions: TrainershipPermissions.fromMap(data['permissions'] as Map<String, dynamic>?),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'relationId': relationId,
      'trainerId': trainerId,
      'traineeId': traineeId,
      'status': status.name,
      'permissions': permissions.toMap(),
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}

// ============================================================================
// 3. Daily Log Model (Sub-collection)
// Path: users/{userId}/dailyLogs/{logId}
// ============================================================================
class DailyLogModel {
  final String logId;
  final String userId;
  final String logDate; // Format 'YYYY-MM-DD'
  final double sleepHours;
  final int waterIntakeMl;
  final String dailyNotes;
  final DateTime updatedAt;

  const DailyLogModel({
    required this.logId,
    required this.userId,
    required this.logDate,
    required this.sleepHours,
    required this.waterIntakeMl,
    required this.dailyNotes,
    required this.updatedAt,
  });

  factory DailyLogModel.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc, String userId) {
    final data = doc.data() ?? {};
    return DailyLogModel(
      logId: doc.id,
      userId: userId,
      logDate: data['logDate'] as String? ?? doc.id,
      sleepHours: (data['sleepHours'] as num?)?.toDouble() ?? 0.0,
      waterIntakeMl: (data['waterIntakeMl'] as num?)?.toInt() ?? 0,
      dailyNotes: data['dailyNotes'] as String? ?? '',
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'logDate': logDate,
      'sleepHours': sleepHours,
      'waterIntakeMl': waterIntakeMl,
      'dailyNotes': dailyNotes,
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }
}

// ============================================================================
// 4. Workout Template Model
// Path: workoutTemplates/{templateId}
// ============================================================================
class WorkoutTemplateModel {
  final String templateId;
  final String creatorId;
  final String assignedToId;
  final String title;
  final String description;
  final dynamic scheduledDay; // String or int (e.g. 'Monday' or 0)
  final DateTime createdAt;

  const WorkoutTemplateModel({
    required this.templateId,
    required this.creatorId,
    required this.assignedToId,
    required this.title,
    required this.description,
    required this.scheduledDay,
    required this.createdAt,
  });

  factory WorkoutTemplateModel.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return WorkoutTemplateModel(
      templateId: doc.id,
      creatorId: data['creatorId'] as String? ?? '',
      assignedToId: data['assignedToId'] as String? ?? '',
      title: data['title'] as String? ?? '',
      description: data['description'] as String? ?? '',
      scheduledDay: data['scheduledDay'] ?? 'Monday',
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'creatorId': creatorId,
      'assignedToId': assignedToId,
      'title': title,
      'description': description,
      'scheduledDay': scheduledDay,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}

// ============================================================================
// 5. Workout Exercise Model (Sub-collection)
// Path: workoutTemplates/{templateId}/exercises/{exerciseId}
// ============================================================================
class WorkoutExerciseModel {
  final String exerciseId;
  final String exerciseName;
  final int targetSets;
  final String targetReps;
  final double? targetWeight;
  final String notes;

  const WorkoutExerciseModel({
    required this.exerciseId,
    required this.exerciseName,
    required this.targetSets,
    required this.targetReps,
    this.targetWeight,
    this.notes = '',
  });

  factory WorkoutExerciseModel.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return WorkoutExerciseModel(
      exerciseId: doc.id,
      exerciseName: data['exerciseName'] as String? ?? '',
      targetSets: (data['targetSets'] as num?)?.toInt() ?? 3,
      targetReps: data['targetReps'] as String? ?? '10',
      targetWeight: (data['targetWeight'] as num?)?.toDouble(),
      notes: data['notes'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'exerciseName': exerciseName,
      'targetSets': targetSets,
      'targetReps': targetReps,
      if (targetWeight != null) 'targetWeight': targetWeight,
      'notes': notes,
    };
  }
}

// ============================================================================
// 6. Workout Log Model
// Path: workoutLogs/{workoutLogId}
// ============================================================================
class WorkoutLogModel {
  final String workoutLogId;
  final String userId;
  final String? templateId;
  final DateTime completedAt;
  final int healthFeelingScore;   // 1 to 10
  final int perceivedExertionRpe; // 1 to 10
  final String completionNotes;

  const WorkoutLogModel({
    required this.workoutLogId,
    required this.userId,
    this.templateId,
    required this.completedAt,
    required this.healthFeelingScore,
    required this.perceivedExertionRpe,
    required this.completionNotes,
  });

  factory WorkoutLogModel.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return WorkoutLogModel(
      workoutLogId: doc.id,
      userId: data['userId'] as String? ?? '',
      templateId: data['templateId'] as String?,
      completedAt: (data['completedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      healthFeelingScore: (data['healthFeelingScore'] as num?)?.toInt() ?? 5,
      perceivedExertionRpe: (data['perceivedExertionRpe'] as num?)?.toInt() ?? 5,
      completionNotes: data['completionNotes'] as String? ?? '',
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'userId': userId,
      'templateId': templateId,
      'completedAt': Timestamp.fromDate(completedAt),
      'healthFeelingScore': healthFeelingScore,
      'perceivedExertionRpe': perceivedExertionRpe,
      'completionNotes': completionNotes,
    };
  }
}

// ============================================================================
// 7. Nutrition Goal Model
// Path: nutritionGoals/{goalId}
// ============================================================================
class NutritionGoalModel {
  final String goalId;
  final String traineeId;
  final String? trainerId;
  final int targetCalories;
  final int targetProteinGrams;
  final int targetCarbsGrams;
  final int targetFatsGrams;
  final DateTime startDate;
  final bool isActive;

  const NutritionGoalModel({
    required this.goalId,
    required this.traineeId,
    this.trainerId,
    required this.targetCalories,
    required this.targetProteinGrams,
    required this.targetCarbsGrams,
    required this.targetFatsGrams,
    required this.startDate,
    required this.isActive,
  });

  factory NutritionGoalModel.fromFirestore(DocumentSnapshot<Map<String, dynamic>> doc) {
    final data = doc.data() ?? {};
    return NutritionGoalModel(
      goalId: doc.id,
      traineeId: data['traineeId'] as String? ?? '',
      trainerId: data['trainerId'] as String?,
      targetCalories: (data['targetCalories'] as num?)?.toInt() ?? 2000,
      targetProteinGrams: (data['targetProteinGrams'] as num?)?.toInt() ?? 150,
      targetCarbsGrams: (data['targetCarbsGrams'] as num?)?.toInt() ?? 200,
      targetFatsGrams: (data['targetFatsGrams'] as num?)?.toInt() ?? 70,
      startDate: (data['startDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isActive: data['isActive'] as bool? ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'traineeId': traineeId,
      if (trainerId != null) 'trainerId': trainerId,
      'targetCalories': targetCalories,
      'targetProteinGrams': targetProteinGrams,
      'targetCarbsGrams': targetCarbsGrams,
      'targetFatsGrams': targetFatsGrams,
      'startDate': Timestamp.fromDate(startDate),
      'isActive': isActive,
    };
  }
}
