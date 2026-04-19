import { useEffect, useState } from 'react';
import {
  getActiveProfile,
  getSavedGames,
} from '../persistence/storage';
import { useGameStore } from '../hooks/useGameStore';
import { STRINGS } from '../i18n/ru';
import { Button } from './common/Button';

export function StartMenu() {
  const goToScreen = useGameStore((s) => s.goToScreen);
  const [_, bump] = useState(0);

  // Refresh when returning to this screen (profile / saves may have changed)
  useEffect(() => {
    bump((n) => n + 1);
  }, []);

  const activeProfile = getActiveProfile();
  const savedGames = getSavedGames();
  const hasSaved = savedGames.length > 0;

  void _;

  return (
    <div className="start-menu">
      <button
        type="button"
        className="start-menu__profile-chip"
        onClick={() => goToScreen('profile')}
      >
        {activeProfile ? (
          <>
            <span className="start-menu__emoji">{activeProfile.emoji}</span>
            <span>
              <div className="muted" style={{ fontSize: 12 }}>
                {STRINGS.start.activeProfile}
              </div>
              <div style={{ color: 'var(--ink)', fontWeight: 600 }}>
                {activeProfile.name}
              </div>
            </span>
          </>
        ) : (
          <>
            <span className="start-menu__emoji">👤</span>
            <span>{STRINGS.start.noActiveProfile}</span>
          </>
        )}
      </button>

      <Button
        variant="primary"
        className="start-menu__big"
        fullWidth
        onClick={() => goToScreen('newGame')}
        disabled={!activeProfile}
        title={!activeProfile ? 'Сначала создайте профиль' : undefined}
      >
        {STRINGS.start.newGame}
      </Button>

      <Button
        variant="secondary"
        className="start-menu__big"
        fullWidth
        onClick={() => goToScreen('continue')}
        disabled={!hasSaved}
      >
        {STRINGS.start.continueGame}
        {hasSaved && <span className="muted"> ({savedGames.length})</span>}
      </Button>

      <div className="start-menu__row">
        <Button variant="ghost" onClick={() => goToScreen('profile')}>
          {STRINGS.start.profile}
        </Button>
        <Button variant="ghost" onClick={() => goToScreen('stats')}>
          {STRINGS.start.stats}
        </Button>
        <Button variant="ghost" onClick={() => goToScreen('settings')}>
          {STRINGS.start.settings}
        </Button>
      </div>
    </div>
  );
}
