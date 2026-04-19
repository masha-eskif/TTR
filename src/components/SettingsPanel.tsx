import { useState } from 'react';
import { getSettings, saveSettings } from '../persistence/storage';
import { useGameStore } from '../hooks/useGameStore';
import { STRINGS } from '../i18n/ru';
import { Button } from './common/Button';

export function SettingsPanel() {
  const goToScreen = useGameStore((s) => s.goToScreen);
  const [settings, setSettings] = useState(() => getSettings());

  function toggle<K extends keyof typeof settings.defaultHouseRules>(key: K) {
    if (key === 'infiniteCards') return; // always on
    const next = {
      ...settings,
      defaultHouseRules: {
        ...settings.defaultHouseRules,
        [key]: !settings.defaultHouseRules[key],
      },
    };
    setSettings(next);
    saveSettings(next);
  }

  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">{STRINGS.settings.title}</h1>
        <Button variant="ghost" onClick={() => goToScreen('start')}>
          {STRINGS.common.back}
        </Button>
      </header>

      <h2 style={{ fontFamily: 'var(--serif-display)', fontSize: 20 }}>
        {STRINGS.settings.defaultRules}
      </h2>
      <p className="faint" style={{ fontSize: 13 }}>
        {STRINGS.settings.rulesHelp}
      </p>

      <div className="toggle-row" style={{ opacity: 0.7 }}>
        <div>
          <div className="toggle-row__label">{STRINGS.settings.infiniteCards}</div>
          <div className="toggle-row__note">{STRINGS.settings.infiniteCardsNote}</div>
        </div>
        <input type="checkbox" checked readOnly />
      </div>

      <label className="toggle-row" style={{ cursor: 'pointer' }}>
        <div className="toggle-row__label">{STRINGS.settings.infiniteStations}</div>
        <input
          type="checkbox"
          checked={settings.defaultHouseRules.infiniteStations}
          onChange={() => toggle('infiniteStations')}
        />
      </label>

      <label className="toggle-row" style={{ cursor: 'pointer' }}>
        <div className="toggle-row__label">{STRINGS.settings.allowCardTrading}</div>
        <input
          type="checkbox"
          checked={settings.defaultHouseRules.allowCardTrading}
          onChange={() => toggle('allowCardTrading')}
        />
      </label>
    </div>
  );
}
