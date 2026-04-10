import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { useGameStore } from '../../store/useGameStore';
import { BUILDINGS as DATA_BUILDINGS } from '../../data/buildings';

const DPR = window.devicePixelRatio || 1;
const TILE_W = 110 * DPR;
const TILE_H = Math.round(110 * 0.58) * DPR; // calibrated ratio 0.58
const GRID_SIZE = 16;
const CONSTRUCTION_TIME_MS = 180_000; // 3 minutes - must match store

const GRASS_LIGHT = [0x6dbe82, 0x70c386, 0x6bba7e, 0x75c88a, 0x68b67a];
const GRASS_DARK = [0x5aaa6e, 0x5dae72, 0x58a66a, 0x62b276, 0x56a266];
const DIRT_COLORS = { fill: 0xa08660, highlight: 0xb89870, shadow: 0x886e48 };
const STONE_COLORS = { fill: 0xb0aaa5, highlight: 0xc8c2bd, shadow: 0x908a85 };

// Tile layout: 'sp' = stone path, 'dp' = dirt path, 'gd' = dark grass
const TILE_MAP: Record<string, string> = {
    // Stone ring around Gift Box (8,8)
    '7,7': 'sp', '7,8': 'sp', '7,9': 'sp',
    '8,7': 'sp', '8,9': 'sp',
    '9,7': 'sp', '9,8': 'sp', '9,9': 'sp',

    // Wood Farm (3,4) -> center via col 7
    '3,5': 'dp', '3,6': 'dp', '3,7': 'dp',
    '4,7': 'dp', '5,7': 'dp', '6,7': 'dp',

    // Flower Farm (4,12) -> center via col 9
    '4,11': 'dp', '4,10': 'dp', '4,9': 'dp',
    '5,9': 'dp', '6,9': 'dp',

    // Quarry (12,3) -> center via col 7
    '12,4': 'dp', '12,5': 'dp', '12,6': 'dp', '12,7': 'dp',
    '11,7': 'dp', '10,7': 'dp',

    // Mine (12,11) -> center via col 9
    '12,10': 'dp', '12,9': 'dp',
    '11,9': 'dp', '10,9': 'dp',

    // Woodshop (5,9) -> already on path

    // Jewelshop (6,13) -> center
    '6,12': 'dp', '6,11': 'dp', '6,10': 'dp', '6,9': 'dp',

    // Gem Cave (11,6) -> center
    '11,7': 'dp', '10,7': 'dp',
};

interface BuildingDef {
    row: number;
    col: number;
    label: string;
    spriteKey?: string;
    showExclaim?: boolean;
    isGiftBox?: boolean;
    originY: number;
    scale: number;
    offX: number;
    offY: number;
}

const BUILDINGS: BuildingDef[] = [
    { row: 8, col: 8, label: '선물상자', spriteKey: 'box_empty', isGiftBox: true,
      originY: 0.6, scale: 1.3, offX: 1.5, offY: 0 },
    { row: 3, col: 4, label: '나무밭', spriteKey: 'woodfarm', showExclaim: true,
      originY: 0.71, scale: 1.2, offX: 0, offY: 0 },
    { row: 4, col: 12, label: '꽃밭', spriteKey: 'flowerfarm',
      originY: 0.56, scale: 1.1, offX: 0, offY: -2 },
    { row: 12, col: 3, label: '채석장', spriteKey: 'quarry',
      originY: 0.62, scale: 1.05, offX: 0, offY: -2 },
    { row: 5, col: 9, label: '목공방', spriteKey: 'woodshop',
      originY: 0.63, scale: 1.25, offX: 0.5, offY: -3 },
    { row: 12, col: 11, label: '광산', spriteKey: 'mine',
      originY: 0.59, scale: 1.1, offX: 3, offY: -3.5 },
    { row: 6, col: 13, label: '세공소', spriteKey: 'jewelshop',
      originY: 0.69, scale: 1.1, offX: -0.5, offY: -2 },
    { row: 11, col: 6, label: '수정동굴', spriteKey: 'gemcave',
      originY: 0.64, scale: 1.1, offX: 0, offY: -3 },
];

const LABEL_HIDE_ZOOM = 0.35;

