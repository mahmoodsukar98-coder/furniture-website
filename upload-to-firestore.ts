import mammoth from 'mammoth';
import path from 'path';
import fs from 'fs';

async function buildCatalogJson() {
  const catalogDir = path.join(process.cwd(), 'public', 'catalog');
  const dirs = fs.readdirSync(catalogDir);
  
  const furnitureSets = [];
  
  for (const dirName of dirs) {
    const fullDirPath = path.join(catalogDir, dirName);
    if (!fs.statSync(fullDirPath).isDirectory()) continue;
    
    let displayName = Buffer.from(dirName, 'latin1').toString('utf8');
    
    let docText = '';
    const images: string[] = [];
    const videos: string[] = [];
    
    const files = fs.readdirSync(fullDirPath);
    for (const f of files) {
      const filePath = path.join(fullDirPath, f);
      
      if (f.endsWith('.docx')) {
        try {
          const result = await mammoth.extractRawText({ path: filePath });
          docText = result.value;
        } catch (e:any) {}
      } else if (f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png')) {
        images.push(`/catalog/${dirName}/${f}`);
      } else if (f.endsWith('.mp4') || f.endsWith('.mov')) {
        videos.push(`/catalog/${dirName}/${f}`);
      }
    }
    
    const lines = docText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let price = 'يرجى التواصل لمعرفة السعر';
    const descriptionLines: string[] = [];
    
    for (const line of lines) {
      if (line.includes('السعر')) {
        price = line.replace('السعر :', '').replace('السعر:', '').replace('السعر', '').trim();
      } else {
        descriptionLines.push(line);
      }
    }
    
    if (descriptionLines.length > 0 && !descriptionLines[0].includes('مقاس') && !descriptionLines[0].match(/[0-9]/)) {
      displayName = descriptionLines[0]; 
      descriptionLines.shift(); 
    } else if (displayName.includes('Ø')) {
      displayName = Buffer.from(dirName, 'latin1').toString('utf8');
    }

    furnitureSets.push({
      id: Math.random().toString(36).substring(2, 10),
      name: displayName || dirName,
      price: price.substring(0, 100),
      description: descriptionLines.slice(0, 50),
      images: images.slice(0, 20),
      videos: videos.slice(0, 10),
      createdAt: Date.now()
    });
  }
  
  fs.mkdirSync(path.join(process.cwd(), 'src', 'data'), { recursive: true });
  fs.writeFileSync(path.join(process.cwd(), 'src', 'data', 'catalog.json'), JSON.stringify(furnitureSets, null, 2));
  console.log("Successfully generated src/data/catalog.json");
}

buildCatalogJson().then(() => {
   process.exit(0);
}).catch(console.error);
