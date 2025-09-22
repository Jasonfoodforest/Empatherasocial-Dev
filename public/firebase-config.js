// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// 🔑 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCegX-9F8lvrBr85U8-9kva0_P8o2Ik81A",
  authDomain: "empatherasocial-dev.firebaseapp.com",
  projectId: "empatherasocial-dev",
  storageBucket: "empatherasocial-dev.firebasestorage.app", // ✅ fixed bucket
  messagingSenderId: "890072969016",
  appId: "1:890072969016:web:27640b219e0564331c5bcd",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services so other scripts can import them
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
