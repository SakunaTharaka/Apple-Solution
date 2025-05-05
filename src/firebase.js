// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore"; // ✅ Add this line

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBT8NK2fAfR0buXq1D2mLDAPhSo98by5yE",
  authDomain: "shop-management-system-f5e35.firebaseapp.com",
  projectId: "shop-management-system-f5e35",
  storageBucket: "shop-management-system-f5e35.firebasestorage.app",
  messagingSenderId: "30049778982",
  appId: "1:30049778982:web:94788cbb2f3f73640e95e7",
  measurementId: "G-E8WC0YM9CD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// ✅ Initialize Firestore and export it
const db = getFirestore(app);
export { db };
