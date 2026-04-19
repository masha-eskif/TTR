import { useState } from 'react';
import { getActiveProfile, getSettings } from '../persistence/storage';
import { useGameStore } from '../hooks/useGameStore';
import { STRINGS } from '../i18n/ru';
import { Button } from './common/Button';
import { EmojiPicker } from './common/EmojiPicker';

type Mode = 'online-host' | 'online-join' | 'offline';

export function NewGameScreen() {
  const goToScreen = useGameStore((s) => s.goToScreen);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const createRoom = useGameStore((s) => s.createRoom);
  const profile = getActiveProfile();
  const defaults = getSettings().defaultHouseRules;

  const [mode, setMode] = useState<Mode>('online-host');
  const [opponentName, setOpponentName] = useState('Соперник');
  const [opponentEmoji, setOpponentEmoji] = useState('🐺');
  const [houseRules, setHouseRules] = useState(defaults);

  if (!profile) {
    return (
      <div className="screen">
        <p className="muted">Сначала создайте профиль.</p>
        <Button onClick={() => goToScreen('profile')}>
          {STRINGS.start.profile}
        </Button>
      </div>
    );
  }

  function start() {
    if (!profile) return;
    if (mode === 'online-host') {
      createRoom({
        hostProfileId: profile.id,
        houseRules,
        opponentPlaceholderName: 'Гость',
        opponentPlaceholderEmoji: '🐺',
      });
    } else if (mode === 'offline') {
      startNewGame({
        hostProfileId: profile.id,
        opponentName: opponentName.trim() || 'Соперник',
        opponentEmoji,
        houseRules,
      });
    }
  }

  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">{STRINGS.newGame.title}</h1>
        <Button variant="ghost" onClick={() => goToScreen('start')}>
          {STRINGS.common.back}
        </Button>
      </header>

      <div className="newgame__section">
        <h3 className="newgame__section-title">Как играть</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <label className="toggle-row" style={{ cursor: 'pointer' }}>
            <div>
              <div className="toggle-row__label">🌐 Онлайн — создать комнату</div>
              <div className="toggle-row__note">
                Получите код, передайте сопернику
              </div>
            </div>
            <input
              type="radio"
              name="mode"
              checked={mode === 'online-host'}
              onChange={() => setMode('online-host')}
            />
          </label>
          <label className="toggle-row" style={{ cursor: 'pointer' }}>
            <div>
              <div className="toggle-row__label">🔗 Онлайн — присоединиться</div>
              <div className="toggle-row__note">Введите код от хоста</div>
            </div>
            <input
              type="radio"
              name="mode"
              checked={mode === 'online-join'}
              onChange={() => setMode('online-join')}
            />
          </label>
          <label className="toggle-row" style={{ cursor: 'pointer' }}>
            <div>
              <div className="toggle-row__label">📱 Локально (hot-seat)</div>
              <div className="toggle-row__note">
                Оба игрока на одном устройстве
              </div>
            </div>
            <input
              type="radio"
              name="mode"
              checked={mode === 'offline'}
              onChange={() => setMode('offline')}
            />
          </label>
        </div>
      </div>

      {mode === 'online-join' ? (
        <div className="newgame__section text-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => goToScreen('joinRoom')}
          >
            Перейти к вводу кода →
          </Button>
        </div>
      ) : (
        <>
          <div className="newgame__section">
            <h3 className="newgame__section-title">{STRINGS.newGame.myProfile}</h3>
            <div className="row">
              <span style={{ fontSize: 32 }}>{profile.emoji}</span>
              <span style={{ fontFamily: 'var(--serif-display)', fontSize: 18 }}>
                {profile.name}
              </span>
              <span
                className="card-chip"
                style={{ background: 'var(--player-red)', marginLeft: 'auto' }}
              >
                красный
              </span>
            </div>
          </div>

          {mode === 'offline' && (
            <div className="newgame__section">
              <h3 className="newgame__section-title">{STRINGS.newGame.opponent}</h3>
              <div className="field">
                <label className="field__label">
                  {STRINGS.newGame.opponentName}
                </label>
                <input
                  className="field__input"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="field">
                <label className="field__label">
                  {STRINGS.newGame.opponentEmoji}
                </label>
                <EmojiPicker value={opponentEmoji} onChange={setOpponentEmoji} />
              </div>
              <div className="row">
                <span
                  className="card-chip"
                  style={{ background: 'var(--player-blue)' }}
                >
                  синий
                </span>
              </div>
            </div>
          )}

          {mode === 'online-host' && (
            <div className="newgame__section">
              <h3 className="newgame__section-title">{STRINGS.newGame.opponent}</h3>
              <p className="muted" style={{ fontSize: 13 }}>
                Имя и эмодзи соперника подтянутся из его профиля при подключении.
              </p>
            </div>
          )}

          <div className="newgame__section">
            <h3 className="newgame__section-title">{STRINGS.newGame.houseRules}</h3>

            <label className="toggle-row" style={{ opacity: 0.7 }}>
              <div className="toggle-row__label">
                {STRINGS.settings.infiniteCards}
              </div>
              <input type="checkbox" checked readOnly />
            </label>

            <label className="toggle-row" style={{ cursor: 'pointer' }}>
              <div className="toggle-row__label">
                {STRINGS.settings.infiniteStations}
              </div>
              <input
                type="checkbox"
                checked={houseRules.infiniteStations}
                onChange={() =>
                  setHouseRules((r) => ({
                    ...r,
                    infiniteStations: !r.infiniteStations,
                  }))
                }
              />
            </label>

            <label className="toggle-row" style={{ cursor: 'pointer' }}>
              <div className="toggle-row__label">
                {STRINGS.settings.allowCardTrading}
              </div>
              <input
                type="checkbox"
                checked={houseRules.allowCardTrading}
                onChange={() =>
                  setHouseRules((r) => ({
                    ...r,
                    allowCardTrading: !r.allowCardTrading,
                  }))
                }
              />
            </label>
          </div>

          <div className="row row--end">
            <Button variant="primary" size="lg" onClick={start}>
              {mode === 'online-host'
                ? 'Создать комнату'
                : STRINGS.newGame.start}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
