import { v4 as uuidv4 } from 'uuid';
import {
  emptyStats,
  type Profile,
  type ProfileStats,
} from '../persistence/schema';
import {
  deleteProfile as deleteProfileStorage,
  getProfiles,
  setActiveProfileId,
  upsertProfile,
} from '../persistence/storage';

export interface CreateProfileInput {
  name: string;
  emoji: string;
}

export function createProfile(input: CreateProfileInput, now: number = Date.now()): Profile {
  const profile: Profile = {
    id: uuidv4(),
    name: input.name.trim(),
    emoji: input.emoji,
    createdAt: now,
    stats: emptyStats(),
  };
  upsertProfile(profile);
  if (!hasActiveProfile()) setActiveProfileId(profile.id);
  return profile;
}

export function renameProfile(id: string, name: string, emoji?: string): Profile | null {
  const list = getProfiles();
  const p = list.find((x) => x.id === id);
  if (!p) return null;
  const updated: Profile = {
    ...p,
    name: name.trim(),
    emoji: emoji ?? p.emoji,
  };
  upsertProfile(updated);
  return updated;
}

export function removeProfile(id: string): void {
  deleteProfileStorage(id);
}

export function listProfiles(): Profile[] {
  return getProfiles();
}

export function hasActiveProfile(): boolean {
  const list = getProfiles();
  return list.length > 0;
}

// ---------- stats recording ----------

export interface GameResult {
  profileId: string;
  finalScore: number;
  won: boolean;
  draw: boolean;
  ticketsCompleted: number;
  ticketsMissed: number;
  routesClaimed: number;
  longestSingleRoute: number;
}

/**
 * Merge the outcome of a finished game into the profile's lifetime stats.
 * No-op for unknown profileId (guest profile etc.).
 */
export function recordGameResult(result: GameResult): Profile | null {
  const list = getProfiles();
  const p = list.find((x) => x.id === result.profileId);
  if (!p) return null;
  const stats: ProfileStats = {
    gamesPlayed: p.stats.gamesPlayed + 1,
    wins: p.stats.wins + (result.won && !result.draw ? 1 : 0),
    losses: p.stats.losses + (!result.won && !result.draw ? 1 : 0),
    draws: p.stats.draws + (result.draw ? 1 : 0),
    totalScore: p.stats.totalScore + result.finalScore,
    bestScore: Math.max(p.stats.bestScore, result.finalScore),
    ticketsCompleted: p.stats.ticketsCompleted + result.ticketsCompleted,
    ticketsMissed: p.stats.ticketsMissed + result.ticketsMissed,
    routesClaimed: p.stats.routesClaimed + result.routesClaimed,
    longestSingleRoute: Math.max(
      p.stats.longestSingleRoute,
      result.longestSingleRoute,
    ),
  };
  const updated: Profile = { ...p, stats };
  upsertProfile(updated);
  return updated;
}
