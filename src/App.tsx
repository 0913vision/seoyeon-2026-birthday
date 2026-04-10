import { useRef, useState, useEffect } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { useGameStore } from './store/useGameStore';
import { TopBar } from './components/TopBar';
import { BottomBar } from './components/BottomBar';
import { BuildMenu } from './components/BuildMenu';
import { DialogBox } from './components/DialogBox';
import { DIALOGUES } from './data/dialogues';
import { loadGame, applyLoadedData } from './services/db';

function App() {
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [showDialog, setShowDialog] = useState(false);
    const [dialogIndex, setDialogIndex] = useState(0);
    const [showBuildMenu, setShowBuildMenu] = useState(false);

    const addResource = useGameStore(s => s.addResource);
    const resources = useGameStore(s => s.resources);

    // Load from DB on mount
    useEffect(() => {
        loadGame('default_player').then(data => {
            if (data) {
                applyLoadedData(data);
                console.log('[App] Loaded game state from DB');
            }
        });
    }, []);

    // Expose for console/test
    useEffect(() => {
        (window as any).__addResource = addResource;
        (window as any).__getResources = () => resources;
    }, [resources, addResource]);

    // Use first dialogue scene as sample
    const dialogLines = DIALOGUES[0]?.lines ?? [];

    const goToBox = () => {
        if (phaserRef.current?.scene) {
            const scene = phaserRef.current.scene as any;
            if (scene.goToGiftBox) scene.goToGiftBox();
        }
    };

    const handleDialogTap = () => {
        if (dialogIndex < dialogLines.length - 1) {
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

                {/* Build Menu backdrop + panel */}
                {showBuildMenu && (
                    <>
                        <div className="pointer-events-auto" onClick={() => setShowBuildMenu(false)}
                             style={{ position: 'absolute', inset: 0 }} />
                        <BuildMenu onClose={() => setShowBuildMenu(false)} />
                    </>
                )}

                {/* Dialog */}
                {showDialog && dialogLines.length > 0 && (
                    <DialogBox
                        text={dialogLines[dialogIndex].text}
                        action={dialogLines[dialogIndex].action}
                        onTap={handleDialogTap}
                        isLast={dialogIndex === dialogLines.length - 1}
                    />
                )}

                <BottomBar onGoToBox={goToBox} onBuild={() => setShowBuildMenu(prev => !prev)} buildOpen={showBuildMenu} />
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
                {showDialog ? '\u2715' : '\uD83D\uDCAC'}
            </button>
        </div>
    );
}

export default App;
