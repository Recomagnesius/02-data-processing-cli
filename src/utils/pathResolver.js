import path from 'node:path'

export  function pathResolver(currentDir, targetDir){
    return path.resolve(currentDir, targetDir);
}
