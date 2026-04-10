import { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BUILDABLE } from '../data/buildings';
import { RESOURCE_DEFS } from '../data/resources';

export function BuildMenu({ onClose }: { onClose: () => void }) {
    const [toast, setToast] = useState('');
    const [pressed, setPressed] = useState<string | null>(null);
    const resources = useGameStore(s => s.resources);
    const buildings = useGameStore(s => s.buildings);
    const currentDay = useGameStore(s => s.currentDay);

    const enterBuildMode = useGameStore(s => s.enterBuildMode);

    const handleCardTap = (item: typeof BUILDABLE[0], affordable: boolean, available: boolean) => {
        if (!available) return;
        if (!affordable) {
            setToast('\uC790\uC6D0\uC774 \uBD80\uC871\uD569\uB2C8\uB2E4');
            setTimeout(() => setToast(''), 2000);
            return;
        }
        enterBuildMode(item.id);
        onClose();
    };

    return (
        <div className="pointer-events-auto" style={{ marginBottom: '6px', position: 'relative' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
                    background: 'rgba(220,50,50,0.9)', color: '#fff', padding: '6px 16px',
                    borderRadius: '20px', fontSize: '13px', fontFamily: 'Fredoka, sans-serif',
                    fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>{toast}</div>
            )}

            <div style={{
                background: 'linear-gradient(180deg, #5a3a1e 0%, #3a220e 100%)',
                borderTop: '3px solid #7a5a30',
                borderBottom: '3px solid #2a1a08',
                padding: '10px 0',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,220,150,0.1)',
            }}>
                <div style={{
                    display: 'flex', overflowX: 'auto', gap: '10px', padding: '0 14px',
                    scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch',
                }}>
                    {BUILDABLE.map(item => {
                        const imgSrc = `assets/generated/buildings/${item.id}.png`;
                        const bState = buildings[item.id];
                        const built = bState?.built ?? false;
                        const underConstruction = !built && bState?.constructionStartedAt != null;
                        const available = item.unlockDay <= currentDay && !built && !underConstruction;
                        const affordable = available && item.cost.every(c => resources[c.res]?.amount >= c.amount);
                        const isLocked = !available && !built;
                        const isPressed = pressed === item.id;
                        const imgSize = 80 * item.scale;

                        // Find resource images from RESOURCE_DEFS
                        const getResImg = (resId: string) => {
                            const def = RESOURCE_DEFS.find(r => r.id === resId);
                            return def?.img ?? '';
                        };

                        // Card background
                        let cardBg: string, cardBorder: string, cardOpacity: number;
                        if (isLocked) {
                            cardBg = 'linear-gradient(180deg, #5a5550 0%, #4a4540 100%)';
                            cardBorder = '3px solid #3a3530';
                            cardOpacity = 0.5;
                        } else if (!affordable) {
                            cardBg = 'linear-gradient(180deg, #e8d0b0 0%, #d0b890 100%)';
                            cardBorder = '3px solid #a08050';
                            cardOpacity = 0.7;
                        } else {
                            cardBg = 'linear-gradient(180deg, #f5e6c8 0%, #e0c898 100%)';
                            cardBorder = '3px solid #c8a060';
                            cardOpacity = 1;
                        }

                        return (
                            <div key={item.id}
                                onPointerDown={() => available && setPressed(item.id)}
                                onPointerUp={() => { setPressed(null); handleCardTap(item, affordable, available); }}
                                onPointerLeave={() => setPressed(null)}
                                style={{
                                    scrollSnapAlign: 'center',
                                    flexShrink: 0,
                                    width: '140px',
                                    background: cardBg,
                                    border: cardBorder,
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    opacity: cardOpacity,
                                    position: 'relative',
                                    transform: isPressed ? 'scale(0.93)' : 'scale(1)',
                                    transition: 'transform 0.1s',
                                    cursor: available ? 'pointer' : 'default',
                                }}>
                                {/* Building image */}
                                <div style={{
                                    height: '110px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <img src={imgSrc} alt={item.name} style={{
                                        width: `${imgSize}px`, height: `${imgSize}px`, objectFit: 'contain',
                                        opacity: isLocked ? 0.3 : 1,
                                    }} />
                                    {isLocked && (
                                        <span style={{ position: 'absolute', fontSize: '32px', opacity: 0.6 }}>{'\uD83D\uDD12'}</span>
                                    )}
                                    {built && (
                                        <span style={{
                                            position: 'absolute', top: '4px', right: '4px',
                                            background: '#4cd964', color: '#fff', borderRadius: '50%',
                                            width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '14px', fontWeight: 700, border: '2px solid #fff',
                                        }}>{'\u2713'}</span>
                                    )}
                                    {underConstruction && (
                                        <div style={{
                                            position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
                                            background: 'rgba(245,158,11,0.9)', color: '#fff', fontSize: '10px',
                                            padding: '1px 8px', borderRadius: '8px', fontWeight: 700,
                                        }}>{'\uAC74\uC124 \uC911...'}</div>
                                    )}
                                    {/* Insufficient overlay */}
                                    {available && !affordable && !built && (
                                        <div style={{
                                            position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
                                            background: 'rgba(200,50,50,0.8)', color: '#fff', fontSize: '10px',
                                            padding: '1px 8px', borderRadius: '8px', fontWeight: 700,
                                        }}>{'\uC790\uC6D0 \uBD80\uC871'}</div>
                                    )}
                                </div>

                                {/* Name + cost */}
                                <div style={{ padding: '8px 8px' }}>
                                    <div style={{
                                        fontFamily: 'Fredoka, sans-serif', fontSize: '15px', fontWeight: 700,
                                        color: isLocked ? '#888' : '#3a2810', textAlign: 'center',
                                    }}>
                                        {item.name}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '5px' }}>
                                        {item.cost.map((c, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <img src={getResImg(c.res)} alt={c.res} style={{ width: '16px', height: '16px' }} />
                                                <span style={{
                                                    fontSize: '15px', fontFamily: 'Fredoka, sans-serif', fontWeight: 700,
                                                    color: isLocked ? '#666' : (affordable ? '#3a2810' : '#c04030'),
                                                }}>{c.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
