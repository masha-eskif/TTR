import type {
  City,
  GameState,
  RouteColor,
  RouteDef,
} from '../../../game/types';

interface Props {
  route: RouteDef;
  from: City;
  to: City;
  state: GameState;
  onClick?: (id: string) => void;
  selected?: boolean;
}

const COLOR_VAR: Record<RouteColor, string> = {
  purple: 'var(--car-purple)',
  white: 'var(--car-white)',
  blue: 'var(--car-blue)',
  yellow: 'var(--car-yellow)',
  orange: 'var(--car-orange)',
  black: 'var(--car-black)',
  red: 'var(--car-red)',
  green: 'var(--car-green)',
  gray: 'var(--car-gray)',
};

export function RouteView({ route, from, to, state, onClick, selected }: Props) {
  const owner = state.routeOwner[route.id];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

  // Start/end offset: leave 12px near each city so segments don't overlap the marker
  const cityPad = 14;
  const usableLen = Math.max(length - cityPad * 2, 10);
  const segGap = 4;
  const segLen = Math.max(
    8,
    (usableLen - segGap * (route.length - 1)) / route.length,
  );
  const segW = Math.min(segLen, 28);
  const segH = 12;

  const offsetY = route.parallel
    ? (route.id.localeCompare(route.parallel) < 0 ? -10 : 10)
    : 0;

  const fillColor = owner
    ? state.players[owner].color === 'red'
      ? 'var(--player-red)'
      : 'var(--player-blue)'
    : COLOR_VAR[route.color];

  const segments = Array.from({ length: route.length }, (_, i) => {
    const xFromStart = cityPad + i * (segW + segGap);
    return (
      <rect
        key={i}
        x={xFromStart}
        y={-segH / 2 + offsetY}
        width={segW}
        height={segH}
        rx={2}
        fill={fillColor}
        className={`svg-route-seg${owner ? ` svg-route-seg--claimed-${state.players[owner].color}` : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!owner && onClick) onClick(route.id);
        }}
      />
    );
  });

  return (
    <g transform={`translate(${from.x} ${from.y}) rotate(${angleDeg})`}>
      {/* Ferry ~ indicator */}
      {route.isFerry && (
        <text
          x={usableLen / 2 + cityPad}
          y={offsetY + (offsetY < 0 ? -10 : 18)}
          className="svg-route-badge"
          textAnchor="middle"
        >
          {'⚓'.repeat(route.locomotivesRequired)}
        </text>
      )}
      {/* Tunnel indicator: two dashed lines hugging the segments + a small
          mountain icon so the route is obviously a tunnel, not a regular track. */}
      {route.isTunnel && !owner && (
        <g pointerEvents="none">
          <line
            x1={cityPad}
            y1={offsetY - segH / 2 - 4}
            x2={cityPad + usableLen}
            y2={offsetY - segH / 2 - 4}
            stroke="#2b1c0d"
            strokeWidth={1.8}
            strokeDasharray="5 3"
          />
          <line
            x1={cityPad}
            y1={offsetY + segH / 2 + 4}
            x2={cityPad + usableLen}
            y2={offsetY + segH / 2 + 4}
            stroke="#2b1c0d"
            strokeWidth={1.8}
            strokeDasharray="5 3"
          />
          <g transform={`translate(${cityPad + usableLen / 2}, ${offsetY - segH / 2 - 10})`}>
            <path
              d="M -7 2 L -3 -4 L 0 -1 L 4 -6 L 8 2 Z"
              fill="#6b4226"
              stroke="#2b1c0d"
              strokeWidth={0.7}
              strokeLinejoin="round"
            />
          </g>
        </g>
      )}
      {segments}
      {selected && (
        <rect
          x={cityPad - 2}
          y={-segH / 2 + offsetY - 2}
          width={usableLen + 4}
          height={segH + 4}
          className="svg-route-glow"
          rx={3}
        />
      )}
    </g>
  );
}
