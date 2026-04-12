const fs = require('fs');
const path = require('path');
const API_KEY = process.env.SCENARIO_API_KEY || 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = process.env.SCENARIO_API_SECRET || 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');
const ROOT = 'https://api.cloud.scenario.com/v1';
const BASE = 'Clash of Clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art';

async function apiCall(method, url, body) {
    const opts = { method, headers: { Authorization: 'Basic ' + AUTH, 'Content-Type': 'application/json', accept: 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { throw new Error('Non-JSON ' + resp.status); }
    if (!resp.ok) throw new Error('API ' + resp.status + ': ' + text.slice(0, 400));
    return data;
}
async function waitForJob(jobId) {
    for (;;) { await new Promise(r => setTimeout(r, 4000)); const d = await apiCall('GET', ROOT + '/jobs/' + jobId); if (d.job.status === 'success') return d.job.metadata.assetIds[0]; if (d.job.status === 'failed') throw new Error('failed'); process.stdout.write('.'); }
}
async function download(assetId, out) {
    const d = await apiCall('GET', ROOT + '/assets/' + assetId); const resp = await fetch(d.asset.url); fs.writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
}

(async () => {
    // The building sits NEXT TO a big crystal cluster terrain tile.
    // So the building should be mostly EQUIPMENT (drill, machinery, cart)
    // with only a hint of raw crystals — the big crystals are already
    // visible from the adjacent terrain.
    const prompts = [
        // v5: equipment-focused, minimal crystals
        'Cute cartoon 3D small mining drill station on grass tile, '
        + 'prominent steel drill machine with a large visible drill bit drilling into the ground, '
        + 'wooden support frame and metal gears, small wooden mining cart with a few raw gems inside, '
        + 'focus on the EQUIPMENT not the crystals, only 1-2 small crystal pieces on the ground, '
        + 'isometric view, sitting on grass, '
        + BASE
        + ', transparent background',
        // v6: workbench + tools style
        'Cute cartoon 3D small gem mining workstation on grass tile, '
        + 'sturdy wooden workbench with pickaxes hammers and mining tools, '
        + 'a large mechanical drill mounted on a tripod aimed at a small rocky patch, '
        + 'one small crate of collected raw purple gems, very few crystals visible, '
        + 'focus on tools and machinery, isometric view, sitting on grass, '
        + BASE
        + ', transparent background',
    ];

    const dir = path.resolve('public/assets/generated/buildings');
    for (let i = 0; i < prompts.length; i++) {
        const label = 'v' + (i + 5);
        const rawPath = path.join(dir, `gem_cave_${label}_raw.png`);
        const finalPath = path.join(dir, `gem_cave_${label}.png`);

        console.log(`\n=== ${label} ===`);
        process.stdout.write('gen ');
        const gen = await apiCall('POST', ROOT + '/generate/custom/model_imagen4-ultra', { prompt: prompts[i], aspectRatio: '1:1' });
        const genId = await waitForJob(gen.job.jobId);
        console.log(' ok');
        await download(genId, rawPath);
        console.log('raw:', rawPath);

        process.stdout.write('bria ');
        const rembg = await apiCall('POST', ROOT + '/generate/custom/model_bria-remove-background', { image: genId });
        const rembgId = await waitForJob(rembg.job.jobId);
        console.log(' ok');
        await download(rembgId, finalPath);
        console.log('final:', finalPath);
        await new Promise(r => setTimeout(r, 800));
    }
})().catch(e => { console.error(e); process.exit(1); });
