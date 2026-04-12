import { useState, useEffect } from 'react';
import { useGameStore, boxStageFromAttachedCount } from '../store/useGameStore';
import { PARTS } from '../data/parts';
import { HARVESTABLE_BUILDINGS } from '../data/buildings';
import { PRODUCTION } from '../data/resources';
import { deleteSave } from '../services/db';
import { EventBus } from '../game/EventBus';

/**
 * Floating debug panel. Rendered only when window.location.pathname === '/debug'
 * so it can never leak into the real game. Gives the owner quick levers for
 * playtest: jump day, add resources, fast-forward timers, auto-complete parts,
 * reset the save row.
 *
 * All mutations hit the store directly — the same auto-save pipeline persists
 * them to the `debug` row in Supabase (or the mock when env is unset).
 */
export function DebugPanel() {
    const [open, setOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    // Live snapshot for the read-only summary
    const currentDay = useGameStore(s => s.currentDay);
    const partsCompleted = useGameStore(s => s.partsCompleted);
    const partsAttached = useGameStore(s => s.partsAttached);
    const resources = useGameStore(s => s.resources);
    const packagingStartedAt = useGameStore(s => s.packagingStartedAt);
    const boxHarvested = useGameStore(s => s.boxHarvested);
    const buildings = useGameStore(s => s.buildings);
    const woodshopCrafting = useGameStore(s => s.woodshopCrafting);
    const jewelshopCrafting = useGameStore(s => s.jewelshopCrafting);

    // Tick so countdowns/progress shown in the panel update
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 500);
        return () => clearInterval(t);
    }, []);

    // ==============================
    // Mutations — all go through the store's setState so auto-save fires
    // ==============================
    const setDay = (day: number) => useGameStore.setState({ currentDay: day });

    const addResource = (id: string, amount: number) => {
        const state = useGameStore.getState();
        const cur = state.resources[id];
        useGameStore.setState({
            resources: {
                ...state.resources,
                [id]: { amount: (cur?.amount ?? 0) + amount, unlocked: true },
            },
        });
    };

    const unlockAllResources = () => {
        const state = useGameStore.getState();
        const next: typeof state.resources = { ...state.resources };
        for (const id of Object.keys(next)) {
            next[id] = { ...next[id], unlocked: true };
        }
        useGameStore.setState({ resources: next });
    };

    const fillAllResources = (amount: number) => {
        const state = useGameStore.getState();
        const next: typeof state.resources = { ...state.resources };
        for (const id of Object.keys(next)) {
            next[id] = { amount, unlocked: true };
        }
        useGameStore.setState({ resources: next });
    };

    // Fast-forward every harvestable building so that 200% of the cycle
    // has elapsed (capped harvest is ready right now).
    const readyAllHarvests = () => {
        const state = useGameStore.getState();
        const now = Date.now();
        const next: Record<string, { lastHarvestAt: number }> = { ...state.harvestStates };
        for (const [bid, resId] of Object.entries(HARVESTABLE_BUILDINGS)) {
            const prod = PRODUCTION[resId as keyof typeof PRODUCTION];
            if (!prod) continue;
            next[bid] = { lastHarvestAt: now - prod.cycle * 60_000 * 2 };
        }
        useGameStore.setState({ harvestStates: next });
    };

    // Mark every defined building as built. Keeps harvest states sensible.
    const buildAll = () => {
        const state = useGameStore.getState();
        const positions: Record<string, { row: number; col: number }> = {
            box: { row: 8, col: 8 },
            wood_farm: { row: 3, col: 4 },
            woodshop: { row: 5, col: 9 },
            flower_farm: { row: 5, col: 7 },
            quarry: { row: 7, col: 11 },
            mine: { row: 12, col: 5 },
            jewelshop: { row: 7, col: 3 },
            gem_cave: { row: 12, col: 12 },
        };
        const nextBuildings: typeof state.buildings = { ...state.buildings };
        for (const [id, pos] of Object.entries(positions)) {
            nextBuildings[id] = { built: true, position: pos, constructionStartedAt: null };
        }
        useGameStore.setState({ buildings: nextBuildings });
    };

    // Reduce current crafting slot's startedAt so it's ready to collect now.
    const readyCrafts = () => {
        const state = useGameStore.getState();
        const now = Date.now();
        const longEnough = 100 * 60 * 1000; // 100 minutes — longer than any craftTime
        const patch: Partial<typeof state> = {};
        if (state.woodshopCrafting.partId != null) {
            patch.woodshopCrafting = { ...state.woodshopCrafting, startedAt: now - longEnough };
        }
        if (state.jewelshopCrafting.partId != null) {
            patch.jewelshopCrafting = { ...state.jewelshopCrafting, startedAt: now - longEnough };
        }
        useGameStore.setState(patch);
    };

    // Put every part into partsCompleted. Leaves attachment choice to the player.
    const completeAllParts = () => {
        useGameStore.setState({ partsCompleted: PARTS.map(p => p.id) });
    };

    // Attach every part. Triggers stage 7 + packaging countdown.
    const attachAllParts = () => {
        const ids = PARTS.map(p => p.id);
        useGameStore.setState(state => ({
            partsAttached: ids,
            partsCompleted: state.partsCompleted.filter(id => !ids.includes(id)),
            boxStage: boxStageFromAttachedCount(ids.length),
            packagingStartedAt: state.packagingStartedAt ?? Date.now(),
        }));
    };

    // Skip the packaging countdown so the "open gift" button lights up now.
    const finishPackaging = () => {
        useGameStore.setState({ packagingStartedAt: Date.now() - 95 * 60_000 });
    };

    // Clear dialog progress so the tutorial chains re-fire.
    const resetDialogs = () => {
        useGameStore.setState({ shownDialogs: [], showDialog: false, dialogSceneId: null, dialogLineIndex: 0 });
    };

    // Merchant truck: give leather + mark purchased (or reset)
    const giveLeather = () => {
        const state = useGameStore.getState();
        useGameStore.setState({
            resources: { ...state.resources, leather: { amount: 1, unlocked: true } },
            merchantTruck: { purchased: true, purchasedAt: Date.now() },
        });
    };
    const resetMerchant = () => {
        const state = useGameStore.getState();
        useGameStore.setState({
            resources: { ...state.resources, leather: { amount: 0, unlocked: false } },
            merchantTruck: { purchased: false, purchasedAt: null },
        });
    };

    // Secret docs: force spawn ON THE MAP regardless of time
    const spawnSecretDoc = (docId: string) => {
        EventBus.emit('debug-spawn-secret-doc', docId);
    };

    const resetSaveAndReload = async () => {
        // Wipe the debug row and start clean. Also tell the scene to
        // remove any spawned secret docs / merchant truck before reload.
        EventBus.emit('debug-clear-map');
        try { await deleteSave('debug'); } catch { /* ignore */ }
        window.location.reload();
    };

    // ==============================
    // UI
    // ==============================
    if (!open) {
        return (
            <button
                onClick={() => setOpen(true)}
                style={{
                    position: 'fixed', top: '44px', right: '6px',
                    width: '32px', height: '32px',
                    borderRadius: '6px',
                    background: '#dc2626',
                    border: '2px solid #fca5a5',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    zIndex: 9999,
                    fontFamily: 'monospace',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                }}
                title="Debug panel"
            >
                D
            </button>
        );
    }

    const packagingRemaining = packagingStartedAt != null
        ? Math.max(0, (packagingStartedAt + 90 * 60_000) - Date.now())
        : null;

    return (
        <div style={{
            position: 'fixed',
            top: '44px',
            right: '4px',
            width: '252px',
            maxHeight: 'calc(100dvh - 88px)',
            overflowY: 'auto',
            background: 'rgba(10,10,15,0.96)',
            border: '2px solid #dc2626',
            borderRadius: '10px',
            padding: '10px',
            fontFamily: 'monospace',
            fontSize: '10px',
            color: '#e5e7eb',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
        }}>
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #374151', paddingBottom: '6px', marginBottom: '8px',
            }}>
                <span style={{ color: '#f87171', fontWeight: 700 }}>DEBUG /debug</span>
                <div>
                    <button onClick={() => setCollapsed(c => !c)} style={btnSmallMuted}>
                        {collapsed ? '+' : '-'}
                    </button>
                    <button onClick={() => setOpen(false)} style={btnSmallMuted}>×</button>
                </div>
            </div>

            {/* Live snapshot */}
            <div style={{ marginBottom: '8px', lineHeight: 1.5 }}>
                <div>day <b style={{ color: '#fbbf24' }}>{currentDay}</b> · stage <b>{boxStageFromAttachedCount(partsAttached.length)}</b></div>
                <div>
                    parts <b>{partsAttached.length}</b>/{PARTS.length}
                    {' '}| completed <b>{partsCompleted.length}</b>
                </div>
                <div>
                    W{resources.wood?.amount ?? 0}{' '}
                    F{resources.flower?.amount ?? 0}{' '}
                    S{resources.stone?.amount ?? 0}{' '}
                    M{resources.metal?.amount ?? 0}{' '}
                    G{resources.gem?.amount ?? 0}
                </div>
                <div>
                    built:{' '}
                    {Object.entries(buildings)
                        .filter(([, b]) => b.built)
                        .map(([id]) => id.replace('_farm', '').replace('_cave', ''))
                        .join(',')}
                </div>
                {woodshopCrafting.partId != null && <div>ws crafting #{woodshopCrafting.partId}</div>}
                {jewelshopCrafting.partId != null && <div>js crafting #{jewelshopCrafting.partId}</div>}
                {packagingRemaining != null && (
                    <div>
                        packaging {packagingRemaining > 0
                            ? `${Math.ceil(packagingRemaining / 1000)}s`
                            : 'READY'}
                        {boxHarvested && ' ✓harvested'}
                    </div>
                )}
            </div>

            {collapsed ? null : (
                <>
                    {/* Day */}
                    <Label>Day</Label>
                    <div style={row}>
                        {[1, 2, 3, 4, 5].map(d => (
                            <button key={d} style={btnSmall(currentDay === d)} onClick={() => setDay(d)}>
                                {d}
                            </button>
                        ))}
                    </div>

                    {/* Resources */}
                    <Label>Resources (+1000)</Label>
                    <div style={row}>
                        <button style={btn} onClick={() => addResource('wood', 1000)}>W</button>
                        <button style={btn} onClick={() => addResource('flower', 1000)}>F</button>
                        <button style={btn} onClick={() => addResource('stone', 1000)}>S</button>
                        <button style={btn} onClick={() => addResource('metal', 1000)}>M</button>
                        <button style={btn} onClick={() => addResource('gem', 1000)}>G</button>
                    </div>
                    <div style={row}>
                        <button style={btnWide} onClick={() => fillAllResources(9999)}>fill 9999</button>
                        <button style={btnWide} onClick={unlockAllResources}>unlock all</button>
                    </div>

                    {/* Timers */}
                    <Label>Fast-forward</Label>
                    <button style={btnWide} onClick={readyAllHarvests}>ready all harvests (200%)</button>
                    <button style={btnWide} onClick={readyCrafts}>ready active crafts</button>
                    <button style={btnWide} onClick={finishPackaging}>skip packaging timer</button>

                    {/* Buildings */}
                    <Label>Buildings</Label>
                    <button style={btnWide} onClick={buildAll}>build all</button>

                    {/* Parts */}
                    <Label>Parts</Label>
                    <button style={btnWide} onClick={completeAllParts}>complete all (to tray)</button>
                    <button style={btnWide} onClick={attachAllParts}>attach all → stage 7 + packaging</button>

                    {/* Merchant */}
                    <Label>Merchant (Day 4)</Label>
                    <div style={row}>
                        <button style={btn} onClick={giveLeather}>give leather</button>
                        <button style={btn} onClick={resetMerchant}>reset merchant</button>
                    </div>

                    {/* Secret Docs */}
                    <Label>Secret Docs</Label>
                    <div style={row}>
                        <button style={btn} onClick={() => spawnSecretDoc('day3')}>D3 가방</button>
                        <button style={btn} onClick={() => spawnSecretDoc('day4')}>D4 게임패드</button>
                    </div>

                    {/* Dialogs */}
                    <Label>Dialogs</Label>
                    <button style={btnWide} onClick={resetDialogs}>clear shownDialogs</button>

                    {/* Save */}
                    <Label>Save</Label>
                    <button style={{ ...btnWide, background: '#7f1d1d' }} onClick={resetSaveAndReload}>
                        wipe debug save + reload
                    </button>
                </>
            )}
        </div>
    );
}

// Styles
const btn: React.CSSProperties = {
    flex: 1,
    padding: '5px',
    background: '#1f2937',
    color: '#e5e7eb',
    border: '1px solid #374151',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'monospace',
};
const btnSmall = (active: boolean): React.CSSProperties => ({
    ...btn,
    background: active ? '#2563eb' : '#1f2937',
    borderColor: active ? '#60a5fa' : '#374151',
});
const btnSmallMuted: React.CSSProperties = {
    background: 'transparent',
    color: '#9ca3af',
    border: 'none',
    fontSize: '13px',
    padding: '2px 6px',
    cursor: 'pointer',
    fontFamily: 'monospace',
};
const btnWide: React.CSSProperties = {
    ...btn,
    flex: 'none',
    width: '100%',
    marginBottom: '4px',
};
const row: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    marginBottom: '6px',
};
function Label({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            fontSize: '9px', color: '#9ca3af', marginTop: '6px', marginBottom: '3px',
            textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
            {children}
        </div>
    );
}
