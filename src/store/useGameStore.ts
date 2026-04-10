import { create } from 'zustand';
import { ResourceState, BuildingState, CraftingState } from '../types/game';
import { INITIAL_RESOURCES } from '../data/resources';
import { BUILDINGS } from '../data/buildings';

const CONSTRUCTION_TIME_MS = 10_000; // 10 seconds for debug

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

    // UI (not persisted to DB)
    showDialog: boolean;
    dialogSceneId: string | null;
    dialogLineIndex: number;
    showBuildMenu: boolean;
    resDelta: { id: string; delta: number; key: number } | null;
    buildMode: { buildingId: string; enteredAt: number } | null;

    // Actions
    addResource: (id: string, amount: number) => void;
    setResource: (id: string, amount: number) => void;
    unlockResource: (id: string) => void;
    buildBuilding: (id: string) => void;
    completePart: (partId: number) => void;
    attachPart: (partId: number) => void;
    advanceDay: () => void;
    setTutorialStep: (step: number) => void;
    setBoxStage: (stage: number) => void;
    startPackaging: () => void;
    harvestBox: () => void;

    // Build mode actions
    enterBuildMode: (buildingId: string) => void;
    exitBuildMode: () => void;
    startConstruction: (buildingId: string, row: number, col: number) => void;
    completeConstruction: (buildingId: string) => void;

    // UI actions
    openDialog: (sceneId: string) => void;
    advanceDialog: () => void;
    closeDialog: () => void;
    toggleBuildMenu: () => void;
    closeBuildMenu: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    // Initial state
    currentDay: 1,
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

    // UI
    showDialog: false,
    dialogSceneId: null,
    dialogLineIndex: 0,
    showBuildMenu: false,
    resDelta: null,
    buildMode: null,

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
        set(state => ({
            buildings: {
                ...state.buildings,
                [buildingId]: {
                    ...state.buildings[buildingId],
                    built: true,
                    constructionStartedAt: null,
                },
            },
        }));
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
    advanceDay: () => set(state => ({ currentDay: state.currentDay + 1 })),
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
    };
}