interface LabelEntry {
    text: Phaser.GameObjects.Text;
    x: number;
    y: number;
    baseFontSize: number;
}

export class GameScene extends Scene {
    private isDragging = false;
    private dragStartX = 0;
    private dragStartY = 0;
    private labels: LabelEntry[] = [];
    private exclaimContainers: Phaser.GameObjects.Container[] = [];

    // Build mode
    private buildHighlights: Phaser.GameObjects.Graphics | null = null;
    private constructionSprites: Map<string, Phaser.GameObjects.Container> = new Map();
    private storeUnsub: (() => void) | null = null;
    private occupiedTiles: Set<string> = new Set();

    constructor() {
        super('GameScene');
    }

    create() {
        const cam = this.cameras.main;
        const center = this.toScreen(GRID_SIZE / 2, GRID_SIZE / 2);
        cam.scrollX = center.x - cam.width / 2;
        cam.scrollY = center.y - cam.height / 2 - 50 * DPR;

        this.drawGround();
        this.initOccupiedTiles();
        this.placeBuildings();
        this.setupCameraDrag();
        this.setupBuildMode();
        this.restoreConstructions();
        this.updateLabels(0.5);

        EventBus.emit('current-scene-ready', this);
    }

    destroy() {
        if (this.storeUnsub) this.storeUnsub();
    }

    private toScreen(row: number, col: number): { x: number; y: number } {
        return {
            x: (col - row) * (TILE_W / 2) + 1200 * DPR,
            y: (col + row) * (TILE_H / 2) + 200 * DPR,
        };
    }

    private toGrid(worldX: number, worldY: number): { row: number; col: number } {
        const nx = worldX - 1200 * DPR;
        const ny = worldY - 200 * DPR;
        const col = (nx / (TILE_W / 2) + ny / (TILE_H / 2)) / 2;
        const row = (ny / (TILE_H / 2) - nx / (TILE_W / 2)) / 2;
        return { row: Math.round(row), col: Math.round(col) };
    }

    private drawGround() {
        const EXT = 25;
        const gfx = this.add.graphics();
        gfx.setDepth(0);

        // CoC-style colors
        // Muted green tones to match AI building base colors
        const GREEN_LIGHT = 0x6aad5a;
        const GREEN_DARK = 0x5c9e4c;
        const SIDE_TOP = 0x4d8a3c;
        const SIDE_BOTTOM = 0x3f7530;
        const SIDE_H = TILE_H * 0.12; // thin side edge

        for (let row = -EXT; row < GRID_SIZE + EXT; row++) {
            for (let col = -EXT; col < GRID_SIZE + EXT; col++) {
                const { x, y } = this.toScreen(row, col);

                // 2x2 checker: use (row+col) % 2 for subtle variation
                const isLight = (row + col) % 2 === 0;
                const topColor = isLight ? GREEN_LIGHT : GREEN_DARK;

                // Top face (flat diamond)
                gfx.fillStyle(topColor, 1);
                gfx.beginPath();
                gfx.moveTo(x, y - TILE_H / 2);
                gfx.lineTo(x + TILE_W / 2, y);
                gfx.lineTo(x, y + TILE_H / 2);
                gfx.lineTo(x - TILE_W / 2, y);
                gfx.closePath();
                gfx.fillPath();

                // Thin side edge (left face)
                gfx.fillStyle(SIDE_TOP, 1);
                gfx.beginPath();
                gfx.moveTo(x - TILE_W / 2, y);
                gfx.lineTo(x, y + TILE_H / 2);
                gfx.lineTo(x, y + TILE_H / 2 + SIDE_H);
                gfx.lineTo(x - TILE_W / 2, y + SIDE_H);
                gfx.closePath();
                gfx.fillPath();

                // Thin side edge (right face)
                gfx.fillStyle(SIDE_BOTTOM, 1);
                gfx.beginPath();
                gfx.moveTo(x + TILE_W / 2, y);
                gfx.lineTo(x, y + TILE_H / 2);
                gfx.lineTo(x, y + TILE_H / 2 + SIDE_H);
                gfx.lineTo(x + TILE_W / 2, y + SIDE_H);
                gfx.closePath();
                gfx.fillPath();
            }
        }


        // Camera bounds - tight around the building area with small margin
        const margin = 3;
        const top = this.toScreen(-margin, -margin);
        const right = this.toScreen(-margin, GRID_SIZE + margin);
        const bottom = this.toScreen(GRID_SIZE + margin, GRID_SIZE + margin);
        const left = this.toScreen(GRID_SIZE + margin, -margin);

        const boundsX = left.x - TILE_W;
        const boundsY = top.y - TILE_H * 2;
        const boundsW = (right.x - left.x) + TILE_W * 2;
        const boundsH = (bottom.y - top.y) + TILE_H * 4;
        this.cameras.main.setBounds(boundsX, boundsY, boundsW, boundsH);
    }

