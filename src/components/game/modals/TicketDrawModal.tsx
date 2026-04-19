import { useEffect, useState } from 'react';
import type { PlayerId } from '../../../game/types';
import {
  INITIAL_TICKETS_KEEP_MIN,
  MIDGAME_TICKETS_KEEP_MIN,
} from '../../../game/constants';
import { useGameStore } from '../../../hooks/useGameStore';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';

export function TicketDrawModal() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const dispatch = useGameStore((s) => s.dispatch);

  const [keep, setKeep] = useState<Record<string, boolean>>({});

  const open = state !== null && state.phase === 'pickingTickets';

  useEffect(() => {
    if (!open || !state) {
      setKeep({});
      return;
    }
    // Default: select all
    const actor: PlayerId = state.turn;
    const next: Record<string, boolean> = {};
    for (const t of state.players[actor].pendingTickets) next[t.id] = true;
    setKeep(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, state?.turn, state?.players.p1.pendingTickets.length, state?.players.p2.pendingTickets.length]);

  if (!open || !state) return null;

  const actor: PlayerId = state.turn;
  const pending = state.players[actor].pendingTickets;
  const minKeep = state.turnMeta.initialTicketDraw
    ? INITIAL_TICKETS_KEEP_MIN
    : MIDGAME_TICKETS_KEEP_MIN;

  const kept = pending.filter((t) => keep[t.id]).length;

  function toggle(id: string) {
    setKeep({ ...keep, [id]: !keep[id] });
  }

  function submit() {
    if (kept < minKeep) return;
    const keptIds = pending.filter((t) => keep[t.id]).map((t) => t.id);
    dispatch({ type: 'KEEP_TICKETS', keep: keptIds }, actor);
  }

  return (
    <Modal
      open={open}
      title={`Выбор билетов — ${state.players[actor].emoji} ${state.players[actor].name}`}
      hideCloseButton
    >
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        {state.turnMeta.initialTicketDraw
          ? 'Начальный выбор: оставьте не меньше 2 билетов.'
          : 'Добор билетов: оставьте не меньше 1 билета.'}
      </p>
      <div className="ticket-list">
        {pending.map((t) => {
          const fromName = ctx.citiesById[t.from]?.name ?? t.from;
          const toName = ctx.citiesById[t.to]?.name ?? t.to;
          const selected = !!keep[t.id];
          return (
            <label
              key={t.id}
              className={`ticket${t.isLong ? ' ticket--long' : ''}${selected ? ' ticket--selected' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="row">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggle(t.id)}
                />
                <div>
                  <div className="ticket__route">
                    {fromName} → {toName}
                  </div>
                  {t.isLong && (
                    <div className="ticket__status">длинный билет</div>
                  )}
                </div>
              </div>
              <div className="ticket__points">{t.points}</div>
            </label>
          );
        })}
      </div>
      <div className="row row--end mt-md">
        <span className="muted" style={{ marginRight: 'auto', fontSize: 13 }}>
          Выбрано {kept} из {pending.length} (минимум {minKeep})
        </span>
        <Button
          variant="primary"
          onClick={submit}
          disabled={kept < minKeep}
        >
          Оставить выбранные
        </Button>
      </div>
    </Modal>
  );
}
