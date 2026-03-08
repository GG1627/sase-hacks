import React, { useRef, useState, useEffect, useCallback, useLayoutEffect } from 'react';
import heroBg from '../assets/hero_bg.png';
import {
    LuMic, LuPenLine, LuEraser, LuUndo2, LuCheck,
    LuPencil, LuZap, LuCrown, LuFlame, LuEye
} from 'react-icons/lu';
import { GiCrossedSwords } from 'react-icons/gi';
import { useVoice } from '../hooks/useVoice';
import { audioSystem } from '../utils/audio';

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

// ── Extreme Sci-Fi / Fantasy Picsum Photo IDs for backdrops ──
const BACKDROP_MAP = {
    'city': '133', // Neon urban night
    'ruined city': '238', // Desolate ruins
    'ruins': '1040', // Castle ruins in forest
    'forest': '1043', // Dark dense jungle
    'ocean': '1041', // Raging wave crash
    'space': '104', // Abstract dreamscape/space
    'moon': '104', // Also space
    'desert': '147', // Vast dunes
    'mountain': '225', // Jagged peaks
    'volcano': '235', // Mountain peak
    'castle': '1040', // Architecture
    'dungeon': '1064', // Dark corridor
    'arena': '1047', // Open field
    'sky': '1041', // Dramatic sky
    'battlefield': '212', // Foggy field
    'cave': '1068', // Dark cavern
    'underwater': '1016', // Deep blue
    'snow': '1036', // Frozen peaks
    'hell': '169', // Dark red tones
    'heaven': '1044', // Angelic beams
    'cemetery': '1050', // Eerie mist
};

// ── Weather / atmospheric CSS overlays ──
const WEATHER_KEYWORDS = ['rain', 'snow', 'storm', 'blizzard', 'fog', 'mist'];

