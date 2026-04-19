import { useGameStore } from '../../hooks/useGameStore';
import { STRINGS } from '../../i18n/ru';

export function TurnBanner() {
  const state = useGameStore((s) => s.state);
  if (!state) return null;

  const inFinalRound = state.finalRoundTriggeredBy !== null;
  const active = state.players[state.turn];

  return (
    <div className={`turn-banner${inFinalRound ? ' turn-banner--final' : ''}`}>
      <span className="turn-banner__emoji">{active.emoji}</span>
      <span className="turn-banner__text">
        {STRINGS.game.turnOf}: {active.name}
      </span>
      <span className="turn-banner__phase">
        {STRINGS.game.phase[state.phase]}
        {inFinalRound && ' · ' + STRINGS.game.finalRoundBanner}
      </span>
    </div>
  );
}
