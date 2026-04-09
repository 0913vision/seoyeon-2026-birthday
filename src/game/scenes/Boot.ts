import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        this.load.setPath('assets/iso');
        // Buildings
        this.load.image('woodfarm', 'woodfarm.png');
        this.load.image('flowerfarm', 'flowerfarm.png');
        this.load.image('quarry', 'quarry.png');
        this.load.image('woodshop', 'woodshop.png');
        this.load.image('mine', 'mine.png');
        // Decorative items
        this.load.image('deco_corn', 'corn_s.png');
        this.load.image('deco_cornDouble', 'corndouble_s.png');
        this.load.image('deco_hay', 'hay.png');
        this.load.image('deco_hayBales', 'hayBales.png');
        this.load.image('deco_hayStacked', 'hayBalesStacked.png');
        this.load.image('deco_planks', 'planks.png');
        this.load.image('deco_planksHigh', 'planksHigh.png');
        this.load.image('deco_sack', 'sack.png');
        this.load.image('deco_sacksCrate', 'sacksCrate.png');
    }

    create() {
        this.scene.start('GameScene');
    }
}
