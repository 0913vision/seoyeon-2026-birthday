/**
 * Database service layer.
 *
 * Strategy: entire player state is stored as a single JSONB row in
 * `player_saves`. Every state mutation triggers a debounced full-row
 * upsert, which is atomic on the Postgres side. This guarantees no
 * partial-write races (e.g., resources deducted but building not added).
 *
 * Entry points below are currently MOCKED — the implementation just
 * logs + simulates network latency — but the API shape, concurrency
 * handling, and transaction guarantees match the Supabase target.
 *
 * Switching to real Supabase later = filling in the three `// TODO:
 * supabase.*` lines inside this file. Nothing else in the app needs
 * to change.
 */

import { useGameStore, getSerializableState } from '../store/useGameStore';

const PLAYER_ID = 'default_player';

// ============================================================
// Types
// ============================================================

export interface SaveData {
    currentDay: number;
    tutorialStep: number;
    boxStage: number;
    packagingStartedAt: number | null;
    boxHarvested: boolean;
    resources: Record<string, { amount: number; unlocked: boolean }>;
    buildings: Record<string, {
        built: boolean;
        position?: { row: number; col: number };
        constructionStartedAt?: number | null;
    }>;
    partsCompleted: number[];
    partsAttached: number[];
    woodshopCrafting: { partId: number | null; startedAt: number | null };
    jewelshopCrafting: { partId: number | null; startedAt: number | null };
    harvestStates?: Record<string, { lastHarvestAt: number }>;
    seenNewDay?: { buildMenu: number; woodshop: number; jewelshop: number };
    shownDialogs?: string[];
    savedAt: number;
}

// ============================================================
// Mock storage + transaction simulation
// ============================================================
//
// In production, this state lives in a single Postgres row:
//
//   CREATE TABLE player_saves (
//     player_id uuid PRIMARY KEY,
//     state jsonb NOT NULL,
//     updated_at timestamptz NOT NULL DEFAULT now()
//   );
//
// Every save = one UPSERT. Postgres guarantees single-row atomicity
// for that UPSERT, so there is no way to partially apply a change.

let mockRow: SaveData | null = null;

// ============================================================
// Transaction guarantees
// ============================================================
//
// Multiple user actions in quick succession (e.g. rapid tapping)
// would each schedule a write. We coalesce them: only the latest
// state is ever sent, and at most one flight is in progress at a
// time. If a newer save is requested while one is flying, it waits
// until the current one resolves, then sends the newer state. This
// prevents out-of-order writes (older state overwriting newer).
//
// A failing save is retried once automatically; if that also fails,
// the error is surfaced to the caller.

let flightPromise: Promise<void> | null = null;
let pendingTrigger = false;

async function doUpsert(data: SaveData): Promise<void> {
    // === Real Supabase call would go here ===
    // const { error } = await supabase
    //     .from('player_saves')
    //     .upsert({
    //         player_id: PLAYER_ID,
    //         state: data,
    //         updated_at: new Date().toISOString(),
    //     }, { onConflict: 'player_id' });
    // if (error) throw error;

    // Mock: simulate ~20ms network latency + in-memory overwrite
    await new Promise(r => setTimeout(r, 20));
    mockRow = { ...data, savedAt: Date.now() };
    // eslint-disable-next-line no-console
    console.debug('[DB] upsert ok', { day: data.currentDay, savedAt: mockRow.savedAt });
}

/**
 * Persist current store state atomically.
 *
 * Collapses concurrent calls: if a save is already in flight, the
 * next save is queued, and once the flight resolves the LATEST
 * serialized state is sent (not the one at the time of queueing).
 * This matches "last write wins" semantics at the Supabase row.
 */
export async function saveGame(): Promise<void> {
    // If a save is already flying, just mark that another snapshot
    // should go out as soon as the flight finishes.
    if (flightPromise) {
        pendingTrigger = true;
        return flightPromise;
    }

    const runFlight = async () => {
        try {
            // Take snapshot AT SEND TIME, not at schedule time, so
            // rapid actions collapse into a single final state.
            const snapshot = getSerializableState() as SaveData;
            await doUpsertWithRetry(snapshot);
        } finally {
            flightPromise = null;
            if (pendingTrigger) {
                pendingTrigger = false;
                // Fire-and-forget the follow-up; callers already
                // awaited the original flight.
                void saveGame();
            }
        }
    };

    flightPromise = runFlight();
    return flightPromise;
}

async function doUpsertWithRetry(data: SaveData): Promise<void> {
    try {
        await doUpsert(data);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[DB] upsert failed, retrying once', err);
        await new Promise(r => setTimeout(r, 100));
        await doUpsert(data); // second failure propagates
    }
}

// ============================================================
// Read-side
// ============================================================

export async function loadGame(playerId: string): Promise<SaveData | null> {
    void playerId;
    // === Real Supabase call would go here ===
    // const { data, error } = await supabase
    //     .from('player_saves')
    //     .select('state')
    //     .eq('player_id', PLAYER_ID)
    //     .maybeSingle();
    // if (error) throw error;
    // return (data?.state as SaveData) ?? null;

    // Mock: first load returns the seed, subsequent loads return
    // whatever was last written in this session.
    await new Promise(r => setTimeout(r, 10));
    if (!mockRow) mockRow = { ...MOCK_SEED };
    return mockRow;
}

export async function deleteSave(playerId: string): Promise<void> {
    void playerId;
    // === Real Supabase call would go here ===
    // await supabase.from('player_saves').delete().eq('player_id', PLAYER_ID);
    mockRow = null;
}

