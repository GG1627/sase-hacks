import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import HeroSetup from './components/HeroSetup';
import BossSelect from './components/BossSelect';
import Canvas from './components/Canvas';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [heroData, setHeroData] = useState(null);
  const [bossData, setBossData] = useState(null);

  const handleHeroComplete = (hero) => {
    setHeroData(hero);
    setCurrentScreen('boss-select');
  };

  const handleBossSelected = (boss) => {
    setBossData(boss);
    setCurrentScreen('draw');
  };

  const handleDrawingComplete = (drawingResult) => {
    setHeroData(prev => ({ ...prev, ...drawingResult }));
    setCurrentScreen('battle');
  };

  return (
    <div className="app">
      {currentScreen === 'home' && (
        <HomeScreen
          onStart={() => setCurrentScreen('hero-setup')}
          onGallery={() => setCurrentScreen('gallery')}
        />
      )}

      {currentScreen === 'hero-setup' && (
        <HeroSetup onComplete={handleHeroComplete} />
      )}

      {currentScreen === 'boss-select' && (
        <BossSelect heroData={heroData} onSelect={handleBossSelected} />
      )}

      {currentScreen === 'draw' && (
        <Canvas
          playerData={heroData}
          bossData={bossData}
          onComplete={handleDrawingComplete}
        />
      )}

      {currentScreen === 'battle' && (
        <div className="screen-placeholder">
          <h1>BATTLE RESULT</h1>
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