    private createShadowTexture() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(0,0,0,0.25)');
        gradient.addColorStop(0.4, 'rgba(0,0,0,0.15)');
        gradient.addColorStop(0.7, 'rgba(0,0,0,0.06)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        this.textures.addCanvas('shadow_gradient', canvas);
    }

    private placeBuildings() {
        // Create shadow texture once
        if (!this.textures.exists('shadow_gradient')) {
            this.createShadowTexture();
        }

        const storeBuildings = useGameStore.getState().buildings;
        // Build the list using store positions (user-placed) over hardcoded defaults
        const sorted = [...BUILDINGS]
            .filter(b => {
                const dataDef = DATA_BUILDINGS.find(d => d.spriteKey === b.spriteKey);
                if (!dataDef) return true;
                const bs = storeBuildings[dataDef.id];
                return bs?.built ?? false;
            })
            .map(b => {
                const dataDef = DATA_BUILDINGS.find(d => d.spriteKey === b.spriteKey);
                if (dataDef) {
                    const bs = storeBuildings[dataDef.id];
                    if (bs?.position) {
                        return { ...b, row: bs.position.row, col: bs.position.col };
                    }
                }
                return b;
            })
            .sort((a, b) => (a.row + a.col) - (b.row + b.col));

        for (const b of sorted) {
            const { x, y } = this.toScreen(b.row, b.col);
            const depth = (b.row + b.col) * 10;
            let topY: number;

            // Shadow - single radial gradient ellipse
            const shadow = this.add.image(x, y + 4 * DPR, 'shadow_gradient');
            shadow.setDisplaySize(TILE_W * 1.3, TILE_H * 0.8);
            shadow.setDepth(depth);

            if (b.spriteKey) {
                const bx = x + (b.offX || 0) * DPR;
                const by = y + (b.offY || 0) * DPR;
                const sprite = this.add.image(bx, by, b.spriteKey);
                const scale = TILE_W * b.scale / sprite.width;
                sprite.setScale(scale);
                sprite.setOrigin(0.5, b.originY);
                sprite.setDepth(depth + 2);
                topY = y - sprite.displayHeight * 0.5;

                // Gift box sparkles
                if (b.isGiftBox) {
                    for (let i = 0; i < 6; i++) {
                        const sx = x + Phaser.Math.Between(-50 * DPR, 50 * DPR);
                        const sy = topY + Phaser.Math.Between(-20 * DPR, 30 * DPR);
                        const star = this.add.text(sx, sy, '✨', { fontSize: `${14 * DPR}px` })
                            .setDepth(depth + 4).setAlpha(0);
                        this.tweens.add({
                            targets: star,
                            alpha: { from: 0, to: 0.9 },
                            y: sy - 12 * DPR,
                            duration: 1200 + i * 200,
                            delay: i * 350,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut',
                        });
                    }
                }
            } else if (b.isoBox) {
                // Use IsoBox (gift box)
                const boxY = y + TILE_H * 0.15;
                const box = this.add.isobox(x, boxY, b.isoBox.size, b.isoBox.height, b.isoBox.top, b.isoBox.left, b.isoBox.right);
                box.setDepth(depth + 2);
                topY = boxY - b.isoBox.height;

                // Gift box decorations
                const ribbonGfx = this.add.graphics();
                ribbonGfx.setDepth(depth + 3);

                ribbonGfx.lineStyle(4 * DPR, 0xffd700, 0.95);
                ribbonGfx.lineBetween(
                    x - b.isoBox.size / 2 + 12 * DPR, topY,
                    x + b.isoBox.size / 2 - 12 * DPR, topY
                );
                ribbonGfx.lineBetween(
                    x, topY - b.isoBox.size / 4 + 5 * DPR,
                    x, topY + b.isoBox.size / 4 - 5 * DPR
                );

                ribbonGfx.fillStyle(0xffd700, 1);
                ribbonGfx.fillCircle(x - 6 * DPR, topY - 6 * DPR, 6 * DPR);
                ribbonGfx.fillCircle(x + 6 * DPR, topY - 6 * DPR, 6 * DPR);
                ribbonGfx.fillCircle(x, topY - 3 * DPR, 5 * DPR);

                for (let i = 0; i < 6; i++) {
                    const sx = x + Phaser.Math.Between(-55 * DPR, 55 * DPR);
                    const sy = topY + Phaser.Math.Between(-30 * DPR, 15 * DPR);
                    const star = this.add.text(sx, sy, '✨', { fontSize: `${14 * DPR}px` })
                        .setDepth(depth + 4).setAlpha(0);
                    this.tweens.add({
                        targets: star,
                        alpha: { from: 0, to: 0.9 },
                        y: sy - 12 * DPR,
                        duration: 1200 + i * 200,
                        delay: i * 350,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut',
                    });
                }
            } else {
                topY = y - 30 * DPR;
            }

            // Label
            const labelPosY = topY - 18 * DPR;
            const baseFontSize = (b.isGiftBox ? 15 : 13) * DPR;

            const labelText = this.add.text(x, labelPosY, b.label, {
                fontSize: `${baseFontSize}px`,
                color: '#ffffff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3 * DPR,
                resolution: window.devicePixelRatio || 3,
            }).setOrigin(0.5).setDepth(depth + 6);

            this.labels.push({ text: labelText, x, y: labelPosY, baseFontSize });

            // Harvest exclamation
            if (b.showExclaim) {
                const exContainer = this.add.container(x + 35 * DPR, topY - 30 * DPR);
                exContainer.setDepth(depth + 7);

                const exBg = this.add.graphics();
                exBg.fillStyle(0xff3b30, 1);
                const er = 15 * DPR;
                exBg.fillRoundedRect(-er, -er, er * 2, er * 2, er);
                exBg.lineStyle(2.5 * DPR, 0xffffff, 0.9);
                exBg.strokeRoundedRect(-er, -er, er * 2, er * 2, er);

                const exText = this.add.text(0, -1 * DPR, '!', {
                    fontSize: `${20 * DPR}px`,
                    fontStyle: 'bold',
                    color: '#ffffff',
                    fontFamily: 'system-ui, sans-serif',
                    resolution: window.devicePixelRatio || 3,
                }).setOrigin(0.5);

                exContainer.add([exBg, exText]);
                this.exclaimContainers.push(exContainer);

                const baseY = exContainer.y;
                this.tweens.add({
                    targets: exContainer,
                    y: baseY - 8 * DPR,
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut',
                });
            }
        }
    }

