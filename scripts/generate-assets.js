const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const API_KEY = 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

const BASE_STYLE = 'clash of clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art';

const ASSETS = [
    // === Buildings (7) ===
    { dir: 'buildings', name: 'wood_farm', prompt: `isometric game building, cute small lumber yard with 3 round cartoon trees and stacked wood log pile, green grass base, ${BASE_STYLE}, single building` },
    { dir: 'buildings', name: 'flower_farm', prompt: `isometric game building, colorful flower garden with wooden fence border, pink purple yellow flowers in bloom, small watering can, ${BASE_STYLE}, single building` },
    { dir: 'buildings', name: 'quarry', prompt: `isometric game building, small stone quarry with rocky outcrop, stacked grey stones, tiny pickaxe leaning on rocks, mossy accents, ${BASE_STYLE}, single building` },
    { dir: 'buildings', name: 'woodshop', prompt: `isometric game building, cute wooden carpentry workshop with workbench and tools, small cozy cottage with chimney, sawdust pile, ${BASE_STYLE}, single building` },
    { dir: 'buildings', name: 'mine', prompt: `isometric game building, mine entrance carved into small hill, wooden support beams, tiny minecart on rails, warm lantern glow from inside, ${BASE_STYLE}, single building` },
    { dir: 'buildings', name: 'jewelshop', prompt: `isometric game building, elegant jeweler workshop with stone walls, crystal and gem accents on roof, jeweler bench visible, blue purple accent tones, ${BASE_STYLE}, single building` },
    { dir: 'buildings', name: 'gem_cave', prompt: `isometric game building, crystal cave entrance with purple pink crystals growing around opening, magical glow from inside, sparkling gems, ${BASE_STYLE}, single building` },

    // === Gift Box (4 stages) ===
    { dir: 'giftbox', name: 'box_empty', prompt: `isometric game object, empty wooden gift box frame on grass platform, simple wooden planks forming open box shape, no decorations, ${BASE_STYLE}, single object` },
    { dir: 'giftbox', name: 'box_half', prompt: `isometric game object, half-decorated birthday gift box, wooden box with some flower decorations and number 24 on front, metal handles, partially complete, ${BASE_STYLE}, single object` },
    { dir: 'giftbox', name: 'box_complete', prompt: `isometric game object, magnificently decorated birthday gift box, covered in flowers crystals metal trim, number 24 on front, crystal crown on top, colorful ribbons, sparkling gems, ${BASE_STYLE}, single object` },
    { dir: 'giftbox', name: 'box_wrapped', prompt: `isometric game object, beautifully wrapped birthday gift box with golden ribbon bow on top, red wrapping with gold accents, elegant and festive, ${BASE_STYLE}, single object` },

    // === Resource Icons (5) ===
    { dir: 'resources', name: 'wood', prompt: `game icon, bundle of 3 wooden logs tied with rope, simple clean icon, ${BASE_STYLE}, centered on white background, single item, no text` },
    { dir: 'resources', name: 'flower', prompt: `game icon, single beautiful pink flower with green leaves, simple clean icon, ${BASE_STYLE}, centered on white background, single item, no text` },
    { dir: 'resources', name: 'stone', prompt: `game icon, stack of 2 grey rounded stones, simple clean icon, ${BASE_STYLE}, centered on white background, single item, no text` },
    { dir: 'resources', name: 'metal', prompt: `game icon, shiny silver metal ingot bar with gleam highlight, simple clean icon, ${BASE_STYLE}, centered on white background, single item, no text` },
    { dir: 'resources', name: 'gem', prompt: `game icon, faceted purple pink crystal gem with sparkle, simple clean icon, ${BASE_STYLE}, centered on white background, single item, no text` },

    // === Parts (24) ===
    { dir: 'parts', name: 'part_01_base', prompt: `game icon, flat wooden board with visible wood grain, box base plate, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_02_body', prompt: `game icon, four wooden walls assembled into open-top box shape, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_03_front', prompt: `game icon, decorative wooden front panel with carved details, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_04_back', prompt: `game icon, simple wooden back panel, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_05_lid', prompt: `game icon, flat wooden lid piece slightly larger than box, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_06_flower_a', prompt: `game icon, small bouquet of pink flowers decorative cluster, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_07_wreath', prompt: `game icon, circular wreath made of mixed colorful flowers and green leaves, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_08_number2', prompt: `game icon, decorative stone carved numeral number 2, bold fancy font style, ${BASE_STYLE}, centered, single item` },
    { dir: 'parts', name: 'part_09_number4', prompt: `game icon, decorative stone carved numeral number 4, bold fancy font style matching, ${BASE_STYLE}, centered, single item` },
    { dir: 'parts', name: 'part_10_pedestal', prompt: `game icon, small ornate stone pedestal platform mount, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_11_handle', prompt: `game icon, ornate curved silver metal handle, polished, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_12_buckle', prompt: `game icon, decorative round metal buckle clasp with engravings, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_13_trim', prompt: `game icon, L-shaped metal corner trim piece with engraved details, silver, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_14_crystal_star', prompt: `game icon, star-shaped purple pink crystal sparkling, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_15_gem_deco', prompt: `game icon, cluster of small colorful gems set in ornate metal frame, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_16_metal_frame', prompt: `game icon, rectangular ornamental metal frame with gem inlays, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_17_flower_crown', prompt: `game icon, crown shape made of flowers and metal wire, royal floral crown, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_18_gem_ribbon', prompt: `game icon, ring loop with gem accents for holding ribbon, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_19_carved_plate', prompt: `game icon, stone plate with carved relief pattern and metal border, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_20_crystal_crown', prompt: `game icon, elaborate crown with large purple crystals and gold metal, royal, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_21_main_ribbon', prompt: `game icon, large flowing decorative ribbon with flowers and gems woven in, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_22_happy24_banner', prompt: `game icon, festive banner flag with text HAPPY 24, wood metal and gems decoration, ${BASE_STYLE}, centered, single item` },
    { dir: 'parts', name: 'part_23_firework', prompt: `game icon, sparkler firework burst shape made of crystal and metal, festive, ${BASE_STYLE}, centered, single item, no text` },
    { dir: 'parts', name: 'part_24_final_knot', prompt: `game icon, elaborate decorative bow knot with flowers metal and gems, the crowning piece, ${BASE_STYLE}, centered, single item, no text` },

    // === Terrain (4) ===
    { dir: 'terrain', name: 'grass_light', prompt: `isometric tile, light green grass ground tile, simple clean lawn, diamond shape, ${BASE_STYLE}, single tile, top-down isometric view` },
    { dir: 'terrain', name: 'grass_dark', prompt: `isometric tile, darker green grass ground tile with slight texture, diamond shape, ${BASE_STYLE}, single tile, top-down isometric view` },
    { dir: 'terrain', name: 'dirt_path', prompt: `isometric tile, brown dirt path ground tile, worn earth, diamond shape, ${BASE_STYLE}, single tile, top-down isometric view` },
    { dir: 'terrain', name: 'stone_path', prompt: `isometric tile, grey cobblestone path ground tile, diamond shape, ${BASE_STYLE}, single tile, top-down isometric view` },
];

async function apiCall(method, url, body) {
    const opts = {
        method,
        headers: {
            'Authorization': `Basic ${AUTH}`,
            'Content-Type': 'application/json',
            'accept': 'application/json',
        },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    return resp.json();
}

async function generateImage(prompt) {
    const data = await apiCall('POST', 'https://api.cloud.scenario.com/v1/generate/custom/model_imagen4-ultra', {
        prompt,
        aspectRatio: '1:1',
    });
    return data.job.jobId;
}

async function waitForJob(jobId) {
    while (true) {
        await new Promise(r => setTimeout(r, 5000));
        const data = await apiCall('GET', `https://api.cloud.scenario.com/v1/jobs/${jobId}`);
        const status = data.job.status;
        if (status === 'success') {
            return data.job.metadata.assetIds[0];
        } else if (status === 'failed') {
            throw new Error(`Job ${jobId} failed`);
        }
        process.stdout.write('.');
    }
}

