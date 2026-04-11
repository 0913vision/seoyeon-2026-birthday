// Fallback bg removal for cave_entrance using local @imgly/background-removal-node.
// bria API left a cream-colored background on this one image.

const fs = require('fs');
const path = require('path');

async function main() {
    const rawPath = path.resolve('public/assets/generated/terrain/cave_entrance_raw.png');
    const finalPath = path.resolve('public/assets/generated/terrain/cave_entrance.png');

    if (!fs.existsSync(rawPath)) {
        console.error(`Raw file not found: ${rawPath}`);
        process.exit(1);
    }

    console.log('Loading @imgly/background-removal-node...');
    const { removeBackground } = require('@imgly/background-removal-node');

    console.log('Processing cave_entrance_raw.png...');
    const buf = fs.readFileSync(rawPath);
    const blob = new Blob([buf], { type: 'image/png' });
    const result = await removeBackground(blob);
    const outBuf = Buffer.from(await result.arrayBuffer());
    fs.writeFileSync(finalPath, outBuf);

    console.log(`Done: ${finalPath}`);
}

main().catch(err => {
    console.error('ERROR:', err);
    process.exit(1);
});
