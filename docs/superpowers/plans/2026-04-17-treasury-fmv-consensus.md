# Treasury FMV Consensus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weekly Friday 2-of-3 FMV consensus workflow to `admin.gm10.xyz`, including a manual first-run action, pack review, admin approval, and onchain valuation submission.

**Architecture:** Keep consensus and pack persistence in admin API modules, keep wallet/onchain writes in the React admin panel, and keep valuation source access behind small adapters. Packs are immutable versioned JSON artifacts stored through a `ValuationPackStore`; the UI approves card marks from a pack and submits them through the existing fund valuation function.

**Tech Stack:** Vite React admin app, Vercel Functions, Vercel Cron, Vercel Blob, Node `node:test`, viem, wagmi, Avalanche contracts.

---

## File Structure

- Create `apps/admin/api/lib/valuation.js`: pure valuation math, validation, consensus, pack building, canonical JSON hashing.
- Create `apps/admin/tests/valuation.test.mjs`: unit tests for USDC 6 normalization, consensus, stale source exclusion, pack hashing.
- Create `apps/admin/api/lib/valuation-store.js`: Vercel Blob store with local development filesystem fallback.
- Create `apps/admin/tests/valuation-store.test.mjs`: store tests using a temporary local directory.
- Create `apps/admin/api/lib/valuation-chain.js`: server-side registry reader used by cron/manual API runs when the browser does not submit card rows.
- Create `apps/admin/api/valuation-pack.js`: Vercel function for `GET latest` and `POST generate`.
- Create `apps/admin/api/valuation-cron.js`: Vercel Cron entrypoint for the Friday scheduled pack generation.
- Create `apps/admin/src/lib/valuationClient.ts`: typed client helpers for the admin panel.
- Create `apps/admin/src/panels/ValuationPanel.tsx`: admin workflow UI for generation, review, approval, rejection, and submission.
- Modify `apps/admin/src/App.tsx`: add a `Valuation` tab.
- Modify `apps/admin/src/abis.ts`: add read methods to `REGISTRY_ABI` and `submitValuationObservation` to `FUND_ADMIN_ABI`.
- Modify `apps/admin/vite.config.ts`: add the same local API middleware pattern used by the public Vite app so admin API functions work in local dev.
- Modify `apps/admin/vercel.json`: allow POST headers and add a Friday cron to `/api/valuation-cron`.
- Modify `apps/admin/package.json` and `apps/admin/package-lock.json`: add `@vercel/blob`.

## Milestone 1: Core Consensus Engine

### Task 1: Valuation Core

**Files:**
- Create: `apps/admin/api/lib/valuation.js`
- Test: `apps/admin/tests/valuation.test.mjs`

- [ ] **Step 1: Write failing unit tests**

Create `apps/admin/tests/valuation.test.mjs` with:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildValuationPack,
  canonicalJson,
  evaluateConsensus,
  hashBytes32,
  parseUsdc6,
  sourceRefForCard,
} from '../api/lib/valuation.js';

const now = '2026-04-17T09:00:00.000Z';

function observation(sourceId, valueUsdc6, observedAt = now, confidence = 0.92) {
  return {
    sourceId,
    sourceName: sourceId,
    cardKey: 'psa:140897946',
    observedAt,
    fetchedAt: now,
    valueUsdc6,
    currency: 'USD',
    confidence,
    rawPayloadRef: `memory://${sourceId}`,
    sourceUrl: `https://example.com/${sourceId}`,
    matchReason: 'cert number exact match',
  };
}

test('parseUsdc6 normalizes decimal strings into USDC 6 raw units', () => {
  assert.equal(parseUsdc6('96'), '96000000');
  assert.equal(parseUsdc6('96.123456'), '96123456');
  assert.equal(parseUsdc6('96.1234567'), '96123456');
  assert.throws(() => parseUsdc6('-1'), /Invalid USDC amount/);
  assert.throws(() => parseUsdc6('abc'), /Invalid USDC amount/);
});

test('evaluateConsensus passes 2 of 3 agreement and uses the median', () => {
  const result = evaluateConsensus({
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '105000000'),
      observation('evidence', '140000000'),
    ],
    nowIso: now,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.proposedValueUsdc6, '105000000');
  assert.equal(result.validSourceCount, 3);
  assert.equal(result.agreeingSourceIds.join(','), 'primary,benchmark');
});

test('evaluateConsensus uses lower value when exactly two valid sources agree', () => {
  const result = evaluateConsensus({
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '106000000'),
      observation('evidence', '0'),
    ],
    nowIso: now,
  });

  assert.equal(result.status, 'passed');
  assert.equal(result.proposedValueUsdc6, '100000000');
  assert.equal(result.validSourceCount, 2);
});

test('evaluateConsensus excludes stale observations and fails without two valid sources', () => {
  const result = evaluateConsensus({
    observations: [
      observation('primary', '100000000'),
      observation('benchmark', '101000000', '2026-04-01T00:00:00.000Z'),
      observation('evidence', '0'),
    ],
    nowIso: now,
  });

  assert.equal(result.status, 'needs_review');
  assert.equal(result.proposedValueUsdc6, undefined);
  assert.equal(result.validSourceCount, 1);
  assert.match(result.warnings.join(' '), /stale/);
});