    private updateLabels(zoom: number) {
        const visible = zoom >= LABEL_HIDE_ZOOM;

        for (const label of this.labels) {
            label.text.setVisible(visible);

            if (visible) {
                const dynamicSize = Math.round(label.baseFontSize / Math.pow(zoom, 0.5));
                const strokeThick = Math.max(2, Math.round(3 * DPR / Math.pow(zoom, 0.5)));
                label.text.setFontSize(dynamicSize);
                label.text.setStroke('#000000', strokeThick);
                label.text.setPosition(label.x, label.y);
                label.text.setOrigin(0.5);
            }
        }

        for (const ex of this.exclaimContainers) {
            ex.setVisible(visible);
            if (visible) {
                ex.setScale(1 / Math.pow(zoom, 0.5));
            }
        }
    }

    private initOccupiedTiles() {
        this.occupiedTiles.clear();
        // Mark all building positions as occupied (from BUILDINGS data + store)
        for (const b of BUILDINGS) {
            this.occupiedTiles.add(`${b.row},${b.col}`);
        }
        // Also mark path tiles as occupied
        for (const key of Object.keys(TILE_MAP)) {
            this.occupiedTiles.add(key);
        }
        // Mark store buildings that have positions
        const storeBuildings = useGameStore.getState().buildings;
        for (const [, bs] of Object.entries(storeBuildings)) {
            if (bs.position) {
                this.occupiedTiles.add(`${bs.position.row},${bs.position.col}`);
            }
        }
    }

