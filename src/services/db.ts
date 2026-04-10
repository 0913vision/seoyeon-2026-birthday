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
const MOCK_SAVE: SaveData = {
    currentDay: 3,
    tutorialStep: 99, // tutorial complete
    boxStage: 3,
    packagingStartedAt: null,
    boxHarvested: false,
    resources: {
        wood: { amount: 1200, unlocked: true },
        flower: { amount: 400, unlocked: true },
        stone: { amount: 600, unlocked: true },
        metal: { amount: 0, unlocked: false },
        gem: { amount: 0, unlocked: false },
    },
    buildings: {
        box: { built: true, position: { row: 8, col: 8 } },
        wood_farm: { built: true, position: { row: 3, col: 4 } },
        woodshop: { built: true, position: { row: 5, col: 9 } },
        flower_farm: { built: true, position: { row: 4, col: 12 } },
        quarry: { built: true, position: { row: 12, col: 3 } },
        mine: { built: false },
        jewelshop: { built: false },
        gem_cave: { built: false },
    },
    partsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    partsAttached: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    woodshopCrafting: { partId: null, startedAt: null },
    jewelshopCrafting: { partId: null, startedAt: null },
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
    useGameStore.setState({
        currentDay: data.currentDay,
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
    });
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
