import { get as blobGet, put as blobPut } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';

const PACK_ROOT = 'valuation-packs';
const JSON_CONTENT_TYPE = 'application/json; charset=utf-8';

function packFilename(packId) {
  return `${packId}.json`;
}

function packPath(rootDir, packId) {
  return join(rootDir, PACK_ROOT, packFilename(packId));
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

async function blobJson(pathname, body) {
  await blobPut(pathname, JSON.stringify(body, null, 2), {
    access: 'public',
    allowOverwrite: pathname.endsWith('/latest.json'),
    contentType: JSON_CONTENT_TYPE,
  });
}

async function readBlobJson(pathname) {
  const result = await blobGet(pathname, { access: 'public' });
  if (!result || result.statusCode === 304 || !result.stream) {
    return null;
  }

  return JSON.parse(await new Response(result.stream).text());
}

function createLocalStore(rootDir) {
  const normalizedRootDir = resolve(rootDir);
  const getPack = async (packId) => readJsonFile(packPath(normalizedRootDir, packId));
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
  };
}

function createBlobStore() {
  const getPack = async (packId) => readBlobJson(packPath('', packId));
  const getLatestPack = async () => {
    const latest = await readBlobJson(latestPath(''));
    if (!latest?.packId) {
      return null;
    }

    return getPack(latest.packId);
  };

  return {
    async savePack(pack) {
      await blobJson(packPath('', pack.packId), pack);
      await blobJson(latestPath(''), {
        generatedAt: pack.generatedAt,
        packId: pack.packId,
      });
    },

    getPack,
    getLatestPack,
  };
}

export function createValuationPackStore({ localDir = process.cwd(), forceLocal = false } = {}) {
  if (process.env.BLOB_READ_WRITE_TOKEN && !forceLocal) {
    return createBlobStore();
  }

  return createLocalStore(localDir);
}
