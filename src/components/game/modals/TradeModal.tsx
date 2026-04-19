import { useMemo, useState } from 'react';
import type { CardColor, PlayerId } from '../../../game/types';
import { validate } from '../../../game/validate';
import { useGameStore } from '../../../hooks/useGameStore';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { CardSelector, sumSelected, toSpend } from './CardSelector';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TradeModal({ open, onClose }: Props) {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const dispatch = useGameStore((s) => s.dispatch);

  const [give, setGive] = useState<Partial<Record<CardColor, number>>>({});
  const [receive, setReceive] = useState<Partial<Record<CardColor, number>>>({});

  const actor: PlayerId | null = state?.turn ?? null;
  const opp: PlayerId | null = actor ? (actor === 'p1' ? 'p2' : 'p1') : null;

  const verdict = useMemo(() => {
    if (!state || !actor) return { ok: false as const, reason: '' };
    const giveSpend = toSpend(give);
    const recvSpend = toSpend(receive);
    const giveObj: Partial<Record<CardColor, number>> = {};
    for (const s of giveSpend) giveObj[s.color] = s.count;
    const recvObj: Partial<Record<CardColor, number>> = {};
    for (const s of recvSpend) recvObj[s.color] = s.count;
    return validate(
      state,
      { type: 'TRADE_CARDS', give: giveObj, receive: recvObj },
      actor,
      ctx,
    );
  }, [state, give, receive, actor, ctx]);

  if (!state || !actor || !opp) return null;

  function confirm() {
    if (!verdict.ok) return;
    const giveObj: Partial<Record<CardColor, number>> = {};
    for (const s of toSpend(give)) giveObj[s.color] = s.count;
    const recvObj: Partial<Record<CardColor, number>> = {};
    for (const s of toSpend(receive)) recvObj[s.color] = s.count;
    dispatch({ type: 'TRADE_CARDS', give: giveObj, receive: recvObj });
    setGive({});
    setReceive({});
    onClose();
  }

  const player = state.players[actor];
  const other = state.players[opp];

  return (
    <Modal open={open} title="Обмен картами" onClose={onClose}>
      <h4 style={{ margin: '6px 0' }}>Вы отдаёте (рука: {player.name})</h4>
      <CardSelector hand={player.hand} selected={give} onChange={setGive} />

      <h4 style={{ margin: '16px 0 6px' }}>Вы получаете от {other.name}</h4>
      <CardSelector hand={other.hand} selected={receive} onChange={setReceive} />

      <div
        className="mt-md"
        style={{ fontSize: 13, color: verdict.ok ? undefined : '#a33' }}
      >
        {verdict.ok
          ? `Отдаёте ${sumSelected(give)}, получаете ${sumSelected(receive)}`
          : verdict.reason}
      </div>
      <div className="row row--end mt-md">
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" onClick={confirm} disabled={!verdict.ok}>
          Обменяться
        </Button>
      </div>
    </Modal>
  );
}
