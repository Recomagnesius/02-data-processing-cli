import fs from 'node:fs';
import crypto from 'node:crypto';
import { Transform, Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathResolver } from '../utils/pathResolver.js';

export async function decrypt(currentDir, args, options) {
  if (!options.input || !options.output || !options.password) {
    throw new Error('Invalid input');
  }

  const inputPath = pathResolver(currentDir, options.input);
  const outputPath = pathResolver(currentDir, options.output);

  let headerBuffer = Buffer.alloc(0);
  let tailBuffer = Buffer.alloc(0);
  let decipher = null;
  let outputStream = null;
  let initialized = false;

  const collector = new Transform({
    transform(chunk, encoding, callback) {
      try {
        if (!initialized) {
          headerBuffer = Buffer.concat([headerBuffer, chunk]);

          if (headerBuffer.length < 28) {
            return callback();
          }

          const salt = headerBuffer.subarray(0, 16);
          const iv = headerBuffer.subarray(16, 28);
          const rest = headerBuffer.subarray(28);

          const key = crypto.scryptSync(options.password, salt, 32);
          decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
          outputStream = fs.createWriteStream(outputPath);
          initialized = true;

          tailBuffer = Buffer.concat([tailBuffer, rest]);

          if (tailBuffer.length > 16) {
            const ciphertextPart = tailBuffer.subarray(0, tailBuffer.length - 16);
            tailBuffer = tailBuffer.subarray(tailBuffer.length - 16);

            const decrypted = decipher.update(ciphertextPart);
            outputStream.write(decrypted);
          }

          return callback();
        }

        tailBuffer = Buffer.concat([tailBuffer, chunk]);

        if (tailBuffer.length > 16) {
          const ciphertextPart = tailBuffer.subarray(0, tailBuffer.length - 16);
          tailBuffer = tailBuffer.subarray(tailBuffer.length - 16);

          const decrypted = decipher.update(ciphertextPart);
          outputStream.write(decrypted);
        }

        callback();
      } catch (err) {
        callback(err);
      }
    },

    flush(callback) {
      try {
        if (!initialized || tailBuffer.length < 16) {
          throw new Error('Operation failed');
        }

        const authTag = tailBuffer.subarray(tailBuffer.length - 16);
        const remainingCiphertext = tailBuffer.subarray(0, tailBuffer.length - 16);

        if (remainingCiphertext.length > 0) {
          outputStream.write(decipher.update(remainingCiphertext));
        }

        decipher.setAuthTag(authTag);
        outputStream.write(decipher.final());
        outputStream.end();

        callback();
      } catch (err) {
        callback(err);
      }
    }
  });

  await pipeline(
    fs.createReadStream(inputPath),
    collector,
    new Writable({
      write(chunk, encoding, callback) {
        callback();
      }
    })
  );
}