import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useGameStore, boxStageFromAttachedCount, boxStageForDisplay } from '../store/useGameStore';
import { BUILDINGS, HARVESTABLE_BUILDINGS } from '../data/buildings';
import { TERRAIN } from '../data/terrain';
import { PRODUCTION, RESOURCE_DEFS } from '../data/resources';
import { PARTS, PARTS_PER_DAY } from '../data/parts';
import { computeHarvest, formatRemaining } from '../game/harvestCalc';

const CLOSE_MS = 180;

export function BuildingModal() {
    const activeModal = useGameStore(s => s.activeModal);
    const closeBuildingModal = useGameStore(s => s.closeBuildingModal);
    const [renderedModal, setRenderedModal] = useState(activeModal);
    const [phase, setPhase] = useState<'closed' | 'entering' | 'open' | 'closing'>('closed');

    useEffect(() => {
        if (activeModal) {
            // Opening: first render in 'entering' state, then switch to 'open'
            setRenderedModal(activeModal);
            setPhase('entering');
            let r1 = 0, r2 = 0;
            r1 = requestAnimationFrame(() => {
                r2 = requestAnimationFrame(() => setPhase('open'));
            });
            return () => {
                cancelAnimationFrame(r1);
                cancelAnimationFrame(r2);
            };
        } else if (renderedModal) {
            // Closing
            setPhase('closing');
            const t = setTimeout(() => {
                setRenderedModal(null);
                setPhase('closed');
            }, CLOSE_MS);
            return () => clearTimeout(t);
        }
    }, [activeModal]);

    if (!renderedModal) return null;

    const visible = phase === 'open';
    const backdropOpacity = visible ? 1 : 0;
    const cardScale = phase === 'entering' ? 0.85 : visible ? 1 : 0.9;
    const cardOpacity = visible ? 1 : 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="pointer-events-auto"
                onClick={closeBuildingModal}
                style={{
                    position: 'absolute', inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    zIndex: 100,
                    opacity: backdropOpacity,
                    transition: `opacity ${CLOSE_MS}ms ease-out`,
                }}
            />

            {/* Modal Card */}
            <div
                className="pointer-events-auto"
                style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: `translate(-50%, -50%) scale(${cardScale})`,
                    width: 'min(86vw, 360px)',
                    background: 'linear-gradient(180deg, #5a3a1e 0%, #3a220e 100%)',
                    border: '3px solid #7a5a30',
                    borderRadius: '18px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,220,150,0.15)',
                    padding: '0',
                    fontFamily: 'Fredoka, sans-serif',
                    color: '#fff',
                    zIndex: 101,
                    overflow: 'hidden',
                    opacity: cardOpacity,
                    transition: `transform ${CLOSE_MS}ms cubic-bezier(0.34, 1.3, 0.64, 1), opacity ${CLOSE_MS}ms ease-out`,
                }}
            >
                {/* Title bar */}
                <ModalContent category={renderedModal.category} id={renderedModal.id} />

                {/* Close button */}
                <button
                    onClick={closeBuildingModal}
                    style={{
                        position: 'absolute', top: '10px', right: '10px',
                        width: '32px', height: '32px',
                        borderRadius: '16px',
                        background: 'rgba(239,68,68,0.9)',
                        border: '2px solid rgba(255,255,255,0.5)',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                    }}
                >
                    {'\u2715'}
                </button>
            </div>
        </>
    );
}

function ModalContent({ category, id }: { category: string; id: string }) {
    if (category === 'terrain') return <TerrainHelp id={id} />;
    if (category === 'harvest') return <HarvestInfo id={id} />;
    if (category === 'construction') return <ConstructionInfo id={id} />;
    if (category === 'workshop') return <WorkshopPanel id={id} />;
    if (category === 'giftbox') return <GiftBoxPanel />;
    if (category === 'merchant') return <MerchantPanel />;
    return null;
}

// Common card body wrapper
function CardBody({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <div style={{
                background: 'linear-gradient(180deg, #c8a060 0%, #a07840 100%)',
                padding: '12px 48px 12px 18px',
                borderBottom: '3px solid #2a1a08',
                fontSize: '17px',
                fontWeight: 700,
                color: '#3a220e',
                textShadow: '0 1px 0 rgba(255,220,150,0.4)',
            }}>
                {title}
            </div>
            <div style={{
                padding: '16px 18px 18px',
                background: 'linear-gradient(180deg, #4a2e16 0%, #3a220e 100%)',
                fontSize: '15px',
                lineHeight: 1.6,
                color: '#f5e6c8',
            }}>
                {children}
            </div>
        </div>
    );
}

function GenericInfo({ title, body }: { title: string; body: string }) {
    return <CardBody title={title}>{body}</CardBody>;
}

// Terrain → building mapping. Each entry has a descriptive "buildHint"
// that flavors the terrain and, when the paired building has been built,
// switches to a shorter "doneHint" that points the player at the building.
const TERRAIN_TO_BUILDING: Record<string, { buildingId: string; buildHint: string; doneHint: string }> = {
    flower_patch: {
        buildingId: 'flower_farm',
        buildHint: '향기로운 꽃이 가득합니다. 근처에 꽃밭을 지어서 꽃을 수확할 수 있습니다.',
        doneHint: '향기로운 꽃이 가득합니다. 근처의 꽃밭을 터치하여 꽃을 수확해 주세요.',
    },
    rock_outcrop: {
        buildingId: 'quarry',
        buildHint: '단단한 바위가 드러나 있습니다. 근처에 채석장을 지어서 돌을 수확할 수 있습니다.',
        doneHint: '단단한 바위가 드러나 있습니다. 근처의 채석장을 터치하여 돌을 수확해 주세요.',
    },
    cave_entrance: {
        buildingId: 'mine',
        buildHint: '깊고 어두운 동굴이 뚫려 있습니다. 근처에 광산을 지어서 금속을 수확할 수 있습니다.',
        doneHint: '깊고 어두운 동굴이 뚫려 있습니다. 근처의 광산을 터치하여 금속을 수확해 주세요.',
    },
    crystal_cluster: {
        buildingId: 'gem_cave',
        buildHint: '신비로운 수정이 반짝이며 무리 지어 있습니다. 근처에 수정동굴을 지어서 보석을 수확할 수 있습니다.',
        doneHint: '신비로운 수정이 반짝이며 무리 지어 있습니다. 근처의 수정동굴을 터치하여 보석을 수확해 주세요.',
    },
};

