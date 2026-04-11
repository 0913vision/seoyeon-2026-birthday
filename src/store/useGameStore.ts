import { create } from 'zustand';
import { ResourceState, BuildingState, CraftingState, HarvestState } from '../types/game';
import { INITIAL_RESOURCES, PRODUCTION } from '../data/resources';
import { BUILDINGS, HARVESTABLE_BUILDINGS } from '../data/buildings';
import { computeHarvest } from '../game/harvestCalc';

const CONSTRUCTION_TIME_MS = 10_000; // 10 seconds for debug

// Day calculation: KST date-based (4/11 Sat = Day 1, 4/15 Wed = Day 5)
export function calcDayFromDate(): number {
    const now = new Date();
    const kstMs = now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000;
    const kstDate = new Date(kstMs);
    const day1 = new Date(2026, 3, 11); // April 11, 2026
    const diff = Math.floor((new Date(kstDate.getFullYear(), kstDate.getMonth(), kstDate.getDate()).getTime() - day1.getTime()) / 86400000);
    return Math.max(1, Math.min(5, diff + 1));
}

interface GameState {
    // Progress
    currentDay: number;
    tutorialStep: number;
    boxStage: number; // 1-7
    packagingStartedAt: number | null;
    boxHarvested: boolean;

    // Resources
    resources: ResourceState;

    // Buildings
    buildings: Record<string, BuildingState>;

    // Parts
    partsCompleted: number[]; // completed part IDs
    partsAttached: number[]; // attached part IDs

    // Crafting
    woodshopCrafting: CraftingState;
    jewelshopCrafting: CraftingState;

    // Harvest accumulation per harvestable building
    harvestStates: Record<string, HarvestState>;

    // UI (not persisted to DB)
    showDialog: boolean;
    dialogSceneId: string | null;
    dialogLineIndex: number;
    showBuildMenu: boolean;
    resDelta: { id: string; delta: number; key: number } | null;
    buildMode: { buildingId: string; enteredAt: number } | null;
    activeModal: { category: 'terrain' | 'harvest' | 'construction' | 'workshop' | 'giftbox'; id: string } | null;

    // Actions
    addResource: (id: string, amount: number) => void;
    setResource: (id: string, amount: number) => void;
    unlockResource: (id: string) => void;
    buildBuilding: (id: string) => void;
    completePart: (partId: number) => void;
    attachPart: (partId: number) => void;
    advanceDay: () => void;
    setDay: (day: number) => void;
    setTutorialStep: (step: number) => void;
    setBoxStage: (stage: number) => void;
    startPackaging: () => void;
    harvestBox: () => void;

    // Build mode actions
    enterBuildMode: (buildingId: string) => void;
    exitBuildMode: () => void;
    startConstruction: (buildingId: string, row: number, col: number) => void;
    completeConstruction: (buildingId: string) => void;

    // Harvest actions
    harvestBuilding: (buildingId: string) => number;

    // UI actions
    openDialog: (sceneId: string) => void;
    advanceDialog: () => void;
    closeDialog: () => void;
    toggleBuildMenu: () => void;
    closeBuildMenu: () => void;
    openBuildingModal: (category: 'terrain' | 'harvest' | 'construction' | 'workshop' | 'giftbox', id: string) => void;
    closeBuildingModal: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    // Initial state
    currentDay: 3, // DEBUG: 고정값. 배포 시 calcDayFromDate()로 교체
    tutorialStep: 0,
    boxStage: 1,
    packagingStartedAt: null,
    boxHarvested: false,

    resources: { ...INITIAL_RESOURCES },

    buildings: {
        box: { built: true, position: { row: 8, col: 8 } },
        wood_farm: { built: true, position: { row: 3, col: 4 } },
        woodshop: { built: false },
        flower_farm: { built: false },
        quarry: { built: false },
        mine: { built: false },
        jewelshop: { built: false },
        gem_cave: { built: false },
    },

    partsCompleted: [],
    partsAttached: [],

    woodshopCrafting: { partId: null, startedAt: null },
    jewelshopCrafting: { partId: null, startedAt: null },

    // Debug: each harvestable building starts with ~50% of its cycle already elapsed
    harvestStates: (() => {
        const now = Date.now();
        const out: Record<string, HarvestState> = {};
        for (const [bid, resId] of Object.entries(HARVESTABLE_BUILDINGS)) {
            const prod = PRODUCTION[resId as keyof typeof PRODUCTION];
            if (!prod) continue;
            // 50% of cycle already elapsed
            out[bid] = { lastHarvestAt: now - prod.cycle * 60_000 * 0.5 };
        }
        return out;
    })(),

    // UI
    showDialog: false,
    dialogSceneId: null,
    dialogLineIndex: 0,
    showBuildMenu: false,
    resDelta: null,
    buildMode: null,
    activeModal: null,

    // Resource actions
    addResource: (id, amount) => {
        set(state => ({
            resources: {
                ...state.resources,
                [id]: {
                    amount: Math.max(0, state.resources[id].amount + amount),
                    unlocked: state.resources[id].unlocked || amount > 0,
                },
            },
            resDelta: { id, delta: amount, key: Date.now() },
        }));
        setTimeout(() => set({ resDelta: null }), 1200);
    },

