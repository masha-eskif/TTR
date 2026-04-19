import { useState } from 'react';
import { useAutosave } from '../../persistence/autosave';
import { useGameStore } from '../../hooks/useGameStore';
import { ActionBar } from './ActionBar';
import { ConnectionBadge } from './ConnectionBadge';
import { EndGameScreen } from './EndGameScreen';
import { FaceUpMarket } from './FaceUpMarket';
import { GameBoard } from './GameBoard';
import { GameLog } from './GameLog';
import { OpponentPanel } from './OpponentPanel';
import { PlayerHand } from './PlayerHand';
import { ScorePanel } from './ScorePanel';
import { TicketPanel } from './TicketPanel';
import { TurnBanner } from './TurnBanner';
import { BuildStationModal } from './modals/BuildStationModal';
import { ClaimRouteModal } from './modals/ClaimRouteModal';
import { TicketDrawModal } from './modals/TicketDrawModal';
import { TradeModal } from './modals/TradeModal';
import { TunnelModal } from './modals/TunnelModal';

export function GameScreen() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const iAmHost = useGameStore((s) => s.iAmHost);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const roomCode = useGameStore((s) => s.roomCode);
  const mode = useGameStore((s) => s.mode);

  const [tradeOpen, setTradeOpen] = useState(false);

  useAutosave(state, {
    iAmHost,
    myPlayerId: myPlayerId ?? 'p1',
    roomCode,
    enabled: mode !== 'guest', // guests write when STATE arrives
  });

  if (!state) return null;

  if (state.phase === 'gameOver') {
    return <EndGameScreen />;
  }

  // Offline (hot-seat): show active player's view.
  // Online: always show my own view.
  const viewPlayerId = myPlayerId ?? state.turn;
  const viewPlayer = state.players[viewPlayerId];
  const opponent = state.players[viewPlayerId === 'p1' ? 'p2' : 'p1'];

  return (
    <>
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid var(--line-soft)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <TurnBanner />
        </div>
        <ConnectionBadge />
      </div>
      <div className="game-layout">
        <GameBoard />
        <div className="game-side">
          <ScorePanel />
          <OpponentPanel opponent={opponent} />
          <FaceUpMarket />
          <PlayerHand
            player={viewPlayer}
            title={`${viewPlayer.emoji} ${viewPlayer.name} — рука`}
          />
          <TicketPanel
            state={state}
            ctx={ctx}
            playerId={viewPlayerId}
            title={`${viewPlayer.emoji} билеты`}
          />
          <ActionBar onOpenTrade={() => setTradeOpen(true)} />
          <GameLog />
        </div>
      </div>

      <ClaimRouteModal />
      <BuildStationModal />
      <TicketDrawModal />
      <TunnelModal />
      <TradeModal open={tradeOpen} onClose={() => setTradeOpen(false)} />
      <ErrorToast />
    </>
  );
}

function ErrorToast() {
  const lastError = useGameStore((s) => s.lastError);
  const setError = useGameStore((s) => s.setError);

  if (!lastError) return null;
  return (
    <div className="toast" onClick={() => setError(null)}>
      {lastError}
    </div>
  );
}
