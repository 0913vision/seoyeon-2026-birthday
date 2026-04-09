import { Scene } from 'phaser';

export class Boot extends Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        this.load.setPath('assets/iso');
        this.load.image('woodfarm', 'woodfarm.png');
        this.load.image('flowerfarm', 'flowerfarm.png');
        this.load.image('quarry', 'quarry.png');
        this.load.image('woodshop', 'woodshop.png');
        this.load.image('mine', 'mine.png');
    }

    create() {
        this.scene.start('GameScene');
    }
}
