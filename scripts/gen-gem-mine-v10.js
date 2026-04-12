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
    // Reference style: mine.png = wooden+stone structure, no grass base,
    // freestanding. crystal_cluster = blue-purple crystals.
    // The building should: crane holding a large blue-purple crystal
    // sideways tied with ropes, small conveyor belt with smaller crystals.
    // NO grass tile, NO ground platform, NO octagonal base.
    const prompts = [
        // v10: freestanding like mine.png
        'Cute cartoon 3D crystal mining crane station, '
        + 'wooden and stone structure similar to a Clash of Clans mine building, '
        + 'tall wooden crane holding ONE large blue-purple crystal sideways tied with thick ropes, '
        + 'small conveyor belt on the ground carrying small blue-purple crystals, '
        + 'wooden support beams, metal bolts, stone base blocks, '
        + 'NO grass tile underneath, NO green platform, NO ground base, '
        + 'freestanding building structure only, isometric view, '
        + BASE
        + ', transparent background',
        // v11: similar but slightly different composition
        'Cute cartoon 3D gem excavation crane, '
        + 'sturdy wooden frame structure with a rotating crane arm, '
        + 'the crane is lifting a large glowing blue-purple crystal tied horizontally with ropes, '
        + 'a small metal conveyor belt beside the structure moves small raw crystals, '
        + 'wooden beams, stone foundation blocks, metal gears and bolts, '
        + 'style matches Clash of Clans mine building, '
        + 'NO grass platform, NO green tile base, freestanding, isometric view, '
        + BASE
        + ', transparent background',
    ];

    const dir = path.resolve('public/assets/generated/buildings');
    for (let i = 0; i < prompts.length; i++) {
        const label = 'v' + (i + 10);
        const rawPath = path.join(dir, `gem_cave_${label}_raw.png`);
        const finalPath = path.join(dir, `gem_cave_${label}.png`);

        console.log(`\n=== ${label} ===`);
        process.stdout.write('gen ');
        const gen = await apiCall('POST', ROOT + '/generate/custom/model_imagen4-ultra', { prompt: prompts[i], aspectRatio: '1:1' });
        const genId = await waitForJob(gen.job.jobId);
        console.log(' ok');
        await download(genId, rawPath);

        process.stdout.write('bria ');
        const rembg = await apiCall('POST', ROOT + '/generate/custom/model_bria-remove-background', { image: genId });
        const rembgId = await waitForJob(rembg.job.jobId);
        console.log(' ok');
        await download(rembgId, finalPath);
        console.log('final:', finalPath);
        await new Promise(r => setTimeout(r, 800));
    }
})().catch(e => { console.error(e); process.exit(1); });
