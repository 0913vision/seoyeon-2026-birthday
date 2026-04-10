const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const API_KEY = 'api_RsoY5ydaHBrf9jsce2iq8DSQ';
const API_SECRET = 'fRnoC2LzCCWukUZqeEq3d4GL';
const AUTH = Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

const BASE_STYLE = 'clash of clans style, vibrant saturated colors, soft shadows, 3D cartoon render, slightly exaggerated proportions, clean textures, mobile game art';

// Object-only standalone rendering. No grass/dirt base, no diamond tile plate.
// The game places these on top of its own ground separately.
const OBJECT_BASE = 'isometric viewing angle, single standalone game object centered on plain white background, no grass base, no ground plate, no diamond tile, no platform, no terrain, no text, no people, clean game asset';

const ASSETS = [
    {
        dir: 'terrain',
        name: 'cave_entrance',
        prompt: `natural cave carved into a single large mossy boulder rock formation, one big weathered grey stone with an organic irregular dark cave opening tunneling into it, green moss patches on top, completely natural geology, no man-made arch, no stacked stones, no bricks, no architecture, no wooden beams, ${OBJECT_BASE}, ${BASE_STYLE}`,
    },
    {
        dir: 'terrain',
        name: 'crystal_cluster',
        prompt: `cluster of large faceted purple and blue crystals growing upward, glowing magical gemstones of various sizes pointing skyward, sparkly highlights and subtle inner glow, no rocks no cave, ${OBJECT_BASE}, ${BASE_STYLE}`,
    },
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
    return resp.json();
}

async function generateImage(prompt) {
    const data = await apiCall('POST', 'https://api.cloud.scenario.com/v1/generate/custom/model_imagen4-ultra', {
        prompt,
        aspectRatio: '1:1',
    });
    if (!data.job) {
        throw new Error(`Generate failed: ${JSON.stringify(data)}`);
    }
    return data.job.jobId;
}

async function waitForJob(jobId) {
    while (true) {
        await new Promise(r => setTimeout(r, 5000));
        const data = await apiCall('GET', `https://api.cloud.scenario.com/v1/jobs/${jobId}`);
        const status = data.job.status;
        if (status === 'success') {
            return data.job.metadata.assetIds[0];
        } else if (status === 'failed') {
            throw new Error(`Job ${jobId} failed`);
        }
        process.stdout.write('.');
    }
}

async function downloadAsset(assetId, outputPath) {
    const data = await apiCall('GET', `https://api.cloud.scenario.com/v1/assets/${assetId}`);
    const url = data.asset.url;
    const resp = await fetch(url);
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(outputPath, buf);
}

async function removeWhiteBg(inputPath, outputPath) {
    const img = await loadImage(inputPath);
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i+1], b = d.data[i+2];
        if (r > 240 && g > 240 && b > 240) {
            d.data[i+3] = 0;
        } else if (r > 220 && g > 220 && b > 220) {
            d.data[i+3] = Math.round(255 * (1 - (r + g + b - 660) / (765 - 660)));
        }
    }
    ctx.putImageData(d, 0, 0);
    fs.writeFileSync(outputPath, c.toBuffer('image/png'));
}

async function main() {
    const outDir = path.resolve('public/assets/generated');
    const total = ASSETS.length;
    let done = 0;
    let totalCU = 0;

    console.log(`\n=== Generating ${total} terrain tiles with imagen4-ultra ===\n`);

    for (const asset of ASSETS) {
        const dir = path.join(outDir, asset.dir);
        const rawPath = path.join(dir, `${asset.name}_raw.png`);
        const finalPath = path.join(dir, `${asset.name}.png`);

        if (fs.existsSync(finalPath)) {
            done++;
            console.log(`[${done}/${total}] SKIP ${asset.dir}/${asset.name} (already exists)`);
            continue;
        }

        try {
            done++;
            process.stdout.write(`[${done}/${total}] ${asset.dir}/${asset.name} ... generating`);

            const jobId = await generateImage(asset.prompt);
            totalCU += 10;
            const assetId = await waitForJob(jobId);

            process.stdout.write(' downloading');
            await downloadAsset(assetId, rawPath);

            process.stdout.write(' removing bg');
            await removeWhiteBg(rawPath, finalPath);

            console.log(` OK (${totalCU} CU used)`);
        } catch (err) {
            console.log(` ERROR: ${err.message}`);
        }

        await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\n=== Done! ${done} assets, ${totalCU} CU total ===`);
}

main().catch(console.error);
