import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFundingQuotes, buildSolanaFundingQuote, buildSolanaUsdcFundingQuote, normalizeQuote } from '../server/lib/lifi.js';

function quote({ fromAmount, toAmount, toAmountMin = toAmount, gasAmount = '0', tool = 'stargateV2Bus' }) {
  return {
    id: `${tool}-${fromAmount}-${toAmount}`,
    action: {
      fromAmount,
    },
    estimate: {
      fromAmount,
      fromAmountUSD: '10',
      toAmount,
      toAmountMin,
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
    transactionRequest: {
      to: '0x1111111111111111111111111111111111111111',
      data: '0x1234',
      value: fromAmount,
      chainId: 43114,
    },
  };
}

test('normalizes exact-output quote and source gas', () => {
  const normalized = normalizeQuote('polygonUsdc', quote({ fromAmount: '1000000000000000000', toAmount: '96000000', gasAmount: '10000000000000000' }), '96000000');
  assert.equal(normalized.fromAmountAvax, '1');
  assert.equal(normalized.sourceGasAvax, '0.01');
  assert.equal(normalized.totalInputAvax, '1.01');
  assert.equal(normalized.enoughOutput, true);
  assert.equal(normalized.transactionRequest.to, '0x1111111111111111111111111111111111111111');

  const belowMinimum = normalizeQuote('polygonUsdc', quote({ fromAmount: '1000000000000000000', toAmount: '97000000', toAmountMin: '95000000' }), '96000000');
  assert.equal(belowMinimum.enoughOutput, false);
});

test('builds one USDC route with a 2 percent AVAX buffer', async () => {
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    const toAmount = parsed.searchParams.get('toAmount');
    return {
      ok: true,
      async json() {
        return quote({
          fromAmount: '1000000000000000000',
          toAmount,
          gasAmount: '10000000000000000',
          tool: 'stargateV2Bus',
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
  assert.equal(result.pol, undefined);
  assert.equal(result.summary.totalAvax, '1.01');
  assert.equal(result.summary.bufferedAvax, '1.0302');
});

test('falls back to exact-source LI.FI quotes when exact-output routing is unavailable', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(`${parsed.pathname}:${parsed.searchParams.get('toToken')}:${parsed.searchParams.get('fromAmount') ?? parsed.searchParams.get('toAmount')}`);
    if (parsed.pathname.endsWith('/quote/toAmount')) {
      return {
        ok: false,
        async json() {
          return { message: 'No available quotes for the requested transfer' };
        },
      };
    }
    const fromAmount = parsed.searchParams.get('fromAmount');
    const enough = BigInt(fromAmount) >= 1_000_000_000_000_000_000n;
    return {
      ok: true,
      async json() {
        return quote({
          fromAmount,
          toAmount: enough ? '97000000' : '10000000',
          toAmountMin: enough ? '96000000' : '10000000',
          tool: 'stargateV2Bus',
        });
      },
    };
  };

  const result = await buildFundingQuotes({
    usdcRaw: '96000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toAddress: '0x39971795266a794a8156271729A07994952a6FAD',
  }, fetchImpl);

  assert.equal(result.usdc.enoughOutput, true);
  assert.ok(calls.some((call) => call.startsWith('/v1/quote:')));
});

test('blocks missing quote inputs', async () => {
  await assert.rejects(() => buildFundingQuotes({ usdcRaw: '', fromAddress: '0x1', toAddress: '0x2' }), /Missing USDC/);
  await assert.rejects(() => buildFundingQuotes({ usdcRaw: '1', fromAddress: '', toAddress: '0x2' }), /Missing Safe/);
});

test('builds exact-source SOL route for a Solana recipient', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    return {
      ok: true,
      async json() {
        return quote({
          fromAmount: parsed.searchParams.get('fromAmount'),
          toAmount: '435022602',
          toAmountMin: '430683256',
          gasAmount: '113133225538368',
          tool: 'mayan',
        });
      },
    };
  };

  const result = await buildSolanaFundingQuote({
    fromAmountRaw: '4000000000000000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toAddress: 'GWE93fpg5M4vsfYnpW21pD3t1pQx4XktcAzwhPqYRaTG',
  }, fetchImpl);

  assert.equal(result.sol.kind, 'solanaSol');
  assert.equal(result.sol.fromAmountAvax, '4');
  assert.equal(result.sol.toAmountRaw, '435022602');
  assert.equal(result.sol.toAmountMinRaw, '430683256');
  assert.equal(result.sol.tool, 'mayan');
  assert.equal(calls[0].pathname, '/v1/quote');
  assert.equal(calls[0].searchParams.get('toChain'), '1151111081099710');
  assert.equal(calls[0].searchParams.get('toToken'), '11111111111111111111111111111111');
});

test('builds exact-target Solana USDC route for a Solana recipient', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    return {
      ok: true,
      async json() {
        return quote({
          fromAmount: '78324849873298818795',
          toAmount: '732322780',
          toAmountMin: '725017861',
          gasAmount: '113133225538368',
          tool: 'mayan',
        });
      },
    };
  };

  const result = await buildSolanaUsdcFundingQuote({
    usdcRaw: '725000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toAddress: 'GWE93fpg5M4vsfYnpW21pD3t1pQx4XktcAzwhPqYRaTG',
  }, fetchImpl);

  assert.equal(result.usdc.kind, 'solanaUsdc');
  assert.equal(result.usdc.fromAmountAvax, '78.32484987');
  assert.equal(result.usdc.toAmountRaw, '732322780');
  assert.equal(result.usdc.toAmountMinRaw, '725017861');
  assert.equal(result.usdc.enoughOutput, true);
  assert.equal(calls[0].pathname, '/v1/quote/toAmount');
  assert.equal(calls[0].searchParams.get('toToken'), 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  assert.equal(calls[0].searchParams.get('toAmount'), '725000000');
});

test('blocks malformed SOL route inputs', async () => {
  await assert.rejects(() => buildSolanaFundingQuote({
    fromAmountRaw: '0',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toAddress: 'GWE93fpg5M4vsfYnpW21pD3t1pQx4XktcAzwhPqYRaTG',
  }, async () => ({})), /greater than zero/);
  await assert.rejects(() => buildSolanaFundingQuote({
    fromAmountRaw: '4000000000000000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toAddress: 'not-solana',
  }, async () => ({})), /Invalid Solana/);
});
