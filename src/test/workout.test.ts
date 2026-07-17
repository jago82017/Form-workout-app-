import { describe, expect, it } from 'vitest';
import { seedState } from '../data';
import type { WorkoutSession } from '../types';
import { estimate1RM, sessionVolume, wouldBeRecord } from '../utils';
import { finishWorkout, getRestRemaining, updateWorkoutSet } from '../workoutLogic';

const active: WorkoutSession = {
  id: 'active', routineId: 'push', name: 'Push', startedAt: '2026-07-17T10:00:00.000Z', elapsedBeforePause: 0, note: '',
  exercises: [{ exerciseId: 'bench-press', sets: [{ id: 'set-1', type: 'normal', weight: 80, reps: 8, rpe: 8, completed: false }] }],
};

describe('workout logging', () => {
  it('updates and completes a set without mutating the session', () => {
    const updated = updateWorkoutSet(active, 0, 'set-1', { weight: 82.5, reps: 8, completed: true });
    expect(updated).not.toBe(active);
    expect(updated.exercises[0].sets[0]).toMatchObject({ weight: 82.5, reps: 8, completed: true });
    expect(active.exercises[0].sets[0].completed).toBe(false);
    expect(sessionVolume(updated)).toBe(660);
  });

  it('moves a finished workout into history', () => {
    const next = finishWorkout({ ...seedState, activeWorkout: active }, '2026-07-17T11:00:00.000Z');
    expect(next.activeWorkout).toBeNull();
    expect(next.history[0].id).toBe('active');
    expect(next.history[0].finishedAt).toBe('2026-07-17T11:00:00.000Z');
  });
});

describe('personal records', () => {
  it('uses estimated one-rep max and detects an improvement', () => {
    expect(estimate1RM(80, 8)).toBeCloseTo(101.3, 1);
    expect(wouldBeRecord(seedState, 'bench-press', 90, 8)).toBe(true);
    expect(wouldBeRecord(seedState, 'bench-press', 40, 5)).toBe(false);
  });
});

describe('rest timer', () => {
  it('counts down against an absolute deadline and floors at zero', () => {
    expect(getRestRemaining(100_000, 40_000)).toBe(60);
    expect(getRestRemaining(100_000, 101_000)).toBe(0);
    expect(getRestRemaining(null, 40_000)).toBe(0);
  });
});
