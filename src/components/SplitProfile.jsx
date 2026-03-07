import { useState, useCallback } from 'react';
import profileBg from '../assets/profile_bg.png';

// ── Colour palette from README ──────────────────────────────────────────────
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

// ── Wobbly hand-drawn underline ─────────────────────────────────────────────
function WobblyUnderline({ color }) {
    return (
        <svg viewBox="0 0 120 8" style={{ width: '100%', height: '7px', marginTop: '-3px' }}>
            <path
                d="M2,5 C15,1 30,7 50,4 C70,1 85,7 118,4"
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
            />
        </svg>
    );
}

// ── Single player panel ─────────────────────────────────────────────────────
function PlayerPanel({ player, data, onChange, onReady, isReady, otherColor }) {
    const isP1 = player === 1;
    const defaultColor = isP1 ? COLORS[0] : COLORS[3];
    const activeColor = data.color || defaultColor.hex;

    const handleColorPick = (hex) => {
        if (hex === otherColor) return;
        onChange('color', hex);
    };

    const taglines = isP1
        ? ['Pick a fight.', 'Make it legendary.', 'Draw your doom.', 'Name your chaos.']
        : ['Bring the havoc.', 'Own the battlefield.', 'Seal your fate.', 'Rise or perish.'];
    const tagline = taglines[player % taglines.length];

    return (
        <div
            className="relative flex flex-col h-full"
            style={{
                width: '50%',
                alignItems: isP1 ? 'flex-end' : 'flex-start',
                justifyContent: 'center',
                paddingRight: isP1 ? '66px' : '0',
                paddingLeft: isP1 ? '0' : '80px',
            }}
        >
            {/* READY overlay */}
            {isReady && (
                <div
                    className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3"
                    style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.72)' }}
                >
                    <p
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '3rem',
                            color: `color-mix(in srgb, ${activeColor} 60%, white)`,
                            textShadow: `0 0 40px ${activeColor}cc`,
                            transform: 'rotate(-2deg)',
                        }}
                    >
                        LOCKED IN!
                    </p>
                    <button
                        onClick={() => onReady(false)}
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '0.95rem',
                            color: '#111',
                            background: 'rgba(255,255,255,0.7)',
                            border: '1.5px solid rgba(0,0,0,0.15)',
                            borderRadius: '10px',
                            padding: '6px 18px',
                            cursor: 'pointer',
                        }}
                    >
                        change mind
                    </button>
                </div>
            )}

            {/* Form card — no background, just the content */}
            <div
                className="relative z-10 flex flex-col gap-4 w-full"
                style={{ maxWidth: '320px', width: '100%', padding: '0' }}
            >
                {/* Player label + heading */}
                <div className="flex flex-col items-start">
                    <p
                        style={{
                            fontFamily: "'Comic Relief', serif",
                            fontSize: '0.7rem',
                            color: 'rgba(0,0,0,0.45)',
                            letterSpacing: '0.22em',
                            textTransform: 'uppercase',
                            marginBottom: '2px',
                        }}
                    >
                        Player {player}
                    </p>
                    <h2
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                            color: activeColor,
                            lineHeight: 1.05,
                            transform: isP1 ? 'rotate(-1deg)' : 'rotate(1deg)',
                            transition: 'color 0.35s',
                        }}
                    >
                        {tagline}
                    </h2>
                    <WobblyUnderline color={activeColor} />
                </div>

                {/* Name */}
                <div className="flex flex-col gap-1">
                    <label
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '0.85rem',
                            color: 'rgba(0,0,0,0.55)',
                            display: 'block',
                            transform: isP1 ? 'rotate(-0.8deg)' : 'rotate(0.8deg)',
                        }}
                    >
                        Your Name
                    </label>
                    <input
                        type="text"
                        maxLength={20}
                        placeholder={isP1 ? 'The Destroyer' : 'Shadow Queen'}
                        value={data.name}
                        onChange={(e) => onChange('name', e.target.value)}
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '1.05rem',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: `2px solid ${data.name ? activeColor : 'rgba(0,0,0,0.2)'}`,
                            background: 'rgba(255,255,255,0.6)',
                            color: '#111',
                            outline: 'none',
                            boxShadow: data.name ? `0 0 10px ${activeColor}44` : 'none',
                            caretColor: activeColor,
                            transition: 'border 0.2s, box-shadow 0.2s',
                            userSelect: 'text',
                            WebkitUserSelect: 'text',
                            width: '100%',
                        }}
                    />
                </div>

                {/* Colour picker */}
                <div className="flex flex-col gap-1">
                    <label
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '0.85rem',
                            color: 'rgba(0,0,0,0.55)',
                            display: 'block',
                        }}
                    >
                        Your Colour
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map(({ hex, label }) => {
                            const isMine = data.color === hex || (!data.color && hex === defaultColor.hex);
                            const isOther = hex === otherColor;
                            return (
                                <button
                                    key={hex}
                                    title={isOther ? `Taken by Player ${isP1 ? 2 : 1}` : label}
                                    onClick={() => handleColorPick(hex)}
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: hex,
                                        border: isMine ? '3px solid #111' : '2.5px solid rgba(0,0,0,0.12)',
                                        opacity: isOther ? 0.2 : 1,
                                        cursor: isOther ? 'not-allowed' : 'pointer',
                                        transform: isMine ? 'scale(1.2)' : 'scale(1)',
                                        boxShadow: isMine ? `0 0 10px ${hex}99` : 'none',
                                        transition: 'transform 0.15s, box-shadow 0.15s',
                                        flexShrink: 0,
                                    }}
                                />
                            );
                        })}
                    </div>
                    <p
                        style={{
                            fontFamily: "'Comic Relief', serif",
                            fontSize: '0.7rem',
                            color: activeColor,
                            transition: 'color 0.35s',
                        }}
                    >
                        {COLORS.find(c => c.hex === (data.color || defaultColor.hex))?.label}
                    </p>
                </div>

                {/* Battle cry */}
                <div className="flex flex-col gap-1">
                    <label
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '0.85rem',
                            color: 'rgba(0,0,0,0.55)',
                            display: 'block',
                        }}
                    >
                        Battle Cry
                    </label>
                    <textarea
                        rows={2}
                        maxLength={80}
                        placeholder={isP1 ? '"Fear me, for I am inevitable!"' : '"You cannot win against me!"'}
                        value={data.battleCry}
                        onChange={(e) => onChange('battleCry', e.target.value)}
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '0.95rem',
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: `2px solid ${data.battleCry ? activeColor : 'rgba(0,0,0,0.2)'}`,
                            background: 'rgba(255,255,255,0.6)',
                            color: '#111',
                            outline: 'none',
                            resize: 'none',
                            boxShadow: data.battleCry ? `0 0 10px ${activeColor}44` : 'none',
                            caretColor: activeColor,
                            lineHeight: 1.4,
                            transition: 'border 0.2s, box-shadow 0.2s',
                            userSelect: 'text',
                            WebkitUserSelect: 'text',
                            width: '100%',
                        }}
                    />
                    <p
                        style={{
                            fontFamily: "'Comic Relief', serif",
                            fontSize: '0.65rem',
                            color: 'rgba(0,0,0,0.3)',
                            textAlign: 'right',
                        }}
                    >
                        {data.battleCry.length}/80
                    </p>
                </div>

                {/* Ready button */}
                <button
                    onClick={() => onReady(true)}
                    disabled={!data.name.trim() || !data.battleCry.trim()}
                    style={{
                        fontFamily: "'Mansalva', cursive",
                        fontSize: '1.1rem',
                        letterSpacing: '0.04em',
                        padding: '10px 0',
                        width: '100%',
                        borderRadius: '14px',
                        background: (!data.name.trim() || !data.battleCry.trim())
                            ? 'rgba(0,0,0,0.1)'
                            : activeColor,
                        border: `2px solid ${(!data.name.trim() || !data.battleCry.trim()) ? 'rgba(0,0,0,0.15)' : activeColor}`,
                        color: (!data.name.trim() || !data.battleCry.trim()) ? 'rgba(0,0,0,0.3)' : '#fff',
                        boxShadow: (!data.name.trim() || !data.battleCry.trim())
                            ? 'none'
                            : `0 4px 20px ${activeColor}66`,
                        transform: isP1 ? 'rotate(-0.8deg)' : 'rotate(0.8deg)',
                        cursor: (!data.name.trim() || !data.battleCry.trim()) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.25s',
                    }}
                >
                    {data.name.trim() ? `Ready, ${data.name.trim().split(' ')[0]}!` : "I'm Ready!"}
                </button>
            </div>
        </div>
    );
}

