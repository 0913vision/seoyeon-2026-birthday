import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

const DPR = window.devicePixelRatio || 1;
const TILE_W = 110 * DPR;
const TILE_H = 55 * DPR;
const GRID_SIZE = 16;

const GRASS_COLORS = [0x5a9e6e, 0x5da872, 0x58a06a, 0x62ad76, 0x569c66];
const GRASS_DARK = [0x4e8c60, 0x508e62, 0x4c8a5c, 0x529066, 0x4a8858];

interface BuildingDef {
    row: number;
    col: number;
    label: string;
    size: number;
    height: number;
    topColor: number;
    leftColor: number;
    rightColor: number;
    showExclaim?: boolean;
    isGiftBox?: boolean;
}

const BUILDINGS: BuildingDef[] = [
    {
        row: 7, col: 7, label: '선물상자',
        size: 95 * DPR, height: 75 * DPR,
        topColor: 0xdc3545, leftColor: 0xb02a37, rightColor: 0x8b2131,
        isGiftBox: true,
    },
    {
        row: 3, col: 3, label: '나무밭',
        size: 70 * DPR, height: 30 * DPR,
        topColor: 0x3cb371, leftColor: 0x2e8b57, rightColor: 0x267349,
        showExclaim: true,
    },
    {
        row: 3, col: 11, label: '꽃밭',
        size: 70 * DPR, height: 24 * DPR,
        topColor: 0xf48fb1, leftColor: 0xe91e63, rightColor: 0xc2185b,
    },
    {
        row: 11, col: 3, label: '채석장',
        size: 70 * DPR, height: 38 * DPR,
        topColor: 0xa0adb5, leftColor: 0x8a9aa3, rightColor: 0x748690,
    },
    {
        row: 4, col: 8, label: '목공방',
        size: 68 * DPR, height: 44 * DPR,
        topColor: 0xd4a574, leftColor: 0xb8844f, rightColor: 0x9c6b3a,
    },
    {
        row: 11, col: 10, label: '광산',
        size: 65 * DPR, height: 40 * DPR,
        topColor: 0x6b7b8d, leftColor: 0x576a7a, rightColor: 0x475a68,
    },
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

    constructor() {
        super('GameScene');
    }

    create() {
        const cam = this.cameras.main;
        const center = this.toScreen(GRID_SIZE / 2, GRID_SIZE / 2);
        cam.scrollX = center.x - cam.width / 2;
        cam.scrollY = center.y - cam.height / 2 - 50;

        this.drawGround();
        this.placeBuildings();
        this.setupCameraDrag();
        this.updateLabels(0.55);

        EventBus.emit('current-scene-ready', this);
    }

    private toScreen(row: number, col: number): { x: number; y: number } {
        return {
            x: (col - row) * (TILE_W / 2) + 900 * DPR,
            y: (col + row) * (TILE_H / 2) + 200 * DPR,
        };
    }

    private drawGround() {
        const gfx = this.add.graphics();
        gfx.setDepth(0);

        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const { x, y } = this.toScreen(row, col);
                const colorIdx = (row * 3 + col * 7) % GRASS_COLORS.length;
                const isEven = (row + col) % 2 === 0;
                const color = isEven ? GRASS_COLORS[colorIdx] : GRASS_DARK[colorIdx];

                // Tile fill
                gfx.fillStyle(color, 1);
                gfx.beginPath();
                gfx.moveTo(x, y - TILE_H / 2);
                gfx.lineTo(x + TILE_W / 2, y);
                gfx.lineTo(x, y + TILE_H / 2);
                gfx.lineTo(x - TILE_W / 2, y);
                gfx.closePath();
                gfx.fillPath();

                // Subtle inner highlight on top-left edge
                gfx.lineStyle(1, 0xffffff, 0.06);
                gfx.beginPath();
                gfx.moveTo(x - TILE_W / 2 + 1, y);
                gfx.lineTo(x, y - TILE_H / 2 + 1);
                gfx.lineTo(x + TILE_W / 2 - 1, y);
                gfx.strokePath();

                // Bottom edge shadow
                gfx.lineStyle(1, 0x000000, 0.1);
                gfx.beginPath();
                gfx.moveTo(x + TILE_W / 2 - 1, y);
                gfx.lineTo(x, y + TILE_H / 2 - 1);
                gfx.lineTo(x - TILE_W / 2 + 1, y);
                gfx.strokePath();
            }
        }

        // Dirt path tiles
        const pathTiles = [
            [3, 3], [3, 4], [3, 5],
            [4, 3], [5, 3], [5, 4], [5, 5],
            [4, 5], [6, 4], [6, 5],
        ];
        for (const [row, col] of pathTiles) {
            const { x, y } = this.toScreen(row, col);
            gfx.fillStyle(0x8B7355, 0.25);
            gfx.beginPath();
            gfx.moveTo(x, y - TILE_H / 2);
            gfx.lineTo(x + TILE_W / 2, y);
            gfx.lineTo(x, y + TILE_H / 2);
            gfx.lineTo(x - TILE_W / 2, y);
            gfx.closePath();
            gfx.fillPath();
        }
    }

    private placeBuildings() {
        const sorted = [...BUILDINGS].sort((a, b) => (a.row + a.col) - (b.row + b.col));

        for (const b of sorted) {
            const { x, y } = this.toScreen(b.row, b.col);
            const depth = (b.row + b.col) * 10;

            // IsoBox - offset down slightly so it visually sits on the tile surface
            const boxY = y + TILE_H * 0.15;
            const box = this.add.isobox(x, boxY, b.size, b.height, b.topColor, b.leftColor, b.rightColor);
            box.setDepth(depth + 2);

            // Gift box decorations
            if (b.isGiftBox) {
                const ribbonGfx = this.add.graphics();
                ribbonGfx.setDepth(depth + 3);

                // Gold ribbon horizontal
                ribbonGfx.lineStyle(4 * DPR, 0xffd700, 0.95);
                ribbonGfx.lineBetween(
                    x - b.size / 2 + 12 * DPR, boxY - b.height,
                    x + b.size / 2 - 12 * DPR, boxY - b.height
                );
                // Gold ribbon vertical
                ribbonGfx.lineBetween(
                    x, boxY - b.height - b.size / 4 + 5 * DPR,
                    x, boxY - b.height + b.size / 4 - 5 * DPR
                );

                // Bow
                ribbonGfx.fillStyle(0xffd700, 1);
                ribbonGfx.fillCircle(x - 6 * DPR, boxY - b.height - 6 * DPR, 6 * DPR);
                ribbonGfx.fillCircle(x + 6 * DPR, boxY - b.height - 6 * DPR, 6 * DPR);
                ribbonGfx.fillCircle(x, boxY - b.height - 3 * DPR, 5 * DPR);

                // Sparkles
                for (let i = 0; i < 6; i++) {
                    const sx = x + Phaser.Math.Between(-55 * DPR, 55 * DPR);
                    const sy = boxY - b.height + Phaser.Math.Between(-30 * DPR, 15 * DPR);
                    const star = this.add.text(sx, sy, '✨', { fontSize: `${14 * DPR}px` })
                        .setDepth(depth + 4)
                        .setAlpha(0);
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

            // Label - dynamically sized text (re-rendered on zoom for sharpness)
            const labelPosY = boxY - b.height - 24 * DPR;
            const baseFontSize = (b.isGiftBox ? 15 : 13) * DPR;

            const labelText = this.add.text(x, labelPosY, b.label, {
                fontSize: `${baseFontSize}px`,
                color: '#ffffff',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3,
                resolution: window.devicePixelRatio || 3,
            }).setOrigin(0.5).setDepth(depth + 6);

            this.labels.push({ text: labelText, x, y: labelPosY, baseFontSize });

            // Harvest exclamation
            if (b.showExclaim) {
                const exContainer = this.add.container(x + 35 * DPR, boxY - b.height - 46 * DPR);
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

    private setupCameraDrag() {
        const cam = this.cameras.main;
        let lastPinchDist = 0;

        cam.setZoom(0.55);
        this.updateLabels(0.55);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDragging = false;
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
        });

        this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            // Check for pinch zoom (two pointers)
            const pointer1 = this.input.pointer1;
            const pointer2 = this.input.pointer2;

            if (pointer1.isDown && pointer2.isDown) {
                const dist = Phaser.Math.Distance.Between(
                    pointer1.x, pointer1.y,
                    pointer2.x, pointer2.y
                );

                if (lastPinchDist > 0) {
                    const scale = dist / lastPinchDist;
                    const newZoom = Phaser.Math.Clamp(cam.zoom * scale, 0.25, 1.5);
                    cam.setZoom(newZoom);
                    this.updateLabels(newZoom);
                }

                lastPinchDist = dist;
                return;
            }

            lastPinchDist = 0;

            // Single pointer drag
            const dx = pointer.x - pointer.prevPosition.x;
            const dy = pointer.y - pointer.prevPosition.y;

            if (Math.abs(pointer.x - this.dragStartX) > 5 || Math.abs(pointer.y - this.dragStartY) > 5) {
                this.isDragging = true;
            }

            if (this.isDragging) {
                cam.scrollX -= dx / cam.zoom;
                cam.scrollY -= dy / cam.zoom;
            }
        });

        this.input.on('pointerup', () => {
            lastPinchDist = 0;
        });

        // Mouse wheel zoom for desktop testing
        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.25, 1.5);
            cam.setZoom(newZoom);
            this.updateLabels(newZoom);
        });
    }
}
