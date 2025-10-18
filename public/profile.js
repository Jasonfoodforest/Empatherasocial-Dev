import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const displayNameEl = document.getElementById("displayName");
const locationEl = document.getElementById("location");
const picUploadEl = document.getElementById("picUpload");
const profilePicEl = document.getElementById("profilePic");
const saveBtn = document.getElementById("saveProfile");

let currentUser = null;
let viewingUid = null;
let photoURL = null;

// Get uid from URL if available
const urlParams = new URLSearchParams(window.location.search);
const uidFromUrl = urlParams.get("uid");

// 🔹 Load profile when user logs in
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "./index.html";
    return;
  }
  currentUser = user;
  viewingUid = uidFromUrl || user.uid;

  // get profile from Firestore
  const snap = await getDoc(doc(db, "profiles", viewingUid));
  if (snap.exists()) {
    const data = snap.data();
    displayNameEl.value = data.displayName || "";
    locationEl.value = data.location || "";
    profilePicEl.src = data.photoURL || "default-avatar.png";

    // restore languages
    if (Array.isArray(data.languages)) {
      data.languages.forEach(lang => {
        const cb = document.querySelector(`input[name="languages"][value="${lang}"]`);
        if (cb) cb.checked = true;
      });
    }

    // restore interests
    if (Array.isArray(data.interests)) {
      data.interests.forEach(int => {
        const cb = document.querySelector(`input[name="interests"][value="${int}"]`);
        if (cb) cb.checked = true;
      });
    }
  }

  // 🔹 Hide editing tools if viewing someone else's profile
  if (viewingUid !== currentUser.uid) {
    displayNameEl.disabled = true;
    locationEl.disabled = true;
    picUploadEl.style.display = "none";
    saveBtn.style.display = "none";
  }
});

// 🔹 Upload new profile pic
picUploadEl?.addEventListener("change", async () => {
  if (!currentUser || viewingUid !== currentUser.uid || !picUploadEl.files[0]) return;
  const file = picUploadEl.files[0];
  const fileRef = ref(storage, `profilePics/${currentUser.uid}/${file.name}`);
  await uploadBytes(fileRef, file);
  photoURL = await getDownloadURL(fileRef);
  profilePicEl.src = photoURL;
});

// 🔹 Save profile
saveBtn?.addEventListener("click", async () => {
  if (!currentUser || viewingUid !== currentUser.uid) return;

  const langs = Array.from(document.querySelectorAll("input[name='languages']:checked"))
    .map(cb => cb.value);

  const interests = Array.from(document.querySelectorAll("input[name='interests']:checked"))
    .map(cb => cb.value);

  const profileData = {
    displayName: displayNameEl.value,
    location: locationEl.value,
    photoURL: photoURL || profilePicEl.src,
    languages: langs,
    interests: interests
  };

  try {
    await setDoc(doc(db, "profiles", currentUser.uid), profileData, { merge: true });
    alert("Profile saved!");
  } catch (err) {
    console.error("Error saving profile:", err);
    alert("Error: " + err.message);
  }
});
