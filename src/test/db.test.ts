import { beforeEach, describe, expect, it } from 'vitest';
import { clearState, loadState, saveState } from '../db';
import { seedState } from '../data';

describe('IndexedDB persistence', () => {
  beforeEach(async () => { await clearState(); });

  it('saves and restores the complete app state', async () => {
    const state = { ...seedState, steps: 9123, profile: { ...seedState.profile, name: 'Jordan' } };
    await saveState(state);
    const restored = await loadState();
    expect(restored?.profile.name).toBe('Jordan');
    expect(restored?.steps).toBe(9123);
    expect(restored?.routines.length).toBe(6);
  });
});
