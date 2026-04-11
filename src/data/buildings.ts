import { BuildingDef } from '../types/game';

export const BUILDINGS: BuildingDef[] = [
    {
        id: 'box', name: '선물상자', spriteKey: 'box_empty',
        cost: [], unlockDay: 1, row: 8, col: 8,
        originY: 0.6, scale: 1.3, offX: 1.5, offY: 0,
        isGiftBox: true,
    },
    {
        id: 'wood_farm', name: '숲', spriteKey: 'woodfarm',
        cost: [], unlockDay: 1, row: 3, col: 4,
        originY: 0.71, scale: 1.2, offX: 0, offY: 0,
        showExclaim: true,
    },
    {
        id: 'woodshop', name: '목공방', spriteKey: 'woodshop',
        cost: [{ res: 'wood', amount: 500 }],
        unlockDay: 1, row: 5, col: 9,
        originY: 0.63, scale: 1.25, offX: 0.5, offY: -3,
    },
    {
        id: 'flower_farm', name: '꽃밭', spriteKey: 'flowerfarm',
        cost: [{ res: 'wood', amount: 1000 }],
        unlockDay: 2, row: 4, col: 12,
        originY: 0.56, scale: 1.1, offX: 0, offY: -2,
    },
    {
        id: 'quarry', name: '채석장', spriteKey: 'quarry',
        cost: [{ res: 'wood', amount: 1000 }],
        unlockDay: 2, staggered: true, row: 12, col: 3,
        originY: 0.62, scale: 1.05, offX: 0, offY: -2,
    },
    {
        id: 'mine', name: '광산', spriteKey: 'mine',
        cost: [{ res: 'stone', amount: 1000 }],
        unlockDay: 3, row: 12, col: 11,
        originY: 0.59, scale: 1.1, offX: 3, offY: -3.5,
    },
    {
        id: 'jewelshop', name: '세공소', spriteKey: 'jewelshop',
        cost: [{ res: 'wood', amount: 1500 }, { res: 'stone', amount: 1000 }],
        unlockDay: 3, staggered: true, row: 6, col: 13,
        originY: 0.69, scale: 1.1, offX: -0.5, offY: -2,
    },
    {
        id: 'gem_cave', name: '수정동굴', spriteKey: 'gemcave',
        cost: [{ res: 'stone', amount: 1500 }, { res: 'metal', amount: 500 }],
        unlockDay: 4, row: 11, col: 6,
        originY: 0.64, scale: 1.1, offX: 0, offY: -3,
    },
];

// Buildable buildings (exclude box and wood_farm which are free/pre-placed)
export const BUILDABLE = BUILDINGS.filter(b => b.cost.length > 0);

// Harvestable buildings -> resource id they produce
export const HARVESTABLE_BUILDINGS: Record<string, string> = {
    wood_farm: 'wood',
    flower_farm: 'flower',
    quarry: 'stone',
    mine: 'metal',
    gem_cave: 'gem',
};