// === Merchant Panel ===
function MerchantPanel() {
    const resources = useGameStore(s => s.resources);
    const merchantTruck = useGameStore(s => s.merchantTruck);
    const purchaseFromMerchant = useGameStore(s => s.purchaseFromMerchant);
    const closeBuildingModal = useGameStore(s => s.closeBuildingModal);

    const woodCost = 600;
    const canAfford = (resources.wood?.amount ?? 0) >= woodCost;
    const alreadyBought = merchantTruck.purchased;

    const handleBuy = () => {
        if (alreadyBought || !canAfford) return;
        purchaseFromMerchant();
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30); } catch { /* ignore */ }
    };

    return (
        <CardBody title={'가죽 상인'}>
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <img
                    src="assets/generated/terrain/merchant_truck.png"
                    alt="이동 상인"
                    style={{ width: '120px', height: '120px', objectFit: 'contain' }}
                />
            </div>

            {alreadyBought ? (
                <div style={{
                    padding: '14px',
                    background: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
                    border: '2px solid #86efac',
                    borderRadius: '10px',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
                        거래 완료
                    </div>
                    <div style={{ fontSize: '12px', color: '#dcfce7', marginTop: '4px' }}>
                        가죽 원단을 받았습니다.
                    </div>
                </div>
            ) : (
                <>
                    <div style={{
                        fontSize: '13px',
                        color: '#c8a888',
                        lineHeight: 1.6,
                        marginBottom: '12px',
                    }}>
                        가죽 원단 팝니다! 나무 600개 정도면 하나 드릴 수 있어요~
                    </div>

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        padding: '12px',
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: '10px',
                        marginBottom: '12px',
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <img src="assets/generated/resources/wood.png" alt="나무"
                                 style={{ width: '36px', height: '36px' }} />
                            <div style={{
                                fontSize: '14px', fontWeight: 700,
                                color: canAfford ? '#fbbf24' : '#ef4444',
                            }}>
                                {woodCost}
                            </div>
                        </div>
                        <div style={{ fontSize: '20px', color: '#c8a888' }}>{'\u2192'}</div>
                        <div style={{ textAlign: 'center' }}>
                            <img src="assets/generated/resources/leather.png" alt="가죽 원단"
                                 style={{ width: '36px', height: '36px' }} />
                            <div style={{
                                fontSize: '14px', fontWeight: 700, color: '#fbbf24',
                            }}>
                                1
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleBuy}
                        disabled={!canAfford}
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '12px',
                            border: 'none',
                            borderRadius: '10px',
                            background: canAfford
                                ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)'
                                : 'linear-gradient(180deg, #4a3520 0%, #3a2815 100%)',
                            color: canAfford ? '#3a220e' : '#8a7358',
                            fontSize: '15px',
                            fontWeight: 700,
                            fontFamily: 'Fredoka, sans-serif',
                            cursor: canAfford ? 'pointer' : 'not-allowed',
                            boxShadow: canAfford ? '0 3px 0 #7a4010' : 'none',
                            borderTop: canAfford ? '2px solid rgba(255,255,255,0.4)' : 'none',
                        }}
                    >
                        {canAfford ? '교환하기' : '나무가 부족합니다'}
                    </button>
                </>
            )}
        </CardBody>
    );
}

// === Terrain Help ===
function TerrainHelp({ id }: { id: string }) {
    const terrain = TERRAIN.find(t => t.id === id);
    const name = terrain?.name ?? id;
    const buildings = useGameStore(s => s.buildings);
    const entry = TERRAIN_TO_BUILDING[id];
    const done = !!(entry && buildings[entry.buildingId]?.built);

    return (
        <CardBody title={name}>
            <div>{done ? entry.doneHint : (entry?.buildHint ?? '특수 지형입니다.')}</div>
        </CardBody>
    );
}

const HOLD_MS = 600;

// === Harvest Info ===
function HarvestInfo({ id }: { id: string }) {
    const def = BUILDINGS.find(b => b.id === id);
    const name = def?.name ?? id;
    const resId = HARVESTABLE_BUILDINGS[id];
    const prod = resId ? PRODUCTION[resId as keyof typeof PRODUCTION] : undefined;
    const resDef = RESOURCE_DEFS.find(r => r.id === resId);

    const harvestStates = useGameStore(s => s.harvestStates);
    const harvestBuilding = useGameStore(s => s.harvestBuilding);
    const closeBuildingModal = useGameStore(s => s.closeBuildingModal);

    // Tick every 500ms so remaining time / amount stay live
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 500);
        return () => clearInterval(t);
    }, []);

    // Long-press state
    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const holdStartAt = useRef(0);
    const clearHold = () => {
        if (holdTimer.current) {
            clearInterval(holdTimer.current);
            holdTimer.current = null;
        }
        setHoldProgress(0);
    };
    useEffect(() => () => clearHold(), []);

    // "Just harvested" feedback (shows success message for ~1.5s)
    const [justHarvested, setJustHarvested] = useState<{ amount: number } | null>(null);
    const justHarvestedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => {
        if (justHarvestedTimer.current) clearTimeout(justHarvestedTimer.current);
    }, []);

    if (!prod || !resId || !resDef) {
        return <CardBody title={name}><div>정보를 불러올 수 없습니다.</div></CardBody>;
    }

    const hs = harvestStates[id];
    const info = hs
        ? computeHarvest(hs.lastHarvestAt, Date.now(), prod.cycle, prod.perCycle)
        : { amount: 0, percent: 0, msUntil100: prod.cycle * 60_000, msUntil200: prod.cycle * 60_000 * 5 };

    const percentClamped = Math.min(2, info.percent);
    const ready = percentClamped >= 1;
    const cap = prod.perCycle * 2;
    const progressPct = (percentClamped / 2) * 100;

    const doHarvest = () => {
        const amount = info.amount;
        harvestBuilding(id);
        setJustHarvested({ amount });
        if (justHarvestedTimer.current) clearTimeout(justHarvestedTimer.current);
        justHarvestedTimer.current = setTimeout(() => {
            setJustHarvested(null);
            closeBuildingModal();
        }, 1600);
    };

    const startHold = () => {
        if (!ready || justHarvested) return;
        clearHold();
        holdStartAt.current = Date.now();
        setHoldProgress(0.01);
        holdTimer.current = setInterval(() => {
            const elapsed = Date.now() - holdStartAt.current;
            const pct = Math.min(1, elapsed / HOLD_MS);
            setHoldProgress(pct);
            if (pct >= 1) {
                clearHold();
                try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30); } catch { /* ignore */ }
                doHarvest();
            }
        }, 16);
    };

    return (
        <CardBody title={name}>
            {/* Resource summary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <img src={resDef.img} alt={resId}
                     style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', color: '#c8a888' }}>저장 중인 {resDef.name}</div>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: '#fbbf24' }}>
                        {info.amount.toLocaleString()}
                        <span style={{ fontSize: '14px', color: '#8a7358', marginLeft: '6px' }}>
                            / {cap.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Progress bar (0 ~ 200%) */}
            <div style={{
                height: '10px', background: '#1a1208', borderRadius: '5px',
                overflow: 'hidden', border: '1px solid #3a2a15', marginBottom: '12px',
            }}>
                <div style={{
                    height: '100%',
                    width: `${progressPct}%`,
                    background: ready
                        ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)'
                        : 'linear-gradient(90deg, #6a9a48 0%, #4a7a2a 100%)',
                    transition: 'width 400ms ease-out',
                }} />
            </div>

            {/* Production info */}
            <div style={{ fontSize: '13px', color: '#c8a888', lineHeight: 1.8 }}>
                <div>
                    기본 생산량: <b style={{ color: '#f0e0b8' }}>{formatCycle(prod.cycle)}마다 +{prod.perCycle}</b>
                </div>
                {percentClamped >= 2 ? (
                    <div>저장 한도에 도달했어요. 수확해야 다시 쌓입니다.</div>
                ) : percentClamped >= 1 ? (
                    <>
                        <div>저장 한도까지: <b style={{ color: '#f0e0b8' }}>{formatRemaining(info.msUntil200)}</b></div>
                        <div style={{ fontSize: '12px', color: '#8a7358' }}>
                            지금은 1/4 속도로 천천히 쌓이는 중이에요.
                        </div>
                    </>
                ) : (
                    <div>수확 준비까지: <b style={{ color: '#f0e0b8' }}>{formatRemaining(info.msUntil100)}</b></div>
                )}
            </div>

            {/* Harvest button (long press) */}
            <button
                onPointerDown={startHold}
                onPointerUp={clearHold}
                onPointerLeave={clearHold}
                onPointerCancel={clearHold}
                disabled={!ready || !!justHarvested}
                style={{
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'block',
                    width: '100%',
                    marginTop: '14px',
                    padding: '14px 16px',
                    border: 'none',
                    borderRadius: '12px',
                    background: justHarvested
                        ? 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)'
                        : ready
                        ? 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)'
                        : 'linear-gradient(180deg, #4a3520 0%, #3a2815 100%)',
                    color: justHarvested ? '#ffffff' : ready ? '#3a220e' : '#8a7358',
                    fontSize: '16px',
                    fontWeight: 700,
                    fontFamily: 'Fredoka, sans-serif',
                    cursor: justHarvested ? 'default' : ready ? 'pointer' : 'not-allowed',
                    boxShadow: justHarvested
                        ? '0 3px 0 #0f5132'
                        : ready
                        ? '0 3px 0 #7a4010'
                        : 'none',
                    borderTop: ready || justHarvested ? '2px solid rgba(255,255,255,0.4)' : 'none',
                    userSelect: 'none',
                    touchAction: 'none',
                    transform: holdProgress > 0 ? 'scale(0.98)' : 'scale(1)',
                    transition: 'transform 80ms ease-out, background 160ms ease-out',
                }}
            >
                {/* Hold progress fill */}
                {holdProgress > 0 && !justHarvested && (
                    <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0,
                        width: `${holdProgress * 100}%`,
                        background: 'rgba(255,255,255,0.35)',
                        pointerEvents: 'none',
                    }} />
                )}
                <span style={{ position: 'relative' }}>
                    {justHarvested
                        ? `✅ 수확 완료! +${justHarvested.amount}`
                        : ready
                        ? (holdProgress > 0
                            ? `수확 중... (+${info.amount})`
                            : `✨ 꾹 눌러서 수확 (+${info.amount})`)
                        : '아직 수확 불가'}
                </span>
            </button>
        </CardBody>
    );
}

