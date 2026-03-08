import React, { useState, useEffect, useRef } from 'react';
import { generateSpeechUrl } from '../services/elevenlabs';
import { audioSystem } from '../utils/audio';

// ─── Voice IDs ───
// Daniel: Deep British narrator (like a movie trailer)
const NARRATOR_VOICE = 'onwK4e9ZLuTAKqWW03F9';

/**
 * OriginStory screen — the cinematic reveal.
 *
 * Pipeline (all kicked off in parallel):
 *   1. Gemini Vision  →  battleResult  (winner, narrative, videoPrompt)
 *   2. Imagen 3       →  heroImage     (high-quality character art)
 *   3. ElevenLabs     →  narrationUrl  (origin story audio)
 *   4. Veo            →  videoUrl      (battle clip, started once we have battleResult)
 *
 * While 1-3 load we show a "Forging…" loading shimmer.
 * Once image + audio are ready we reveal the character + play narration.
 * Veo keeps loading behind the scenes; when ready we auto-advance to BattleScreen.
 */
export default function OriginStory({ heroData, bossData, onBattleReady }) {
    /* ── state ── */
    const [phase, setPhase] = useState('loading');   // loading → reveal → waiting → done
    const [statusText, setStatusText] = useState('Analyzing your legend…');
    const [heroImage, setHeroImage] = useState(null);
    const [battleResult, setBattleResult] = useState(null);
    const [narrationUrl, setNarrationUrl] = useState(null);
    const [videoDataUrl, setVideoDataUrl] = useState(null);

    const audioRef = useRef(null);
    const hasStartedVideo = useRef(false);
    const allDone = useRef(false);

    /* ── 1. kick off the pipeline on mount ── */
    useEffect(() => {
        let cancelled = false;

        // Duck background music for the cinematic reveal
        audioSystem.setMusicVolume(0.05);

        async function runPipeline() {
            try {
                /* ── Step A: Gemini Vision → battle logic ── */
                setStatusText('Summoning the Battle Judge…');
                const battleRes = await fetch('http://localhost:5000/api/generate-battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ heroData, bossData }),
                });
                const battle = await battleRes.json();
                if (cancelled) return;
                setBattleResult(battle);

                /* ── Step B: Imagen 3 → high-quality hero art (fire and forget) ── */
                const imagePrompt = `Epic fantasy character portrait, 16:9 cinematic, dramatic lighting: ${heroData.characterLore || heroData.voiceDescription || heroData.name}. Digital painting, ultra-detailed, trending on ArtStation.`;
                setStatusText('Forging your legend in fire…');

                const imagePromise = fetch('http://localhost:5000/api/generate-image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: imagePrompt }),
                }).then(r => r.json()).then(data => {
                    if (!cancelled) setHeroImage(data.image);
                }).catch(err => console.error('Image gen failed:', err));

                /* ── Step C: ElevenLabs → origin narration ── */
                const loreText = battle.battleNarrative
                    ? `${heroData.characterLore || heroData.voiceDescription}. ${battle.battleNarrative}`
                    : heroData.characterLore || heroData.voiceDescription || `The legend of ${heroData.name} begins now.`;

                const narrationPromise = generateSpeechUrl(loreText, NARRATOR_VOICE)
                    .then(url => { if (!cancelled) setNarrationUrl(url); })
                    .catch(err => console.error('Narration gen failed:', err));

                /* ── Step D: Veo → battle video (started now, runs long) ── */
                const videoPrompt = battle.videoPrompt || `Epic cinematic battle between ${heroData.name} and ${bossData.name}. Slow motion, dramatic lighting.`;
                setStatusText('Preparing the battlefield…');

                const videoPromise = fetch('http://localhost:5000/api/generate-video', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: videoPrompt }),
                }).then(r => r.json()).then(data => {
                    if (!cancelled) setVideoDataUrl(data.video);
                }).catch(err => console.error('Video gen failed:', err));

                // Wait for image + narration (fast ones) before revealing
                await Promise.allSettled([imagePromise, narrationPromise]);
                if (!cancelled) setPhase('reveal');

                // Video continues in background — we don't await it here
                videoPromise.then(() => {
                    if (!cancelled) allDone.current = true;
                });

            } catch (err) {
                console.error('Pipeline error:', err);
                setStatusText('Recovering…');

                // Create fallback battle result so we can still proceed
                const fallbackBattle = {
                    winner: 'hero',
                    winnerReason: `${heroData.name} overwhelmed the opponent with sheer determination.`,
                    battleNarrative: `In a clash of epic proportions, ${heroData.name} faced ${bossData.name} in a battle that shook the heavens. Despite overwhelming odds, the hero's raw power and unbreakable will proved too much. Victory was claimed in a final devastating strike.`,
                    winnerVerdict: `${heroData.name} is victorious!`,
                    videoPrompt: `Epic cinematic battle between ${heroData.name} and ${bossData.name}. Slow motion, dramatic lighting, cinematic, photorealistic, 4K.`,
                };
                if (!cancelled) {
                    setBattleResult(fallbackBattle);
                    setPhase('reveal');
                }
            }
        }

        runPipeline();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 2. play narration when reveal phase starts ── */
    useEffect(() => {
        if (phase === 'reveal' && narrationUrl && audioRef.current) {
            audioRef.current.src = narrationUrl;
            audioRef.current.volume = 0.85;
            audioRef.current.play().catch(() => { });

            audioRef.current.onended = () => {
                // Narration finished — if video is ready, advance. Otherwise wait.
                if (videoDataUrl || allDone.current) {
                    goToBattle();
                } else {
                    setPhase('waiting');
                }
            };
        }
    }, [phase, narrationUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 3. if we're waiting and the video arrives, go! ── */
    useEffect(() => {
        if (phase === 'waiting' && videoDataUrl) {
            // Small dramatic pause
            setTimeout(() => goToBattle(), 1500);
        }
    }, [phase, videoDataUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    function goToBattle() {
        if (hasStartedVideo.current) return;
        hasStartedVideo.current = true;
        audioSystem.setMusicVolume(0.08);
        onBattleReady({ battleResult, heroImage, videoDataUrl });
    }

    /* ── render ── */
    return (
        <div style={{
            position: 'fixed', inset: 0,
            background: '#0a0a0f',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
        }}>

            {/* Hidden audio element for narration */}
            <audio ref={audioRef} />

            {/* ── LOADING PHASE ── */}
            {phase === 'loading' && (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '1.5rem',
                    animation: 'fadeIn 0.5s ease',
                }}>
                    {/* Pulsing ring */}
                    <div style={{
                        width: '120px', height: '120px',
                        borderRadius: '50%',
                        border: '3px solid rgba(255,170,50,0.3)',
                        borderTopColor: '#ffaa32',
                        animation: 'spin 1s linear infinite',
                    }} />

                    <h2 style={{
                        color: '#ffaa32',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                    }}>
                        {statusText}
                    </h2>

                    <p style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: '0.85rem',
                        maxWidth: '300px',
                        textAlign: 'center',
                        lineHeight: 1.5,
                    }}>
                        Gemini Vision is analyzing your drawing…<br />
                        The legends are being forged.
                    </p>
                </div>
            )}

            {/* ── REVEAL PHASE ── */}
            {(phase === 'reveal' || phase === 'waiting') && (
                <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '2rem',
                    animation: 'fadeIn 1.5s ease',
                    width: '100%', maxWidth: '900px',
                    padding: '2rem',
                }}>
                    {/* Hero Name */}
                    <h1 style={{
                        color: '#fff',
                        fontSize: 'clamp(1.8rem, 5vw, 3rem)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        textShadow: '0 0 40px rgba(255,170,50,0.5)',
                        textAlign: 'center',
                        animation: 'pulse-glow 3s ease-in-out infinite',
                    }}>
                        ⚔️ {heroData.name} ⚔️
                    </h1>

                    {/* AI Generated Image */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '700px',
                        aspectRatio: '16/9',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 0 60px rgba(255,170,50,0.25), 0 20px 60px rgba(0,0,0,0.6)',
                        border: '2px solid rgba(255,170,50,0.3)',
                    }}>
                        {heroImage ? (
                            <img
                                src={heroImage}
                                alt={heroData.name}
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'cover',
                                    animation: 'fadeIn 1.5s ease',
                                }}
                            />
                        ) : (
                            /* fallback: show their drawing if imagen failed */
                            <img
                                src={heroData.drawing}
                                alt={heroData.name}
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'contain',
                                    background: '#fff',
                                }}
                            />
                        )}

                        {/* Subtle vignette overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)',
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* Lore text (scrolls under narration) */}
                    <p style={{
                        color: 'rgba(255,255,255,0.7)',
                        fontSize: 'clamp(0.9rem, 2.5vw, 1.15rem)',
                        lineHeight: 1.7,
                        maxWidth: '600px',
                        textAlign: 'center',
                        fontStyle: 'italic',
                        animation: 'fadeIn 2s ease 0.5s both',
                    }}>
                        "{heroData.characterLore || heroData.voiceDescription}"
                    </p>

                    {/* Battle narrative from Gemini */}
                    {battleResult?.battleNarrative && (
                        <p style={{
                            color: 'rgba(255,200,100,0.8)',
                            fontSize: 'clamp(0.8rem, 2vw, 1rem)',
                            lineHeight: 1.6,
                            maxWidth: '550px',
                            textAlign: 'center',
                            animation: 'fadeIn 2s ease 1.5s both',
                        }}>
                            {battleResult.battleNarrative}
                        </p>
                    )}

                    {/* Waiting for video indicator */}
                    {phase === 'waiting' && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            animation: 'fadeIn 0.5s ease',
                        }}>
                            <div style={{
                                width: '16px', height: '16px',
                                borderRadius: '50%',
                                border: '2px solid rgba(255,170,50,0.4)',
                                borderTopColor: '#ffaa32',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: '0.85rem',
                                letterSpacing: '0.1em',
                            }}>
                                Preparing the battlefield…
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* ── CSS Keyframes ── */}
            <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
