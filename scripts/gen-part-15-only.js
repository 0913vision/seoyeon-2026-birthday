// One-shot: regenerate ONLY part_15_leather with the latest charcoal
// prompt from gen-parts-14-15-23.js. Used after an owner tweak so we
// don't burn CU on the other two parts that are already approved.

const path = require('path');

process.argv.push('--one', 'part_15_leather');

// We can't easily reuse the loop in gen-parts-14-15-23.js without a
// flag, so duplicate the small pipeline here. Keeps the main script
// simple.

const fs = require('fs');

const API_KEY = process.env.SCENARIO_API_KEY || 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = process.env.SCENARIO_API_SECRET || 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');
const ROOT = 'https://api.cloud.scenario.com/v1';

const BASE = 'Clash of Clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art';

const ASSET = {
    dir: 'parts',
    name: 'part_15_leather',
    prompt:
        'Cute cartoon 3D small square piece of dark charcoal gray leather patch, '
        + 'dark charcoal color (approximately #36414a, like heather coal), '
        + 'NOT pure black, slightly warm dark gray with visible leather grain, '
        + 'delicate cream white thread stitching around the edges, '
        + 'slight rolled corner, soft and handmade feel, '
        + 'centered single item on transparent background, '
        + 'NO brown, NO tan, NO pure black, dark charcoal gray leather only, '
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
    const rawPath = path.join(dir, ASSET.name + '_raw.png');
    const finalPath = path.join(dir, ASSET.name + '.png');

    console.log('prompt:', ASSET.prompt, '\n');
    process.stdout.write('gen ');
    const gen = await apiCall('POST', ROOT + '/generate/custom/model_imagen4-ultra', { prompt: ASSET.prompt, aspectRatio: '1:1' });
    const genId = await waitForJob(gen.job.jobId);
    console.log(' ok', genId);
    await download(genId, rawPath);
    console.log('raw:', rawPath);

    process.stdout.write('bria ');
    const rembg = await apiCall('POST', ROOT + '/generate/custom/model_bria-remove-background', { image: genId });
    const rembgId = await waitForJob(rembg.job.jobId);
    console.log(' ok', rembgId);
    await download(rembgId, finalPath);
    console.log('final:', finalPath);
}
main().catch(e => { console.error('FATAL', e); process.exit(1); });
