import fs from 'fs';
import path from 'path';

function readDirRecursively(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file.startsWith('.')) continue;
    
    // Log the actual filename and its hex representation to debug encoding
    console.log(`File: ${file} | Hex: ${Buffer.from(file).toString('hex')}`);
    
    const fullPath = path.join(dir, file);
    try {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
         console.log(`[DIR] ${fullPath}`);
         readDirRecursively(fullPath);
      } else {
         console.log(`[FILE] ${fullPath}`);
      }
    } catch (e) {
      console.log(`Error reading ${fullPath}:`, e);
    }
  }
}

readDirRecursively(process.cwd());
