import readline from 'node:readline';
import {stdin, stdout} from 'node:process';

import os from 'os';
import { repl } from './repl.js';

export const main = () => {
    let currentDir = os.homedir();
    const rl = readline.createInterface(
        {
            input: stdin,
            output: stdout,
            prompt: '> '
        }
    );
    console.log(`Welcome to Data Processing CLI!\n`);
    repl(currentDir, rl);
}



main();