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

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return h;
}

export function RouteView({ route, from, to, state, onClick, selected }: Props) {
  const owner = state.routeOwner[route.id];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const chord = Math.hypot(dx, dy);

  // Unit perpendicular (rotate 90° CCW from from→to)
  const nx = -dy / chord;
  const ny = dx / chord;

  // Which side does the route bow toward?
  // Parallel pair → opposite sides. Solo route → deterministic small bow.
  const perpDir = route.parallel
    ? route.id.localeCompare(route.parallel) < 0
      ? -1
      : 1
    : (hash(route.id) & 1) === 0
      ? -1
      : 1;

  // Bow magnitude.
  // Parallel routes need bigger offset so the two arcs don't kiss the wagons.
  const baseOffset = route.parallel ? 18 : 4;
  const offset = baseOffset * perpDir;

  // Quadratic Bezier control point — midpoint pushed perpendicular by `offset`.
  const ctrlX = (from.x + to.x) / 2 + nx * offset;
  const ctrlY = (from.y + to.y) / 2 + ny * offset;

  const pointOnCurve = (t: number): { x: number; y: number } => {
    const m = 1 - t;
    return {
      x: m * m * from.x + 2 * m * t * ctrlX + t * t * to.x,
      y: m * m * from.y + 2 * m * t * ctrlY + t * t * to.y,
    };
  };
  const tangentOnCurve = (t: number): { x: number; y: number } => {
    const tx = 2 * (1 - t) * (ctrlX - from.x) + 2 * t * (to.x - ctrlX);
    const ty = 2 * (1 - t) * (ctrlY - from.y) + 2 * t * (to.y - ctrlY);
    const len = Math.hypot(tx, ty) || 1;
    return { x: tx / len, y: ty / len };
  };

  // Wagon dimensions and packing
  const cityPad = 14;
  const usable = Math.max(chord - cityPad * 2, 10);
  const segGap = 4;
  const segW = Math.min(
    28,
    Math.max(8, (usable - segGap * (route.length - 1)) / route.length),
  );
  const segH = 14;

  const fillColor = owner
    ? state.players[owner].color === 'red'
      ? 'var(--player-red)'
      : 'var(--player-blue)'
    : COLOR_VAR[route.color];

  const distToT = (d: number): number => d / chord;

  const segments = Array.from({ length: route.length }, (_, i) => {
    const dCenter = cityPad + segW / 2 + i * (segW + segGap);
    const t = distToT(dCenter);
    const p = pointOnCurve(t);
    const tan = tangentOnCurve(t);
    const ang = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;

    return (
      <g key={i} transform={`translate(${p.x} ${p.y}) rotate(${ang})`}>
        <rect
          x={-segW / 2}
          y={-segH / 2}
          width={segW}
          height={segH}
          rx={2.5}
          ry={2.5}
          fill={fillColor}
          stroke="#2b1c0d"
          strokeWidth={1.1}
          className={`svg-route-seg${owner ? ` svg-route-seg--claimed-${state.players[owner].color}` : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (!owner && onClick) onClick(route.id);
          }}
        />
        {/* Wagon divider line down the middle */}
        <line
          x1={0}
          y1={-segH / 2 + 1.5}
          x2={0}
          y2={segH / 2 - 1.5}
          stroke="rgba(0,0,0,0.32)"
          strokeWidth={0.8}
          pointerEvents="none"
        />
        {/* Top highlight */}
        <line
          x1={-segW / 2 + 2.5}
          y1={-segH / 2 + 1.6}
          x2={segW / 2 - 2.5}
          y2={-segH / 2 + 1.6}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={0.7}
          pointerEvents="none"
        />
        {/* Bottom shadow */}
        <line
          x1={-segW / 2 + 2.5}
          y1={segH / 2 - 1.6}
          x2={segW / 2 - 2.5}
          y2={segH / 2 - 1.6}
          stroke="rgba(0,0,0,0.22)"
          strokeWidth={0.7}
          pointerEvents="none"
        />
      </g>
    );
  });

  // Tunnel indicator: dashed parallel line on the outer side of the arc
  const tunnelStroke = route.isTunnel && !owner ? (
    <path
      d={(() => {
        const off = segH / 2 + 4;
        const p0x = from.x + nx * off * perpDir;
        const p0y = from.y + ny * off * perpDir;
        const p2x = to.x + nx * off * perpDir;
        const p2y = to.y + ny * off * perpDir;
        const cx = ctrlX + nx * off * perpDir;
        const cy = ctrlY + ny * off * perpDir;
        return `M ${p0x} ${p0y} Q ${cx} ${cy} ${p2x} ${p2y}`;
      })()}
      fill="none"
      stroke="#2b1c0d"
      strokeWidth={1.4}
      strokeDasharray="5 3"
      opacity={0.55}
      pointerEvents="none"
    />
  ) : null;

  // Ferry indicator (anchor count) placed perpendicular to midpoint
  const midPoint = pointOnCurve(0.5);
  const midTan = tangentOnCurve(0.5);
  const midNX = -midTan.y;
  const midNY = midTan.x;

  const ferryBadge = route.isFerry ? (
    <text
      x={midPoint.x + midNX * 14 * perpDir}
      y={midPoint.y + midNY * 14 * perpDir + 4}
      className="svg-route-badge"
      textAnchor="middle"
      pointerEvents="none"
    >
      {'⚓'.repeat(route.locomotivesRequired)}
    </text>
  ) : null;

  const tunnelIcon = route.isTunnel && !owner ? (
    <g
      transform={`translate(${midPoint.x + midNX * 18 * perpDir} ${midPoint.y + midNY * 18 * perpDir})`}
      pointerEvents="none"
    >
      <path
        d="M -7 2 L -3 -4 L 0 -1 L 4 -6 L 8 2 Z"
        fill="#6b4226"
        stroke="#2b1c0d"
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
    </g>
  ) : null;

  // Selection glow: a wider stroked copy of the arc
  const glow = selected ? (
    <path
      d={`M ${from.x} ${from.y} Q ${ctrlX} ${ctrlY} ${to.x} ${to.y}`}
      fill="none"
      className="svg-route-glow"
      pointerEvents="none"
    />
  ) : null;

  return (
    <g>
      {tunnelStroke}
      {glow}
      {segments}
      {ferryBadge}
      {tunnelIcon}
    </g>
  );
}
