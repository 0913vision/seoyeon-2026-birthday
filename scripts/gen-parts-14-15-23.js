// One-shot generator for the three renamed parts:
//   #14 버튼       (joystick-style round button, label hidden as "버튼")
//   #15 가죽 조각  (leather piece — for the bag gift theme)
//   #23 플라스틱 부품
//
// Pipeline mirrors scripts/regenerate-assets.js but swaps the local
// @imgly background remover for Scenario's hosted Bria model. Owner
// wants the higher-quality cut and is fine with the CU cost.
//
// Output file names (match PART_FILE_NAMES lookup in BuildingModal.tsx):
//   public/assets/generated/parts/part_14_button.png
//   public/assets/generated/parts/part_15_leather.png
//   public/assets/generated/parts/part_23_plastic.png

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.SCENARIO_API_KEY || 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = process.env.SCENARIO_API_SECRET || 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');
const ROOT = 'https://api.cloud.scenario.com/v1';

const BASE = 'Clash of Clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art';

const ASSETS = [
    {
        dir: 'parts',
        name: 'part_14_button',
        prompt:
            'Cute cartoon 3D small round game controller button, pastel pink or coral top, '
            + 'glossy plastic finish, golden metal ring base, single isolated button, '
            + 'not a whole controller, just one round press-button, '
            + 'centered single item, '
            + BASE
            + ', transparent background',
    },
    {
        dir: 'parts',
        name: 'part_15_leather',
        prompt:
            'Cute cartoon 3D small square piece of tan brown leather patch, '
            + 'warm honey-brown color with visible leather grain texture, '
            + 'delicate pink thread stitching around the edges, '
            + 'slight rolled corner, soft and handmade feel, '
            + 'centered single item on transparent background, '
            + BASE
            + ', transparent background',
    },
    {
        dir: 'parts',
        name: 'part_23_plastic',
        prompt:
            'Cute cartoon 3D small glossy pastel plastic component, '
            + 'rounded corners, pink and mint color, looks like a small piece of '
            + 'molded plastic casing with 2 tiny mounting holes, single isolated piece, '
            + 'centered single item, '
            + BASE
            + ', transparent background',
    },
];

async function apiCall(method, url, body) {
    const opts = {
        method,
        headers: {
            Authorization: 'Basic ' + AUTH,
            'Content-Type': 'application/json',
            accept: 'application/json',
        },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    const text = await resp.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('Non-JSON ' + resp.status + ': ' + text.slice(0, 300)); }
    if (!resp.ok) throw new Error('API ' + resp.status + ': ' + text.slice(0, 400));
    return data;
}

async function waitForJob(jobId) {
    for (;;) {
        await new Promise(r => setTimeout(r, 4000));
        const d = await apiCall('GET', ROOT + '/jobs/' + jobId);
        if (d.job.status === 'success') return d.job.metadata.assetIds[0];
        if (d.job.status === 'failed') throw new Error('job failed: ' + JSON.stringify(d.job).slice(0, 400));
        process.stdout.write('.');
    }
}

async function downloadAssetUrl(assetId, outputPath) {
    const d = await apiCall('GET', ROOT + '/assets/' + assetId);
    const url = d.asset?.url || d.url;
    if (!url) throw new Error('asset url missing: ' + JSON.stringify(d).slice(0, 300));
    const resp = await fetch(url);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(outputPath, buf);
}

async function generate(asset) {
    const dir = path.resolve('public/assets/generated', asset.dir);
    const rawPath = path.join(dir, asset.name + '_raw.png');
    const finalPath = path.join(dir, asset.name + '.png');

    console.log('\n=== ' + asset.name + ' ===');
    console.log('prompt:', asset.prompt);

    process.stdout.write('gen ');
    const gen = await apiCall('POST', ROOT + '/generate/custom/model_imagen4-ultra', {
        prompt: asset.prompt, aspectRatio: '1:1',
    });
    if (!gen.job) throw new Error('no gen job: ' + JSON.stringify(gen).slice(0, 300));
    const genAssetId = await waitForJob(gen.job.jobId);
    console.log(' ok', genAssetId);

    // Save raw (pre-bgremove)
    await downloadAssetUrl(genAssetId, rawPath);
    console.log('raw:', rawPath);

    // Bria bg removal (3 CU)
    process.stdout.write('bria ');
    const rembg = await apiCall('POST', ROOT + '/generate/custom/model_bria-remove-background', {
        image: genAssetId,
    });
    if (!rembg.job) throw new Error('no bria job: ' + JSON.stringify(rembg).slice(0, 300));
    const rembgAssetId = await waitForJob(rembg.job.jobId);
    console.log(' ok', rembgAssetId);

    await downloadAssetUrl(rembgAssetId, finalPath);
    console.log('final:', finalPath);
}

async function main() {
    for (const asset of ASSETS) {
        try {
            await generate(asset);
        } catch (e) {
            console.log('ERROR', asset.name, e.message);
        }
        await new Promise(r => setTimeout(r, 800));
    }
    console.log('\n=== all done ===');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
