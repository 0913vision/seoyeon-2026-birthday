import { useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';

const RESOURCES = [
    { id: 'wood', img: 'assets/generated/resources/wood.png', value: '1,200', unlocked: true },
    { id: 'flower', img: 'assets/generated/resources/flower.png', value: '400', unlocked: true },
    { id: 'stone', img: 'assets/generated/resources/stone.png', value: '600', unlocked: true },
    { id: 'metal', img: 'assets/generated/resources/metal.png', value: '--', unlocked: false },
    { id: 'gem', img: 'assets/generated/resources/gem.png', value: '--', unlocked: false },
];

const SAMPLE_DIALOGUE = [
    '왈왈! 누나 왔다!',
    '누나, 나 초코야. 오늘 누나한테 할 말 있어!',
    '8일 뒤에 누나 생일이잖아. 24살 되는 날!',
    '나 누나한테 특별한 선물 주고 싶어',
    '근데 나 혼자서는 못 만들겠어...',
    '그래서 누나, 나랑 같이 만들어줄래? 왈!',
];

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [dialogIndex, setDialogIndex] = useState(0);

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

                {/* Dialog */}
                {showDialog && (
                    <DialogBox
                        text={SAMPLE_DIALOGUE[dialogIndex]}
                        onTap={handleDialogTap}
                        isLast={dialogIndex === SAMPLE_DIALOGUE.length - 1}
                    />
                )}

                <BottomBar />
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

function BottomBar() {
    return (
        <div
            className="pointer-events-auto pb-2 px-4"
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
            <div className="flex justify-center gap-5">
                <ActionButton icon="🏗️" label="BUILD" badge="NEW" badgeColor="#ef4444" bgColor="linear-gradient(180deg, #22c55e 0%, #16a34a 100%)" />
                <ActionButton icon="🔨" label="CRAFT" badge="1" badgeColor="#f59e0b" bgColor="linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)" />
                <ActionButton icon="🎁" label="BOX" bgColor="linear-gradient(180deg, #f59e0b 0%, #d97706 100%)" />
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
}: {
    icon: string;
    label: string;
    badge?: string;
    badgeColor?: string;
    bgColor?: string;
}) {
    return (
        <div className="relative">
            <button
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

function DialogBox({ text, onTap, isLast }: { text: string; onTap: () => void; isLast: boolean }) {
    return (
        <div
            className="pointer-events-auto mx-3 mb-2"
            onClick={onTap}
            style={{ cursor: 'pointer' }}
        >
            <div className="flex items-end gap-2">
                {/* Choco icon placeholder */}
                <div
                    className="shrink-0 flex items-center justify-center"
                    style={{
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'linear-gradient(180deg, #8B6914 0%, #6B4F10 100%)',
                        border: '3px solid #4a3520',
                        fontSize: '24px',
                    }}
                >
                    🐶
                </div>

                {/* Speech bubble */}
                <div className="flex-1 relative"
                     style={{
                         background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(240,235,225,0.95) 100%)',
                         borderRadius: '16px 16px 16px 4px',
                         border: '2px solid #c0a878',
                         padding: '12px 16px',
                         boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                     }}>
                    {/* Name */}
                    <div style={{
                        fontFamily: 'Fredoka, sans-serif',
                        fontSize: '12px',
                        color: '#8B6914',
                        fontWeight: 700,
                        marginBottom: '4px',
                    }}>
                        초코
                    </div>
                    {/* Text */}
                    <div style={{
                        fontFamily: 'system-ui, sans-serif',
                        fontSize: '14px',
                        color: '#2a2015',
                        lineHeight: '1.5',
                    }}>
                        {text}
                    </div>
                    {/* Tap indicator */}
                    <div style={{
                        position: 'absolute',
                        bottom: '6px',
                        right: '10px',
                        fontSize: '10px',
                        color: '#a09080',
                    }}>
                        {isLast ? '[ 확인 ]' : '▼ 탭'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
