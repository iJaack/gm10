import assert from 'node:assert/strict';
import test from 'node:test';
import { inferSaleFromTransaction, parseTransferLogs } from '../server/lib/sale-import.js';

const HOT_WALLET = '0xc6E01B7A2e8D842447ED43d30FE89Ae9a9077b50';
const BUYER = '0x1111111111111111111111111111111111111111';
const USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const COLLECTION = '0x251BE3A17Af4892035C37ebf5890F4a4D889dcAD';
const TX_HASH = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

function topicAddress(address) {
  return `0x${'0'.repeat(24)}${address.toLowerCase().slice(2)}`;
}

function topicUint(value) {
  return `0x${BigInt(value).toString(16).padStart(64, '0')}`;
}

function erc721Transfer({ collection = COLLECTION, from = HOT_WALLET, to = BUYER, tokenId = 42n } = {}) {
  return {
    address: collection,
    topics: [TRANSFER_TOPIC, topicAddress(from), topicAddress(to), topicUint(tokenId)],
    data: '0x',
  };
}

function erc20Transfer({ token = USDC, from = BUYER, to = HOT_WALLET, amount = 123_450_000n } = {}) {
  return {
    address: token,
    topics: [TRANSFER_TOPIC, topicAddress(from), topicAddress(to)],
    data: topicUint(amount),
  };
}

function registryPosition(overrides = {}) {
  return {
    id: 7n,
    chainEid: 30109,
    evmCollection: COLLECTION,
    tokenId: 42n,
    status: 1,
    ...overrides,
  };
}

test('parseTransferLogs extracts NFT transfer out and stable proceeds into hot wallet', () => {
  const parsed = parseTransferLogs([
    erc721Transfer(),
    erc20Transfer(),
  ], { hotWallet: HOT_WALLET });

  assert.equal(parsed.nftTransfersOut.length, 1);
  assert.equal(parsed.nftTransfersOut[0].tokenId, '42');
  assert.equal(parsed.stableTransfersIn.length, 1);
  assert.equal(parsed.stableTransfersIn[0].amountUsdt6, '123450000');
});

test('inferSaleFromTransaction generates sale prefill from hot-wallet sale tx', async () => {
  const polygonClient = {
    async getTransactionReceipt({ hash }) {
      assert.equal(hash, TX_HASH);
      return {
        status: 'success',
        logs: [
          erc721Transfer(),
          erc20Transfer(),
        ],
      };
    },
  };
  const registryClient = {
    async readContract({ functionName, args }) {
      if (functionName === 'collectiblePositionCount') return 10n;
      if (functionName === 'getCollectiblePosition') {
        return args[0] === 7n
          ? registryPosition()
          : registryPosition({
            id: args[0],
            evmCollection: '0x9999999999999999999999999999999999999999',
            tokenId: args[0],
          });
      }
      throw new Error(`unexpected read ${functionName}`);
    },
  };

  const sale = await inferSaleFromTransaction({
    txHash: TX_HASH,
    hotWallet: HOT_WALLET,
    polygonClient,
    registryClient,
  });

  assert.equal(sale.saleKey, 'courtyard-sale-7-aaaaaaaa');
  assert.equal(sale.positionId, 7);
  assert.equal(sale.tokenId, '42');
  assert.equal(sale.proceedsUsdt, '123.45');
  assert.equal(sale.grossProceedsUsdt, '123.45');
  assert.equal(sale.marketplaceFeesUsdt, '0');
  assert.equal(sale.bridgeFeesUsdt, '0');
  assert.equal(sale.settlementMode, 'external');
  assert.equal(sale.stableProceedsToken, '');
  assert.equal(sale.stableProceedsAmount, '');
  assert.equal(sale.sourceChainEid, '30109');
  assert.equal(sale.sourceToken, USDC);
  assert.equal(sale.sourceTokenAmount, '123.45');
  assert.equal(sale.sourceTokenDecimals, '6');
  assert.equal(sale.sourceProceedsRef, TX_HASH);
  assert.equal(sale.executionRef, TX_HASH);
  assert.equal(sale.proceedsRef, TX_HASH);
  assert.equal(sale.proofRef, TX_HASH);
});

test('inferSaleFromTransaction rejects txs with no matching active position', async () => {
  const polygonClient = {
    async getTransactionReceipt() {
      return {
        status: 'success',
        logs: [erc721Transfer(), erc20Transfer()],
      };
    },
  };
  const registryClient = {
    async readContract({ functionName, args }) {
      if (functionName === 'collectiblePositionCount') return 1n;
      if (functionName === 'getCollectiblePosition') {
        return registryPosition({
          id: args[0],
          evmCollection: '0x9999999999999999999999999999999999999999',
          tokenId: 42n,
        });
      }
      throw new Error(`unexpected read ${functionName}`);
    },
  };

  await assert.rejects(
    inferSaleFromTransaction({
      txHash: TX_HASH,
      hotWallet: HOT_WALLET,
      polygonClient,
      registryClient,
    }),
    /Expected one active registry position/,
  );
});
