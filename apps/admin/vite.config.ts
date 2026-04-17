import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

type ApiResponse = {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => ApiResponse;
    json: (payload: unknown) => void;
};

const apiHandlers: Record<string, () => Promise<{ default: (request: { method?: string; body?: unknown }, response: ApiResponse) => Promise<void> | void }>> = {
    '/api/valuation-pack': () => import('./api/valuation-pack.js'),
};

async function readRequestBody(request: NodeJS.ReadableStream) {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const body = Buffer.concat(chunks).toString('utf8');
    if (!body) return undefined;

    try {
        return JSON.parse(body);
    } catch {
        return body;
    }
}

function localApiPlugin(): Plugin {
    return {
        name: 'gm10-admin-local-api',
        configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
                const loadHandler = apiHandlers[pathname];
                if (!loadHandler) {
                    next();
                    return;
                }

                try {
                    const { default: handler } = await loadHandler();
                    const apiResponse: ApiResponse = {
                        setHeader: (name, value) => response.setHeader(name, value),
                        status: (code) => {
                            response.statusCode = code;
                            return apiResponse;
                        },
                        json: (payload) => {
                            if (!response.getHeader('content-type')) {
                                response.setHeader('content-type', 'application/json');
                            }
                            response.end(JSON.stringify(payload));
                        },
                    };

                    await handler({
                        method: request.method,
                        body: await readRequestBody(request),
                    }, apiResponse);
                } catch (error) {
                    response.statusCode = 500;
                    response.setHeader('content-type', 'application/json');
                    response.end(JSON.stringify({
                        error: error instanceof Error ? error.message : 'Local API request failed',
                    }));
                }
            });
        },
    };
}

export default defineConfig({
    plugins: [react(), localApiPlugin()],
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
