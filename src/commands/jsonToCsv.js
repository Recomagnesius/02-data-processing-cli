import fs from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathResolver } from '../utils/pathResolver.js';

export async function jsonToCsv(currentDir, args, options) {
  if (!options.input || !options.output) {
    throw new Error('Invalid input');
  }

  const inputPath = pathResolver(currentDir, options.input);
  const outputPath = pathResolver(currentDir, options.output);

  let jsonText = '';

  const collectJson = new Transform({
    transform(chunk, encoding, callback) {
      try {
        jsonText += chunk.toString();
        callback();
      } catch (err) {
        callback(err);
      }
    }
  });

  await pipeline(
    fs.createReadStream(inputPath),
    collectJson
  );

  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('Operation failed');
  }

  if (!Array.isArray(data)) {
    throw new Error('Operation failed');
  }

  if (data.length === 0) {
    await fs.promises.writeFile(outputPath, '');
    return;
  }

  if (typeof data[0] !== 'object' || data[0] === null || Array.isArray(data[0])) {
    throw new Error('Operation failed');
  }

  const headers = Object.keys(data[0]);

  const csvLines = [];
  csvLines.push(headers.join(','));

  for (const row of data) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('Operation failed');
    }

    const values = headers.map((header) => escapeCsvValue(row[header]));
    csvLines.push(values.join(','));
  }

  const writeCsv = new Transform({
    transform(chunk, encoding, callback) {
      callback(null, chunk);
    }
  });

  await pipeline(
    ReadableFromString(csvLines.join('\n')),
    writeCsv,
    fs.createWriteStream(outputPath)
  );
}

function escapeCsvValue(value) {
  const str = value == null ? '' : String(value);

  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

function ReadableFromString(text) {
  let sent = false;

  return new Transform({
    transform(chunk, encoding, callback) {
      callback();
    },
    read() {
      if (!sent) {
        this.push(text);
        sent = true;
      } else {
        this.push(null);
      }
    }
  });
}