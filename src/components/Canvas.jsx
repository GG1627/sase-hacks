import React, { useRef, useState, useEffect, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import heroBg from '../assets/hero_bg.png';
import {
    LuMic, LuPenLine, LuEraser, LuUndo2, LuCheck,
    LuPencil, LuZap, LuEye, LuCrown, LuFlame
} from 'react-icons/lu';
import { GiCrossedSwords } from 'react-icons/gi';
import { useVoice } from '../hooks/useVoice';

// Floating background icons — same vibe as HomeScreen
const BG_ICONS = [
    { Icon: LuPencil, rotate: '-12deg', top: '6%', left: '6%', delay: '0s' },
    { Icon: GiCrossedSwords, rotate: '18deg', top: '8%', left: '50%', delay: '0.4s' },
    { Icon: LuZap, rotate: '-8deg', top: '5%', left: '90%', delay: '0.8s' },
    { Icon: LuCrown, rotate: '10deg', top: '88%', left: '8%', delay: '0.6s' },
    { Icon: LuFlame, rotate: '-6deg', top: '90%', left: '52%', delay: '0.3s' },
    { Icon: LuEye, rotate: '14deg', top: '86%', left: '88%', delay: '0.7s' },
];

export default function Canvas({ playerData, bossData, onComplete }) {
    const activeColor = playerData.color;

    // ── Canvas state ──
    const sigCanvas = useRef(null);
    const [penColor, setPenColor] = useState(activeColor);
    const [isErasing, setIsErasing] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState({ min: 1, max: 4 });

    // ── Timer ──
    const [timeLeft, setTimeLeft] = useState(300);
    const [isTimeUp, setIsTimeUp] = useState(false);

    // ── Voice ──
    const handleVoiceCommand = useCallback((text) => {
        // Tool switching
        if (text.includes('eraser') || text.includes('erase')) {
            setPenColor('#ffffff');
            setIsErasing(true);
        } else if (text.includes('pen') || text.includes('pencil') || text.includes('draw')) {
            setPenColor(activeColor);
            setIsErasing(false);
        }

        // Color changing
        const colorMap = {
            red: '#DC2626', blue: '#2563EB', green: '#16A34A', purple: '#7C3AED', violet: '#7C3AED',
            orange: '#EA580C', teal: '#0D9488', brown: '#B45309', bronze: '#B45309',
            pink: '#DB2777', rose: '#DB2777', black: '#111111', yellow: '#FACC15',
            white: '#ffffff', gray: '#6B7280', grey: '#6B7280', gold: '#CA8A04',
        };
        for (const [colorName, hex] of Object.entries(colorMap)) {
            if (text.includes(colorName)) {
                setPenColor(hex);
                setIsErasing(false);
            }
        }

        // Thickness
        if (text.includes('thicker') || text.includes('bigger') || text.includes('fat')) {
            setStrokeWidth(prev => ({ min: Math.min(prev.min + 1.5, 8), max: Math.min(prev.max + 2, 16) }));
        } else if (text.includes('thinner') || text.includes('smaller') || text.includes('thin') || text.includes('fine')) {
            setStrokeWidth(prev => ({ min: Math.max(prev.min - 1.5, 0.5), max: Math.max(prev.max - 2, 2) }));
        }

        // Actions
        if (text.includes('clear') || text.includes('start over') || text.includes('reset')) {
            if (!isTimeUp && sigCanvas.current) sigCanvas.current.clear();
        }
        if (text.includes('undo') || text.includes('go back') || text.includes('mistake') || text.includes('oops')) {
            if (!isTimeUp && sigCanvas.current) {
                const data = sigCanvas.current.toData();
                if (data && data.length > 0) { data.pop(); sigCanvas.current.fromData(data); }
            }
        }
        if (text.includes('finish') || text.includes("i'm done") || text.includes('im done') || text.includes('submit')) {
            if (!isTimeUp) setTimeLeft(0);
        }
    }, [activeColor, isTimeUp]);

    const { transcript, isListening, toggleListening, startListening, stopListening } = useVoice(handleVoiceCommand);

    useEffect(() => { startListening(); return () => stopListening(); }, [startListening, stopListening]);

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
            onComplete({
                drawing: base64Data,
                voiceDescription: transcript.trim() || playerData.battleCry,
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

            {/* ── Background: same dark look as HomeScreen ── */}
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

            {/* ── Content: flex column everything centered ── */}
            <div className="relative z-20 flex flex-col items-center justify-center w-full h-full gap-3 px-6 py-6">

                {/* ── Header row: Player name + Timer ── */}
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

                    {/* Drawing Surface */}
                    <div className="flex-1 rounded-2xl overflow-hidden relative"
                        style={{
                            background: '#fff',
                            border: `3px solid ${activeColor}60`,
                            boxShadow: `0 0 40px ${activeColor}20, 0 8px 32px rgba(0,0,0,0.4)`,
                        }}
                        onDoubleClick={toggleEraserFn}
                    >
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
                        <SignatureCanvas
                            ref={sigCanvas}
                            penColor={penColor}
                            canvasProps={{ className: 'w-full h-full cursor-crosshair' }}
                            velocityFilterWeight={0.7}
                            minWidth={strokeWidth.min}
                            maxWidth={strokeWidth.max}
                        />
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
                                fontFamily: "'Comic Relief', serif", fontSize: '0.65rem',
                                color: 'rgba(255,255,255,0.4)', marginBottom: '2px',
                            }}>
                                {isListening ? 'Listening for descriptions + commands...' : 'Voice paused'}
                            </p>
                            <p className="truncate" style={{
                                fontFamily: "'Inter', sans-serif", fontSize: '0.9rem',
                                color: '#fff', fontStyle: transcript ? 'normal' : 'italic', opacity: transcript ? 1 : 0.4,
                            }}>
                                {transcript || '"It has laser eyes and breathes fire..."'}
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
