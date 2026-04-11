import { create } from 'zustand';
import { ResourceState, BuildingState, CraftingState, HarvestState } from '../types/game';
import { INITIAL_RESOURCES, PRODUCTION } from '../data/resources';
import { BUILDINGS, HARVESTABLE_BUILDINGS } from '../data/buildings';
import { PARTS } from '../data/parts';
import { computeHarvest } from '../game/harvestCalc';

const CONSTRUCTION_TIME_MS = 10_000; // 10 seconds for debug

/**
 * Box stage (1..7) for a given number of attached parts. Matches the 7
 * stage sprites in public/assets/generated/giftbox/. 0 parts → stage 1,
 * all 24 → stage 7.
 */
export function boxStageFromAttachedCount(n: number): number {
    if (n >= 24) return 7;
    if (n >= 20) return 6;
    if (n >= 15) return 5;
    if (n >= 10) return 4;
    if (n >= 5) return 3;
    if (n >= 1) return 2;
    return 1;
}

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

    // "NEW" badge tracking. Stores the last day on which the user opened each
    // surface. A NEW badge is shown while the surface has content unlocked on
    // a day strictly greater than its seen value (and <= currentDay).
    seenNewDay: { buildMenu: number; woodshop: number; jewelshop: number };

    // Dialogue scenes the player has already seen. The dialog rule engine
    // skips any scene whose id is in this list.
    shownDialogs: string[];

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

    // NEW badge actions
    markBuildMenuSeen: () => void;
    markWorkshopSeen: (workshopId: 'woodshop' | 'jewelshop') => void;

    // Workshop crafting actions
    startCrafting: (workshopId: 'woodshop' | 'jewelshop', partId: number) => boolean;
    /** Move the crafted part to completed inventory. Only works if the
     * craft timer has finished. Returns true on success. */
    collectCrafting: (workshopId: 'woodshop' | 'jewelshop') => boolean;
    /** True if the workshop's slot is finished and ready to collect. */
    isCraftingReady: (workshopId: 'woodshop' | 'jewelshop') => boolean;

    // UI actions
    openDialog: (sceneId: string) => void;
    advanceDialog: () => void;
    closeDialog: () => void;
    markDialogShown: (sceneId: string) => void;
    toggleBuildMenu: () => void;
    closeBuildMenu: () => void;
    openBuildingModal: (category: 'terrain' | 'harvest' | 'construction' | 'workshop' | 'giftbox', id: string) => void;
    closeBuildingModal: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    // Initial state — fresh game. Date-based day; 0 parts; only box + wood_farm
    // pre-placed; wood_farm ready to harvest immediately so the tutorial flows.
    currentDay: calcDayFromDate(),
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

    seenNewDay: { buildMenu: 0, woodshop: 0, jewelshop: 0 },
    shownDialogs: [],

    // wood_farm starts ready to harvest so the Day 1 tutorial hint can fire
    // immediately. Others seed an empty record; harvestStates for later
    // buildings are created when they're built.
    harvestStates: {
        wood_farm: { lastHarvestAt: Date.now() - 90 * 60_000 },
    },

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

    // NEW badge: record that the user has opened the surface up to currentDay
    markBuildMenuSeen: () => {
        set(state => ({
            seenNewDay: { ...state.seenNewDay, buildMenu: state.currentDay },
        }));
    },
    markWorkshopSeen: (workshopId) => {
        set(state => ({
            seenNewDay: { ...state.seenNewDay, [workshopId]: state.currentDay },
        }));
    },

    // Part actions
    completePart: (partId) => {
        set(state => ({
            partsCompleted: [...state.partsCompleted, partId],
        }));
    },

    attachPart: (partId) => {
        set(state => {
            // Already attached → no-op
            if (state.partsAttached.includes(partId)) return {};
            const nextAttached = [...state.partsAttached, partId];
            // Remove from partsCompleted if present (parts move completed → attached)
            const nextCompleted = state.partsCompleted.filter(id => id !== partId);
            // Starting packaging: when the 24th part is attached, kick off the
            // 90-minute packaging countdown (once).
            const patch: Partial<GameState> = {
                partsAttached: nextAttached,
                partsCompleted: nextCompleted,
                boxStage: boxStageFromAttachedCount(nextAttached.length),
            };
            if (nextAttached.length >= PARTS.length && state.packagingStartedAt == null) {
                patch.packagingStartedAt = Date.now();
            }
            return patch;
        });
    },

    // Workshop crafting ---------------------------------------------------
    startCrafting: (workshopId, partId) => {
        const state = get();
        const part = PARTS.find(p => p.id === partId);
        if (!part) return false;
        if (part.workshop !== workshopId) return false;

        // Slot must be empty
        const slot = workshopId === 'woodshop' ? state.woodshopCrafting : state.jewelshopCrafting;
        if (slot.partId != null) return false;

        // Already completed or attached → can't re-craft
        if (state.partsCompleted.includes(partId)) return false;
        if (state.partsAttached.includes(partId)) return false;

        // Can afford?
        for (const c of part.cost) {
            if ((state.resources[c.res]?.amount ?? 0) < c.amount) return false;
        }

        // Deduct resources + set slot atomically
        const newResources = { ...state.resources };
        for (const c of part.cost) {
            newResources[c.res] = {
                ...newResources[c.res],
                amount: newResources[c.res].amount - c.amount,
            };
        }
        const newSlot: CraftingState = { partId, startedAt: Date.now() };
        if (workshopId === 'woodshop') {
            set({ resources: newResources, woodshopCrafting: newSlot });
        } else {
            set({ resources: newResources, jewelshopCrafting: newSlot });
        }
        return true;
    },

    isCraftingReady: (workshopId) => {
        const state = get();
        const slot = workshopId === 'woodshop' ? state.woodshopCrafting : state.jewelshopCrafting;
        if (slot.partId == null || slot.startedAt == null) return false;
        const part = PARTS.find(p => p.id === slot.partId);
        if (!part) return false;
        const elapsed = Date.now() - slot.startedAt;
        const craftMs = part.craftTime * 60 * 1000;
        return elapsed >= craftMs;
    },

    collectCrafting: (workshopId) => {
        const state = get();
        const slot = workshopId === 'woodshop' ? state.woodshopCrafting : state.jewelshopCrafting;
        if (slot.partId == null || slot.startedAt == null) return false;

        const part = PARTS.find(p => p.id === slot.partId);
        if (!part) return false;

        // Must be done
        const elapsed = Date.now() - slot.startedAt;
        const craftMs = part.craftTime * 60 * 1000;
        if (elapsed < craftMs) return false;

        set(s => ({
            partsCompleted: s.partsCompleted.includes(slot.partId as number)
                ? s.partsCompleted
                : [...s.partsCompleted, slot.partId as number],
            [workshopId === 'woodshop' ? 'woodshopCrafting' : 'jewelshopCrafting']: {
                partId: null,
                startedAt: null,
            },
        } as Partial<GameState>));
        return true;
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
    closeDialog: () => set(state => {
        // Closing auto-marks the scene as shown, so the rule engine never
        // re-opens the same scene.
        const id = state.dialogSceneId;
        const next: Partial<GameState> = { showDialog: false, dialogSceneId: null, dialogLineIndex: 0 };
        if (id && !state.shownDialogs.includes(id)) {
            next.shownDialogs = [...state.shownDialogs, id];
        }
        return next;
    }),
    markDialogShown: (sceneId) => set(state => (
        state.shownDialogs.includes(sceneId)
            ? {}
            : { shownDialogs: [...state.shownDialogs, sceneId] }
    )),
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
        seenNewDay: state.seenNewDay,
        shownDialogs: state.shownDialogs,
    };
}
