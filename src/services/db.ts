/**
 * Database service layer.
 *
 * Currently: MOCK (함수만 존재, 실제 저장 안 함)
 * 나중에: Supabase 연동
 *
 * 교체 시 이 파일만 수정하면 됩니다.
 */

import { useGameStore, getSerializableState } from '../store/useGameStore';

export interface SaveData {
    currentDay: number;
    tutorialStep: number;
    boxStage: number;
    packagingStartedAt: number | null;
    boxHarvested: boolean;
    resources: Record<string, { amount: number; unlocked: boolean }>;
    buildings: Record<string, { built: boolean; position?: { row: number; col: number } }>;
    partsCompleted: number[];
    partsAttached: number[];
    woodshopCrafting: { partId: number | null; startedAt: number | null };
    jewelshopCrafting: { partId: number | null; startedAt: number | null };
    harvestStates?: Record<string, { lastHarvestAt: number }>;
    savedAt: number;
}

// ============================================================
// MOCK implementation — 함수 시그니처만 존재
// TODO: Supabase로 교체
// ============================================================

export async function saveGame(): Promise<void> {
    const state = getSerializableState();
    console.log('[DB:MOCK] saveGame() called', state);
    // TODO: supabase.from('game_saves').upsert({ player_id, ...state })
}

// Mock data: simulates what would come back from DB
// Change this to test different game states
const MOCK_SAVE: SaveData = {
    currentDay: 1,
    tutorialStep: 99, // tutorial complete (skip tutorial)
    boxStage: 1,
    packagingStartedAt: null,
    boxHarvested: false,
    resources: {
        wood: { amount: 3000, unlocked: true },
        flower: { amount: 2000, unlocked: true },
        stone: { amount: 3000, unlocked: true },
        metal: { amount: 2000, unlocked: true },
        gem: { amount: 1000, unlocked: true },
    },
    buildings: {
        box: { built: true, position: { row: 8, col: 8 } },
        wood_farm: { built: true, position: { row: 3, col: 4 } },
        woodshop: { built: true, position: { row: 5, col: 9 } },
        // Front of flower_patch (5,6): right col (5,7)
        flower_farm: { built: true, position: { row: 5, col: 7 } },
        // Front of rock 2x2 (5-6, 10-11): bottom row (7,11)
        quarry: { built: true, position: { row: 7, col: 11 } },
        // Front of cave 2x2 (10-11, 4-5): bottom row (12,5)
        mine: { built: true, position: { row: 12, col: 5 } },
        jewelshop: { built: true, position: { row: 7, col: 3 } },
        // Front of crystal (11,11): corner (12,12)
        gem_cave: { built: true, position: { row: 12, col: 12 } },
        // Frozen test construction (constructionStartedAt: -1 = never decrements)
        test_construction: { built: false, position: { row: 2, col: 2 }, constructionStartedAt: -1 },
    },
    partsCompleted: [],
    partsAttached: [],
    woodshopCrafting: { partId: null, startedAt: null },
    jewelshopCrafting: { partId: null, startedAt: null },
    // Debug: variety of progress states for visual testing.
    // wood_farm: 10 seconds before 100% (waiting → ready transition visible)
    // flower_farm/quarry/mine/gem_cave: ~50% of cycle elapsed
    harvestStates: {
        wood_farm:   { lastHarvestAt: Date.now() - (60 * 60_000 - 10_000) },
        flower_farm: { lastHarvestAt: Date.now() - 30 * 60_000 },
        quarry:      { lastHarvestAt: Date.now() - 30 * 60_000 },
        mine:        { lastHarvestAt: Date.now() - 45 * 60_000 },
        gem_cave:    { lastHarvestAt: Date.now() - 45 * 60_000 },
    },
    savedAt: Date.now(),
};

export async function loadGame(playerId: string): Promise<SaveData | null> {
    console.log('[DB:MOCK] loadGame() called, playerId:', playerId);
    console.log('[DB:MOCK] Returning mock save data (Day 3, 10/24 parts)');
    // TODO: supabase.from('game_saves').select('*').eq('player_id', playerId).single()
    return MOCK_SAVE;
}

export async function deleteSave(playerId: string): Promise<void> {
    console.log('[DB:MOCK] deleteSave() called, playerId:', playerId);
    // TODO: supabase.from('game_saves').delete().eq('player_id', playerId)
}

export async function hasSave(playerId: string): Promise<boolean> {
    console.log('[DB:MOCK] hasSave() called, playerId:', playerId);
    // TODO: supabase.from('game_saves').select('id').eq('player_id', playerId).single()
    return false;
}

export async function resetAllSaves(): Promise<void> {
    console.log('[DB:MOCK] resetAllSaves() called');
    // TODO: supabase.from('game_saves').delete().neq('id', '')
}

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
    useGameStore.setState(patch);
}

// ============================================================
// Auto-save (호출만 해두고 실제 저장은 mock)
// ============================================================

let autoSaveInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoSave(intervalMs = 60000): void {
    stopAutoSave();
    autoSaveInterval = setInterval(() => saveGame(), intervalMs);
}

export function stopAutoSave(): void {
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
}
