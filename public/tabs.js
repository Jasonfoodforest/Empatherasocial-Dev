// tabs.js
import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

const nav = document.createElement("header");
nav.innerHTML = `
  <style>
    header{display:flex;align-items:center;gap:16px;padding:10px 16px;background:#0f2021;color:#e6f3fb;position:sticky;top:0;z-index:30}
    .tabs{display:flex;gap:20px;font-weight:600}
    .tabs a{color:#78e2ff;text-decoration:none}
    .right{margin-left:auto;display:flex;align-items:center;gap:12px}
    #logoutBtn{background:#19c37d;border:none;color:#081a14;padding:6px 12px;border-radius:10px;font-weight:700;cursor:pointer}
  </style>
  <nav class="tabs">
    <a href="./feed.html">Feed</a>
    <a href="./explore.html">Explore</a>
    <a href="./intelligence.html">Intelligence</a>
    <a href="./shopping.html">Shopping</a>
    <a href="./messages.html">Message</a>
    <a href="./group.html">Group</a>
    <a href="./ebooks.html">Ebooks</a>
    <a href="./profile.html">Profile</a>
  </nav>
  <div class="right">
    <span id="userName"></span>
    <button id="logoutBtn">Logout</button>
  </div>
`;
document.body.prepend(nav);

const userNameEl = document.getElementById("userName");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (u) => {
  if (!u) {
    // kick to sign-in if needed
    if (!location.pathname.endsWith("/index.html")) location.href = "./index.html";
    return;
  }
  userNameEl.textContent = u.displayName || u.email || "Signed in";
});

logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    location.href = "./index.html";
  } catch (e) {
    alert(e?.message || "Logout failed");
  }
});

