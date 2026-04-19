import { useState } from 'react';
import { getActiveProfile } from '../persistence/storage';
import { isValidCode } from '../net/roomCode';
import { useGameStore } from '../hooks/useGameStore';
import { STRINGS } from '../i18n/ru';
import { Button } from './common/Button';

export function JoinRoomScreen() {
  const goToScreen = useGameStore((s) => s.goToScreen);
  const joinRoom = useGameStore((s) => s.joinRoom);
  const profile = getActiveProfile();
  const [code, setCode] = useState('');

  const cleanCode = code.trim().toUpperCase();
  const valid = isValidCode(cleanCode);

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

  function submit() {
    if (!valid || !profile) return;
    joinRoom({ code: cleanCode, profileId: profile.id });
  }

  return (
    <div className="screen">
      <header className="screen__header">
        <h1 className="screen__title">Присоединиться к комнате</h1>
        <Button variant="ghost" onClick={() => goToScreen('newGame')}>
          {STRINGS.common.back}
        </Button>
      </header>

      <div className="newgame__section">
        <h3 className="newgame__section-title">Ваш профиль</h3>
        <div className="row">
          <span style={{ fontSize: 32 }}>{profile.emoji}</span>
          <span style={{ fontFamily: 'var(--serif-display)', fontSize: 18 }}>
            {profile.name}
          </span>
        </div>
      </div>

      <div className="newgame__section">
        <h3 className="newgame__section-title">Код комнаты</h3>
        <input
          className="field__input"
          style={{
            fontFamily: 'var(--serif-display)',
            fontSize: 28,
            letterSpacing: '0.25em',
            textAlign: 'center',
            textTransform: 'uppercase',
          }}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={8}
          placeholder="ABCDEF"
          autoFocus
        />
        <p className="field__help">6 символов от хоста (без 0, O, 1, I).</p>
      </div>

      <div className="row row--end">
        <Button variant="primary" size="lg" onClick={submit} disabled={!valid}>
          Подключиться
        </Button>
      </div>
    </div>
  );
}
