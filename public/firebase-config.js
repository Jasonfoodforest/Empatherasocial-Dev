import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// --- Boreal Array 457400-H5 (production) ---
const firebaseConfig = {
  apiKey: "AIzaSyAKK846o1Zsw25BE6XeqZjOk8TQCIC8eZc",
  authDomain: "boreal-array-457400-h5.firebaseapp.com",
  databaseURL: "https://boreal-array-457400-h5-default-rtdb.firebaseio.com",
  projectId: "boreal-array-457400-h5",
  storageBucket: "boreal-array-457400-h5.firebasestorage.app", // ✅ Correct domain
  messagingSenderId: "571965849307",
  appId: "1:571965849307:web:e22400b1f3b9115504d6fe",
  measurementId: "G-4LTLT4SJS3"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);








