import { useEffect, useState } from 'react';
import { useGameStore } from '../hooks/useGameStore';
import { Button } from './common/Button';

export function LobbyScreen() {
  const mode = useGameStore((s) => s.mode);
  const roomCode = useGameStore((s) => s.roomCode);
  const connectionStatus = useGameStore((s) => s.connectionStatus);
  const connectionError = useGameStore((s) => s.connectionError);
  const leaveRoom = useGameStore((s) => s.leaveRoom);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(t);
  }, [copied]);

  function copy() {
    navigator.clipboard?.writeText(roomCode).catch(() => {});
    setCopied(true);
  }

  if (mode === 'host') {
    return (
      <div className="screen" style={{ textAlign: 'center' }}>
        <h1 className="screen__title">Комната создана</h1>
        <p className="muted">Сообщите сопернику этот код:</p>
        <div
          style={{
            fontFamily: 'var(--serif-display)',
            fontSize: 64,
            letterSpacing: '0.25em',
            color: 'var(--accent-strong)',
            margin: '18px 0',
            userSelect: 'all',
          }}
          onClick={copy}
        >
          {roomCode}
        </div>
        <Button variant="secondary" onClick={copy}>
          {copied ? '✓ скопировано' : '📋 Скопировать'}
        </Button>
        <p className="muted mt-md">
          {connectionStatus === 'waiting-for-peer' && 'Ожидание соперника…'}
          {connectionStatus === 'connecting' && 'Подключение к серверу…'}
          {connectionStatus === 'connected' && 'Соединение установлено'}
          {connectionStatus === 'error' &&
            `Ошибка: ${connectionError ?? 'не удалось подключиться'}`}
        </p>
        <Button
          variant="ghost"
          className="mt-md"
          onClick={leaveRoom}
        >
          Отменить
        </Button>
      </div>
    );
  }

  // Guest
  return (
    <div className="screen" style={{ textAlign: 'center' }}>
      <h1 className="screen__title">Подключение…</h1>
      <p className="muted">Комната: <b>{roomCode}</b></p>
      <p className="muted mt-md">
        {connectionStatus === 'connecting' && 'Подключение к хосту…'}
        {connectionStatus === 'waiting-for-peer' && 'Ожидание хоста…'}
        {connectionStatus === 'connected' && 'Ожидание начала игры…'}
        {connectionStatus === 'error' &&
          `Ошибка: ${connectionError ?? 'не удалось подключиться'}`}
      </p>
      <Button variant="ghost" className="mt-md" onClick={leaveRoom}>
        Отменить
      </Button>
    </div>
  );
}