test('buildValuationPack hashes immutable card evidence refs', () => {
  const pack = buildValuationPack({
    packId: 'valuation-2026-W16-v1',
    generatedAt: now,
    cards: [{
      positionId: 1,
      cardKey: 'psa:140897946',
      title: 'Gengar VMAX PSA 10',
      currentValueUsdc6: '96000000',
      observations: [
        observation('primary', '100000000'),
        observation('benchmark', '105000000'),
        observation('evidence', '140000000'),
      ],
    }],
  });

  assert.equal(pack.cards[0].consensus.status, 'passed');
  assert.match(pack.cards[0].sourceRef, /^0x[a-f0-9]{64}$/);
  assert.match(pack.cards[0].proofHash, /^0x[a-f0-9]{64}$/);
  assert.equal(pack.cards[0].sourceRef, sourceRefForCard(pack.packId, 1));
  assert.equal(hashBytes32(canonicalJson(pack.cards[0].observations)).length, 66);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm --prefix apps/admin test
```

Expected: FAIL with `Cannot find module '../api/lib/valuation.js'`.

- [ ] **Step 3: Implement valuation core**

Create `apps/admin/api/lib/valuation.js` with:

```js
import { createHash } from 'node:crypto';

const USDC_DECIMALS = 6n;
const USDC_BASE = 10n ** USDC_DECIMALS;
const DEFAULT_TOLERANCE_BPS = 1_000n;
const DEFAULT_STALE_DAYS = 7;

export function parseUsdc6(value) {
  const input = String(value ?? '').trim();
  if (!/^\d+(\.\d+)?$/.test(input)) throw new Error(`Invalid USDC amount: ${value}`);
  const [whole, fraction = ''] = input.split('.');
  const padded = `${fraction}${'0'.repeat(Number(USDC_DECIMALS))}`.slice(0, Number(USDC_DECIMALS));
  return (BigInt(whole) * USDC_BASE + BigInt(padded || '0')).toString();
}

export function formatUsdc6(rawValue) {
  const raw = BigInt(rawValue ?? '0');
  const whole = raw / USDC_BASE;
  const fraction = raw % USDC_BASE;
  if (fraction === 0n) return whole.toString();
  const trimmed = fraction.toString().padStart(6, '0').replace(/0+$/, '');
  return `${whole}.${trimmed}`;
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function hashBytes32(value) {
  return `0x${createHash('sha256').update(String(value)).digest('hex')}`;
}

export function sourceRefForCard(packId, positionId) {
  return hashBytes32(`${packId}:${positionId}`);
}

function isStale(observedAt, nowIso, staleDays) {
  const observedMs = Date.parse(observedAt);
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(observedMs) || !Number.isFinite(nowMs)) return true;
  return nowMs - observedMs > staleDays * 24 * 60 * 60 * 1000;
}

function normalizeObservation(observation, nowIso, staleDays) {
  const warnings = [];
  const value = BigInt(observation.valueUsdc6 ?? '0');
  if (value <= 0n) warnings.push(`${observation.sourceId}: missing positive value`);
  if (Number(observation.confidence ?? 0) < 0.75) warnings.push(`${observation.sourceId}: low match confidence`);
  if (isStale(observation.observedAt, nowIso, staleDays)) warnings.push(`${observation.sourceId}: stale observation`);
  return { ...observation, valid: warnings.length === 0, warnings };
}

function withinTolerance(a, b, toleranceBps) {
  const low = a < b ? a : b;
  const high = a > b ? a : b;
  if (low === 0n) return false;
  return ((high - low) * 10_000n) <= (low * toleranceBps);
}

export function evaluateConsensus({
  observations,
  nowIso,
  toleranceBps = Number(DEFAULT_TOLERANCE_BPS),
  staleDays = DEFAULT_STALE_DAYS,
}) {
  const normalized = observations.map((item) => normalizeObservation(item, nowIso, staleDays));
  const valid = normalized.filter((item) => item.valid);
  const warnings = normalized.flatMap((item) => item.warnings);
  const tolerance = BigInt(toleranceBps);
  let agreeingPair;

  for (let i = 0; i < valid.length; i += 1) {
    for (let j = i + 1; j < valid.length; j += 1) {
      if (withinTolerance(BigInt(valid[i].valueUsdc6), BigInt(valid[j].valueUsdc6), tolerance)) {
        agreeingPair = [valid[i], valid[j]];
        break;
      }
    }
    if (agreeingPair) break;
  }

  if (!agreeingPair) {
    return {
      status: 'needs_review',
      validSourceCount: valid.length,
      agreeingSourceIds: [],
      warnings: warnings.length ? warnings : ['fewer than two sources agree within tolerance'],
    };
  }

  const sorted = valid.map((item) => BigInt(item.valueUsdc6)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const proposed = valid.length >= 3
    ? sorted[Math.floor(sorted.length / 2)]
    : agreeingPair.map((item) => BigInt(item.valueUsdc6)).sort((a, b) => (a < b ? -1 : 1))[0];

  return {
    status: 'passed',
    proposedValueUsdc6: proposed.toString(),
    validSourceCount: valid.length,
    agreeingSourceIds: agreeingPair.map((item) => item.sourceId),
    warnings,
  };
}

export function buildValuationPack({ packId, generatedAt, cards }) {
  const packCards = cards.map((card) => {
    const consensus = evaluateConsensus({ observations: card.observations, nowIso: generatedAt });
    const observationsJson = canonicalJson(card.observations);
    return {
      ...card,
      consensus,
      decision: 'pending',
      sourceRef: sourceRefForCard(packId, card.positionId),
      proofHash: hashBytes32(observationsJson),
      submittedTxHash: '',
    };
  });

  return {
    packId,
    generatedAt,
    cadence: 'weekly-friday',
    unit: 'USDC_6',
    cards: packCards,
  };
}
```

- [ ] **Step 4: Run unit tests**

Run:

```bash
npm --prefix apps/admin test
```

Expected: PASS for `valuation.test.mjs` and existing admin tests.

- [ ] **Step 5: Commit Milestone 1 core**

Run:

```bash
rtk git add apps/admin/api/lib/valuation.js apps/admin/tests/valuation.test.mjs
rtk git commit -m "feat(admin): add valuation consensus core"
```

## Milestone 2: Pack Storage And API

### Task 2: Pack Store

**Files:**
- Create: `apps/admin/api/lib/valuation-store.js`
- Test: `apps/admin/tests/valuation-store.test.mjs`
- Modify: `apps/admin/package.json`
- Modify: `apps/admin/package-lock.json`

- [ ] **Step 1: Add Vercel Blob dependency**

Run:

```bash
npm --prefix apps/admin install @vercel/blob
```

Expected: `apps/admin/package.json` includes `@vercel/blob` and `apps/admin/package-lock.json` changes.

- [ ] **Step 2: Write failing store tests**

Create `apps/admin/tests/valuation-store.test.mjs` with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createValuationPackStore } from '../api/lib/valuation-store.js';

test('local valuation pack store writes immutable pack and latest index', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-'));
  try {
    const store = createValuationPackStore({ localDir: dir, forceLocal: true });
    const pack = { packId: 'valuation-2026-W16-v1', generatedAt: '2026-04-17T09:00:00.000Z', cards: [] };

    await store.savePack(pack);
    const latest = await store.getLatestPack();
    const loaded = await store.getPack(pack.packId);

    assert.equal(latest.packId, pack.packId);
    assert.equal(loaded.packId, pack.packId);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npm --prefix apps/admin test
```

Expected: FAIL with `Cannot find module '../api/lib/valuation-store.js'`.

- [ ] **Step 4: Implement the pack store**

Create `apps/admin/api/lib/valuation-store.js` with:

```js
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { get, put } from '@vercel/blob';

const DEFAULT_LOCAL_DIR = join(process.cwd(), '.valuation-packs');
const LATEST_PATH = 'valuation-packs/latest.json';

function packPath(packId) {
  return `valuation-packs/${packId}.json`;
}

async function readJsonFile(pathname) {
  return JSON.parse(await readFile(pathname, 'utf8'));
}

async function writeJsonFile(pathname, value) {
  await mkdir(join(pathname, '..'), { recursive: true });
  await writeFile(pathname, JSON.stringify(value, null, 2));
}

export function createValuationPackStore({ localDir = DEFAULT_LOCAL_DIR, forceLocal = false } = {}) {
  const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN) && !forceLocal;

  return {
    async savePack(pack) {
      if (useBlob) {
        await put(packPath(pack.packId), JSON.stringify(pack, null, 2), {
          access: 'private',
          contentType: 'application/json',
          allowOverwrite: false,
        });
        await put(LATEST_PATH, JSON.stringify({ packId: pack.packId }, null, 2), {
          access: 'private',
          contentType: 'application/json',
          allowOverwrite: true,
        });
        return pack;
      }

      await mkdir(join(localDir, 'valuation-packs'), { recursive: true });
      await writeFile(join(localDir, packPath(pack.packId)), JSON.stringify(pack, null, 2));
      await writeFile(join(localDir, LATEST_PATH), JSON.stringify({ packId: pack.packId }, null, 2));
      return pack;
    },

    async getPack(packId) {
      if (useBlob) {
        const blob = await get(packPath(packId));
        if (!blob) return null;
        return fetch(blob.url).then((response) => response.json());
      }

      try {
        return await readJsonFile(join(localDir, packPath(packId)));
      } catch {
        return null;
      }
    },

    async getLatestPack() {
      try {
        const latest = useBlob
          ? await get(LATEST_PATH).then((blob) => blob ? fetch(blob.url).then((response) => response.json()) : null)
          : await readJsonFile(join(localDir, LATEST_PATH));
        return latest?.packId ? this.getPack(latest.packId) : null;
      } catch {
        return null;
      }
    },
  };
}
```

- [ ] **Step 5: Run store tests**

Run:

```bash
npm --prefix apps/admin test
```

Expected: PASS for `valuation-store.test.mjs` and all existing admin tests.

- [ ] **Step 6: Commit pack store**

Run:

```bash
rtk git add apps/admin/api/lib/valuation-store.js apps/admin/tests/valuation-store.test.mjs apps/admin/package.json apps/admin/package-lock.json
rtk git commit -m "feat(admin): persist valuation packs"
```

### Task 3: Pack API And Local Dev Middleware

**Files:**
- Create: `apps/admin/api/valuation-pack.js`
- Modify: `apps/admin/vite.config.ts`
- Test: `apps/admin/tests/valuation-api.test.mjs`

- [ ] **Step 1: Write failing API handler tests**

Create `apps/admin/tests/valuation-api.test.mjs` with:

```js
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import handler from '../api/valuation-pack.js';

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    payload: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; },
  };
}

test('valuation-pack POST generate creates a pack from submitted cards and observations', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'gm10-valuation-api-'));
  process.env.GM10_VALUATION_LOCAL_DIR = dir;
  try {
    const response = responseRecorder();
    await handler({
      method: 'POST',
      body: {
        action: 'generate',
        generatedAt: '2026-04-17T09:00:00.000Z',
        cards: [{
          positionId: 1,
          cardKey: 'psa:140897946',
          title: 'Gengar VMAX PSA 10',
          currentValueUsdc6: '96000000',
          observations: [
            { sourceId: 'primary', sourceName: 'Primary', cardKey: 'psa:140897946', observedAt: '2026-04-17T09:00:00.000Z', fetchedAt: '2026-04-17T09:00:00.000Z', valueUsdc6: '100000000', currency: 'USD', confidence: 0.92, rawPayloadRef: 'memory://primary', sourceUrl: 'https://example.com/primary', matchReason: 'exact' },
            { sourceId: 'benchmark', sourceName: 'Benchmark', cardKey: 'psa:140897946', observedAt: '2026-04-17T09:00:00.000Z', fetchedAt: '2026-04-17T09:00:00.000Z', valueUsdc6: '105000000', currency: 'USD', confidence: 0.92, rawPayloadRef: 'memory://benchmark', sourceUrl: 'https://example.com/benchmark', matchReason: 'exact' },
          ],
        }],
      },
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.payload.pack.cards[0].consensus.status, 'passed');
  } finally {
    delete process.env.GM10_VALUATION_LOCAL_DIR;
    await rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm --prefix apps/admin test
```

Expected: FAIL with `Cannot find module '../api/valuation-pack.js'`.

- [ ] **Step 3: Implement API handler**

Create `apps/admin/api/valuation-pack.js` with:

```js
import { buildValuationPack } from './lib/valuation.js';
import { createValuationPackStore } from './lib/valuation-store.js';

function parseBody(request) {
  if (!request.body) return {};
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}');
  return request.body;
}

function weekPackId(date) {
  const year = date.getUTCFullYear();
  const first = new Date(Date.UTC(year, 0, 1));
  const dayOffset = Math.floor((date.getTime() - first.getTime()) / 86_400_000);
  const week = String(Math.floor((dayOffset + first.getUTCDay()) / 7) + 1).padStart(2, '0');
  return `valuation-${year}-W${week}-${date.toISOString().slice(0, 10)}-${date.getUTCHours()}${date.getUTCMinutes()}`;
}

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  const store = createValuationPackStore({
    localDir: process.env.GM10_VALUATION_LOCAL_DIR,
  });

  try {
    if (request.method === 'GET') {
      response.status(200).json({ pack: await store.getLatestPack() });
      return;
    }

    if (request.method !== 'POST') {
      response.status(405).json({ error: 'GET or POST required' });
      return;
    }

    const body = parseBody(request);
    if (body.action === 'generate') {
      const generatedAt = body.generatedAt || new Date().toISOString();
      const pack = buildValuationPack({
        packId: body.packId || weekPackId(new Date(generatedAt)),
        generatedAt,
        cards: Array.isArray(body.cards) ? body.cards : [],
      });
      await store.savePack(pack);
      response.status(200).json({ pack });
      return;
    }

    response.status(400).json({ error: 'Unsupported valuation action' });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : 'Valuation pack request failed' });
  }
}
```

- [ ] **Step 4: Add admin local API middleware**

Modify `apps/admin/vite.config.ts` to load `apps/admin/api/valuation-pack.js` locally. Mirror the public app pattern with this code:

```ts
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
    for await (const chunk of request) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
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
                            if (!response.getHeader('content-type')) response.setHeader('content-type', 'application/json');
                            response.end(JSON.stringify(payload));
                        },
                    };
                    await handler({ method: request.method, body: await readRequestBody(request) }, apiResponse);
                } catch (error) {
                    response.statusCode = 500;
                    response.setHeader('content-type', 'application/json');
                    response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Local API request failed' }));
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
```

- [ ] **Step 5: Run API tests and typecheck**

Run:

```bash
npm --prefix apps/admin test
npm --prefix apps/admin run typecheck
```

Expected: both commands PASS.

- [ ] **Step 6: Commit API milestone**

Run:

```bash
rtk git add apps/admin/api/valuation-pack.js apps/admin/tests/valuation-api.test.mjs apps/admin/vite.config.ts
rtk git commit -m "feat(admin): add valuation pack API"
```

### Task 4: Server-Side Card Discovery

**Files:**
- Create: `apps/admin/api/lib/valuation-chain.js`
- Test: `apps/admin/tests/valuation-chain.test.mjs`

- [ ] **Step 1: Write failing chain discovery tests**

Create `apps/admin/tests/valuation-chain.test.mjs` with:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeRegistryPosition } from '../api/lib/valuation-chain.js';

test('normalizeRegistryPosition maps active registry tuple to valuation card input', () => {
  const card = normalizeRegistryPosition({
    id: 1n,
    evmCollection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
    tokenId: 123n,
    currentValueUsdt6: 96000000n,
    status: 1,
  });

  assert.equal(card.positionId, 1);
  assert.equal(card.cardKey, '0x251be3a17af4892035c37ebf5890f4a4d889dcad:123');
  assert.equal(card.title, 'Treasury card #1');
  assert.equal(card.currentValueUsdc6, '96000000');
  assert.equal(card.observations.length, 3);
  assert.equal(card.observations[0].matchReason, 'source not configured');
});

test('normalizeRegistryPosition returns null for sold or empty positions', () => {
  assert.equal(normalizeRegistryPosition({ id: 2n, evmCollection: '0x0000000000000000000000000000000000000000', tokenId: 0n, currentValueUsdt6: 0n, status: 3 }), null);
});
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
npm --prefix apps/admin test
```

Expected: FAIL with `Cannot find module '../api/lib/valuation-chain.js'`.

- [ ] **Step 3: Implement chain discovery**

Create `apps/admin/api/lib/valuation-chain.js` with:

```js
import { createPublicClient, http } from 'viem';
import { avalanche } from 'viem/chains';

const DEFAULT_REGISTRY = '0x02962F73AdFAA792636c62d3D2a76d922c6B052c';

const REGISTRY_READ_ABI = [
  { inputs: [], name: 'collectiblePositionCount', outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
  {
    inputs: [{ name: 'positionId', type: 'uint256' }],
    name: 'getCollectiblePosition',
    outputs: [{
      components: [
        { name: 'id', type: 'uint256' },
        { name: 'originPurchaseKey', type: 'bytes32' },
        { name: 'chainEid', type: 'uint32' },
        { name: 'marketplaceId', type: 'bytes32' },
        { name: 'custodyMode', type: 'uint8' },
        { name: 'tokenStandard', type: 'bytes32' },
        { name: 'evmCollection', type: 'address' },
        { name: 'nonEvmCollection', type: 'bytes32' },
        { name: 'tokenId', type: 'uint256' },
        { name: 'nonEvmTokenId', type: 'bytes32' },
        { name: 'externalAssetId', type: 'bytes32' },
        { name: 'categoryId', type: 'bytes32' },
        { name: 'marketplaceProvenanceRef', type: 'bytes32' },
        { name: 'acquisitionPriceUsdt6', type: 'uint256' },
        { name: 'currentValueUsdt6', type: 'uint256' },
        { name: 'lastNavMarkUsdt6', type: 'uint256' },
        { name: 'acquisitionDate', type: 'uint256' },
        { name: 'lastValuationAt', type: 'uint256' },
        { name: 'status', type: 'uint8' },
        { name: 'metadataHash', type: 'bytes32' },
        { name: 'proofHash', type: 'bytes32' },
      ],
      name: '',
      type: 'tuple',
    }],
    stateMutability: 'view',
    type: 'function',
  },
];

function missingObservation(sourceId, cardKey) {
  const now = new Date().toISOString();
  return {
    sourceId,
    sourceName: sourceId === 'primary' ? 'Primary source' : sourceId === 'benchmark' ? 'Benchmark source' : 'Evidence source',
    cardKey,
    observedAt: now,
    fetchedAt: now,
    valueUsdc6: '0',
    currency: 'USD',
    confidence: 0,
    rawPayloadRef: `missing://${sourceId}`,
    sourceUrl: '',
    matchReason: 'source not configured',
  };
}

export function normalizeRegistryPosition(position) {
  if (!position || Number(position.status) !== 1) return null;
  const positionId = Number(position.id);
  const cardKey = `${String(position.evmCollection).toLowerCase()}:${position.tokenId.toString()}`;
  return {
    positionId,
    cardKey,
    title: `Treasury card #${positionId}`,
    currentValueUsdc6: position.currentValueUsdt6.toString(),
    observations: ['primary', 'benchmark', 'evidence'].map((sourceId) => missingObservation(sourceId, cardKey)),
  };
}

export async function fetchActiveTreasuryCards({
  registryAddress = process.env.GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS || process.env.VITE_GM10_ADMIN_PORTFOLIO_REGISTRY_ADDRESS || DEFAULT_REGISTRY,
  rpcUrl = process.env.AVALANCHE_RPC_URL || process.env.GM10_AVALANCHE_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
  maxPositions = 40,
} = {}) {
  const client = createPublicClient({ chain: avalanche, transport: http(rpcUrl) });
  const count = await client.readContract({ address: registryAddress, abi: REGISTRY_READ_ABI, functionName: 'collectiblePositionCount' });
  const length = Math.min(Number(count), maxPositions);
  const cards = [];

  for (let index = 1; index <= length; index += 1) {
    const position = await client.readContract({ address: registryAddress, abi: REGISTRY_READ_ABI, functionName: 'getCollectiblePosition', args: [BigInt(index)] });
    const card = normalizeRegistryPosition(position);
    if (card) cards.push(card);
  }

  return cards;
}
```

- [ ] **Step 4: Wire API generation to chain discovery**

Modify `apps/admin/api/valuation-pack.js` to import discovery:

```js
import { fetchActiveTreasuryCards } from './lib/valuation-chain.js';
```

Change the `generate` action block to use submitted cards when present and chain discovery when not present:

```js
const submittedCards = Array.isArray(body.cards) ? body.cards : [];
const cards = submittedCards.length > 0 ? submittedCards : await fetchActiveTreasuryCards();
const pack = buildValuationPack({
  packId: body.packId || weekPackId(new Date(generatedAt)),
  generatedAt,
  cards,
});
```

- [ ] **Step 5: Run chain tests and API tests**

Run:

```bash
npm --prefix apps/admin test
```

Expected: PASS for valuation chain, valuation API, valuation store, valuation core, and existing admin tests.

- [ ] **Step 6: Commit chain discovery**

Run:

```bash
rtk git add apps/admin/api/lib/valuation-chain.js apps/admin/tests/valuation-chain.test.mjs apps/admin/api/valuation-pack.js
rtk git commit -m "feat(admin): discover treasury cards for valuation packs"
```

## Milestone 3: Admin Console Workflow

### Task 4: ABI And Client Types

**Files:**
- Modify: `apps/admin/src/abis.ts`
- Create: `apps/admin/src/lib/valuationClient.ts`

- [ ] **Step 1: Add valuation ABI entries**

Modify `apps/admin/src/abis.ts`:

Add this object inside `FUND_ADMIN_ABI`:

```ts
    {
        inputs: [
            { name: '_positionId', type: 'uint256' },
            { name: '_sourceType', type: 'uint8' },
            { name: '_sourceRef', type: 'bytes32' },
            { name: '_candidateValueUsdt6', type: 'uint256' },
            { name: '_proofHash', type: 'bytes32' },
        ],
        name: 'submitValuationObservation',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
```

Add these objects inside `REGISTRY_ABI`:

```ts
    {
        inputs: [],
        name: 'collectiblePositionCount',
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [{ name: 'positionId', type: 'uint256' }],
        name: 'getCollectiblePosition',
        outputs: [{
            components: [
                { name: 'id', type: 'uint256' },
                { name: 'originPurchaseKey', type: 'bytes32' },
                { name: 'chainEid', type: 'uint32' },
                { name: 'marketplaceId', type: 'bytes32' },
                { name: 'custodyMode', type: 'uint8' },
                { name: 'tokenStandard', type: 'bytes32' },
                { name: 'evmCollection', type: 'address' },
                { name: 'nonEvmCollection', type: 'bytes32' },
                { name: 'tokenId', type: 'uint256' },
                { name: 'nonEvmTokenId', type: 'bytes32' },
                { name: 'externalAssetId', type: 'bytes32' },
                { name: 'categoryId', type: 'bytes32' },
                { name: 'marketplaceProvenanceRef', type: 'bytes32' },
                { name: 'acquisitionPriceUsdt6', type: 'uint256' },
                { name: 'currentValueUsdt6', type: 'uint256' },
                { name: 'lastNavMarkUsdt6', type: 'uint256' },
                { name: 'acquisitionDate', type: 'uint256' },
                { name: 'lastValuationAt', type: 'uint256' },
                { name: 'status', type: 'uint8' },
                { name: 'metadataHash', type: 'bytes32' },
                { name: 'proofHash', type: 'bytes32' },
            ],
            name: '',
            type: 'tuple',
        }],
        stateMutability: 'view',
        type: 'function',
    },
```

- [ ] **Step 2: Add typed valuation client**

Create `apps/admin/src/lib/valuationClient.ts`:

```ts
export type SourceObservation = {
    sourceId: string;
    sourceName: string;
    cardKey: string;
    observedAt: string;
    fetchedAt: string;
    valueUsdc6: string;
    currency: string;
    confidence: number;
    rawPayloadRef: string;
    sourceUrl: string;
    matchReason: string;
};

export type ValuationPackCard = {
    positionId: number;
    cardKey: string;
    title: string;
    currentValueUsdc6: string;
    observations: SourceObservation[];
    consensus: {
        status: 'passed' | 'needs_review';
        proposedValueUsdc6?: string;
        validSourceCount: number;
        agreeingSourceIds: string[];
        warnings: string[];
    };
    decision: 'pending' | 'approved' | 'rejected';
    sourceRef: `0x${string}`;
    proofHash: `0x${string}`;
    submittedTxHash: string;
};

export type ValuationPack = {
    packId: string;
    generatedAt: string;
    cadence: string;
    unit: 'USDC_6';
    cards: ValuationPackCard[];
};

export async function fetchLatestValuationPack() {
    const response = await fetch('/api/valuation-pack', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Valuation pack returned ${response.status}`);
    return response.json() as Promise<{ pack: ValuationPack | null }>;
}

export async function generateValuationPack(cards: Array<Pick<ValuationPackCard, 'positionId' | 'cardKey' | 'title' | 'currentValueUsdc6' | 'observations'>>) {
    const response = await fetch('/api/valuation-pack', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ action: 'generate', cards }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || `Valuation pack returned ${response.status}`);
    return payload as { pack: ValuationPack };
}
```

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm --prefix apps/admin run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit ABI and client**

Run:

```bash
rtk git add apps/admin/src/abis.ts apps/admin/src/lib/valuationClient.ts
rtk git commit -m "feat(admin): prepare valuation submission client"
```

### Task 5: Valuation Panel

**Files:**
- Create: `apps/admin/src/panels/ValuationPanel.tsx`
- Modify: `apps/admin/src/App.tsx`

- [ ] **Step 1: Add panel UI**

Create `apps/admin/src/panels/ValuationPanel.tsx` with this structure:

```tsx
import { useMemo, useState } from 'react';
import { formatUnits } from 'viem';
import { useReadContract, useReadContracts, useWriteContract } from 'wagmi';
import { FUND_ADMIN_ABI, REGISTRY_ABI } from '../abis';
import { MAINNET } from '../addresses';
import { TxResult } from '../components/TxButton';
import { fetchLatestValuationPack, generateValuationPack, type SourceObservation, type ValuationPack } from '../lib/valuationClient';

const COMPARABLE_SALES = 2;

function formatUsdc(raw?: string | bigint) {
    if (raw === undefined) return 'Unavailable';
    return `$${Number(formatUnits(BigInt(raw), 6)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function defaultObservations(cardKey: string): SourceObservation[] {
    const now = new Date().toISOString();
    return [
        { sourceId: 'primary', sourceName: 'Primary source', cardKey, observedAt: now, fetchedAt: now, valueUsdc6: '0', currency: 'USD', confidence: 0, rawPayloadRef: 'missing://primary', sourceUrl: '', matchReason: 'source not configured' },
        { sourceId: 'benchmark', sourceName: 'Benchmark source', cardKey, observedAt: now, fetchedAt: now, valueUsdc6: '0', currency: 'USD', confidence: 0, rawPayloadRef: 'missing://benchmark', sourceUrl: '', matchReason: 'source not configured' },
        { sourceId: 'evidence', sourceName: 'Evidence source', cardKey, observedAt: now, fetchedAt: now, valueUsdc6: '0', currency: 'USD', confidence: 0, rawPayloadRef: 'missing://evidence', sourceUrl: '', matchReason: 'source not configured' },
    ];
}

export function ValuationPanel() {
    const [pack, setPack] = useState<ValuationPack | null>(null);
    const [error, setError] = useState('');
    const [sourceJson, setSourceJson] = useState('');
    const [approvedCards, setApprovedCards] = useState<Record<number, true>>({});
    const { writeContract, data: txHash, error: txError, isPending } = useWriteContract();

    const { data: positionCount } = useReadContract({
        address: MAINNET.portfolioRegistry,
        abi: REGISTRY_ABI,
        functionName: 'collectiblePositionCount',
    });

    const positionIds = useMemo(() => Array.from({ length: Math.min(Number(positionCount ?? 0n), 40) }, (_, index) => BigInt(index + 1)), [positionCount]);
    const { data: positionReads } = useReadContracts({
        contracts: positionIds.map((positionId) => ({
            address: MAINNET.portfolioRegistry,
            abi: REGISTRY_ABI,
            functionName: 'getCollectiblePosition',
            args: [positionId],
        })),
        query: { enabled: positionIds.length > 0 },
    });

    const cards = useMemo(() => (positionReads ?? [])
        .flatMap((read) => read.status === 'success' && read.result ? [read.result] : [])
        .filter((position) => Number(position.status) === 1)
        .map((position) => {
            const positionId = Number(position.id);
            const cardKey = `${position.evmCollection}:${position.tokenId.toString()}`;
            return {
                positionId,
                cardKey,
                title: `Treasury card #${positionId}`,
                currentValueUsdc6: position.currentValueUsdt6.toString(),
                observations: defaultObservations(cardKey),
            };
        }), [positionReads]);

    async function loadLatest() {
        setError('');
        try {
            const payload = await fetchLatestValuationPack();
            setPack(payload.pack);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load valuation pack');
        }
    }

    async function runNow() {
        setError('');
        try {
            const manualSources = sourceJson.trim()
                ? JSON.parse(sourceJson) as Record<string, SourceObservation[]>
                : {};
            const payload = await generateValuationPack(cards.map((card) => ({
                ...card,
                observations: manualSources[String(card.positionId)] ?? manualSources[card.cardKey] ?? card.observations,
            })));
            setPack(payload.pack);
            setApprovedCards({});
        } catch (runError) {
            setError(runError instanceof Error ? runError.message : 'Unable to generate valuation pack');
        }
    }

    function submit(card: ValuationPack['cards'][number]) {
        if (card.consensus.status !== 'passed' || !card.consensus.proposedValueUsdc6 || isPending) return;
        writeContract({
            address: MAINNET.fundProxy,
            abi: FUND_ADMIN_ABI,
            functionName: 'submitValuationObservation',
            args: [
                BigInt(card.positionId),
                COMPARABLE_SALES,
                card.sourceRef,
                BigInt(card.consensus.proposedValueUsdc6),
                card.proofHash,
            ],
        });
    }

    return (
        <div className="grid gap-6">
            <div>
                <h1 className="text-2xl font-bold text-white">Valuation workflow</h1>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                    Weekly Friday FMV marks use 2-of-3 source consensus. Source observations are evidence; an approved onchain submission creates the official mark.
                </p>
            </div>

            <div className="admin-card grid gap-3 p-5">
                <label className="grid gap-2">
                    <span className="text-xs uppercase tracking-[0.16em] text-gray-500">Optional source observations JSON</span>
                    <textarea
                        value={sourceJson}
                        onChange={(event) => setSourceJson(event.target.value)}
                        rows={5}
                        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-white"
                        aria-label="Optional source observations JSON"
                    />
                </label>
                <div className="flex flex-wrap gap-3">
                    <button type="button" className="admin-cta" onClick={runNow} disabled={cards.length === 0}>Run valuation now</button>
                    <button type="button" className="admin-cta-secondary" onClick={loadLatest}>Load latest pack</button>
                </div>
                <div className="text-xs text-gray-400">Active cards detected: {cards.length}</div>
                {error ? <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{error}</div> : null}
            </div>

            {pack ? (
                <div className="grid gap-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-gray-500">{pack.packId} · {new Date(pack.generatedAt).toLocaleString()} · {pack.unit}</div>
                    {pack.cards.map((card) => (
                        <div key={card.positionId} className="admin-card grid gap-4 p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <div className="text-lg font-semibold text-white">{card.title}</div>
                                    <div className="text-xs text-gray-500">Position #{card.positionId} · current {formatUsdc(card.currentValueUsdc6)}</div>
                                </div>
                                <span className={`rounded-full px-3 py-1 text-xs ${card.consensus.status === 'passed' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200'}`}>
                                    {card.consensus.status === 'passed' ? 'Consensus passed' : 'Needs review'}
                                </span>
                            </div>
                            <div className="grid gap-2 md:grid-cols-3">
                                {card.observations.map((source) => (
                                    <div key={source.sourceId} className="rounded-lg border border-white/10 bg-black/20 p-3">
                                        <div className="text-xs uppercase tracking-[0.14em] text-gray-500">{source.sourceName}</div>
                                        <div className="mt-1 text-xl font-semibold text-white">{formatUsdc(source.valueUsdc6)}</div>
                                        <div className="mt-1 text-xs text-gray-400">{source.matchReason}</div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="text-sm text-gray-300">
                                    Proposed mark: <span className="font-semibold text-white">{formatUsdc(card.consensus.proposedValueUsdc6)}</span>
                                    {card.consensus.warnings.length ? <span className="ml-2 text-amber-200">{card.consensus.warnings.join(' · ')}</span> : null}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" className="admin-cta-secondary" disabled={card.consensus.status !== 'passed'} onClick={() => setApprovedCards((current) => ({ ...current, [card.positionId]: true }))}>
                                        Approve mark
                                    </button>
                                    <button type="button" className="admin-cta" disabled={!approvedCards[card.positionId] || card.consensus.status !== 'passed' || isPending} onClick={() => submit(card)}>
                                        Submit onchain mark
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            <TxResult hash={txHash} error={txError} />
        </div>
    );
}
```

- [ ] **Step 2: Add tab**

Modify `apps/admin/src/App.tsx`:

```tsx
import { ValuationPanel } from './panels/ValuationPanel';
```

Change tabs:

```tsx
const TABS = ['Dashboard', 'Rounds', 'Operations', 'Courtyard Wizard', 'Valuation'] as const;
```

Add content:

```tsx
{tab === 'Valuation' && <ValuationPanel />}
```

- [ ] **Step 3: Run typecheck and build**

Run:

```bash
npm --prefix apps/admin run typecheck
npm --prefix apps/admin run build
```

Expected: both commands PASS.

- [ ] **Step 4: Commit admin UI**

Run:

```bash
rtk git add apps/admin/src/panels/ValuationPanel.tsx apps/admin/src/App.tsx
rtk git commit -m "feat(admin): add valuation workflow panel"
```

## Milestone 4: Weekly Friday Job And First Run

### Task 6: Cron Endpoint And Vercel Config

**Files:**
- Create: `apps/admin/api/valuation-cron.js`
- Modify: `apps/admin/vercel.json`

- [ ] **Step 1: Add cron endpoint**

Create `apps/admin/api/valuation-cron.js`:

```js
import valuationPackHandler from './valuation-pack.js';

function responseRecorder(realResponse) {
  return {
    statusCode: 200,
    payload: undefined,
    setHeader(name, value) { realResponse.setHeader(name, value); },
    status(code) { this.statusCode = code; realResponse.status(code); return this; },
    json(payload) { this.payload = payload; realResponse.json(payload); },
  };
}

export default async function handler(request, response) {
  const expectedSecret = process.env.CRON_SECRET;
  const providedSecret = request.headers?.authorization?.replace(/^Bearer\s+/i, '');
  if (expectedSecret && providedSecret !== expectedSecret) {
    response.status(401).json({ error: 'Unauthorized cron request' });
    return;
  }

  const recorder = responseRecorder(response);
  await valuationPackHandler({
    method: 'POST',
    body: {
      action: 'generate',
      generatedAt: new Date().toISOString(),
      cards: [],
    },
  }, recorder);
}
```

- [ ] **Step 2: Configure Friday cron**

Modify `apps/admin/vercel.json` to include Vercel cron and allow API methods:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "crons": [
    {
      "path": "/api/valuation-cron",
      "schedule": "0 6 * * 5"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET,POST,OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "X-Requested-With, content-type, Authorization"
        },
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors https://app.safe.global https://*.safe.global"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!.*\\.).*)",
      "destination": "/index.html"
    }
  ]
}
```

The `0 6 * * 5` schedule runs Fridays at 06:00 UTC, which is Friday morning in Europe/Rome. Vercel documents production cron jobs as GET requests to paths configured in `vercel.json`.

- [ ] **Step 3: Run admin checks**

Run:

```bash
npm --prefix apps/admin test
npm --prefix apps/admin run typecheck
npm --prefix apps/admin run build
```

Expected: all commands PASS.

- [ ] **Step 4: Commit cron work**

Run:

```bash
rtk git add apps/admin/api/valuation-cron.js apps/admin/vercel.json
rtk git commit -m "feat(admin): schedule Friday valuation packs"
```

### Task 7: First Job Run And Verification

**Files:**
- No source file changes unless verification finds a bug.

- [ ] **Step 1: Start admin dev server**

Run:

```bash
npm --prefix apps/admin run dev -- --host 127.0.0.1
```

Expected: Vite reports a local URL on port `5174`.

- [ ] **Step 2: Open admin valuation tab**

Use the browser at `http://127.0.0.1:5174`, connect an admin wallet if required, open the `Valuation` tab, and click `Run valuation now`.

Expected: a valuation pack appears. If provider credentials are not configured, every card is shown as `Needs review` with source-not-configured evidence and no onchain submission is enabled.

- [ ] **Step 3: Verify no unsafe onchain mark can be submitted without consensus**

Inspect every card row in the generated pack.

Expected: `Submit onchain mark` is disabled for cards with `Needs review`. No transaction prompt appears for missing-source packs.

- [ ] **Step 4: Run final regression suite**

Stop the dev server, then run:

```bash
npm --prefix apps/admin test
npm --prefix apps/admin run typecheck
npm --prefix apps/admin run build
```

Expected: all commands PASS.

- [ ] **Step 5: Commit first-run verification fixes only if needed**

If code changed during verification, run:

```bash
rtk git add apps/admin
rtk git commit -m "fix(admin): harden valuation first-run workflow"
```

If no code changed, do not create a verification-only commit.

## Self-Review

Spec coverage:

- Weekly Friday cadence is covered in Task 6.
- Manual first run is covered in Tasks 5 and 7.
- 2-of-3 consensus is covered in Task 1.
- USDC 6 normalization is covered in Task 1 and UI formatting in Task 5.
- Admin console workflow is covered in Tasks 4 and 5.
- Durable storage is covered in Task 2.
- Onchain submission through existing valuation observation is covered in Tasks 4 and 5.
- Source-provider configuration gaps are handled by source-not-configured observations and disabled submission in Task 7.

Placeholder scan:

- The plan contains no unresolved marker words or fill-in sections.
- Provider credentials are intentionally treated as runtime configuration; missing providers produce review-only packs instead of fake official marks.

Type consistency:

- `valueUsdc6`, `currentValueUsdc6`, `proposedValueUsdc6`, `sourceRef`, and `proofHash` are consistent across the API and React client.
- Onchain submission passes `proposedValueUsdc6` into the legacy `_candidateValueUsdt6` ABI field by design.
