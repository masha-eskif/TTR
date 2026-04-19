import { useEffect, useRef } from 'react';
import type { GameState, PlayerId } from '../game/types';
import { saveGame } from './storage';
import { summarizeSavedGame } from './schema';

export interface AutosaveOptions {
  iAmHost: boolean;
  myPlayerId: PlayerId;
  roomCode: string;
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Debounced autosave: writes the current GameState to localStorage after the
 * UI settles for `debounceMs`. Skips writes when the game is over (the game
 * record is removed separately on victory).
 */
export function useAutosave(
  state: GameState | null,
  opts: AutosaveOptions,
): void {
  const debounceMs = opts.debounceMs ?? 300;
  const enabled = opts.enabled ?? true;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !state || state.phase === 'gameOver') return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      saveGame(
        summarizeSavedGame(state.gameId, state, {
          iAmHost: opts.iAmHost,
          myPlayerId: opts.myPlayerId,
          roomCode: opts.roomCode,
        }),
      );
    }, debounceMs);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [
    state,
    enabled,
    debounceMs,
    opts.iAmHost,
    opts.myPlayerId,
    opts.roomCode,
  ]);
}
