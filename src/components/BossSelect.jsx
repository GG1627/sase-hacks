import React, { useState, useEffect } from 'react';
import heroBg from '../assets/hero_bg.avif';
import gokuImg from '../assets/goku.avif';
import zoroImg from '../assets/zoro.avif';
import powerImg from '../assets/power.avif';
import { LuArrowLeft, LuSwords, LuZap, LuCrown, LuFlame } from 'react-icons/lu'; // Kept existing icons, added LuArrowLeft, LuSwords
import { GiCrossedSwords } from 'react-icons/gi'; // Kept existing icon
import { audioSystem } from '../utils/audio'; // Import the synthesizer

const BOSSES = [
    {
        id: 'power',
        name: 'Power',
        subtitle: 'Blood Fiend',
        difficulty: 'HARD',
        diffColor: '#DC2626',
        image: powerImg,
        description: 'The Blood Devil in human form. Chaotic, unpredictable, and terrifyingly strong.',
        accent: '#DC2626',
    },
    {
        id: 'zoro',
        name: 'Roronoa Zoro',
        subtitle: 'Pirate Hunter',
        difficulty: 'EXTREME',
        diffColor: '#16A34A',
        image: zoroImg,
        description: 'Three-sword style master. His blades have cut through dimensions.',
        accent: '#16A34A',
    },
    {
        id: 'goku',
        name: 'Goku',
        subtitle: 'Saiyan God',
        difficulty: 'LEGENDARY',
        diffColor: '#EA580C',
        image: gokuImg,
        description: 'The strongest warrior in the universe. Has surpassed the gods themselves.',
        accent: '#EA580C',
    },
];

// Floating icons
const BG_ICONS = [
    { Icon: LuArrowLeft, rotate: '-14deg', top: '6%', left: '6%', delay: '0s' }, // Changed LuPencil to LuArrowLeft
    // { Icon: GiCrossedSwords, rotate: '8deg', top: '8%', left: '48%', delay: '0.4s' },
    { Icon: LuZap, rotate: '-6deg', top: '5%', left: '92%', delay: '0.8s' },
    { Icon: LuCrown, rotate: '12deg', top: '90%', left: '10%', delay: '0.6s' },
    { Icon: LuFlame, rotate: '-10deg', top: '88%', left: '50%', delay: '0.3s' },
    { Icon: LuSwords, rotate: '5deg', top: '92%', left: '88%', delay: '0.7s' }, // Changed LuZap to LuSwords
];

