import React, { useState, useEffect } from 'react';
import { getBattles } from '../services/db';
import { GiCrown, GiCrossedSwords } from 'react-icons/gi';
import { HiHome } from 'react-icons/hi';
import heroBg from '../assets/hero_bg.avif';

export default function Gallery({ onBack }) {
    const [battles, setBattles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState(null);

    useEffect(() => {
        getBattles()
            .then(data => setBattles(data))
            .catch(err => console.error('[Gallery] Failed to load:', err))
            .finally(() => setLoading(false));
    }, []);

    const timeAgo = (dateStr) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    return (
        <div style={{
            position: 'fixed', inset: 0,
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif",
        }}>
            {/* Background */}
            <img src={heroBg} alt="" style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)' }} />

            {/* Header */}
            <div style={{
                position: 'relative', zIndex: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1.25rem 2rem',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(12px)',
            }}>
                <button onClick={onBack} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff', padding: '0.5rem 1rem', borderRadius: '10px',
                    fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}>
                    <HiHome size={16} /> Home
                </button>

                <h1 style={{
                    fontFamily: "'Mansalva', cursive",
                    fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                    color: '#fff', letterSpacing: '0.06em',
                    textShadow: '0 0 30px rgba(255,180,80,0.3)',
                    margin: 0,
                }}>
                    Battle Gallery
                </h1>

                <div style={{ width: '80px' }} />
            </div>

            {/* Content */}
            <div style={{
                position: 'relative', zIndex: 5,
                height: 'calc(100% - 70px)',
                overflowY: 'auto',
                padding: '1.5rem 2rem 3rem',
            }}>
                {loading ? (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        height: '60%',
                    }}>
                        <div style={{
                            width: 40, height: 40,
                            border: '3px solid rgba(255,255,255,0.2)',
                            borderTopColor: '#fff', borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                    </div>
                ) : battles.length === 0 ? (
                    <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        height: '60%', gap: '1rem',
                    }}>
                        <GiCrossedSwords size={48} color="rgba(255,255,255,0.2)" />
                        <p style={{
                            color: 'rgba(255,255,255,0.4)',
                            fontFamily: "'Mansalva', cursive",
                            fontSize: '1.2rem',
                        }}>
                            No battles yet. Be the first to forge a legend!
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.25rem',
                        maxWidth: '1200px',
                        margin: '0 auto',
                    }}>
                        {battles.map(b => (
                            <div
                                key={b._id}
                                onClick={() => setSelected(b)}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}
                                onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(255,170,50,0.15)'; }}
                                onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                            >
                                {/* Hero image */}
                                <div style={{
                                    width: '100%', aspectRatio: '16/9',
                                    background: 'radial-gradient(ellipse, #1a1030, #0d0d1a)',
                                    overflow: 'hidden', position: 'relative',
                                }}>
                                    {b.heroImageUrl ? (
                                        <img src={b.heroImageUrl} alt={b.heroName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            loading="lazy"
                                        />
                                    ) : b.drawingUrl ? (
                                        <img src={b.drawingUrl} alt={b.heroName}
                                            style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div style={{
                                            width: '100%', height: '100%',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            <GiCrossedSwords size={40} color="rgba(255,255,255,0.15)" />
                                        </div>
                                    )}

                                    {/* Winner badge */}
                                    <div style={{
                                        position: 'absolute', top: 8, right: 8,
                                        padding: '3px 10px', borderRadius: '20px',
                                        background: b.winner === 'hero'
                                            ? 'linear-gradient(135deg, #ffaa32, #ff6b00)'
                                            : 'linear-gradient(135deg, #ff4444, #cc0000)',
                                        fontSize: '0.65rem', fontWeight: 700,
                                        color: '#fff', letterSpacing: '0.05em',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    }}>
                                        <GiCrown size={10} />
                                        {b.winnerName || (b.winner === 'hero' ? b.heroName : b.bossName)}
                                    </div>
                                </div>

                                {/* Card body */}
                                <div style={{ padding: '0.75rem 1rem' }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', marginBottom: '0.35rem',
                                    }}>
                                        <h3 style={{
                                            fontFamily: "'Mansalva', cursive",
                                            fontSize: '1.1rem', color: b.heroColor || '#ffaa32',
                                            margin: 0, lineHeight: 1.2,
                                        }}>
                                            {b.heroName}
                                        </h3>
                                        <span style={{
                                            fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)',
                                            fontFamily: "'Comic Relief', serif",
                                        }}>
                                            {timeAgo(b.createdAt)}
                                        </span>
                                    </div>

                                    <p style={{
                                        fontSize: '0.75rem',
                                        color: 'rgba(255,255,255,0.5)',
                                        margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem',
                                    }}>
                                        <GiCrossedSwords size={10} /> vs {b.bossName}
                                    </p>

                                    {b.fightCommentary && (
                                        <p style={{
                                            fontSize: '0.7rem', fontStyle: 'italic',
                                            color: 'rgba(255,255,255,0.4)',
                                            margin: '0.4rem 0 0', lineHeight: 1.4,
                                            overflow: 'hidden', textOverflow: 'ellipsis',
                                            display: '-webkit-box', WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                        }}>
                                            "{b.fightCommentary}"
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Detail Modal ── */}
            {selected && (
                <div
                    onClick={() => setSelected(null)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 100,
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '2rem',
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'rgba(20,20,30,0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '20px',
                            maxWidth: '600px', width: '100%',
                            maxHeight: '85vh', overflowY: 'auto',
                            animation: 'fadeIn 0.3s ease',
                        }}
                    >
                        {/* Modal hero image */}
                        <div style={{
                            width: '100%', aspectRatio: '16/9',
                            background: 'radial-gradient(ellipse, #1a1030, #0d0d1a)',
                            overflow: 'hidden', borderRadius: '20px 20px 0 0',
                        }}>
                            {selected.heroImageUrl ? (
                                <img src={selected.heroImageUrl} alt={selected.heroName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                            ) : selected.drawingUrl ? (
                                <img src={selected.drawingUrl} alt={selected.heroName}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#fff' }}
                                />
                            ) : null}
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                            {/* Winner announcement */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                marginBottom: '0.5rem',
                            }}>
                                <GiCrown size={18} color="#ffaa32" />
                                <span style={{
                                    fontSize: '0.75rem', color: 'rgba(255,220,150,0.8)',
                                    letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600,
                                }}>
                                    WINNER
                                </span>
                            </div>

                            <h2 style={{
                                fontFamily: "'Mansalva', cursive",
                                fontSize: '1.8rem',
                                color: '#fff',
                                margin: '0 0 0.25rem',
                            }}>
                                {selected.winnerName}
                            </h2>

                            <p style={{
                                fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)',
                                margin: '0 0 1rem',
                            }}>
                                <span style={{ color: selected.heroColor || '#ffaa32' }}>{selected.heroName}</span>
                                {' '}vs{' '}
                                <span style={{ color: '#ff6b6b' }}>{selected.bossName}</span>
                            </p>

                            {/* Drawing thumbnail */}
                            {selected.drawingUrl && selected.heroImageUrl && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{
                                        fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)',
                                        letterSpacing: '0.1em', textTransform: 'uppercase',
                                        marginBottom: '0.4rem',
                                    }}>
                                        Original Drawing
                                    </p>
                                    <img src={selected.drawingUrl} alt="Drawing"
                                        style={{
                                            height: '80px', borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            background: '#fff',
                                        }}
                                    />
                                </div>
                            )}

                            {/* Battle narrative */}
                            {selected.battleNarrative && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{
                                        fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)',
                                        letterSpacing: '0.1em', textTransform: 'uppercase',
                                        marginBottom: '0.3rem',
                                    }}>
                                        Battle Narrative
                                    </p>
                                    <p style={{
                                        fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)',
                                        lineHeight: 1.6, fontStyle: 'italic', margin: 0,
                                    }}>
                                        "{selected.battleNarrative}"
                                    </p>
                                </div>
                            )}

                            {/* Fight commentary */}
                            {selected.fightCommentary && (
                                <div style={{ marginBottom: '1rem' }}>
                                    <p style={{
                                        fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)',
                                        letterSpacing: '0.1em', textTransform: 'uppercase',
                                        marginBottom: '0.3rem',
                                    }}>
                                        Commentary
                                    </p>
                                    <p style={{
                                        fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)',
                                        lineHeight: 1.5, margin: 0,
                                    }}>
                                        "{selected.fightCommentary}"
                                    </p>
                                </div>
                            )}

                            {/* Winner reason */}
                            {selected.winnerReason && (
                                <p style={{
                                    fontSize: '0.8rem', color: 'rgba(255,220,150,0.6)',
                                    fontStyle: 'italic', margin: '0 0 1rem',
                                }}>
                                    {selected.winnerReason}
                                </p>
                            )}

                            <button onClick={() => setSelected(null)} style={{
                                width: '100%', padding: '0.7rem',
                                borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
                                background: 'rgba(255,255,255,0.08)', color: '#fff',
                                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                            }}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
