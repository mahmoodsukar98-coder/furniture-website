import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const cleanUp = async () => {
    const snap = await getDocs(collection(db, 'furniture_sets'));
    const seenNames = new Set();
    let deleted = 0;
    
    for (const d of snap.docs) {
        const data = d.data();
        const docId = d.id;
        
        // delete if empty or missing important fields or missing images
        if (!data.name || data.name.trim() === '' || data.price.includes('تواصل')) {
           console.log('Deleting because invalid/no price:', data.name);
           await deleteDoc(doc(db, 'furniture_sets', docId));
           deleted++;
           continue;
        }

        if (!data.images || data.images.length === 0) {
           console.log('Deleting because no images:', data.name);
           await deleteDoc(doc(db, 'furniture_sets', docId));
           deleted++;
           continue;
        }

        if (seenNames.has(data.name)) {
           console.log('Deleting duplicate:', data.name);
           await deleteDoc(doc(db, 'furniture_sets', docId));
           deleted++;
        } else {
           seenNames.add(data.name);
        }
    }
    console.log('Deleted total:', deleted);
    process.exit(0);
}

cleanUp().catch(e => {
    console.error(e);
    process.exit(1);
});
