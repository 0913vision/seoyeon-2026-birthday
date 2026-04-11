/**
 * Database service layer.
 *
 * Strategy: entire player state is stored as a single JSONB row in
 * `player_saves`. Every state mutation triggers a debounced full-row
 * upsert, which is atomic on the Postgres side. This guarantees no
 * partial-write races (e.g., resources deducted but building not added).
 *
 * Dual-mode:
 *   - If VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are configured
 *     (via .env), supabaseClient exposes a real client and every entry
 *     point below talks to Postgres.
 *   - If either env var is missing, supabaseClient is `null` and this
 *     module transparently falls back to an in-memory mock so the game
 *     still runs in local dev without a database.
 *
 * The concurrency layer (in-flight coalescing, debounce, retry) is the
 * same in both modes.
 */

import { useGameStore, getSerializableState } from '../store/useGameStore';
import { supabase } from './supabaseClient';

/**
 * Current save schema version. Bump when SaveData changes shape and
 * add a migrator branch in `migrateSaveData` below.
 */
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Player id is derived from the URL path, resolved once at module load:
 *   /        → 'seoyeon'  (real game)
 *   /debug   → 'debug'    (debug save)
 *
 * Routing for the /debug path is handled by vercel.json (rewrite to
 * /index.html) so the same SPA bundle is served.
 */
const PLAYER_ID: string =
    typeof window !== 'undefined' && window.location.pathname === '/debug'
        ? 'debug'
        : 'seoyeon';

// ============================================================
// Types
// ============================================================

export interface SaveData {
    /** Schema version. Bump on shape changes + add a migrator branch. */
    schemaVersion?: number;
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

/**
 * Upgrade a loaded SaveData across schema versions. Currently a
 * no-op because only version 1 exists. When bumping the schema,
 * add a branch per version and always flow through to the latest.
 *
 * Rows written before schemaVersion existed are treated as v1.
 */
function migrateSaveData(data: SaveData): SaveData {
    const version = data.schemaVersion ?? 1;
    switch (version) {
        case 1:
            // no-op — already current
            break;
        default:
            // Unknown future version — leave untouched, warn.
            // eslint-disable-next-line no-console
            console.warn('[DB] unknown schemaVersion', version);
    }
    return { ...data, schemaVersion: CURRENT_SCHEMA_VERSION };
}

// ============================================================
// Mock storage + transaction simulation
// ============================================================
//
// When Supabase is not configured, we keep the current player's save
// in this single in-memory slot. Schema authored in supabase/schema.sql:
//
//   CREATE TABLE player_saves (
//     player_id  text PRIMARY KEY,
//     state      jsonb NOT NULL,
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
    const stamped: SaveData = {
        ...data,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        savedAt: Date.now(),
    };

    if (supabase) {
        const { error } = await supabase
            .from('player_saves')
            .upsert(
                {
                    player_id: PLAYER_ID,
                    state: stamped,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'player_id' },
            );
        if (error) throw error;
        // eslint-disable-next-line no-console
        console.debug('[DB] upsert ok', { player: PLAYER_ID, day: stamped.currentDay, savedAt: stamped.savedAt });
        return;
    }

    // Mock fallback: simulate ~20ms network latency + in-memory overwrite
    await new Promise(r => setTimeout(r, 20));
    mockRow = stamped;
    // eslint-disable-next-line no-console
    console.debug('[DB] upsert ok (mock)', { player: PLAYER_ID, day: stamped.currentDay, savedAt: stamped.savedAt });
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
    // playerId arg is accepted for API compatibility but the real id
    // used is always the module-level PLAYER_ID (path-derived).
    void playerId;

    if (supabase) {
        const { data, error } = await supabase
            .from('player_saves')
            .select('state')
            .eq('player_id', PLAYER_ID)
            .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return migrateSaveData(data.state as SaveData);
    }

    // Mock: first load returns the seed, subsequent loads return
    // whatever was last written in this session.
    await new Promise(r => setTimeout(r, 10));
    if (!mockRow) mockRow = { ...MOCK_SEED };
    return mockRow;
}

export async function deleteSave(playerId: string): Promise<void> {
    void playerId;
    if (supabase) {
        const { error } = await supabase
            .from('player_saves')
            .delete()
            .eq('player_id', PLAYER_ID);
        if (error) throw error;
        return;
    }
    mockRow = null;
}

export async function hasSave(playerId: string): Promise<boolean> {
    void playerId;
    if (supabase) {
        const { data, error } = await supabase
            .from('player_saves')
            .select('player_id')
            .eq('player_id', PLAYER_ID)
            .maybeSingle();
        if (error) throw error;
        return data !== null;
    }
    return mockRow !== null;
}

export async function resetAllSaves(): Promise<void> {
    if (supabase) {
        // Only clears the current PLAYER_ID row. Resetting "all"
        // saves would require deleting both 'seoyeon' and 'debug',
        // which is not a useful operation in practice.
        const { error } = await supabase
            .from('player_saves')
            .delete()
            .eq('player_id', PLAYER_ID);
        if (error) throw error;
        return;
    }
    mockRow = null;
}

// ============================================================
// Mock seed (initial state for first load in this session)
// ============================================================

// Fresh-game seed. Mirrors the Zustand store's initial state so "first load"
// and "brand new player" converge. currentDay is NOT serialized (the app
// recomputes from the real date at load time).
const MOCK_SEED: SaveData = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
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