    setResource: (id, amount) => {
        set(state => ({
            resources: {
                ...state.resources,
                [id]: { ...state.resources[id], amount: Math.max(0, amount) },
            },
        }));
    },

    unlockResource: (id) => {
        set(state => ({
            resources: {
                ...state.resources,
                [id]: { ...state.resources[id], unlocked: true },
            },
        }));
    },

    // Building actions
    buildBuilding: (id) => {
        set(state => ({
            buildings: {
                ...state.buildings,
                [id]: { ...state.buildings[id], built: true },
            },
        }));
    },

    // Build mode actions
    enterBuildMode: (buildingId) => {
        set({ buildMode: { buildingId, enteredAt: Date.now() }, showBuildMenu: false });
    },

    exitBuildMode: () => {
        set({ buildMode: null });
    },

    startConstruction: (buildingId, row, col) => {
        const state = get();
        const def = BUILDINGS.find(b => b.id === buildingId);
        if (!def) return;

        // Deduct resources
        const newResources = { ...state.resources };
        for (const c of def.cost) {
            newResources[c.res] = {
                ...newResources[c.res],
                amount: Math.max(0, newResources[c.res].amount - c.amount),
            };
        }

        set({
            resources: newResources,
            buildings: {
                ...state.buildings,
                [buildingId]: {
                    built: false,
                    position: { row, col },
                    constructionStartedAt: Date.now(),
                },
            },
            buildMode: null,
        });

        // Schedule completion
        setTimeout(() => {
            get().completeConstruction(buildingId);
        }, CONSTRUCTION_TIME_MS);
    },

    completeConstruction: (buildingId) => {
        set(state => {
            // Initialize harvest state for newly built harvestable buildings
            const newHarvestStates = { ...state.harvestStates };
            if (HARVESTABLE_BUILDINGS[buildingId] && !newHarvestStates[buildingId]) {
                newHarvestStates[buildingId] = { lastHarvestAt: Date.now() };
            }
            return {
                buildings: {
                    ...state.buildings,
                    [buildingId]: {
                        ...state.buildings[buildingId],
                        built: true,
                        constructionStartedAt: null,
                    },
                },
                harvestStates: newHarvestStates,
            };
        });
    },

    // Harvest: compute accumulated amount, add to resources, reset timer
    harvestBuilding: (buildingId) => {
        const state = get();
        const resId = HARVESTABLE_BUILDINGS[buildingId];
        if (!resId) return 0;
        const prod = PRODUCTION[resId as keyof typeof PRODUCTION];
        if (!prod) return 0;
        const hs = state.harvestStates[buildingId];
        if (!hs) return 0;

        const info = computeHarvest(hs.lastHarvestAt, Date.now(), prod.cycle, prod.perCycle);
        if (info.amount <= 0) return 0;

        // Use addResource so the ResourceBar delta animation fires
        get().addResource(resId, info.amount);

        set(s => ({
            harvestStates: {
                ...s.harvestStates,
                [buildingId]: { lastHarvestAt: Date.now() },
            },
        }));

        return info.amount;
    },

    // Part actions
    completePart: (partId) => {
        set(state => ({
            partsCompleted: [...state.partsCompleted, partId],
        }));
    },

    attachPart: (partId) => {
        set(state => ({
            partsAttached: [...state.partsAttached, partId],
        }));
    },

    // Progress actions
    advanceDay: () => set(state => ({ currentDay: Math.min(5, state.currentDay + 1) })),
    setDay: (day: number) => set({ currentDay: Math.max(1, Math.min(5, day)) }),
    setTutorialStep: (step) => set({ tutorialStep: step }),
    setBoxStage: (stage) => set({ boxStage: stage }),
    startPackaging: () => set({ packagingStartedAt: Date.now() }),
    harvestBox: () => set({ boxHarvested: true }),

    // UI actions
    openDialog: (sceneId) => set({ showDialog: true, dialogSceneId: sceneId, dialogLineIndex: 0 }),
    advanceDialog: () => set(state => ({ dialogLineIndex: state.dialogLineIndex + 1 })),
    closeDialog: () => set({ showDialog: false, dialogSceneId: null, dialogLineIndex: 0 }),
    toggleBuildMenu: () => set(state => ({ showBuildMenu: !state.showBuildMenu })),
    closeBuildMenu: () => set({ showBuildMenu: false }),
    openBuildingModal: (category, id) => set({ activeModal: { category, id } }),
    closeBuildingModal: () => set({ activeModal: null }),
}));

// Serializable state for DB (excludes UI and functions)
export function getSerializableState() {
    const state = useGameStore.getState();
    return {
        currentDay: state.currentDay,
        tutorialStep: state.tutorialStep,
        boxStage: state.boxStage,
        packagingStartedAt: state.packagingStartedAt,
        boxHarvested: state.boxHarvested,
        resources: state.resources,
        buildings: state.buildings,
        partsCompleted: state.partsCompleted,
        partsAttached: state.partsAttached,
        woodshopCrafting: state.woodshopCrafting,
        jewelshopCrafting: state.jewelshopCrafting,
        harvestStates: state.harvestStates,
    };
}
