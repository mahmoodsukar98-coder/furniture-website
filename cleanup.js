import 'dotenv/config';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

// Read from config file directly since this is a node script
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

const app = initializeApp(config);
const db = getFirestore(app);

const cleanUp = async () => {
    const snap = await getDocs(collection(db, 'furniture_sets'));
    let deleted = 0;
    for (const d of snap.docs) {
        const data = d.data();
        if (data.price === 'تواصل معنا' || data.price.includes('يرجى التواصل لمعرفة السعر')) {
           await deleteDoc(doc(db, 'furniture_sets', d.id));
           deleted++;
        }
    }
    console.log('Deleted: ', deleted);
}

cleanUp();
