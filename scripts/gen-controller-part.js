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
    const assets = [
        {
            name: 'controller',
            rawPath: path.resolve('public/assets/generated/parts/part_23_plastic_raw.png'),
            finalPath: path.resolve('public/assets/generated/parts/part_23_plastic.png'),
            archivePrefix: 'part_23_plastic_v2_blue',
            prompt:
                'Cute cartoon 3D small blue mini game controller, '
                + 'rounded rectangle shape, medium blue plastic body, '
                + 'white D-pad cross on the left side, four small white circular face buttons on the right side, '
                + 'compact and pocket-sized, no text, no logos, no brand names, '
                + 'slightly tilted angle showing the front face, '
                + 'single isolated object, centered, '
                + BASE
                + ', transparent background',
        },
        {
            name: 'bag',
            rawPath: path.resolve('public/assets/generated/parts/bag_raw.png'),
            finalPath: path.resolve('public/assets/generated/parts/bag.png'),
            archivePrefix: null,
            prompt:
                'Cute cartoon 3D dark charcoal gray leather tote bag, '
                + 'wide trapezoid shape, two thin leather handles on top, '
                + 'decorative belt strap with silver metal buckle across the front, '
                + 'silver grommet holes along the belt strap, '
                + 'soft matte dark gray leather texture, minimalist and elegant, '
                + 'no text, no logos, no brand names, '
                + 'single isolated object, centered, slightly angled view, '
                + BASE
                + ', transparent background',
        },
    ];

    const archDir = path.resolve('public/assets/generated/parts/_archive');

    for (const asset of assets) {
        // Archive current if exists
        if (asset.archivePrefix && fs.existsSync(asset.finalPath)) {
            fs.copyFileSync(asset.finalPath, path.join(archDir, asset.archivePrefix + '.png'));
        }
        if (asset.archivePrefix && fs.existsSync(asset.rawPath)) {
            fs.copyFileSync(asset.rawPath, path.join(archDir, asset.archivePrefix + '_raw.png'));
        }

        console.log('\n=== ' + asset.name + ' ===');
        process.stdout.write('gen ');
        const gen = await apiCall('POST', ROOT + '/generate/custom/model_imagen4-ultra', { prompt: asset.prompt, aspectRatio: '1:1' });
        const genId = await waitForJob(gen.job.jobId);
        console.log(' ok');
        await download(genId, asset.rawPath);
        console.log('raw:', asset.rawPath);

        process.stdout.write('bria ');
        const rembg = await apiCall('POST', ROOT + '/generate/custom/model_bria-remove-background', { image: genId });
        const rembgId = await waitForJob(rembg.job.jobId);
        console.log(' ok');
        await download(rembgId, asset.finalPath);
        console.log('final:', asset.finalPath);

        await new Promise(r => setTimeout(r, 800));
    }
})().catch(e => { console.error(e); process.exit(1); });
