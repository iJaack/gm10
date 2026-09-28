import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeCourtyardPosition } from '../../../src/server/api/nft-metadata.js';

const position = {
  positionId: 10,
  collection: '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD',
  tokenId: '49874132386781836433894891019180022971092109987163266022803619978989664191585',
};
const asset = {
  chain: 'polygon',
  contract: position.collection,
  token_id: position.tokenId,
  proof_of_integrity: '6e43c23217ae05a66738e8344f2e3485716444adef19622128fd987a298fc461',
  owner: { address: '0x39971795266a794a8156271729A07994952a6FAD' },
  fmv_estimate_usd: 3938,
  title: 'Umbreon VMAX PSA 10',
  image: 'https://static.courtyard.io/umb.jpg',
  attributes: [{ name: 'Grade', value: '10 GEM MINT' }],
};

test('Courtyard FMV is accepted only for the exact GM10 custody token', () => {
  const result = normalizeCourtyardPosition(position, asset, '2026-09-28T15:00:00.000Z');
  assert.equal(result.mark.valueUsdc6, '3938000000');
  assert.equal(result.mark.sourceUrl, `https://courtyard.io/asset/${asset.proof_of_integrity}`);
  assert.equal(result.metadata.title, 'Umbreon VMAX PSA 10');
  assert.equal(result.metadata.subtitle, '10 GEM MINT');
});

test('Courtyard FMV rejects another token or wallet and an absent estimate', () => {
  assert.throws(() => normalizeCourtyardPosition(position, { ...asset, token_id: '1' }));
  assert.throws(() => normalizeCourtyardPosition(position, {
    ...asset,
    owner: { address: '0x0000000000000000000000000000000000000001' },
  }));
  assert.throws(() => normalizeCourtyardPosition(position, { ...asset, fmv_estimate_usd: null }));
});
