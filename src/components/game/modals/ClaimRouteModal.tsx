import { useMemo, useState } from 'react';
import type { CardColor, RouteDef } from '../../../game/types';
import { validate } from '../../../game/validate';
import { useGameStore } from '../../../hooks/useGameStore';
import { cardColorName, routeColorName } from '../../../i18n/ru';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { CardSelector, sumSelected, toSpend } from './CardSelector';

export function ClaimRouteModal() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const selectedRouteId = useGameStore((s) => s.selectedRouteId);
  const selectRoute = useGameStore((s) => s.selectRoute);
  const dispatch = useGameStore((s) => s.dispatch);

  const [selected, setSelected] = useState<Partial<Record<CardColor, number>>>(
    {},
  );

  const route: RouteDef | null = selectedRouteId
    ? ctx.routesById[selectedRouteId]
    : null;

  const open = state !== null && state.phase === 'idle' && route !== null;

  function close() {
    setSelected({});
    selectRoute(null);
  }

  const actorId = state?.turn ?? 'p1';
  const verdict = useMemo(() => {
    if (!state || !route) return { ok: false as const, reason: '' };
    const cards = toSpend(selected);
    if (sumSelected(selected) !== route.length) {
      return { ok: false as const, reason: `Нужно выбрать ${route.length} карт` };
    }
    return validate(
      state,
      { type: 'CLAIM_ROUTE', routeId: route.id, cards },
      actorId,
      ctx,
    );
  }, [state, route, selected, actorId, ctx]);

  if (!open || !state || !route) return null;
  const fromName = ctx.citiesById[route.from]?.name ?? route.from;
  const toName = ctx.citiesById[route.to]?.name ?? route.to;
  const player = state.players[actorId];

  function confirm() {
    if (!verdict.ok || !route) return;
    dispatch({
      type: 'CLAIM_ROUTE',
      routeId: route.id,
      cards: toSpend(selected),
    });
    setSelected({});
  }

  return (
    <Modal open={open} title="Заклеймить маршрут" onClose={close}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--serif-display)' }}>
          {fromName} → {toName}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Длина {route.length}, цвет:{' '}
          <span className={`card-chip card-chip--${route.color}`}>
            {routeColorName(route.color)}
          </span>
          {route.isFerry && (
            <>
              {' '}· паром (нужно {route.locomotivesRequired} 🚂)
            </>
          )}
          {route.isTunnel && ' · тоннель'}
        </div>
      </div>

      <CardSelector
        hand={player.hand}
        selected={selected}
        onChange={setSelected}
      />

      <div
        className={`mt-md ${verdict.ok ? 'muted' : ''}`}
        style={{ fontSize: 13, color: verdict.ok ? undefined : '#a33' }}
      >
        {verdict.ok
          ? `Отдаёте: ${sumSelected(selected)} / ${route.length} карт`
          : verdict.reason}
      </div>

      <div className="row row--end mt-md">
        <Button variant="ghost" onClick={close}>
          Отмена
        </Button>
        <Button variant="primary" onClick={confirm} disabled={!verdict.ok}>
          Заклеймить
        </Button>
      </div>

      <p className="faint mt-sm" style={{ fontSize: 11 }}>
        Цвета карт: {(Object.keys(player.hand) as CardColor[])
          .filter((c) => player.hand[c] > 0)
          .map(cardColorName)
          .join(', ') || 'рука пуста'}
      </p>
    </Modal>
  );
}
