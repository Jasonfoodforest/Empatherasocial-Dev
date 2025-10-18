import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const logoutEl = document.getElementById("btnLogout");
const aiStatus = document.getElementById("aiStatus");

let me = null;

// Watch auth state but don't redirect (auth-guard.js handles that)
onAuthStateChanged(auth, (user) => {
  if (!user) return;
  me = user;
  aiStatus.textContent = `Logged in as ${me.email || me.uid}`;
});

logoutEl?.addEventListener("click", async (e) => {
  e.preventDefault();
  await signOut(auth);
  window.location.href = "./index.html";
});