    private setupBuildMode() {
        // Create a graphics object for build mode highlights (reused)
        this.buildHighlights = this.add.graphics();
        this.buildHighlights.setDepth(1);
        this.buildHighlights.setVisible(false);

        // Subscribe to store buildMode changes
        this.storeUnsub = useGameStore.subscribe((state, prev) => {
            // Build mode changed
            if (state.buildMode !== prev.buildMode) {
                if (state.buildMode) {
                    this.showBuildHighlights();
                } else {
                    this.hideBuildHighlights();
                }
            }

            // Check for newly completed buildings
            for (const [id, bs] of Object.entries(state.buildings)) {
                const prevBs = prev.buildings[id];
                if (bs.built && prevBs && !prevBs.built && bs.position) {
                    this.onConstructionComplete(id, bs.position.row, bs.position.col);
                }
            }
        });
    }

    private showBuildHighlights() {
        if (!this.buildHighlights) return;
        this.buildHighlights.clear();
        this.buildHighlights.setVisible(true);

        // Highlight tiles: green = buildable, red = occupied
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const key = `${row},${col}`;
                const occupied = this.occupiedTiles.has(key);
                const { x, y } = this.toScreen(row, col);

                // Fill
                this.buildHighlights.fillStyle(occupied ? 0xff4444 : 0x44ff88, occupied ? 0.2 : 0.3);
                this.buildHighlights.beginPath();
                this.buildHighlights.moveTo(x, y - TILE_H / 2);
                this.buildHighlights.lineTo(x + TILE_W / 2, y);
                this.buildHighlights.lineTo(x, y + TILE_H / 2);
                this.buildHighlights.lineTo(x - TILE_W / 2, y);
                this.buildHighlights.closePath();
                this.buildHighlights.fillPath();

                // Border
                this.buildHighlights.lineStyle(2 * DPR, occupied ? 0xcc2222 : 0x22cc66, occupied ? 0.4 : 0.6);
                this.buildHighlights.beginPath();
                this.buildHighlights.moveTo(x, y - TILE_H / 2);
                this.buildHighlights.lineTo(x + TILE_W / 2, y);
                this.buildHighlights.lineTo(x, y + TILE_H / 2);
                this.buildHighlights.lineTo(x - TILE_W / 2, y);
                this.buildHighlights.closePath();
                this.buildHighlights.strokePath();
            }
        }
    }

    private hideBuildHighlights() {
        if (!this.buildHighlights) return;
        this.buildHighlights.clear();
        this.buildHighlights.setVisible(false);
    }

    private handleTileTap(worldX: number, worldY: number) {
        const state = useGameStore.getState();
        if (!state.buildMode) return;

        const { row, col } = this.toGrid(worldX, worldY);

        // Validate: in bounds
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

        // Validate: not occupied
        const key = `${row},${col}`;
        if (this.occupiedTiles.has(key)) return;

        // Emit event to React to handle construction
        EventBus.emit('tile-tapped', { buildingId: state.buildMode.buildingId, row, col });
    }

    public placeConstructionPlaceholder(buildingId: string, row: number, col: number) {
        // Mark tile as occupied
        this.occupiedTiles.add(`${row},${col}`);

        const { x, y } = this.toScreen(row, col);
        const depth = (row + col) * 10;

        const container = this.add.container(x, y);
        container.setDepth(depth + 2);

        // Construction base - semi-transparent building shape
        const def = DATA_BUILDINGS.find(b => b.id === buildingId);
        if (def && this.textures.exists(def.spriteKey)) {
            const preview = this.add.image(
                (def.offX || 0) * DPR,
                (def.offY || 0) * DPR,
                def.spriteKey
            );
            const scale = TILE_W * def.scale / preview.width;
            preview.setScale(scale);
            preview.setOrigin(0.5, def.originY);
            preview.setAlpha(0.35);
            preview.setTint(0xaaaaaa);
            container.add(preview);
        }

        // Construction scaffolding sprite
        const scaffoldH = TILE_H * 1.2; // height reference for timer/bar positioning
        if (this.textures.exists('construction')) {
            const scaffold = this.add.image(0, 0, 'construction');
            const scaffoldScale = TILE_W * 1.0 / scaffold.width;
            scaffold.setScale(scaffoldScale);
            scaffold.setOrigin(0.5, 0.75);
            scaffold.setAlpha(0.9);
            container.add(scaffold);
        }

        // Timer text
        const timerText = this.add.text(0, -scaffoldH - 20 * DPR, '', {
            fontSize: `${14 * DPR}px`,
            color: '#ffffff',
            fontFamily: 'Fredoka, system-ui, sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3 * DPR,
            resolution: window.devicePixelRatio || 3,
        }).setOrigin(0.5);
        container.add(timerText);

        // Progress bar background
        const barW = TILE_W * 0.6;
        const barH = 8 * DPR;
        const barY = -scaffoldH - 30 * DPR;
        const barBg = this.add.graphics();
        barBg.fillStyle(0x333333, 0.7);
        barBg.fillRoundedRect(-barW / 2, barY, barW, barH, 3 * DPR);
        container.add(barBg);

        const barFill = this.add.graphics();
        container.add(barFill);

        // Store the building state start time
        const storeState = useGameStore.getState().buildings[buildingId];
        const startedAt = storeState?.constructionStartedAt ?? Date.now();

        // Update timer every second
        const timerEvent = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => {
                const elapsed = Date.now() - startedAt;
                const remaining = Math.max(0, CONSTRUCTION_TIME_MS - elapsed);
                const progress = Math.min(1, elapsed / CONSTRUCTION_TIME_MS);

                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);

                // Update progress bar
                barFill.clear();
                barFill.fillStyle(0x44cc66, 0.9);
                barFill.fillRoundedRect(-barW / 2, barY, barW * progress, barH, 3 * DPR);

                if (remaining <= 0) {
                    timerEvent.destroy();
                }
            },
        });

        // Pulsing animation on scaffold
        this.tweens.add({
            targets: scaffoldGfx,
            alpha: { from: 0.6, to: 0.9 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        this.constructionSprites.set(buildingId, container);
    }

    private onConstructionComplete(buildingId: string, row: number, col: number) {
        // Remove construction placeholder
        const container = this.constructionSprites.get(buildingId);
        if (container) {
            container.destroy();
            this.constructionSprites.delete(buildingId);
        }

        // Place the actual building sprite
        const def = DATA_BUILDINGS.find(b => b.id === buildingId);
        if (!def) return;

        const { x, y } = this.toScreen(row, col);
        const depth = (row + col) * 10;

        // Shadow
        if (!this.textures.exists('shadow_gradient')) {
            this.createShadowTexture();
        }
        const shadow = this.add.image(x, y + 4 * DPR, 'shadow_gradient');
        shadow.setDisplaySize(TILE_W * 1.3, TILE_H * 0.8);
        shadow.setDepth(depth);

        // Building sprite
        if (this.textures.exists(def.spriteKey)) {
            const bx = x + (def.offX || 0) * DPR;
            const by = y + (def.offY || 0) * DPR;
            const sprite = this.add.image(bx, by, def.spriteKey);
            const scale = TILE_W * def.scale / sprite.width;
            sprite.setScale(scale);
            sprite.setOrigin(0.5, def.originY);
            sprite.setDepth(depth + 2);

            // Pop-in animation
            sprite.setScale(0);
            this.tweens.add({
                targets: sprite,
                scaleX: scale,
                scaleY: scale,
                duration: 400,
                ease: 'Back.easeOut',
            });

            // Label
            const topY = y - sprite.displayHeight * 0.5;
            const labelPosY = topY - 18 * DPR;
            const baseFontSize = 13 * DPR;

            const labelText = this.add.text(x, labelPosY, def.name, {
                fontSize: `${baseFontSize}px`,
                color: '#ffffff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3 * DPR,
                resolution: window.devicePixelRatio || 3,
            }).setOrigin(0.5).setDepth(depth + 6);

            this.labels.push({ text: labelText, x, y: labelPosY, baseFontSize });
            this.updateLabels(this.cameras.main.zoom);
        }
    }

    private restoreConstructions() {
        // Restore any in-progress constructions from store
        const storeBuildings = useGameStore.getState().buildings;
        for (const [id, bs] of Object.entries(storeBuildings)) {
            if (!bs.built && bs.constructionStartedAt && bs.position) {
                const elapsed = Date.now() - bs.constructionStartedAt;
                if (elapsed < CONSTRUCTION_TIME_MS) {
                    this.placeConstructionPlaceholder(id, bs.position.row, bs.position.col);
                } else {
                    // Construction should have completed - complete it now
                    useGameStore.getState().completeConstruction(id);
                }
            }
        }
    }

    public goToGiftBox() {
        // Find the gift box building
        const giftBox = BUILDINGS.find(b => b.isGiftBox);
        if (!giftBox) return;

        const { x, y } = this.toScreen(giftBox.row, giftBox.col);
        const cam = this.cameras.main;

        // Smooth pan to gift box (respects camera bounds)
        this.tweens.add({
            targets: cam,
            scrollX: x - cam.width / 2,
            scrollY: y - cam.height / 2,
            duration: 500,
            ease: 'Sine.easeInOut',
        });
    }

    private setupCameraDrag() {
        const cam = this.cameras.main;
        let lastPinchDist = 0;
        let velocityX = 0;
        let velocityY = 0;

        const MIN_ZOOM = 0.5;
        const MAX_ZOOM = 1.2;

        cam.setZoom(0.65);
        this.updateLabels(0.65);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDragging = false;
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
            velocityX = 0;
            velocityY = 0;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            const pointer1 = this.input.pointer1;
            const pointer2 = this.input.pointer2;

            if (pointer1.isDown && pointer2.isDown) {
                const dist = Phaser.Math.Distance.Between(
                    pointer1.x, pointer1.y,
                    pointer2.x, pointer2.y
                );

                if (lastPinchDist > 0) {
                    const scale = dist / lastPinchDist;
                    const newZoom = Phaser.Math.Clamp(cam.zoom * scale, MIN_ZOOM, MAX_ZOOM);
                    cam.setZoom(newZoom);
                    this.updateLabels(newZoom);
                }

                lastPinchDist = dist;
                return;
            }

            lastPinchDist = 0;

            const dx = pointer.x - pointer.prevPosition.x;
            const dy = pointer.y - pointer.prevPosition.y;

            // In build mode: no camera dragging, all touches are tile taps
            if (useGameStore.getState().buildMode) return;

            if (Math.abs(pointer.x - this.dragStartX) > 5 || Math.abs(pointer.y - this.dragStartY) > 5) {
                this.isDragging = true;
            }

            if (this.isDragging) {
                const moveX = dx / cam.zoom;
                const moveY = dy / cam.zoom;
                cam.scrollX -= moveX;
                cam.scrollY -= moveY;
                velocityX = moveX;
                velocityY = moveY;
            }
        });

        this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            lastPinchDist = 0;

            // In build mode: always treat as a tap (camera drag is disabled)
            if (useGameStore.getState().buildMode) {
                const worldPoint = cam.getWorldPoint(pointer.x, pointer.y);
                this.handleTileTap(worldPoint.x, worldPoint.y);
            }
        });

        // Inertia - smooth deceleration after drag
        this.events.on('update', () => {
            if (!this.input.activePointer.isDown && (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5)) {
                cam.scrollX -= velocityX;
                cam.scrollY -= velocityY;
                velocityX *= 0.92;
                velocityY *= 0.92;
            }
        });

        // Smooth zoom with wheel
        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const targetZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, MIN_ZOOM, MAX_ZOOM);
            this.tweens.add({
                targets: cam,
                zoom: targetZoom,
                duration: 150,
                ease: 'Sine.easeOut',
                onUpdate: () => this.updateLabels(cam.zoom),
            });
        });
    }
}
