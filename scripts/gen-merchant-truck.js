// One-shot: generate a traveling merchant truck asset.
// White truck with leather goods stacked on it, no ground tile.

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.SCENARIO_API_KEY || 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = process.env.SCENARIO_API_SECRET || 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');
const ROOT = 'https://api.cloud.scenario.com/v1';

const BASE = 'Clash of Clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art';

const ASSET = {
    dir: 'terrain',
    name: 'merchant_truck',
    prompt:
        'Cute cartoon 3D small white delivery truck with open back, '
        + 'stacks of dark charcoal leather rolls and leather pieces loaded on the truck bed, '
        + 'small cute merchant vehicle, slightly worn and friendly look, '
        + 'isometric view, '
        + 'NO ground, NO grass, NO tile base, NO floor beneath the truck, '
        + 'the truck floats alone on pure white, isolated single object, '
        + BASE
        + ', transparent background',
};

async function apiCall(method, url, body) {
    const opts = { method, headers: { Authorization: 'Basic ' + AUTH, 'Content-Type': 'application/json', accept: 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch { throw new Error('Non-JSON ' + resp.status + ': ' + text.slice(0, 300)); }
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
async function download(assetId, out) {
    const d = await apiCall('GET', ROOT + '/assets/' + assetId);
    const url = d.asset?.url || d.url;
    const resp = await fetch(url);
    fs.writeFileSync(out, Buffer.from(await resp.arrayBuffer()));
}

async function main() {
    const dir = path.resolve('public/assets/generated', ASSET.dir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const rawPath = path.join(dir, ASSET.name + '_raw.png');
    const finalPath = path.join(dir, ASSET.name + '.png');

    console.log('prompt:', ASSET.prompt, '\n');

    process.stdout.write('gen ');
    const gen = await apiCall('POST', ROOT + '/generate/custom/model_imagen4-ultra', { prompt: ASSET.prompt, aspectRatio: '1:1' });
    if (!gen.job) throw new Error('no gen job: ' + JSON.stringify(gen).slice(0, 300));
    const genId = await waitForJob(gen.job.jobId);
    console.log(' ok', genId);
    await download(genId, rawPath);
    console.log('raw:', rawPath);

    process.stdout.write('bria ');
    const rembg = await apiCall('POST', ROOT + '/generate/custom/model_bria-remove-background', { image: genId });
    if (!rembg.job) throw new Error('no bria job: ' + JSON.stringify(rembg).slice(0, 300));
    const rembgId = await waitForJob(rembg.job.jobId);
    console.log(' ok', rembgId);
    await download(rembgId, finalPath);
    console.log('final:', finalPath);
    console.log('\n=== Done ===');
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
