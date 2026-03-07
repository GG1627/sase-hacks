import { useState } from 'react';
import { useBattleContext } from '../context/BattleContext';

const COLORS = [
    { hex: '#FF4444', name: 'Crimson Fire' },
    { hex: '#4444FF', name: 'Royal Blue' },
    { hex: '#44FF44', name: 'Venom Green' },
    { hex: '#FF44FF', name: 'Arcane Purple' },
    { hex: '#FF8800', name: 'Solar Orange' },
    { hex: '#00FFFF', name: 'Frost Cyan' },
    { hex: '#FFD700', name: 'Ancient Gold' },
    { hex: '#FF1493', name: 'Chaos Pink' },
];

function PlayerForm({ label, player, onChange, onReady, isReady }) {
    return (
        <div
            className={`flex-1 p-8 flex flex-col gap-4 ${label === 'PLAYER 1' ? 'border-r border-white/10' : ''} ${isReady ? 'opacity-50' : ''}`}
        >
            <h2 className="text-2xl font-bold text-center">{label}</h2>

            <label className="flex flex-col gap-1">
                <span className="text-sm text-white/60">Name</span>
                <input
                    type="text"
                    placeholder="Enter your name"
                    value={player.name}
                    onChange={(e) => onChange({ name: e.target.value })}
                    disabled={isReady}
                    className="w-full px-3 py-3 bg-white/8 rounded-lg text-white text-base outline-none focus:bg-white/12 transition-colors"
                />
            </label>

            <div className="flex flex-col gap-1">
                <span className="text-sm text-white/60">Color</span>
                <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                        <button
                            key={c.hex}
                            onClick={() => onChange({ color: c.hex })}
                            disabled={isReady}
                            title={c.name}
                            className="w-10 h-10 rounded-full cursor-pointer transition-transform hover:scale-110"
                            style={{
                                background: c.hex,
                                border: player.color === c.hex ? '3px solid #fff' : '3px solid transparent',
                            }}
                        />
                    ))}
                </div>
            </div>

            <label className="flex flex-col gap-1">
                <span className="text-sm text-white/60">Battle Cry</span>
                <input
                    type="text"
                    placeholder="One sentence battle cry"
                    value={player.battleCry}
                    onChange={(e) => onChange({ battleCry: e.target.value })}
                    disabled={isReady}
                    className="w-full px-3 py-3 bg-white/8 rounded-lg text-white text-base outline-none focus:bg-white/12 transition-colors"
                />
            </label>

            <button
                onClick={onReady}
                disabled={isReady || !player.name || !player.color || !player.battleCry}
                className="mt-auto py-4 rounded-lg text-lg font-bold transition-colors disabled:opacity-40 disabled:cursor-default"
                style={{
                    background: isReady ? 'rgba(255,255,255,0.1)' : (player.color || '#555'),
                }}
            >
                {isReady ? '✓ READY' : 'READY'}
            </button>
        </div>
    );
}

export default function SplitProfile({ onComplete }) {
    const { dispatch } = useBattleContext();
    const [p1, setP1] = useState({ name: '', color: '', battleCry: '' });
    const [p2, setP2] = useState({ name: '', color: '', battleCry: '' });
    const [p1Ready, setP1Ready] = useState(false);
    const [p2Ready, setP2Ready] = useState(false);

    function handleP1Ready() {
        dispatch({ type: 'UPDATE_PLAYER1', payload: p1 });
        setP1Ready(true);
    }

    function handleP2Ready() {
        dispatch({ type: 'UPDATE_PLAYER2', payload: p2 });
        setP2Ready(true);
    }

    if (p1Ready && p2Ready) {
        setTimeout(() => onComplete(), 500);
    }

    return (
        <div className="w-full h-full flex flex-col">
            <h1 className="text-center py-6 text-3xl font-bold">
                ⚔️ CLASH OF LEGENDS
            </h1>
            <div className="flex flex-1 overflow-hidden">
                <PlayerForm
                    label="PLAYER 1"
                    player={p1}
                    onChange={(update) => setP1((prev) => ({ ...prev, ...update }))}
                    onReady={handleP1Ready}
                    isReady={p1Ready}
                />
                <PlayerForm
                    label="PLAYER 2"
                    player={p2}
                    onChange={(update) => setP2((prev) => ({ ...prev, ...update }))}
                    onReady={handleP2Ready}
                    isReady={p2Ready}
                />
            </div>
        </div>
    );
}
