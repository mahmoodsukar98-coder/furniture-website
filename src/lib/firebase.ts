import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// @ts-ignore
import config from '../../firebase-applet-config.json';

const isConfigured = Object.keys(config).length > 0;

export const app = isConfigured && !getApps().length ? initializeApp(config) : (isConfigured ? getApp() : null);
export const db = app ? getFirestore(app, (config as any).firestoreDatabaseId) : null;
export const auth = app ? getAuth(app) : null;
export const storage = app ? getStorage(app) : null;
