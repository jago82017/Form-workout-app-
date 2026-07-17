import type { AppState, PersonalRecord, WorkoutSession } from './types';

export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const estimate1RM = (weight: number, reps: number) => {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30) * 10) / 10;
};

export const sessionVolume = (session: WorkoutSession) =>
  session.exercises.reduce(
    (total, exercise) => total + exercise.sets.filter((set) => set.completed).reduce((sum, set) => sum + set.weight * set.reps, 0),
    0,
  );

export const sessionDuration = (session: WorkoutSession, now = Date.now()) => {
  if (session.finishedAt) {
    return Math.max(0, new Date(session.finishedAt).getTime() - new Date(session.startedAt).getTime() - session.elapsedBeforePause);
  }
  if (session.pausedAt) {
    return Math.max(0, new Date(session.pausedAt).getTime() - new Date(session.startedAt).getTime() - session.elapsedBeforePause);
  }
  return Math.max(0, now - new Date(session.startedAt).getTime() - session.elapsedBeforePause);
};

export const formatTimer = (totalSeconds: number) => {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const getRecords = (history: WorkoutSession[], exerciseNames: Record<string, string>): PersonalRecord[] => {
  const records = new Map<string, PersonalRecord>();
  history.forEach((session) => {
    session.exercises.forEach((exercise) => {
      exercise.sets.filter((set) => set.completed).forEach((set) => {
        const estimated1RM = estimate1RM(set.weight, set.reps);
        const current = records.get(exercise.exerciseId);
        if (!current || estimated1RM > current.estimated1RM) {
          records.set(exercise.exerciseId, {
            exerciseId: exercise.exerciseId,
            exerciseName: exerciseNames[exercise.exerciseId] || 'Exercise',
            weight: set.weight,
            reps: set.reps,
            estimated1RM,
            date: session.finishedAt || session.startedAt,
          });
        }
      });
    });
  });
  return [...records.values()].sort((a, b) => b.estimated1RM - a.estimated1RM);
};

export const wouldBeRecord = (state: AppState, exerciseId: string, weight: number, reps: number) => {
  const best = state.history.flatMap((session) => session.exercises)
    .filter((exercise) => exercise.exerciseId === exerciseId)
    .flatMap((exercise) => exercise.sets)
    .filter((set) => set.completed)
    .reduce((max, set) => Math.max(max, estimate1RM(set.weight, set.reps)), 0);
  return estimate1RM(weight, reps) > best;
};

export const isThisWeek = (date: string) => {
  const value = new Date(date);
  const today = new Date();
  const day = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - day);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return value >= monday && value < nextMonday;
};

export const downloadFile = (name: string, content: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
};
