import React, { useState, useEffect, useRef } from 'react';
import { generateSpeechUrl } from '../services/elevenlabs';
import { audioSystem } from '../utils/audio';
import originBg from '../assets/origin_bg.avif';

// ─── Voice IDs ───
// Brian: Deep, Resonant and Comforting — premade (free-tier)
const NARRATOR_VOICE = 'nPczCjzI2devNBz1zQrb';

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
    const [narrationText, setNarrationText] = useState('');
    const [videoDataUrl, setVideoDataUrl] = useState(null);

    const audioRef = useRef(null);
    const hasStartedVideo = useRef(false);
    const allDone = useRef(false);

    // Register audio element for iOS unlock
    useEffect(() => {
        const el = audioRef.current;
        if (el) audioSystem.registerAudio(el);
        return () => { if (el) audioSystem.unregisterAudio(el); };
    }, []);

    /* ── 1. kick off the pipeline on mount ── */
    useEffect(() => {
        let cancelled = false;

        // Duck background music for the cinematic reveal
        audioSystem.setMusicVolume(0.05);

        async function runPipeline() {
            console.log('[OriginStory] Pipeline starting…');
            console.log('[OriginStory] heroData:', { name: heroData.name, loreLen: heroData.characterLore?.length, voiceDescLen: heroData.voiceDescription?.length, hasDrawing: !!heroData.drawing });
            console.log('[OriginStory] bossData:', { name: bossData.name });

            // We'll build a battle result — either from Gemini or a fallback
            let battle = null;

            /* ── Step A: Gemini Vision → battle logic ── */
            try {
                setStatusText('Summoning the Battle Judge…');
                console.log('[OriginStory] Step A: Calling /api/generate-battle…');
                const battleRes = await fetch('/api/generate-battle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ heroData, bossData }),
                });
                if (!battleRes.ok) {
                    const errBody = await battleRes.text();
                    throw new Error(`Battle API returned ${battleRes.status}: ${errBody}`);
                }
                battle = await battleRes.json();
                if (battle.error) throw new Error(`Battle API error: ${battle.error}`);
                console.log('[OriginStory] ✅ Step A complete — winner:', battle.winner);
            } catch (err) {
                console.error('[OriginStory] ❌ Step A (generate-battle) FAILED:', err.message);
                battle = {
                    winner: 'hero',
                    winnerReason: `${heroData.name} overwhelmed the opponent with sheer determination.`,
                    battleNarrative: `In a clash of epic proportions, ${heroData.name} faced ${bossData.name} in a battle that shook the heavens. Despite overwhelming odds, the hero's raw power and unbreakable will proved too much. Victory was claimed in a final devastating strike.`,
                    winnerVerdict: `${heroData.name} is victorious!`,
                    videoPrompt: `Anime style showdown: ${heroData.name} and ${bossData.name} face each other with glowing energy auras, leaping gracefully through the air, colorful magical beams of light swirling between them, dramatic wind and sparkles, Studio Ghibli quality, vibrant particle effects, dynamic swooping camera.`,
                    imagePrompt: `High-quality anime style character portrait, Studio Ghibli, highly detailed anime aesthetic: ${heroData.characterLore || heroData.voiceDescription || heroData.name}.`,
                };
                console.log('[OriginStory] Using fallback battle result');
            }

            if (cancelled) return;
            setBattleResult(battle);

            /* ── Step B: Imagen 3 → high-quality hero art ── */
            const imagePrompt = battle.imagePrompt || `High-quality anime style character portrait, Studio Ghibli, 16:9 cinematic: ${heroData.characterLore || heroData.voiceDescription || heroData.name}. Highly detailed anime aesthetic.`;
            setStatusText('Forging your legend in fire…');
            console.log('[OriginStory] Step B: Calling /api/generate-image…');

            let generatedImageDataUrl = null;

            const imagePromise = fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: imagePrompt }),
            }).then(async r => {
                if (!r.ok) {
                    const errBody = await r.text();
                    throw new Error(`Image API returned ${r.status}: ${errBody}`);
                }
                return r.json();
            }).then(data => {
                if (!cancelled) {
                    console.log('[OriginStory] ✅ Step B complete — image received, length:', data.image?.length || 0);
                    generatedImageDataUrl = data.image;
                    setHeroImage(data.image);

                    // 🎬 As soon as we have the image, kick off video generation (image-to-video)
                    const videoPrompt = battle.videoPrompt || `Anime style showdown: ${heroData.name} and ${bossData.name} face each other with glowing energy auras, leaping gracefully through the air, colorful magical beams of light swirling between them, dramatic wind and sparkles, Studio Ghibli quality, vibrant particle effects, dynamic swooping camera.`;
                    console.log('[OriginStory] Step D: Starting video with image-to-video…');
                    setStatusText('Preparing the battlefield…');

                    fetch('/api/generate-video', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: videoPrompt, image: data.image }),
                    }).then(async r => {
                        if (!r.ok) {
                            const errBody = await r.text();
                            throw new Error(`Video API returned ${r.status}: ${errBody}`);
                        }
                        return r.json();
                    }).then(videoData => {
                        if (!cancelled) {
                            console.log('[OriginStory] ✅ Step D complete — video received, length:', videoData.video?.length || 0);
                            setVideoDataUrl(videoData.video);
                            allDone.current = true;
                        }
                    }).catch(err => {
                        console.error('[OriginStory] ❌ Step D (video) FAILED:', err.message);
                        allDone.current = true; // Don't block on video failure
                    });
                }
            }).catch(err => console.error('[OriginStory] ❌ Step B (generate-image) FAILED:', err.message));

            /* ── Step C: ElevenLabs → origin narration (hero-only, no battle/boss) ── */
            const loreText = heroData.characterLore || heroData.voiceDescription || `The legend of ${heroData.name} begins now.`;
            console.log('[OriginStory] Step C: Generating narration, text length:', loreText.length);
            if (!cancelled) setNarrationText(loreText);

            const narrationPromise = generateSpeechUrl(loreText, NARRATOR_VOICE)
                .then(url => {
                    if (!cancelled) {
                        console.log('[OriginStory] ✅ Step C complete — narration URL:', url ? 'blob URL received' : 'null (failed)');
                        setNarrationUrl(url);
                    }
                })
                .catch(err => console.error('[OriginStory] ❌ Step C (narration) FAILED:', err.message));

            // Wait for image + narration before revealing — video continues in background
            const results = await Promise.allSettled([imagePromise, narrationPromise]);
            console.log('[OriginStory] Image+Narration settled:', results.map(r => r.status));
            if (!cancelled) setPhase('reveal');
        }

        runPipeline();
        return () => { cancelled = true; };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 2. play narration when reveal phase starts ── */
    useEffect(() => {
        if (phase === 'reveal') {
            console.log('[OriginStory] Reveal phase — narrationUrl:', narrationUrl ? 'present' : 'null');
            if (narrationUrl && audioRef.current) {
                audioRef.current.src = narrationUrl;
                audioRef.current.volume = 0.85;
                // Small delay to let iOS settle after unlock
                setTimeout(() => {
                    audioRef.current.play().catch((e) => {
                        console.error('[OriginStory] Audio play failed:', e.message);
                    });
                }, 100);

                audioRef.current.onended = () => {
                    console.log('[OriginStory] Narration ended, video ready:', !!(videoDataUrl || allDone.current));
                    // Narration finished — if video is ready, advance. Otherwise wait.
                    if (videoDataUrl || allDone.current) {
                        goToBattle();
                    } else {
                        setPhase('waiting');
                    }
                };
            } else {
                // No narration available — wait a few seconds then advance anyway
                console.warn('[OriginStory] No narration URL — will auto-advance in 6s');
                setTimeout(() => {
                    if (!hasStartedVideo.current) {
                        console.log('[OriginStory] Auto-advancing (no narration timeout)');
                        setPhase('waiting');
                    }
                }, 6000);
            }
        }
    }, [phase, narrationUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 3. if we're waiting and the video arrives, go! ── */
    useEffect(() => {
        if (phase === 'waiting') {
            if (videoDataUrl) {
                console.log('[OriginStory] Video ready — advancing to battle in 1.5s');
                setTimeout(() => goToBattle(), 1500);
            } else {
                // Safety: don't wait forever for video — advance after 120s
                console.log('[OriginStory] Waiting for video (will timeout in 120s)…');
                const safetyTimer = setTimeout(() => {
                    if (!hasStartedVideo.current) {
                        console.warn('[OriginStory] Video timeout — advancing to battle without video');
                        goToBattle();
                    }
                }, 120000);
                return () => clearTimeout(safetyTimer);
            }
        }
    }, [phase, videoDataUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    function goToBattle() {
        if (hasStartedVideo.current) return;
        hasStartedVideo.current = true;
        console.log('[OriginStory] → Transitioning to BattleScreen', { hasBattle: !!battleResult, hasImage: !!heroImage, hasVideo: !!videoDataUrl });
        audioSystem.setMusicVolume(0.08);
        onBattleReady({ battleResult, heroImage, videoDataUrl });
    }

    /* ── render ── */
    return (
        <div style={{
            position: 'fixed', inset: 0,
            backgroundImage: `url(${originBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Dark overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0, 0, 0, 0.55)',
                pointerEvents: 'none',
            }} />

            {/* Hidden audio element for narration */}
            <audio ref={audioRef} style={{ position: 'relative', zIndex: 1 }} />

            {/* ── LOADING PHASE ── */}
            {phase === 'loading' && (
                <div style={{
                    position: 'relative', zIndex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '1.5rem',
                    animation: 'fadeIn 0.5s ease',
                }}>
                    {/* Hero Original Drawing + Pulsing Ring */}
                    <div style={{ position: 'relative', width: '300px', height: '300px' }}>
                        {/* The Drawing */}
                        <div style={{
                            position: 'absolute', inset: '10px',
                            borderRadius: '50%',
                            background: '#fff',
                            overflow: 'hidden',
                            boxShadow: '0 0 30px rgba(255,170,50,0.2)',
                        }}>
                            <img
                                src={heroData.drawing}
                                alt="Your drawing"
                                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                        </div>

                        {/* Pulsing ring overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            borderRadius: '50%',
                            border: '4px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#ffe066',
                            animation: 'spin 1.5s linear infinite',
                        }} />
                    </div>

                    <h2 style={{
                        color: '#fff',
                        fontSize: '1.4rem',
                        fontWeight: 700,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        textAlign: 'center',
                        textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                    }}>
                        {statusText}
                    </h2>

                    <p style={{
                        color: 'rgba(255,255,255,0.8)',
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
                    position: 'relative', zIndex: 1,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '0.75rem',
                    animation: 'fadeIn 1.5s ease',
                    width: '100%', maxWidth: '900px',
                    padding: '1rem',
                }}>
                    {/* Hero Name */}
                    <h1 style={{
                        color: '#fff',
                        fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        textShadow: '0 0 20px rgba(255,255,255,0.6), 0 2px 10px rgba(0,0,0,0.3)',
                        textAlign: 'center',
                        animation: 'pulse-glow 3s ease-in-out infinite',
                        margin: 0,
                    }}>
                        {heroData.name}
                    </h1>

                    {/* AI Generated Image */}
                    <div style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '600px',
                        aspectRatio: '16/9',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 0 50px rgba(255,255,255,0.3), 0 10px 60px rgba(0,0,0,0.3)',
                        border: '3px solid rgba(255,255,255,0.5)',
                        background: 'radial-gradient(ellipse at center, #f0e6ff 0%, #e0d0f5 100%)',
                    }}>
                        {heroImage ? (
                            <img
                                src={heroImage}
                                alt={heroData.name}
                                style={{
                                    width: '100%', height: '100%',
                                    objectFit: 'contain',
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
                                    background: 'radial-gradient(ellipse at center, #1a1030 0%, #0d0d1a 100%)',
                                }}
                            />
                        )}

                        {/* Subtle vignette overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(ellipse at center, transparent 60%, rgba(255,255,255,0.15) 100%)',
                            pointerEvents: 'none',
                        }} />
                    </div>

                    {/* Lore text (what the narrator reads) */}
                    <p style={{
                        color: '#fff',
                        fontSize: 'clamp(0.85rem, 2vw, 1rem)',
                        lineHeight: 1.6,
                        maxWidth: '600px',
                        textAlign: 'center',
                        fontStyle: 'italic',
                        animation: 'fadeIn 2s ease 0.5s both',
                        margin: 0,
                        background: 'rgba(0,0,0,0.25)',
                        backdropFilter: 'blur(8px)',
                        padding: '0.75rem 1.25rem',
                        borderRadius: '12px',
                        textShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }}>
                        "{narrationText || heroData.characterLore || heroData.voiceDescription}"
                    </p>

                    {/* Waiting for video indicator */}
                    {phase === 'waiting' && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                            animation: 'fadeIn 0.5s ease',
                        }}>
                            <div style={{
                                width: '16px', height: '16px',
                                borderRadius: '50%',
                                border: '2px solid rgba(255,255,255,0.4)',
                                borderTopColor: '#ffe066',
                                animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{
                                color: '#fff',
                                fontSize: '0.85rem',
                                letterSpacing: '0.1em',
                                textShadow: '0 1px 3px rgba(0,0,0,0.3)',
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
        @keyframes pulse-glow {
          0%, 100% { text-shadow: 0 0 20px rgba(255,220,100,0.4); }
          50% { text-shadow: 0 0 40px rgba(255,220,100,0.8), 0 0 60px rgba(255,150,50,0.3); }
        }
      `}</style>
        </div>
    );
}
