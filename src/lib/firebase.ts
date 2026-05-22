import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// @ts-ignore
import config from '../../firebase-applet-config.json';

const isConfigured = Object.keys(config).length > 0;

export const app = isConfigured && !getApps().length ? initializeApp(config) : (isConfigured ? getApp() : null);

export const db = app ? getFirestore(app, (config as any).firestoreDatabaseId) : null;
export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;

if (db && typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
    } else if (err.code === 'unimplemented') {
      console.warn("The current browser does not support all of the features required to enable persistence.");
    }
  });
}
