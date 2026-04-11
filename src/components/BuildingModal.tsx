import { useGameStore } from '../store/useGameStore';
import { BUILDINGS } from '../data/buildings';
import { TERRAIN } from '../data/terrain';

export function BuildingModal() {
    const activeModal = useGameStore(s => s.activeModal);
    const closeBuildingModal = useGameStore(s => s.closeBuildingModal);

    if (!activeModal) return null;

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
                }}
            />

            {/* Modal Card */}
            <div
                className="pointer-events-auto"
                style={{
                    position: 'absolute',
                    top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
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
                }}
            >
                {/* Title bar */}
                <ModalContent category={activeModal.category} id={activeModal.id} />

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
    if (category === 'giftbox') return <GenericInfo title="\uC120\uBB3C\uC0C1\uC790" body="\uC0C1\uC790 \uC0C1\uD638\uC791\uC6A9\uC740 \uC544\uC9C1 \uC900\uBE44 \uC911\uC785\uB2C8\uB2E4." />;
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
                fontSize: '14px',
                lineHeight: 1.55,
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
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#c8a888', fontStyle: 'italic' }}>
                {'\uAC74\uC124 \uBA54\uB274\uC5D0\uC11C \uAC74\uBB3C\uC744 \uC120\uD0DD \uD6C4 \uC774 \uC9C0\uD615\uC758 8\uBC29\uD5A5 \uC774\uC6C3\uC5D0 \uBC30\uCE58\uD558\uC138\uC694.'}
            </div>
        </CardBody>
    );
}

// === Harvest Info (stub) ===
function HarvestInfo({ id }: { id: string }) {
    const def = BUILDINGS.find(b => b.id === id);
    const name = def?.name ?? id;
    return (
        <CardBody title={name}>
            <div>{'\uC218\uD655 \uAC00\uB2A5\uD55C \uC790\uC6D0 \uAC74\uBB3C\uC785\uB2C8\uB2E4.'}</div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#c8a888' }}>
                {'TODO: \uC218\uD655\uB7C9 \uD45C\uC2DC, \uC218\uD655 \uBC84\uD2BC, \uB204\uC801 \uC0C1\uD0DC \uB4F1'}
            </div>
        </CardBody>
    );
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
