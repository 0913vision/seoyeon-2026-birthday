// Pre-placed terrain tiles. These occupy a tile (cannot be built on)
// and certain buildings require adjacency to a specific terrain.

export interface TerrainDef {
    id: string;
    name: string;
    spriteKey: string;
    row: number;       // top-left tile row
    col: number;       // top-left tile col
    width?: number;    // tile width (default 1)
    height?: number;   // tile height (default 1)
    originY: number;
    scale: number;
    offX: number;
    offY: number;
    labelOffY?: number; // extra Y offset for label (positive = lower, default 0)
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
        row: 5, col: 10, width: 2, height: 2,
        originY: 0.58, scale: 2.4, offX: 6, offY: 0,
        labelOffY: 60,
    },
    {
        id: 'cave_entrance', name: '동굴', spriteKey: 'cave_entrance',
        row: 10, col: 4, width: 2, height: 2,
        originY: 0.61, scale: 2.0, offX: -2.5, offY: -1,
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

// Iterate over all tiles occupied by a multi-tile terrain.
export function* terrainCells(t: TerrainDef): Generator<{ row: number; col: number }> {
    const w = t.width ?? 1;
    const h = t.height ?? 1;
    for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
            yield { row: t.row + r, col: t.col + c };
        }
    }
}

// Returns true if (row, col) is in the "front" area of any terrain tile of the given type.
// "Front" = the isometric down-right column + down-right row + corner.
//   1x1 terrain → 3 front cells
//   2x2 terrain → 5 front cells
// Specifically, for a terrain spanning rows [tr, tr+h-1] cols [tc, tc+w-1]:
//   - right col: (tr+i, tc+w) for i in [0, h-1]
//   - bottom row: (tr+h, tc+j) for j in [0, w-1]
//   - bottom-right corner: (tr+h, tc+w)
export function isAdjacentToTerrain(row: number, col: number, terrainId: string): boolean {
    const targets = TERRAIN.filter(t => t.id === terrainId);
    for (const t of targets) {
        const w = t.width ?? 1;
        const h = t.height ?? 1;
        // Right column
        for (let i = 0; i < h; i++) {
            if (row === t.row + i && col === t.col + w) return true;
        }
        // Bottom row
        for (let j = 0; j < w; j++) {
            if (row === t.row + h && col === t.col + j) return true;
        }
        // Bottom-right corner
        if (row === t.row + h && col === t.col + w) return true;
    }
    return false;
}
