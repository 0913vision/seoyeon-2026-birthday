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
        // Gift box stages (1..7 — used by both the map sprite and the modal)
        this.load.setPath('assets/generated/giftbox');
        this.load.image('box_empty', 'box_stage1_base.png'); // legacy alias
        this.load.image('box_stage1', 'box_stage1_base.png');
        this.load.image('box_stage2', 'box_stage2_frame.png');
        this.load.image('box_stage3', 'box_stage3_flowers.png');
        this.load.image('box_stage4', 'box_stage4_numbers.png');
        this.load.image('box_stage5', 'box_stage5_metal.png');
        this.load.image('box_stage6', 'box_stage6_complete.png');
        this.load.image('box_stage7', 'box_stage7_wrapped.png');
        // Pre-placed terrain
        this.load.setPath('assets/generated/terrain');
        this.load.image('rock_outcrop', 'rock_outcrop.png');
        this.load.image('crystal_cluster', 'crystal_cluster.png');
        this.load.image('flower_patch', 'flower_patch.png');
        this.load.image('cave_entrance', 'cave_entrance.png');
        // Resource icons (for harvest bubbles)
        this.load.setPath('assets/generated/resources');
        this.load.image('res_wood', 'wood.png');
        this.load.image('res_flower', 'flower.png');
        this.load.image('res_stone', 'stone.png');
        this.load.image('res_metal', 'metal.png');
        this.load.image('res_gem', 'gem.png');
    }

    create() {
        this.scene.start('GameScene');
    }
}
