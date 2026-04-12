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
    const prompts = [
        // v7: tall vertical drill tower (derrick style)
        'Cute cartoon 3D tall vertical mining drill tower on grass tile, '
        + 'tall upright wooden and metal derrick tower with a drill going STRAIGHT DOWN into the ground vertically, '
        + 'the drill tower stands tall like a small oil derrick, '
        + 'a few collected purple crystals in a small crate beside the tower, '
        + 'NOT bent or angled, perfectly vertical drill, '
        + 'isometric view, sitting on grass, '
        + BASE
        + ', transparent background',
        // v8: enhanced v3 — bigger open pit, more detail
        'Cute cartoon 3D crystal excavation pit on grass tile, '
        + 'open rectangular pit dug into the ground revealing beautiful glowing purple and pink crystals on the walls inside, '
        + 'a tall wooden crane with a thick rope and bucket hovering above the pit, '
        + 'wooden scaffolding and ladder going down into the pit, '
        + 'a wheelbarrow with collected gems on the surface, '
        + 'detailed and prominent, isometric view, sitting on grass, '
        + BASE
        + ', transparent background',
    ];

    const dir = path.resolve('public/assets/generated/buildings');
    for (let i = 0; i < prompts.length; i++) {
        const label = 'v' + (i + 7);
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
