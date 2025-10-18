// auth.js
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

// Grab elements
const emailEl = document.getElementById("inEmail");
const passEl = document.getElementById("inPass");
const errEl   = document.getElementById("err");
const btnSignIn  = document.getElementById("btnSignIn");
const btnCreate  = document.getElementById("btnCreate");
const btnAnon    = document.getElementById("btnAnon");
const btnGoogle  = document.getElementById("btnGoogle");

// --- Sign In with Email/Password ---
if (btnSignIn) {
  btnSignIn.onclick = async () => {
    errEl.textContent = "";
    try {
      await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
      location.href = "./feed.html";
    } catch (e) {
      console.error(e);
      errEl.textContent = e.message || "Sign in failed";
    }
  };
}

// --- Create Account with Email/Password ---
if (btnCreate) {
  btnCreate.onclick = async () => {
    errEl.textContent = "";
    try {
      await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
      location.href = "./feed.html";
    } catch (e) {
      console.error(e);
      errEl.textContent = e.message || "Account creation failed";
    }
  };
}

// --- Sign in as Guest ---
if (btnAnon) {
  btnAnon.onclick = async () => {
    errEl.textContent = "";
    try {
      await signInAnonymously(auth);
      location.href = "./feed.html";
    } catch (e) {
      console.error(e);
      errEl.textContent = e.message || "Guest sign-in failed";
    }
  };
}

// --- Google Sign-In ---
if (btnGoogle) {
  btnGoogle.onclick = async () => {
    errEl.textContent = "";
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      location.href = "./feed.html";
    } catch (e) {
      console.error(e);
      errEl.textContent = e.message || "Google sign-in failed";
    }
  };
}

