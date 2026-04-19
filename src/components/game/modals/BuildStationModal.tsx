import { useMemo, useState } from 'react';
import type { CardColor } from '../../../game/types';
import { STATION_BUILD_COST } from '../../../game/constants';
import { validate } from '../../../game/validate';
import { useGameStore } from '../../../hooks/useGameStore';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { CardSelector, sumSelected, toSpend } from './CardSelector';

export function BuildStationModal() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const selectedCityId = useGameStore((s) => s.selectedCityId);
  const selectCity = useGameStore((s) => s.selectCity);
  const dispatch = useGameStore((s) => s.dispatch);

  const [selected, setSelected] = useState<Partial<Record<CardColor, number>>>(
    {},
  );

  const open =
    state !== null &&
    state.phase === 'idle' &&
    selectedCityId !== null &&
    ctx.citiesById[selectedCityId] !== undefined;

  function close() {
    setSelected({});
    selectCity(null);
  }

  const actorId = state?.turn ?? 'p1';
  const player = state ? state.players[actorId] : null;
  const stationsBuilt = player?.stations.length ?? 0;
  const costIdx = Math.min(stationsBuilt + 1, 3);
  const requiredCount = STATION_BUILD_COST[costIdx];

  const verdict = useMemo(() => {
    if (!state || !selectedCityId) return { ok: false as const, reason: '' };
    if (sumSelected(selected) !== requiredCount) {
      return {
        ok: false as const,
        reason: `Нужно выбрать ${requiredCount} карт(ы) одного цвета`,
      };
    }
    return validate(
      state,
      {
        type: 'BUILD_STATION',
        cityId: selectedCityId,
        cards: toSpend(selected),
      },
      actorId,
      ctx,
    );
  }, [state, selected, actorId, selectedCityId, requiredCount, ctx]);

  if (!open || !state || !player || !selectedCityId) return null;
  const cityName = ctx.citiesById[selectedCityId]?.name ?? selectedCityId;

  function confirm() {
    if (!verdict.ok) return;
    dispatch({
      type: 'BUILD_STATION',
      cityId: selectedCityId!,
      cards: toSpend(selected),
    });
    setSelected({});
  }

  return (
    <Modal open={open} title="Поставить вокзал" onClose={close}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 18, fontFamily: 'var(--serif-display)' }}>
          {cityName}
        </div>
        <div className="muted" style={{ fontSize: 13 }}>
          Стоимость: {requiredCount} карт(ы) одного цвета
          {state.houseRules.infiniteStations && ' · вокзалы безлимитные'}
        </div>
      </div>

      <CardSelector
        hand={player.hand}
        selected={selected}
        onChange={setSelected}
      />

      <div
        className="mt-md"
        style={{ fontSize: 13, color: verdict.ok ? undefined : '#a33' }}
      >
        {verdict.ok
          ? `Отдаёте: ${sumSelected(selected)} / ${requiredCount} карт`
          : verdict.reason}
      </div>

      <div className="row row--end mt-md">
        <Button variant="ghost" onClick={close}>
          Отмена
        </Button>
        <Button variant="primary" onClick={confirm} disabled={!verdict.ok}>
          Построить
        </Button>
      </div>
    </Modal>
  );
}
