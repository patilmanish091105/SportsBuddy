

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyCbIIwInMaDdbsDO6A5X2a4aD8ST6TM18k",
  authDomain: "sportsbuddy-d3800.firebaseapp.com",
  projectId: "sportsbuddy-d3800",
  storageBucket: "sportsbuddy-d3800.firebasestorage.app",
  messagingSenderId: "600101484400",
  appId: "1:600101484400:web:183690837b3e8f0f5e81b5"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

console.log('🔥 Firebase initialized successfully');

export { auth, db };