import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            'AIzaSyCdg3mZSU6Laa8pfNWEDlgC92kCUDoIf6Q',
  authDomain:        'literacyspin.firebaseapp.com',
  databaseURL:       'https://literacyspin-default-rtdb.europe-west1.firebasedatabase.app',
  projectId:         'literacyspin',
  storageBucket:     'literacyspin.firebasestorage.app',
  messagingSenderId: '886367433328',
  appId:             '1:886367433328:web:d8a1c72d4337d4e06c3ab5',
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
