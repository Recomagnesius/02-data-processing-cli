import fs from 'node:fs';
import crypto from 'node:crypto';
import { pathResolver } from '../utils/pathResolver.js';

const SUPPORTED = new Set(['sha256', 'md5', 'sha512']);

export async function hash(currentDir, args, options) {
  if (!options.input) {
    throw new Error('Invalid input');
  }

  const algorithm = options.algorithm || 'sha256';

  if (!SUPPORTED.has(algorithm)) {
    throw new Error('Operation failed');
  }

  const inputPath = pathResolver(currentDir, options.input);

  const hash = crypto.createHash(algorithm);

  await new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(inputPath);

    readStream.on('data', (chunk) => {
      hash.update(chunk);
    });

    readStream.on('end', resolve);
    readStream.on('error', reject);
  });

  const digest = hash.digest('hex');

  console.log(`${algorithm}: ${digest}`);

  if (options.save) {
    const outputPath = `${inputPath}.${algorithm}`;
    await fs.promises.writeFile(outputPath, `${digest}\n`);
  }
}