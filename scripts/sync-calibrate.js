// Extracts calibration values from source code and writes them into
// calibrate.html so the two never drift. Run with `node scripts/sync-calibrate.js`.
//
// Sources:
//   - src/game/scenes/GameScene.ts  → DATA_BUILDINGS, BOX_STAGE_CAL, merchant truck
//   - src/data/terrain.ts           → TERRAIN array

const fs = require('fs');
const path = require('path');

const GS = fs.readFileSync(path.resolve('src/game/scenes/GameScene.ts'), 'utf8');
const TER = fs.readFileSync(path.resolve('src/data/terrain.ts'), 'utf8');
const CAL = path.resolve('public/calibrate.html');
let html = fs.readFileSync(CAL, 'utf8');

// Parse BUILDINGS from GameScene
function parseBuildingsArray() {
    const m = GS.match(/const BUILDINGS:\s*BuildingDef\[\]\s*=\s*\[([\s\S]*?)\];/);
    if (!m) throw new Error('BUILDINGS array not found');
    const entries = [];
    const re = /\{\s*row:\s*\d+[\s\S]*?label:\s*'([^']+)'[\s\S]*?spriteKey:\s*'([^']+)'[\s\S]*?originY:\s*([\d.]+)[\s\S]*?scale:\s*([\d.]+)[\s\S]*?offX:\s*([\d.e-]+)[\s\S]*?offY:\s*([\d.e-]+)/g;
    let match;
    while ((match = re.exec(m[1]))) {
        entries.push({
            id: match[2],
            name: match[1],
            originY: parseFloat(match[3]),
            scale: parseFloat(match[4]),
            offX: parseFloat(match[5]),
            offY: parseFloat(match[6]),
        });
    }
    return entries;
}

// Parse BOX_STAGE_CAL
function parseBoxStageCal() {
    const m = GS.match(/const BOX_STAGE_CAL[\s\S]*?=\s*\{([\s\S]*?)\};/);
    if (!m) return [];
    const entries = [];
    const re = /(\d+):\s*\{\s*originY:\s*([\d.]+)\s*,\s*scale:\s*([\d.]+)\s*,\s*offX:\s*([\d.e-]+)\s*,\s*offY:\s*([\d.e-]+)/g;
    let match;
    while ((match = re.exec(m[1]))) {
        entries.push({
            id: `box_stage${match[1]}`,
            stage: parseInt(match[1]),
            originY: parseFloat(match[2]),
            scale: parseFloat(match[3]),
            offX: parseFloat(match[4]),
            offY: parseFloat(match[5]),
        });
    }
    return entries;
}

// Parse TERRAIN from terrain.ts
function parseTerrain() {
    const entries = [];
    const re = /id:\s*'([^']+)'[\s\S]*?name:\s*'([^']+)'[\s\S]*?spriteKey:\s*'([^']+)'[\s\S]*?originY:\s*([\d.]+)[\s\S]*?scale:\s*([\d.]+)[\s\S]*?offX:\s*([\d.e-]+)[\s\S]*?offY:\s*([\d.e-]+)/g;
    let match;
    while ((match = re.exec(TER))) {
        entries.push({
            id: match[3],
            name: match[2],
            originY: parseFloat(match[4]),
            scale: parseFloat(match[5]),
            offX: parseFloat(match[6]),
            offY: parseFloat(match[7]),
        });
    }
    return entries;
}

// Parse merchant truck values
function parseMerchantTruck() {
    const m = GS.match(/spawnMerchantTruck[\s\S]*?setOrigin\([\d.]+,\s*([\d.]+)\)/);
    const s = GS.match(/spawnMerchantTruck[\s\S]*?TILE_W\s*\*\s*([\d.]+)\s*\/\s*sprite\.width/);
    const o = GS.match(/spawnMerchantTruck[\s\S]*?y\s*\+\s*\((-?[\d.]+)\)\s*\*\s*DPR/);
    return {
        id: 'merchant_truck',
        name: '🚛 가죽상인',
        originY: m ? parseFloat(m[1]) : 0.56,
        scale: s ? parseFloat(s[1]) : 1.85,
        offX: 0,
        offY: o ? parseFloat(o[1]) : -20,
    };
}

// Build the JS array for calibrate.html
const spriteMap = {
    woodfarm: 'assets/generated/buildings/wood_farm.png',
    flowerfarm: 'assets/generated/buildings/flower_farm.png',
    quarry: 'assets/generated/buildings/quarry.png',
    woodshop: 'assets/generated/buildings/woodshop.png',
    mine: 'assets/generated/buildings/mine.png',
    jewelshop: 'assets/generated/buildings/jewelshop.png',
    gemcave: 'assets/generated/buildings/gem_cave.png',
    box_empty: 'assets/generated/giftbox/box_stage1_base.png',
};

const stageFiles = {
    1: 'box_stage1_base', 2: 'box_stage2_frame', 3: 'box_stage3_flowers',
    4: 'box_stage4_numbers', 5: 'box_stage5_metal', 6: 'box_stage6_complete',
    7: 'box_stage7_packaging', 8: 'box_stage8_wrapped',
};

const terrainFiles = {
    rock_outcrop: 'rock_outcrop', crystal_cluster: 'crystal_cluster',
    flower_patch: 'flower_patch', cave_entrance: 'cave_entrance',
};

try {
    const buildings = parseBuildingsArray();
    const boxStages = parseBoxStageCal();
    const terrains = parseTerrain();
    const truck = parseMerchantTruck();

    const lines = [];
    // Buildings (skip box_empty — it's in box stages)
    for (const b of buildings) {
        if (b.id === 'box_empty') continue;
        const p = spriteMap[b.id] || `assets/generated/buildings/${b.id}.png`;
        lines.push(`            { id: '${b.id}', name: '${b.name}', path: '${p}', originY: ${b.originY}, scale: ${b.scale}, offX: ${b.offX}, offY: ${b.offY} },`);
    }
    // Box stages
    for (const s of boxStages.sort((a, b) => a.stage - b.stage)) {
        const fname = stageFiles[s.stage];
        const emoji = ['', '🎁', '🎁', '🎁', '🎁', '🎁', '🎁', '🎁', '🎁'][s.stage];
        lines.push(`            { id: '${s.id}', name: '${emoji} 상자 ${s.stage}단계', path: 'assets/generated/giftbox/${fname}.png', originY: ${s.originY}, scale: ${s.scale}, offX: ${s.offX}, offY: ${s.offY} },`);
    }
    // Terrain
    for (const t of terrains) {
        const p = `assets/generated/terrain/${terrainFiles[t.id] || t.id}.png`;
        lines.push(`            { id: '${t.id}', name: '${t.name}', path: '${p}', originY: ${t.originY}, scale: ${t.scale}, offX: ${t.offX}, offY: ${t.offY} },`);
    }
    // Truck
    lines.push(`            { id: '${truck.id}', name: '${truck.name}', path: 'assets/generated/terrain/merchant_truck.png', originY: ${truck.originY}, scale: ${truck.scale}, offX: ${truck.offX}, offY: ${truck.offY} },`);

    const arrayStr = lines.join('\n');

    // Replace the buildings array in calibrate.html
    const replaced = html.replace(
        /const buildings = \[\n([\s\S]*?)\n        \];/,
        `const buildings = [\n${arrayStr}\n        ];`
    );

    if (replaced === html) {
        console.log('WARNING: no replacement made — regex did not match');
    } else {
        fs.writeFileSync(CAL, replaced);
        console.log(`Synced ${lines.length} entries into calibrate.html`);
    }
} catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
}
