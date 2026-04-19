import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setStorageBackend } from '../persistence/storage';
import {
  createProfile,
  listProfiles,
  recordGameResult,
  removeProfile,
  renameProfile,
} from './profile';
import { profileView } from './stats';

function makeMemBackend() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

beforeEach(() => {
  setStorageBackend(makeMemBackend());
});

afterEach(() => {
  setStorageBackend(null);
});

describe('profile CRUD', () => {
  it('creates with empty stats and stores in list', () => {
    const p = createProfile({ name: 'Алиса', emoji: '🦊' });
    expect(p.id).toBeTruthy();
    expect(p.stats.gamesPlayed).toBe(0);
    expect(listProfiles()).toHaveLength(1);
  });

  it('renames a profile', () => {
    const p = createProfile({ name: 'A', emoji: '🦊' });
    const updated = renameProfile(p.id, 'Boris', '🐺');
    expect(updated?.name).toBe('Boris');
    expect(updated?.emoji).toBe('🐺');
    expect(listProfiles()[0].name).toBe('Boris');
  });

  it('removes a profile', () => {
    const p = createProfile({ name: 'A', emoji: '🦊' });
    removeProfile(p.id);
    expect(listProfiles()).toEqual([]);
  });
});

describe('recordGameResult', () => {
  it('accumulates stats over games', () => {
    const p = createProfile({ name: 'A', emoji: '🦊' });

    recordGameResult({
      profileId: p.id,
      finalScore: 80,
      won: true,
      draw: false,
      ticketsCompleted: 3,
      ticketsMissed: 1,
      routesClaimed: 12,
      longestSingleRoute: 6,
    });
    recordGameResult({
      profileId: p.id,
      finalScore: 55,
      won: false,
      draw: false,
      ticketsCompleted: 2,
      ticketsMissed: 2,
      routesClaimed: 10,
      longestSingleRoute: 4,
    });
    recordGameResult({
      profileId: p.id,
      finalScore: 70,
      won: false,
      draw: true,
      ticketsCompleted: 3,
      ticketsMissed: 0,
      routesClaimed: 11,
      longestSingleRoute: 8,
    });

    const view = profileView(listProfiles()[0]);
    expect(view.gamesPlayed).toBe(3);
    expect(view.wins).toBe(1);
    expect(view.losses).toBe(1);
    expect(view.draws).toBe(1);
    expect(view.bestScore).toBe(80);
    expect(view.averageScore).toBe(Math.round((80 + 55 + 70) / 3));
    expect(view.ticketsCompleted).toBe(8);
    expect(view.ticketsMissed).toBe(3);
    expect(view.ticketCompletionPct).toBe(Math.round((8 / 11) * 100));
    expect(view.longestSingleRoute).toBe(8);
    expect(view.winRatePct).toBe(Math.round((1 / 3) * 100));
  });

  it('is a no-op for unknown profile id', () => {
    const p = createProfile({ name: 'A', emoji: '🦊' });
    const r = recordGameResult({
      profileId: 'nonexistent',
      finalScore: 10,
      won: true,
      draw: false,
      ticketsCompleted: 0,
      ticketsMissed: 0,
      routesClaimed: 0,
      longestSingleRoute: 0,
    });
    expect(r).toBeNull();
    expect(listProfiles()[0].stats.gamesPlayed).toBe(0);
    void p;
  });
});
