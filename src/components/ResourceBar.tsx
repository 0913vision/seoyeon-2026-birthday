import { useGameStore } from '../store/useGameStore';
import { RESOURCE_DEFS } from '../data/resources';
export { RESOURCE_DEFS } from '../data/resources';

// Legacy hook – used by ResourceTest.tsx
export interface ResourceState {
    [key: string]: { amount: number; unlocked: boolean };
}

interface DeltaInfo {
    id: string;
    delta: number;
    key: number;
}

export function useResources() {
    const resources = useGameStore(s => s.resources);
    const resDelta = useGameStore(s => s.resDelta);
    const storeAdd = useGameStore(s => s.addResource);
    return {
        resources,
        setResources: () => {},
        resDelta,
        addResource: storeAdd,
    };
}

export function ResourceBar(props?: { resources?: any; resDelta?: any }) {
    // If props are passed (legacy), use them; otherwise read from store
    const storeResources = useGameStore(s => s.resources);
    const storeResDelta = useGameStore(s => s.resDelta);
    const resources = props?.resources ?? storeResources;
    const resDelta = props?.resDelta ?? storeResDelta;

    return (
        <div className="flex gap-1">
            {RESOURCE_DEFS.filter(r => r.id !== 'leather').map((r) => {
                const res = resources[r.id];
                const showDelta = resDelta && resDelta.id === r.id;
                return (
                    <div
                        key={r.id}
                        className="flex-1 flex items-center justify-center gap-1"
                        style={{
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            background: res.unlocked
                                ? 'linear-gradient(180deg, #4a3520 0%, #3a2815 100%)'
                                : 'rgba(30,20,10,0.5)',
                            borderRadius: '8px',
                            border: res.unlocked ? '2px solid #5a4530' : '2px solid rgba(50,40,30,0.5)',
                            position: 'relative',
                            overflow: 'visible',
                            minWidth: 0,
                            animation: showDelta ? 'slotBounce 0.3s ease-out' : 'none',
                        }}
                    >
                        <img src={r.img} alt={r.id} className="w-5 h-5 object-contain" />
                        <span className={`${res.unlocked ? 'text-amber-100' : 'text-white/25'}`}
                              style={{
                                  fontFamily: "Fredoka, sans-serif",
                                  fontSize: '15px',
                              }}>
                            {res.unlocked ? res.amount.toLocaleString() : '\uD83D\uDD12'}
                        </span>
                        {showDelta && (
                            <span
                                key={resDelta.key}
                                style={{
                                    position: 'absolute',
                                    bottom: '-14px',
                                    left: '50%',
                                    transform: 'translateX(-50%)',
                                    fontFamily: 'Fredoka, sans-serif',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: resDelta.delta > 0 ? '#4ade80' : '#f87171',
                                    animation: 'floatDown 1s ease-out forwards',
                                    pointerEvents: 'none',
                                    whiteSpace: 'nowrap',
                                }}>
                                {resDelta.delta > 0 ? '+' : ''}{resDelta.delta.toLocaleString()}
                            </span>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
