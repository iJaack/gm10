import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ADMIN_HOST = 'admin.gm10.xyz';
const REQUIRED_FRAME_ANCESTORS = [
  'https://app.safe.global',
  'https://*.safe.global',
  'https://wallet.ash.center',
];

function hasAdminHost(configEntry) {
  return Array.isArray(configEntry.has)
    && configEntry.has.some((condition) => condition.type === 'host' && condition.value === ADMIN_HOST);
}

function collectAdminFrameAncestorPolicies(config) {
  const policies = [];

  for (const entry of config.headers ?? []) {
    if (!hasAdminHost(entry)) continue;
    for (const header of entry.headers ?? []) {
      if (header.key === 'Content-Security-Policy' && header.value?.includes('frame-ancestors')) {
        policies.push(header.value);
      }
    }
  }

  for (const route of config.routes ?? []) {
    if (!hasAdminHost(route)) continue;
    const policy = route.headers?.['Content-Security-Policy'];
    if (policy?.includes('frame-ancestors')) {
      policies.push(policy);
    }
  }

  return policies;
}

test('admin Safe app frame policy allows Safe and Ash Wallet hosts', async () => {
  const config = JSON.parse(await readFile(new URL('../../../vercel.json', import.meta.url), 'utf8'));
  const policies = collectAdminFrameAncestorPolicies(config);

  assert.equal(policies.length, 4);
  for (const policy of policies) {
    const ancestors = policy.split(/\s+/);
    for (const origin of REQUIRED_FRAME_ANCESTORS) {
      assert.equal(ancestors.includes(origin), true);
    }
  }
});
