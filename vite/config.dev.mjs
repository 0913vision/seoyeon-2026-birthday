import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
    base: './',
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
