import readline from 'node:readline';
import {stdin, stdout} from 'node:process';
import { argParser } from './utils/argParser.js';
import os from 'os';

export const main = () => {
    const currentDir = os.homedir();
    const rl = readline.createInterface(
        {
            input: stdin,
            output: stdout,
        }
    );
    rl.setPrompt('> ');  
    console.log(`Welcome to Data Processing CLI!\n`);
    console.log(`You are currently in ${currentDir}\n`);
    rl.prompt();
    rl.on('line', (line) => {
        const {command, args, options} = argParser(line);
        
        switch (command){
            case 'asd':
                break
            default:
                console.log('The following command doesnt exist, please try again\n');
                break;
        }
        console.log(`You are currently in ${currentDir}`);
        rl.prompt();
    });
    rl.on('SIGINT', () => {
        console.log('Thank you for using Data Processing CLI!');
        rl.exit();
    });
    rl.on('close', () => {
        console.log('Thank you for using Data Processing CLI!');
        rl.exit();
    });
}



main();