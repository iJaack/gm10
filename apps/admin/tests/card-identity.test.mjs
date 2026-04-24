import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractCourtyardAssetId,
  extractPhygitalsCardSlug,
  resolveCardIdentity,
} from '../server/lib/card-identity.js';

test('resolveCardIdentity uses curated portfolio metadata for known positions', () => {
  const identity = resolveCardIdentity({
    position: { id: 1n },
    card: {
      positionId: 1,
      title: 'Treasury card #1',
      cardKey: '0xabc:123',
    },
  });

  assert.equal(identity.title, '2021 Pokemon Sword & Shield Gengar VMAX');
  assert.equal(identity.grade, 'psa10');
  assert.match(identity.search, /Gengar VMAX/);
  assert.match(identity.search, /PSA 10/);
  assert.equal(identity.courtyardAssetId, '1b2115dde17bb90872264342530b288c9c4fc6b6bc11e44e07dccc89edad6008');
});

test('resolveCardIdentity prefers runtime overrides over curated metadata', () => {
  const identity = resolveCardIdentity({
    position: { id: 1n },
    card: {
      positionId: 1,
      title: 'Treasury card #1',
      cardKey: '0xabc:123',
    },
    overrides: {
      1: {
        title: 'Runtime Gengar VMAX',
        grade: 'PSA 9',
        tcgPlayerId: '253266',
        courtyardAssetId: 'runtime-courtyard-id',
      },
    },
  });

  assert.equal(identity.title, 'Runtime Gengar VMAX');
  assert.equal(identity.grade, 'psa9');
  assert.equal(identity.tcgPlayerId, '253266');
  assert.equal(identity.courtyardAssetId, 'runtime-courtyard-id');
});

test('resolveCardIdentity keeps Phygitals runtime hints', () => {
  const identity = resolveCardIdentity({
    position: { id: 9n },
    card: {
      positionId: 9,
      title: 'Treasury card #9',
      cardKey: 'solana:collection:asset',
    },
    overrides: {
      9: {
        title: '2021 Pokemon Japanese S Promo Pokemon Stamp Box Cramorant #226 PSA 10 GEM MINT',
        phygitalsUrl: 'https://www.phygitals.com/card/2021-pokemon-japanese-s-promo-po-wbtuqn',
        phygitalsAssetAddress: '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP',
      },
    },
  });

  assert.equal(identity.phygitalsSlug, '2021-pokemon-japanese-s-promo-po-wbtuqn');
  assert.equal(identity.phygitalsAssetAddress, '9pZVFyRLBUV13HSpBES29RphRvsB5V52vXwdAsCituAP');
});

test('resolveCardIdentity returns undefined for unknown generic registry cards', () => {
  const identity = resolveCardIdentity({
    position: { id: 99n },
    card: {
      positionId: 99,
      title: 'Treasury card #99',
      cardKey: '0xabc:999',
    },
  });

  assert.equal(identity, undefined);
});

test('extractCourtyardAssetId parses Courtyard asset URLs and raw ids', () => {
  assert.equal(
    extractCourtyardAssetId('https://courtyard.io/asset/90f85586da4ba09bcf5c81b9560c094cfc2d9d3690eed7c9f4b4832056f765d9'),
    '90f85586da4ba09bcf5c81b9560c094cfc2d9d3690eed7c9f4b4832056f765d9',
  );
  assert.equal(extractCourtyardAssetId('courtyard-asset-1'), 'courtyard-asset-1');
  assert.equal(extractCourtyardAssetId(''), undefined);
});

test('extractPhygitalsCardSlug parses Phygitals card URLs and raw slugs', () => {
  assert.equal(
    extractPhygitalsCardSlug('https://www.phygitals.com/card/2021-pokemon-japanese-s-promo-po-wbtuqn'),
    '2021-pokemon-japanese-s-promo-po-wbtuqn',
  );
  assert.equal(extractPhygitalsCardSlug('2021-pokemon-japanese-s-promo-po-wbtuqn'), '2021-pokemon-japanese-s-promo-po-wbtuqn');
  assert.equal(extractPhygitalsCardSlug(''), undefined);
});
