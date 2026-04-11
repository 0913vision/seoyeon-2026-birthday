import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { useGameStore } from '../../store/useGameStore';
import { BUILDINGS as DATA_BUILDINGS, HARVESTABLE_BUILDINGS } from '../../data/buildings';
import { TERRAIN, BUILDING_TERRAIN_REQUIRE, isAdjacentToTerrain, terrainCells } from '../../data/terrain';
import { BUBBLE_CONFIG, BUBBLE_OFFSETS } from '../../data/bubbleConfig';
import { PRODUCTION } from '../../data/resources';
import { PARTS } from '../../data/parts';
import { hasWorkshopNew } from '../../store/badges';
import { boxStageFromAttachedCount } from '../../store/useGameStore';
import { computeHarvest, formatRemaining } from '../harvestCalc';

const DPR = window.devicePixelRatio || 1;
const TILE_W = 110 * DPR;
const TILE_H = Math.round(110 * 0.58) * DPR; // calibrated ratio 0.58
const GRID_SIZE = 16;
const CONSTRUCTION_TIME_MS = 10_000; // 10 seconds for debug

const GRASS_LIGHT = [0x6dbe82, 0x70c386, 0x6bba7e, 0x75c88a, 0x68b67a];
const GRASS_DARK = [0x5aaa6e, 0x5dae72, 0x58a66a, 0x62b276, 0x56a266];
const DIRT_COLORS = { fill: 0xa08660, highlight: 0xb89870, shadow: 0x886e48 };
const STONE_COLORS = { fill: 0xb0aaa5, highlight: 0xc8c2bd, shadow: 0x908a85 };

