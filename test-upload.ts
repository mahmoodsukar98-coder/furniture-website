import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  console.log("Starting script with exact config...");
  const setRef = doc(collection(db, 'furniture_sets'), 'test1234');
  console.log("Set reference created. Uploading...");
  try {
     const t = setTimeout(() => { console.log('TIMEOUT TRIGGERED'); process.exit(1); }, 10000);
     await setDoc(setRef, {
        name: 'Test',
        price: '100',
        description: [],
        images: [],
        videos: [],
        createdAt: Date.now()
     });
     clearTimeout(t);
     console.log("Success!");
  } catch (e:any) {
     console.log("Error:", e);
  }
}

run().then(() => {
  console.log("Done");
  process.exit(0);
});
