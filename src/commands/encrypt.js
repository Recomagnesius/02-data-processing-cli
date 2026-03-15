import fs from 'node:fs';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { pathResolver } from '../utils/pathResolver.js';

export async function encrypt(currentDir, args, options) {
  if (!options.input || !options.output || !options.password) {
    throw new Error('Invalid input');
  }

  const inputPath = pathResolver(currentDir, options.input);
  const outputPath = pathResolver(currentDir, options.output);

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(options.password, salt, 32);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let headerWritten = false;

  const prependHeader = new Transform({
    transform(chunk, encoding, callback) {
      try {
        const encrypted = cipher.update(chunk);
        if (!headerWritten) {
          headerWritten = true;
          callback(null, Buffer.concat([salt, iv, encrypted]));
        } else {
          callback(null, encrypted);
        }
      } catch (err) {
        callback(err);
      }
    },

    flush(callback) {
      try {
        const finalChunk = cipher.final();
        const authTag = cipher.getAuthTag();
        callback(null, Buffer.concat([finalChunk, authTag]));
      } catch (err) {
        callback(err);
      }
    }
  });

  await pipeline(
    fs.createReadStream(inputPath),
    prependHeader,
    fs.createWriteStream(outputPath)
  );
}