export async function hasSave(playerId: string): Promise<boolean> {
    void playerId;
    return mockRow !== null;
}

export async function resetAllSaves(): Promise<void> {
    mockRow = null;
}

// ============================================================
// Mock seed (initial state for first load in this session)
// ============================================================

// Fresh-game seed. Mirrors the Zustand store's initial state so "first load"
// and "brand new player" converge. currentDay is NOT serialized (the app
// recomputes from the real date at load time).
const MOCK_SEED: SaveData = {
    currentDay: 1,
    tutorialStep: 0,
    boxStage: 1,
    packagingStartedAt: null,
    boxHarvested: false,
    // Starter wood enough for all Day 1 parts + the woodshop, so the player
    // can progress on Saturday with only 1–2 wood farm harvests.
    resources: {
        wood: { amount: 2500, unlocked: true },
        flower: { amount: 0, unlocked: false },
        stone: { amount: 0, unlocked: false },
        metal: { amount: 0, unlocked: false },
        gem: { amount: 0, unlocked: false },
    },
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
    // wood_farm is instantly ready so the Day 1 harvest tutorial can fire.
    harvestStates: {
        wood_farm: { lastHarvestAt: Date.now() - 90 * 60_000 },
    },
    savedAt: Date.now(),
};

// ============================================================
// Apply loaded data to the Zustand store
// ============================================================

export function applyLoadedData(data: SaveData): void {
    // currentDay is date-based, don't override from saved data
    const patch: Partial<ReturnType<typeof useGameStore.getState>> = {
        tutorialStep: data.tutorialStep,
        boxStage: data.boxStage,
        packagingStartedAt: data.packagingStartedAt,
        boxHarvested: data.boxHarvested,
        resources: data.resources,
        buildings: data.buildings,
        partsCompleted: data.partsCompleted,
        partsAttached: data.partsAttached,
        woodshopCrafting: data.woodshopCrafting,
        jewelshopCrafting: data.jewelshopCrafting,
    };
    if (data.harvestStates) patch.harvestStates = data.harvestStates;
    if (data.seenNewDay) patch.seenNewDay = data.seenNewDay;
    if (data.shownDialogs) patch.shownDialogs = data.shownDialogs;
    useGameStore.setState(patch);
}

// ============================================================
// Auto-save wiring
// ============================================================
//
// Subscribes to the persistent slice of the Zustand store. Any
// mutation schedules a debounced saveGame(). Debouncing collapses
// burst actions (rapid harvests) into one upsert. The saveGame()
// function itself is also serialized so at most one network call
// is in flight at a time.

const SAVE_DEBOUNCE_MS = 300;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let storeUnsub: (() => void) | null = null;

function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        saveTimer = null;
        saveGame().catch(err => {
            // eslint-disable-next-line no-console
            console.error('[DB] scheduled save failed', err);
        });
    }, SAVE_DEBOUNCE_MS);
}

/** Start watching persistent store slices and auto-saving on change. */
export function startAutoSave(): void {
    stopAutoSave();
    let prev = pickPersistent(useGameStore.getState());
    storeUnsub = useGameStore.subscribe((state) => {
        const next = pickPersistent(state);
        if (!persistentEqual(prev, next)) {
            prev = next;
            scheduleSave();
        }
    });
}

export function stopAutoSave(): void {
    if (storeUnsub) { storeUnsub(); storeUnsub = null; }
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
}

type PersistentSlice = {
    resources: unknown;
    buildings: unknown;
    harvestStates: unknown;
    partsCompleted: unknown;
    partsAttached: unknown;
    boxStage: unknown;
    packagingStartedAt: unknown;
    boxHarvested: unknown;
    woodshopCrafting: unknown;
    jewelshopCrafting: unknown;
    tutorialStep: unknown;
    seenNewDay: unknown;
    shownDialogs: unknown;
};

function pickPersistent(s: ReturnType<typeof useGameStore.getState>): PersistentSlice {
    return {
        resources: s.resources,
        buildings: s.buildings,
        harvestStates: s.harvestStates,
        partsCompleted: s.partsCompleted,
        partsAttached: s.partsAttached,
        boxStage: s.boxStage,
        packagingStartedAt: s.packagingStartedAt,
        boxHarvested: s.boxHarvested,
        woodshopCrafting: s.woodshopCrafting,
        jewelshopCrafting: s.jewelshopCrafting,
        tutorialStep: s.tutorialStep,
        seenNewDay: s.seenNewDay,
        shownDialogs: s.shownDialogs,
    };
}

function persistentEqual(a: PersistentSlice, b: PersistentSlice): boolean {
    // Reference equality check — Zustand preserves refs when state
    // doesn't change, and all our mutating actions produce new
    // object references for the touched slices.
    return (
        a.resources === b.resources &&
        a.buildings === b.buildings &&
        a.harvestStates === b.harvestStates &&
        a.partsCompleted === b.partsCompleted &&
        a.partsAttached === b.partsAttached &&
        a.boxStage === b.boxStage &&
        a.packagingStartedAt === b.packagingStartedAt &&
        a.boxHarvested === b.boxHarvested &&
        a.woodshopCrafting === b.woodshopCrafting &&
        a.jewelshopCrafting === b.jewelshopCrafting &&
        a.tutorialStep === b.tutorialStep &&
        a.seenNewDay === b.seenNewDay &&
        a.shownDialogs === b.shownDialogs
    );
}
