// Background-remove the user-provided stage 7 image using Scenario's
// Bria model. Source is a local JPG the owner sent via telegram; we
// upload it as an asset, run Bria, then save the transparent PNG to
// public/assets/generated/giftbox/box_stage7_packaging.png.
//
// Never deletes anything — the raw user file stays as
// box_stage7_packaging_user.jpg, the Bria output is written alongside.

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.SCENARIO_API_KEY || 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = process.env.SCENARIO_API_SECRET || 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');
const BASE = 'https://api.cloud.scenario.com/v1';

const INPUT_FILE = path.resolve('public/assets/generated/giftbox/box_stage7_packaging_user.jpg');
const OUTPUT_FILE = path.resolve('public/assets/generated/giftbox/box_stage7_packaging.png');

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
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`Non-JSON (${resp.status}): ${text.slice(0, 300)}`);
    }
    if (!resp.ok) throw new Error(`API ${resp.status}: ${text.slice(0, 500)}`);
    return data;
}

async function uploadAsset(filePath) {
    const buf = fs.readFileSync(filePath);
    const mime = filePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const b64 = buf.toString('base64');
    const dataUrl = `data:${mime};base64,${b64}`;
    const data = await apiCall('POST', `${BASE}/assets`, {
        image: dataUrl,
        name: path.basename(filePath),
    });
    const assetId = data.asset?.id || data.assets?.[0]?.id || data.id;
    if (!assetId) throw new Error('Upload: no asset id: ' + JSON.stringify(data).slice(0, 300));
    return assetId;
}

async function waitForJob(jobId) {
    for (;;) {
        await new Promise(r => setTimeout(r, 4000));
        const d = await apiCall('GET', `${BASE}/jobs/${jobId}`);
        if (d.job.status === 'success') return d.job.metadata.assetIds[0];
        if (d.job.status === 'failed') throw new Error('Job failed: ' + JSON.stringify(d.job).slice(0, 300));
        process.stdout.write('.');
    }
}

async function downloadAsset(assetId, outPath) {
    const d = await apiCall('GET', `${BASE}/assets/${assetId}`);
    const url = d.asset?.url || d.url;
    if (!url) throw new Error('Asset url missing: ' + JSON.stringify(d).slice(0, 300));
    const resp = await fetch(url);
    fs.writeFileSync(outPath, Buffer.from(await resp.arrayBuffer()));
}

async function main() {
    console.log('Input:', INPUT_FILE);
    console.log('Output:', OUTPUT_FILE);

    process.stdout.write('uploading ');
    const inId = await uploadAsset(INPUT_FILE);
    console.log('asset', inId);

    process.stdout.write('submitting Bria ');
    const gen = await apiCall('POST', `${BASE}/generate/custom/model_bria-remove-background`, {
        image: inId,
    });
    if (!gen.job) throw new Error('No job: ' + JSON.stringify(gen).slice(0, 300));
    console.log('job', gen.job.jobId);

    const outId = await waitForJob(gen.job.jobId);
    console.log(' done');

    process.stdout.write('downloading ');
    await downloadAsset(outId, OUTPUT_FILE);
    console.log('saved:', OUTPUT_FILE);
    console.log('\n=== Done ===');
}

main().catch(e => {
    console.error('FATAL', e);
    process.exit(1);
});
