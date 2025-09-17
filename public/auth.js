// Auth logic for EmpathEra Social

// Firebase configuration
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

const el = (id) => document.getElementById(id);
const inEmail = el("inEmail");
const inPass = el("inPass");
const btnSignIn = el("btnSignIn");
const btnCreate = el("btnCreate");
const btnGoogle = el("btnGoogle");
const btnFacebook = el("btnFacebook");
const errEl = el("err");
el("yr").textContent = new Date().getFullYear();

function showErr(e) {
  console.error(e);
  const msg = e?.message || String(e) || "Something went wrong.";
  errEl.textContent = msg.replace("Firebase: ", "");
  setTimeout(() => errEl.textContent = "", 6000);
}

function goHome() {
  window.location.replace("./feed.html");
}

// Monitor auth state changes
firebase.auth().onAuthStateChanged((u) => {
  if (u) goHome();
});

// Sign in with email/password
btnSignIn.onclick = async () => {
  try {
    await firebase.auth().signInWithEmailAndPassword(inEmail.value, inPass.value);
    goHome();
  } catch (e) {
    showErr(e);
  }
};

// Create new account
btnCreate.onclick = async () => {
  try {
    await firebase.auth().createUserWithEmailAndPassword(inEmail.value, inPass.value);
    goHome();
  } catch (e) {
    showErr(e);
  }
};

// Google sign-in
btnGoogle.onclick = async () => {
  try {
    await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    goHome();
  } catch (e) {
    showErr(e);
  }
};

// Facebook sign-in
btnFacebook.onclick = async () => {
  try {
    await firebase.auth().signInWithPopup(new firebase.auth.FacebookAuthProvider());
    goHome();
  } catch (e) {
    showErr(e);
  }
};