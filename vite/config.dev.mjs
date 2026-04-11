import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import { execSync } from 'child_process'

let buildSha = 'dev';
try { buildSha = execSync('git rev-parse --short HEAD').toString().trim(); } catch {}
const buildTime = new Date().toISOString();

export default defineConfig({
    base: './',
    define: {
        __BUILD_SHA__: JSON.stringify(buildSha),
        __BUILD_TIME__: JSON.stringify(buildTime),
    },
    plugins: [
        react(),
        tailwindcss(),
    ],
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, '../index.html'),
                resourceTest: resolve(__dirname, '../resource-test.html'),
                dayTest: resolve(__dirname, '../day-test.html'),
                bubbleCalibrate: resolve(__dirname, '../bubble-calibrate.html'),
            },
        },
    },
    server: {
        port: 5173,
        host: '0.0.0.0'
    }
})
