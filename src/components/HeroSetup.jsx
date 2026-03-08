import { useState } from 'react';
import heroBg from '../assets/hero_bg.avif';
import { LuPencil, LuZap, LuCrown, LuFlame } from 'react-icons/lu';
import { GiCrossedSwords } from 'react-icons/gi';

// ── Colour palette ───────────────────────────────────────────────────────────
const COLORS = [
    { hex: '#DC2626', label: 'Crimson Fire' },
    { hex: '#2563EB', label: 'Royal Indigo' },
    { hex: '#16A34A', label: 'Venom Green' },
    { hex: '#7C3AED', label: 'Arcane Violet' },
    { hex: '#EA580C', label: 'Solar Amber' },
    { hex: '#0D9488', label: 'Frost Teal' },
    { hex: '#B45309', label: 'Ancient Bronze' },
    { hex: '#DB2777', label: 'Chaos Rose' },
];

// Floating icons
const BG_ICONS = [
    { Icon: LuPencil, rotate: '-14deg', top: '6%', left: '6%', delay: '0s' },
    { Icon: GiCrossedSwords, rotate: '8deg', top: '8%', left: '48%', delay: '0.4s' },
    { Icon: LuZap, rotate: '-6deg', top: '5%', left: '92%', delay: '0.8s' },
    { Icon: LuCrown, rotate: '12deg', top: '90%', left: '10%', delay: '0.6s' },
    { Icon: LuFlame, rotate: '-10deg', top: '88%', left: '50%', delay: '0.3s' },
    { Icon: LuZap, rotate: '5deg', top: '92%', left: '88%', delay: '0.7s' },
];

