import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { BUILDINGS, HARVESTABLE_BUILDINGS } from '../data/buildings';
import { TERRAIN } from '../data/terrain';
import { PRODUCTION, RESOURCE_DEFS } from '../data/resources';
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
    if (category === 'giftbox') return <GenericInfo title="선물상자" body="상자 상호작용은 아직 준비 중입니다." />;
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

// === Terrain Help ===
function TerrainHelp({ id }: { id: string }) {
    const terrain = TERRAIN.find(t => t.id === id);
    const name = terrain?.name ?? id;

    // Hint per terrain id - which building can use it
    const hints: Record<string, string> = {
        flower_patch: '\uAF43\uBC2D \uC8FC\uBCC0\uC5D0 \uAF43\uBC2D\uC744 \uC9C0\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        rock_outcrop: '\uBC14\uC704 \uC8FC\uBCC0\uC5D0 \uCC44\uC11D\uC7A5\uC744 \uC9C0\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        cave_entrance: '\uB3D9\uAD74 \uC8FC\uBCC0\uC5D0 \uAD11\uC0B0\uC744 \uC9C0\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
        crystal_cluster: '\uC218\uC815 \uC8FC\uBCC0\uC5D0 \uC218\uC815\uB3D9\uAD74\uC744 \uC9C0\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.',
    };

    return (
        <CardBody title={name}>
            <div>{hints[id] ?? '\uD2B9\uC218 \uC9C0\uD615\uC785\uB2C8\uB2E4.'}</div>
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#c8a888', fontStyle: 'italic' }}>
                건설 메뉴에서 건물을 고른 다음, 이 지형 근처에 배치해 주세요.
            </div>
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

// === Construction Info (stub) ===
function ConstructionInfo({ id }: { id: string }) {
    const def = BUILDINGS.find(b => b.id === id);
    const name = def?.name ?? id;
    return (
        <CardBody title={`${name} (\uAC74\uC124 \uC911)`}>
            <div>{'\uD604\uC7AC \uAC74\uC124 \uC911\uC778 \uAC74\uBB3C\uC785\uB2C8\uB2E4.'}</div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#c8a888' }}>
                {'TODO: \uB0A8\uC740 \uC2DC\uAC04, \uC989\uC2DC \uC644\uB8CC \uC635\uC158 \uB4F1'}
            </div>
        </CardBody>
    );
}

// === Workshop Panel (stub) ===
function WorkshopPanel({ id }: { id: string }) {
    const def = BUILDINGS.find(b => b.id === id);
    const name = def?.name ?? id;
    return (
        <CardBody title={name}>
            <div>{'\uD30C\uCE20 \uC81C\uC791 \uC791\uC5C5\uC7A5\uC785\uB2C8\uB2E4.'}</div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#c8a888' }}>
                {'TODO: \uD30C\uCE20 \uBAA9\uB85D, \uC81C\uC791 \uC9C4\uD589 \uC0C1\uD0DC \uB4F1'}
            </div>
        </CardBody>
    );
}
