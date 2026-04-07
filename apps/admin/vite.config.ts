import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        dedupe: ['wagmi', '@wagmi/core', 'viem', 'react', 'react-dom', '@tanstack/react-query'],
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@protocol': path.resolve(__dirname, '../../src/data'),
        },
    },
    server: {
        port: 5174,
    },
});
