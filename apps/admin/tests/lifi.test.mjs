import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFundingQuotes, normalizeQuote, POL_GAS_BUFFER_RAW } from '../api/lib/lifi.js';

function quote({ fromAmount, toAmount, gasAmount = '0', tool = 'stargateV2Bus' }) {
  return {
    id: `${tool}-${fromAmount}-${toAmount}`,
    action: {
      fromAmount,
    },
    estimate: {
      fromAmount,
      fromAmountUSD: '10',
      toAmount,
      toAmountMin: toAmount,
      toAmountUSD: '10',
      executionDuration: 120,
      tool,
      gasCosts: [
        {
          amount: gasAmount,
          amountUSD: '0.05',
          token: { chainId: 43114, symbol: 'AVAX' },
        },
      ],
    },
  };
}

test('normalizes exact-output quote and source gas', () => {
  const normalized = normalizeQuote('polygonUsdc', quote({ fromAmount: '1000000000000000000', toAmount: '96000000', gasAmount: '10000000000000000' }), '96000000');
  assert.equal(normalized.fromAmountAvax, '1');
  assert.equal(normalized.sourceGasAvax, '0.01');
  assert.equal(normalized.totalInputAvax, '1.01');
  assert.equal(normalized.enoughOutput, true);
});

test('builds USDC and POL routes with a 2 percent AVAX buffer', async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const toAmount = parsed.searchParams.get('toAmount');
    const isPol = toAmount === POL_GAS_BUFFER_RAW;
    return {
      ok: true,
      async json() {
        return quote({
          fromAmount: isPol ? '2000000000000000000' : '1000000000000000000',
          toAmount,
          gasAmount: isPol ? '20000000000000000' : '10000000000000000',
          tool: isPol ? 'gasZip' : 'stargateV2Bus',
        });
      },
    };
  };
  const result = await buildFundingQuotes({
    usdcRaw: '96000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toAddress: '0x39971795266a794a8156271729A07994952a6FAD',
  }, fetchImpl);
  assert.equal(result.usdc.totalInputAvax, '1.01');
  assert.equal(result.pol.totalInputAvax, '2.02');
  assert.equal(result.summary.totalAvax, '3.03');
  assert.equal(result.summary.bufferedAvax, '3.0906');
  assert.equal(result.summary.polGasBuffer, '0.5');
});

test('blocks missing quote inputs', async () => {
  await assert.rejects(() => buildFundingQuotes({ usdcRaw: '', fromAddress: '0x1', toAddress: '0x2' }), /Missing USDC/);
  await assert.rejects(() => buildFundingQuotes({ usdcRaw: '1', fromAddress: '', toAddress: '0x2' }), /Missing Safe/);
});
