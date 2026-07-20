import type { AppState, WorkoutSession, WorkoutSet } from './types';
import { uid } from './utils';

export const updateWorkoutSet = (
  workout: WorkoutSession,
  exerciseIndex: number,
  setId: string,
  changes: Partial<WorkoutSet>,
): WorkoutSession => ({
  ...workout,
  exercises: workout.exercises.map((exercise, index) => index === exerciseIndex
    ? { ...exercise, sets: exercise.sets.map((set) => set.id === setId ? { ...set, ...changes } : set) }
    : exercise),
});

export const finishWorkout = (state: AppState, finishedAt: string): AppState => {
  if (!state.activeWorkout) return state;
  const active = state.activeWorkout;
  const pausedFor = active.pausedAt ? new Date(finishedAt).getTime() - new Date(active.pausedAt).getTime() : 0;
  const finished: WorkoutSession = {
    ...active,
    finishedAt,
    pausedAt: undefined,
    elapsedBeforePause: active.elapsedBeforePause + Math.max(0, pausedFor),
  };
  return { ...state, activeWorkout: null, history: [finished, ...state.history] };
};

export const substituteWorkoutExercise = (workout: WorkoutSession, exerciseIndex: number, replacementExerciseId: string) => {
  const original = workout.exercises[exerciseIndex];
  if (!original) return { workout, preservedLoggedSets: false };
  const completed = original.sets.filter((set) => set.completed);
  const makeBlankSets = (count: number): WorkoutSet[] => Array.from({ length: Math.max(1, count) }, () => ({
    id: uid('set'), type: 'normal', weight: 0, reps: 0, rpe: 8, completed: false,
  }));
  if (!completed.length) {
    return {
      workout: {
        ...workout,
        exercises: workout.exercises.map((exercise, index) => index === exerciseIndex ? { exerciseId: replacementExerciseId, note: '', sets: makeBlankSets(exercise.sets.length) } : exercise),
      },
      preservedLoggedSets: false,
    };
  }
  const exercises = [...workout.exercises];
  exercises.splice(exerciseIndex, 1, { ...original, sets: completed }, { exerciseId: replacementExerciseId, note: '', sets: makeBlankSets(original.sets.length - completed.length) });
  return { workout: { ...workout, exercises }, preservedLoggedSets: true };
};

export const getRestRemaining = (deadline: number | null, now: number) => deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
