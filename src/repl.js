import { argParser } from './utils/argParser.js';
import * as navigation from './navigation.js';
import { csvToJson } from './commands/csvToJson.js';
import { count } from './commands/count.js';
import { hash } from './commands/hash.js';
import { hashCompare } from './commands/hashCompare.js';
import { encrypt } from './commands/encrypt.js';
import { decrypt } from './commands/decrypt.js';
import { logStats } from './commands/logStats.js';

export async function repl(currentDir, rl){
    console.log(`You are currently in ${currentDir}\n`);
    rl.prompt();
    rl.on('line', async (line) => {
        const {command, args, options} = argParser(line);
        try{
            switch (command){
            case 'up':
                currentDir = navigation.up(currentDir);
                console.log(`You are currently in ${currentDir}\n`);
                break
            case 'cd':
                currentDir = await navigation.cd(currentDir, args[0]);
                console.log(`You are currently in ${currentDir}\n`);
                break
            case 'ls':
                await navigation.ls(currentDir);
                console.log(`You are currently in ${currentDir}\n`);
                break

            case 'csv-to-json':
                await csvToJson(currentDir, args, options);
                console.log(`You are currently in ${currentDir}\n`);
                break;

            case 'count':
                await count(currentDir, args, options);
                console.log(`You are currently in ${currentDir}\n`);
                break;

            case 'hash':
                await hash(currentDir, args, options);
                console.log(`You are currently in ${currentDir}\n`);
                break;

            case 'hash-compare':
                await hashCompare(currentDir, args, options);
                console.log(`You are currently in ${currentDir}\n`);
                break;

            case 'encrypt':
                await encrypt(currentDir, args, options);
                console.log(`You are currently in ${currentDir}\n`);
                break;

            case 'decrypt':
                await decrypt(currentDir, args, options);
                console.log(`You are currently in ${currentDir}\n`);
                break;

            case 'log-stats':
                await logStats(currentDir, args, options);
                console.log(`You are currently in ${currentDir}\n`);
                break;

            case 'exit':
                rl.close();
                return;

            default:
                console.log('Invalid input\n');
            }
        }
        catch{
            console.log('Operation failed\n');
        }
        
        rl.prompt();
    });
    rl.on('SIGINT', () => {
        rl.close();
    });
    rl.on('close', () => {
        console.log('Thank you for using Data Processing CLI!\n');
        process.exit(0);
    });
}