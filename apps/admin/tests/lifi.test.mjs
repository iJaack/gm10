import assert from 'node:assert/strict';
import test from 'node:test';
import { buildContinuousCommitRoute, buildFundingQuotes, buildSolanaFundingQuote, buildSolanaUsdcFundingQuote, normalizeQuote } from '../server/lib/lifi.js';

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

test('builds one USDC route with a 0.1 percent AVAX buffer', async () => {
  const seenToTokens = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    seenToTokens.push(parsed.searchParams.get('toToken'));
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
  assert.equal(result.summary.bufferedAvax, '1.01101');
  assert.equal(result.summary.bufferBps, 10);
  assert.deepEqual(seenToTokens, ['0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359']);
});

test('builds a Polygon route to the listing currency token', async () => {
  let seenToToken = '';
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    seenToToken = parsed.searchParams.get('toToken');
    return {
      ok: true,
      async json() {
        return quote({
          fromAmount: '1000000000000000000',
          toAmount: parsed.searchParams.get('toAmount'),
          gasAmount: '10000000000000000',
        });
      },
    };
  };
  await buildFundingQuotes({
    usdcRaw: '6000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    toToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  }, fetchImpl);
  assert.equal(seenToToken, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174');
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

test('builds a same-chain native AVAX continuous commit transfer into the fund proxy', async () => {
  const result = await buildContinuousCommitRoute({
    fromChainId: 43114,
    fromToken: '0x0000000000000000000000000000000000000000',
    fromAmountRaw: '1000000000000000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    settlementAddress: '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f',
    settlementToken: '0x0000000000000000000000000000000000000000',
  }, async () => {
    throw new Error('LI.FI should not be called for same-chain native AVAX');
  });

  assert.equal(result.settlementAddress, '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f');
  assert.equal(result.settlementToken, '0x0000000000000000000000000000000000000000');
  assert.equal(result.route.tool, 'native-transfer');
  assert.equal(result.route.toAmountRaw, '1000000000000000000');
  assert.equal(result.route.transactionRequest.to, '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f');
  assert.equal(result.route.transactionRequest.value, '1000000000000000000');
});

test('builds a LI.FI continuous commit route to native AVAX in the fund proxy', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    const parsed = new URL(url);
    calls.push(parsed);
    return {
      ok: true,
      async json() {
        return quote({
          fromAmount: parsed.searchParams.get('fromAmount'),
          toAmount: '990000000000000000',
          toAmountMin: '980000000000000000',
          tool: 'stargateV2Bus',
        });
      },
    };
  };

  const result = await buildContinuousCommitRoute({
    fromChainId: 8453,
    fromToken: '0x0000000000000000000000000000000000000000',
    fromAmountRaw: '1000000000000000000',
    fromAddress: '0x39971795266a794a8156271729A07994952a6FAD',
    settlementAddress: '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f',
    settlementToken: '0x0000000000000000000000000000000000000000',
  }, fetchImpl);

  assert.equal(calls[0].pathname, '/v1/quote');
  assert.equal(calls[0].searchParams.get('toToken'), '0x0000000000000000000000000000000000000000');
  assert.equal(calls[0].searchParams.get('toAddress'), '0x574Be007cC7CFe17AAdfc893Ec8E2f4c4528fe0f');
  assert.equal(result.route.toAmountMinRaw, '980000000000000000');
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
