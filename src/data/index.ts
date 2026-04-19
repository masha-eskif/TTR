import type {
  City,
  GameContext,
  RouteDef,
  Ticket,
  TicketId,
} from '../game/types';
import { CITIES } from './cities';
import { ROUTES } from './routes';
import { TICKETS } from './tickets';

/**
 * Construct the full DI context for the real TTR Europe board.
 * Pure function — safe to call any time. Result is stable per process.
 */
export function createBoardContext(): GameContext {
  const citiesById: Record<string, City> = {};
  for (const c of CITIES) citiesById[c.id] = c;

  const routesById: Record<string, RouteDef> = {};
  for (const r of ROUTES) {
    if (routesById[r.id]) {
      throw new Error(`Duplicate route id: ${r.id}`);
    }
    if (!citiesById[r.from] || !citiesById[r.to]) {
      throw new Error(
        `Route ${r.id} references unknown city (${r.from} → ${r.to})`,
      );
    }
    routesById[r.id] = r;
  }

  const ticketsById: Record<string, Ticket> = {};
  const shortTicketIds: TicketId[] = [];
  const longTicketIds: TicketId[] = [];
  for (const tk of TICKETS) {
    if (ticketsById[tk.id]) {
      throw new Error(`Duplicate ticket id: ${tk.id}`);
    }
    if (!citiesById[tk.from] || !citiesById[tk.to]) {
      throw new Error(
        `Ticket ${tk.id} references unknown city (${tk.from} → ${tk.to})`,
      );
    }
    ticketsById[tk.id] = tk;
    (tk.isLong ? longTicketIds : shortTicketIds).push(tk.id);
  }

  const routesByCity: Record<string, string[]> = {};
  for (const r of ROUTES) {
    (routesByCity[r.from] ??= []).push(r.id);
    (routesByCity[r.to] ??= []).push(r.id);
  }

  return {
    routes: ROUTES,
    routesById,
    tickets: TICKETS,
    ticketsById,
    shortTicketIds,
    longTicketIds,
    cities: CITIES,
    citiesById,
    routesByCity,
  };
}

export { CITIES, ROUTES, TICKETS };