export default function BossSelect({ heroData, onSelect }) {
    const [selected, setSelected] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [launching, setLaunching] = useState(false);

    const activeColor = heroData?.color || '#fff';

    const handleConfirm = () => {
        if (!selected) return;
        setLaunching(true);

        // Resume audio context purely on user interaction
        audioSystem.resume();
        // Duck background music so countdown beeps are audible
        audioSystem.setMusicVolume(0.1);

        const sequence = ['3', '2', '1', 'DRAW!'];
        let step = 0;

        const interval = setInterval(() => {
            if (step < sequence.length) {
                const text = sequence[step];
                setCountdown(text);

                // Play audio cues
                if (text === 'DRAW!') {
                    audioSystem.playGoBeep();
                } else {
                    audioSystem.playCountdownBeep();
                }

                step++;
            } else {
                clearInterval(interval);
                onSelect(selected); // Kept onSelect as it was in the original code
            }
        }, 800);
    };

    return (
        <div className="relative w-full h-full overflow-hidden">

            {/* Background */}
            <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/85" />

            {/* Wobbly border */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 18,97 C 14,97.5 8,97.8 5.5,95 C 3,92 2.8,88 3,82 C 3.2,65 2.6,48 3,30 C 3.2,20 2.8,10 5,4.5
                    C 7,2 13,2.5 22,3 C 38,3.4 60,2.8 78,3.2 C 88,3.4 95,2.8 97.5,5.5 C 99,8 97.8,16 97,28 C 96.5,40 97.2,55 97,68"
                    fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" vectorEffect="non-scaling-stroke"
                    strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 19,96 C 15,96.8 9,97.2 6,94.5 C 4,92 4,87 4.2,78 C 4.5,60 3.8,44 4.2,28 C 4.4,18 4,9 6.5,5
                    C 8.5,2.5 15,3 24,3.5 C 40,4 62,3.2 80,3.6 C 90,3.8 96.5,3.2 98,6 C 99.2,9 98,18 97.5,30 C 97,44 97.8,58 97.5,70"
                    fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" vectorEffect="non-scaling-stroke"
                    strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
            </svg>

            {/* Floating icons */}
            {BG_ICONS.map(({ Icon, rotate, top, left, delay }, i) => (
                <div key={i} className="absolute z-10 text-white select-none pointer-events-none"
                    style={{
                        top, left, opacity: 0.5,
                        animation: `icon-float 3s ease-in-out ${delay} infinite`,
                        transform: `rotate(${rotate})`,
                    }}>
                    <Icon size={28} />
                </div>
            ))}

            {/* Countdown overlay */}
            {launching && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md">
                    <h1 key={countdown} style={{
                        fontFamily: "'Mansalva', cursive",
                        fontSize: 'clamp(4rem, 15vw, 10rem)',
                        color: 'white', letterSpacing: '0.1em',
                        animation: countdown === 'DRAW!' ? 'pulse-glow 0.8s infinite' : 'countdown-pop 1s ease-out forwards',
                    }}>{countdown}</h1>
                </div>
            )}

            {/* Content */}
            <div className="relative z-20 flex flex-col items-center justify-center w-full h-full px-6 gap-6">

                {/* Title */}
                <div className="text-center">
                    <p style={{
                        fontFamily: "'Comic Relief', serif", fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.4)', letterSpacing: '0.2em',
                        textTransform: 'uppercase', marginBottom: '4px',
                    }}>
                        {heroData?.name || 'Champion'}, choose your opponent
                    </p>
                    <h1 style={{
                        fontFamily: "'Mansalva', cursive",
                        fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
                        color: '#fff', letterSpacing: '0.08em',
                        textShadow: '0 0 40px rgba(255,60,60,0.3), 0 0 80px rgba(180,100,255,0.2)',
                        transform: 'rotate(-0.5deg)',
                    }}>
                        SELECT YOUR BOSS
                    </h1>
                </div>

                {/* Boss Cards */}
                <div className="flex gap-6 items-stretch" style={{ maxWidth: '1000px' }}>
                    {BOSSES.map((boss) => {
                        const isSelected = selected?.id === boss.id;
                        return (
                            <button key={boss.id}
                                onClick={() => setSelected(boss)}
                                className="flex-1 flex flex-col rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 active:scale-95"
                                style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `2px solid ${isSelected ? boss.accent : 'rgba(255,255,255,0.1)'}`,
                                    boxShadow: isSelected
                                        ? `0 0 40px ${boss.accent}40, 0 0 80px ${boss.accent}20`
                                        : '0 4px 20px rgba(0,0,0,0.3)',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    textAlign: 'left',
                                }}>

                                {/* Boss Image — 1:1 aspect ratio, eager load */}
                                <div className="relative w-full overflow-hidden" style={{ aspectRatio: '1 / 1' }}>
                                    <img src={boss.image} alt={boss.name}
                                        loading="eager" decoding="async" fetchPriority="high"
                                        className="w-full h-full object-cover object-center"
                                        style={{
                                            filter: isSelected ? 'brightness(1.1) saturate(1.2)' : 'brightness(0.7) saturate(0.8)',
                                            transition: 'filter 0.3s',
                                        }} />
                                    {/* Difficulty badge */}
                                    <span style={{
                                        position: 'absolute', top: '10px', right: '10px',
                                        fontFamily: "'Comic Relief', serif", fontSize: '0.6rem',
                                        color: boss.diffColor, letterSpacing: '0.15em',
                                        background: 'rgba(0,0,0,0.7)', padding: '3px 10px',
                                        borderRadius: '8px', border: `1px solid ${boss.diffColor}50`,
                                    }}>{boss.difficulty}</span>
                                </div>

                                {/* Info */}
                                <div className="flex flex-col gap-1 p-4">
                                    <p style={{
                                        fontFamily: "'Comic Relief', serif", fontSize: '0.6rem',
                                        color: boss.accent, letterSpacing: '0.15em', textTransform: 'uppercase',
                                    }}>{boss.subtitle}</p>
                                    <h3 style={{
                                        fontFamily: "'Mansalva', cursive", fontSize: '1.3rem',
                                        color: '#fff', lineHeight: 1.1,
                                    }}>{boss.name}</h3>
                                    <p style={{
                                        fontFamily: "'Comic Relief', serif", fontSize: '0.7rem',
                                        color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, marginTop: '4px',
                                    }}>{boss.description}</p>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Challenge button */}
                <button onClick={handleConfirm} disabled={!selected}
                    className="hover:scale-105 active:scale-95 transition-transform"
                    style={{
                        fontFamily: "'Mansalva', cursive", fontSize: '1.4rem',
                        letterSpacing: '0.06em', padding: '14px 50px', borderRadius: '18px',
                        background: selected
                            ? `linear-gradient(135deg, ${activeColor}, ${selected.accent})`
                            : 'rgba(255,255,255,0.06)',
                        border: `2px solid ${selected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)'}`,
                        color: selected ? '#fff' : 'rgba(255,255,255,0.2)',
                        boxShadow: selected ? `0 0 40px ${selected.accent}40` : 'none',
                        cursor: selected ? 'pointer' : 'not-allowed',
                        animation: selected ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                        transition: 'all 0.3s',
                    }}>
                    {selected ? `CHALLENGE ${selected.name.toUpperCase()}` : 'SELECT A BOSS'}
                </button>
            </div>
        </div>
    );
}