// ── Wobbly underline ─────────────────────────────────────────────────────────
function WobblyUnderline({ color }) {
    return (
        <svg viewBox="0 0 120 8" style={{ width: '100%', height: '7px', marginTop: '-3px' }}>
            <path d="M2,5 C15,1 30,7 50,4 C70,1 85,7 118,4" fill="none"
                stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}

export default function HeroSetup({ onComplete }) {
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0].hex);
    const [battleCry, setBattleCry] = useState('');

    const activeColor = color;
    const canContinue = name.trim() && battleCry.trim();

    const handleSubmit = () => {
        if (canContinue) {
            onComplete({ name: name.trim(), color, battleCry: battleCry.trim() });
        }
    };

    return (
        <div className="relative w-full h-full overflow-hidden">

            {/* Background */}
            <img src={heroBg} alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-0 bg-black/80" />

            {/* Wobbly border */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10"
                viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M 18,97 C 14,97.5 8,97.8 5.5,95 C 3,92 2.8,88 3,82 C 3.2,65 2.6,48 3,30 C 3.2,20 2.8,10 5,4.5
                    C 7,2 13,2.5 22,3 C 38,3.4 60,2.8 78,3.2 C 88,3.4 95,2.8 97.5,5.5 C 99,8 97.8,16 97,28 C 96.5,40 97.2,55 97,68"
                    fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" vectorEffect="non-scaling-stroke"
                    strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 19,96 C 15,96.8 9,97.2 6,94.5 C 4,92 4,87 4.2,78 C 4.5,60 3.8,44 4.2,28 C 4.4,18 4,9 6.5,5
                    C 8.5,2.5 15,3 24,3.5 C 40,4 62,3.2 80,3.6 C 90,3.8 96.5,3.2 98,6 C 99.2,9 98,18 97.5,30 C 97,44 97.8,58 97.5,70"
                    fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" vectorEffect="non-scaling-stroke"
                    strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
            </svg>

            {/* Floating icons */}
            {BG_ICONS.map(({ Icon, rotate, top, left, delay }, i) => (
                <div key={i} className="absolute z-10 text-white select-none pointer-events-none"
                    style={{
                        top, left, opacity: 0.6,
                        animation: `icon-float 3s ease-in-out ${delay} infinite`,
                        transform: `rotate(${rotate})`,
                    }}>
                    <Icon size={28} />
                </div>
            ))}

            {/* Content */}
            <div className="relative z-20 flex flex-col items-center justify-center w-full h-full px-6 gap-6">

                {/* Title */}
                <div className="text-center">
                    <h1 style={{
                        fontFamily: "'Mansalva', cursive",
                        fontSize: 'clamp(2rem, 5vw, 3.2rem)',
                        color: '#fff', letterSpacing: '0.08em',
                        textShadow: '0 0 40px rgba(255,180,80,0.3), 0 0 80px rgba(180,100,255,0.2)',
                        transform: 'rotate(-1deg)',
                    }}>
                        CREATE YOUR CHAMPION
                    </h1>
                    <p style={{
                        fontFamily: "'Mansalva', cursive",
                        fontSize: 'clamp(0.9rem, 2vw, 1.1rem)',
                        color: 'rgba(255,255,255,0.5)', marginTop: '4px',
                    }}>
                        Every legend starts with a name...
                    </p>
                </div>

                {/* The "paper" card */}
                <div className="w-full rounded-3xl p-8 flex flex-col gap-5"
                    style={{
                        maxWidth: '440px',
                        background: 'rgba(255,255,255,0.06)',
                        border: `2px solid ${activeColor}40`,
                        backdropFilter: 'blur(16px)',
                        boxShadow: `0 0 50px ${activeColor}15, 0 8px 32px rgba(0,0,0,0.4)`,
                        transition: 'border-color 0.3s, box-shadow 0.3s',
                    }}>

                    {/* Name */}
                    <div className="flex flex-col gap-1">
                        <label style={{
                            fontFamily: "'Mansalva', cursive", fontSize: '0.95rem',
                            color: 'rgba(255,255,255,0.5)',
                            transform: 'rotate(-0.8deg)',
                        }}>Champion Name</label>
                        <input type="text" maxLength={24}
                            placeholder="The Destroyer"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                fontFamily: "'Mansalva', cursive", fontSize: '1.15rem',
                                padding: '10px 16px', borderRadius: '14px',
                                border: `2px solid ${name ? activeColor + '80' : 'rgba(255,255,255,0.15)'}`,
                                background: 'rgba(255,255,255,0.08)', color: '#fff',
                                outline: 'none', caretColor: activeColor, width: '100%',
                                boxShadow: name ? `0 0 14px ${activeColor}30` : 'none',
                                transition: 'border 0.2s, box-shadow 0.2s',
                            }} />
                    </div>

                    {/* Colour */}
                    <div className="flex flex-col gap-2">
                        <label style={{
                            fontFamily: "'Mansalva', cursive", fontSize: '0.95rem',
                            color: 'rgba(255,255,255,0.5)',
                        }}>Your Colour</label>
                        <div className="flex flex-wrap gap-3">
                            {COLORS.map(({ hex, label }) => {
                                const isMine = color === hex;
                                return (
                                    <button key={hex} title={label}
                                        onClick={() => setColor(hex)}
                                        className="hover:scale-110 active:scale-95 transition-transform"
                                        style={{
                                            width: '32px', height: '32px', borderRadius: '50%', background: hex,
                                            border: isMine ? '3px solid #fff' : '2.5px solid rgba(255,255,255,0.15)',
                                            transform: isMine ? 'scale(1.25)' : 'scale(1)',
                                            boxShadow: isMine ? `0 0 16px ${hex}99` : 'none',
                                            cursor: 'pointer', flexShrink: 0,
                                            transition: 'transform 0.15s, box-shadow 0.15s',
                                        }} />
                                );
                            })}
                        </div>
                        <p style={{
                            fontFamily: "'Comic Relief', serif", fontSize: '0.7rem',
                            color: activeColor, transition: 'color 0.35s',
                        }}>{COLORS.find(c => c.hex === color)?.label}</p>
                    </div>

                    {/* Battle cry */}
                    <div className="flex flex-col gap-1">
                        <label style={{
                            fontFamily: "'Mansalva', cursive", fontSize: '0.95rem',
                            color: 'rgba(255,255,255,0.5)',
                        }}>Battle Cry</label>
                        <textarea rows={2} maxLength={80}
                            placeholder='"Fear me, for I am inevitable!"'
                            value={battleCry}
                            onChange={(e) => setBattleCry(e.target.value)}
                            style={{
                                fontFamily: "'Mansalva', cursive", fontSize: '1rem',
                                padding: '10px 16px', borderRadius: '14px',
                                border: `2px solid ${battleCry ? activeColor + '80' : 'rgba(255,255,255,0.15)'}`,
                                background: 'rgba(255,255,255,0.08)', color: '#fff',
                                outline: 'none', resize: 'none', caretColor: activeColor,
                                lineHeight: 1.4, width: '100%',
                                boxShadow: battleCry ? `0 0 14px ${activeColor}30` : 'none',
                                transition: 'border 0.2s, box-shadow 0.2s',
                            }} />
                        <p style={{
                            fontFamily: "'Comic Relief', serif", fontSize: '0.6rem',
                            color: 'rgba(255,255,255,0.25)', textAlign: 'right',
                        }}>{battleCry.length}/80</p>
                    </div>

                    {/* Submit */}
                    <button onClick={handleSubmit} disabled={!canContinue}
                        className="hover:scale-105 active:scale-95 transition-transform"
                        style={{
                            fontFamily: "'Mansalva', cursive", fontSize: '1.2rem',
                            letterSpacing: '0.06em', padding: '12px 0', width: '100%',
                            borderRadius: '16px',
                            background: canContinue ? `linear-gradient(135deg, ${activeColor}, ${activeColor}cc)` : 'rgba(255,255,255,0.06)',
                            border: `2px solid ${canContinue ? activeColor : 'rgba(255,255,255,0.1)'}`,
                            color: canContinue ? '#fff' : 'rgba(255,255,255,0.2)',
                            boxShadow: canContinue ? `0 4px 30px ${activeColor}55` : 'none',
                            cursor: canContinue ? 'pointer' : 'not-allowed',
                            transition: 'all 0.25s',
                        }}>
                        ENTER THE ARENA →
                    </button>
                </div>
            </div>
        </div>
    );
}
