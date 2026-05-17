import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function testREST() {
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/furniture_sets/test1234`;
  console.log("Fetching URL:", url);
  
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { name: { stringValue: 'Test' } } })
  });
  
  console.log("Status:", res.status);
  console.log("Response:", await res.json());
}

testREST();
