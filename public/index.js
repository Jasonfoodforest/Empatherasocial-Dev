import { auth } from "./firebase-config.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Elements
const signupForm = document.getElementById("signupForm");
const loginForm = document.getElementById("loginForm");
const googleLogin = document.getElementById("googleLogin");
const guestLogin = document.getElementById("guestLogin");
const logoutBtn  = document.getElementById("btnLogout");

// --- Sign Up ---
signupForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signupEmail").value;
  const pass  = document.getElementById("signupPassword").value;
  try {
    await createUserWithEmailAndPassword(auth, email, pass);
    window.location.href = "./feed.html";
  } catch (err) {
    alert("Signup failed: " + err.message);
  }
});

// --- Login ---
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const pass  = document.getElementById("loginPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
    window.location.href = "./feed.html";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// --- Google Login ---
googleLogin?.addEventListener("click", async () => {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    window.location.href = "./feed.html";
  } catch (err) {
    alert("Google login failed: " + err.message);
  }
});

// --- Guest Login ---
guestLogin?.addEventListener("click", async () => {
  try {
    await signInAnonymously(auth);
    window.location.href = "./feed.html";
  } catch (err) {
    alert("Guest login failed: " + err.message);
  }
});

// --- Logout ---
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.href = "./index.html";
  } catch (err) {
    alert("Logout failed: " + err.message);
  }
});

// --- Show/Hide logout button depending on auth state ---
onAuthStateChanged(auth, (user) => {
  if (logoutBtn) {
    logoutBtn.style.display = user ? "inline-block" : "none";
  }
});
