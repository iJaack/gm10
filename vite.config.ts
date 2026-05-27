import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import type { IncomingHttpHeaders } from 'http'

type ApiResponse = {
    setHeader: (name: string, value: string) => void;
    status: (code: number) => ApiResponse;
    json: (payload: unknown) => void;
};

type ApiRequest = {
    method?: string;
    headers?: IncomingHttpHeaders;
    query?: Record<string, string>;
    body?: unknown;
};

type ApiHandlerModule = {
    default?: (request: ApiRequest, response: ApiResponse) => Promise<void> | void;
    GET?: (request: Request) => Promise<Response> | Response;
};

const apiHandlers: Record<string, () => Promise<ApiHandlerModule>> = {
    '/api/courtyard-asset': () => import('./api/courtyard-asset.js'),
    '/api/courtyard-profile-nav': () => import('./api/courtyard-profile-nav.js'),
    '/api/lifi-quotes': () => import('./api/lifi-quotes.js'),
    '/api/lifi-solana-quote': () => import('./api/lifi-solana-quote.js'),
    '/api/lifi-status': () => import('./api/lifi-status.js'),
    '/api/nft-metadata': () => import('./api/nft-metadata.js'),
    '/api/phygitals-card': () => import('./api/phygitals-card.js'),
    '/api/valuation-pack': () => import('./api/valuation-pack.js'),
    '/api/valuation-public': () => import('./api/valuation-public.js'),
    '/api/wallet-portfolio': () => import('./api/wallet-portfolio.js'),
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
        name: 'gm10-local-api',
        configureServer(server) {
            server.middlewares.use(async (request, response, next) => {
                const url = new URL(request.url ?? '/', 'http://localhost');
                const loadHandler = apiHandlers[url.pathname];
                if (!loadHandler) {
                    next();
                    return;
                }

                try {
                    const handlerModule = await loadHandler();
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

                    if (handlerModule.default) {
                        await handlerModule.default({
                            method: request.method,
                            headers: request.headers,
                            query: Object.fromEntries(url.searchParams.entries()),
                            body: await readRequestBody(request),
                        }, apiResponse);
                        return;
                    }

                    if (request.method === 'GET' && handlerModule.GET) {
                        const apiResult = await handlerModule.GET(new Request(url.toString(), {
                            method: 'GET',
                            headers: request.headers as HeadersInit,
                        }));
                        response.statusCode = apiResult.status;
                        apiResult.headers.forEach((value, name) => response.setHeader(name, value));
                        response.end(await apiResult.text());
                        return;
                    }

                    response.statusCode = 405;
                    response.setHeader('content-type', 'application/json');
                    response.end(JSON.stringify({ error: 'Unsupported local API handler' }));
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

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), localApiPlugin()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
        include: ['src/**/*.test.{ts,tsx}'],
    },
})
