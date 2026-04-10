// Pre-placed terrain tiles. These occupy a tile (cannot be built on)
// and certain buildings require adjacency to a specific terrain.

export interface TerrainDef {
    id: string;
    name: string;
    spriteKey: string;
    row: number;
    col: number;
    originY: number;
    scale: number;
    offX: number;
    offY: number;
}

// Initial pre-placed terrain.
// Constraints:
//   - Avoid 3x3 area around gift box (8,8): rows 7-9, cols 7-9
//   - Avoid wood farm at (3,4)
//   - Spread across the 16x16 grid
export const TERRAIN: TerrainDef[] = [
    {
        id: 'rock_outcrop', name: '바위', spriteKey: 'rock_outcrop',
        row: 4, col: 13, originY: 0.7, scale: 1.0, offX: 0, offY: 0,
    },
    {
        id: 'crystal_cluster', name: '수정', spriteKey: 'crystal_cluster',
        row: 12, col: 12, originY: 0.7, scale: 1.0, offX: 0, offY: 0,
    },
    {
        id: 'flower_patch', name: '꽃', spriteKey: 'flower_patch',
        row: 5, col: 2, originY: 0.7, scale: 1.0, offX: 0, offY: 0,
    },
    {
        id: 'cave_entrance', name: '동굴', spriteKey: 'cave_entrance',
        row: 12, col: 4, originY: 0.7, scale: 1.0, offX: 0, offY: 0,
    },
];

// Building → required adjacent terrain id (must be within 8 surrounding cells)
export const BUILDING_TERRAIN_REQUIRE: Record<string, string> = {
    quarry: 'rock_outcrop',
    gem_cave: 'crystal_cluster',
    flower_farm: 'flower_patch',
    mine: 'cave_entrance',
};

// Returns true if (row, col) is adjacent (8-directional) to any tile of the given terrain.
export function isAdjacentToTerrain(row: number, col: number, terrainId: string): boolean {
    const targets = TERRAIN.filter(t => t.id === terrainId);
    for (const t of targets) {
        const dr = Math.abs(t.row - row);
        const dc = Math.abs(t.col - col);
        if (dr <= 1 && dc <= 1 && (dr + dc) > 0) return true;
    }
    return false;
}
