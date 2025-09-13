// profile.js
import app, { auth, db, storage } from "./firebase-config.js";
import {
  onAuthStateChanged, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref as sRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const ui = {
  email: document.getElementById("email"),
  displayName: document.getElementById("displayName"),
  avatar: document.getElementById("avatar"),
  file: document.getElementById("file"),
  save: document.getElementById("saveBtn"),
  logout: document.getElementById("logoutBtn"),
  err: document.getElementById("err"),
};

let me = null;

onAuthStateChanged(auth, async (u) => {
  if (!u) { location.href = "./index.html"; return; }
  me = u;

  ui.email.value = u.email || "";
  ui.displayName.value = u.displayName || (u.email ? u.email.split("@")[0] : "User");
  if (u.photoURL) ui.avatar.src = u.photoURL;

  // Ensure a /users/{uid} doc exists and load photo/name if present
  const uref = doc(db, "users", u.uid);
  const snap = await getDoc(uref);
  if (snap.exists()) {
    const d = snap.data();
    if (d.displayName && !u.displayName) ui.displayName.value = d.displayName;
    if (d.photoURL) ui.avatar.src = d.photoURL;
  } else {
    await setDoc(uref, {
      email: u.email || "",
      displayName: ui.displayName.value,
      photoURL: u.photoURL || "",
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
});

ui.save.onclick = async () => {
  ui.err.textContent = "";
  if (!me) return;

  try {
    // 1) Upload avatar if provided
    let photoURL = me.photoURL || "";
    const f = ui.file.files?.[0];
    if (f) {
      const path = `avatars/${me.uid}/avatar.jpg`;
      const r = sRef(storage, path);
      await uploadBytes(r, f);
      photoURL = await getDownloadURL(r);
      ui.avatar.src = photoURL;
    }

    // 2) Update Auth profile (name/photo)
    const newName = (ui.displayName.value || "").trim() || (me.email?.split("@")[0] ?? "User");
    await updateProfile(me, { displayName: newName, photoURL });

    // 3) Update Firestore /users/{uid}
    await setDoc(doc(db, "users", me.uid), {
      email: me.email || "",
      displayName: newName,
      photoURL,
      updatedAt: serverTimestamp()
    }, { merge: true });

    alert("Saved!");
  } catch (e) {
    console.error(e);
    ui.err.textContent = e.message || "Save failed";
  }
};

