import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const rootDist = resolve('dist');
const adminDist = resolve('apps/admin/dist');
const targetDist = resolve(rootDist, 'admin');

if (!existsSync(adminDist)) {
  throw new Error(`Admin build output not found at ${adminDist}`);
}

rmSync(targetDist, { force: true, recursive: true });
cpSync(adminDist, targetDist, { recursive: true });
