import { ResourceState } from '../types/game';

export const RESOURCE_DEFS = [
    { id: 'wood', img: 'assets/generated/resources/wood.png', name: '나무' },
    { id: 'flower', img: 'assets/generated/resources/flower.png', name: '꽃' },
    { id: 'stone', img: 'assets/generated/resources/stone.png', name: '돌' },
    { id: 'metal', img: 'assets/generated/resources/metal.png', name: '금속' },
    { id: 'gem', img: 'assets/generated/resources/gem.png', name: '보석' },
    { id: 'leather', img: 'assets/generated/resources/leather.png', name: '가죽 원단' },
];

export const INITIAL_RESOURCES: ResourceState = {
    wood: { amount: 4000, unlocked: true },
    flower: { amount: 0, unlocked: false },
    stone: { amount: 0, unlocked: false },
    metal: { amount: 0, unlocked: false },
    gem: { amount: 0, unlocked: false },
    leather: { amount: 0, unlocked: false },
};

// Production rates (model B++: tap harvest + 200% accumulation).
// Tuned for a casual 1–2 logins/day player. Higher than balance_5day.md's
// original assumption (which expected 4–5 logins/day). See the Day 2–5
// balance audit in the release notes.
export const PRODUCTION = {
    wood:   { cycle: 60, perCycle: 300, cap: 600 },   // 1h
    flower: { cycle: 60, perCycle: 300, cap: 600 },   // 1h
    stone:  { cycle: 60, perCycle: 500, cap: 1000 },  // 1h
    metal:  { cycle: 90, perCycle: 550, cap: 1100 },  // 1.5h
    gem:    { cycle: 90, perCycle: 500, cap: 1000 },  // 1.5h
};
