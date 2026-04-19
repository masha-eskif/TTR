import { getActiveProfile } from '../persistence/storage';
import { profileView } from '../profile/stats';
import { useGameStore } from '../hooks/useGameStore';
import { STRINGS } from '../i18n/ru';
import { Button } from './common/Button';

export function StatsScreen() {
  const goToScreen = useGameStore((s) => s.goToScreen);
  const profile = getActiveProfile();

  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">{STRINGS.stats.title}</h1>
        <Button variant="ghost" onClick={() => goToScreen('start')}>
          {STRINGS.common.back}
        </Button>
      </header>

      {!profile ? (
        <p className="muted">{STRINGS.stats.noProfile}</p>
      ) : (
        <>
          <div className="row" style={{ marginBottom: 24 }}>
            <span style={{ fontSize: 40 }}>{profile.emoji}</span>
            <h2 style={{ margin: 0, fontFamily: 'var(--serif-display)' }}>
              {profile.name}
            </h2>
          </div>
          <StatsGrid profile={profile} />
        </>
      )}
    </div>
  );
}

function StatsGrid({ profile }: { profile: import('../persistence/schema').Profile }) {
  const v = profileView(profile);
  const entries: Array<[string, number | string]> = [
    [STRINGS.stats.games, v.gamesPlayed],
    [STRINGS.stats.wins, v.wins],
    [STRINGS.stats.losses, v.losses],
    [STRINGS.stats.draws, v.draws],
    [STRINGS.stats.winRate, `${v.winRatePct}%`],
    [STRINGS.stats.avgScore, v.averageScore],
    [STRINGS.stats.best, v.bestScore],
    [STRINGS.stats.ticketsDone, v.ticketsCompleted],
    [STRINGS.stats.ticketsMissed, v.ticketsMissed],
    [STRINGS.stats.ticketPct, `${v.ticketCompletionPct}%`],
    [STRINGS.stats.routes, v.routesClaimed],
    [STRINGS.stats.longest, v.longestSingleRoute],
  ];
  return (
    <div className="stats-grid">
      {entries.map(([label, value]) => (
        <div key={label} className="stats-card">
          <div className="stats-card__label">{label}</div>
          <div className="stats-card__value">{value}</div>
        </div>
      ))}
    </div>
  );
}
