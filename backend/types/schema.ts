/**
 * FitPulse canonical data model (Firestore).
 *
 * Identity: Firebase Auth UID is the only user id. Demo keys like `client_1`
 * are not stored as document ids.
 *
 * Roles (exactly one stored value):
 *   trainee | coach | manager
 * Aliases never written: trainer → coach, admin → manager, trainer_admin → coach.
 * `isTrainer` is derived (coach | manager) and kept for Security Rules.
 *
 * Collections in use:
 *   users/{userId}
 *   users/{userId}/dailyLogs/{YYYY-MM-DD}
 *   users/{userId}/foodLogs/{foodLogId}
 *   trainerships/{trainerId}_{traineeId}
 *   workoutTemplates/{templateId}
 *   workoutTemplates/{templateId}/exercises/{rowId}
 *   workoutLogs/{workoutLogId}
 *   nutritionGoals/{goalId}
 *   foods/{foodId}                 (catalog or crowdsourced barcode id)
 *   exerciseCatalog/{exerciseId}   (catalog)
 *   equivalenceGroups/{groupId}    (coach-owned)
 *
 * Do not write new data to trainees/ or dailyReports/. Those paths are legacy.
 */

import type { Timestamp } from 'firebase-admin/firestore';

export type AppRole = 'trainee' | 'coach' | 'manager';
export type AccountStatus = 'pending_approval' | 'active' | 'suspended' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type TrainershipStatus = 'pending' | 'active' | 'rejected' | 'terminated';
export type DailyLogStatus = 'draft' | 'finalized' | 'auto_closed';
export type WorkoutKind = 'weekly' | 'session';
export type NutritionBasis = 'per100g' | 'serving';
export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core' | 'cardio';

export const APP_ROLES: readonly AppRole[] = ['trainee', 'coach', 'manager'] as const;

export function normalizeRole(raw?: string | null, isTrainer?: boolean): AppRole {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'manager' || value === 'admin') return 'manager';
  if (value === 'coach' || value === 'trainer' || value === 'trainer_admin') return 'coach';
  if (value === 'trainee') return 'trainee';
  return isTrainer ? 'coach' : 'trainee';
}

export function roleImpliesTrainer(role: AppRole): boolean {
  return role === 'coach' || role === 'manager';
}

export function relationIdFor(trainerId: string, traineeId: string): string {
  return `${trainerId}_${traineeId}`;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  email: string;
  role: AppRole;
  isTrainer: boolean;
  status: AccountStatus;
  approvalStatus: ApprovalStatus;
  isPublicVisible?: boolean;
  profileImageUrl?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  heightCm?: number;
  currentWeightKg?: number;
  targetWeightKg?: number;
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

export type CreateUserInput = {
  userId: string;
  fullName: string;
  email: string;
  role?: AppRole | string;
  isTrainer?: boolean;
  status?: AccountStatus;
  approvalStatus?: ApprovalStatus;
  profileImageUrl?: string;
  createdAt?: Timestamp;
};

export type UpdateUserInput = Partial<Omit<UserProfile, 'userId' | 'createdAt'>>;

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

export interface DailyCheckIn {
  morningWeightKg?: number;
  waterIntakeMl: number;
  sleepHours: number;
  sleepQuality?: number;
  steps?: number;
  energyLevel?: number;
  stressLevel?: number;
  notes: string;
}

export interface DailyLog {
  logId: string;
  userId: string;
  logDate: string;
  status: DailyLogStatus;
  sleepHours: number;
  waterIntakeMl: number;
  dailyNotes: string;
  checkIn?: DailyCheckIn;
  nutritionTotals?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  workoutLogIds?: string[];
  updatedAt: Timestamp;
  finalizedAt?: Timestamp | null;
}

export type CreateDailyLogInput = Omit<DailyLog, 'logId' | 'updatedAt' | 'status'> & {
  logId?: string;
  status?: DailyLogStatus;
};

export type UpdateDailyLogInput = Partial<Omit<DailyLog, 'logId' | 'userId' | 'logDate' | 'updatedAt'>>;

export interface WorkoutTemplate {
  templateId: string;
  creatorId: string;
  assignedToId: string;
  title: string;
  description: string;
  kind: WorkoutKind;
  category?: string;
  scheduledDay: string | number;
  restSeconds: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export type CreateWorkoutTemplateInput = Omit<WorkoutTemplate, 'templateId' | 'createdAt' | 'kind' | 'restSeconds'> & {
  kind?: WorkoutKind;
  restSeconds?: number;
};

export type UpdateWorkoutTemplateInput = Partial<Omit<WorkoutTemplate, 'templateId' | 'creatorId' | 'createdAt'>>;

export interface WorkoutExercise {
  exerciseId: string;
  templateId: string;
  orderIndex: number;
  primaryMuscleGroup?: MuscleGroup | string;
  primaryMuscleSubgroup?: string;
  preferredExerciseId?: string;
  exerciseName: string;
  targetSets: number;
  targetReps: string;
  targetWeight?: number;
  notes: string;
}

export type CreateWorkoutExerciseInput = Omit<WorkoutExercise, 'exerciseId' | 'orderIndex'> & {
  orderIndex?: number;
};

export type UpdateWorkoutExerciseInput = Partial<Omit<WorkoutExercise, 'exerciseId' | 'templateId'>>;

export interface LoggedSet {
  setNumber: number;
  exerciseId?: string;
  exerciseName: string;
  weightKg: number;
  reps: number;
  completed: boolean;
  rir?: number;
  setType?: string;
}

export interface WorkoutLog {
  workoutLogId: string;
  userId: string;
  templateId?: string;
  logDate: string;
  completedAt: Timestamp;
  healthFeelingScore: number;
  perceivedExertionRpe: number;
  completionNotes: string;
  durationMinutes?: number;
  totalVolume?: number;
  sets?: LoggedSet[];
}

export type CreateWorkoutLogInput = Omit<WorkoutLog, 'workoutLogId' | 'logDate'> & {
  logDate?: string;
};

export interface NutritionGoal {
  goalId: string;
  traineeId: string;
  trainerId?: string;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatsGrams: number;
  targetWaterMl?: number;
  targetSleepHours?: number;
  startDate: Timestamp;
  isActive: boolean;
}

export type CreateNutritionGoalInput = Omit<NutritionGoal, 'goalId'>;
export type UpdateNutritionGoalInput = Partial<Omit<NutritionGoal, 'goalId' | 'traineeId' | 'startDate'>>;

export interface FoodLogEntry {
  foodLogId: string;
  userId: string;
  logDate: string;
  foodId?: string;
  name: string;
  grams: number;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  source?: string;
  loggedAt: Timestamp;
}

export interface ExerciseCatalogItem {
  exerciseId: string;
  name: string;
  primaryMuscleGroup: MuscleGroup | string;
  primaryMuscleSubgroup?: string;
  equipment?: string;
  unilateral?: boolean;
}

export interface EquivalenceGroup {
  groupId: string;
  ownerId: string;
  primaryMuscleGroup: MuscleGroup | string;
  primaryMuscleSubgroup?: string;
  preferredExerciseId: string;
  equivalentExerciseIds: string[];
}

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

export type CrowdsourcedFoodSource = 'scraped' | 'manual';

export interface FoodMacrosPer100g {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

/** Crowdsourced barcode document in foods/{barcode}. Separate from personal foodLogs. */
export interface CrowdsourcedFood {
  barcode: string;
  name: string;
  brand: string;
  servingSize: string;
  macrosPer100g: FoodMacrosPer100g;
  source: CrowdsourcedFoodSource;
  createdAt: Timestamp;
  createdBy: string;
}