function formatCycle(minutes: number): string {
    if (minutes >= 60) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
    }
    return `${minutes}분`;
}

// === Construction Info ===
// Total wall-clock for a construction. Must match CONSTRUCTION_TIME_MS in
// GameScene.ts / useGameStore.ts. Keep in sync until we hoist a shared constant.
const CONSTRUCTION_TIME_MS = 10_000;

function ConstructionInfo({ id }: { id: string }) {
    const def = BUILDINGS.find(b => b.id === id);
    const name = def?.name ?? id;
    const buildings = useGameStore(s => s.buildings);
    const bs = buildings[id];
    const startedAt = bs?.constructionStartedAt ?? null;

    // Live countdown tick
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 500);
        return () => clearInterval(t);
    }, []);

    // If the build finished while the modal was open, close it.
    const closeBuildingModal = useGameStore(s => s.closeBuildingModal);
    useEffect(() => {
        if (bs?.built) closeBuildingModal();
    }, [bs?.built, closeBuildingModal]);

    const elapsed = startedAt && startedAt > 0
        ? Math.min(CONSTRUCTION_TIME_MS, Math.max(0, Date.now() - startedAt))
        : 0;
    const remainingMs = Math.max(0, CONSTRUCTION_TIME_MS - elapsed);
    const pct = Math.min(1, elapsed / CONSTRUCTION_TIME_MS);
    const mins = Math.floor(remainingMs / 60000);
    const secs = Math.floor((remainingMs % 60000) / 1000);
    const clock = `${mins}:${secs.toString().padStart(2, '0')}`;

    return (
        <CardBody title={`${name} \u00b7 \uAC74\uC124 \uC911`}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px',
                background: 'linear-gradient(180deg, #3a2810 0%, #2a1808 100%)',
                border: '2px solid #c8a060',
                borderRadius: '10px',
            }}>
                <img
                    src={`assets/generated/buildings/${id}.png`}
                    alt={name}
                    style={{
                        width: '64px', height: '64px',
                        objectFit: 'contain',
                        opacity: 0.6,
                        filter: 'grayscale(0.4)',
                        flexShrink: 0,
                    }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#c8a888', marginBottom: '4px' }}>남은 시간</div>
                    <div style={{
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#fbbf24',
                        fontFamily: 'monospace',
                        letterSpacing: '0.04em',
                    }}>
                        {clock}
                    </div>
                    {/* Progress bar */}
                    <div style={{
                        height: '8px',
                        background: '#1a1208',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        border: '1px solid #3a2a15',
                        marginTop: '8px',
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${pct * 100}%`,
                            background: 'linear-gradient(90deg, #44cc66 0%, #2a8040 100%)',
                            transition: 'width 400ms ease-out',
                        }} />
                    </div>
                </div>
            </div>

            <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#c8a888',
                lineHeight: 1.6,
                textAlign: 'center',
                fontStyle: 'italic',
            }}>
                건설이 완료될 때까지 기다려 주세요.
            </div>
        </CardBody>
    );
}

// Part image filename map (matches files in public/assets/generated/parts/).
// 14, 15, 23 were renamed when the theme shifted toward the physical gift
// (joystick button, leather piece, plastic component). The old names live
// under public/assets/generated/parts/_archive/ per the no-delete policy.
const PART_FILE_NAMES: Record<number, string> = {
    1: 'base', 2: 'body', 3: 'front', 4: 'back', 5: 'lid', 6: 'flower_a',
    7: 'wreath', 8: 'number2', 9: 'number4', 10: 'pedestal', 11: 'handle',
    12: 'buckle', 13: 'trim', 14: 'button', 15: 'leather',
    16: 'metal_frame', 17: 'flower_crown', 18: 'gem_ribbon', 19: 'carved_plate',
    20: 'crystal_crown', 21: 'main_ribbon', 22: 'happy24_banner', 23: 'plastic',
    24: 'final_knot',
};
function partImageSrc(partId: number): string {
    const n = PART_FILE_NAMES[partId];
    return `assets/generated/parts/part_${String(partId).padStart(2, '0')}_${n}.png`;
}

// === Workshop Panel ===
function WorkshopPanel({ id }: { id: string }) {
    const def = BUILDINGS.find(b => b.id === id);
    const name = def?.name ?? id;
    const workshopId = (id === 'woodshop' || id === 'jewelshop') ? id : null;

    const woodshopCrafting = useGameStore(s => s.woodshopCrafting);
    const jewelshopCrafting = useGameStore(s => s.jewelshopCrafting);
    const resources = useGameStore(s => s.resources);
    const currentDay = useGameStore(s => s.currentDay);
    const partsCompleted = useGameStore(s => s.partsCompleted);
    const partsAttached = useGameStore(s => s.partsAttached);
    const startCrafting = useGameStore(s => s.startCrafting);
    const collectCrafting = useGameStore(s => s.collectCrafting);
    const markWorkshopSeen = useGameStore(s => s.markWorkshopSeen);

    // Snapshot seenNewDay so NEW dots stay stable while the modal is open.
    // The panel commits `seenNewDay[workshopId] = currentDay` on UNMOUNT
    // (close), so newly unlocked parts stop being "new" on the next open.
    const [seenSnapshot] = useState(() =>
        workshopId ? useGameStore.getState().seenNewDay[workshopId] : 0,
    );
    useEffect(() => {
        return () => {
            if (workshopId) markWorkshopSeen(workshopId);
        };
    }, [workshopId, markWorkshopSeen]);

    // Live tick every 500ms for progress bars (no auto-complete)
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 500);
        return () => clearInterval(t);
    }, []);

    if (!workshopId) {
        return <CardBody title={name}><div>작업장 정보를 불러올 수 없습니다.</div></CardBody>;
    }

    const slot = workshopId === 'woodshop' ? woodshopCrafting : jewelshopCrafting;
    const current = slot.partId != null ? PARTS.find(p => p.id === slot.partId) : null;
    const craftMs = current ? current.craftTime * 60 * 1000 : 0;
    const elapsed = slot.startedAt ? Date.now() - slot.startedAt : 0;
    const isReady = current != null && elapsed >= craftMs;

    // All parts in this workshop except the one currently crafting and
    // any already attached to the giftbox. Completed-but-not-attached
    // parts stay in the list so the user can see what they've made.
    // Display order: craftable → locked (???) → completed.
    const allParts = PARTS
        .filter(p =>
            p.workshop === workshopId &&
            !partsAttached.includes(p.id) &&
            slot.partId !== p.id,
        )
        .slice()
        .sort((a, b) => {
            const rank = (p: typeof PARTS[0]) => {
                if (partsCompleted.includes(p.id)) return 2; // completed last
                if (p.day > currentDay) return 1;            // locked middle
                return 0;                                    // craftable first
            };
            const ra = rank(a), rb = rank(b);
            if (ra !== rb) return ra - rb;
            return a.day - b.day || a.id - b.id;
        });

    return (
        <CardBody title={name}>
            {/* Currently crafting (if any) */}
            {current && slot.startedAt != null && (
                <CraftingInProgress
                    part={current}
                    startedAt={slot.startedAt}
                    isReady={isReady}
                    onCollect={() => workshopId && collectCrafting(workshopId)}
                />
            )}

            {/* Parts list — horizontal scroll of compact cards */}
            <div style={{
                marginTop: current ? '12px' : 0,
                fontSize: '12px', color: '#c8a888',
                fontWeight: 700, marginBottom: '6px',
            }}>
                {current ? '다음 파츠' : '파츠 목록'}
            </div>
            {allParts.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#8a7358', fontStyle: 'italic', padding: '8px 0' }}>
                    이 작업장에서 만들 파츠가 더 없어요.
                </div>
            ) : (
                <div style={{
                    display: 'flex',
                    overflowX: 'auto',
                    gap: '8px',
                    padding: '4px 2px 8px',
                    WebkitOverflowScrolling: 'touch',
                }}>
                    {allParts.map(part => {
                        const unlocked = part.day <= currentDay;
                        if (partsCompleted.includes(part.id)) {
                            return <CompletedPartCard key={part.id} part={part} />;
                        }
                        const isNew = unlocked && part.day > seenSnapshot;
                        return unlocked ? (
                            <PartCraftCard
                                key={part.id}
                                part={part}
                                resources={resources}
                                disabled={!!current}
                                isNew={isNew}
                                onStart={() => startCrafting(workshopId, part.id)}
                            />
                        ) : (
                            <LockedPartCard key={part.id} />
                        );
                    })}
                </div>
            )}
        </CardBody>
    );
}

// === Gift Box Panel ===
// Drag-to-attach UI. The current stage sprite sits on a cream pedestal at
// the top; the bottom tray holds parts the player has collected. Dragging a
// tile over the box image and releasing triggers an attach animation and
// commits the part to `partsAttached`.
//
// Pointer-based drag (so mobile touch just works). No DnD library. A single
// attach animation runs at a time — rapid drags are gated via `attaching`.
function GiftBoxPanel() {
    const partsCompleted = useGameStore(s => s.partsCompleted);
    const partsAttached = useGameStore(s => s.partsAttached);
    const attachPart = useGameStore(s => s.attachPart);
    const packagingStartedAt = useGameStore(s => s.packagingStartedAt);
    const boxHarvested = useGameStore(s => s.boxHarvested);
    const harvestBox = useGameStore(s => s.harvestBox);

    // Live tick for packaging countdown
    const [, setPackagingTick] = useState(0);
    useEffect(() => {
        if (packagingStartedAt == null || boxHarvested) return;
        const t = setInterval(() => setPackagingTick(n => n + 1), 1000);
        return () => clearInterval(t);
    }, [packagingStartedAt, boxHarvested]);

    const packagingMs = 90 * 60_000;
    const packagingElapsed = packagingStartedAt != null ? Date.now() - packagingStartedAt : 0;
    const packagingRemaining = Math.max(0, packagingMs - packagingElapsed);
    const isPackaging = packagingStartedAt != null && packagingRemaining > 0 && !boxHarvested;
    const isReadyToOpen = packagingStartedAt != null && packagingRemaining <= 0 && !boxHarvested;

    // Show parts in order (day → id) so sequential rules are visually clear.
    const unattached = PARTS
        .filter(p => partsCompleted.includes(p.id))
        .slice()
        .sort((a, b) => a.day - b.day || a.id - b.id);
    const attachedCount = partsAttached.length;
    const stage = boxStageForDisplay(attachedCount, packagingStartedAt, boxHarvested);
    const boxImgSrc = `assets/generated/giftbox/${STAGE_FILE_NAMES[stage]}`;

    // Ordering constraint — a part is attachable only if every part of an
    // earlier day has already been attached.
    const attachablePartIds = new Set<number>();
    {
        const byDay = new Map<number, number[]>();
        for (const p of PARTS) {
            if (!byDay.has(p.day)) byDay.set(p.day, []);
            byDay.get(p.day)!.push(p.id);
        }
        const days = [...byDay.keys()].sort((a, b) => a - b);
        for (const d of days) {
            const dayPartIds = byDay.get(d)!;
            // Day d is the "current" attach-day if not every earlier day is done.
            const earlierAllDone = days
                .filter(x => x < d)
                .every(x => byDay.get(x)!.every(id => partsAttached.includes(id)));
            if (!earlierAllDone) break;
            for (const id of dayPartIds) attachablePartIds.add(id);
            // If this day is not fully attached, stop here — later days are blocked.
            const dayDone = dayPartIds.every(id => partsAttached.includes(id));
            if (!dayDone) break;
        }
    }
    const isAttachable = (partId: number) => attachablePartIds.has(partId);

    // Refs for DOM hit testing
    const boxRef = useRef<HTMLDivElement>(null);

    // Drag state. commitGate flips to true once we've decided the gesture is
    // a vertical drag (not a horizontal tray scroll). Ghost is only rendered
    // once gated, and pointerCapture is only claimed then as well.
    const [drag, setDrag] = useState<{
        partId: number;
        startX: number; startY: number; // pointerdown pos
        x: number; y: number;           // current pos
        pointerId: number;
        commitGate: boolean;
        bounced: boolean;               // true when releasing outside box — triggers "snap back"
    } | null>(null);
    const [hoveringBox, setHoveringBox] = useState(false);
    const [rejectShake, setRejectShake] = useState(0); // bumped when user drops non-attachable on box

    // Attach animation: while this is non-null, rapid re-drags are blocked
    // and the box sprite/chip run their punch animations.
    const [attaching, setAttaching] = useState<{ partId: number } | null>(null);
    const [chipPulseKey, setChipPulseKey] = useState(0);
    const attachTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => () => { if (attachTimer.current) clearTimeout(attachTimer.current); }, []);

    // Helper: test if a screen point is inside the box drop zone.
    const pointInBox = (x: number, y: number) => {
        const el = boxRef.current;
        if (!el) return false;
        const r = el.getBoundingClientRect();
        return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    };

    const onTilePointerDown = (e: React.PointerEvent, partId: number) => {
        if (attaching) return;
        if (!isAttachable(partId)) return; // blocked by day ordering
        // Do NOT setPointerCapture yet — we want horizontal pan to still
        // scroll the tray natively. Capture only once the gesture commits.
        setDrag({
            partId,
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            pointerId: e.pointerId,
            commitGate: false,
            bounced: false,
        });
    };

    const onTilePointerMove = (e: React.PointerEvent) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;

        if (!drag.commitGate) {
            // Decide whether this is a drag (vertical) or a scroll (horizontal).
            // Threshold: 8px in one axis.
            if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
                // Horizontal gesture → let the browser pan-scroll the tray.
                setDrag(null);
                return;
            }
            if (Math.abs(dy) > 8) {
                // Vertical gesture → commit to drag.
                (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
                setDrag({ ...drag, x: e.clientX, y: e.clientY, commitGate: true });
                setHoveringBox(pointInBox(e.clientX, e.clientY));
                return;
            }
            return;
        }
        setDrag({ ...drag, x: e.clientX, y: e.clientY });
        setHoveringBox(pointInBox(e.clientX, e.clientY));
    };

    const onTilePointerUp = (e: React.PointerEvent) => {
        if (!drag || e.pointerId !== drag.pointerId) return;
        const wasHovering = drag.commitGate && pointInBox(e.clientX, e.clientY);
        const partId = drag.partId;
        setDrag(null);
        setHoveringBox(false);

        if (!wasHovering) return; // released outside box (or no real drag) → no-op
        if (!isAttachable(partId)) {
            // Shouldn't reach here because we block pointerdown, but guard anyway.
            setRejectShake(k => k + 1);
            return;
        }

        // Got a valid drop — launch the snap effect, then commit the store
        // update after ~550ms so the animation plays over the old sprite.
        setAttaching({ partId });
        try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30); } catch { /* ignore */ }

        attachTimer.current = setTimeout(() => {
            attachPart(partId);
            setChipPulseKey(k => k + 1);
            attachTimer.current = setTimeout(() => setAttaching(null), 250);
        }, 550);
    };

    const onTilePointerCancel = () => {
        setDrag(null);
        setHoveringBox(false);
    };

    const allDone = attachedCount >= PARTS.length;
    const blockedHint = unattached.length > 0 && unattached.every(p => !isAttachable(p.id));

    return (
        <CardBody title={'선물상자'}>
            {/* Stage: box sprite on cream pedestal */}
            <div
                ref={boxRef}
                style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: '14px',
                    border: '2px solid #e8c070',
                    background: 'radial-gradient(circle at 50% 45%, #fff4d6 0%, #e6b878 45%, #5a3418 100%)',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.3)',
                    touchAction: 'none',
                }}
            >
                {/* Ambient twinkles */}
                <Twinkles />

                {/* Soft halo while hovering */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(circle at 50% 50%, rgba(255,244,214,0.6) 0%, rgba(255,244,214,0) 60%)',
                    opacity: hoveringBox ? 1 : 0,
                    transition: 'opacity 200ms ease-out',
                    pointerEvents: 'none',
                }} />

                {/* Box sprite */}
                <img
                    src={boxImgSrc}
                    alt={'선물상자'}
                    draggable={false}
                    style={{
                        position: 'absolute',
                        left: '50%', top: '52%',
                        width: '78%',
                        transform: `translate(-50%, -50%) scale(${hoveringBox ? 1.04 : attaching ? 1.06 : 1})`,
                        transition: 'transform 260ms cubic-bezier(0.34, 1.3, 0.64, 1)',
                        filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.35))',
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                />

                {/* Progress chip */}
                <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.55)',
                    border: '2px solid rgba(255,255,255,0.55)',
                    borderRadius: '14px',
                    padding: '3px 10px',
                    fontFamily: 'Fredoka, sans-serif',
                    fontWeight: 700,
                    color: '#fff',
                    fontSize: '13px',
                    display: 'flex', alignItems: 'baseline', gap: '2px',
                }}>
                    <span key={chipPulseKey} style={{
                        fontSize: '16px',
                        color: '#fbbf24',
                        display: 'inline-block',
                        animation: chipPulseKey ? 'giftboxChipPulse 320ms ease-out' : 'none',
                    }}>
                        {attachedCount}
                    </span>
                    <span>/ {PARTS.length}</span>
                </div>

                {/* Snap effect overlay (sparkles + flash) */}
                {attaching && <AttachSparkles />}
            </div>

            {/* Hint text */}
            <div style={{
                marginTop: '10px',
                fontSize: '12px',
                color: '#c8a888',
                textAlign: 'center',
                fontFamily: 'Fredoka, sans-serif',
            }}>
                {boxHarvested
                    ? '선물 준비가 완료되었습니다.'
                    : isReadyToOpen
                    ? '포장이 완료되었습니다.'
                    : isPackaging
                    ? '포장이 진행 중입니다.'
                    : allDone
                    ? '선물이 준비되고 있습니다.'
                    : unattached.length === 0
                    ? '공방에서 파츠를 먼저 만들어 주세요.'
                    : '파츠를 끌어서 상자 위에 올려 주세요.'}
            </div>

            {/* Packaging countdown panel — shows instead of the parts tray
                once the 24th part has been attached. */}
            {(isPackaging || isReadyToOpen || boxHarvested) && (
                <PackagingPanel
                    remainingMs={packagingRemaining}
                    ready={isReadyToOpen}
                    harvested={boxHarvested}
                    onHarvest={harvestBox}
                />
            )}

            {/* Parts tray (hidden once packaging is underway) */}
            {!isPackaging && !isReadyToOpen && !boxHarvested && unattached.length > 0 && (
                <div style={{
                    marginTop: '10px',
                    background: 'linear-gradient(180deg, #2a1808 0%, #3a220e 100%)',
                    border: '1px solid #6a4020',
                    borderRadius: '10px',
                    padding: '8px',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
                }}>
                    <div
                        style={{
                            display: 'flex',
                            overflowX: 'auto',
                            gap: '8px',
                            // Horizontal pan is always allowed so the tray can
                            // scroll; vertical pan stays with our drag gate.
                            touchAction: drag?.commitGate ? 'none' : 'pan-x',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        {unattached.map(p => (
                            <TrayTile
                                key={p.id}
                                part={p}
                                attachable={isAttachable(p.id)}
                                locked={!!attaching}
                                dragging={drag?.partId === p.id && drag.commitGate}
                                onPointerDown={(e) => onTilePointerDown(e, p.id)}
                                onPointerMove={onTilePointerMove}
                                onPointerUp={onTilePointerUp}
                                onPointerCancel={onTilePointerCancel}
                            />
                        ))}
                    </div>
                </div>
            )}
            {blockedHint && (
                <div style={{
                    marginTop: '8px',
                    fontSize: '11px',
                    color: '#c8a060',
                    textAlign: 'center',
                    fontStyle: 'italic',
                }}>
                    이전 날짜 파츠를 먼저 모두 붙여 주세요.
                </div>
            )}
            {rejectShake > 0 && null /* reserved for future reject flash */}

            {/* Floating drag ghost. Rendered via a React portal to document.body
                because the modal card has a `transform` ancestor — which would
                otherwise make position:fixed behave like absolute inside that
                transformed frame and pin the ghost to the modal's top-left. */}
            {drag && drag.commitGate && createPortal(
                <div style={{
                    position: 'fixed',
                    left: 0, top: 0,
                    width: 72,
                    height: 72,
                    // Use translate3d so the ghost center lands exactly on the
                    // finger (minus 40px lift). -50% on both axes centers the
                    // 72x72 box on (drag.x, drag.y - 40).
                    transform: `translate3d(${drag.x - 36}px, ${drag.y - 40 - 36}px, 0) scale(1.2)`,
                    pointerEvents: 'none',
                    zIndex: 10000,
                    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))',
                }}>
                    <img src={partImageSrc(drag.partId)} alt=""
                         style={{ width: '72px', height: '72px', objectFit: 'contain', userSelect: 'none' }}
                         draggable={false} />
                </div>,
                document.body,
            )}

            {/* Keyframes for effects */}
            <style>{GIFTBOX_KEYFRAMES}</style>
        </CardBody>
    );
}

// File name lookup for the 8 stage sprites. Stage 7 (packaging in
// progress) is a new visual that will be generated; until then it falls
// back to stage 6 so nothing breaks.
const STAGE_FILE_NAMES: Record<number, string> = {
    1: 'box_stage1_base.png',
    2: 'box_stage2_frame.png',
    3: 'box_stage3_flowers.png',
    4: 'box_stage4_numbers.png',
    5: 'box_stage5_metal.png',
    6: 'box_stage6_complete.png',
    7: 'box_stage7_packaging.png',
    8: 'box_stage8_wrapped.png',
};

// Packaging countdown / ready / completed panel shown inside the giftbox
// modal once all 24 parts are attached. Three states:
//   - counting down: shows "포장 중 HH:MM:SS"
//   - ready to open: shows a long-press "상자 열기" button
//   - harvested:     shows a celebratory "선물이 준비되었습니다" block
function PackagingPanel({ remainingMs, ready, harvested, onHarvest }: {
    remainingMs: number;
    ready: boolean;
    harvested: boolean;
    onHarvest: () => void;
}) {
    const hours = Math.floor(remainingMs / 3_600_000);
    const mins = Math.floor((remainingMs % 3_600_000) / 60_000);
    const secs = Math.floor((remainingMs % 60_000) / 1000);
    const clock = hours > 0
        ? `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        : `${mins}:${secs.toString().padStart(2, '0')}`;

    // Long-press open
    const [holdProgress, setHoldProgress] = useState(0);
    const [justOpened, setJustOpened] = useState(false);
    const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const holdStartAt = useRef(0);
    const clearHold = () => {
        if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
        setHoldProgress(0);
    };
    useEffect(() => () => clearHold(), []);
    const startHold = () => {
        if (!ready || harvested || justOpened) return;
        clearHold();
        holdStartAt.current = Date.now();
        setHoldProgress(0.01);
        holdTimer.current = setInterval(() => {
            const e = Date.now() - holdStartAt.current;
            const p = Math.min(1, e / HOLD_MS);
            setHoldProgress(p);
            if (p >= 1) {
                clearHold();
                try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate([30, 60, 30]); } catch { /* ignore */ }
                setJustOpened(true);
                setTimeout(() => onHarvest(), 800);
            }
        }, 16);
    };

    if (harvested) {
        return (
            <div style={{
                marginTop: '10px',
                padding: '14px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #fbbf24 0%, #d97706 100%)',
                border: '2px solid #fcd34d',
                textAlign: 'center',
                fontFamily: 'Fredoka, sans-serif',
                color: '#3a220e',
            }}>
                <div style={{ fontSize: '15px', fontWeight: 700 }}>선물이 준비되었습니다</div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#5a3418' }}>
                    이 증명서를 김유찬님께 제시해 주세요.
                </div>
            </div>
        );
    }

    if (ready) {
        return (
            <div style={{
                marginTop: '10px',
                padding: '12px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
                border: '2px solid #86efac',
                fontFamily: 'Fredoka, sans-serif',
                textAlign: 'center',
            }}>
                <div style={{ fontSize: '13px', color: '#dcfce7', fontWeight: 700, marginBottom: '8px' }}>
                    포장이 완료되었습니다
                </div>
                <button
                    onPointerDown={startHold}
                    onPointerUp={clearHold}
                    onPointerLeave={clearHold}
                    onPointerCancel={clearHold}
                    disabled={justOpened}
                    style={{
                        position: 'relative',
                        overflow: 'hidden',
                        width: '100%',
                        padding: '12px',
                        border: 'none',
                        borderRadius: '10px',
                        background: 'rgba(255,255,255,0.25)',
                        color: '#ffffff',
                        fontSize: '16px',
                        fontWeight: 700,
                        fontFamily: 'Fredoka, sans-serif',
                        cursor: 'pointer',
                        borderTop: '2px solid rgba(255,255,255,0.4)',
                        userSelect: 'none',
                        touchAction: 'none',
                        transform: holdProgress > 0 ? 'scale(0.98)' : 'scale(1)',
                        transition: 'transform 80ms ease-out',
                    }}
                >
                    {holdProgress > 0 && !justOpened && (
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${holdProgress * 100}%`,
                            background: 'rgba(255,255,255,0.4)',
                            pointerEvents: 'none',
                        }} />
                    )}
                    <span style={{ position: 'relative' }}>
                        {justOpened ? '\uD83C\uDF89 선물 열기 완료!' : holdProgress > 0 ? '여는 중...' : '\uD83C\uDF81 꾹 눌러서 상자 열기'}
                    </span>
                </button>
            </div>
        );
    }

    // Counting down
    return (
        <div style={{
            marginTop: '10px',
            padding: '14px 12px',
            borderRadius: '12px',
            background: 'linear-gradient(180deg, #2a1808 0%, #3a220e 100%)',
            border: '2px solid #6a4020',
            fontFamily: 'Fredoka, sans-serif',
            textAlign: 'center',
        }}>
            <div style={{ fontSize: '12px', color: '#c8a888', fontWeight: 700 }}>
                포장 중
            </div>
            <div style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#fbbf24',
                fontFamily: 'monospace',
                marginTop: '4px',
                letterSpacing: '0.05em',
            }}>
                {clock}
            </div>
            <div style={{ fontSize: '11px', color: '#8a7358', marginTop: '4px' }}>
                완료되면 다시 열어 주세요.
            </div>
        </div>
    );
}

// Single tray tile. Four visual states:
//  - normal      (draggable)
//  - dragging    (this tile's ghost is in flight → hidden base)
//  - !attachable (earlier day not finished → faded + small lock)
//  - locked      (attach animation is running → frozen)
function TrayTile({ part, attachable, locked, dragging, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }: {
    part: typeof PARTS[0];
    attachable: boolean;
    locked: boolean;
    dragging: boolean;
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
}) {
    const dimmed = !attachable || locked;
    return (
        <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerCancel}
            style={{
                position: 'relative',
                flexShrink: 0,
                width: '72px',
                height: '86px',
                background: 'linear-gradient(180deg, #3a220e 0%, #2a1808 100%)',
                border: `2px solid ${attachable ? '#6a4020' : '#4a3520'}`,
                borderRadius: '8px',
                padding: '4px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontFamily: 'Fredoka, sans-serif',
                userSelect: 'none',
                // Allow horizontal pan natively so the tray can scroll even
                // when the finger lands on a tile; the drag gate handles
                // vertical motion.
                touchAction: 'pan-x',
                opacity: dragging ? 0.15 : dimmed ? 0.45 : 1,
                filter: !attachable ? 'grayscale(0.6)' : 'none',
                transition: 'opacity 140ms ease-out',
                cursor: dimmed ? 'default' : 'grab',
            }}
        >
            <div style={{
                width: '48px', height: '48px',
                borderRadius: '50%',
                background: 'rgba(245,230,200,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <img src={partImageSrc(part.id)} alt={part.name}
                     style={{ width: '44px', height: '44px', objectFit: 'contain', pointerEvents: 'none' }}
                     draggable={false} />
            </div>
            <div style={{
                fontSize: '9px',
                fontWeight: 700,
                color: '#f5e6c8',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                width: '100%',
            }}>
                {part.name}
            </div>
            {/* Tiny day label so the ordering constraint is legible */}
            <div style={{
                position: 'absolute', top: '2px', left: '2px',
                fontSize: '9px',
                fontWeight: 700,
                color: attachable ? '#fbbf24' : '#8a7358',
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '5px',
                padding: '0 4px',
                lineHeight: '14px',
            }}>
                D{part.day}
            </div>
            {!attachable && (
                <span style={{
                    position: 'absolute', top: '4px', right: '4px',
                    fontSize: '12px',
                }}>{'\uD83D\uDD12'}</span>
            )}
        </div>
    );
}

// Tiny ambient twinkles for the stage pedestal
function Twinkles() {
    return (
        <>
            {[
                { top: '18%', left: '20%', delay: '0ms' },
                { top: '28%', left: '78%', delay: '600ms' },
                { top: '68%', left: '18%', delay: '300ms' },
                { top: '80%', left: '72%', delay: '900ms' },
            ].map((s, i) => (
                <span key={i} style={{
                    position: 'absolute',
                    top: s.top, left: s.left,
                    fontSize: '12px',
                    color: '#fff4d6',
                    opacity: 0.7,
                    animation: `giftboxTwinkle 2600ms ${s.delay} ease-in-out infinite`,
                    pointerEvents: 'none',
                }}>✨</span>
            ))}
        </>
    );
}

// Sparkle burst that plays for ~800ms after a successful drop.
function AttachSparkles() {
    // 14 particles radiating from center
    const particles = Array.from({ length: 14 }).map((_, i) => {
        const angle = (i / 14) * Math.PI * 2;
        const dist = 50 + (i % 3) * 10;
        const palette = ['#ffb6d9', '#fff4d6', '#ffd86b', '#b6f2d4'];
        return {
            dx: Math.cos(angle) * dist,
            dy: Math.sin(angle) * dist,
            color: palette[i % palette.length],
            size: 6 + (i % 3) * 2,
            delay: (i % 4) * 30,
        };
    });
    return (
        <div style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none',
        }}>
            {/* White center flash */}
            <div style={{
                position: 'absolute',
                left: '50%', top: '52%',
                width: '8px', height: '8px',
                marginLeft: '-4px', marginTop: '-4px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #ffffff 0%, #fff4d6 40%, rgba(255,244,214,0) 70%)',
                animation: 'giftboxFlash 500ms ease-out forwards',
            }} />
            {particles.map((p, i) => (
                <span key={i} style={{
                    position: 'absolute',
                    left: '50%', top: '52%',
                    width: `${p.size}px`, height: `${p.size}px`,
                    marginLeft: `-${p.size / 2}px`, marginTop: `-${p.size / 2}px`,
                    borderRadius: '50%',
                    background: p.color,
                    boxShadow: `0 0 6px ${p.color}`,
                    // @ts-expect-error CSS custom property
                    '--dx': `${p.dx}px`,
                    '--dy': `${p.dy}px`,
                    animation: `giftboxParticle 720ms ${p.delay}ms ease-out forwards`,
                }} />
            ))}
        </div>
    );
}

const GIFTBOX_KEYFRAMES = `
@keyframes giftboxTwinkle {
    0%, 100% { opacity: 0.15; transform: scale(0.85); }
    50%      { opacity: 0.9;  transform: scale(1.1); }
}
@keyframes giftboxFlash {
    0%   { transform: scale(0.3); opacity: 0.9; }
    60%  { transform: scale(14);  opacity: 0.5; }
    100% { transform: scale(22);  opacity: 0; }
}
@keyframes giftboxParticle {
    0%   { transform: translate(0, 0) scale(0.4); opacity: 0; }
    20%  { opacity: 1; }
    100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0; }
}
@keyframes giftboxChipPulse {
    0%   { transform: scale(1); color: #fbbf24; }
    40%  { transform: scale(1.4); color: #ffffff; }
    100% { transform: scale(1); color: #fbbf24; }
}
`;

function CraftingInProgress({ part, startedAt, isReady, onCollect }: {
    part: typeof PARTS[0];
    startedAt: number;
    isReady: boolean;
    onCollect: () => void;
}) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick(n => n + 1), 500);
        return () => clearInterval(t);
    }, []);
    const craftMs = part.craftTime * 60 * 1000;
    const elapsed = Math.min(craftMs, Math.max(0, Date.now() - startedAt));
    const pct = elapsed / craftMs;
    const remainingMs = craftMs - elapsed;

    // Long-press collect (matches HarvestInfo UX)
    const [holdProgress, setHoldProgress] = useState(0);
    const [justCollected, setJustCollected] = useState(false);
    const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const holdStartAt = useRef(0);
    const collectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearHold = () => {
        if (holdTimer.current) {
            clearInterval(holdTimer.current);
            holdTimer.current = null;
        }
        setHoldProgress(0);
    };
    useEffect(() => () => {
        clearHold();
        if (collectTimer.current) clearTimeout(collectTimer.current);
    }, []);
    const startHold = () => {
        if (!isReady || justCollected) return;
        clearHold();
        holdStartAt.current = Date.now();
        setHoldProgress(0.01);
        holdTimer.current = setInterval(() => {
            const e = Date.now() - holdStartAt.current;
            const p = Math.min(1, e / HOLD_MS);
            setHoldProgress(p);
            if (p >= 1) {
                clearHold();
                try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30); } catch { /* ignore */ }
                // Show "수거 완료!" feedback, then commit to the store.
                // The store update unmounts this component, so we defer
                // it by ~1.4s to keep the message on screen.
                setJustCollected(true);
                collectTimer.current = setTimeout(() => {
                    onCollect();
                }, 1400);
            }
        }, 16);
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px',
            background: isReady
                ? 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)'
                : 'linear-gradient(180deg, #5a3a1e 0%, #3a220e 100%)',
            border: isReady ? '2px solid #86efac' : '2px solid #c8a060',
            borderRadius: '10px',
        }}>
            <img src={partImageSrc(part.id)} alt={part.name}
                 style={{ width: '44px', height: '44px', objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px',
                }}>
                    <div style={{
                        fontSize: '13px', fontWeight: 700,
                        color: isReady ? '#ffffff' : '#f0e0b8',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                        {part.name}
                    </div>
                    {!isReady && (
                        <div style={{
                            fontSize: '14px', fontWeight: 700, color: '#fbbf24',
                            fontFamily: 'monospace', marginLeft: '8px',
                        }}>
                            {formatRemaining(remainingMs)}
                        </div>
                    )}
                </div>
                {isReady ? (
                    <button
                        onPointerDown={startHold}
                        onPointerUp={clearHold}
                        onPointerLeave={clearHold}
                        onPointerCancel={clearHold}
                        disabled={justCollected}
                        style={{
                            position: 'relative',
                            overflow: 'hidden',
                            width: '100%',
                            padding: '6px 8px',
                            border: 'none',
                            borderRadius: '6px',
                            background: justCollected
                                ? 'rgba(255,255,255,0.4)'
                                : 'rgba(255,255,255,0.25)',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 700,
                            fontFamily: 'Fredoka, sans-serif',
                            cursor: justCollected ? 'default' : 'pointer',
                            borderTop: '2px solid rgba(255,255,255,0.4)',
                            userSelect: 'none',
                            touchAction: 'none',
                            transform: holdProgress > 0 ? 'scale(0.98)' : 'scale(1)',
                            transition: 'transform 80ms ease-out, background 160ms ease-out',
                        }}
                    >
                        {holdProgress > 0 && !justCollected && (
                            <div style={{
                                position: 'absolute', left: 0, top: 0, bottom: 0,
                                width: `${holdProgress * 100}%`,
                                background: 'rgba(255,255,255,0.35)',
                                pointerEvents: 'none',
                            }} />
                        )}
                        <span style={{ position: 'relative' }}>
                            {justCollected
                                ? `\u2705 수거 완료! (${part.name})`
                                : holdProgress > 0
                                ? '수거 중...'
                                : '\u2728 꾹 눌러서 수거'}
                        </span>
                    </button>
                ) : (
                    <>
                        <div style={{
                            height: '6px',
                            background: '#1a1208',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            border: '1px solid #3a2a15',
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${pct * 100}%`,
                                background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                                transition: 'width 400ms ease-out',
                            }} />
                        </div>
                        <div style={{ fontSize: '10px', color: '#8a7358', marginTop: '2px' }}>
                            제작 중...
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

// Completed part card — shows a finished (collected) part with a "완료" badge.
// Not interactive; it just confirms the player has this part in inventory.
function CompletedPartCard({ part }: { part: typeof PARTS[0] }) {
    return (
        <div style={{
            flexShrink: 0,
            width: '108px',
            background: 'linear-gradient(180deg, #22c55e 0%, #15803d 100%)',
            border: '3px solid #86efac',
            borderRadius: '10px',
            padding: '0',
            overflow: 'hidden',
            fontFamily: 'Fredoka, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            boxShadow: '0 2px 6px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.2)',
        }}>
            <div style={{
                position: 'relative',
                height: '64px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.18)',
            }}>
                <img src={partImageSrc(part.id)} alt={part.name}
                     style={{ width: '54px', height: '54px', objectFit: 'contain' }} />
                <div style={{
                    position: 'absolute', top: '4px', right: '4px',
                    fontSize: '14px',
                }}>{'\u2705'}</div>
            </div>
            <div style={{
                padding: '4px 4px 2px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ffffff',
                textAlign: 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {part.name}
            </div>
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.35)',
                padding: '3px 4px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#ffffff',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.15)',
            }}>완료</div>
        </div>
    );
}

// Locked part card — shows ??? for a part not yet unlocked (day > currentDay)
function LockedPartCard() {
    return (
        <div style={{
            flexShrink: 0,
            width: '108px',
            background: 'linear-gradient(180deg, #5a5550 0%, #4a4540 100%)',
            border: '3px solid #3a3530',
            borderRadius: '10px',
            padding: '0',
            overflow: 'hidden',
            opacity: 0.85,
            fontFamily: 'Fredoka, sans-serif',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
        }}>
            <div style={{
                height: '64px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.2)',
                fontSize: '32px',
                color: '#888',
                fontWeight: 700,
            }}>?</div>
            <div style={{
                padding: '4px 4px 2px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#aaa',
                textAlign: 'center',
            }}>???</div>
            <div style={{
                padding: '2px 4px',
                fontSize: '11px',
                color: '#888',
                textAlign: 'center',
            }}>???</div>
            <div style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                padding: '3px 4px',
                fontSize: '11px',
                color: '#888',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.1)',
            }}>🔒 잠김</div>
        </div>
    );
}

