import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD1QDCwWWTKxoDi4b3BWT3Vjs3wWihMi7U",
  authDomain: "gold-bike.firebaseapp.com",
  projectId: "gold-bike",
  storageBucket: "gold-bike.firebasestorage.app",
  messagingSenderId: "770142622142",
  appId: "1:770142622142:web:d13681b69ca30f9ed569ef"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);