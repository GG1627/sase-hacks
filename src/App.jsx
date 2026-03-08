import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import HeroSetup from './components/HeroSetup';
import BossSelect from './components/BossSelect';
import Canvas from './components/Canvas';
import OriginStory from './components/OriginStory';
import BattleScreen from './components/BattleScreen';
import { audioSystem } from './utils/audio';

export default function App() {
  const [entered, setEntered] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [heroData, setHeroData] = useState(null);
  const [bossData, setBossData] = useState(null);

  // Battle pipeline results (set by OriginStory, consumed by BattleScreen)
  const [battleResult, setBattleResult] = useState(null);
  const [heroImage, setHeroImage] = useState(null);
  const [videoDataUrl, setVideoDataUrl] = useState(null);

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
    setCurrentScreen('origin-story');
  };

  const handleBattleReady = ({ battleResult: br, heroImage: hi, videoDataUrl: vd }) => {
    setBattleResult(br);
    setHeroImage(hi);
    setVideoDataUrl(vd);
    setCurrentScreen('battle');
  };

  const handleBattleFinish = (action) => {
    // Reset state for a fresh round
    setBattleResult(null);
    setHeroImage(null);
    setVideoDataUrl(null);

    if (action === 'play-again') {
      setHeroData(null);
      setBossData(null);
      setCurrentScreen('hero-setup');
    } else {
      setHeroData(null);
      setBossData(null);
      setCurrentScreen('home');
    }
  };

  if (!entered) {
    return (
      <div
        onClick={() => {
          audioSystem.startBackgroundMusic();
          setEntered(true);
        }}
        className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center cursor-pointer transition-opacity duration-1000"
      >
        <p style={{
          fontFamily: "'Comic Relief', serif",
          fontSize: '1rem',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          animation: 'pulse-glow 2.5s infinite ease-in-out'
        }}>
          Click anywhere to continue
        </p>
      </div>
    );
  }

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

      {currentScreen === 'origin-story' && (
        <OriginStory
          heroData={heroData}
          bossData={bossData}
          onBattleReady={handleBattleReady}
        />
      )}

      {currentScreen === 'battle' && (
        <BattleScreen
          battleResult={battleResult}
          heroImage={heroImage}
          videoDataUrl={videoDataUrl}
          heroData={heroData}
          bossData={bossData}
          onFinish={handleBattleFinish}
        />
      )}

      {currentScreen === 'gallery' && (
        <div className="screen-placeholder">
          <h1>GALLERY</h1>
        </div>
      )}
    </div>
  );
}
