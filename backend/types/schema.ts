/**
 * Trainers & Trainees - Cloud Firestore Database Schema & Types
 * 
 * Target Environment: TypeScript / Node.js (Firebase Admin SDK or Client SDK)
 * Platform: Google Cloud Firestore
 */

import type { Timestamp } from 'firebase-admin/firestore';

/**
 * 1. Users Collection Schema
 * Path: users/{userId}
 * Document ID: userId (matches Firebase Auth UID)
 */
export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  isTrainer: boolean;
  profileImageUrl?: string;
  createdAt: Timestamp;
}

export type CreateUserInput = Omit<UserProfile, 'createdAt'> & {
  createdAt?: Timestamp;
};

export type UpdateUserInput = Partial<Omit<UserProfile, 'userId' | 'createdAt'>>;

/**
 * 2. Trainerships Collection Schema
 * Path: trainerships/{relationId}
 * 
 * Relation ID Convention:
 * Deterministic ID `${trainerId}_${traineeId}` is strongly recommended to:
 * 1) Enforce a unique 1-to-1 relationship between a trainer and trainee.
 * 2) Enable O(1) Firestore Security Rules checks using exists() and get() without expensive collection queries.
 */
export type TrainershipStatus = 'pending' | 'active' | 'rejected' | 'terminated';

export interface TrainershipPermissions {
  canViewSleep: boolean;
  canViewNutrition: boolean;
  canViewWorkouts: boolean;
  canViewDailyLogs: boolean;
}

export interface Trainership {
  relationId: string;
  trainerId: string;
  traineeId: string;
  status: TrainershipStatus;
  permissions: TrainershipPermissions;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type CreateTrainershipInput = {
  trainerId: string;
  traineeId: string;
  status?: TrainershipStatus;
  permissions?: Partial<TrainershipPermissions>;
};

export type UpdateTrainershipPermissionsInput = Partial<TrainershipPermissions>;

/**
 * 3. DailyLogs Sub-collection Schema
 * Path: users/{userId}/dailyLogs/{logId}
 * Document ID: logId (auto-generated or YYYY-MM-DD date key)
 */
export interface DailyLog {
  logId: string;
  userId: string;
  logDate: string; // ISO format 'YYYY-MM-DD'
  sleepHours: number;
  waterIntakeMl: number;
  dailyNotes: string;
  updatedAt: Timestamp;
}

export type CreateDailyLogInput = Omit<DailyLog, 'logId' | 'updatedAt'> & {
  logId?: string;
};

export type UpdateDailyLogInput = Partial<Omit<DailyLog, 'logId' | 'userId' | 'logDate' | 'updatedAt'>>;

/**
 * 4. WorkoutTemplates Collection Schema
 * Path: workoutTemplates/{templateId}
 * Document ID: templateId (auto-generated)
 */
export interface WorkoutTemplate {
  templateId: string;
  creatorId: string;   // Trainer (or Trainee) who created the routine
  assignedToId: string; // Trainee receiving the routine
  title: string;
  description: string;
  scheduledDay: string | number; // e.g., 'Monday', 'Leg Day', or index 0-6
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type CreateWorkoutTemplateInput = Omit<WorkoutTemplate, 'templateId' | 'createdAt'>;

export type UpdateWorkoutTemplateInput = Partial<Omit<WorkoutTemplate, 'templateId' | 'creatorId' | 'createdAt'>>;

/**
 * 5. WorkoutExercises Sub-collection Schema
 * Path: workoutTemplates/{templateId}/exercises/{exerciseId}
 * Document ID: exerciseId (auto-generated)
 */
export interface WorkoutExercise {
  exerciseId: string;
  templateId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string; // e.g., "8-10", "12", "AMRAP"
  targetWeight?: number; // In kg/lbs
  notes: string;
  orderIndex?: number;
}

export type CreateWorkoutExerciseInput = Omit<WorkoutExercise, 'exerciseId'>;

export type UpdateWorkoutExerciseInput = Partial<Omit<WorkoutExercise, 'exerciseId' | 'templateId'>>;

/**
 * 6. WorkoutLogs Collection Schema
 * Path: workoutLogs/{workoutLogId}
 * Document ID: workoutLogId (auto-generated)
 */
export interface WorkoutLog {
  workoutLogId: string;
  userId: string;
  templateId?: string;
  completedAt: Timestamp;
  healthFeelingScore: number;   // 1 to 10
  perceivedExertionRpe: number; // 1 to 10 (Rating of Perceived Exertion)
  completionNotes: string;
}

export type CreateWorkoutLogInput = Omit<WorkoutLog, 'workoutLogId'>;

/**
 * 7. NutritionGoals Collection Schema
 * Path: nutritionGoals/{goalId}
 * Document ID: goalId (auto-generated)
 */
export interface NutritionGoal {
  goalId: string;
  traineeId: string;
  trainerId?: string;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatsGrams: number;
  startDate: Timestamp;
  isActive: boolean;
}

export type CreateNutritionGoalInput = Omit<NutritionGoal, 'goalId'>;

export type UpdateNutritionGoalInput = Partial<Omit<NutritionGoal, 'goalId' | 'traineeId' | 'startDate'>>;

/**
 * Default self-training permissions helper
 */
export const FULL_PERMISSIONS: TrainershipPermissions = Object.freeze({
  canViewSleep: true,
  canViewNutrition: true,
  canViewWorkouts: true,
  canViewDailyLogs: true,
});

export const DEFAULT_TRAINEE_PERMISSIONS: TrainershipPermissions = Object.freeze({
  canViewSleep: true,
  canViewNutrition: true,
  canViewWorkouts: true,
  canViewDailyLogs: true,
});
