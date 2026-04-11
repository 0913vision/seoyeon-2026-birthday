// Re-runs background removal on 4 terrain raw files using Scenario API model_bria-remove-background.
// Overwrites the final *.png files.
//
// Flow:
//   1) Upload raw PNG to Scenario assets endpoint -> get asset ID
//   2) POST to /generate/custom/model_bria-remove-background with { image: <assetId> }
//   3) Poll job; download result asset; save to final path.

const fs = require('fs');
const path = require('path');

const API_KEY = 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

const BASE = 'https://api.cloud.scenario.com/v1';

const TILES = [
    'rock_outcrop',
    'crystal_cluster',
    'flower_patch',
    'cave_entrance',
];

async function apiCall(method, url, body) {
    const opts = {
        method,
        headers: {
            'Authorization': `Basic ${AUTH}`,
            'Content-Type': 'application/json',
            'accept': 'application/json',
        },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch(url, opts);
    const text = await resp.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw new Error(`Non-JSON response (${resp.status}): ${text.slice(0, 300)}`);
    }
    if (!resp.ok) {
        throw new Error(`API ${resp.status}: ${text.slice(0, 500)}`);
    }
    return data;
}

async function uploadAssetBase64(filePath) {
    const buf = fs.readFileSync(filePath);
    const b64 = buf.toString('base64');
    const dataUrl = `data:image/png;base64,${b64}`;
    // Scenario supports POST /assets with { image: <base64 data URL>, name: ... }
    const data = await apiCall('POST', `${BASE}/assets`, {
        image: dataUrl,
        name: path.basename(filePath),
    });
    // Response shape: { asset: { id, url, ... } } or { assets: [...] }
    const assetId = data.asset?.id || data.assets?.[0]?.id || data.id;
    if (!assetId) {
        throw new Error(`Upload: could not find asset id. Response: ${JSON.stringify(data).slice(0, 400)}`);
    }
    return assetId;
}

async function runBriaBgRemove(assetId) {
    const data = await apiCall('POST', `${BASE}/generate/custom/model_bria-remove-background`, {
        image: assetId,
    });
    if (!data.job) {
        throw new Error(`Bria call failed: ${JSON.stringify(data).slice(0, 400)}`);
    }
    return data.job.jobId;
}

async function waitForJob(jobId) {
    while (true) {
        await new Promise(r => setTimeout(r, 4000));
        const data = await apiCall('GET', `${BASE}/jobs/${jobId}`);
        const status = data.job.status;
        if (status === 'success') {
            return data.job.metadata.assetIds[0];
        } else if (status === 'failed') {
            throw new Error(`Job ${jobId} failed: ${JSON.stringify(data.job).slice(0, 400)}`);
        }
        process.stdout.write('.');
    }
}

async function downloadAsset(assetId, outputPath) {
    const data = await apiCall('GET', `${BASE}/assets/${assetId}`);
    const url = data.asset?.url || data.url;
    if (!url) {
        throw new Error(`Asset URL missing: ${JSON.stringify(data).slice(0, 400)}`);
    }
    const resp = await fetch(url);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(outputPath, buf);
}

async function main() {
    const dir = path.resolve('public/assets/generated/terrain');
    let totalCU = 0;

    console.log(`\n=== Bria bg-removal for ${TILES.length} terrain tiles ===\n`);

    for (let i = 0; i < TILES.length; i++) {
        const name = TILES[i];
        const rawPath = path.join(dir, `${name}_raw.png`);
        const finalPath = path.join(dir, `${name}.png`);

        if (!fs.existsSync(rawPath)) {
            console.log(`[${i+1}/${TILES.length}] ${name} SKIP: raw file missing (${rawPath})`);
            continue;
        }

        try {
            process.stdout.write(`[${i+1}/${TILES.length}] ${name} uploading`);
            const inAssetId = await uploadAssetBase64(rawPath);

            process.stdout.write(' submitting');
            const jobId = await runBriaBgRemove(inAssetId);
            totalCU += 3;

            const outAssetId = await waitForJob(jobId);
            process.stdout.write(' downloading');
            await downloadAsset(outAssetId, finalPath);

            console.log(` OK (${totalCU} CU used)`);
        } catch (err) {
            console.log(` ERROR: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 800));
    }

    console.log(`\n=== Done! ${totalCU} CU total ===`);
}

main().catch(console.error);
