// firebase-config.js

// Your Firebase config object from Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyCegX-9F8lvrBr85U8-9kva0_P8o2Ik81A",
  authDomain: "empatherasocial-dev.firebaseapp.com",
  projectId: "empatherasocial-dev",
  storageBucket: "empatherasocial-dev.firebasestorage.app",
  messagingSenderId: "890072969016",
  appId: "1:890072969016:web:27640b219e0564331c5bcd"
};

// Initialize Firebase only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Expose commonly used services
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();