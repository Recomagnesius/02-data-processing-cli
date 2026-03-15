import fs from 'node:fs/promises'
import { pathResolver } from "./utils/pathResolver.js";
import { error } from 'node:console';

export function up(dir){
    return pathResolver(dir, '../');
}

export async function cd(dir, targetPath) {
  const nextDir = pathResolver(dir, targetPath);

  const stats = await fs.stat(nextDir);
  if (!stats.isDirectory()) {
    throw new Error('Operation failed');
  }

  return nextDir;
}

export async function ls(dir){
 const entries = await fs.readdir(dir, {withFileTypes: true});
 const folders = [];
 const files = [];
 for (const entry of entries){
    if(entry.isDirectory()){
        folders.push({name: entry.name, type: 'folder'});
    }else {
        files.push({name: entry.name, type: 'file'});
    }
    folders.sort((a,b) => a.name.localeCompare(b.name));
    files.sort((a,b) => a.name.localeCompare(b.name)); 
 }
 for (const entry of [...folders, ...files]){
    console.log(`${entry.name} [${entry.type}]`);
 }
}