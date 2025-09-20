// auth.js
import { auth } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const emailEl = document.getElementById("inEmail");
const passEl = document.getElementById("inPass");
const errEl = document.getElementById("err");

document.getElementById("btnSignIn").onclick = async () => {
  errEl.textContent = "";
  try {
    await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
    location.href = "./feed.html";
  } catch (e) {
    console.error(e);
    errEl.textContent = e.message || "Sign in failed";
  }
};

document.getElementById("btnCreate").onclick = async () => {
  errEl.textContent = "";
  try {
    await createUserWithEmailAndPassword(auth, emailEl.value, passEl.value);
    location.href = "./feed.html";
  } catch (e) {
    console.error(e);
    errEl.textContent = e.message || "Account creation failed";
  }
};

document.getElementById("btnAnon").onclick = async () => {
  errEl.textContent = "";
  try {
    await signInAnonymously(auth);
    location.href = "./feed.html";
  } catch (e) {
    console.error(e);
    errEl.textContent = e.message || "Guest sign-in failed";
  }
};

document.getElementById("btnGoogle").onclick = async () => {
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