async function downloadAsset(assetId, outputPath) {
    const data = await apiCall('GET', `https://api.cloud.scenario.com/v1/assets/${assetId}`);
    const url = data.asset.url;
    const resp = await fetch(url);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(outputPath, buf);
}

async function removeWhiteBg(inputPath, outputPath) {
    const img = await loadImage(inputPath);
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i+1], b = d.data[i+2];
        // Make near-white pixels transparent
        if (r > 240 && g > 240 && b > 240) {
            d.data[i+3] = 0;
        } else if (r > 220 && g > 220 && b > 220) {
            // Semi-transparent for edge pixels
            d.data[i+3] = Math.round(255 * (1 - (r + g + b - 660) / (765 - 660)));
        }
    }
    ctx.putImageData(d, 0, 0);
    fs.writeFileSync(outputPath, c.toBuffer('image/png'));
}

async function main() {
    const outDir = path.resolve('public/assets/generated');
    const total = ASSETS.length;
    let done = 0;
    let totalCU = 0;

    console.log(`\n=== Generating ${total} assets with imagen4-ultra ===\n`);

    for (const asset of ASSETS) {
        const dir = path.join(outDir, asset.dir);
        const rawPath = path.join(dir, `${asset.name}_raw.png`);
        const finalPath = path.join(dir, `${asset.name}.png`);

        // Skip if already generated
        if (fs.existsSync(finalPath)) {
            done++;
            console.log(`[${done}/${total}] SKIP ${asset.dir}/${asset.name} (already exists)`);
            continue;
        }

        try {
            done++;
            process.stdout.write(`[${done}/${total}] ${asset.dir}/${asset.name} ... generating`);

            const jobId = await generateImage(asset.prompt);
            totalCU += 10;
            const assetId = await waitForJob(jobId);

            process.stdout.write(' downloading');
            await downloadAsset(assetId, rawPath);

            process.stdout.write(' removing bg');
            await removeWhiteBg(rawPath, finalPath);

            console.log(` ✓ (${totalCU} CU used)`);
        } catch (err) {
            console.log(` ✗ ERROR: ${err.message}`);
        }

        // Small delay between requests
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n=== Done! ${done} assets, ${totalCU} CU total ===`);
}

main().catch(console.error);
