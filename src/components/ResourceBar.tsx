import { useState, useEffect, useCallback } from 'react';

export const RESOURCE_DEFS = [
    { id: 'wood', img: 'assets/generated/resources/wood.png' },
    { id: 'flower', img: 'assets/generated/resources/flower.png' },
    { id: 'stone', img: 'assets/generated/resources/stone.png' },
    { id: 'metal', img: 'assets/generated/resources/metal.png' },
    { id: 'gem', img: 'assets/generated/resources/gem.png' },
];

export interface ResourceState {
    [key: string]: { amount: number; unlocked: boolean };
}

export const INITIAL_RESOURCES: ResourceState = {
    wood: { amount: 1200, unlocked: true },
    flower: { amount: 400, unlocked: true },
    stone: { amount: 600, unlocked: true },
    metal: { amount: 0, unlocked: false },
    gem: { amount: 0, unlocked: false },
};

interface DeltaInfo {
    id: string;
    delta: number;
    key: number; // unique key for re-triggering animation
}

export function useResources() {
    const [resources, setResources] = useState<ResourceState>(INITIAL_RESOURCES);
    const [resDelta, setResDelta] = useState<DeltaInfo | null>(null);

    const addResource = useCallback((id: string, amount: number) => {
        setResources(prev => {
            const cur = prev[id];
            return {
                ...prev,
                [id]: {
                    amount: Math.max(0, cur.amount + amount),
                    unlocked: cur.unlocked || amount > 0,
                },
            };
        });
        setResDelta({ id, delta: amount, key: Date.now() });
        setTimeout(() => setResDelta(null), 1200);
    }, []);

    return { resources, setResources, resDelta, addResource };
}

export function ResourceBar({ resources, resDelta }: { resources: ResourceState; resDelta: DeltaInfo | null }) {
    return (
        <div className="flex gap-1">
            {RESOURCE_DEFS.map((r) => {
                const res = resources[r.id];
                const showDelta = resDelta && resDelta.id === r.id;
                return (
                    <div
                        key={r.id}
                        className="flex-1 flex items-center justify-center gap-1 py-2"
                        style={{
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
                            {res.unlocked ? res.amount.toLocaleString() : '🔒'}
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
