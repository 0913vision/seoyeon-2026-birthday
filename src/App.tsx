import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { useGameStore } from './store/useGameStore';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { BuildMenu } from './components/BuildMenu';
import { BuildingModal } from './components/BuildingModal';
import { DebugPanel } from './components/DebugPanel';
import { DialogBox } from './components/DialogBox';
import { DIALOGUES, findNextDialog, DialogContext } from './data/dialogues';
import { loadGame, applyLoadedData, startAutoSave, stopAutoSave } from './services/db';
import { EventBus } from './game/EventBus';
import { GameScene } from './game/scenes/GameScene';
import { hasBuildMenuNew } from './store/badges';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [showBuildMenu, setShowBuildMenu] = useState(false);
    // True once loadGame().then(applyLoadedData) has finished. The dialog
    // rule engine MUST NOT run before this — otherwise it would open
    // day1_intro against the empty initial shownDialogs and the player
    // would see the same tutorial every time they refreshed.
    const [dbLoaded, setDbLoaded] = useState(false);

    const addResource = useGameStore(s => s.addResource);
    const resources = useGameStore(s => s.resources);
    const buildMode = useGameStore(s => s.buildMode);
    const exitBuildMode = useGameStore(s => s.exitBuildMode);
    const startConstruction = useGameStore(s => s.startConstruction);
    const openBuildingModal = useGameStore(s => s.openBuildingModal);
    const currentDay = useGameStore(s => s.currentDay);
    const seenBuildMenuDay = useGameStore(s => s.seenNewDay.buildMenu);
    const markBuildMenuSeen = useGameStore(s => s.markBuildMenuSeen);
    const buildNew = hasBuildMenuNew(currentDay, seenBuildMenuDay);

    // Dialog state (driven by store + rule engine)
    const showDialog = useGameStore(s => s.showDialog);
    const dialogSceneId = useGameStore(s => s.dialogSceneId);
    const dialogLineIndex = useGameStore(s => s.dialogLineIndex);
    const openDialog = useGameStore(s => s.openDialog);
    const advanceDialog = useGameStore(s => s.advanceDialog);
    const closeDialog = useGameStore(s => s.closeDialog);
    const tutorialStep = useGameStore(s => s.tutorialStep);
    const shownDialogs = useGameStore(s => s.shownDialogs);
    const partsCompleted = useGameStore(s => s.partsCompleted);
    const partsAttached = useGameStore(s => s.partsAttached);
    const woodshopCrafting = useGameStore(s => s.woodshopCrafting);
    const jewelshopCrafting = useGameStore(s => s.jewelshopCrafting);
    const buildings = useGameStore(s => s.buildings);
    const packagingStartedAt = useGameStore(s => s.packagingStartedAt);
    const boxHarvested = useGameStore(s => s.boxHarvested);
    const activeModal = useGameStore(s => s.activeModal);

    // Build the context in a single object so both the auto-open and the
    // auto-dismiss ("until") effects read from the same snapshot.
    const ctx: DialogContext = {
        currentDay,
        tutorialStep,
        shownDialogs,
        showBuildMenu,
        buildings,
        partsCompleted,
        partsAttached,
        woodshopCrafting,
        jewelshopCrafting,
        resources,
        packagingStartedAt,
        boxHarvested,
        activeModal,
        buildMode,
    };

    // Dialog auto-trigger. When the store state changes, check the rule
    // engine and open the first unshown scene whose `when` is satisfied.
    // Guarded by showDialog so we never interrupt a scene that is open.
    // Also gated on dbLoaded so the engine doesn't run against the
    // empty initial shownDialogs before the saved row is applied.
    useEffect(() => {
        if (!dbLoaded) return;
        if (showDialog) return;
        const next = findNextDialog(ctx);
        if (next) {
            openDialog(next.id);
            // Apply tutorial action lock if the scene declared one.
            useGameStore.setState({ tutorialLock: next.lock ?? null });
            if (next.camera && phaserRef.current?.scene) {
                const sceneInst = phaserRef.current.scene as GameScene;
                sceneInst.panToBuilding?.(next.camera);
            }
        } else {
            // No scene open and none eligible → clear any stale lock.
            if (useGameStore.getState().tutorialLock != null) {
                useGameStore.setState({ tutorialLock: null });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        dbLoaded, showDialog, currentDay, tutorialStep, shownDialogs, showBuildMenu,
        buildings, partsCompleted, partsAttached, woodshopCrafting,
        jewelshopCrafting, resources, packagingStartedAt, boxHarvested,
        activeModal, buildMode,
    ]);

    // Auto-dismiss: while a scene is open, check its `until` predicate and
    // close the dialog the instant the player performs the required action.
    useEffect(() => {
        if (!showDialog || !dialogSceneId) return;
        const scene = DIALOGUES.find(d => d.id === dialogSceneId);
        if (!scene?.until) return;
        if (scene.until(ctx)) {
            closeDialog();
            useGameStore.setState({ tutorialLock: null });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        showDialog, dialogSceneId, currentDay, showBuildMenu, buildings,
        partsCompleted, partsAttached, woodshopCrafting, jewelshopCrafting,
        resources, packagingStartedAt, boxHarvested, activeModal, buildMode,
    ]);

    // Also tick once a minute so time-based triggers (e.g. packaging done)
    // eventually fire even if nothing else in state has changed.
    useEffect(() => {
        if (packagingStartedAt == null || boxHarvested) return;
        const remaining = packagingStartedAt + 90 * 60_000 - Date.now();
        if (remaining <= 0) return;
        const t = setTimeout(() => {
            // Bump a no-op action so the rule engine re-evaluates.
            useGameStore.setState({});
        }, Math.min(remaining + 500, 60_000));
        return () => clearTimeout(t);
    }, [packagingStartedAt, boxHarvested]);

    // Load from DB on mount, then start auto-save
    useEffect(() => {
        loadGame('default_player').then(data => {
            if (data) {
                applyLoadedData(data);
                console.log('[App] Loaded game state from DB');
            }
            startAutoSave();
            setDbLoaded(true);
        });
        return () => { stopAutoSave(); };
    }, []);

    // Handle tile tap from Phaser (build mode)
    useEffect(() => {
        const handler = ({ buildingId, row, col }: { buildingId: string; row: number; col: number }) => {
            startConstruction(buildingId, row, col);

            // Tell Phaser to show construction placeholder
            if (phaserRef.current?.scene) {
                const scene = phaserRef.current.scene as GameScene;
                if (scene.placeConstructionPlaceholder) {
                    scene.placeConstructionPlaceholder(buildingId, row, col);
                }
            }
        };

        EventBus.on('tile-tapped', handler);
        return () => { EventBus.off('tile-tapped', handler); };
    }, [startConstruction]);

    // Handle building/terrain tap from Phaser (open modal)
    useEffect(() => {
        const handler = ({ category, id }: { category: 'terrain' | 'harvest' | 'construction' | 'workshop' | 'giftbox'; id: string }) => {
            openBuildingModal(category, id);
        };
        EventBus.on('building-tapped', handler);
        return () => { EventBus.off('building-tapped', handler); };
    }, [openBuildingModal]);

    // Expose for console/test
    useEffect(() => {
        (window as any).__addResource = addResource;
        (window as any).__getResources = () => resources;
        (window as any).__harvest = (buildingId: string) => useGameStore.getState().harvestBuilding(buildingId);
        (window as any).__getHarvestStates = () => useGameStore.getState().harvestStates;
    }, [resources, addResource]);

    // Resolve the currently-open dialog scene from the store id
    const currentScene = DIALOGUES.find(d => d.id === dialogSceneId) ?? null;
    const currentLine = currentScene?.lines[dialogLineIndex] ?? null;

    const goToBox = () => {
        if (phaserRef.current?.scene) {
            const scene = phaserRef.current.scene as any;
            if (scene.goToGiftBox) scene.goToGiftBox();
        }
    };

    const handleDialogTap = () => {
        if (!currentScene) return;
        if (dialogLineIndex < currentScene.lines.length - 1) {
            advanceDialog();
            return;
        }
        // Last line: action-blocking scenes (those with `until`) cannot be
        // dismissed by tap — the player must perform the required action.
        if (currentScene.until) return;
        closeDialog();
    };

    return (
        <div className="relative w-full overflow-hidden" style={{ height: '100dvh' }}>
            <PhaserGame ref={phaserRef} />

            {/* Debug build tag */}
            <div style={{
                position: 'absolute',
                top: '2px',
                right: '4px',
                fontSize: '9px',
                fontFamily: 'monospace',
                color: 'rgba(255,255,255,0.55)',
                textShadow: '0 1px 2px rgba(0,0,0,0.6)',
                zIndex: 9999,
                pointerEvents: 'none',
                userSelect: 'none',
            }}>
                {__BUILD_SHA__} · {__BUILD_TIME__.slice(5, 16).replace('T', ' ')}
            </div>

            {/* UI Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col">
                <TopBar />
                <div className="flex-1" />

                {/* Build Mode indicator */}
                {buildMode && (
                    <div className="pointer-events-auto" style={{
                        position: 'absolute', top: '80px', left: '50%', transform: 'translateX(-50%)',
                        background: 'rgba(30,30,60,0.92)', color: '#fff', padding: '10px 24px',
                        borderRadius: '16px', fontSize: '15px', fontFamily: 'Fredoka, sans-serif',
                        fontWeight: 700, whiteSpace: 'nowrap', zIndex: 10,
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                        border: '2px solid rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', gap: '12px',
                    }}>
                        <span>{'\uD83D\uDCCD'} {'\uBE48 \uD0C0\uC77C\uC744 \uD0ED\uD558\uC5EC \uAC74\uBB3C\uC744 \uBC30\uCE58\uD558\uC138\uC694'}</span>
                        <button onClick={exitBuildMode} style={{
                            background: 'rgba(239,68,68,0.85)', border: '2px solid rgba(255,255,255,0.5)',
                            borderRadius: '10px', color: '#fff', padding: '4px 12px', fontSize: '13px',
                            fontWeight: 700, cursor: 'pointer',
                        }}>{'\uCDE8\uC18C'}</button>
                    </div>
                )}

                {/* Build Menu backdrop + panel */}
                {showBuildMenu && (
                    <>
                        <div className="pointer-events-auto" onClick={() => { setShowBuildMenu(false); markBuildMenuSeen(); }}
                             style={{ position: 'absolute', inset: 0 }} />
                        <BuildMenu onClose={() => { setShowBuildMenu(false); markBuildMenuSeen(); }} />
                    </>
                )}

                {/* Dialog — driven by the store + rule engine */}
                {showDialog && currentScene && currentLine && (
                    <DialogBox
                        text={currentLine.text}
                        action={currentLine.action}
                        onTap={handleDialogTap}
                        isLast={dialogLineIndex === currentScene.lines.length - 1}
                    />
                )}

                <BottomBar
                    onGoToBox={goToBox}
                    onBuild={() => {
                        // Tutorial gate: BUILD is usable under 'build_button'
                        // (explicit prompt) AND 'build_woodshop' (so the
                        // player can re-open the menu if they accidentally
                        // closed it mid-select).
                        const lock = useGameStore.getState().tutorialLock;
                        if (lock != null && lock !== 'build_button' && lock !== 'build_woodshop') return;
                        // Open/close the menu. seenNewDay is bumped on CLOSE only,
                        // so NEW stays visible (and indicator cards inside the menu
                        // keep their NEW dots) for the duration of the session.
                        setShowBuildMenu(prev => {
                            const next = !prev;
                            if (!next) markBuildMenuSeen();
                            return next;
                        });
                    }}
                    buildOpen={showBuildMenu}
                    hasBuildNew={buildNew}
                />

                {/* Building/Terrain interaction modal */}
                <BuildingModal />
            </div>

            {/* Debug admin panel — only on /debug path */}
            {typeof window !== 'undefined' && window.location.pathname === '/debug' && (
                <DebugPanel />
            )}
        </div>
    );
}

export default App;
