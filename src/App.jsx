import { useState } from 'react';
import HomeScreen from './components/HomeScreen';
import HeroSetup from './components/HeroSetup';
import BossSelect from './components/BossSelect';
import Canvas from './components/Canvas';
import OriginStory from './components/OriginStory';
import BattleScreen from './components/BattleScreen';
import Gallery from './components/Gallery';
import { audioSystem } from './utils/audio';

export default function App() {
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

  return (
    <div className="app">
      {currentScreen === 'home' && (
        <HomeScreen
          onStart={() => {
            audioSystem.startBackgroundMusic();
            setCurrentScreen('hero-setup');
          }}
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
        <Gallery onBack={() => setCurrentScreen('home')} />
      )}
    </div>
  );
}
