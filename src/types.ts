export type Tab = 'today' | 'plans' | 'workout' | 'progress' | 'profile';
export type SetType = 'warm-up' | 'normal' | 'drop' | 'failure';
export type Goal = 'Build muscle' | 'Gain strength' | 'Lose fat' | 'Improve fitness' | 'General health';
export type ThemeMode = 'dark' | 'light' | 'system';

export interface ExerciseDefinition {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  instructions: string;
}

export interface RoutineExercise {
  exerciseId: string;
  sets: number;
  targetReps: string;
  restSeconds: number;
  note?: string;
}

export interface Routine {
  id: string;
  name: string;
  accent: string;
  exercises: RoutineExercise[];
}

export interface WorkoutSet {
  id: string;
  type: SetType;
  weight: number;
  reps: number;
  rpe: number;
  duration?: number;
  distance?: number;
  completed: boolean;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: WorkoutSet[];
  note?: string;
}

export interface WorkoutSession {
  id: string;
  routineId: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  elapsedBeforePause: number;
  pausedAt?: string;
  exercises: LoggedExercise[];
  note: string;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  date: string;
}

export interface BodyEntry {
  id: string;
  date: string;
  weight: number;
}

export interface PhotoEntry {
  id: string;
  date: string;
  dataUrl: string;
}

export interface Profile {
  name: string;
  goal: Goal;
  experience: 'Beginner' | 'Intermediate' | 'Advanced';
  unit: 'kg' | 'lb';
  distanceUnit: 'km' | 'mi';
  weeklyTarget: number;
  theme: ThemeMode;
  reducedMotion: boolean;
  reminders: boolean;
}

export interface AppState {
  profile: Profile;
  routines: Routine[];
  customExercises: ExerciseDefinition[];
  schedule: Record<string, string | null>;
  history: WorkoutSession[];
  activeWorkout: WorkoutSession | null;
  bodyweight: BodyEntry[];
  photos: PhotoEntry[];
  steps: number;
  /** Personal setup notes that appear every time an exercise is used. */
  exerciseNotes?: Record<string, string>;
}
