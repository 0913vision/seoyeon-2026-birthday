import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

const DPR = window.devicePixelRatio || 1;
const TILE_W = 110 * DPR;
const TILE_H = Math.round(110 * 0.58) * DPR; // calibrated ratio 0.58
const GRID_SIZE = 16;

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
      originY: 0.62, scale: 1.25, offX: 0, offY: -4 },
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

    private placeBuildings() {
        const sorted = [...BUILDINGS].sort((a, b) => (a.row + a.col) - (b.row + b.col));

        for (const b of sorted) {
            const { x, y } = this.toScreen(b.row, b.col);
            const depth = (b.row + b.col) * 10;
            let topY: number;

            // Shadow under building
            const shadowGfx = this.add.graphics();
            shadowGfx.setDepth(depth);
            shadowGfx.fillStyle(0x000000, 0.25);
            shadowGfx.fillEllipse(x, y + 5 * DPR, TILE_W * 0.95, TILE_H * 0.6);
            shadowGfx.fillStyle(0x000000, 0.2);
            shadowGfx.fillEllipse(x, y + 3 * DPR, TILE_W * 0.7, TILE_H * 0.45);

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

        this.input.on('pointerup', () => {
            lastPinchDist = 0;
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
