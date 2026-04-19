import { useGameStore } from '../../hooks/useGameStore';
import { CityMarker } from './board/CityMarker';
import { RouteView } from './board/RouteView';

export function GameBoard() {
  const state = useGameStore((s) => s.state);
  const ctx = useGameStore((s) => s.ctx);
  const selectedRouteId = useGameStore((s) => s.selectedRouteId);
  const selectedCityId = useGameStore((s) => s.selectedCityId);
  const selectRoute = useGameStore((s) => s.selectRoute);
  const selectCity = useGameStore((s) => s.selectCity);

  if (!state) return null;

  const canClick = state.phase === 'idle';

  return (
    <div className="game-board-wrap">
      <svg
        className="game-board"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid meet"
        onClick={() => {
          selectRoute(null);
          selectCity(null);
        }}
      >
        {/* Background texture */}
        <defs>
          <pattern id="paper" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#efe0bb" />
            <circle cx="5" cy="5" r="0.5" fill="#c4a87f" opacity="0.4" />
            <circle cx="27" cy="19" r="0.4" fill="#c4a87f" opacity="0.5" />
            <circle cx="17" cy="33" r="0.6" fill="#c4a87f" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="1200" height="900" fill="url(#paper)" />
        <rect x="5" y="5" width="1190" height="890" fill="none" stroke="#8a6b48" strokeWidth="2" rx="6" />

        {/* Routes first (behind cities) */}
        {ctx.routes.map((r) => {
          const from = ctx.citiesById[r.from];
          const to = ctx.citiesById[r.to];
          if (!from || !to) return null;
          return (
            <RouteView
              key={r.id}
              route={r}
              from={from}
              to={to}
              state={state}
              onClick={canClick ? selectRoute : undefined}
              selected={selectedRouteId === r.id}
            />
          );
        })}

        {/* Cities on top */}
        {ctx.cities.map((c) => (
          <CityMarker
            key={c.id}
            city={c}
            state={state}
            onClick={canClick ? selectCity : undefined}
            selected={selectedCityId === c.id}
          />
        ))}
      </svg>
    </div>
  );
}
