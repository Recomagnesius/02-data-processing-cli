import fs from 'node:fs';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { pathResolver } from '../utils/pathResolver.js';

const SUPPORTED = new Set(['sha256', 'md5', 'sha512']);

export async function hashCompare(currentDir, args, options) {
  if (!options.input || !options.hash) {
    throw new Error('Invalid input');
  }

  const algorithm = options.algorithm || 'sha256';
  if (!SUPPORTED.has(algorithm)) {
    throw new Error('Operation failed');
  }

  const inputPath = pathResolver(currentDir, options.input);
  const hashPath = pathResolver(currentDir, options.hash);

  const hashStream = crypto.createHash(algorithm);

  await pipeline(
    fs.createReadStream(inputPath),
    new Writable({
      write(chunk, encoding, callback) {
        try {
          hashStream.update(chunk);
          callback();
        } catch (err) {
          callback(err);
        }
      }
    })
  );

  const actual = hashStream.digest('hex').trim().toLowerCase();
  const expected = (await fs.promises.readFile(hashPath, 'utf8')).trim().toLowerCase();

  console.log(actual === expected ? 'OK' : 'MISMATCH');
}