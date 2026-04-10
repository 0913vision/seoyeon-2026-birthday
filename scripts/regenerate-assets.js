const fs = require('fs');
const path = require('path');

const API_KEY = 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');

const BASE = 'Clash of Clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art';

const ASSETS = [
    // Parts (15)
    { dir: 'parts', name: 'part_03_front', prompt: 'Cute cartoon 3D wooden front panel for a birthday gift box, with a small carved heart or star in the center, simple wood grain texture, warm honey-brown color, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_04_back', prompt: 'Cute cartoon 3D wooden back panel for a birthday gift box, simple plank design, warm honey-brown wood, small decorative nail heads, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_08_number2', prompt: 'Cute cartoon 3D number 2 made of smooth colorful stone, birthday party style, pastel pink or coral color with small star sparkles, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_09_number4', prompt: 'Cute cartoon 3D number 4 made of smooth colorful stone, birthday party style, matching pastel color with number 2, small star sparkles, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_10_pedestal', prompt: 'Cute cartoon 3D small wooden pedestal or platform for a gift box, warm wood color with small flower carvings on sides, birthday cake stand style, ' + BASE + ', isometric view, transparent background' },
    { dir: 'parts', name: 'part_11_handle', prompt: 'Cute cartoon 3D small decorative handle or knob for a gift box lid, simple rounded metal with one small gem accent, golden brass color, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_12_buckle', prompt: 'Cute cartoon 3D small decorative buckle or clasp for a birthday gift box, simple heart-shaped or bow-shaped metal clasp, golden color with small ribbon detail, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_13_trim', prompt: 'Cute cartoon 3D decorative metal corner trim piece for a gift box, L-shaped golden brass corner with small flower or heart engraving, warm metallic color, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_15_gem_deco', prompt: 'Cute cartoon 3D small gem decoration cluster for a birthday gift box, 3-4 small pastel colored gems pink light blue lavender arranged in a flower pattern, delicate gold setting, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_16_metal_frame', prompt: 'Cute cartoon 3D decorative metal frame border for a gift box front, rectangular golden frame with small star and heart details at corners, warm brass color, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_17_flower_crown', prompt: 'Cute cartoon 3D flower garland or flower topper decoration for a birthday gift box, mixed colorful flowers roses daisies woven together in a half-circle arch shape, NO crown shape, green vine base with blooming flowers, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_19_carved_plate', prompt: 'Cute cartoon 3D decorative carved round plate or medallion for a birthday gift box, with carved flower and heart pattern, smooth stone with golden paint accents, warm and celebratory feel, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_20_crystal_crown', prompt: 'Cute cartoon 3D crystal star topper or decorative finial for a birthday gift box lid, sparkling crystal in pink and gold, star or flower shape NOT a crown, celebratory birthday feel, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_21_main_ribbon', prompt: 'Cute cartoon 3D wide satin ribbon spiral for wrapping a birthday gift box, soft pink or light blue color with golden edges, a few small flowers tucked in, elegant but not over-decorated, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_22_happy24_banner', prompt: 'Cute cartoon 3D birthday banner or pennant flag reading HAPPY 24, fabric banner with scalloped edges, pastel colors pink yellow mint, hung with small string, party bunting style, ' + BASE + ', transparent background' },
    { dir: 'parts', name: 'part_24_final_knot', prompt: 'Cute cartoon 3D large decorative bow knot for the top of a birthday gift box, soft satin ribbon bow in pink and gold, with a small flower cluster in center instead of gems, elegant and celebratory, ' + BASE + ', transparent background' },
    // Gift box stages (7)
    { dir: 'giftbox', name: 'box_stage1_base', prompt: 'Cute cartoon 3D wooden base platform sitting on grass, just a flat wooden plank with four small corner posts starting to rise, beginning of a gift box, warm honey-brown wood, isometric view, ' + BASE + ', transparent background' },
    { dir: 'giftbox', name: 'box_stage2_frame', prompt: 'Cute cartoon 3D open wooden box without lid sitting on grass, simple wooden crate with visible wood grain, four walls complete but no lid, warm honey-brown color, isometric view, ' + BASE + ', transparent background' },
    { dir: 'giftbox', name: 'box_stage3_flowers', prompt: 'Cute cartoon 3D closed wooden gift box on grass, lid on top, a few pink flowers and a small wreath decorating one side, beginning to look like a birthday gift, warm wood with touches of color, isometric view, ' + BASE + ', transparent background' },
    { dir: 'giftbox', name: 'box_stage4_numbers', prompt: 'Cute cartoon 3D wooden gift box on a small pedestal, colorful number 24 on the front, flowers on top, sitting on grass, starting to look festive and birthday-themed, warm colors, isometric view, ' + BASE + ', transparent background' },
    { dir: 'giftbox', name: 'box_stage5_metal', prompt: 'Cute cartoon 3D decorated birthday gift box on pedestal, wooden box with golden metal trim on edges, small handle on lid, a few small gem accents, flowers and 24 visible, becoming more refined but still handmade feel, isometric view, ' + BASE + ', transparent background' },
    { dir: 'giftbox', name: 'box_stage6_complete', prompt: 'Cute cartoon 3D completed handmade birthday gift box, wooden box with golden trim, pink satin ribbon wrapped around with a bow on top, flower decorations, HAPPY 24 banner, small gem sparkles, sitting on decorated pedestal on grass, warm and celebratory but not royal or over-the-top, isometric view, ' + BASE + ', transparent background' },
    { dir: 'giftbox', name: 'box_stage7_wrapped', prompt: 'Cute cartoon 3D beautifully wrapped birthday gift box, pastel pink wrapping paper with small polka dots or stars pattern, large pink and gold satin ribbon bow on top, modern gift wrapping style, sitting on grass, warm and cute birthday present, isometric view, ' + BASE + ', transparent background' },
];

