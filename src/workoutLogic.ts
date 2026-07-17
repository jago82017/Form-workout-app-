import type { AppState, WorkoutSession, WorkoutSet } from './types';

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

export const getRestRemaining = (deadline: number | null, now: number) => deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
