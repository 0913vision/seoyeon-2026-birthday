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
    const prompt =
        'Cute cartoon 3D secret document scroll with wax seal, '
        + 'rolled parchment paper tied with a red ribbon, small red wax seal stamp, '
        + 'mysterious and important looking, slightly aged yellowish paper, '
        + 'NO ground, NO grass, NO tile, NO floor beneath, '
        + 'the object floats alone on pure white, isolated, '
        + 'single item, centered, isometric view, '
        + BASE
        + ', transparent background';

    const dir = path.resolve('public/assets/generated/terrain');
    const rawPath = path.join(dir, 'secret_doc_raw.png');
    const finalPath = path.join(dir, 'secret_doc.png');

    console.log('Generating secret document...\n');
    process.stdout.write('gen ');
    const gen = await apiCall('POST', ROOT + '/generate/custom/model_imagen4-ultra', { prompt, aspectRatio: '1:1' });
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
})().catch(e => { console.error(e); process.exit(1); });
