import {
  defaultSettings,
  KEYS,
  type Profile,
  type SavedGame,
  type Settings,
} from './schema';

/**
 * Thin localStorage wrapper with JSON (de)serialization and SSR-safety.
 * Tests can inject a fake storage via `setStorageBackend`.
 */

interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let backend: StorageBackend | null =
  typeof globalThis.localStorage !== 'undefined' ? globalThis.localStorage : null;

export function setStorageBackend(b: StorageBackend | null): void {
  backend = b;
}

function readJson<T>(key: string, fallback: T): T {
  if (!backend) return fallback;
  try {
    const raw = backend.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (!backend) return;
  try {
    backend.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[ttr] storage write failed for ${key}:`, err);
  }
}

// ---------- Profiles ----------

export function getProfiles(): Profile[] {
  return readJson<Profile[]>(KEYS.profiles, []);
}

export function saveProfiles(list: Profile[]): void {
  writeJson(KEYS.profiles, list);
}

export function upsertProfile(profile: Profile): Profile[] {
  const list = getProfiles();
  const idx = list.findIndex((p) => p.id === profile.id);
  if (idx >= 0) list[idx] = profile;
  else list.push(profile);
  saveProfiles(list);
  return list;
}

export function deleteProfile(id: string): Profile[] {
  const list = getProfiles().filter((p) => p.id !== id);
  saveProfiles(list);
  if (getActiveProfileId() === id) setActiveProfileId(null);
  return list;
}

export function getActiveProfileId(): string | null {
  if (!backend) return null;
  return backend.getItem(KEYS.activeProfile);
}

export function setActiveProfileId(id: string | null): void {
  if (!backend) return;
  if (id === null) backend.removeItem(KEYS.activeProfile);
  else backend.setItem(KEYS.activeProfile, id);
}

export function getActiveProfile(): Profile | null {
  const id = getActiveProfileId();
  if (!id) return null;
  return getProfiles().find((p) => p.id === id) ?? null;
}

// ---------- Settings ----------

export function getSettings(): Settings {
  return readJson<Settings>(KEYS.settings, defaultSettings());
}

export function saveSettings(s: Settings): void {
  writeJson(KEYS.settings, s);
}

// ---------- Saved games ----------

export function getSavedGames(): SavedGame[] {
  return readJson<SavedGame[]>(KEYS.games, []);
}

export function saveGame(sg: SavedGame): SavedGame[] {
  const list = getSavedGames();
  const idx = list.findIndex((g) => g.gameId === sg.gameId);
  if (idx >= 0) list[idx] = sg;
  else list.push(sg);
  writeJson(KEYS.games, list);
  return list;
}

export function deleteSavedGame(gameId: string): SavedGame[] {
  const list = getSavedGames().filter((g) => g.gameId !== gameId);
  writeJson(KEYS.games, list);
  return list;
}

export function getSavedGame(gameId: string): SavedGame | null {
  return getSavedGames().find((g) => g.gameId === gameId) ?? null;
}

/** Sorted by most recent move first — for the Continue Game list. */
export function listSavedGamesForUi(): SavedGame[] {
  return getSavedGames()
    .slice()
    .sort((a, b) => b.lastMoveAt - a.lastMoveAt);
}
