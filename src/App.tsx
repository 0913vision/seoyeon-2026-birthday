import { useRef, useState, useEffect, useCallback } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';

const RESOURCES = [
    { id: 'wood', img: 'assets/generated/resources/wood.png', value: '1,200', unlocked: true },
    { id: 'flower', img: 'assets/generated/resources/flower.png', value: '400', unlocked: true },
    { id: 'stone', img: 'assets/generated/resources/stone.png', value: '600', unlocked: true },
    { id: 'metal', img: 'assets/generated/resources/metal.png', value: '--', unlocked: false },
    { id: 'gem', img: 'assets/generated/resources/gem.png', value: '--', unlocked: false },
];

interface DialogLine {
    text: string;
    action?: string; // shown as yellow button-like text on last line
}

const SAMPLE_DIALOGUE: DialogLine[] = [
    { text: '안녕하세요. 김유찬님의 비서 로봇 콜드유입니다.' },
    { text: '김유찬님의 요청으로 선물 제작을 도와드리겠습니다.' },
    { text: '수령인의 생일이 8일 후로 확인됩니다. 24번째 생일입니다.' },
    { text: '특별한 선물상자를 제작할 예정입니다.' },
    { text: '제가 안내해 드리겠습니다. 지시에 따라 진행해 주세요.' },
    { text: '먼저 자원을 수확하겠습니다.', action: '나무밭을 터치하여 나무를 수확하세요' },
];

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [dialogIndex, setDialogIndex] = useState(0);
    const [showBuildMenu, setShowBuildMenu] = useState(false);

    const goToBox = () => {
        if (phaserRef.current?.scene) {
            const scene = phaserRef.current.scene as any;
            if (scene.goToGiftBox) scene.goToGiftBox();
        }
    };

    const handleDialogTap = () => {
        if (dialogIndex < SAMPLE_DIALOGUE.length - 1) {
            setDialogIndex(dialogIndex + 1);
        } else {
            setShowDialog(false);
            setDialogIndex(0);
        }
    };

    return (
        <div className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>
            <PhaserGame ref={phaserRef} />

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col">
                <TopBar />
                <div className="flex-1" />

                {/* Build Menu */}
                {showBuildMenu && (
                    <BuildMenu onClose={() => setShowBuildMenu(false)} />
                )}

                {/* Dialog */}
                {showDialog && (
                    <DialogBox
                        text={SAMPLE_DIALOGUE[dialogIndex].text}
                        action={SAMPLE_DIALOGUE[dialogIndex].action}
                        onTap={handleDialogTap}
                        isLast={dialogIndex === SAMPLE_DIALOGUE.length - 1}
                    />
                )}

                <BottomBar onGoToBox={goToBox} onBuild={() => setShowBuildMenu(!showBuildMenu)} />
            </div>

            {/* Debug: toggle dialog floating button */}
            <button
                onClick={() => { setShowDialog(!showDialog); setDialogIndex(0); }}
                className="absolute right-3 pointer-events-auto"
                style={{
                    bottom: '100px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '22px',
                    background: showDialog ? '#ef4444' : '#8b5cf6',
                    border: '2px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    zIndex: 50,
                }}
            >
                {showDialog ? '✕' : '💬'}
            </button>
        </div>
    );
}

