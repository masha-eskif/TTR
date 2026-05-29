import type { City, GameState, PlayerId } from '../../../game/types';

interface Props {
  city: City;
  state: GameState;
  onClick?: (id: string) => void;
  selected?: boolean;
}

export function CityMarker({ city, state, onClick, selected }: Props) {
  // Check if anyone has a station here
  const stationOwners: PlayerId[] = [];
  for (const id of ['p1', 'p2'] as PlayerId[]) {
    if (state.players[id].stations.includes(city.id)) stationOwners.push(id);
  }

  return (
    <g
      className="svg-city-group"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(city.id);
      }}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {/* Soft shadow halo */}
      <circle
        cx={city.x + 0.8}
        cy={city.y + 1.2}
        r={8.5}
        fill="rgba(43, 28, 13, 0.25)"
        pointerEvents="none"
      />
      {/* Outer ring */}
      <circle
        cx={city.x}
        cy={city.y}
        r={8.5}
        className={`svg-city-outer${selected ? ' svg-city-outer--selected' : ''}`}
      />
      {/* Inner cream fill */}
      <circle
        cx={city.x}
        cy={city.y}
        r={6}
        className={`svg-city${selected ? ' svg-city--selected' : ''}`}
      />
      {/* Center dot */}
      <circle
        cx={city.x}
        cy={city.y}
        r={1.8}
        fill="#2b1c0d"
        pointerEvents="none"
      />
      {/* Station pennants above city */}
      {stationOwners.map((owner, i) => (
        <g
          key={owner}
          transform={`translate(${city.x - 14 + i * 6} ${city.y - 22})`}
          pointerEvents="none"
        >
          <rect
            x={-4}
            y={-4}
            width={8}
            height={10}
            rx={1}
            fill={
              state.players[owner].color === 'red'
                ? 'var(--player-red)'
                : 'var(--player-blue)'
            }
            stroke="#2b1c0d"
            strokeWidth={1}
          />
          <rect
            x={-0.6}
            y={-4}
            width={1.2}
            height={16}
            fill="#2b1c0d"
          />
        </g>
      ))}
      {/* Label */}
      <text
        x={city.x + (city.labelDx ?? 0)}
        y={city.y + 23 + (city.labelDy ?? 0)}
        className="svg-city-label"
      >
        {city.name}
      </text>
    </g>
  );
}
