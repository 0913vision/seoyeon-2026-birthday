import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Buildings (AI-generated)
        this.load.setPath('assets/generated/buildings');
        this.load.image('woodfarm', 'wood_farm.png');
        this.load.image('flowerfarm', 'flower_farm.png');
        this.load.image('quarry', 'quarry.png');
        this.load.image('woodshop', 'woodshop.png');
        this.load.image('mine', 'mine.png');
        this.load.image('jewelshop', 'jewelshop.png');
        this.load.image('gemcave', 'gem_cave.png');
        // Gift box stages
        this.load.setPath('assets/generated/giftbox');
        this.load.image('box_empty', 'box_empty.png');
        // Decorative items
        this.load.setPath('assets/iso');
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