// Compact craft card. BuildMenu style (brown gradient, gold border) but smaller.
function PartCraftCard({ part, resources, disabled, isNew, onStart }: {
    part: typeof PARTS[0];
    resources: Record<string, { amount: number; unlocked: boolean }>;
    disabled: boolean;
    isNew: boolean;
    onStart: () => void;
}) {
    const affordable = part.cost.every(c => (resources[c.res]?.amount ?? 0) >= c.amount);
    const canStart = affordable && !disabled;

    const cardBg = canStart
        ? 'linear-gradient(180deg, #f5e6c8 0%, #e0c898 100%)'
        : 'linear-gradient(180deg, #e8d0b0 0%, #d0b890 100%)';
    const cardBorder = canStart ? '3px solid #c8a060' : '3px solid #a08050';

    return (
        <button
            onClick={canStart ? onStart : undefined}
            disabled={!canStart}
            style={{
                scrollSnapAlign: 'start',
                flexShrink: 0,
                width: '108px',
                background: cardBg,
                border: cardBorder,
                borderRadius: '10px',
                padding: '0',
                overflow: 'hidden',
                opacity: canStart ? 1 : 0.75,
                cursor: canStart ? 'pointer' : 'not-allowed',
                textAlign: 'center',
                fontFamily: 'Fredoka, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
            }}
        >
            {/* Part image */}
            <div style={{
                position: 'relative',
                height: '64px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.2)',
            }}>
                <img src={partImageSrc(part.id)} alt={part.name}
                     style={{ width: '54px', height: '54px', objectFit: 'contain' }} />
                {isNew && (
                    <span style={{
                        position: 'absolute', top: '3px', left: '3px',
                        background: '#ef4444', color: '#fff',
                        borderRadius: '8px',
                        padding: '1px 5px',
                        fontSize: '9px',
                        fontWeight: 900,
                        letterSpacing: '0.03em',
                        border: '1.5px solid rgba(255,255,255,0.9)',
                        boxShadow: '0 1px 4px rgba(239,68,68,0.5)',
                    }}>NEW</span>
                )}
            </div>

            {/* Name */}
            <div style={{
                padding: '4px 4px 2px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#3a2810',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {part.name}
            </div>

            {/* Cost (each resource) */}
            <div style={{
                display: 'flex', flexDirection: 'column', gap: '1px',
                padding: '2px 4px',
            }}>
                {part.cost.map((c, i) => {
                    const resDef = RESOURCE_DEFS.find(r => r.id === c.res);
                    const has = resources[c.res]?.amount ?? 0;
                    const short = has < c.amount;
                    return (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
                            fontSize: '11px',
                            color: short ? '#c04030' : '#3a2810',
                            fontWeight: 700,
                        }}>
                            {resDef && <img src={resDef.img} alt={c.res} style={{ width: '13px', height: '13px' }} />}
                            <span>{c.amount}</span>
                        </div>
                    );
                })}
            </div>

            {/* Time */}
            <div style={{
                borderTop: '1px solid rgba(58,40,16,0.3)',
                padding: '3px 4px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#5a3a1e',
                background: 'rgba(0,0,0,0.05)',
            }}>
                ⏱ {part.craftTime}분
            </div>
        </button>
    );
}
