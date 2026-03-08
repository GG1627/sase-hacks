import heroBg from '../assets/hero_bg.avif';
import { LuHand, LuZap, LuFilm, LuCrown, LuMic } from 'react-icons/lu';
import { GiCrossedSwords } from 'react-icons/gi';

// Each icon gets a slight random tilt + staggered float delay
const ICONS = [
    { Icon: LuHand, rotate: '-12deg', top: '9%', left: '8%', delay: '0s' },
    { Icon: GiCrossedSwords, rotate: '6deg', top: '7%', left: '22%', delay: '0.4s' },
    { Icon: LuZap, rotate: '-5deg', top: '11%', left: '45%', delay: '0.8s' },
    { Icon: LuMic, rotate: '10deg', top: '6%', left: '68%', delay: '0.2s' },
    { Icon: LuCrown, rotate: '-8deg', top: '10%', left: '88%', delay: '0.6s' },
];

export default function HomeScreen({ onStart, onGallery }) {
    return (
        <div className="relative w-full h-full overflow-hidden">

            {/* Background image */}
            <img
                src={heroBg}
                alt=""
                className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/65" />

            {/* Wobbly hand-drawn border — rough cubic bezier path instead of clean arcs */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Main border: wobbly lines via cubic beziers, open at bottom-right */}
                <path
                    d="
            M 18,97
            C 14,97.5 8,97.8 5.5,95
            C 3,92 2.8,88 3,82
            C 3.2,65 2.6,48 3,30
            C 3.2,20 2.8,10 5,4.5
            C 7,2 13,2.5 22,3
            C 38,3.4 60,2.8 78,3.2
            C 88,3.4 95,2.8 97.5,5.5
            C 99,8 97.8,16 97,28
            C 96.5,40 97.2,55 97,68
          "
                    fill="none"
                    stroke="rgba(255,255,255,0.75)"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Second slightly-offset stroke for that double hand-drawn sketch look */}
                <path
                    d="
            M 19,96
            C 15,96.8 9,97.2 6,94.5
            C 4,92 4,87 4.2,78
            C 4.5,60 3.8,44 4.2,28
            C 4.4,18 4,9 6.5,5
            C 8.5,2.5 15,3 24,3.5
            C 40,4 62,3.2 80,3.6
            C 90,3.8 96.5,3.2 98,6
            C 99.2,9 98,18 97.5,30
            C 97,44 97.8,58 97.5,70
          "
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="2 3"
                />
            </svg>

            {/* Scattered tilted icons — positioned absolute, not in a strip */}
            {ICONS.map(({ Icon, rotate, top, left, delay }, i) => (
                <div
                    key={i}
                    className="absolute z-10 text-white select-none"
                    style={{
                        top,
                        left,
                        opacity: 0.85,
                        animation: `icon-float 3s ease-in-out ${delay} infinite`,
                        transform: `rotate(${rotate})`,
                    }}
                >
                    <Icon size={30} />
                </div>
            ))}

            {/* Copyright */}
            <div
                className="absolute z-10 text-white/35 text-xs select-none"
                style={{
                    bottom: '3%',
                    right: '3%',
                    fontFamily: "'Comic Relief', serif",
                    letterSpacing: '0.08em',
                }}
            >
                © 2026 Drawn
            </div>

            {/* Content — pushed down, slightly off-center for that kid asymmetry */}
            <div className="relative z-10 flex flex-col items-center justify-end w-full h-full gap-5 px-12 pb-28">

                {/* Animated title in Mansalva */}
                <h1
                    className="title-float text-center leading-none text-white"
                    style={{
                        fontFamily: "'Mansalva', cursive",
                        fontWeight: 400,
                        fontSize: 'clamp(6rem, 15vw, 12rem)',
                        letterSpacing: '0.04em',
                        textShadow: '0 0 60px rgba(255,180,80,0.4), 0 0 120px rgba(180,100,255,0.3)',
                    }}
                >
                    <span className="letter-anim" style={{ animationName: 'letter-from-left', animationDelay: '0s' }}>D</span>
                    <span className="letter-anim" style={{ animationName: 'letter-from-top', animationDelay: '0.12s' }}>R</span>
                    <span className="letter-anim" style={{ animationName: 'letter-from-bottom', animationDelay: '0.24s' }}>A</span>
                    <span className="letter-anim" style={{ animationName: 'letter-from-top', animationDelay: '0.36s' }}>W</span>
                    <span className="letter-anim" style={{ animationName: 'letter-from-right', animationDelay: '0.48s' }}>N</span>
                </h1>

                {/* Tagline — Mansalva too, more playful copy */}
                <p
                    className="text-center text-white/90 max-w-lg"
                    style={{
                        fontFamily: "'Mansalva', cursive",
                        fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)',
                        lineHeight: 1.5,
                        transform: 'rotate(-1deg)',
                    }}
                >
                    Draw in the air. Voice their power.<br />
                    Watch them BATTLE.
                </p>


                {/* Buttons — slightly tilted opposite ways */}
                <div className="flex gap-6 mt-4">
                    <button
                        onClick={onStart}
                        className="hover:cursor-pointer px-10 py-4 rounded-xl font-bold active:scale-95"
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '1.3rem',
                            background: 'rgba(255,255,255,0.18)',
                            border: '2px solid rgba(255,255,255,0.4)',
                            color: '#fff',
                            backdropFilter: 'blur(8px)',
                            letterSpacing: '0.03em',
                            animation: 'btn-battle-pulse 3s ease-in-out 2s infinite',
                        }}
                    >
                        ⚔ Let's Battle!
                    </button>

                    <button
                        onClick={onGallery}
                        className="hover:cursor-pointer px-10 py-4 rounded-xl font-bold transition-all duration-200 hover:scale-108 active:scale-95"
                        style={{
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '1.3rem',
                            background: 'rgba(255,255,255,0.07)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            color: '#fff',
                            backdropFilter: 'blur(8px)',
                            transform: 'rotate(1deg)',
                            letterSpacing: '0.03em',
                        }}
                    >
                        View Gallery
                    </button>
                </div>
            </div>
        </div>
    );
}
