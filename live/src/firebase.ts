import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// ─────────────────────────────────────────────────────────────
// TODO: Replace every placeholder below with your Firebase
// project's actual config values.
//
// Where to find them:
//   Firebase Console → Project Settings → General
//   → Your apps → SDK setup and configuration → Config
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            'YOUR_API_KEY',
  authDomain:        'YOUR_PROJECT_ID.firebaseapp.com',
  databaseURL:       'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com',
  projectId:         'YOUR_PROJECT_ID',
  storageBucket:     'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId:             'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
