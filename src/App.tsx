import { ContinueGameList } from './components/ContinueGameList';
import { JoinRoomScreen } from './components/JoinRoomScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { NewGameScreen } from './components/NewGameScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SettingsPanel } from './components/SettingsPanel';
import { StartMenu } from './components/StartMenu';
import { StatsScreen } from './components/StatsScreen';
import { GameScreen } from './components/game/GameScreen';
import { useGameStore } from './hooks/useGameStore';

export function App() {
  const screen = useGameStore((s) => s.screen);

  const inGame = screen === 'game';

  return (
    <div className="app">
      {!inGame && (
        <header className="banner">
          <h1>Ticket to Ride: Европа</h1>
          <p className="subtitle">двухпользовательская версия</p>
        </header>
      )}
      <main style={{ flex: 1 }}>
        {screen === 'start' && <StartMenu />}
        {screen === 'profile' && <ProfileScreen />}
        {screen === 'stats' && <StatsScreen />}
        {screen === 'settings' && <SettingsPanel />}
        {screen === 'newGame' && <NewGameScreen />}
        {screen === 'continue' && <ContinueGameList />}
        {screen === 'lobby' && <LobbyScreen />}
        {screen === 'joinRoom' && <JoinRoomScreen />}
        {screen === 'game' && <GameScreen />}
      </main>
    </div>
  );
}
