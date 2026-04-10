import { ResourceState } from '../types/game';

export const RESOURCE_DEFS = [
    { id: 'wood', img: 'assets/generated/resources/wood.png', name: '나무' },
    { id: 'flower', img: 'assets/generated/resources/flower.png', name: '꽃' },
    { id: 'stone', img: 'assets/generated/resources/stone.png', name: '돌' },
    { id: 'metal', img: 'assets/generated/resources/metal.png', name: '금속' },
    { id: 'gem', img: 'assets/generated/resources/gem.png', name: '보석' },
];

export const INITIAL_RESOURCES: ResourceState = {
    wood: { amount: 2000, unlocked: true },
    flower: { amount: 0, unlocked: false },
    stone: { amount: 0, unlocked: false },
    metal: { amount: 0, unlocked: false },
    gem: { amount: 0, unlocked: false },
};

// Production rates (from game_design_v6)
export const PRODUCTION = {
    wood:   { cycle: 90, perCycle: 120, cap: 960 },   // 1.5h
    flower: { cycle: 120, perCycle: 80, cap: 640 },    // 2h
    stone:  { cycle: 90, perCycle: 150, cap: 1200 },   // 1.5h
    metal:  { cycle: 180, perCycle: 300, cap: 1200 },   // 3h
    gem:    { cycle: 180, perCycle: 250, cap: 1000 },   // 3h
};
