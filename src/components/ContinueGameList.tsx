import { useState } from 'react';
import {
  deleteSavedGame,
  listSavedGamesForUi,
} from '../persistence/storage';
import { useGameStore } from '../hooks/useGameStore';
import { STRINGS } from '../i18n/ru';
import { Button } from './common/Button';

export function ContinueGameList() {
  const goToScreen = useGameStore((s) => s.goToScreen);
  const loadGame = useGameStore((s) => s.loadGame);
  const [tick, setTick] = useState(0);
  void tick;

  const games = listSavedGamesForUi();

  function del(gameId: string) {
    if (!confirm(STRINGS.continue.confirmDelete)) return;
    deleteSavedGame(gameId);
    setTick((n) => n + 1);
  }

  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">{STRINGS.continue.title}</h1>
        <Button variant="ghost" onClick={() => goToScreen('start')}>
          {STRINGS.common.back}
        </Button>
      </header>

      {games.length === 0 && <p className="muted">{STRINGS.start.noSaved}</p>}

      {games.map((g) => (
        <div
          key={g.gameId}
          className="continue-item"
          onClick={() => loadGame(g.gameId)}
        >
          <div className="continue-item__score">
            {g.myScore}
            <span className="muted"> : </span>
            {g.opponentScore}
          </div>
          <div>
            <div>
              <span style={{ fontSize: 18 }}>{g.myEmoji}</span>{' '}
              <b>{g.myName}</b>{' '}
              <span className="muted">{STRINGS.continue.vs}</span>{' '}
              <span style={{ fontSize: 18 }}>{g.opponentEmoji}</span>{' '}
              <b>{g.opponentName}</b>
            </div>
            <div className="continue-item__meta">
              {STRINGS.continue.lastMove}: {relativeTime(g.lastMoveAt)}
              {' · '}
              {g.iAmHost ? STRINGS.continue.host : STRINGS.continue.guest}
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="continue-item__delete"
            onClick={(e) => {
              e.stopPropagation();
              del(g.gameId);
            }}
          >
            {STRINGS.common.delete}
          </Button>
        </div>
      ))}
    </div>
  );
}

function relativeTime(t: number): string {
  const diff = Date.now() - t;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const d = Math.round(hr / 24);
  return `${d} дн назад`;
}
