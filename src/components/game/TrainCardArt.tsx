import type { CardColor } from '../../game/types';

interface Props {
  color: CardColor;
  width?: number;
  height?: number;
}

const COLOR_HEX: Record<Exclude<CardColor, 'locomotive'>, string> = {
  purple: '#8b4cad',
  white: '#f0ead2',
  blue: '#4a90d9',
  yellow: '#f0c858',
  orange: '#e6892a',
  black: '#2b2318',
  red: '#d9534f',
  green: '#5ca364',
};

const COLOR_LABEL: Record<CardColor, string> = {
  purple: 'ФИОЛ.',
  white: 'БЕЛЫЙ',
  blue: 'СИНИЙ',
  yellow: 'ЖЁЛТЫЙ',
  orange: 'ОРАНЖ.',
  black: 'ЧЁРНЫЙ',
  red: 'КРАСНЫЙ',
  green: 'ЗЕЛЁНЫЙ',
  locomotive: 'ПАРОВОЗ',
};

// Для каких цветов подписи читаются лучше тёмным текстом (светлые фоны).
const DARK_LABEL_COLORS = new Set<CardColor>(['white', 'yellow', 'locomotive']);

function labelColor(color: CardColor): string {
  return DARK_LABEL_COLORS.has(color) ? '#2b1c0d' : '#fff';
}

function bandStroke(color: CardColor): string {
  if (color === 'locomotive') return '#a47a28';
  if (color === 'white') return '#b0a070';
  return 'rgba(0, 0, 0, 0.3)';
}

export function TrainCardArt({ color, width = 100, height = 140 }: Props) {
  const isLoco = color === 'locomotive';
  const bandFill = isLoco ? '#d4a73a' : COLOR_HEX[color as Exclude<CardColor, 'locomotive'>];
  const skyFill = isLoco ? '#ffd9a0' : '#c4e0ec';
  const sunFill = isLoco ? '#f08c3a' : '';
  const sunOpacity = isLoco ? 0.7 : 0;

  return (
    <svg viewBox="0 0 100 140" width={width} height={height} className="train-card-art">
      {/* Paper background */}
      <rect x="2" y="2" width="96" height="136" rx="6" fill="#efe0bb" stroke="#2b1c0d" strokeWidth="1.5" />
      <rect x="2" y="2" width="6" height="136" rx="2" fill="#2b1c0d" opacity="0.08" />

      {/* Sky + hills */}
      <rect x="8" y="15" width="84" height="70" fill={skyFill} opacity="0.55" />
      {isLoco && <circle cx="80" cy="28" r="6" fill={sunFill} opacity={sunOpacity} />}
      <path d="M 8 85 Q 30 75, 50 82 T 92 78 L 92 85 Z" fill="#8a6b48" opacity="0.45" />
      {/* Rails */}
      <line x1="8" y1="90" x2="92" y2="90" stroke="#3a2818" strokeWidth="0.5" />
      <line x1="8" y1="93" x2="92" y2="93" stroke="#3a2818" strokeWidth="0.5" />
      <g stroke="#3a2818" strokeWidth="0.4">
        {[15, 25, 35, 45, 55, 65, 75, 85].map((x) => (
          <line key={x} x1={x} y1={89} x2={x} y2={94} />
        ))}
      </g>

      {/* Main art: wagon or locomotive */}
      {isLoco ? <LocomotiveArt /> : <WagonArt fill={COLOR_HEX[color as Exclude<CardColor, 'locomotive'>]} />}

      {/* Bottom colour band + label */}
      <rect x="2" y="108" width="96" height="30" fill={bandFill} />
      <rect x="2" y="108" width="96" height="2.5" fill={bandStroke(color)} opacity="0.6" />
      <text
        x="50"
        y="128"
        textAnchor="middle"
        fontSize="12"
        fontFamily="Georgia, serif"
        fontWeight="bold"
        fill={labelColor(color)}
      >
        {COLOR_LABEL[color]}
      </text>
    </svg>
  );
}