// Paths extending in 4 directions from gift box (8,8) all the way into the
// non-buildable extended ground area (rendered by drawGround with EXT padding).
const PATH_TILES: string[] = (() => {
    const PATH_REACH = 20; // how far beyond the 16x16 grid each arm reaches
    const out: string[] = [];
    // Up/Down arm at col 8
    for (let r = 8 - PATH_REACH; r <= 8 + PATH_REACH; r++) {
        if (r === 8) continue; // skip the gift box tile itself
        out.push(`${r},8`);
    }
    // Left/Right arm at row 8
    for (let c = 8 - PATH_REACH; c <= 8 + PATH_REACH; c++) {
        if (c === 8) continue;
        out.push(`8,${c}`);
    }
    return out;
})();

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
    { row: 3, col: 4, label: '나무밭', spriteKey: 'woodfarm',
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

interface HarvestBubble {
    kind: 'harvest' | 'workshop';
    buildingId: string;
    resId: string; // for harvest bubbles; empty string for workshop
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    text: Phaser.GameObjects.Text;
    icon: Phaser.GameObjects.Image | null;
    readyPulse: Phaser.Tweens.Tween | null;
    baseY: number;
    lastState: 'ready' | 'waiting' | 'idle';
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
    private buildModeAtPointerDown = false;
    private activeTouchCount = 0; // track real touch count via native events
    private pinchedThisGesture = false; // sticky: any 2-finger touch this gesture

    // Harvest bubbles
    private harvestBubbles: Map<string, HarvestBubble> = new Map();
    private tappedObject: { category: 'terrain' | 'harvest' | 'construction' | 'workshop' | 'giftbox'; id: string } | null = null;
    private harvestTickEvent: Phaser.Time.TimerEvent | null = null;

    // Workshop NEW badges (red pill over woodshop/jewelshop when new parts unlocked)
    private workshopNewBadges: Map<string, Phaser.GameObjects.Container> = new Map();

    // Gift box "!" badge (shown when there are collected, unattached parts)
    private giftBoxExclaim: Phaser.GameObjects.Container | null = null;

    // On-map gift box sprite, kept so we can swap its texture as the player
    // attaches parts (stage 1..7 → box_stage1..7).
    private giftBoxSprite: Phaser.GameObjects.Image | null = null;
    private giftBoxStage = 1;

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
        this.placeTerrain();
        this.placeBuildings();
        this.setupCameraDrag();
        this.setupBuildMode();
        this.restoreConstructions();
        this.updateLabels(0.5);

        // Tick harvest bubbles every 500ms
        this.harvestTickEvent = this.time.addEvent({
            delay: 500,
            loop: true,
            callback: () => this.updateHarvestBubbles(),
        });
        this.updateHarvestBubbles();

        EventBus.emit('current-scene-ready', this);
    }

    destroy() {
        if (this.storeUnsub) this.storeUnsub();
        if (this.harvestTickEvent) this.harvestTickEvent.destroy();
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

        // Draw paths (stone color overlay on grass)
        const PATH_FILL = 0xb0a898;
        const PATH_EDGE = 0x8a7f70;
        for (const key of PATH_TILES) {
            const [r, c] = key.split(',').map(Number);
            const { x, y } = this.toScreen(r, c);
            gfx.fillStyle(PATH_FILL, 1);
            gfx.beginPath();
            gfx.moveTo(x, y - TILE_H / 2);
            gfx.lineTo(x + TILE_W / 2, y);
            gfx.lineTo(x, y + TILE_H / 2);
            gfx.lineTo(x - TILE_W / 2, y);
            gfx.closePath();
            gfx.fillPath();
            // Thin border
            gfx.lineStyle(2 * DPR, PATH_EDGE, 0.6);
            gfx.beginPath();
            gfx.moveTo(x, y - TILE_H / 2);
            gfx.lineTo(x + TILE_W / 2, y);
            gfx.lineTo(x, y + TILE_H / 2);
            gfx.lineTo(x - TILE_W / 2, y);
            gfx.closePath();
            gfx.strokePath();
        }


        // Camera bounds - tight, asymmetric (more up, less down)
        const gridCenter = this.toScreen(GRID_SIZE / 2, GRID_SIZE / 2);
        const halfW = 6 * TILE_W;
        const upReach = 14 * TILE_H;
        const downReach = 10 * TILE_H;
        this.cameras.main.setBounds(
            gridCenter.x - halfW,
            gridCenter.y - upReach,
            halfW * 2,
            upReach + downReach
        );
    }

    private createShadowTexture() {
        const size = 128;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;

        const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        gradient.addColorStop(0, 'rgba(0,0,0,0.5)');
        gradient.addColorStop(0.4, 'rgba(0,0,0,0.35)');
        gradient.addColorStop(0.7, 'rgba(0,0,0,0.15)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        this.textures.addCanvas('shadow_gradient', canvas);
    }

    private placeTerrain() {
        if (!this.textures.exists('shadow_gradient')) {
            this.createShadowTexture();
        }
        for (const t of TERRAIN) {
            const w = t.width ?? 1;
            const h = t.height ?? 1;
            // Visual center of the multi-tile area
            const centerRow = t.row + (h - 1) / 2;
            const centerCol = t.col + (w - 1) / 2;
            const { x, y } = this.toScreen(centerRow, centerCol);
            // Use bottom-right cell for depth so it sorts correctly
            const depth = (t.row + h - 1 + t.col + w - 1) * 10;

            // Shadow (size proportional to area)
            const shadow = this.add.image(x, y + 4 * DPR, 'shadow_gradient');
            shadow.setDisplaySize(TILE_W * 1.3 * Math.max(w, h), TILE_H * 0.85 * Math.max(w, h));
            shadow.setAlpha(0.9);
            shadow.setDepth(depth);

            let topY = y - 30 * DPR;
            let labelX = x;
            if (this.textures.exists(t.spriteKey)) {
                const tx = x + (t.offX || 0) * DPR;
                const ty = y + (t.offY || 0) * DPR;
                const sprite = this.add.image(tx, ty, t.spriteKey);
                const scale = TILE_W * t.scale / sprite.width;
                sprite.setScale(scale);
                sprite.setOrigin(0.5, t.originY);
                sprite.setDepth(depth + 2);
                // Make terrain sprite tappable (pixel-perfect)
                sprite.setInteractive(this.input.makePixelPerfect());
                const tid = t.id;
                sprite.on('pointerdown', () => {
                    if (useGameStore.getState().buildMode) return;
                    if (this.activeTouchCount >= 2) return;
                    this.tappedObject = { category: 'terrain', id: tid };
                });
                // Match building label style: use displayHeight * 0.5 (visual top of content)
                topY = ty - sprite.displayHeight * 0.5;
                labelX = tx;
            }

            // (Building/terrain labels removed — sprites + tap modal convey identity)
            void labelX; void topY;
        }
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
                // Giftbox uses a dynamic stage texture (box_stage1..7) based on
                // partsAttached.length; other buildings use their static key.
                let initialKey = b.spriteKey;
                if (b.isGiftBox) {
                    const stage = boxStageFromAttachedCount(useGameStore.getState().partsAttached.length);
                    initialKey = `box_stage${stage}`;
                    this.giftBoxStage = stage;
                }
                const sprite = this.add.image(bx, by, initialKey);
                const scale = TILE_W * b.scale / sprite.width;
                sprite.setScale(scale);
                sprite.setOrigin(0.5, b.originY);
                sprite.setDepth(depth + 2);
                topY = y - sprite.displayHeight * 0.5;
                if (b.isGiftBox) this.giftBoxSprite = sprite;

                // Make sprite tappable (pixel-perfect so transparent areas don't block neighbors)
                const dataDef = DATA_BUILDINGS.find(d => d.spriteKey === b.spriteKey);
                if (dataDef) {
                    sprite.setInteractive(this.input.makePixelPerfect());
                    sprite.on('pointerdown', () => {
                        if (useGameStore.getState().buildMode) return;
                        if (this.activeTouchCount >= 2) return;
                        const id = dataDef.id;
                        let cat: 'giftbox' | 'workshop' | 'harvest';
                        if (id === 'box') cat = 'giftbox';
                        else if (id === 'woodshop' || id === 'jewelshop') cat = 'workshop';
                        else cat = 'harvest';
                        this.tappedObject = { category: cat, id };
                    });
                }

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
                    this.createGiftBoxExclaim(x, topY, depth);
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

            // (Label removed)

            // Floating bubble for harvestable buildings or workshops
            const dataDef = DATA_BUILDINGS.find(d => d.spriteKey === b.spriteKey);
            if (dataDef) {
                if (HARVESTABLE_BUILDINGS[dataDef.id]) {
                    this.createHarvestBubble(dataDef.id, x, topY, depth);
                } else if (dataDef.id === 'woodshop' || dataDef.id === 'jewelshop') {
                    this.createWorkshopBubble(dataDef.id, x, topY, depth);
                    this.createWorkshopNewBadge(dataDef.id, x, topY, depth);
                }
            }
        }
    }

    /** Small red "NEW" pill over a workshop, shown while it has unseen
     * unlocked parts. Visibility is driven by `updateWorkshopNewBadges`. */
    private createWorkshopNewBadge(buildingId: string, x: number, topY: number, depth: number) {
        if (this.workshopNewBadges.has(buildingId)) return;
        // Place a bit higher than the workshop bubble so they never overlap.
        const by = topY - 44 * DPR;
        const container = this.add.container(x, by);
        container.setDepth(9100 + depth);

        const bg = this.add.graphics();
        const padX = 8 * DPR;
        const padY = 3 * DPR;
        const label = this.add.text(0, 0, 'NEW', {
            fontSize: `${12 * DPR}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'Fredoka, system-ui, sans-serif',
            stroke: '#7a0010',
            strokeThickness: 2 * DPR,
            resolution: window.devicePixelRatio || 3,
        }).setOrigin(0.5, 0.5);

        const bgW = label.width + padX * 2;
        const bgH = label.height + padY * 2;
        const r = bgH / 2;
        bg.fillStyle(0x000000, 0.35);
        bg.fillRoundedRect(-bgW / 2 + 1 * DPR, -bgH / 2 + 2 * DPR, bgW, bgH, r);
        bg.fillStyle(0xef4444, 1);
        bg.fillRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, r);
        bg.lineStyle(2 * DPR, 0xffffff, 0.9);
        bg.strokeRoundedRect(-bgW / 2, -bgH / 2, bgW, bgH, r);

        container.add([bg, label]);
        container.setVisible(false);
        this.workshopNewBadges.set(buildingId, container);

        // Gentle bob animation
        this.tweens.add({
            targets: container,
            y: by - 3 * DPR,
            duration: 700,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    /** Show/hide each workshop NEW badge based on store state. */
    private updateWorkshopNewBadges() {
        const s = useGameStore.getState();
        for (const [id, container] of this.workshopNewBadges.entries()) {
            if (id !== 'woodshop' && id !== 'jewelshop') continue;
            const show = hasWorkshopNew(id, s.currentDay, s.seenNewDay[id]);
            if (container.visible !== show) container.setVisible(show);
        }
    }

    /** Round red "!" badge over the gift box, shown while there are
     * collected-but-not-attached parts waiting to be installed. */
    private createGiftBoxExclaim(x: number, topY: number, depth: number) {
        if (this.giftBoxExclaim) return;
        const by = topY - 34 * DPR;
        const container = this.add.container(x, by);
        container.setDepth(9100 + depth);

        const radius = 14 * DPR;
        const bg = this.add.graphics();
        // Soft shadow
        bg.fillStyle(0x000000, 0.35);
        bg.fillCircle(1 * DPR, 2 * DPR, radius);
        // Body
        bg.fillStyle(0xef4444, 1);
        bg.fillCircle(0, 0, radius);
        // Inner ring
        bg.lineStyle(2 * DPR, 0xffffff, 0.95);
        bg.strokeCircle(0, 0, radius);

        const label = this.add.text(0, 0, '!', {
            fontSize: `${18 * DPR}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'Fredoka, system-ui, sans-serif',
            stroke: '#7a0010',
            strokeThickness: 2 * DPR,
            resolution: window.devicePixelRatio || 3,
        }).setOrigin(0.5, 0.55);

        container.add([bg, label]);
        container.setVisible(false);
        this.giftBoxExclaim = container;

        // Gentle bob
        this.tweens.add({
            targets: container,
            y: by - 4 * DPR,
            duration: 650,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });
    }

    /** Show the gift box "!" when there are unattached collected parts. */
    private updateGiftBoxExclaim() {
        if (!this.giftBoxExclaim) return;
        const s = useGameStore.getState();
        const show = s.partsCompleted.some(id => !s.partsAttached.includes(id));
        if (this.giftBoxExclaim.visible !== show) this.giftBoxExclaim.setVisible(show);
    }

    /**
     * Swap the on-map gift box texture to match partsAttached.length.
     * When the stage changes we punch-scale the sprite briefly so the
     * player feels the box "growing" from the main view.
     */
    private updateGiftBoxStage() {
        if (!this.giftBoxSprite) return;
        const s = useGameStore.getState();
        const stage = boxStageFromAttachedCount(s.partsAttached.length);
        if (stage === this.giftBoxStage) return;

        const sprite = this.giftBoxSprite;
        const key = `box_stage${stage}`;
        if (!this.textures.exists(key)) {
            this.giftBoxStage = stage;
            return;
        }

        sprite.setTexture(key);
        this.giftBoxStage = stage;

        // Punch feedback
        const baseScaleX = sprite.scaleX;
        const baseScaleY = sprite.scaleY;
        this.tweens.add({
            targets: sprite,
            scaleX: baseScaleX * 1.08,
            scaleY: baseScaleY * 1.08,
            duration: 180,
            yoyo: true,
            ease: 'Sine.easeInOut',
        });
    }

    private createHarvestBubble(buildingId: string, x: number, topY: number, depth: number) {
        // Avoid duplicates
        if (this.harvestBubbles.has(buildingId)) return;

        const resId = HARVESTABLE_BUILDINGS[buildingId];
        if (!resId) return;

        // Position from config (per-building offset)
        const off = BUBBLE_OFFSETS[buildingId] ?? { offX: 0, offY: -20 };
        const bx = x + off.offX * DPR;
        const by = topY + off.offY * DPR;

        const container = this.add.container(bx, by);
        container.setDepth(9000 + depth);

        const bg = this.add.graphics();
        container.add(bg);

        const iconKey = `res_${resId}`;
        let icon: Phaser.GameObjects.Image | null = null;
        if (this.textures.exists(iconKey)) {
            icon = this.add.image(0, 0, iconKey);
            icon.setDisplaySize(BUBBLE_CONFIG.iconSize * DPR, BUBBLE_CONFIG.iconSize * DPR);
            container.add(icon);
        }

        const text = this.add.text(0, 0, '', {
            fontSize: `${BUBBLE_CONFIG.fontSize * DPR}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'Fredoka, system-ui, sans-serif',
            stroke: '#000000',
            strokeThickness: 3 * DPR,
            resolution: window.devicePixelRatio || 3,
        }).setOrigin(0, 0.5);
        container.add(text);

        // Visual-only: bubble does NOT receive input. Harvest happens
        // exclusively through the building tap → modal → hold-button flow.

        const bubble: HarvestBubble = {
            kind: 'harvest',
            buildingId,
            resId,
            container,
            bg,
            text,
            icon,
            readyPulse: null,
            baseY: by,
            lastState: 'waiting',
        };
        this.harvestBubbles.set(buildingId, bubble);

        this.renderBubble(bubble);
    }

    private createWorkshopBubble(buildingId: string, x: number, topY: number, depth: number) {
        if (this.harvestBubbles.has(buildingId)) return;
        // Use same offset as harvest bubbles; workshops share BUBBLE_OFFSETS fallback
        const off = BUBBLE_OFFSETS[buildingId] ?? { offX: 0, offY: -20 };
        const bx = x + off.offX * DPR;
        const by = topY + off.offY * DPR;

        const container = this.add.container(bx, by);
        container.setDepth(9000 + depth);

        const bg = this.add.graphics();
        container.add(bg);

        // Workshop bubble has no resource icon; just text
        const text = this.add.text(0, 0, '', {
            fontSize: `${BUBBLE_CONFIG.fontSize * DPR}px`,
            fontStyle: 'bold',
            color: '#ffffff',
            fontFamily: 'Fredoka, system-ui, sans-serif',
            stroke: '#000000',
            strokeThickness: 3 * DPR,
            resolution: window.devicePixelRatio || 3,
        }).setOrigin(0.5, 0.5);
        container.add(text);

        const bubble: HarvestBubble = {
            kind: 'workshop',
            buildingId,
            resId: '',
            container,
            bg,
            text,
            icon: null,
            readyPulse: null,
            baseY: by,
            lastState: 'idle',
        };
        this.harvestBubbles.set(buildingId, bubble);

        this.renderBubble(bubble);
    }

    private renderBubble(bubble: HarvestBubble) {
        if (bubble.kind === 'workshop') {
            this.renderWorkshopBubble(bubble);
            return;
        }

        const hs = useGameStore.getState().harvestStates[bubble.buildingId];
        if (!hs) return;
        const prod = PRODUCTION[bubble.resId as keyof typeof PRODUCTION];
        if (!prod) return;

        const info = computeHarvest(hs.lastHarvestAt, Date.now(), prod.cycle, prod.perCycle);
        const ready = info.percent >= 1;

        // Update text content first (so we can measure)
        if (ready) {
            bubble.text.setText(`+${info.amount}`);
        } else {
            bubble.text.setText(formatRemaining(info.msUntil100));
        }

        // Layout: [iconW][gap][textW] centered within the bubble
        const cfg = BUBBLE_CONFIG;
        const iconW = bubble.icon ? cfg.iconSize * DPR : 0;
        const gap = bubble.icon ? cfg.iconGap * DPR : 0;
        const textW = bubble.text.width;
        const contentW = iconW + gap + textW;

        // Icon centered vertically, placed on the left
        if (bubble.icon) {
            bubble.icon.setPosition(-contentW / 2 + iconW / 2, 0);
        }
        // Text left-aligned starts right after icon+gap
        bubble.text.setPosition(-contentW / 2 + iconW + gap, 0);

        // Bubble dimensions
        const padX = cfg.padX * DPR;
        const padY = cfg.padY * DPR;
        const bgW = contentW + padX * 2;
        const bgH = Math.max(cfg.iconSize * DPR, textW > 0 ? bubble.text.height : cfg.iconSize * DPR) + padY * 2;
        const r = cfg.cornerRadius > 0 ? cfg.cornerRadius * DPR : bgH / 2;
        const tailW = cfg.tailW * DPR;
        const tailH = cfg.tailH * DPR;
        const borderW = cfg.borderWidth * DPR;

        bubble.bg.clear();

        // Unified path: rounded rect + tail as one continuous closed shape
        const drawBubblePath = (offX: number, offY: number) => {
            const l = -bgW / 2 + offX;
            const rt = bgW / 2 + offX;
            const tp = -bgH / 2 + offY;
            const bt = bgH / 2 + offY;
            bubble.bg.beginPath();
            bubble.bg.moveTo(l + r, tp);
            bubble.bg.lineTo(rt - r, tp);
            bubble.bg.arc(rt - r, tp + r, r, -Math.PI / 2, 0);
            bubble.bg.lineTo(rt, bt - r);
            bubble.bg.arc(rt - r, bt - r, r, 0, Math.PI / 2);
            bubble.bg.lineTo(tailW / 2 + offX, bt);
            bubble.bg.lineTo(0 + offX, bt + tailH);
            bubble.bg.lineTo(-tailW / 2 + offX, bt);
            bubble.bg.lineTo(l + r, bt);
            bubble.bg.arc(l + r, bt - r, r, Math.PI / 2, Math.PI);
            bubble.bg.lineTo(l, tp + r);
            bubble.bg.arc(l + r, tp + r, r, Math.PI, Math.PI * 1.5);
            bubble.bg.closePath();
        };

        // Shadow
        bubble.bg.fillStyle(0x000000, 0.28);
        drawBubblePath(1 * DPR, 3 * DPR);
        bubble.bg.fillPath();

        // Body fill
        if (ready) {
            bubble.bg.fillStyle(0xfbbf24, 1);
        } else {
            bubble.bg.fillStyle(0x2a2018, 0.92);
        }
        drawBubblePath(0, 0);
        bubble.bg.fillPath();

        // Body stroke (continuous, no seam between body and tail)
        if (ready) {
            bubble.bg.lineStyle(borderW, 0xffffff, 1);
        } else {
            bubble.bg.lineStyle(borderW * 0.8, 0xc0a880, 0.95);
        }
        drawBubblePath(0, 0);
        bubble.bg.strokePath();

        // Pulse animation when ready; stop when not
        if (ready && bubble.lastState !== 'ready') {
            // Start pulse
            if (bubble.readyPulse) bubble.readyPulse.stop();
            bubble.container.y = bubble.baseY;
            bubble.readyPulse = this.tweens.add({
                targets: bubble.container,
                y: bubble.baseY - 6 * DPR,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            bubble.lastState = 'ready';
        } else if (!ready && bubble.lastState !== 'waiting') {
            if (bubble.readyPulse) {
                bubble.readyPulse.stop();
                bubble.readyPulse = null;
            }
            bubble.container.y = bubble.baseY;
            bubble.lastState = 'waiting';
        }
    }

    private updateHarvestBubbles() {
        for (const bubble of this.harvestBubbles.values()) {
            this.renderBubble(bubble);
        }
        this.updateWorkshopNewBadges();
        this.updateGiftBoxExclaim();
        this.updateGiftBoxStage();
    }

    private renderWorkshopBubble(bubble: HarvestBubble) {
        const state = useGameStore.getState();
        const slot = bubble.buildingId === 'woodshop' ? state.woodshopCrafting : state.jewelshopCrafting;

        // Idle: no part crafting → hide bubble
        if (slot.partId == null || slot.startedAt == null) {
            bubble.container.setVisible(false);
            if (bubble.readyPulse) { bubble.readyPulse.stop(); bubble.readyPulse = null; }
            bubble.container.y = bubble.baseY;
            bubble.lastState = 'idle';
            return;
        }

        bubble.container.setVisible(true);

        // Look up part for craft time
        const part = PARTS.find(p => p.id === slot.partId);
        if (!part) {
            bubble.container.setVisible(false);
            return;
        }

        const craftMs = part.craftTime * 60 * 1000;
        const elapsed = Math.max(0, Date.now() - slot.startedAt);
        const remainingMs = craftMs - elapsed;
        const ready = remainingMs <= 0;

        // Text: "제작 중 10:00" or "완료!"
        if (ready) {
            bubble.text.setText('완료!');
        } else {
            bubble.text.setText(formatRemaining(remainingMs));
        }

        // Layout & background
        const cfg = BUBBLE_CONFIG;
        const textW = bubble.text.width;
        bubble.text.setPosition(0, 0);

        const padX = cfg.padX * DPR;
        const padY = cfg.padY * DPR;
        const bgW = textW + padX * 2;
        const bgH = Math.max(cfg.iconSize * DPR, bubble.text.height) + padY * 2;
        const r = cfg.cornerRadius > 0 ? cfg.cornerRadius * DPR : bgH / 2;
        const tailW = cfg.tailW * DPR;
        const tailH = cfg.tailH * DPR;
        const borderW = cfg.borderWidth * DPR;

        bubble.bg.clear();
        const drawPath = (offX: number, offY: number) => {
            const l = -bgW / 2 + offX;
            const rt = bgW / 2 + offX;
            const tp = -bgH / 2 + offY;
            const bt = bgH / 2 + offY;
            bubble.bg.beginPath();
            bubble.bg.moveTo(l + r, tp);
            bubble.bg.lineTo(rt - r, tp);
            bubble.bg.arc(rt - r, tp + r, r, -Math.PI / 2, 0);
            bubble.bg.lineTo(rt, bt - r);
            bubble.bg.arc(rt - r, bt - r, r, 0, Math.PI / 2);
            bubble.bg.lineTo(tailW / 2 + offX, bt);
            bubble.bg.lineTo(0 + offX, bt + tailH);
            bubble.bg.lineTo(-tailW / 2 + offX, bt);
            bubble.bg.lineTo(l + r, bt);
            bubble.bg.arc(l + r, bt - r, r, Math.PI / 2, Math.PI);
            bubble.bg.lineTo(l, tp + r);
            bubble.bg.arc(l + r, tp + r, r, Math.PI, Math.PI * 1.5);
            bubble.bg.closePath();
        };

        // Shadow
        bubble.bg.fillStyle(0x000000, 0.28);
        drawPath(1 * DPR, 3 * DPR);
        bubble.bg.fillPath();

        // Body fill: green when ready, dark-brown while producing
        if (ready) {
            bubble.bg.fillStyle(0x22c55e, 1);
        } else {
            bubble.bg.fillStyle(0x2a2018, 0.92);
        }
        drawPath(0, 0);
        bubble.bg.fillPath();

        // Border
        if (ready) {
            bubble.bg.lineStyle(borderW, 0xffffff, 1);
        } else {
            bubble.bg.lineStyle(borderW * 0.8, 0xc0a880, 0.95);
        }
        drawPath(0, 0);
        bubble.bg.strokePath();

        // Pulse animation when ready
        if (ready && bubble.lastState !== 'ready') {
            if (bubble.readyPulse) bubble.readyPulse.stop();
            bubble.container.y = bubble.baseY;
            bubble.readyPulse = this.tweens.add({
                targets: bubble.container,
                y: bubble.baseY - 6 * DPR,
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
            bubble.lastState = 'ready';
        } else if (!ready && bubble.lastState !== 'waiting') {
            if (bubble.readyPulse) {
                bubble.readyPulse.stop();
                bubble.readyPulse = null;
            }
            bubble.container.y = bubble.baseY;
            bubble.lastState = 'waiting';
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

        // Bubbles stay at world scale (no zoom compensation) — they
        // naturally grow/shrink with pinch-zoom like the buildings do.
        for (const bubble of this.harvestBubbles.values()) {
            bubble.container.setVisible(visible);
        }
    }

    private initOccupiedTiles() {
        this.occupiedTiles.clear();
        // Mark built buildings from store as occupied
        const storeBuildings = useGameStore.getState().buildings;
        for (const [, bs] of Object.entries(storeBuildings)) {
            if (bs.built && bs.position) {
                this.occupiedTiles.add(`${bs.position.row},${bs.position.col}`);
            }
        }
        // Also mark in-progress constructions
        for (const [, bs] of Object.entries(storeBuildings)) {
            if (bs.position && bs.constructionStartedAt) {
                this.occupiedTiles.add(`${bs.position.row},${bs.position.col}`);
            }
        }
        // Mark pre-placed terrain tiles as occupied (multi-tile aware)
        for (const t of TERRAIN) {
            for (const c of terrainCells(t)) {
                this.occupiedTiles.add(`${c.row},${c.col}`);
            }
        }
        // Mark paths as occupied
        for (const key of PATH_TILES) {
            this.occupiedTiles.add(key);
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
        // Above everything in build mode so building tiles also show red
        this.buildHighlights.setDepth(9999);

        // Determine adjacency requirement for current build target
        const bm = useGameStore.getState().buildMode;
        const requiredTerrain = bm ? BUILDING_TERRAIN_REQUIRE[bm.buildingId] : undefined;

        // Highlight tiles
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const key = `${row},${col}`;
                const occupied = this.occupiedTiles.has(key);
                const { x, y } = this.toScreen(row, col);

                // Determine state: occupied (red), empty + invalid adjacency (yellow), empty + valid (green)
                let fillColor: number, fillAlpha: number, borderColor: number, innerColor: number;
                if (occupied) {
                    fillColor = 0xff2030; fillAlpha = 0.45;
                    borderColor = 0xff5060; innerColor = 0x880010;
                } else if (requiredTerrain && !isAdjacentToTerrain(row, col, requiredTerrain)) {
                    // Empty but doesn't meet adjacency requirement
                    fillColor = 0xffcc20; fillAlpha = 0.35;
                    borderColor = 0xffe060; innerColor = 0x886010;
                } else {
                    // Buildable
                    fillColor = 0x40ff60; fillAlpha = 0.55;
                    borderColor = 0x80ff90; innerColor = 0x108030;
                }

                this.buildHighlights.fillStyle(fillColor, fillAlpha);
                this.buildHighlights.beginPath();
                this.buildHighlights.moveTo(x, y - TILE_H / 2);
                this.buildHighlights.lineTo(x + TILE_W / 2, y);
                this.buildHighlights.lineTo(x, y + TILE_H / 2);
                this.buildHighlights.lineTo(x - TILE_W / 2, y);
                this.buildHighlights.closePath();
                this.buildHighlights.fillPath();

                this.buildHighlights.lineStyle(3 * DPR, borderColor, 1);
                this.buildHighlights.beginPath();
                this.buildHighlights.moveTo(x, y - TILE_H / 2);
                this.buildHighlights.lineTo(x + TILE_W / 2, y);
                this.buildHighlights.lineTo(x, y + TILE_H / 2);
                this.buildHighlights.lineTo(x - TILE_W / 2, y);
                this.buildHighlights.closePath();
                this.buildHighlights.strokePath();

                this.buildHighlights.lineStyle(1 * DPR, innerColor, 0.8);
                const inset = 2 * DPR;
                this.buildHighlights.beginPath();
                this.buildHighlights.moveTo(x, y - TILE_H / 2 + inset);
                this.buildHighlights.lineTo(x + TILE_W / 2 - inset, y);
                this.buildHighlights.lineTo(x, y + TILE_H / 2 - inset);
                this.buildHighlights.lineTo(x - TILE_W / 2 + inset, y);
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

    /**
     * Tutorial gate: decide whether a building/terrain tap should be
     * allowed through to the React layer. While `tutorialLock` is set,
     * only the one target specified by the current lock is interactive.
     */
    private tutorialAllowsTap(target: { category: string; id: string }): boolean {
        const lock = useGameStore.getState().tutorialLock;
        if (lock == null) return true;
        switch (lock) {
            case 'dialog_only':
            case 'build_button':
            case 'build_woodshop':
                // None of these allow arbitrary building taps.
                return false;
            case 'wood_farm':
                return target.category === 'harvest' && target.id === 'wood_farm';
            case 'woodshop':
                return target.category === 'workshop' && target.id === 'woodshop';
        }
    }

    private handleTileTap(worldX: number, worldY: number) {
        const state = useGameStore.getState();
        if (!state.buildMode) return;

        // Tutorial gate: in build mode, only let the player place the
        // tutorial-mandated building (woodshop) while lock is set.
        const lock = state.tutorialLock;
        if (lock != null && lock !== 'build_woodshop') return;
        if (lock === 'build_woodshop' && state.buildMode.buildingId !== 'woodshop') return;

        const { row, col } = this.toGrid(worldX, worldY);

        // Validate: in bounds
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

        // Validate: not occupied
        const key = `${row},${col}`;
        if (this.occupiedTiles.has(key)) return;

        // Validate: adjacency requirement (if any)
        const requiredTerrain = BUILDING_TERRAIN_REQUIRE[state.buildMode.buildingId];
        if (requiredTerrain && !isAdjacentToTerrain(row, col, requiredTerrain)) return;

        // Emit event to React to handle construction
        EventBus.emit('tile-tapped', { buildingId: state.buildMode.buildingId, row, col });
    }

    private handleObjectTap(worldX: number, worldY: number) {
        const { row, col } = this.toGrid(worldX, worldY);
        if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

        // 1) Check terrain (multi-tile aware)
        for (const t of TERRAIN) {
            for (const c of terrainCells(t)) {
                if (c.row === row && c.col === col) {
                    EventBus.emit('building-tapped', { category: 'terrain', id: t.id });
                    return;
                }
            }
        }

        // 2) Check buildings from store (built or under construction)
        const storeBuildings = useGameStore.getState().buildings;
        for (const [id, bs] of Object.entries(storeBuildings)) {
            if (!bs.position) continue;
            if (bs.position.row !== row || bs.position.col !== col) continue;

            // Under construction
            if (!bs.built && bs.constructionStartedAt) {
                EventBus.emit('building-tapped', { category: 'construction', id });
                return;
            }

            if (bs.built) {
                // Categorize built buildings
                if (id === 'box') {
                    EventBus.emit('building-tapped', { category: 'giftbox', id });
                    return;
                }
                if (id === 'woodshop' || id === 'jewelshop') {
                    EventBus.emit('building-tapped', { category: 'workshop', id });
                    return;
                }
                // All other built buildings = harvestable resource buildings
                EventBus.emit('building-tapped', { category: 'harvest', id });
                return;
            }
        }
    }

    public placeConstructionPlaceholder(buildingId: string, row: number, col: number) {
        // Mark tile as occupied
        this.occupiedTiles.add(`${row},${col}`);

        const { x, y } = this.toScreen(row, col);
        const depth = (row + col) * 10;

        const container = this.add.container(x, y);
        container.setDepth(depth + 2);

        // Construction-site stub. Uses the dedicated `construction` texture
        // (scaffold/site sprite), NOT a faded copy of the finished building.
        const scaffoldH = TILE_H * 1.2;
        const def = DATA_BUILDINGS.find(b => b.id === buildingId)
            || DATA_BUILDINGS.find(b => b.id === 'woodshop');
        if (this.textures.exists('construction')) {
            const preview = this.add.image(0, 0, 'construction');
            // Match the footprint roughly to a normal building (~1 tile wide).
            const scale = TILE_W * 1.0 / preview.width;
            preview.setScale(scale);
            preview.setOrigin(0.5, 0.75);
            preview.setDepth(0);
            // Tappable so the player can see the "under construction" modal.
            preview.setInteractive(this.input.makePixelPerfect());
            preview.on('pointerdown', () => {
                if (useGameStore.getState().buildMode) return;
                if (this.activeTouchCount >= 2) return;
                this.tappedObject = { category: 'construction', id: buildingId };
            });
            container.add(preview);
        } else if (def && this.textures.exists(def.spriteKey)) {
            // Fallback: faded building sprite if the construction asset is
            // missing (shouldn't happen in normal builds).
            const preview = this.add.image(
                (def.offX || 0) * DPR,
                (def.offY || 0) * DPR,
                def.spriteKey,
            );
            const scale = TILE_W * def.scale / preview.width;
            preview.setScale(scale);
            preview.setOrigin(0.5, def.originY);
            preview.setAlpha(0.4);
            preview.setInteractive(this.input.makePixelPerfect());
            preview.on('pointerdown', () => {
                if (useGameStore.getState().buildMode) return;
                if (this.activeTouchCount >= 2) return;
                this.tappedObject = { category: 'construction', id: buildingId };
            });
            container.add(preview);
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
        const isFrozen = startedAt === -1;

        if (isFrozen) {
            // Frozen test placeholder: fixed display, no countdown
            timerText.setText('TEST');
            barFill.fillStyle(0xfbbf24, 0.9);
            barFill.fillRoundedRect(-barW / 2, barY, barW * 0.5, barH, 3 * DPR);
        } else {
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
        }

        // Pulsing animation on preview
        if (container.list.length > 0) {
            this.tweens.add({
                targets: container,
                alpha: { from: 0.6, to: 0.9 },
                duration: 800,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

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
        if (!this.textures.exists(def.spriteKey)) return;
        const bx = x + (def.offX || 0) * DPR;
        const by = y + (def.offY || 0) * DPR;
        const sprite = this.add.image(bx, by, def.spriteKey);
        const scale = TILE_W * def.scale / sprite.width;
        sprite.setScale(scale);
        sprite.setOrigin(0.5, def.originY);
        sprite.setDepth(depth + 2);

        // Capture full-size displayHeight BEFORE pop-in scale reset
        const fullDisplayHeight = sprite.displayHeight;
        const topY = y - fullDisplayHeight * 0.5;

        // Pop-in animation
        sprite.setScale(0);
        this.tweens.add({
            targets: sprite,
            scaleX: scale,
            scaleY: scale,
            duration: 400,
            ease: 'Back.easeOut',
        });

        // Tap handler — same categorization as initial placeBuildings.
        // Without this the newly-built sprite would be inert.
        sprite.setInteractive(this.input.makePixelPerfect());
        sprite.on('pointerdown', () => {
            if (useGameStore.getState().buildMode) return;
            if (this.activeTouchCount >= 2) return;
            const id = def.id;
            let cat: 'giftbox' | 'workshop' | 'harvest';
            if (id === 'box') cat = 'giftbox';
            else if (id === 'woodshop' || id === 'jewelshop') cat = 'workshop';
            else cat = 'harvest';
            this.tappedObject = { category: cat, id };
        });

        // Floating bubble + NEW badge hookup (matches placeBuildings)
        if (HARVESTABLE_BUILDINGS[buildingId]) {
            this.createHarvestBubble(buildingId, x, topY, depth);
        } else if (buildingId === 'woodshop' || buildingId === 'jewelshop') {
            this.createWorkshopBubble(buildingId, x, topY, depth);
            this.createWorkshopNewBadge(buildingId, x, topY, depth);
        }
        this.updateHarvestBubbles();
    }

    private restoreConstructions() {
        // Restore any in-progress constructions from store. CRUCIAL: also
        // re-schedule the completion timer, since the original setTimeout
        // was thrown away when the page was reloaded (or the auto-save
        // preserved state after a crash).
        const storeBuildings = useGameStore.getState().buildings;
        for (const [id, bs] of Object.entries(storeBuildings)) {
            if (!bs.built && bs.constructionStartedAt && bs.position) {
                // Frozen test placeholder (constructionStartedAt = -1) - never completes
                if (bs.constructionStartedAt === -1) {
                    this.placeConstructionPlaceholder(id, bs.position.row, bs.position.col);
                    continue;
                }
                const elapsed = Date.now() - bs.constructionStartedAt;
                if (elapsed < CONSTRUCTION_TIME_MS) {
                    this.placeConstructionPlaceholder(id, bs.position.row, bs.position.col);
                    // Reschedule completion for the remaining time.
                    const remaining = CONSTRUCTION_TIME_MS - elapsed;
                    setTimeout(() => useGameStore.getState().completeConstruction(id), remaining);
                } else {
                    // Construction should have completed - complete it now
                    useGameStore.getState().completeConstruction(id);
                }
            }
        }
    }

    public goToGiftBox() {
        this.panToBuilding('box');
    }

    /**
     * Smooth pan the camera to a building by its id. Resolves the target
     * tile from the store (for built or in-progress buildings) or from the
     * static BUILDINGS list. Respects camera bounds.
     */
    public panToBuilding(id: string) {
        // Prefer live store position (handles player-placed buildings)
        const state = useGameStore.getState();
        const bs = state.buildings[id];
        let row: number | null = null;
        let col: number | null = null;
        if (bs?.position) {
            row = bs.position.row;
            col = bs.position.col;
        } else {
            const def = BUILDINGS.find(b => b.id === id);
            if (def) { row = def.row; col = def.col; }
        }
        if (row == null || col == null) return;

        const { x, y } = this.toScreen(row, col);
        const cam = this.cameras.main;
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

        // Track real touch count via native events (Phaser pointers get stuck)
        const canvas = this.game.canvas;
        const updateTouchCount = (e: TouchEvent) => {
            this.activeTouchCount = e.touches.length;
            if (this.activeTouchCount >= 2) {
                // Sticky: any time two fingers are down, mark this gesture as a pinch
                // so it never turns into a tap when the user releases.
                this.pinchedThisGesture = true;
                this.tappedObject = null;
            }
            if (this.activeTouchCount === 0) {
                // Gesture fully ended
                this.pinchedThisGesture = false;
            }
        };
        canvas.addEventListener('touchstart', updateTouchCount, { passive: true });
        canvas.addEventListener('touchend', updateTouchCount, { passive: true });
        canvas.addEventListener('touchcancel', updateTouchCount, { passive: true });
        let velocityY = 0;

        const MIN_ZOOM = 0.55;
        const MAX_ZOOM = 2.0;

        cam.setZoom(0.9);
        this.updateLabels(0.9);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDragging = false;
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
            velocityX = 0;
            velocityY = 0;
            // Record if build mode was active BEFORE this touch started
            this.buildModeAtPointerDown = !!useGameStore.getState().buildMode;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            const pointer1 = this.input.pointer1;
            const pointer2 = this.input.pointer2;

            // Pinch zoom: use native touch count (Phaser pointers can get stuck)
            if (this.activeTouchCount >= 2 && pointer1.isDown && pointer2.isDown) {
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

            // Suppress tap when this gesture ever had 2+ fingers (pinch),
            // even if it currently has 0 or 1.
            if (this.pinchedThisGesture) {
                this.tappedObject = null;
                return;
            }

            if (this.isDragging) {
                // Clear any pending taps since this was a drag
                this.tappedObject = null;
                return;
            }

            const bm = useGameStore.getState().buildMode;

            // Sprite-based object tap (pixel-perfect building/terrain)
            if (!bm && this.tappedObject) {
                const target = this.tappedObject;
                this.tappedObject = null;
                if (this.tutorialAllowsTap(target)) {
                    EventBus.emit('building-tapped', target);
                }
                return;
            }
            this.tappedObject = null;

            const worldPoint = cam.getWorldPoint(pointer.x, pointer.y);

            if (bm) {
                // In build mode: treat as tap if enough time since entering build mode
                if (Date.now() - bm.enteredAt > 500) {
                    this.handleTileTap(worldPoint.x, worldPoint.y);
                }
            }
            // Note: empty-tile tap outside build mode does nothing (no fallback)
        });

        // Inertia - smooth deceleration after drag (lower factor = snappier stop)
        this.events.on('update', () => {
            if (!this.input.activePointer.isDown && (Math.abs(velocityX) > 0.5 || Math.abs(velocityY) > 0.5)) {
                cam.scrollX -= velocityX * 0.5;
                cam.scrollY -= velocityY * 0.5;
                velocityX *= 0.80;
                velocityY *= 0.80;
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
