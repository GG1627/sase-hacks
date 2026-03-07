import React, { useRef, useState, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import heroBg from '../assets/hero_bg.png';
import {
    LuMic, LuPenLine, LuEraser, LuUndo2, LuCheck,
    LuPencil, LuZap, LuCrown, LuFlame, LuEye
} from 'react-icons/lu';
import { GiCrossedSwords } from 'react-icons/gi';
import { useVoice } from '../hooks/useVoice';
import { useVolume } from '../hooks/useVolume';

// ── Floating background icons ──
const BG_ICONS = [
    { Icon: LuPencil, rotate: '-12deg', top: '6%', left: '6%', delay: '0s' },
    { Icon: GiCrossedSwords, rotate: '18deg', top: '8%', left: '50%', delay: '0.4s' },
    { Icon: LuZap, rotate: '-8deg', top: '5%', left: '90%', delay: '0.8s' },
    { Icon: LuCrown, rotate: '10deg', top: '88%', left: '8%', delay: '0.6s' },
    { Icon: LuFlame, rotate: '-6deg', top: '90%', left: '52%', delay: '0.3s' },
    { Icon: LuEye, rotate: '14deg', top: '86%', left: '88%', delay: '0.7s' },
];

// ── Particle effect presets ──
const PARTICLE_PRESETS = {
    fire: {
        colors: ['#FF4500', '#FF6B35', '#FFD700', '#FF8C00'],
        sizeRange: [4, 12], lifetime: 800, spread: 20, gravity: -0.8,
        glow: true, emoji: null,
    },
    ice: {
        colors: ['#00BFFF', '#87CEEB', '#E0F7FF', '#B0E0E6'],
        sizeRange: [3, 8], lifetime: 1000, spread: 15, gravity: 0.3,
        glow: true, emoji: '❄',
    },
    lightning: {
        colors: ['#FFFF00', '#FFD700', '#FFFACD', '#FFF8DC'],
        sizeRange: [2, 6], lifetime: 400, spread: 35, gravity: 0,
        glow: true, emoji: '⚡',
    },
    magic: {
        colors: ['#9B59B6', '#8E44AD', '#D2B4DE', '#F5B7B1'],
        sizeRange: [3, 10], lifetime: 1200, spread: 25, gravity: -0.3,
        glow: true, emoji: '✨',
    },
    poison: {
        colors: ['#00FF00', '#32CD32', '#7CFC00', '#ADFF2F'],
        sizeRange: [4, 10], lifetime: 900, spread: 18, gravity: 0.4,
        glow: true, emoji: null,
    },
    dark: {
        colors: ['#4A0E4E', '#2C003E', '#7B2D8E', '#1A1A2E'],
        sizeRange: [5, 14], lifetime: 1100, spread: 22, gravity: -0.2,
        glow: false, emoji: null,
    },
};

// ── Backdrop keywords → Unsplash query ──
const BACKDROP_MAP = {
    'city': 'dark+city+night',
    'ruined city': 'destroyed+city+ruins',
    'ruins': 'ancient+ruins+dark',
    'forest': 'dark+enchanted+forest',
    'ocean': 'stormy+dark+ocean',
    'space': 'outer+space+stars+nebula',
    'desert': 'desert+sand+dunes+night',
    'mountain': 'dark+mountain+peak+storm',
    'volcano': 'volcano+lava+eruption',
    'castle': 'dark+castle+gothic',
    'dungeon': 'dark+dungeon+stone',
    'arena': 'colosseum+arena+ancient',
    'sky': 'dramatic+sky+clouds+dark',
    'battlefield': 'war+battlefield+dark',
    'cave': 'dark+crystal+cave',
    'underwater': 'deep+ocean+underwater+dark',
    'snow': 'blizzard+snow+frozen+landscape',
    'hell': 'fiery+inferno+lava+dark',
    'heaven': 'clouds+golden+light+ethereal',
    'cemetery': 'cemetery+graveyard+dark+night',
};

// ── Weather / atmospheric CSS overlays ──
const WEATHER_KEYWORDS = ['rain', 'snow', 'storm', 'blizzard', 'fog', 'mist'];

export default function Canvas({ playerData, bossData, onComplete }) {
    const activeColor = playerData.color;

    // ── Canvas state ──
    const sigCanvas = useRef(null);
    const particleCanvasRef = useRef(null);
    const canvasContainerRef = useRef(null);
    const [penColor, setPenColor] = useState(activeColor);
    const [isErasing, setIsErasing] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState({ min: 1, max: 4 });

    // ── Timer ──
    const [timeLeft, setTimeLeft] = useState(300);
    const [isTimeUp, setIsTimeUp] = useState(false);

    // ── Particles ──
    const [activeEffect, setActiveEffect] = useState(null);
    const particlesRef = useRef([]);
    const pointerRef = useRef({ x: 0, y: 0, active: false });
    const particleRafRef = useRef(null);

    // ── Backdrop ──
    const [backdropUrl, setBackdropUrl] = useState(null);
    const [backdropOpacity, setBackdropOpacity] = useState(0);
    const [weatherEffect, setWeatherEffect] = useState(null);

    // ── Shake (volume reactivity) ──
    const [shakeIntensity, setShakeIntensity] = useState(0);

    // ── Playback stroke recording ──
    const strokeTimelineRef = useRef([]);
    const sessionStartRef = useRef(Date.now());

    // ── Volume hook ──
    const { volume, isShouting, startVolume, stopVolume } = useVolume(0.4);

    // ── Voice handler ──
    const handleVoiceCommand = useCallback((text) => {
        // Tool switching
        if (text.includes('eraser') || text.includes('erase')) {
            setPenColor('#ffffff'); setIsErasing(true);
        } else if (text.includes('pen') || text.includes('pencil') || text.includes('draw')) {
            setPenColor(activeColor); setIsErasing(false);
        }

        // Color changing
        const colorMap = {
            red: '#DC2626', blue: '#2563EB', green: '#16A34A', purple: '#7C3AED', violet: '#7C3AED',
            orange: '#EA580C', teal: '#0D9488', brown: '#B45309', bronze: '#B45309',
            pink: '#DB2777', rose: '#DB2777', black: '#111111', yellow: '#FACC15',
            white: '#ffffff', gray: '#6B7280', grey: '#6B7280', gold: '#CA8A04',
            crimson: '#DC143C', cyan: '#00CED1', magenta: '#FF00FF', navy: '#000080',
            silver: '#C0C0C0', scarlet: '#FF2400', lime: '#00FF00', maroon: '#800000',
            indigo: '#4B0082', coral: '#FF7F50', turquoise: '#40E0D0',
        };
        for (const [colorName, hex] of Object.entries(colorMap)) {
            if (text.includes(colorName)) {
                setPenColor(hex); setIsErasing(false);
            }
        }

        // Thickness
        if (text.includes('thicker') || text.includes('bigger') || text.includes('fat') || text.includes('bold') || text.includes('heavy')) {
            setStrokeWidth(prev => ({ min: Math.min(prev.min + 1.5, 8), max: Math.min(prev.max + 2, 16) }));
        } else if (text.includes('thinner') || text.includes('smaller') || text.includes('thin') || text.includes('fine') || text.includes('light')) {
            setStrokeWidth(prev => ({ min: Math.max(prev.min - 1.5, 0.5), max: Math.max(prev.max - 2, 2) }));
        }

        // ── FEATURE 1: Voice-Activated Particle Effects ──
        if (text.includes('fire') || text.includes('flame') || text.includes('burn') || text.includes('ignite')) {
            setActiveEffect('fire');
        } else if (text.includes('ice') || text.includes('frost') || text.includes('freeze') || text.includes('frozen')) {
            setActiveEffect('ice');
        } else if (text.includes('lightning') || text.includes('electric') || text.includes('thunder') || text.includes('shock') || text.includes('zap')) {
            setActiveEffect('lightning');
        } else if (text.includes('magic') || text.includes('sparkle') || text.includes('enchant') || text.includes('spell') || text.includes('glow')) {
            setActiveEffect('magic');
        } else if (text.includes('poison') || text.includes('toxic') || text.includes('acid') || text.includes('venom')) {
            setActiveEffect('poison');
        } else if (text.includes('dark') || text.includes('shadow') || text.includes('void') || text.includes('darkness')) {
            setActiveEffect('dark');
        } else if (text.includes('normal') || text.includes('no effect') || text.includes('stop effect') || text.includes('clear effect') || text.includes('remove effect')) {
            setActiveEffect(null);
        }

        // ── FEATURE 3: Voice-Triggered Backdrops ──
        for (const [keyword, query] of Object.entries(BACKDROP_MAP)) {
            if (text.includes(keyword)) {
                setBackdropUrl(`https://source.unsplash.com/1024x768/?${query}`);
                setBackdropOpacity(0.2);
                break;
            }
        }
        // Backdrop opacity control
        if (text.includes('brighter background') || text.includes('more background') || text.includes('show background')) {
            setBackdropOpacity(prev => Math.min(prev + 0.1, 0.5));
        } else if (text.includes('dimmer background') || text.includes('less background') || text.includes('hide background')) {
            setBackdropOpacity(prev => Math.max(prev - 0.1, 0));
        } else if (text.includes('remove background') || text.includes('clear background') || text.includes('no background')) {
            setBackdropUrl(null); setBackdropOpacity(0);
        }

        // Weather effects
        for (const w of WEATHER_KEYWORDS) {
            if (text.includes(w)) {
                setWeatherEffect(w.includes('rain') || w.includes('storm') ? 'rain' : w.includes('snow') || w.includes('blizzard') ? 'snow' : 'fog');
                break;
            }
        }
        if (text.includes('clear weather') || text.includes('stop weather') || text.includes('no weather') || text.includes('sunny')) {
            setWeatherEffect(null);
        }

        // Actions
        if (text.includes('clear') && !text.includes('clear effect') && !text.includes('clear background') && !text.includes('clear weather')) {
            if (!isTimeUp && sigCanvas.current) sigCanvas.current.clear();
        }
        if (text.includes('undo') || text.includes('go back') || text.includes('mistake') || text.includes('oops')) {
            if (!isTimeUp && sigCanvas.current) {
                const data = sigCanvas.current.toData();
                if (data && data.length > 0) { data.pop(); sigCanvas.current.fromData(data); }
            }
        }
        if (text.includes('finish') || text.includes("i'm done") || text.includes('im done') || text.includes('submit') || text.includes('done')) {
            if (!isTimeUp) setTimeLeft(0);
        }
    }, [activeColor, isTimeUp]);

    const { transcript, isListening, toggleListening, startListening, stopListening } = useVoice(handleVoiceCommand);

    // ── Init: start voice + volume ──
    useEffect(() => {
        startListening();
        startVolume();
        sessionStartRef.current = Date.now();
        return () => { stopListening(); stopVolume(); };
    }, [startListening, stopListening, startVolume, stopVolume]);

    // ── FEATURE 2: Volume → Shake + Stroke Boost ──
    useEffect(() => {
        if (isShouting) {
            setShakeIntensity(Math.min(volume * 20, 12));
            // Temporarily boost stroke thickness when yelling
            setStrokeWidth(prev => ({
                min: Math.min(prev.min + volume * 3, 10),
                max: Math.min(prev.max + volume * 4, 18),
            }));
        } else {
            setShakeIntensity(0);
        }
    }, [volume, isShouting]);

    // ── FEATURE 1: Particle system loop ──
    useEffect(() => {
        const particleCanvas = particleCanvasRef.current;
        if (!particleCanvas) return;
        const ctx = particleCanvas.getContext('2d');

        const resizeCanvas = () => {
            const container = canvasContainerRef.current;
            if (container) {
                particleCanvas.width = container.offsetWidth;
                particleCanvas.height = container.offsetHeight;
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const loop = () => {
            ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);

            // Spawn new particles if effect is active and pointer is down
            if (activeEffect && pointerRef.current.active && PARTICLE_PRESETS[activeEffect]) {
                const preset = PARTICLE_PRESETS[activeEffect];
                const count = 3 + Math.floor(volume * 8); // More particles when louder
                for (let i = 0; i < count; i++) {
                    particlesRef.current.push({
                        x: pointerRef.current.x + (Math.random() - 0.5) * preset.spread,
                        y: pointerRef.current.y + (Math.random() - 0.5) * preset.spread,
                        vx: (Math.random() - 0.5) * 3,
                        vy: (Math.random() - 0.5) * 3 + preset.gravity,
                        size: preset.sizeRange[0] + Math.random() * (preset.sizeRange[1] - preset.sizeRange[0]),
                        color: preset.colors[Math.floor(Math.random() * preset.colors.length)],
                        alpha: 1,
                        decay: 1 / (preset.lifetime / 16),
                        glow: preset.glow,
                        emoji: preset.emoji,
                    });
                }
            }

            // Update & draw particles
            particlesRef.current = particlesRef.current.filter(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;
                if (p.alpha <= 0) return false;

                ctx.save();
                ctx.globalAlpha = p.alpha;

                if (p.emoji) {
                    ctx.font = `${p.size * 2}px serif`;
                    ctx.fillText(p.emoji, p.x, p.y);
                } else {
                    if (p.glow) {
                        ctx.shadowColor = p.color;
                        ctx.shadowBlur = p.size * 3;
                    }
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
                return true;
            });

            particleRafRef.current = requestAnimationFrame(loop);
        };
        loop();

        return () => {
            cancelAnimationFrame(particleRafRef.current);
            window.removeEventListener('resize', resizeCanvas);
        };
    }, [activeEffect, volume]);

    // Track pointer position for particle spawning
    const handlePointerMove = (e) => {
        const container = canvasContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        pointerRef.current.x = e.clientX - rect.left;
        pointerRef.current.y = e.clientY - rect.top;
    };
    const handlePointerDown = (e) => {
        pointerRef.current.active = true;
        handlePointerMove(e);

        // FEATURE 4: Record stroke timestamp
        strokeTimelineRef.current.push({
            type: 'down',
            time: Date.now() - sessionStartRef.current,
            x: pointerRef.current.x,
            y: pointerRef.current.y,
        });
    };
    const handlePointerUp = () => {
        pointerRef.current.active = false;
        strokeTimelineRef.current.push({
            type: 'up',
            time: Date.now() - sessionStartRef.current,
        });
    };

    // ── Timer tick ──
    useEffect(() => {
        if (timeLeft > 0 && !isTimeUp) {
            const id = setTimeout(() => setTimeLeft(t => t - 1), 1000);
            return () => clearTimeout(id);
        } else if (timeLeft === 0 && !isTimeUp) {
            setIsTimeUp(true);
            if (sigCanvas.current) sigCanvas.current.off();
            setTimeout(() => handleComplete(), 2000);
        }
    }, [timeLeft, isTimeUp]);

    const handleComplete = () => {
        if (sigCanvas.current) {
            const base64Data = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
            // Also capture the particle canvas for composite
            let particleData = null;
            if (particleCanvasRef.current) {
                particleData = particleCanvasRef.current.toDataURL('image/png');
            }
            onComplete({
                drawing: base64Data,
                particleOverlay: particleData,
                voiceDescription: transcript.trim() || playerData.battleCry,
                strokeTimeline: strokeTimelineRef.current,
                drawingData: sigCanvas.current.toData(),
            });
        }
    };

    const handleClear = () => { if (!isTimeUp && sigCanvas.current) sigCanvas.current.clear(); };
    const handleUndo = () => {
        if (!isTimeUp && sigCanvas.current) {
            const data = sigCanvas.current.toData();
            if (data && data.length > 0) { data.pop(); sigCanvas.current.fromData(data); }
        }
    };
    const toggleEraserFn = () => {
        if (isErasing) { setPenColor(activeColor); setIsErasing(false); }
        else { setPenColor('#ffffff'); setIsErasing(true); }
    };
    const fmt = (s) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // ── Render ──
    return (
        <div className="relative w-full h-full overflow-hidden">

            {/* ── Background ── */}
            <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/80" />

            {/* ── Wobbly hand-drawn border ── */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 18,97 C 14,97.5 8,97.8 5.5,95 C 3,92 2.8,88 3,82 C 3.2,65 2.6,48 3,30 C 3.2,20 2.8,10 5,4.5
                    C 7,2 13,2.5 22,3 C 38,3.4 60,2.8 78,3.2 C 88,3.4 95,2.8 97.5,5.5 C 99,8 97.8,16 97,28 C 96.5,40 97.2,55 97,68"
                    fill="none" stroke={activeColor + 'aa'} strokeWidth="3" vectorEffect="non-scaling-stroke"
                    strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 19,96 C 15,96.8 9,97.2 6,94.5 C 4,92 4,87 4.2,78 C 4.5,60 3.8,44 4.2,28 C 4.4,18 4,9 6.5,5
                    C 8.5,2.5 15,3 24,3.5 C 40,4 62,3.2 80,3.6 C 90,3.8 96.5,3.2 98,6 C 99.2,9 98,18 97.5,30 C 97,44 97.8,58 97.5,70"
                    fill="none" stroke={activeColor + '30'} strokeWidth="2" vectorEffect="non-scaling-stroke"
                    strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
            </svg>

            {/* ── Floating icons ── */}
            {BG_ICONS.map(({ Icon, rotate, top, left, delay }, i) => (
                <div key={i} className="absolute z-10 select-none pointer-events-none"
                    style={{
                        top, left, opacity: 0.6, color: activeColor,
                        animation: `icon-float 3s ease-in-out ${delay} infinite`,
                        transform: `rotate(${rotate})`,
                    }}>
                    <Icon size={28} />
                </div>
            ))}

            {/* ── Content ── */}
            <div className="relative z-20 flex flex-col items-center justify-center w-full h-full gap-3 px-6 py-6">

                {/* ── Header row ── */}
                <div className="w-full max-w-4xl flex justify-between items-center">
                    <div>
                        <p style={{
                            fontFamily: "'Comic Relief', serif", fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase',
                        }}>
                            vs {bossData?.name || 'Boss'}
                        </p>
                        <h2 style={{
                            fontFamily: "'Mansalva', cursive", fontSize: '1.6rem',
                            color: activeColor, textTransform: 'uppercase', lineHeight: 1,
                            textShadow: `0 0 30px ${activeColor}60`,
                        }}>
                            {playerData.name}
                        </h2>
                    </div>

                    {/* Active effect badge */}
                    {activeEffect && (
                        <div style={{
                            padding: '4px 14px', borderRadius: '12px',
                            background: 'rgba(255,255,255,0.08)',
                            border: `1px solid ${PARTICLE_PRESETS[activeEffect]?.colors[0]}80`,
                            fontFamily: "'Comic Relief', serif", fontSize: '0.65rem',
                            color: PARTICLE_PRESETS[activeEffect]?.colors[0],
                            letterSpacing: '0.12em', textTransform: 'uppercase',
                            animation: 'pulse-glow 1.5s infinite',
                        }}>
                            {activeEffect.toUpperCase()} MODE
                        </div>
                    )}

                    {/* Volume meter */}
                    <div className="flex items-center gap-2">
                        <div style={{
                            width: '60px', height: '8px', borderRadius: '4px',
                            background: 'rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                width: `${Math.min(volume * 200, 100)}%`, height: '100%',
                                background: isShouting
                                    ? 'linear-gradient(90deg, #ef4444, #ff6b35)'
                                    : `linear-gradient(90deg, ${activeColor}80, ${activeColor})`,
                                borderRadius: '4px',
                                transition: 'width 0.1s, background 0.15s',
                            }} />
                        </div>

                        {/* Timer pill */}
                        <div style={{
                            padding: '8px 24px', borderRadius: '16px',
                            background: timeLeft <= 30 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
                            border: `2px solid ${timeLeft <= 30 ? '#ef4444' : activeColor + '80'}`,
                            boxShadow: `0 0 20px ${timeLeft <= 30 ? 'rgba(239,68,68,0.3)' : activeColor + '30'}`,
                            transform: timeLeft <= 10 ? (timeLeft % 2 === 0 ? 'scale(1.05) rotate(2deg)' : 'scale(1.05) rotate(-2deg)') : 'none',
                            transition: 'transform 0.2s',
                        }}>
                            <span style={{
                                fontFamily: "'Mansalva', cursive", fontSize: '2.2rem',
                                color: timeLeft <= 30 ? '#ef4444' : '#fff', lineHeight: 1,
                            }}>
                                {fmt(timeLeft)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Main row: Tools + Canvas ── */}
                <div className="w-full max-w-4xl flex gap-4" style={{ height: '52vh' }}>

                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 shrink-0">
                        {/* Pen */}
                        <button onClick={() => { setPenColor(activeColor); setIsErasing(false); }}
                            className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                            style={{
                                background: !isErasing ? activeColor + '25' : 'rgba(255,255,255,0.06)',
                                border: `2px solid ${!isErasing ? activeColor : 'rgba(255,255,255,0.15)'}`,
                            }}>
                            <LuPenLine size={20} color={!isErasing ? activeColor : '#aaa'} />
                        </button>

                        {/* Eraser */}
                        <button onClick={toggleEraserFn}
                            className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                            style={{
                                background: isErasing ? activeColor + '25' : 'rgba(255,255,255,0.06)',
                                border: `2px solid ${isErasing ? activeColor : 'rgba(255,255,255,0.15)'}`,
                            }}>
                            <LuEraser size={20} color={isErasing ? activeColor : '#aaa'} />
                        </button>

                        {/* Undo */}
                        <button onClick={handleUndo}
                            className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-110 transition-transform mt-auto"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.15)' }}>
                            <LuUndo2 size={20} color="#aaa" />
                        </button>

                        {/* Clear */}
                        <button onClick={handleClear}
                            className="w-12 h-12 rounded-xl flex items-center justify-center hover:scale-110 transition-transform"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '2px solid rgba(255,255,255,0.15)' }}>
                            <span style={{ fontFamily: "'Mansalva', cursive", fontSize: '0.9rem', color: '#aaa' }}>X</span>
                        </button>
                    </div>

                    {/* Drawing Surface with Particle Overlay */}
                    <div
                        ref={canvasContainerRef}
                        className="flex-1 rounded-2xl overflow-hidden relative"
                        style={{
                            background: '#fff',
                            border: `3px solid ${activeColor}60`,
                            boxShadow: `0 0 40px ${activeColor}20, 0 8px 32px rgba(0,0,0,0.4)`,
                            // FEATURE 2: Volume shake
                            transform: shakeIntensity > 0
                                ? `translate(${(Math.random() - 0.5) * shakeIntensity}px, ${(Math.random() - 0.5) * shakeIntensity}px)`
                                : 'none',
                            transition: shakeIntensity > 0 ? 'none' : 'transform 0.2s',
                        }}
                        onDoubleClick={toggleEraserFn}
                        onPointerMove={handlePointerMove}
                        onPointerDown={handlePointerDown}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerUp}
                    >
                        {/* FEATURE 3: Backdrop image behind drawing */}
                        {backdropUrl && (
                            <img
                                src={backdropUrl}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                style={{
                                    opacity: backdropOpacity,
                                    transition: 'opacity 0.8s ease-in-out',
                                    zIndex: 0,
                                }}
                            />
                        )}

                        {/* FEATURE 3: Weather overlay */}
                        {weatherEffect && (
                            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
                                {weatherEffect === 'rain' && (
                                    <div style={{
                                        position: 'absolute', inset: 0, overflow: 'hidden',
                                        background: 'linear-gradient(transparent 0%, rgba(100,150,200,0.03) 100%)',
                                    }}>
                                        {Array.from({ length: 60 }).map((_, i) => (
                                            <div key={i} style={{
                                                position: 'absolute',
                                                left: `${Math.random() * 100}%`,
                                                top: `-${Math.random() * 20}%`,
                                                width: '1px', height: `${12 + Math.random() * 18}px`,
                                                background: 'rgba(100,150,220,0.4)',
                                                animation: `rain-fall ${0.5 + Math.random() * 0.5}s linear ${Math.random() * 1}s infinite`,
                                            }} />
                                        ))}
                                    </div>
                                )}
                                {weatherEffect === 'snow' && (
                                    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                                        {Array.from({ length: 40 }).map((_, i) => (
                                            <div key={i} style={{
                                                position: 'absolute',
                                                left: `${Math.random() * 100}%`,
                                                top: `-5%`,
                                                width: `${3 + Math.random() * 5}px`,
                                                height: `${3 + Math.random() * 5}px`,
                                                borderRadius: '50%',
                                                background: 'rgba(255,255,255,0.6)',
                                                animation: `snow-fall ${2 + Math.random() * 3}s linear ${Math.random() * 2}s infinite`,
                                            }} />
                                        ))}
                                    </div>
                                )}
                                {weatherEffect === 'fog' && (
                                    <div style={{
                                        position: 'absolute', inset: 0,
                                        background: 'rgba(200,200,220,0.08)',
                                        backdropFilter: 'blur(0.5px)',
                                    }} />
                                )}
                            </div>
                        )}

                        {/* Time's up overlay */}
                        {isTimeUp && (
                            <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                                <h2 style={{
                                    fontFamily: "'Mansalva', cursive", fontSize: '5rem', color: '#fff',
                                    textShadow: `0 0 40px ${activeColor}80`, transform: 'rotate(-5deg)',
                                }}>
                                    TIME'S UP!
                                </h2>
                            </div>
                        )}

                        {/* The actual drawing canvas */}
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor={penColor}
                            canvasProps={{ className: 'w-full h-full cursor-crosshair', style: { position: 'relative', zIndex: 2 } }}
                            velocityFilterWeight={0.7}
                            minWidth={strokeWidth.min}
                            maxWidth={strokeWidth.max}
                            backgroundColor="rgba(0,0,0,0)"
                        />

                        {/* FEATURE 1: Particle overlay canvas */}
                        <canvas
                            ref={particleCanvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 3 }}
                        />

                        {/* Voice-shouting border glow */}
                        {isShouting && (
                            <div className="absolute inset-0 pointer-events-none" style={{
                                zIndex: 4,
                                boxShadow: `inset 0 0 ${30 + volume * 60}px ${activeColor}60`,
                                transition: 'box-shadow 0.1s',
                            }} />
                        )}
                    </div>
                </div>

                {/* ── Bottom bar: Voice + Submit ── */}
                <div className="w-full max-w-4xl flex items-stretch gap-4" style={{ height: '68px' }}>

                    {/* Voice Box */}
                    <div className="flex-1 rounded-xl flex items-center gap-3 px-4"
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '2px solid rgba(255,255,255,0.15)',
                            backdropFilter: 'blur(8px)',
                        }}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                            ${isListening ? 'text-red-400' : 'text-white/40'}`}
                            style={{ animation: isListening ? 'pulse-glow 1.5s infinite' : 'none' }}>
                            <LuMic size={20} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p style={{
                                fontFamily: "'Comic Relief', serif", fontSize: '0.6rem',
                                color: 'rgba(255,255,255,0.4)', marginBottom: '2px',
                            }}>
                                {isListening
                                    ? activeEffect
                                        ? `🎨 ${activeEffect.toUpperCase()} mode active — say "normal" to clear`
                                        : 'Say "fire", "ice", "lightning", "magic", "city", "forest"...'
                                    : 'Voice paused'}
                            </p>
                            <p className="truncate" style={{
                                fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
                                color: '#fff', fontStyle: transcript ? 'normal' : 'italic', opacity: transcript ? 1 : 0.4,
                            }}>
                                {transcript || '"Give me fire and put me in a ruined city..."'}
                            </p>
                        </div>
                        <button onClick={toggleListening}
                            className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10 shrink-0"
                            style={{
                                background: 'rgba(255,255,255,0.08)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                color: '#fff',
                            }}>
                            {isListening ? 'Pause' : 'Resume'}
                        </button>
                    </div>

                    {/* Forge Legend */}
                    <button onClick={handleComplete} disabled={isTimeUp}
                        className="px-8 rounded-xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-transform shrink-0"
                        style={{
                            background: `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)`,
                            border: `2px solid ${activeColor}`,
                            boxShadow: `0 0 25px ${activeColor}50`,
                            opacity: isTimeUp ? 0.5 : 1,
                            cursor: isTimeUp ? 'not-allowed' : 'pointer',
                        }}>
                        <LuCheck size={24} color="white" />
                        <span style={{
                            fontFamily: "'Mansalva', cursive", fontSize: '1.2rem',
                            color: 'white', letterSpacing: '0.05em',
                        }}>
                            FORGE<br />LEGEND
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