export default function Canvas({ playerData, bossData, onComplete }) {
    const activeColor = playerData.color;

    // ── Canvas state ──
    const permanentCanvasRef = useRef(null); // Completed strokes (never cleared by React)
    const activeCanvasRef = useRef(null);    // Current live stroke
    const particleCanvasRef = useRef(null);
    const canvasContainerRef = useRef(null);
    const [penColor, setPenColor] = useState(activeColor);
    const [isErasing, setIsErasing] = useState(false);
    const [strokeWidth, setStrokeWidth] = useState({ min: 2, max: 5 });

    // ── Drawing Data ──
    const [elements, setElements] = useState([]); // For undo/export only
    const [isDrawing, setIsDrawing] = useState(false);
    const isDrawingRef = useRef(false); // Mirror of isDrawing that doesn't go stale in closures
    const currentPathRef = useRef([]);
    const drawCanvasRef = permanentCanvasRef; // keep alias for export/handleComplete

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

    // ── Playback stroke recording ──
    const strokeTimelineRef = useRef([]);
    const sessionStartRef = useRef(Date.now());



    // ── Voice handler ──
    const handleVoiceCommand = useCallback((text) => {
        // Tool switching
        if (text.includes('eraser') || text.includes('erase')) {
            setPenColor('#ffffff'); setIsErasing(true);
        } else if (text.includes('pen') || text.includes('pencil') || text.includes('draw')) {
            setPenColor(activeColor); setIsErasing(false);
        }

        // Color changing (Massive 150+ Color Dictionary)
        const colorMap = {
            'alice blue': '#f0f8ff', 'antique white': '#faebd7', 'aqua': '#00ffff', 'aquamarine': '#7fffd4',
            'azure': '#f0ffff', 'beige': '#f5f5dc', 'bisque': '#ffe4c4', 'black': '#111111',
            'blanched almond': '#ffebcd', 'blue': '#2563EB', 'blue violet': '#8a2be2', 'brown': '#B45309',
            'bronze': '#B45309', 'burlywood': '#deb887', 'cadet blue': '#5f9ea0', 'chartreuse': '#7fff00',
            'chocolate': '#d2691e', 'coral': '#ff7f50', 'cornflower blue': '#6495ed', 'cornsilk': '#fff8dc',
            'crimson': '#dc143c', 'cyan': '#00ffff', 'dark blue': '#00008b', 'dark cyan': '#008b8b',
            'dark goldenrod': '#b8860b', 'dark gray': '#a9a9a9', 'dark green': '#006400', 'dark grey': '#a9a9a9',
            'dark khaki': '#bdb76b', 'dark magenta': '#8b008b', 'dark olive green': '#556b2f', 'dark orange': '#ff8c00',
            'dark orchid': '#9932cc', 'dark red': '#8b0000', 'dark salmon': '#e9967a', 'dark sea green': '#8fbc8f',
            'dark slate blue': '#483d8b', 'dark slate gray': '#2f4f4f', 'dark slate grey': '#2f4f4f', 'dark turquoise': '#00ced1',
            'dark violet': '#9400d3', 'deep pink': '#ff1493', 'deep sky blue': '#00bfff', 'dim gray': '#696969',
            'dim grey': '#696969', 'dodger blue': '#1e90ff', 'firebrick': '#b22222', 'floral white': '#fffaf0',
            'forest green': '#228b22', 'fuchsia': '#ff00ff', 'gainsboro': '#dcdcdc', 'ghost white': '#f8f8ff',
            'gold': '#ffd700', 'goldenrod': '#daa520', 'gray': '#808080', 'green': '#16A34A',
            'green yellow': '#adff2f', 'grey': '#808080', 'honeydew': '#f0fff0', 'hot pink': '#ff69b4',
            'indian red': '#cd5c5c', 'indigo': '#4b0082', 'ivory': '#fffff0', 'khaki': '#f0e68c',
            'lavender': '#e6e6fa', 'lavender blush': '#fff0f5', 'lawn green': '#7cfc00', 'lemon chiffon': '#fffacd',
            'light blue': '#add8e6', 'light coral': '#f08080', 'light cyan': '#e0ffff', 'light goldenrod yellow': '#fafad2',
            'light gray': '#d3d3d3', 'light green': '#90ee90', 'light grey': '#d3d3d3', 'light pink': '#ffb6c1',
            'light salmon': '#ffa07a', 'light sea green': '#20b2aa', 'light sky blue': '#87cefa', 'light slate gray': '#778899',
            'light slate grey': '#778899', 'light steel blue': '#b0c4de', 'light yellow': '#ffffe0', 'lime': '#00ff00',
            'lime green': '#32cd32', 'linen': '#faf0e6', 'magenta': '#ff00ff', 'maroon': '#800000',
            'medium aquamarine': '#66cdaa', 'medium blue': '#0000cd', 'medium orchid': '#ba55d3', 'medium purple': '#9370db',
            'medium sea green': '#3cb371', 'medium slate blue': '#7b68ee', 'medium spring green': '#00fa9a', 'medium turquoise': '#48d1cc',
            'medium violet red': '#c71585', 'midnight blue': '#191970', 'mint cream': '#f5fffa', 'mint green': '#98ff98',
            'misty rose': '#ffe4e1', 'moccasin': '#ffe4b5', 'navajo white': '#ffdead', 'navy': '#000080',
            'old lace': '#fdf5e6', 'olive': '#808000', 'olive drab': '#6b8e23', 'orange': '#EA580C',
            'orange red': '#ff4500', 'orchid': '#da70d6', 'pale goldenrod': '#eee8aa', 'pale green': '#98fb98',
            'pale turquoise': '#afeeee', 'pale violet red': '#db7093', 'papaya whip': '#ffefd5', 'peach puff': '#ffdab9',
            'peru': '#cd853f', 'pink': '#DB2777', 'plum': '#dda0dd', 'powder blue': '#b0e0e6',
            'purple': '#7C3AED', 'rebecca purple': '#663399', 'red': '#DC2626', 'rosy brown': '#bc8f8f',
            'royal blue': '#4169e1', 'saddle brown': '#8b4513', 'salmon': '#fa8072', 'sandy brown': '#f4a460',
            'scarlet': '#ff2400', 'sea green': '#2e8b57', 'seashell': '#fff5ee', 'sienna': '#a0522d',
            'silver': '#c0c0c0', 'sky blue': '#87ceeb', 'slate blue': '#6a5acd', 'slate gray': '#708090',
            'slate grey': '#708090', 'snow': '#fffafa', 'spring green': '#00ff7f', 'steel blue': '#4682b4',
            'tan': '#d2b48c', 'teal': '#0D9488', 'thistle': '#d8bfd8', 'tomato': '#ff6347',
            'turquoise': '#40e0d0', 'violet': '#ee82ee', 'wheat': '#f5deb3', 'white': '#ffffff',
            'white smoke': '#f5f5f5', 'yellow': '#FACC15', 'yellow green': '#9acd32', 'wine': '#722f37',
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
        for (const [keyword, id] of Object.entries(BACKDROP_MAP)) {
            if (text.includes(keyword)) {
                setBackdropUrl(`https://picsum.photos/id/${id}/1600/900`);
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
            if (!isTimeUp) {
                setElements([]);
                // Clear the permanent canvas
                const c = permanentCanvasRef.current;
                if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
            }
        }
        if (text.includes('undo') || text.includes('go back') || text.includes('mistake') || text.includes('oops')) {
            if (!isTimeUp) {
                setElements(prev => prev.slice(0, prev.length - 1));
            }
        }
        if (text.includes('finish') || text.includes("i'm done") || text.includes('im done') || text.includes('submit') || text.includes('done')) {
            if (!isTimeUp) setTimeLeft(0);
        }
    }, [activeColor, isTimeUp]);

    const { transcript, isListening, toggleListening, startListening, stopListening } = useVoice(handleVoiceCommand);

    // ── Canvas sizing (only on mount + resize) ──
    useEffect(() => {
        const resizeCanvases = () => {
            const container = canvasContainerRef.current;
            if (!container) return;
            const w = container.offsetWidth;
            const h = container.offsetHeight;

            [permanentCanvasRef, activeCanvasRef].forEach(ref => {
                const c = ref.current;
                if (c && (c.width !== w || c.height !== h)) {
                    // Save current content
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = c.width;
                    tempCanvas.height = c.height;
                    tempCanvas.getContext('2d').drawImage(c, 0, 0);
                    // Resize
                    c.width = w;
                    c.height = h;
                    // Restore content
                    c.getContext('2d').drawImage(tempCanvas, 0, 0);
                }
            });
        };
        resizeCanvases();
        window.addEventListener('resize', resizeCanvases);
        return () => window.removeEventListener('resize', resizeCanvases);
    }, []);

    // ── Helper: draw a path directly on a canvas context ──
    const drawPathOnCtx = useCallback((ctx, points, color, width) => {
        if (!ctx || points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.stroke();
    }, []);

    // ── Redraw all elements onto permanent canvas (used by undo/clear/demo) ──
    const redrawPermanentCanvas = useCallback((els) => {
        const canvas = permanentCanvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        els.forEach(el => {
            drawPathOnCtx(ctx, el.points, el.color, el.width);
        });
    }, [drawPathOnCtx]);

    // ── Init: start voice ──
    useEffect(() => {
        startListening();

        // Lower background music volume while drawing so mic works better
        audioSystem.setMusicVolume(0.03);

        sessionStartRef.current = Date.now();
        return () => {
            stopListening();
            // Restore background music volume when leaving canvas
            audioSystem.setMusicVolume(0.4);
        };
    }, [startListening, stopListening]);

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
                const count = 5; // Fixed particle count
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
    }, [activeEffect]);

    // Track pointer position for drawing + particle spawning
    const handlePointerMove = (e) => {
        const container = canvasContainerRef.current;
        if (!container || isTimeUp) return;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        pointerRef.current.x = x;
        pointerRef.current.y = y;

        if (isDrawingRef.current) {
            currentPathRef.current.push([x, y]);

            // Draw live stroke on the active (temporary) canvas
            const activeCanvas = activeCanvasRef.current;
            if (activeCanvas) {
                const ctx = activeCanvas.getContext('2d');
                ctx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
                const w = strokeWidth.min + ((strokeWidth.max - strokeWidth.min) / 2);
                drawPathOnCtx(ctx, currentPathRef.current, isErasing ? '#ffffff' : penColor, w);
            }
        }
    };

    const handlePointerDown = (e) => {
        if (isTimeUp) return;
        pointerRef.current.active = true;
        isDrawingRef.current = true;
        setIsDrawing(true);

        const container = canvasContainerRef.current;
        const rect = container.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        currentPathRef.current = [[x, y]];

        // FEATURE 4: Record stroke timestamp
        strokeTimelineRef.current.push({
            type: 'down',
            time: Date.now() - sessionStartRef.current,
            x, y,
            color: isErasing ? '#ffffff' : penColor,
            width: strokeWidth.min,
        });
    };

    const handlePointerUp = () => {
        if (isTimeUp) return;
        pointerRef.current.active = false;

        if (isDrawingRef.current) {
            isDrawingRef.current = false;
            setIsDrawing(false);

            // "Stamp" the completed stroke onto the permanent canvas
            if (currentPathRef.current.length > 0) {
                const permCanvas = permanentCanvasRef.current;
                if (permCanvas) {
                    const ctx = permCanvas.getContext('2d');
                    const w = strokeWidth.min + ((strokeWidth.max - strokeWidth.min) / 2);
                    drawPathOnCtx(ctx, currentPathRef.current, isErasing ? '#ffffff' : penColor, w);
                }

                // Save to elements for undo/export
                setElements(prev => [...prev, {
                    points: [...currentPathRef.current],
                    color: isErasing ? '#ffffff' : penColor,
                    width: strokeWidth.min + ((strokeWidth.max - strokeWidth.min) / 2),
                    isErasing
                }]);
            }

            // Clear the temporary active canvas
            const activeCanvas = activeCanvasRef.current;
            if (activeCanvas) {
                activeCanvas.getContext('2d').clearRect(0, 0, activeCanvas.width, activeCanvas.height);
            }
            currentPathRef.current = [];
        }

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
            setIsDrawing(false);
            pointerRef.current.active = false;
            setTimeout(() => handleComplete(), 2000);
        }
    }, [timeLeft, isTimeUp]);

    const handleComplete = async () => {
        if (drawCanvasRef.current) {
            const base64Data = drawCanvasRef.current.toDataURL('image/png');
            // Also capture the particle canvas for composite
            let particleData = null;
            if (particleCanvasRef.current) {
                particleData = particleCanvasRef.current.toDataURL('image/png');
            }

            // Parse the voice transcript with Groq/Llama to separate
            // drawing commands from creative character descriptions
            let parsedTranscript = {
                description: transcript.trim() || playerData.battleCry,
                lore: ''
            };

            if (transcript.trim()) {
                try {
                    const resp = await fetch('http://localhost:5000/api/parse-transcript', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            transcript: transcript.trim(),
                            heroName: playerData.name,
                            bossName: bossData?.name || 'Boss',
                        }),
                    });
                    if (resp.ok) {
                        parsedTranscript = await resp.json();
                    }
                } catch (err) {
                    console.error('Transcript parsing failed, using raw:', err);
                }
            }

            onComplete({
                drawing: base64Data,
                particleOverlay: particleData,
                voiceDescription: parsedTranscript.description || transcript.trim() || playerData.battleCry,
                characterLore: parsedTranscript.lore || '',
                rawTranscript: transcript.trim(),
                strokeTimeline: strokeTimelineRef.current,
                elementsData: elements,
            });
        }
    };

    const handleClear = () => {
        if (!isTimeUp) {
            setElements([]);
            redrawPermanentCanvas([]);
        }
    };
    const handleUndo = () => {
        if (!isTimeUp) {
            setElements(prev => {
                const newEls = prev.slice(0, prev.length - 1);
                redrawPermanentCanvas(newEls);
                return newEls;
            });
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

                    {/* Timer pill */}
                    <div style={{
                        padding: '8px 0', borderRadius: '16px',
                        minWidth: '110px', textAlign: 'center',
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

                    {/* Drawing Surface with Particle Overlay */}
                    <div
                        ref={canvasContainerRef}
                        className="flex-1 rounded-2xl overflow-hidden relative"
                        style={{
                            background: '#fff',
                            border: `3px solid ${activeColor}60`,
                            boxShadow: `0 0 40px ${activeColor}20, 0 8px 32px rgba(0,0,0,0.4)`,
                        }}
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
                                                width: '2px', height: `${15 + Math.random() * 20}px`,
                                                background: 'rgba(200,220,255,0.8)',
                                                animation: `rain-fall ${0.4 + Math.random() * 0.4}s linear ${Math.random() * 1}s infinite`,
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

                        {/* Permanent canvas for completed strokes */}
                        <canvas
                            ref={permanentCanvasRef}
                            className="absolute inset-0 w-full h-full touch-none"
                            style={{ zIndex: 1 }}
                        />

                        {/* Active canvas for the current live stroke */}
                        <canvas
                            ref={activeCanvasRef}
                            className="absolute inset-0 w-full h-full cursor-crosshair touch-none pointer-events-none"
                            style={{ zIndex: 2 }}
                        />

                        {/* FEATURE 1: Particle overlay canvas */}
                        <canvas
                            ref={particleCanvasRef}
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ zIndex: 3 }}
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
                        <div className="flex-1 overflow-hidden" style={{ minWidth: 0 }}>
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
                            <div className="w-full overflow-hidden relative" style={{ height: '1.25rem' }}>
                                <p style={{
                                    fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
                                    color: '#fff', fontStyle: transcript ? 'normal' : 'italic', opacity: transcript ? 1 : 0.4,
                                    whiteSpace: 'nowrap', position: 'absolute', right: 0,
                                    direction: 'rtl', textAlign: 'left',
                                }}>
                                    <span style={{ direction: 'ltr', unicodeBidi: 'bidi-override' }}>
                                        {transcript || '"Give me fire and put me in a ruined city..."'}
                                    </span>
                                </p>
                            </div>
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

                    {/* Demo Button - Visible for quick testing */}
                    <button onClick={() => {
                        // Secret demo drawing (a huge rough "dragon" sketch outline)
                        setElements([
                            { color: activeColor, width: 3, points: [[500, 200], [450, 150], [400, 180], [380, 250], [420, 300], [480, 350], [550, 300], [520, 220]] },
                            { color: activeColor, width: 3, points: [[380, 250], [300, 300], [250, 350], [200, 450], [300, 400], [420, 300]] },
                            { color: activeColor, width: 3, points: [[550, 300], [650, 350], [750, 450], [600, 400], [480, 350]] },
                            { color: '#ef4444', width: 6, points: [[420, 190], [430, 195], [440, 190]] }, // Eye
                            { color: activeColor, width: 2, points: [[350, 200], [300, 150], [320, 180]] }, // Horns
                        ]);
                    }} className="absolute bottom-4 left-4 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1 rounded-md z-50 border border-white/20 transition-colors">
                        Demo
                    </button>

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
