import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  deleteSavedGame,
  getActiveProfile,
  getActiveProfileId,
  getProfiles,
  getSavedGames,
  getSettings,
  saveGame,
  saveSettings,
  setActiveProfileId,
  setStorageBackend,
  upsertProfile,
} from './storage';
import { emptyStats, defaultSettings } from './schema';

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
    _map: map,
  };
}

let mem: ReturnType<typeof makeMemBackend>;

beforeEach(() => {
  mem = makeMemBackend();
  setStorageBackend(mem);
});

afterEach(() => {
  setStorageBackend(null);
});

describe('storage — profiles', () => {
  it('starts empty', () => {
    expect(getProfiles()).toEqual([]);
    expect(getActiveProfileId()).toBeNull();
    expect(getActiveProfile()).toBeNull();
  });

  it('upserts and reads profiles', () => {
    const p = {
      id: 'a',
      name: 'Алиса',
      emoji: '🦊',
      createdAt: 1,
      stats: emptyStats(),
    };
    upsertProfile(p);
    expect(getProfiles()).toEqual([p]);
    upsertProfile({ ...p, name: 'Alice' });
    expect(getProfiles()[0].name).toBe('Alice');
    expect(getProfiles()).toHaveLength(1);
  });

  it('tracks active profile and clears it on delete', () => {
    const p = {
      id: 'a',
      name: 'A',
      emoji: '🦊',
      createdAt: 1,
      stats: emptyStats(),
    };
    upsertProfile(p);
    setActiveProfileId('a');
    expect(getActiveProfileId()).toBe('a');
    expect(getActiveProfile()).toEqual(p);
    setActiveProfileId(null);
    expect(getActiveProfileId()).toBeNull();
  });
});

describe('storage — settings', () => {
  it('returns defaults when nothing saved', () => {
    expect(getSettings()).toEqual(defaultSettings());
  });

  it('round-trips settings', () => {
    const s = defaultSettings();
    s.defaultHouseRules.infiniteStations = true;
    s.defaultHouseRules.allowCardTrading = true;
    saveSettings(s);
    expect(getSettings()).toEqual(s);
  });
});

describe('storage — saved games', () => {
  it('starts empty', () => {
    expect(getSavedGames()).toEqual([]);
  });

  it('adds, updates, removes games', () => {
    const sg = {
      gameId: 'g1',
      createdAt: 1,
      lastMoveAt: 2,
      iAmHost: true,
      myPlayerId: 'p1' as const,
      myColor: 'red' as const,
      myName: 'A',
      myEmoji: '🦊',
      opponentName: 'B',
      opponentEmoji: '🐺',
      opponentColor: 'blue' as const,
      myScore: 12,
      opponentScore: 8,
      roomCode: 'ABC123',
      state: { fake: true },
      stateKind: 'full' as const,
    };
    saveGame(sg);
    expect(getSavedGames()).toHaveLength(1);
    saveGame({ ...sg, myScore: 20, lastMoveAt: 100 });
    expect(getSavedGames()[0].myScore).toBe(20);
    deleteSavedGame('g1');
    expect(getSavedGames()).toEqual([]);
  });
});

describe('storage — robustness', () => {
  it('tolerates malformed JSON in localStorage', () => {
    mem.setItem('ttr.v1.profiles', '{not valid json');
    expect(getProfiles()).toEqual([]);
  });

  it('no-op when backend is null (SSR)', () => {
    setStorageBackend(null);
    expect(() => upsertProfile({
      id: 'x',
      name: 'x',
      emoji: 'x',
      createdAt: 0,
      stats: emptyStats(),
    })).not.toThrow();
    expect(getProfiles()).toEqual([]);
  });
});
