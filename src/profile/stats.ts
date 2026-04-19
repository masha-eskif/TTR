import type { Profile, ProfileStats } from '../persistence/schema';

export interface StatsView {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRatePct: number;
  averageScore: number;
  bestScore: number;
  ticketsCompleted: number;
  ticketsMissed: number;
  ticketCompletionPct: number;
  routesClaimed: number;
  longestSingleRoute: number;
}

export function toStatsView(stats: ProfileStats): StatsView {
  const totalTickets = stats.ticketsCompleted + stats.ticketsMissed;
  return {
    gamesPlayed: stats.gamesPlayed,
    wins: stats.wins,
    losses: stats.losses,
    draws: stats.draws,
    winRatePct:
      stats.gamesPlayed > 0
        ? Math.round((stats.wins / stats.gamesPlayed) * 100)
        : 0,
    averageScore:
      stats.gamesPlayed > 0
        ? Math.round(stats.totalScore / stats.gamesPlayed)
        : 0,
    bestScore: stats.bestScore,
    ticketsCompleted: stats.ticketsCompleted,
    ticketsMissed: stats.ticketsMissed,
    ticketCompletionPct:
      totalTickets > 0
        ? Math.round((stats.ticketsCompleted / totalTickets) * 100)
        : 0,
    routesClaimed: stats.routesClaimed,
    longestSingleRoute: stats.longestSingleRoute,
  };
}

export function profileView(profile: Profile): StatsView {
  return toStatsView(profile.stats);
}
