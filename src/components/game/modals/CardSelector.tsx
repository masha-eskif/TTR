import type { CardColor, CardSpend, Hand } from '../../../game/types';
import { ALL_CARD_COLORS } from '../../../game/constants';
import { cardColorName } from '../../../i18n/ru';

interface Props {
  hand: Hand;
  selected: Partial<Record<CardColor, number>>;
  onChange: (next: Partial<Record<CardColor, number>>) => void;
  disabledColors?: Set<CardColor>;
}

/** Card-spend selector — increment/decrement counts per color. */
export function CardSelector({
  hand,
  selected,
  onChange,
  disabledColors,
}: Props) {
  function adjust(color: CardColor, delta: number) {
    const cur = selected[color] ?? 0;
    const max = hand[color];
    const next = Math.max(0, Math.min(max, cur + delta));
    onChange({ ...selected, [color]: next });
  }

  return (
    <div className="hand-grid">
      {ALL_CARD_COLORS.map((c) => {
        const have = hand[c] ?? 0;
        const chose = selected[c] ?? 0;
        const disabled = have === 0 || disabledColors?.has(c);
        return (
          <div
            key={c}
            className={`hand-chip card-chip--${c}${disabled ? ' hand-chip--disabled' : ''}`}
          >
            <span style={{ fontSize: 13 }}>
              {c === 'locomotive' ? '🚂' : cardColorName(c).slice(0, 3)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                type="button"
                style={btn}
                onClick={() => adjust(c, -1)}
                disabled={chose === 0}
              >
                −
              </button>
              <span style={{ minWidth: 28, textAlign: 'center' }}>
                {chose}/{have}
              </span>
              <button
                type="button"
                style={btn}
                onClick={() => adjust(c, +1)}
                disabled={disabled || chose >= have}
              >
                +
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function toSpend(
  selected: Partial<Record<CardColor, number>>,
): CardSpend[] {
  const out: CardSpend[] = [];
  for (const k of Object.keys(selected) as CardColor[]) {
    const n = selected[k] ?? 0;
    if (n > 0) out.push({ color: k, count: n });
  }
  return out;
}

export function sumSelected(selected: Partial<Record<CardColor, number>>): number {
  let n = 0;
  for (const v of Object.values(selected)) n += v ?? 0;
  return n;
}

const btn: React.CSSProperties = {
  width: 22,
  height: 22,
  border: '1px solid rgba(0,0,0,0.3)',
  borderRadius: 4,
  background: 'rgba(255,255,255,0.9)',
  color: '#2b1c0d',
  fontWeight: 700,
  cursor: 'pointer',
  padding: 0,
  lineHeight: 1,
};
