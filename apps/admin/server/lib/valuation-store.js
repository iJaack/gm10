import { get as blobGet, put as blobPut } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

const PACK_ROOT = 'valuation-packs';
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';
export const VALUATION_BLOB_ACCESS = 'public';

function packFilename(packId) {
  return `${packId}.json`;
}

function reviewFilename(packId) {
  return `${packId}.review.json`;
}

function packPath(rootDir, packId) {
  return join(rootDir, PACK_ROOT, packFilename(packId));
}

function reviewPath(rootDir, packId) {
  return join(rootDir, PACK_ROOT, reviewFilename(packId));
}

function latestPath(rootDir) {
  return join(rootDir, PACK_ROOT, 'latest.json');
}

async function ensureParentDir(filePath) {
  await mkdir(dirname(filePath), { recursive: true });
}

async function writeJsonFile(filePath, value, { overwrite = true } = {}) {
  await ensureParentDir(filePath);
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: 'utf8',
    flag: overwrite ? 'w' : 'wx',
  });
}

async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function blobJson(pathname, body, access, { allowOverwrite = pathname.endsWith('/latest.json') } = {}) {
  await blobPut(pathname, JSON.stringify(body, null, 2), {
    access,
    allowOverwrite,
    contentType: JSON_CONTENT_TYPE,
  });
}

export function blobReadOptions(access, useCache = true) {
  return access === 'private'
    ? { access, useCache }
    : { access };
}

async function readBlobJson(pathname, access, useCache = true) {
  const result = await blobGet(pathname, blobReadOptions(access, useCache));
  if (!result || result.statusCode === 304 || !result.stream) {
    return null;
  }

  return JSON.parse(await new Response(result.stream).text());
}

function mergeReviewState(pack, reviewState) {
  if (!pack || !reviewState?.cards || typeof reviewState.cards !== 'object') {
    return pack;
  }

  return {
    ...pack,
    cards: pack.cards.map((card) => {
      const review = reviewState.cards[String(card.positionId)];
      if (!review || typeof review !== 'object') {
        return card;
      }

      return {
        ...card,
        decision: review.decision ?? card.decision,
        submittedTxHash: review.submittedTxHash ?? card.submittedTxHash ?? '',
      };
    }),
  };
}

function mergeReviewCard(reviewState, update) {
  const positionKey = String(update.positionId);
  const existingCards = reviewState?.cards && typeof reviewState.cards === 'object'
    ? reviewState.cards
    : {};
  const existingCard = existingCards[positionKey] && typeof existingCards[positionKey] === 'object'
    ? existingCards[positionKey]
    : {};

  return {
    packId: update.packId,
    updatedAt: update.updatedAt,
    cards: {
      ...existingCards,
      [positionKey]: {
        ...existingCard,
        decision: update.decision,
        submittedTxHash: update.submittedTxHash ?? existingCard.submittedTxHash ?? '',
        updatedAt: update.updatedAt,
      },
    },
  };
}

function createLocalStore(rootDir) {
  const normalizedRootDir = resolve(rootDir);
  const getPackArtifact = async (packId) => readJsonFile(packPath(normalizedRootDir, packId));
  const getReviewState = async (packId) => readJsonFile(reviewPath(normalizedRootDir, packId));
  const getPack = async (packId) => mergeReviewState(
    await getPackArtifact(packId),
    await getReviewState(packId),
  );
  const getLatestPack = async () => {
    const latest = await readJsonFile(latestPath(normalizedRootDir));
    if (!latest?.packId) {
      return null;
    }

    return getPack(latest.packId);
  };

  return {
    async savePack(pack) {
      const packFilePath = packPath(normalizedRootDir, pack.packId);
      const latestFilePath = latestPath(normalizedRootDir);

      await writeJsonFile(packFilePath, pack, { overwrite: false });
      await writeJsonFile(latestFilePath, {
        generatedAt: pack.generatedAt,
        packId: pack.packId,
      });
    },

    getPack,
    getLatestPack,

    async updateCardDecision(update) {
      const pack = await getPackArtifact(update.packId);
      if (!pack?.cards?.some((card) => card.positionId === update.positionId)) {
        return null;
      }

      const reviewFilePath = reviewPath(normalizedRootDir, update.packId);
      const nextReviewState = mergeReviewCard(await getReviewState(update.packId), update);
      await writeJsonFile(reviewFilePath, nextReviewState);
      return mergeReviewState(pack, nextReviewState);
    },
  };
}

function createBlobStore() {
  const getPackArtifact = async (packId) => readBlobJson(packPath('', packId), VALUATION_BLOB_ACCESS);
  const getReviewState = async (packId) => readBlobJson(reviewPath('', packId), VALUATION_BLOB_ACCESS, false);
  const getPack = async (packId) => mergeReviewState(
    await getPackArtifact(packId),
    await getReviewState(packId),
  );
  const getLatestPack = async () => {
    const latest = await readBlobJson(latestPath(''), VALUATION_BLOB_ACCESS, false);
    if (!latest?.packId) {
      return null;
    }

    return getPack(latest.packId);
  };

  return {
    async savePack(pack) {
      await blobJson(packPath('', pack.packId), pack, VALUATION_BLOB_ACCESS);
      await blobJson(latestPath(''), {
        generatedAt: pack.generatedAt,
        packId: pack.packId,
      }, VALUATION_BLOB_ACCESS);
    },

    getPack,
    getLatestPack,

    async updateCardDecision(update) {
      const pack = await getPackArtifact(update.packId);
      if (!pack?.cards?.some((card) => card.positionId === update.positionId)) {
        return null;
      }

      const nextReviewState = mergeReviewCard(await getReviewState(update.packId), update);
      await blobJson(reviewPath('', update.packId), nextReviewState, VALUATION_BLOB_ACCESS, { allowOverwrite: true });
      return mergeReviewState(pack, nextReviewState);
    },
  };
}

export function createValuationPackStore({ localDir = process.cwd(), forceLocal = false } = {}) {
  if (process.env.BLOB_READ_WRITE_TOKEN && !forceLocal) {
    return createBlobStore();
  }

  return createLocalStore(localDir);
}
