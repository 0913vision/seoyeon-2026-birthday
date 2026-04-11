import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';
import { execSync } from 'child_process';

let buildSha = 'prod';
try { buildSha = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
// On Vercel, VERCEL_GIT_COMMIT_SHA is set
if (process.env.VERCEL_GIT_COMMIT_SHA) {
    buildSha = process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7);
}
const buildTime = new Date().toISOString();

const phasermsg = () => {
    return {
        name: 'phasermsg',
        buildStart() {
            process.stdout.write(`Building for production...\n`);
        },
        buildEnd() {
            const line = "---------------------------------------------------------";
            const msg = `❤️❤️❤️ Tell us about your game! - games@phaser.io ❤️❤️❤️`;
            process.stdout.write(`${line}\n${msg}\n${line}\n`);

            process.stdout.write(`✨ Done ✨\n`);
        }
    }
}

export default defineConfig({
    base: './',
    define: {
        __BUILD_SHA__: JSON.stringify(buildSha),
        __BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
        react(),
        tailwindcss(),
        phasermsg()
    ],
    logLevel: 'warning',
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, '../index.html'),
                resourceTest: resolve(__dirname, '../resource-test.html'),
                dayTest: resolve(__dirname, '../day-test.html'),
                bubbleCalibrate: resolve(__dirname, '../bubble-calibrate.html'),
            },
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
        minify: 'terser',
        terserOptions: {
            compress: {
                passes: 2
            },
            mangle: true,
            format: {
                comments: false
            }
        }
    }
});
