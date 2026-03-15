import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { pathResolver } from '../utils/pathResolver.js';

export async function logStats(currentDir, args, options) {
  if (!options.input || !options.output) {
    throw new Error('Invalid input');
  }

  const inputPath = pathResolver(currentDir, options.input);
  const outputPath = pathResolver(currentDir, options.output);

  const stat = await fs.stat(inputPath);
  const fileSize = stat.size;

  const cpuCount = os.cpus().length;
  const chunkSize = Math.ceil(fileSize / cpuCount);

  const boundaries = await buildChunkBoundaries(inputPath, fileSize, chunkSize);

  const workerPath = new URL('../workers/logWorker.js', import.meta.url);

  const workerPromises = boundaries.map(({ start, end }) => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerPath, {
        workerData: {
          inputPath,
          start,
          end,
        },
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  });

  const partialResults = await Promise.all(workerPromises);
  const merged = mergeResults(partialResults);

  const topPaths = Object.entries(merged.paths)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const finalResult = {
    total: merged.total,
    levels: merged.levels,
    status: merged.status,
    topPaths,
    avgResponseTimeMs: merged.total === 0
      ? 0
      : Number((merged.responseTimeSum / merged.total).toFixed(2)),
  };

  await fs.writeFile(outputPath, JSON.stringify(finalResult, null, 2));
}

async function buildChunkBoundaries(inputPath, fileSize, chunkSize) {
  const handle = await fs.open(inputPath, 'r');

  try {
    const starts = [0];

    for (let i = 1; i < Math.ceil(fileSize / chunkSize); i++) {
      const roughStart = i * chunkSize;
      const adjustedStart = await findNextLineStart(handle, roughStart, fileSize);
      if (adjustedStart < fileSize) {
        starts.push(adjustedStart);
      }
    }

    const uniqueStarts = [...new Set(starts)].sort((a, b) => a - b);

    const boundaries = [];
    for (let i = 0; i < uniqueStarts.length; i++) {
      const start = uniqueStarts[i];
      const end = i + 1 < uniqueStarts.length
        ? uniqueStarts[i + 1] - 1
        : fileSize - 1;

      if (start <= end) {
        boundaries.push({ start, end });
      }
    }

    return boundaries;
  } finally {
    await handle.close();
  }
}

async function findNextLineStart(handle, position, fileSize) {
  if (position >= fileSize) {
    return fileSize;
  }

  const buffer = Buffer.alloc(1024);
  let currentPos = position;

  while (currentPos < fileSize) {
    const { bytesRead } = await handle.read(
      buffer,
      0,
      buffer.length,
      currentPos
    );

    if (bytesRead === 0) {
      return fileSize;
    }

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 10) {
        return currentPos + i + 1;
      }
    }

    currentPos += bytesRead;
  }

  return fileSize;
}

function mergeResults(results) {
  const merged = {
    total: 0,
    levels: {},
    status: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 },
    paths: {},
    responseTimeSum: 0,
  };

  for (const result of results) {
    merged.total += result.total;
    merged.responseTimeSum += result.responseTimeSum;

    for (const [level, count] of Object.entries(result.levels)) {
      merged.levels[level] = (merged.levels[level] || 0) + count;
    }

    for (const [statusClass, count] of Object.entries(result.status)) {
      merged.status[statusClass] = (merged.status[statusClass] || 0) + count;
    }

    for (const [path, count] of Object.entries(result.paths)) {
      merged.paths[path] = (merged.paths[path] || 0) + count;
    }
  }

  return merged;
}