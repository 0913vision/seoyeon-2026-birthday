import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

const DPR = window.devicePixelRatio || 1;
const TILE_W = 110 * DPR;
const TILE_H = 55 * DPR;
const GRID_SIZE = 22;

const GRASS_COLORS = [0x5a9e6e, 0x5da872, 0x58a06a, 0x62ad76, 0x569c66];
const GRASS_DARK = [0x4e8c60, 0x508e62, 0x4c8a5c, 0x529066, 0x4a8858];

interface BuildingDef {
    row: number;
    col: number;
    label: string;
    spriteKey?: string;       // use sprite image
    isoBox?: { size: number; height: number; top: number; left: number; right: number }; // use IsoBox
    showExclaim?: boolean;
    isGiftBox?: boolean;
}

const BUILDINGS: BuildingDef[] = [
    {
        row: 10, col: 10, label: '선물상자',
        isoBox: { size: 95 * DPR, height: 75 * DPR, top: 0xdc3545, left: 0xb02a37, right: 0x8b2131 },
        isGiftBox: true,
    },
    {
        row: 4, col: 5, label: '나무밭',
        spriteKey: 'woodfarm',
        showExclaim: true,
    },
    {
        row: 5, col: 15, label: '꽃밭',
        spriteKey: 'flowerfarm',
    },
    {
        row: 15, col: 4, label: '채석장',
        spriteKey: 'quarry',
    },
    {
        row: 6, col: 11, label: '목공방',
        spriteKey: 'woodshop',
    },
    {
        row: 15, col: 14, label: '광산',
        spriteKey: 'mine',
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
        cam.scrollY = center.y - cam.height / 2 - 50 * DPR;

        this.drawGround();
        this.placeBuildings();
        this.setupCameraDrag();
        this.updateLabels(0.5);

        EventBus.emit('current-scene-ready', this);
    }

    private toScreen(row: number, col: number): { x: number; y: number } {
        return {
            x: (col - row) * (TILE_W / 2) + 1200 * DPR,
            y: (col + row) * (TILE_H / 2) + 200 * DPR,
        };
    }

    private drawGround() {
        // Draw all tiles (grid + extended) with same checkerboard pattern
        const EXT = 25;
        const gfx = this.add.graphics();
        gfx.setDepth(0);

        for (let row = -EXT; row < GRID_SIZE + EXT; row++) {
            for (let col = -EXT; col < GRID_SIZE + EXT; col++) {
                const { x, y } = this.toScreen(row, col);
                const colorIdx = (((row % 5) + 5) * 3 + ((col % 7) + 7) * 7) % GRASS_COLORS.length;
                const isEven = (row + col) % 2 === 0;
                const color = isEven ? GRASS_COLORS[colorIdx] : GRASS_DARK[colorIdx];

                gfx.fillStyle(color, 1);
                gfx.beginPath();
                gfx.moveTo(x, y - TILE_H / 2);
                gfx.lineTo(x + TILE_W / 2, y);
                gfx.lineTo(x, y + TILE_H / 2);
                gfx.lineTo(x - TILE_W / 2, y);
                gfx.closePath();
                gfx.fillPath();

                gfx.lineStyle(1, 0xffffff, 0.06);
                gfx.beginPath();
                gfx.moveTo(x - TILE_W / 2 + 1, y);
                gfx.lineTo(x, y - TILE_H / 2 + 1);
                gfx.lineTo(x + TILE_W / 2 - 1, y);
                gfx.strokePath();

                gfx.lineStyle(1, 0x000000, 0.1);
                gfx.beginPath();
                gfx.moveTo(x + TILE_W / 2 - 1, y);
                gfx.lineTo(x, y + TILE_H / 2 - 1);
                gfx.lineTo(x - TILE_W / 2 + 1, y);
                gfx.strokePath();
            }
        }

        // Dirt paths around gift box
        const cx = 10, cy = 10;
        const pathTiles = [
            [cx-1, cy-1], [cx-1, cy], [cx-1, cy+1],
            [cx, cy-1], [cx, cy+1],
            [cx+1, cy-1], [cx+1, cy], [cx+1, cy+1],
            [cx+2, cy], [cx, cy+2], [cx-2, cy], [cx, cy-2],
        ];
        for (const [row, col] of pathTiles) {
            const { x, y } = this.toScreen(row, col);
            gfx.fillStyle(0x8B7355, 0.2);
            gfx.beginPath();
            gfx.moveTo(x, y - TILE_H / 2);
            gfx.lineTo(x + TILE_W / 2, y);
            gfx.lineTo(x, y + TILE_H / 2);
            gfx.lineTo(x - TILE_W / 2, y);
            gfx.closePath();
            gfx.fillPath();
        }

        // Decorative elements on empty tiles
        this.addDecorations();

        // Set camera bounds using actual isometric diamond corners (generous)
        const top = this.toScreen(-10, -10);
        const right = this.toScreen(-10, GRID_SIZE + 10);
        const bottom = this.toScreen(GRID_SIZE + 10, GRID_SIZE + 10);
        const left = this.toScreen(GRID_SIZE + 10, -10);

        const boundsX = left.x - TILE_W * 3;
        const boundsY = top.y - TILE_H * 6;
        const boundsW = (right.x - left.x) + TILE_W * 6;
        const boundsH = (bottom.y - top.y) + TILE_H * 12;
        this.cameras.main.setBounds(boundsX, boundsY, boundsW, boundsH);
    }

    private addDecorations() {
        // Scatter small decorative dots (grass tufts, flowers) on random tiles
        const decoGfx = this.add.graphics();
        decoGfx.setDepth(1);

        const rng = new Phaser.Math.RandomDataGenerator(['deco']);
        const occupiedTiles = new Set(BUILDINGS.map(b => `${b.row},${b.col}`));

        for (let i = 0; i < 40; i++) {
            const row = rng.between(0, GRID_SIZE - 1);
            const col = rng.between(0, GRID_SIZE - 1);
            if (occupiedTiles.has(`${row},${col}`)) continue;

            const { x, y } = this.toScreen(row, col);
            const type = rng.between(0, 2);

            if (type === 0) {
                // Small grass tuft
                decoGfx.fillStyle(0x3aaa55, 0.5);
                decoGfx.fillCircle(x + rng.between(-15, 15) * DPR, y + rng.between(-5, 5) * DPR, 3 * DPR);
                decoGfx.fillCircle(x + rng.between(-15, 15) * DPR, y + rng.between(-5, 5) * DPR, 2 * DPR);
            } else if (type === 1) {
                // Tiny flower
                const fx = x + rng.between(-20, 20) * DPR;
                const fy = y + rng.between(-8, 8) * DPR;
                const colors = [0xff6b9d, 0xffd93d, 0xff8a5c, 0xc77dff];
                decoGfx.fillStyle(colors[rng.between(0, 3)], 0.6);
                decoGfx.fillCircle(fx, fy, 2.5 * DPR);
                decoGfx.fillStyle(0x2d8a4e, 0.5);
                decoGfx.fillCircle(fx, fy + 3 * DPR, 1.5 * DPR);
            } else {
                // Small rock
                decoGfx.fillStyle(0x8a8a7a, 0.3);
                decoGfx.fillEllipse(x + rng.between(-15, 15) * DPR, y + rng.between(-5, 5) * DPR, 5 * DPR, 3 * DPR);
            }
        }
    }

    private placeBuildings() {
        const sorted = [...BUILDINGS].sort((a, b) => (a.row + a.col) - (b.row + b.col));

        for (const b of sorted) {
            const { x, y } = this.toScreen(b.row, b.col);
            const depth = (b.row + b.col) * 10;
            let topY: number;

            // Shadow under every building
            const shadowGfx = this.add.graphics();
            shadowGfx.setDepth(depth);
            shadowGfx.fillStyle(0x000000, 0.15);
            shadowGfx.fillEllipse(x + 3 * DPR, y + 5 * DPR, TILE_W * 0.7, TILE_H * 0.4);

            if (b.spriteKey) {
                // Use sprite image - TILE_W already includes DPR, don't multiply again
                const sprite = this.add.image(x, y, b.spriteKey);
                const targetW = TILE_W * 1.0;
                sprite.setScale(targetW / sprite.width);
                sprite.setOrigin(0.5, 0.75);
                sprite.setDepth(depth + 2);
                topY = y - sprite.displayHeight * 0.5;
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

    private setupCameraDrag() {
        const cam = this.cameras.main;
        let lastPinchDist = 0;

        cam.setZoom(0.5);
        this.updateLabels(0.5);

        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            this.isDragging = false;
            this.dragStartX = pointer.x;
            this.dragStartY = pointer.y;
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
                    const newZoom = Phaser.Math.Clamp(cam.zoom * scale, 0.2, 1.5);
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
                cam.scrollX -= dx / cam.zoom;
                cam.scrollY -= dy / cam.zoom;
            }
        });

        this.input.on('pointerup', () => {
            lastPinchDist = 0;
        });

        this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gameObjects: Phaser.GameObjects.GameObject[], _deltaX: number, deltaY: number) => {
            const newZoom = Phaser.Math.Clamp(cam.zoom - deltaY * 0.001, 0.2, 1.5);
            cam.setZoom(newZoom);
            this.updateLabels(newZoom);
        });
    }
}
