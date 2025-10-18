import { auth, db, storage } from "./firebase-config.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const titleEl = document.getElementById("ebookTitle");
const summaryEl = document.getElementById("ebookSummary");
const fileEl = document.getElementById("ebookFile");
const uploadBtn = document.getElementById("uploadEbook");
const ebookList = document.getElementById("ebookList");
const errEl = document.getElementById("ebookErr");

const MAX_VIDEO_SECONDS = 180;

function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration || 0);
    };
    v.onerror = () => reject(new Error("Could not read video metadata"));
    v.src = url;
  });
}

onAuthStateChanged(auth, (user) => {
  if (!user) location.href = "./index.html";
});

uploadBtn.addEventListener("click", async () => {
  errEl.textContent = "";
  const title = titleEl.value.trim();
  const summary = summaryEl.value.trim();
  const file = fileEl.files[0];

  if (!title && !summary && !file) {
    errEl.textContent = "Add a title, text, or upload file.";
    return;
  }

  let fileUrl = null, fileType = null;
  try {
    if (file) {
      if (file.type.startsWith("video/")) {
        const dur = await getVideoDuration(file);
        if (dur > MAX_VIDEO_SECONDS) {
          errEl.textContent = "Video exceeds 3-minute limit.";
          return;
        }
        fileType = "video";
      } else if (file.type.startsWith("image/")) fileType = "image";
      else if (file.type === "application/pdf") fileType = "pdf";

      const r = ref(storage, `ebooks/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(r, file);
      fileUrl = await getDownloadURL(r);
    }

    await addDoc(collection(db, "ebooks"), {
      uid: auth.currentUser.uid,
      author: auth.currentUser.email,
      title,
      summary,
      fileUrl,
      fileType,
      createdAt: serverTimestamp()
    });

    titleEl.value = "";
    summaryEl.value = "";
    fileEl.value = "";
  } catch (err) {
    console.error(err);
    errEl.textContent = err.message;
  }
});

// Display ebooks
const q = query(collection(db, "ebooks"), orderBy("createdAt", "desc"));
onSnapshot(q, (snap) => {
  ebookList.innerHTML = "";
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const card = document.createElement("div");
    card.className = "ebook-card";

    let mediaHTML = "";
    if (d.fileType === "image") {
      mediaHTML = `<img src="${d.fileUrl}" alt="ebook image"/>`;
    } else if (d.fileType === "video") {
      mediaHTML = `<video controls src="${d.fileUrl}"></video>`;
    } else if (d.fileType === "pdf") {
      mediaHTML = `<iframe src="${d.fileUrl}" type="application/pdf"></iframe>`;
    }

    card.innerHTML = `
      <h3>${d.title || "Untitled"}</h3>
      ${mediaHTML}
      <p>${d.summary || ""}</p>
      <p style="font-size:13px;color:#9ca3af;">By <a href="profile.html?uid=${d.uid}">${d.author}</a></p>
    `;
    ebookList.appendChild(card);
  });
});
