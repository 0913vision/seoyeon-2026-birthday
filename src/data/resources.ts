import { ResourceState } from '../types/game';

export const RESOURCE_DEFS = [
    { id: 'wood', img: 'assets/generated/resources/wood.png', name: '나무' },
    { id: 'flower', img: 'assets/generated/resources/flower.png', name: '꽃' },
    { id: 'stone', img: 'assets/generated/resources/stone.png', name: '돌' },
    { id: 'metal', img: 'assets/generated/resources/metal.png', name: '금속' },
    { id: 'gem', img: 'assets/generated/resources/gem.png', name: '보석' },
];

export const INITIAL_RESOURCES: ResourceState = {
    wood: { amount: 2500, unlocked: true },
    flower: { amount: 0, unlocked: false },
    stone: { amount: 0, unlocked: false },
    metal: { amount: 0, unlocked: false },
    gem: { amount: 0, unlocked: false },
};

// Production rates (model B++: tap harvest + 200% accumulation)
export const PRODUCTION = {
    wood:   { cycle: 60, perCycle: 250, cap: 500 },   // 1h
    flower: { cycle: 60, perCycle: 200, cap: 400 },   // 1h
    stone:  { cycle: 60, perCycle: 350, cap: 700 },   // 1h
    metal:  { cycle: 90, perCycle: 350, cap: 700 },   // 1.5h
    gem:    { cycle: 90, perCycle: 300, cap: 600 },   // 1.5h
};
