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
        this.load.image('construction', 'construction.png');
        // Gift box stages
        this.load.setPath('assets/generated/giftbox');
        this.load.image('box_empty', 'box_stage1_base.png');
        // Pre-placed terrain
        this.load.setPath('assets/generated/terrain');
        this.load.image('rock_outcrop', 'rock_outcrop.png');
        this.load.image('crystal_cluster', 'crystal_cluster.png');
        this.load.image('flower_patch', 'flower_patch.png');
        this.load.image('cave_entrance', 'cave_entrance.png');
    }

    create() {
        this.scene.start('GameScene');
    }
}
