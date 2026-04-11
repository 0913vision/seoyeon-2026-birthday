// One-shot: generate box_stage7_packaging.png — the new "packaging in
// progress" intermediate visual between stage 6 (handmade complete) and
// stage 8 (pink wrapped final).
//
// The stage 7 visual should clearly read as "the box is completed and
// being wrapped RIGHT NOW" — wrapping paper half draped, ribbon being
// tied, boxes of paper/bows sitting next to it. Must still feel like
// the same gift box continuing from stage 6, not a new object.

const fs = require('fs');
const path = require('path');

const API_KEY = process.env.SCENARIO_API_KEY || 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = process.env.SCENARIO_API_SECRET || 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(API_KEY + ':' + API_SECRET).toString('base64');

const BASE = 'Clash of Clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, game asset on white background, mobile game art';

const ASSET = {
    dir: 'giftbox',
    name: 'box_stage7_packaging',
    // Owner approved the first version (with the grass tile). Regenerate
    // with the original prompt shape — "sitting on grass" — but keep the
    // Bria (not local) background removal step.
    prompt:
        'Cute cartoon 3D completed handmade birthday gift box mid-wrapping, '
        + 'the wooden decorated box from stage 6 being wrapped in pastel pink paper, '
        + 'wrapping paper partially draped around the box leaving one side still visible, '
        + 'loose pink satin ribbon trailing on top waiting to be tied into a bow, '
        + 'small spool of ribbon and folded wrapping paper sitting beside the pedestal, '
        + 'sense of work-in-progress but warm and gentle, '
        + 'isometric view, sitting on grass, '
        + BASE
        + ', transparent background',
};

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
    return (await fetch(url, opts)).json();
}

async function main() {
    const dir = path.resolve('public/assets/generated', ASSET.dir);
    const finalPath = path.join(dir, ASSET.name + '.png');
    const rawPath = path.join(dir, ASSET.name + '_raw.png');

    console.log('Generating', ASSET.name);
    console.log('Prompt:', ASSET.prompt, '\n');

    const genData = await apiCall(
        'POST',
        'https://api.cloud.scenario.com/v1/generate/custom/model_imagen4-ultra',
        { prompt: ASSET.prompt, aspectRatio: '1:1' },
    );
    if (!genData.job) {
        console.log('Gen error:', JSON.stringify(genData));
        process.exit(1);
    }
    const jobId = genData.job.jobId;
    process.stdout.write('job ' + jobId + ' ');

    let assetId = null;
    let assetData = null;
    for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const jobData = await apiCall('GET', 'https://api.cloud.scenario.com/v1/jobs/' + jobId);
        if (jobData.job.status === 'success') {
            assetId = jobData.job.metadata.assetIds[0];
            assetData = await apiCall('GET', 'https://api.cloud.scenario.com/v1/assets/' + assetId);
            break;
        } else if (jobData.job.status === 'failed') {
            console.log(' FAILED');
            console.log(JSON.stringify(jobData));
            process.exit(1);
        }
        process.stdout.write('.');
    }
    console.log(' ok');

    const resp = await fetch(assetData.asset.url);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(rawPath, buf);
    console.log('raw saved:', rawPath);

    // Use Scenario's hosted Bria background-removal model instead of the
    // local @imgly one. Owner wants the higher-quality version even if it
    // costs 3 CU. Bria expects the Scenario-hosted asset id (from the
    // generation step), NOT a URL.
    console.log('bria background removal ...');
    const rembgGen = await apiCall(
        'POST',
        'https://api.cloud.scenario.com/v1/generate/custom/model_bria-remove-background',
        { image: assetId },
    );
    if (!rembgGen.job) {
        console.log('Rembg gen error:', JSON.stringify(rembgGen));
        process.exit(1);
    }
    const rembgJobId = rembgGen.job.jobId;
    process.stdout.write('rembg job ' + rembgJobId + ' ');
    let rembgAsset = null;
    for (;;) {
        await new Promise((r) => setTimeout(r, 5000));
        const j = await apiCall('GET', 'https://api.cloud.scenario.com/v1/jobs/' + rembgJobId);
        if (j.job.status === 'success') {
            const assetId = j.job.metadata.assetIds[0];
            rembgAsset = await apiCall('GET', 'https://api.cloud.scenario.com/v1/assets/' + assetId);
            break;
        } else if (j.job.status === 'failed') {
            console.log(' FAILED');
            console.log(JSON.stringify(j));
            process.exit(1);
        }
        process.stdout.write('.');
    }
    console.log(' ok');

    const finalResp = await fetch(rembgAsset.asset.url);
    const finalBuf = Buffer.from(await finalResp.arrayBuffer());
    fs.writeFileSync(finalPath, finalBuf);
    console.log('final saved:', finalPath);
    console.log('\n=== Done ===');
}

main().catch((e) => {
    console.error('FATAL', e);
    process.exit(1);
});
