import fs from 'node:fs';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { pathResolver } from '../utils/pathResolver.js';

export async function csvToJson(currentDir, args, options) {
    if (!options.input || !options.output) {
        throw new Error('Invalid input');
    }

    const inputPath = pathResolver(currentDir, options.input);
    const outputPath = pathResolver(currentDir, options.output);

    let headers = null;
    let leftover = '';
    let isFirstObject = true;

    const csvToJsonTransform = new Transform({
        transform(chunk, encoding, callback) {
            try {
                const data = leftover + chunk.toString();
                const lines = data.split('\n');
                leftover = lines.pop();

                let output = '';

                for (let line of lines) {
                    line = line.trim();
                    if (!line) continue;

                    if (!headers) {
                        headers = line.split(',').map(h => h.trim());
                        output += '[\n';
                        continue;
                    }

                    const values = line.split(',').map(v => v.trim());
                    const obj = {};

                    for (let i = 0; i < headers.length; i++) {
                        obj[headers[i]] = values[i] ?? '';
                    }

                    if (!isFirstObject) {
                        output += ',\n';
                    }

                    output += `  ${JSON.stringify(obj)}`;
                    isFirstObject = false;
                }

                callback(null, output);
            } catch (err) {
                callback(err);
            }
        },

        flush(callback) {
            try {
                let output = '';

                if (leftover.trim()) {
                    const line = leftover.trim();

                    if (!headers) {
                        headers = line.split(',').map(h => h.trim());
                        output += '[\n';
                    } else {
                        const values = line.split(',').map(v => v.trim());
                        const obj = {};

                        for (let i = 0; i < headers.length; i++) {
                            obj[headers[i]] = values[i] ?? '';
                        }

                        if (!isFirstObject) {
                            output += ',\n';
                        }

                        output += `  ${JSON.stringify(obj)}`;
                        isFirstObject = false;
                    }
                }

                if (!headers) {
                    output += '[]';
                } else {
                    output += '\n]';
                }

                callback(null, output);
            } catch (err) {
                callback(err);
            }
        }
    });

    await pipeline(
        fs.createReadStream(inputPath),
        csvToJsonTransform,
        fs.createWriteStream(outputPath)
    );
}