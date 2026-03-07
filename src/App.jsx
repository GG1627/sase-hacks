import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import SplitProfile from './components/SplitProfile';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');

  return (
    <div className="app">
      {currentScreen === 'home' && (
        <HomeScreen
          onStart={() => setCurrentScreen('profile')}
          onGallery={() => setCurrentScreen('gallery')}
        />
      )}

      {currentScreen === 'profile' && (
        <SplitProfile onComplete={() => setCurrentScreen('draw-p1')} />
      )}

      {currentScreen === 'draw-p1' && (
        <div className="screen-placeholder">
          <h1>DRAW — PLAYER 1</h1>
        </div>
      )}

      {currentScreen === 'handoff' && (
        <div className="screen-placeholder">
          <h1>HANDOFF</h1>
        </div>
      )}

      {currentScreen === 'draw-p2' && (
        <div className="screen-placeholder">
          <h1>DRAW — PLAYER 2</h1>
        </div>
      )}

      {currentScreen === 'forging' && (
        <div className="screen-placeholder">
          <h1>FORGING</h1>
        </div>
      )}

      {currentScreen === 'origins' && (
        <div className="screen-placeholder">
          <h1>ORIGINS</h1>
        </div>
      )}

      {currentScreen === 'battle-loading' && (
        <div className="screen-placeholder">
          <h1>BATTLE LOADING</h1>
        </div>
      )}

      {currentScreen === 'battle' && (
        <div className="screen-placeholder">
          <h1>BATTLE</h1>
        </div>
      )}

      {currentScreen === 'verdict' && (
        <div className="screen-placeholder">
          <h1>VERDICT</h1>
        </div>
      )}

      {currentScreen === 'gallery' && (
        <div className="screen-placeholder">
          <h1>GALLERY</h1>
        </div>
      )}
    </div>
  );
}
