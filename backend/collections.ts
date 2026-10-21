/** Firestore collection / document path helpers. Document ids are Auth UIDs. */

export const COLLECTIONS = {
  users: 'users',
  trainerships: 'trainerships',
  workoutTemplates: 'workoutTemplates',
  workoutLogs: 'workoutLogs',
  nutritionGoals: 'nutritionGoals',
  foods: 'foods',
  exerciseCatalog: 'exerciseCatalog',
  equivalenceGroups: 'equivalenceGroups',
} as const;

export const SUBCOLLECTIONS = {
  dailyLogs: 'dailyLogs',
  foodLogs: 'foodLogs',
  templateExercises: 'exercises',
} as const;

export function userPath(userId: string): string {
  return `${COLLECTIONS.users}/${userId}`;
}

export function dailyLogPath(userId: string, logDate: string): string {
  return `${COLLECTIONS.users}/${userId}/${SUBCOLLECTIONS.dailyLogs}/${logDate}`;
}

export function foodLogsPath(userId: string): string {
  return `${COLLECTIONS.users}/${userId}/${SUBCOLLECTIONS.foodLogs}`;
}

export function trainershipPath(trainerId: string, traineeId: string): string {
  return `${COLLECTIONS.trainerships}/${trainerId}_${traineeId}`;
}

export function templateExercisesPath(templateId: string): string {
  return `${COLLECTIONS.workoutTemplates}/${templateId}/${SUBCOLLECTIONS.templateExercises}`;
}