function WagonArt({ fill }: { fill: string }) {
  return (
    <g transform="translate(50 72)">
      <rect
        x="-30"
        y="-11"
        width="60"
        height="20"
        rx="3"
        fill={fill}
        stroke="#2b1c0d"
        strokeWidth="1.3"
      />
      {[-25, -13, -1, 11].map((x) => (
        <rect
          key={x}
          x={x}
          y="-7"
          width="9"
          height="8"
          rx="1"
          fill="#fff"
          opacity="0.85"
          stroke="#2b1c0d"
          strokeWidth="0.4"
        />
      ))}
      {[-20, -5, 10, 22].map((cx) => (
        <circle key={cx} cx={cx} cy="12" r="4" fill="#2b1c0d" />
      ))}
    </g>
  );
}

function LocomotiveArt() {
  return (
    <g transform="translate(50 70)">
      {/* Тяга */}
      <rect x="-30" y="7" width="60" height="2.5" fill="#8a3a22" />
      {/* Колёса */}
      <circle cx="-22" cy="8" r="6" fill="#1a1108" stroke="#2b1c0d" strokeWidth="0.6" />
      <circle cx="-22" cy="8" r="2.5" fill="#d9534f" />
      <line x1="-22" y1="2" x2="-22" y2="14" stroke="#d9534f" strokeWidth="0.7" />
      <line x1="-28" y1="8" x2="-16" y2="8" stroke="#d9534f" strokeWidth="0.7" />
      <circle cx="-6" cy="8" r="6" fill="#1a1108" stroke="#2b1c0d" strokeWidth="0.6" />
      <circle cx="-6" cy="8" r="2.5" fill="#d9534f" />
      <line x1="-6" y1="2" x2="-6" y2="14" stroke="#d9534f" strokeWidth="0.7" />
      <line x1="-12" y1="8" x2="0" y2="8" stroke="#d9534f" strokeWidth="0.7" />
      <circle cx="14" cy="7" r="8" fill="#1a1108" stroke="#2b1c0d" strokeWidth="0.6" />
      <circle cx="14" cy="7" r="3.5" fill="#d9534f" />
      <line x1="14" y1="-1" x2="14" y2="15" stroke="#d9534f" strokeWidth="0.8" />
      <line x1="6" y1="7" x2="22" y2="7" stroke="#d9534f" strokeWidth="0.8" />
      {/* Котёл */}
      <rect x="-30" y="-6" width="44" height="12" rx="5" fill="#2b2318" stroke="#1a1108" strokeWidth="0.8" />
      <circle cx="-30" cy="0" r="6.5" fill="#3a2f1e" stroke="#1a1108" strokeWidth="0.8" />
      <circle cx="-33" cy="0" r="2.6" fill="#ffd97a" stroke="#2b1c0d" strokeWidth="0.5" />
      <rect x="-18" y="-6" width="1.2" height="12" fill="#d9534f" opacity="0.7" />
      <rect x="-6" y="-6" width="1.2" height="12" fill="#d9534f" opacity="0.7" />
      {/* Кабина */}
      <path d="M 12 -14 L 30 -14 L 30 6 L 12 6 Z" fill="#2b2318" stroke="#1a1108" strokeWidth="0.8" />
      <path d="M 10 -14 L 32 -14 L 30 -18 L 12 -18 Z" fill="#1a1108" />
      <rect x="15" y="-10" width="11" height="8" fill="#a8c8d8" stroke="#1a1108" strokeWidth="0.5" />
      {/* Труба */}
      <rect x="-16" y="-18" width="6" height="14" fill="#2b2318" stroke="#1a1108" strokeWidth="0.6" />
      <rect x="-18" y="-20" width="10" height="3" fill="#1a1108" />
      {/* Дым */}
      <g opacity="0.9">
        <circle cx="-12" cy="-24" r="4" fill="#eaeaea" />
        <circle cx="-7" cy="-28" r="5" fill="#dcdcdc" />
        <circle cx="0" cy="-31" r="5.5" fill="#d0d0d0" opacity="0.8" />
        <circle cx="-16" cy="-28" r="3" fill="#eaeaea" opacity="0.85" />
        <circle cx="4" cy="-25" r="3.5" fill="#dcdcdc" opacity="0.75" />
      </g>
    </g>
  );
}
