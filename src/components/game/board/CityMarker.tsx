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
      <circle
        cx={city.x}
        cy={city.y}
        r={7}
        className={`svg-city${selected ? ' svg-city--selected' : ''}`}
      />
      {stationOwners.map((owner, i) => (
        <rect
          key={owner}
          x={city.x - 12 + i * 4}
          y={city.y - 18}
          width={8}
          height={8}
          fill={state.players[owner].color === 'red' ? 'var(--player-red)' : 'var(--player-blue)'}
          stroke="#2b1c0d"
          strokeWidth={1}
        />
      ))}
      <text
        x={city.x}
        y={city.y + 22}
        className="svg-city-label"
      >
        {city.name}
      </text>
    </g>
  );
}
