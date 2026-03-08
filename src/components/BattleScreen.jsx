import React, { useState, useEffect, useRef } from 'react';
import { generateSpeechUrl } from '../services/elevenlabs';
import { audioSystem } from '../utils/audio';
import { uploadDrawingToCloudinary } from '../services/cloudinary';
import { createBattle } from '../services/db';
import { GiCrown, GiCrossedSwords } from 'react-icons/gi';
import { HiHome } from 'react-icons/hi';
import rumbleAudio from '../audios/rumble.mp3';
import winnerBg from '../assets/winner.avif';

// Harry: Fierce Warrior — dramatic battle announcer
const ANNOUNCER_VOICE = 'SOYHLrjzK2X1ezoPC6cr';
// Commentary voice — hype sports commentator
const COMMENTARY_VOICE = 'LG95yZDEHg6fCZdQjLqj';

const RUMBLE_WORDS = ["LET'S", 'GET', 'READY', 'TO', 'RUMBLE!!!'];
// Approximate ms from audio start when each word is spoken
const WORD_DELAYS = [500, 1200, 1900, 2600, 3400];

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
    const [phase, setPhase] = useState('rumble');  // rumble → video → verdict
    const [verdictAudioUrl, setVerdictAudioUrl] = useState(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [visibleWordIndex, setVisibleWordIndex] = useState(-1);
    const [commentaryAudioUrl, setCommentaryAudioUrl] = useState(null);

    const verdictAudioRef = useRef(null);
    const rumbleAudioRef = useRef(null);
    const commentaryAudioRef = useRef(null);
    const videoRef = useRef(null);

    const isHeroWinner = battleResult?.winner === 'hero';
    const winnerName = isHeroWinner ? heroData.name : bossData.name;

    /* ── Resume AudioContext (user already interacted on earlier screens) ── */
    useEffect(() => {
        audioSystem.resume();
    }, []);

    /* ── Pre-generate verdict audio on mount ── */
    useEffect(() => {
        audioSystem.setMusicVolume(0.04);

        // Pre-generate the winner announcement audio
        const verdictText = battleResult?.winnerVerdict || `${winnerName} is victorious!`;
        generateSpeechUrl(verdictText, ANNOUNCER_VOICE)
            .then(url => setVerdictAudioUrl(url))
            .catch(console.error);

        // Pre-generate the fight commentary audio
        const commentaryText = battleResult?.fightCommentary;
        if (commentaryText) {
            generateSpeechUrl(commentaryText, COMMENTARY_VOICE)
                .then(url => setCommentaryAudioUrl(url))
                .catch(console.error);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── Rumble phase: play audio + reveal words one by one ── */
    useEffect(() => {
        if (phase !== 'rumble') return;

        // Duck music during rumble
        audioSystem.setMusicVolume(0);

        const el = rumbleAudioRef.current;
        if (el) {
            el.volume = 1.0;
            el.onended = () => {
                console.log('[BattleScreen] Rumble audio ended → video phase');
                setPhase('video');
            };

            const playRumble = () => {
                console.log('[BattleScreen] Playing rumble audio (readyState:', el.readyState, ')');
                el.play()
                    .then(() => console.log('[BattleScreen] ✅ Rumble playing'))
                    .catch(e => {
                        console.error('[BattleScreen] ❌ Rumble play failed:', e);
                        setTimeout(() => setPhase('video'), 500);
                    });
            };

            // Wait for audio data to be ready before playing
            if (el.readyState >= 2) {
                playRumble();
            } else {
                console.log('[BattleScreen] Waiting for rumble to load (readyState:', el.readyState, ')…');
                el.addEventListener('canplay', playRumble, { once: true });
                el.load();
            }
        }

        // Show each word at its timed delay
        const wordTimers = WORD_DELAYS.map((delay, i) =>
            setTimeout(() => setVisibleWordIndex(i), delay)
        );

        // Safety fallback: advance to video after 9s regardless
        const safety = setTimeout(() => setPhase('video'), 9000);

        return () => {
            wordTimers.forEach(clearTimeout);
            clearTimeout(safety);
            if (el) el.onended = null;
        };
    }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── When phase becomes 'video', play video + commentary ── */
    useEffect(() => {
        if (phase !== 'video') return;

        console.log('[BattleScreen] Video phase — hasVideo:', !!videoDataUrl,
            'hasCommentaryUrl:', !!commentaryAudioUrl);

        // Play commentary if URL is available
        if (commentaryAudioRef.current && commentaryAudioUrl) {
            commentaryAudioRef.current.src = commentaryAudioUrl;
            commentaryAudioRef.current.volume = 1.0;
            commentaryAudioRef.current.play()
                .then(() => console.log('[BattleScreen] ✅ Commentary playing'))
                .catch(e => console.error('[BattleScreen] ❌ Commentary play failed:', e));
        }

        if (videoRef.current && videoDataUrl) {
            // Has video — play it, advance when it ends
            videoRef.current.src = videoDataUrl;
            videoRef.current.volume = 0.3;
            videoRef.current.play().catch(e => console.error('[BattleScreen] Video play failed:', e));
            videoRef.current.onended = () => setPhase('verdict');
        } else if (commentaryAudioUrl) {
            // No video, but have commentary — let it play, advance when it ends
            commentaryAudioRef.current.onended = () => {
                console.log('[BattleScreen] Commentary ended → verdict');
                setPhase('verdict');
            };
            const skip = setTimeout(() => setPhase('verdict'), 25000);
            return () => clearTimeout(skip);
        } else {
            // No video, no commentary yet — wait for commentary URL to arrive
            // (this effect re-runs when commentaryAudioUrl changes)
            console.log('[BattleScreen] Waiting for commentary URL to arrive…');
            const skip = setTimeout(() => {
                console.warn('[BattleScreen] Commentary URL timeout → verdict');
                setPhase('verdict');
            }, 15000);
            return () => clearTimeout(skip);
        }
    }, [phase, videoDataUrl, commentaryAudioUrl]);

    const hasSavedRef = useRef(false);

    /* ── When verdict phase starts ── */
    useEffect(() => {
        if (phase === 'verdict') {
            // Stop commentary so it doesn't overlap with the verdict
            if (commentaryAudioRef.current) {
                commentaryAudioRef.current.pause();
                commentaryAudioRef.current.currentTime = 0;
            }

            setShowConfetti(true);
            audioSystem.setMusicVolume(0.15);

            if (verdictAudioUrl && verdictAudioRef.current) {
                verdictAudioRef.current.src = verdictAudioUrl;
                verdictAudioRef.current.volume = 0.9;
                verdictAudioRef.current.play().catch(e => console.error('[BattleScreen] Verdict play failed:', e));
            }

            // Save to gallery (fire and forget)
            if (!hasSavedRef.current) {
                hasSavedRef.current = true;
                (async () => {
                    try {
                        console.log('[BattleScreen] Saving battle to gallery…');
                        // Upload drawing + hero image to Cloudinary in parallel
                        const [drawingUrl, heroImageUrl] = await Promise.all([
                            heroData?.drawing
                                ? uploadDrawingToCloudinary(heroData.drawing).catch(e => { console.error('[Gallery] Drawing upload failed:', e); return null; })
                                : null,
                            heroImage
                                ? uploadDrawingToCloudinary(heroImage).catch(e => { console.error('[Gallery] Hero image upload failed:', e); return null; })
                                : null,
                        ]);

                        const battleData = {
                            heroName: heroData?.name || 'Hero',
                            heroColor: heroData?.color || '#ffffff',
                            bossName: bossData?.name || 'Boss',
                            bossImage: bossData?.image || null,
                            drawingUrl,
                            heroImageUrl,
                            winner: battleResult?.winner || 'hero',
                            winnerName,
                            battleNarrative: battleResult?.battleNarrative || '',
                            winnerVerdict: battleResult?.winnerVerdict || '',
                            winnerReason: battleResult?.winnerReason || '',
                            fightCommentary: battleResult?.fightCommentary || '',
                            characterLore: heroData?.characterLore || '',
                        };

                        const id = await createBattle(battleData);
                        console.log('[BattleScreen] ✅ Saved to gallery, id:', id);
                    } catch (err) {
                        console.error('[BattleScreen] ❌ Gallery save failed:', err);
                    }
                })();
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
            <audio ref={verdictAudioRef} preload="auto" />
            {/* Fight commentary audio */}
            <audio ref={commentaryAudioRef} preload="auto" />
            {/* Rumble announcement audio */}
            <audio ref={rumbleAudioRef} src={rumbleAudio} preload="auto" />

            {/* ── RUMBLE INTRO ── */}
            {phase === 'rumble' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {visibleWordIndex >= 0 && (
                        <h1
                            key={visibleWordIndex}
                            style={{
                                fontSize: 'clamp(4rem, 18vw, 11rem)',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                textAlign: 'center',
                                color: visibleWordIndex === RUMBLE_WORDS.length - 1 ? '#ff2222' : '#ffffff',
                                textShadow: visibleWordIndex === RUMBLE_WORDS.length - 1
                                    ? '0 0 60px rgba(255,30,30,0.9), 0 0 120px rgba(255,0,0,0.5)'
                                    : '0 0 40px rgba(255,255,255,0.5)',
                                animation: visibleWordIndex === RUMBLE_WORDS.length - 1
                                    ? 'wordSlam 0.35s cubic-bezier(0.175,0.885,0.32,1.275), rumbleShake 0.6s ease 0.35s'
                                    : 'wordSlam 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
                                margin: 0,
                                padding: '0 1rem',
                            }}
                        >
                            {RUMBLE_WORDS[visibleWordIndex]}
                        </h1>
                    )}
                </div>
            )}

            {/* ── VIDEO + COMMENTARY PHASE ── */}
            {phase === 'video' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    background: '#000',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.5s ease',
                }}>
                    {videoDataUrl ? (
                        <video
                            ref={videoRef}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                            }}
                            playsInline
                            muted={false}
                        />
                    ) : (
                        <p style={{
                            color: 'rgba(255,255,255,0.85)',
                            fontSize: 'clamp(1.2rem, 3.5vw, 2rem)',
                            fontWeight: 700,
                            fontStyle: 'italic',
                            textAlign: 'center',
                            maxWidth: '700px',
                            lineHeight: 1.5,
                            padding: '2rem',
                            textShadow: '0 0 30px rgba(255,100,50,0.4)',
                        }}>
                            {battleResult?.fightCommentary || '...'}
                        </p>
                    )}
                </div>
            )}

            {/* ── VERDICT ── */}
            {phase === 'verdict' && (
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `url(${winnerBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                }}>
                    {/* Dark overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0, 0, 0, 0.5)',
                        pointerEvents: 'none',
                    }} />

                    <div style={{
                        position: 'relative', zIndex: 2,
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: '1.5rem',
                        animation: 'fadeIn 1s ease',
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderRadius: '24px',
                        padding: '2.5rem 3rem',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                    }}>
                        <p style={{
                            color: 'rgba(255,220,150,0.9)',
                            fontSize: '0.85rem',
                            letterSpacing: '0.35em',
                            textTransform: 'uppercase',
                            fontWeight: 600,
                            margin: 0,
                        }}>
                            <GiCrown style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.4em', fontSize: '1.1em' }} /> AND THE WINNER IS…
                        </p>

                        <h1 style={{
                            fontSize: 'clamp(2rem, 7vw, 4rem)',
                            fontWeight: 900,
                            color: '#fff',
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            textShadow: '0 0 40px rgba(255,200,100,0.5), 0 0 80px rgba(255,150,50,0.2)',
                            margin: 0,
                            lineHeight: 1.1,
                        }}>
                            {winnerName}
                        </h1>

                        {/* Winner Image */}
                        <div style={{
                            borderRadius: '16px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 30px rgba(0,0,0,0.5), 0 0 60px rgba(255,170,50,0.15)',
                            border: '2px solid rgba(255,255,255,0.15)',
                        }}>
                            <img
                                src={isHeroWinner ? (heroImage || heroData.drawing) : bossData.image}
                                alt={winnerName}
                                style={{
                                    display: 'block',
                                    maxWidth: '100%',
                                    maxHeight: '35vh',
                                    objectFit: 'contain',
                                }}
                            />
                        </div>

                        <p style={{
                            color: 'rgba(255,255,255,0.65)',
                            fontSize: '0.95rem',
                            fontStyle: 'italic',
                            maxWidth: '420px',
                            margin: 0,
                            lineHeight: 1.5,
                        }}>
                            {battleResult?.winnerReason}
                        </p>

                        {/* Buttons */}
                        <div style={{
                            display: 'flex', gap: '0.75rem',
                            marginTop: '0.5rem',
                        }}>
                            <button
                                onClick={() => {
                                    audioSystem.setMusicVolume(0.4);
                                    onFinish('home');
                                }}
                                style={{
                                    padding: '0.65rem 1.75rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: 'rgba(255,255,255,0.08)',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    backdropFilter: 'blur(6px)',
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                            >
                                <HiHome style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em', fontSize: '1.1em' }} /> Home
                            </button>
                            <button
                                onClick={() => {
                                    audioSystem.setMusicVolume(0.4);
                                    onFinish('play-again');
                                }}
                                style={{
                                    padding: '0.65rem 1.75rem',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, #ffaa32, #ff6b00)',
                                    color: '#fff',
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 20px rgba(255,170,50,0.35)',
                                }}
                                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                            >
                                <GiCrossedSwords style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.3em', fontSize: '1.1em' }} /> Battle Again
                            </button>
                        </div>
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
        @keyframes wordSlam {
          0%   { opacity: 0; transform: scale(4); filter: blur(8px); }
          60%  { opacity: 1; transform: scale(0.92); filter: blur(0); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }
        @keyframes rumbleShake {
          0%, 100% { transform: scale(1) translateX(0); }
          15%       { transform: scale(1.05) translateX(-6px); }
          30%       { transform: scale(1.05) translateX(6px); }
          45%       { transform: scale(1.08) translateX(-4px); }
          60%       { transform: scale(1.08) translateX(4px); }
          75%       { transform: scale(1.05) translateX(-2px); }
          90%       { transform: scale(1.05) translateX(2px); }
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
