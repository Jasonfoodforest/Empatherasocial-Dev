import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCegX-9F8lvrBr85U8-9kva0_P8o2Ik81A",
  authDomain: "empatherasocial-dev.firebaseapp.com",
  databaseURL: "https://empatherasocial-dev-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "empatherasocial-dev",
  storageBucket: "empatherasocial-dev.firebasestorage.app",
  messagingSenderId: "890072969016",
  appId: "1:890072969016:web:27640b219e0564331c5bcd",
  measurementId: "G-TDKPK1GP8W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };