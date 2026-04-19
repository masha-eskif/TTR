import { calculateFinalScores, type FinalScores } from '../../game/scoring';
import type { PlayerId, ScoreBreakdown } from '../../game/types';
import { useGameStore } from '../../hooks/useGameStore';
import { STRINGS } from '../../i18n/ru';
import { Button } from '../common/Button';

export function EndGameScreen() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const abandonCurrentGame = useGameStore((s) => s.abandonCurrentGame);

  if (!state) return null;

  const scores: FinalScores = calculateFinalScores(state, ctx);

  return (
    <div className="endgame">
      <h1 className="endgame__title">{STRINGS.game.endgame.title}</h1>
      <div className="endgame__subtitle">
        {scores.winner === 'draw' ? (
          STRINGS.game.endgame.draw
        ) : (
          <>
            {STRINGS.game.endgame.winner}:{' '}
            <b>
              {state.players[scores.winner].emoji}{' '}
              {state.players[scores.winner].name}
            </b>
          </>
        )}
      </div>
      <div className="endgame__grid">
        <PlayerColumn
          id="p1"
          breakdown={scores.p1}
          winner={scores.winner === 'p1'}
        />
        <PlayerColumn
          id="p2"
          breakdown={scores.p2}
          winner={scores.winner === 'p2'}
        />
      </div>
      <div className="row row--end">
        <Button variant="primary" size="lg" onClick={abandonCurrentGame}>
          {STRINGS.game.endgame.returnToMenu}
        </Button>
      </div>
    </div>
  );
}

function PlayerColumn({
  id,
  breakdown,
  winner,
}: {
  id: PlayerId;
  breakdown: ScoreBreakdown;
  winner: boolean;
}) {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  if (!state) return null;
  const p = state.players[id];
  return (
    <div className={`endgame__col${winner ? ' endgame__col--winner' : ''}`}>
      <div className="endgame__player">
        <span style={{ fontSize: 34 }}>{p.emoji}</span>
        <div>
          <div style={{ fontFamily: 'var(--serif-display)', fontSize: 20 }}>
            {p.name}
          </div>
          <div className="muted" style={{ fontSize: 12 }}>
            {p.color === 'red' ? 'красный' : 'синий'}
          </div>
        </div>
      </div>

      <div className="endgame__row">
        <span>{STRINGS.game.endgame.routePoints}</span>
        <span>+{breakdown.routePoints}</span>
      </div>
      <div className="endgame__row">
        <span>
          {STRINGS.game.endgame.ticketsDone} ({breakdown.ticketsCompleted.length})
        </span>
        <span style={{ color: '#2a7a2a' }}>+{breakdown.ticketPointsEarned}</span>
      </div>
      <div className="endgame__row">
        <span>
          {STRINGS.game.endgame.ticketsMissed} ({breakdown.ticketsMissed.length})
        </span>
        <span style={{ color: '#a33' }}>−{breakdown.ticketPointsLost}</span>
      </div>
      <div className="endgame__row">
        <span>{STRINGS.game.endgame.stationBonus} ({p.stationsLeft})</span>
        <span>+{breakdown.stationBonus}</span>
      </div>
      {breakdown.globetrotterBonus > 0 && (
        <div className="endgame__row">
          <span>
            {STRINGS.game.endgame.globetrotter}{' '}
            <span className="faint" style={{ fontSize: 11 }}>
              ({STRINGS.game.endgame.globetrotterNote})
            </span>
          </span>
          <span>+{breakdown.globetrotterBonus}</span>
        </div>
      )}
      <div className="endgame__row endgame__total">
        <span>{STRINGS.game.endgame.total}</span>
        <span>{breakdown.total}</span>
      </div>

      {breakdown.ticketsCompleted.length > 0 && (
        <div className="mt-sm">
          <div className="muted" style={{ fontSize: 12 }}>
            Выполненные билеты:
          </div>
          <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 12 }}>
            {breakdown.ticketsCompleted.map((t) => (
              <li key={t.id}>
                {ctx.citiesById[t.from]?.name ?? t.from} →{' '}
                {ctx.citiesById[t.to]?.name ?? t.to} (+{t.points})
              </li>
            ))}
          </ul>
        </div>
      )}
      {breakdown.ticketsMissed.length > 0 && (
        <div className="mt-sm">
          <div className="muted" style={{ fontSize: 12 }}>
            Невыполненные:
          </div>
          <ul style={{ margin: '4px 0', paddingLeft: 18, fontSize: 12, color: '#a33' }}>
            {breakdown.ticketsMissed.map((t) => (
              <li key={t.id}>
                {ctx.citiesById[t.from]?.name ?? t.from} →{' '}
                {ctx.citiesById[t.to]?.name ?? t.to} (−{t.points})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
