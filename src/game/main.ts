import { AUTO, Game, Scale } from 'phaser';
import { Boot } from './scenes/Boot';
import { GameScene } from './scenes/GameScene';

const dpr = window.devicePixelRatio || 1;

const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    parent: 'game-container',
    backgroundColor: '#2d5a3f',
    transparent: false,
    width: Math.floor(window.innerWidth * dpr),
    height: Math.floor(window.innerHeight * dpr),
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH,
    },
    input: {
        activePointers: 3,
    },
    render: {
        antialias: true,
        roundPixels: false,
    },
    scene: [Boot, GameScene],
};

const StartGame = (parent: string) => {
    return new Game({ ...config, parent });
};

export default StartGame;
