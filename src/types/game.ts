export interface ResourceAmount {
    amount: number;
    unlocked: boolean;
}

export interface ResourceState {
    [id: string]: ResourceAmount;
}

export interface ResourceCost {
    res: string;
    amount: number;
}

export interface BuildingDef {
    id: string;
    name: string;
    spriteKey: string;
    cost: ResourceCost[];
    unlockDay: number;
    staggered?: boolean; // unlocks later in the day
    row: number;
    col: number;
    originY: number;
    scale: number;
    offX: number;
    offY: number;
    isGiftBox?: boolean;
    showExclaim?: boolean;
}

export interface PartDef {
    id: number;
    name: string;
    cost: ResourceCost[];
    craftTime: number; // minutes
    workshop: 'woodshop' | 'jewelshop';
    day: number;
}

export interface DialogLine {
    text: string;
    action?: string;
}

export interface DialogScene {
    id: string;
    desc: string;
    lines: DialogLine[];
    userAction?: string;
}

export interface GameProgress {
    currentDay: number;
    tutorialStep: number;
    partsCompleted: number[];
    boxStage: number;
    packagingStartedAt: number | null;
    boxHarvested: boolean;
}

export interface BuildingState {
    built: boolean;
    position?: { row: number; col: number };
}

export interface CraftingState {
    partId: number | null;
    startedAt: number | null;
}