// ── Main SplitProfile ───────────────────────────────────────────────────────
export default function SplitProfile({ onComplete }) {
    const [p1, setP1] = useState({ name: '', color: COLORS[0].hex, battleCry: '' });
    const [p2, setP2] = useState({ name: '', color: COLORS[3].hex, battleCry: '' });
    const [p1Ready, setP1Ready] = useState(false);
    const [p2Ready, setP2Ready] = useState(false);
    const [launching, setLaunching] = useState(false);

    const updateP1 = useCallback((key, val) => {
        if (!p1Ready) setP1(prev => ({ ...prev, [key]: val }));
    }, [p1Ready]);

    const updateP2 = useCallback((key, val) => {
        if (!p2Ready) setP2(prev => ({ ...prev, [key]: val }));
    }, [p2Ready]);

    const handleReady = (player, ready) => {
        if (player === 1) setP1Ready(ready);
        if (player === 2) setP2Ready(ready);
    };

    const bothReady = p1Ready && p2Ready;

    const handleLaunch = () => {
        setLaunching(true);
        setTimeout(() => {
            onComplete?.({ player1: p1, player2: p2 });
        }, 1200);
    };

    return (
        <div className="relative w-full h-full overflow-hidden">

            {/* Background image — fully visible */}
            <img
                src={profileBg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Launch flash */}
            {launching && (
                <div
                    className="absolute inset-0 z-50 pointer-events-none"
                    style={{
                        animation: 'launch-flash 1.2s ease forwards',
                        background: `linear-gradient(90deg, ${p1.color}cc 0%, #fff 50%, ${p2.color}cc 100%)`,
                    }}
                />
            )}

            {/* Split panels */}
            <div className="relative z-10 flex w-full h-full">
                <PlayerPanel
                    player={1}
                    data={p1}
                    onChange={updateP1}
                    onReady={(r) => handleReady(1, r)}
                    isReady={p1Ready}
                    otherColor={p2.color}
                />

                {/* Centre divider — just the line + VS badge */}
                <div
                    className="absolute left-1/2 top-0 bottom-0 z-20 flex flex-col items-center justify-center gap-2 pointer-events-none"
                    style={{ transform: 'translateX(-50%)' }}
                >
                    <div style={{ width: '2px', flex: 1, background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.18))' }} />
                    <div
                        style={{
                            width: '52px',
                            height: '52px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.55)',
                            backdropFilter: 'blur(10px)',
                            border: '1.5px solid rgba(0,0,0,0.12)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                        }}
                    >
                        <span style={{ fontFamily: "'Mansalva', cursive", fontSize: '1rem', color: '#222' }}>VS</span>
                    </div>
                    <div style={{ width: '2px', flex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.18), transparent)' }} />
                </div>

                <PlayerPanel
                    player={2}
                    data={p2}
                    onChange={updateP2}
                    onReady={(r) => handleReady(2, r)}
                    isReady={p2Ready}
                    otherColor={p1.color}
                />
            </div>

            {/* "Forge Your Legend" banner — pushed down, not at the very top */}
            <div
                className="absolute left-0 right-0 z-20 flex items-center justify-center pointer-events-none"
                style={{ top: '10%' }}
            >
                <h1
                    style={{
                        fontFamily: "'Mansalva', cursive",
                        fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
                        color: 'rgba(0,0,0,0.70)',
                        letterSpacing: '0.14em',
                    }}
                >
                    FORGE YOUR LEGEND
                </h1>
            </div>

            {/* Both ready — launch button */}
            {bothReady && (
                <div
                    className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center pb-8 pt-6"
                    style={{
                        animation: 'slide-up 0.5s cubic-bezier(0.22,1,0.36,1) forwards',
                    }}
                >
                    <p
                        style={{
                            fontFamily: "'Comic Relief', serif",
                            fontSize: '0.8rem',
                            color: 'rgba(0,0,0,0.4)',
                            letterSpacing: '0.18em',
                            textTransform: 'uppercase',
                            marginBottom: '10px',
                        }}
                    >
                        Both warriors are ready
                    </p>
                    <button
                        onClick={handleLaunch}
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '1.6rem',
                            letterSpacing: '0.06em',
                            padding: '14px 60px',
                            borderRadius: '18px',
                            background: `linear-gradient(135deg, ${p1.color} 0%, ${p2.color} 100%)`,
                            border: 'none',
                            color: '#fff',
                            boxShadow: `0 6px 40px ${p1.color}55, 0 6px 40px ${p2.color}55`,
                            animation: 'pulse-glow 1.5s ease-in-out infinite',
                            cursor: 'pointer',
                        }}
                    >
                        LET THE BATTLE BEGIN
                    </button>
                </div>
            )}
        </div>
    );
}
