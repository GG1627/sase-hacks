import React, { useState, useEffect, useRef } from 'react';
import { generateSpeechUrl } from '../services/elevenlabs';
import { audioSystem } from '../utils/audio';

// Arnold voice — dramatic, booming, perfect for "AND THE WINNER IS..."
const ANNOUNCER_VOICE = 'VR6AewLTigWG4xSOukaG';

/**
 * BattleScreen — plays the Veo battle video, then announces the winner.
 *
 * Props:
 *   battleResult  – { winner, winnerReason, battleNarrative, winnerVerdict, videoPrompt }
 *   heroImage     – base64 data URL of the AI-generated hero art
 *   videoDataUrl  – base64 data URL of the Veo-generated video
 *   heroData      – original hero data (name, drawing, etc)
 *   bossData      – boss data (name, image, description)
 *   onFinish      – callback when done (→ gallery or play again)
 */
export default function BattleScreen({
    battleResult, heroImage, videoDataUrl, heroData, bossData, onFinish
}) {
    const [phase, setPhase] = useState('intro');  // intro → video → verdict
    const [verdictAudioUrl, setVerdictAudioUrl] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);

    const videoRef = useRef(null);
    const verdictAudioRef = useRef(null);

    const isHeroWinner = battleResult?.winner === 'hero';
    const winnerName = isHeroWinner ? heroData.name : bossData.name;

    /* ── Generate the verdict narration on mount ── */
    useEffect(() => {
        audioSystem.setMusicVolume(0.04);

        // Pre-generate the winner announcement audio
        const verdictText = battleResult?.winnerVerdict || `${winnerName} is victorious!`;
        generateSpeechUrl(verdictText, ANNOUNCER_VOICE)
            .then(url => setVerdictAudioUrl(url))
            .catch(console.error);

        // Short dramatic pause then start the video
        const timer = setTimeout(() => setPhase('video'), 2000);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── When phase becomes 'video', play it ── */
    useEffect(() => {
        if (phase === 'video' && videoRef.current && videoDataUrl) {
            videoRef.current.src = videoDataUrl;
            videoRef.current.volume = 0.7;
            videoRef.current.play().catch(() => { });

            videoRef.current.onended = () => {
                setPhase('verdict');
            };
        }
    }, [phase, videoDataUrl]);

    /* ── When verdict phase starts ── */
    useEffect(() => {
        if (phase === 'verdict') {
            setShowConfetti(true);
            audioSystem.setMusicVolume(0.15);

            if (verdictAudioUrl && verdictAudioRef.current) {
                verdictAudioRef.current.src = verdictAudioUrl;
                verdictAudioRef.current.volume = 0.9;
                verdictAudioRef.current.play().catch(() => { });
            }
        }
    }, [phase, verdictAudioUrl]);

    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: '#0a0a0f',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Hidden audio for verdict */}
            <audio ref={verdictAudioRef} />

            {/* ── INTRO ── */}
            {phase === 'intro' && (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '1.5rem',
                    animation: 'fadeIn 0.8s ease',
                }}>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 6vw, 4rem)',
                        fontWeight: 900,
                        color: '#fff',
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        textShadow: '0 0 50px rgba(255,50,50,0.5)',
                        animation: 'pulse-glow 1.5s ease-in-out infinite',
                    }}>
                        ⚔️ CLASH ⚔️
                    </h1>
                    <p style={{
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '1rem',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                    }}>
                        {heroData.name} vs {bossData.name}
                    </p>
                </div>
            )}

            {/* ── VIDEO ── */}
            {phase === 'video' && (
                <video
                    ref={videoRef}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        animation: 'fadeIn 0.5s ease',
                    }}
                    playsInline
                    muted={false}
                />
            )}

            {/* ── VERDICT ── */}
            {phase === 'verdict' && (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '2rem',
                    animation: 'fadeIn 1s ease',
                    padding: '2rem',
                    textAlign: 'center',
                    position: 'relative',
                    zIndex: 2,
                }}>
                    <p style={{
                        color: 'rgba(255,200,100,0.8)',
                        fontSize: '1rem',
                        letterSpacing: '0.3em',
                        textTransform: 'uppercase',
                    }}>
                        👑 AND THE WINNER IS… 👑
                    </p>

                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 8vw, 5rem)',
                        fontWeight: 900,
                        color: '#ffaa32',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        textShadow: '0 0 60px rgba(255,170,50,0.6), 0 0 120px rgba(255,170,50,0.3)',
                        animation: 'pulse-glow 2s ease-in-out infinite',
                    }}>
                        {winnerName}
                    </h1>

                    {/* Winner Image */}
                    <div style={{
                        width: '300px',
                        aspectRatio: '16/9',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 0 80px rgba(255,170,50,0.3)',
                        border: '3px solid rgba(255,170,50,0.5)',
                    }}>
                        <img
                            src={isHeroWinner ? (heroImage || heroData.drawing) : bossData.image}
                            alt={winnerName}
                            style={{
                                width: '100%', height: '100%',
                                objectFit: 'cover',
                            }}
                        />
                    </div>

                    <p style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '1rem',
                        fontStyle: 'italic',
                        maxWidth: '500px',
                    }}>
                        {battleResult?.winnerReason}
                    </p>

                    {/* Buttons */}
                    <div style={{
                        display: 'flex', gap: '1rem',
                        marginTop: '1rem',
                    }}>
                        <button
                            onClick={() => {
                                audioSystem.setMusicVolume(0.4);
                                onFinish('home');
                            }}
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: '12px',
                                border: '2px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.08)',
                                color: '#fff',
                                fontSize: '1rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backdropFilter: 'blur(10px)',
                            }}
                            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                        >
                            🏠 Home
                        </button>
                        <button
                            onClick={() => {
                                audioSystem.setMusicVolume(0.4);
                                onFinish('play-again');
                            }}
                            style={{
                                padding: '0.75rem 2rem',
                                borderRadius: '12px',
                                border: 'none',
                                background: 'linear-gradient(135deg, #ffaa32, #ff6b00)',
                                color: '#fff',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 20px rgba(255,170,50,0.4)',
                            }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            ⚔️ Battle Again
                        </button>
                    </div>
                </div>
            )}

            {/* ── Confetti particles ── */}
            {showConfetti && (
                <div style={{
                    position: 'fixed', inset: 0,
                    pointerEvents: 'none',
                    zIndex: 1,
                    overflow: 'hidden',
                }}>
                    {Array.from({ length: 60 }, (_, i) => (
                        <div
                            key={i}
                            style={{
                                position: 'absolute',
                                top: '-10px',
                                left: `${Math.random() * 100}%`,
                                width: `${6 + Math.random() * 8}px`,
                                height: `${6 + Math.random() * 8}px`,
                                background: ['#ffaa32', '#ff6b00', '#ff4444', '#44ff44', '#4488ff', '#ff44ff', '#FFD700'][i % 7],
                                borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                animation: `confettiFall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
                                opacity: 0.8,
                            }}
                        />
                    ))}
                </div>
            )}

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes confettiFall {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
}
