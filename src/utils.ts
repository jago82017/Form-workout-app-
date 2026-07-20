import type { AppState, PersonalRecord, WorkoutSession } from './types';

export interface StrengthScore {
  score: number;
  level: string;
  trackedPatterns: number;
  totalPatterns: number;
}

export type MuscleFatigueStatus = 'fresh' | 'light' | 'moderate' | 'high';

export interface MuscleFatigue {
  muscle: string;
  /** Estimated training fatigue from 0 (fresh) to 100 (high fatigue). */
  score: number;
  status: MuscleFatigueStatus;
  recentSets: number;
  lastTrainedAt: string;
}

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

/**
 * A simple, transparent 0–100 score based on the user's best estimated 1RM
 * relative to their recorded bodyweight across five movement patterns. It is
 * a personal progress indicator, not a medical or competitive ranking.
 */
export const calculateStrengthScore = (state: AppState): StrengthScore => {
  const bodyweight = state.bodyweight.at(-1)?.weight || 0;
  const patterns = [
    { target: 1.25, points: 20, exercises: [{ id: 'bench-press' }, { id: 'incline-db', multiplier: 2 }, { id: 'overhead-press', target: 0.75 }] },
    { target: 1.75, points: 25, exercises: [{ id: 'back-squat' }, { id: 'front-squat', target: 1.45 }, { id: 'leg-press', target: 3 }] },
    { target: 1.7, points: 25, exercises: [{ id: 'deadlift', target: 2 }, { id: 'romanian-deadlift', target: 1.7 }, { id: 'hip-thrust', target: 2 }] },
    { target: 1.2, points: 15, exercises: [{ id: 'barbell-row' }, { id: 'seated-row', target: 1.1 }, { id: 'lat-pulldown', target: 1.2 }] },
    { target: 0.75, points: 15, exercises: [{ id: 'overhead-press' }] },
  ];
  if (!bodyweight) return { score: 0, level: 'Start logging', trackedPatterns: 0, totalPatterns: patterns.length };

  const bestByExercise = new Map<string, number>();
  state.history.forEach((session) => session.exercises.forEach((exercise) => exercise.sets.filter((set) => set.completed).forEach((set) => {
    bestByExercise.set(exercise.exerciseId, Math.max(bestByExercise.get(exercise.exerciseId) || 0, estimate1RM(set.weight, set.reps)));
  })));

  let earned = 0;
  let available = 0;
  let trackedPatterns = 0;
  patterns.forEach((pattern) => {
    const bestRatio = Math.max(...pattern.exercises.map((exercise) => {
      const best = bestByExercise.get(exercise.id) || 0;
      return best ? (best * (exercise.multiplier || 1)) / (bodyweight * (exercise.target || pattern.target)) : 0;
    }));
    if (!bestRatio) return;
    trackedPatterns += 1;
    available += pattern.points;
    earned += Math.min(1, bestRatio) * pattern.points;
  });

  const score = available ? Math.round((earned / available) * 100) : 0;
  const level = score >= 90 ? 'Excellent' : score >= 75 ? 'Strong' : score >= 55 ? 'Solid' : score >= 35 ? 'Building' : score ? 'Starting out' : 'Start logging';
  return { score, level, trackedPatterns, totalPatterns: patterns.length };
};

/**
 * Estimates recent direct training fatigue for each muscle from completed sets.
 * It is a training-load guide, not a medical recovery measurement. Sets decay
 * across seven days so a hard session today matters more than one last week.
 */
export const calculateMuscleFatigue = (
  state: AppState,
  exerciseMuscles: Record<string, string>,
  now = new Date(),
): MuscleFatigue[] => {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const byMuscle = new Map<string, { stress: number; recentSets: number; lastTrainedAt: string }>();
  const sessions = state.activeWorkout ? [state.activeWorkout, ...state.history] : state.history;

  sessions.forEach((session) => {
    const trainedAt = session.finishedAt || session.startedAt;
    const trainedDay = new Date(trainedAt);
    trainedDay.setHours(0, 0, 0, 0);
    const daysAgo = Math.floor((today.getTime() - trainedDay.getTime()) / dayMs);
    if (daysAgo < 0 || daysAgo > 7) return;

    const recency = Math.pow(0.65, daysAgo);
    session.exercises.forEach((exercise) => {
      const completedSets = exercise.sets.filter((set) => set.completed);
      if (!completedSets.length) return;
      const muscle = exerciseMuscles[exercise.exerciseId] || 'Other';
      const current = byMuscle.get(muscle) || { stress: 0, recentSets: 0, lastTrainedAt: trainedAt };
      const typeMultiplier = { 'warm-up': 0.35, normal: 1, drop: 1.1, failure: 1.2 } as const;

      completedSets.forEach((set) => {
        const rpe = Math.min(10, Math.max(1, set.rpe || 7));
        const effort = 0.5 + rpe / 20;
        current.stress += effort * typeMultiplier[set.type] * recency;
        current.recentSets += 1;
      });
      if (new Date(trainedAt) > new Date(current.lastTrainedAt)) current.lastTrainedAt = trainedAt;
      byMuscle.set(muscle, current);
    });
  });

  return [...byMuscle.entries()].map(([muscle, value]) => {
    const score = Math.min(100, Math.round(value.stress * 8));
    const status: MuscleFatigueStatus = score >= 70 ? 'high' : score >= 45 ? 'moderate' : score >= 20 ? 'light' : 'fresh';
    return { muscle, score, status, recentSets: value.recentSets, lastTrainedAt: value.lastTrainedAt };
  }).sort((a, b) => b.score - a.score || b.recentSets - a.recentSets || a.muscle.localeCompare(b.muscle));
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
