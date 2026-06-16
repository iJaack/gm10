import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { del as blobDel, list as blobList } from '@vercel/blob';
import { selectValuationPackBlobDeletes } from '../apps/admin/server/lib/valuation-store.js';

const PACK_ROOT = 'valuation-packs';
const DEFAULT_KEEP = 1;

async function loadEnvLocal() {
  try {
    const envPath = resolve('.env.local');
    const contents = await readFile(envPath, 'utf8');
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

function parseArgs(argv) {
  const options = {
    apply: false,
    clearAll: false,
    keep: DEFAULT_KEEP,
  };

  for (const arg of argv) {
    if (arg === '--apply') {
      options.apply = true;
      continue;
    }
    if (arg === '--clear-all') {
      options.clearAll = true;
      continue;
    }

    const keepMatch = /^--keep=(\d+)$/.exec(arg);
    if (keepMatch) {
      options.keep = Math.max(1, Number.parseInt(keepMatch[1], 10));
    }
  }

  return options;
}

async function listAllValuationBlobs() {
  const blobs = [];
  let cursor;

  do {
    const result = await blobList({
      prefix: `${PACK_ROOT}/`,
      cursor,
      limit: 1000,
    });
    blobs.push(...result.blobs);
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  return blobs;
}

await loadEnvLocal();

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN is required to prune Vercel Blob valuation packs');
}

const options = parseArgs(process.argv.slice(2));
const blobs = await listAllValuationBlobs();
const deletePathnames = options.clearAll
  ? blobs.map((blob) => blob.pathname).sort()
  : selectValuationPackBlobDeletes(blobs, { keep: options.keep });

console.log(JSON.stringify({
  apply: options.apply,
  clearAll: options.clearAll,
  keep: options.keep,
  listed: blobs.length,
  deleteCount: deletePathnames.length,
  deletePathnames,
}, null, 2));

if (options.apply && deletePathnames.length > 0) {
  await blobDel(deletePathnames);
  console.log(`Deleted ${deletePathnames.length} valuation blob(s).`);
} else if (!options.apply) {
  console.log('Dry run only. Re-run with --apply to delete these blobs.');
}
