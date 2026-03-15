import fs from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathResolver } from '../utils/pathResolver.js';

export async function count(currentDir, args, options) {
  if (!options.input) {
    throw new Error('Invalid input');
  }

  const inputPath = pathResolver(currentDir, options.input);

  let lines = 0;
  let words = 0;
  let characters = 0;
  let leftover = '';

  const counter = new Transform({
    transform(chunk, encoding, callback) {
      try {
        const text = chunk.toString();
        characters += text.length;

        const combined = leftover + text;
        const parts = combined.split(/\r?\n/);

        leftover = parts.pop();

        lines += parts.length;

        for (const part of parts) {
          const matches = part.match(/\S+/g);
          if (matches) words += matches.length;
        }

        callback(null, chunk);
      } catch (err) {
        callback(err);
      }
    },

    flush(callback) {
      try {
        if (leftover.length > 0) {
          lines += 1;
          const matches = leftover.match(/\S+/g);
          if (matches) words += matches.length;
        }

        callback();
      } catch (err) {
        callback(err);
      }
    }
  });

  const sink = new Transform({
    transform(chunk, encoding, callback) {
      callback();
    }
  });

  await pipeline(
    fs.createReadStream(inputPath),
    counter,
    sink
  );

  console.log(`Lines: ${lines}`);
  console.log(`Words: ${words}`);
  console.log(`Characters: ${characters}`);
}