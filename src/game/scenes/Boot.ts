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
        // Gift box
        this.load.setPath('assets/generated/giftbox');
        this.load.image('box_empty', 'box_empty.png');
    }

    create() {
        this.scene.start('GameScene');
    }
}
