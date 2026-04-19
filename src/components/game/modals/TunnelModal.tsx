import { useMemo, useState } from 'react';
import type { CardColor } from '../../../game/types';
import { validate } from '../../../game/validate';
import { useGameStore } from '../../../hooks/useGameStore';
import { cardColorName } from '../../../i18n/ru';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { CardSelector, sumSelected, toSpend } from './CardSelector';

export function TunnelModal() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const dispatch = useGameStore((s) => s.dispatch);

  const [extra, setExtra] = useState<Partial<Record<CardColor, number>>>({});

  const open =
    state !== null &&
    state.phase === 'tunnelResolution' &&
    state.pendingTunnel !== null;

  if (!open || !state?.pendingTunnel) return null;

  const pt = state.pendingTunnel;
  const actor = pt.initiator;
  const route = ctx.routesById[pt.routeId];
  const fromName = ctx.citiesById[route?.from ?? '']?.name ?? route?.from;
  const toName = ctx.citiesById[route?.to ?? '']?.name ?? route?.to;

  // Player's effective hand = actual hand minus the already-proposed cards
  const effectiveHand = { ...state.players[actor].hand };
  for (const s of pt.proposedCards) {
    effectiveHand[s.color] -= s.count;
  }

  const dominant = pt.proposedCards.find((c) => c.color !== 'locomotive')?.color;

  const verdict = useMemo(() => {
    if (!state) return { ok: false as const, reason: '' };
    return validate(
      state,
      { type: 'TUNNEL_CONFIRM', extraCards: toSpend(extra) },
      actor,
      ctx,
    );
  }, [state, extra, actor, ctx]);

  // Dim colors that don't match tunnel color rule (to guide the user)
  const disabledColors = new Set<CardColor>();
  for (const c of [
    'purple',
    'white',
    'blue',
    'yellow',
    'orange',
    'black',
    'red',
    'green',
  ] as CardColor[]) {
    if (dominant && c !== dominant) disabledColors.add(c);
    if (!dominant && c !== 'locomotive') disabledColors.add(c);
  }

  function pay() {
    if (!verdict.ok) return;
    dispatch({ type: 'TUNNEL_CONFIRM', extraCards: toSpend(extra) }, actor);
    setExtra({});
  }
  function cancel() {
    dispatch({ type: 'TUNNEL_CANCEL' }, actor);
    setExtra({});
  }

  return (
    <Modal open={open} title="Тоннель" hideCloseButton>
      <div>
        <div style={{ fontSize: 16, fontFamily: 'var(--serif-display)' }}>
          {fromName} → {toName}
        </div>
      </div>
      <div className="mt-sm">
        Выложены три доп. карты:
        <div className="row mt-sm" style={{ gap: 6 }}>
          {pt.extrasDrawn.map((c, i) => (
            <span key={i} className={`card-chip card-chip--${c}`}>
              {c === 'locomotive' ? '🚂' : cardColorName(c).slice(0, 3)}
            </span>
          ))}
        </div>
      </div>
      {pt.extraCost === 0 ? (
        <p className="mt-md">Тоннель заклеймлен без доплаты.</p>
      ) : (
        <>
          <p className="mt-md">
            Нужно доплатить <b>{pt.extraCost}</b> карт(ы){' '}
            {dominant ? (
              <>
                цвета{' '}
                <span className={`card-chip card-chip--${dominant}`}>
                  {cardColorName(dominant)}
                </span>
              </>
            ) : (
              'локомотив(ов)'
            )}{' '}
            или локомотивами.
          </p>
          <CardSelector
            hand={effectiveHand}
            selected={extra}
            onChange={setExtra}
            disabledColors={disabledColors}
          />
          <div
            className="mt-sm"
            style={{ fontSize: 13, color: verdict.ok ? undefined : '#a33' }}
          >
            {verdict.ok
              ? `Доплачиваете ${sumSelected(extra)} / ${pt.extraCost}`
              : verdict.reason}
          </div>
        </>
      )}
      <div className="row row--end mt-md">
        <Button variant="ghost" onClick={cancel}>
          Отказаться
        </Button>
        {pt.extraCost > 0 && (
          <Button variant="primary" onClick={pay} disabled={!verdict.ok}>
            Заплатить и заклеймить
          </Button>
        )}
      </div>
    </Modal>
  );
}
