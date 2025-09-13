import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection, addDoc, serverTimestamp,
  onSnapshot, query, orderBy, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let me = null;

const textEl = document.getElementById("postText");
const fileEl = document.getElementById("postFile");
const postBtn = document.getElementById("postBtn");
const errEl  = document.getElementById("err");
const feedEl = document.getElementById("feedList");

onAuthStateChanged(auth, (u) => {
  if (!u) { location.href = "./index.html"; return; }
  me = {
    uid: u.uid,
    email: u.email || "",
    name: u.displayName || (u.email ? u.email.split("@")[0] : "User")
  };
  bindFeed();
});

postBtn?.addEventListener("click", async () => {
  errEl.textContent = "";
  if (!me) return;
  try {
    const text = (textEl.value || "").trim();
    let mediaURL = "", mediaType = "";

    const f = fileEl.files?.[0];
    if (f) {
      const path = `post_uploads/${me.uid}/${Date.now()}_${f.name}`;
      const r = ref(storage, path);
      await uploadBytes(r, f);
      mediaURL = await getDownloadURL(r);
      mediaType = f.type || "";
    }

    if (!text && !mediaURL) {
      errEl.textContent = "Write something or choose a file.";
      return;
    }

    await addDoc(collection(db, "posts"), {
      authorUid: me.uid,
      authorEmail: me.email,
      authorName: me.name,
      text,
      mediaURL,
      mediaType,
      createdAt: serverTimestamp()
    });

    textEl.value = "";
    fileEl.value = "";
  } catch (e) {
    console.error("[post] failed:", e);
    errEl.textContent = e.message || "Failed to post";
  }
});

function bindFeed() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    renderFeed(items);
  }, (err) => {
    console.error("[feed] onSnapshot error:", err);
    errEl.textContent = err.message || "Failed to load feed";
  });
}

function renderFeed(items) {
  feedEl.innerHTML = "";
  items.forEach(post => {
    const li = document.createElement("article");
    li.className = "card";
    li.innerHTML = `
      <div class="meta">
        <div class="name">${(post.authorName || post.authorEmail || "Guest")}:</div>
        <div class="time">${post.createdAt?.toDate?.() ? post.createdAt.toDate().toLocaleString() : ""}</div>
        <div class="meta-right"></div>
      </div>
      ${post.text ? `<div class="text">${post.text}</div>` : ``}
    `;

    if (post.mediaURL) {
      if ((post.mediaType || "").startsWith("video/")) {
        const v = document.createElement("video");
        v.className = "img";
        v.src = post.mediaURL;
        v.controls = true;
        li.appendChild(v);
      } else {
        const img = document.createElement("img");
        img.className = "img";
        img.src = post.mediaURL;
        img.alt = "";
        li.appendChild(img);
      }
    }

    // delete button
    if (me && (me.uid === post.authorUid || me.email === post.authorEmail)) {
      const btn = document.createElement("button");
      btn.className = "btn-del";
      btn.textContent = "Delete";
      btn.onclick = async () => {
        try { await deleteDoc(doc(db, "posts", post.id)); }
        catch (e) { alert(e.message || "Delete failed"); }
      };
      li.querySelector(".meta-right").appendChild(btn);
    }

    feedEl.appendChild(li);
  });
}

