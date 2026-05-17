import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';

async function testExtract() {
  const catalogDir = path.join(process.cwd(), 'public', 'catalog');
  const dirs = fs.readdirSync(catalogDir);
  for (const dirName of dirs) {
    const fullDirPath = path.join(catalogDir, dirName);
    if (!fs.statSync(fullDirPath).isDirectory()) continue;
    
    console.log(`\n--- Set: ${dirName} ---`);
    const files = fs.readdirSync(fullDirPath);
    for (const f of files) {
      if (f.endsWith('.docx')) {
        const docPath = path.join(fullDirPath, f);
        try {
          const result = await mammoth.extractRawText({ path: docPath });
          console.log(result.value);
        } catch (e:any) {
          console.error(`Failed: ${e.message}`);
        }
      }
    }
  }
}

testExtract();