function TopBar() {
    return (
        <div
            className="pointer-events-auto px-3"
            style={{ paddingTop: 'max(8px, env(safe-area-inset-top))' }}
        >
            {/* Row 1: Resource slots */}
            <div className="flex gap-1 mt-1">
                {RESOURCES.map((r) => (
                    <div
                        key={r.id}
                        className="flex-1 flex items-center justify-center gap-1 py-2"
                        style={{
                            background: r.unlocked
                                ? 'linear-gradient(180deg, #4a3520 0%, #3a2815 100%)'
                                : 'rgba(30,20,10,0.5)',
                            borderRadius: '8px',
                            border: r.unlocked ? '2px solid #5a4530' : '2px solid rgba(50,40,30,0.5)',
                        }}
                    >
                        <img src={r.img} alt={r.id} className="w-5 h-5 object-contain" />
                        <span className={`${r.unlocked ? 'text-amber-100' : 'text-white/25'}`}
                              style={{
                                  fontFamily: "Fredoka, sans-serif",
                                  fontSize: '15px',
                              }}>
                            {r.unlocked ? r.value : '🔒'}
                        </span>
                    </div>
                ))}
            </div>

            {/* Row 2: Day badge + Progress bar */}
            <div className="flex items-center gap-2 mt-1.5">
                {/* Day badge */}
                <div className="shrink-0 flex items-center gap-1"
                     style={{
                         background: 'linear-gradient(180deg, #e8a020 0%, #c07818 100%)',
                         borderRadius: '8px',
                         padding: '5px 12px',
                         border: '2px solid #a06010',
                     }}>
                    <span className="text-sm leading-none">☀️</span>
                    <span className="leading-none text-white"
                          style={{ fontFamily: "Fredoka, sans-serif", fontSize: '15px' }}>
                        DAY 3
                    </span>
                </div>

                {/* Progress bar */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                    <div className="flex-1 h-4 rounded-full overflow-hidden min-w-0"
                         style={{
                             background: '#1a1208',
                             border: '2px solid #3a2a15',
                         }}>
                        <div className="h-full rounded-full"
                             style={{
                                 width: `${(10 / 24) * 100}%`,
                                 background: 'linear-gradient(180deg, #fbbf24 0%, #e8a020 50%, #c07818 100%)',
                             }} />
                    </div>
                    <span className="shrink-0 text-amber-100 pr-1"
                          style={{ fontFamily: "Fredoka, sans-serif", fontSize: '15px' }}>
                        10/24
                    </span>
                </div>
            </div>
        </div>
    );
}

function BottomBar({ onGoToBox, onBuild }: { onGoToBox: () => void; onBuild: () => void }) {
    return (
        <div
            className="pointer-events-auto pb-2 px-4"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
            <div className="flex justify-between">
                <ActionButton icon="🏗️" label="BUILD" badge="NEW" badgeColor="#ef4444" bgColor="linear-gradient(180deg, #22c55e 0%, #16a34a 100%)" onClick={onBuild} />
                <ActionButton icon="🎁" label="BOX" bgColor="linear-gradient(180deg, #f59e0b 0%, #d97706 100%)" onClick={onGoToBox} />
            </div>
        </div>
    );
}

function ActionButton({
    icon,
    label,
    badge,
    badgeColor,
    bgColor,
    onClick,
}: {
    icon: string;
    label: string;
    badge?: string;
    badgeColor?: string;
    bgColor?: string;
    onClick?: () => void;
}) {
    return (
        <div className="relative">
            <button
                onClick={onClick}
                className="flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all active:scale-95"
                style={{
                    background: bgColor || 'linear-gradient(180deg, rgba(20,20,40,0.7) 0%, rgba(10,10,25,0.85) 100%)',
                    borderTop: '3px solid rgba(255,255,255,0.35)',
                    borderLeft: '3px solid rgba(255,255,255,0.2)',
                    borderRight: '3px solid rgba(0,0,0,0.15)',
                    borderBottom: '4px solid rgba(0,0,0,0.35)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.2)',
                    width: '82px',
                    height: '82px',
                }}
            >
                <span className="text-4xl leading-none">{icon}</span>
                <span className="text-white"
                      style={{
                          fontFamily: "Fredoka, sans-serif",
                          fontWeight: 700,
                          fontSize: '13px',
                          letterSpacing: '0.04em',
                      }}>
                    {label}
                </span>
            </button>
            {badge && (
                <span
                    className="absolute -top-2 -right-2 text-xs font-black text-white rounded-full"
                    style={{
                        background: badgeColor || '#ef4444',
                        boxShadow: `0 2px 6px ${badgeColor || '#ef4444'}80`,
                        border: '2px solid rgba(255,255,255,0.9)',
                        minWidth: '26px',
                        textAlign: 'center',
                        padding: '2px 8px',
                    }}
                >
                    {badge}
                </span>
            )}
        </div>
    );
}

const BUILD_ITEMS = [
    { id: 'woodshop', name: '목공방', desc: '파츠를 제작하는 시설', cost: [{ res: 'wood', img: 'assets/generated/resources/wood.png', amount: 500 }], available: true, built: false },
    { id: 'flower_farm', name: '꽃밭', desc: '꽃을 생산하는 시설', cost: [{ res: 'wood', img: 'assets/generated/resources/wood.png', amount: 1000 }], available: true, built: false },
    { id: 'quarry', name: '채석장', desc: '돌을 생산하는 시설', cost: [{ res: 'wood', img: 'assets/generated/resources/wood.png', amount: 1000 }], available: false, built: false },
    { id: 'mine', name: '광산', desc: '금속을 생산하는 시설', cost: [{ res: 'stone', img: 'assets/generated/resources/stone.png', amount: 1000 }], available: false, built: false },
    { id: 'jewelshop', name: '세공소', desc: '금속/보석 파츠 제작', cost: [{ res: 'wood', img: 'assets/generated/resources/wood.png', amount: 1500 }, { res: 'stone', img: 'assets/generated/resources/stone.png', amount: 1000 }], available: false, built: false },
    { id: 'gem_cave', name: '수정동굴', desc: '보석을 생산하는 시설', cost: [{ res: 'stone', img: 'assets/generated/resources/stone.png', amount: 1500 }, { res: 'metal', img: 'assets/generated/resources/metal.png', amount: 500 }], available: false, built: false },
];

function BuildMenu({ onClose }: { onClose: () => void }) {
    return (
        <div className="pointer-events-auto" style={{ marginBottom: '6px' }}>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: -1 }} />

            <div style={{
                background: 'linear-gradient(180deg, #5a3a1e 0%, #3a220e 100%)',
                borderTop: '3px solid #7a5a30',
                borderBottom: '3px solid #2a1a08',
                padding: '10px 0',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.4), inset 0 2px 0 rgba(255,220,150,0.1)',
            }}>
                {/* Horizontal scroll */}
                <div style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '10px',
                    padding: '0 14px',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {BUILD_ITEMS.map(item => {
                        const imgSrc = `assets/generated/buildings/${item.id === 'flower_farm' ? 'flower_farm' : item.id === 'gem_cave' ? 'gem_cave' : item.id}.png`;
                        return (
                            <div key={item.id} style={{
                                scrollSnapAlign: 'center',
                                flexShrink: 0,
                                width: '120px',
                                background: item.available
                                    ? 'linear-gradient(180deg, #f5e6c8 0%, #e0c898 100%)'
                                    : '#5a5550',
                                border: item.available ? '3px solid #c8a060' : '3px solid #4a4540',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                opacity: item.available ? 1 : 0.5,
                                position: 'relative',
                            }}>
                                {/* Large building image */}
                                <div style={{
                                    height: '90px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: item.available ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.2)',
                                }}>
                                    <img src={imgSrc} alt={item.name} style={{
                                        width: '80px', height: '80px', objectFit: 'contain',
                                        opacity: item.available ? 1 : 0.3,
                                    }} />
                                    {!item.available && !item.built && (
                                        <span style={{ position: 'absolute', fontSize: '28px', opacity: 0.6 }}>🔒</span>
                                    )}
                                    {item.built && (
                                        <span style={{
                                            position: 'absolute', top: '4px', right: '4px',
                                            background: '#4cd964', color: '#fff', borderRadius: '50%',
                                            width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '13px', fontWeight: 700, border: '2px solid #fff',
                                        }}>✓</span>
                                    )}
                                </div>

                                {/* Bottom: name + cost */}
                                <div style={{
                                    padding: '6px 8px',
                                    background: item.available ? 'rgba(0,0,0,0.06)' : 'rgba(0,0,0,0.3)',
                                }}>
                                    <div style={{
                                        fontFamily: 'Fredoka, sans-serif', fontSize: '13px', fontWeight: 700,
                                        color: item.available ? '#3a2810' : '#aaa', textAlign: 'center',
                                    }}>
                                        {item.name}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                                        {item.cost.map((c, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                <img src={c.img} alt={c.res} style={{ width: '12px', height: '12px' }} />
                                                <span style={{
                                                    fontSize: '11px', fontFamily: 'Fredoka, sans-serif', fontWeight: 700,
                                                    color: item.available ? '#5a4a30' : '#888',
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

function DialogBox({ text, action, onTap, isLast }: { text: string; action?: string; onTap: () => void; isLast: boolean }) {
    const [displayedText, setDisplayedText] = useState('');
    const [animDone, setAnimDone] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const charRef = useRef(0);
    const textRef = useRef(text);

    // Full text includes action
    const fullText = action ? text + '\n(' + action + ')' : text;
    const fullRef = useRef(fullText);

    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        fullRef.current = action ? text + '\n(' + action + ')' : text;
        charRef.current = 0;
        setDisplayedText('');
        setAnimDone(false);

        function tick() {
            charRef.current++;
            const current = fullRef.current;
            if (charRef.current <= current.length) {
                setDisplayedText(current.substring(0, charRef.current));
                timerRef.current = setTimeout(tick, 40);
            } else {
                setAnimDone(true);
            }
        }
        timerRef.current = setTimeout(tick, 40);

        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [text, action]);

    const handleTap = () => {
        if (!animDone) {
            if (timerRef.current) clearTimeout(timerRef.current);
            setDisplayedText(fullRef.current);
            setAnimDone(true);
        } else {
            onTap();
        }
    };

    return (
        <div
            className="pointer-events-auto mx-3 mb-2"
            onClick={handleTap}
            style={{ cursor: 'pointer' }}
        >
            <div
                style={{
                    background: 'linear-gradient(180deg, #2a3540 0%, #1a252e 100%)',
                    borderRadius: '14px',
                    border: '2px solid #3a5060',
                    padding: '14px 16px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                    height: '145px',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                }}
            >
                {/* Top row: icon + name */}
                <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
                    <div
                        className="shrink-0 flex items-center justify-center"
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(180deg, #607080 0%, #404850 100%)',
                            border: '2px solid #506070',
                            fontSize: '16px',
                        }}
                    >
                        🤖
                    </div>
                    <span style={{
                        fontFamily: 'Fredoka, sans-serif',
                        fontSize: '14px',
                        color: '#8ab4d8',
                        fontWeight: 700,
                    }}>
                        콜드유
                    </span>
                </div>

                {/* Text area - fixed height */}
                <div style={{
                    flex: 1,
                    fontFamily: 'system-ui, sans-serif',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                }}>
                    {action && displayedText.includes('\n(') ? (
                        <>
                            <span style={{ color: '#e8dcc8' }}>{displayedText.split('\n(')[0]}</span>
                            <span style={{ color: '#fbbf24', fontSize: '12px' }}>{'\n(' + displayedText.split('\n(').slice(1).join('\n(')}</span>
                        </>
                    ) : (
                        <span style={{ color: '#e8dcc8' }}>{displayedText}</span>
                    )}
                </div>

                {/* Tap indicator */}
                {animDone && !action && (
                    <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '14px',
                        fontSize: '11px',
                        color: '#8a7a60',
                        fontFamily: 'Fredoka, sans-serif',
                    }}>
                        ▼
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