async function apiCall(method, url, body) {
    const opts = { method, headers: { 'Authorization': 'Basic ' + AUTH, 'Content-Type': 'application/json', 'accept': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    return (await fetch(url, opts)).json();
}

async function main() {
    const total = ASSETS.length;
    let done = 0, totalCU = 0;
    console.log('\n=== Regenerating ' + total + ' assets ===\n');

    for (const asset of ASSETS) {
        const dir = path.resolve('public/assets/generated', asset.dir);
        const finalPath = path.join(dir, asset.name + '.png');
        done++;
        process.stdout.write('[' + done + '/' + total + '] ' + asset.dir + '/' + asset.name + ' ... gen');

        try {
            const genData = await apiCall('POST', 'https://api.cloud.scenario.com/v1/generate/custom/model_imagen4-ultra', { prompt: asset.prompt, aspectRatio: '1:1' });
            totalCU += 10;
            const jobId = genData.job.jobId;

            while (true) {
                await new Promise(r => setTimeout(r, 5000));
                const jobData = await apiCall('GET', 'https://api.cloud.scenario.com/v1/jobs/' + jobId);
                if (jobData.job.status === 'success') {
                    const assetId = jobData.job.metadata.assetIds[0];
                    const assetData = await apiCall('GET', 'https://api.cloud.scenario.com/v1/assets/' + assetId);
                    const resp = await fetch(assetData.asset.url);
                    const buf = Buffer.from(await resp.arrayBuffer());
                    process.stdout.write(' rembg');
                    const { removeBackground } = require('@imgly/background-removal-node');
                    const blob = new Blob([buf], { type: 'image/png' });
                    const result = await removeBackground(blob);
                    fs.writeFileSync(finalPath, Buffer.from(await result.arrayBuffer()));
                    console.log(' done (' + totalCU + ' CU)');
                    break;
                } else if (jobData.job.status === 'failed') {
                    console.log(' FAILED'); break;
                }
                process.stdout.write('.');
            }
        } catch (err) { console.log(' ERROR: ' + err.message); }
        await new Promise(r => setTimeout(r, 1000));
    }
    console.log('\n=== Done! ' + total + ' assets, ' + totalCU + ' CU ===');
}

main().catch(console.error);
