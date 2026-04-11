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
        id: 'flower_patch', name: '꽃', spriteKey: 'flower_patch',
        row: 5, col: 6, originY: 0.64, scale: 1.6, offX: 0, offY: 0,
    },
    {
        id: 'rock_outcrop', name: '바위', spriteKey: 'rock_outcrop',
        row: 6, col: 11, originY: 0.58, scale: 1.2, offX: 6, offY: 0,
    },
    {
        id: 'cave_entrance', name: '동굴', spriteKey: 'cave_entrance',
        row: 11, col: 5, originY: 0.61, scale: 1.0, offX: -2.5, offY: -1,
    },
    {
        id: 'crystal_cluster', name: '수정', spriteKey: 'crystal_cluster',
        row: 11, col: 11, originY: 0.72, scale: 1.7, offX: 0, offY: 0,
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
