// intelligence.js
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection, addDoc, query, orderBy, onSnapshot,
  serverTimestamp, updateDoc, doc, getDoc, arrayUnion, arrayRemove, Timestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let me = null;

// --- Auth state ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.warn("⚠️ Not logged in — redirecting...");
    window.location.replace("./index.html");
    return;
  }
  me = user;
  console.log("✅ Intelligence loaded as", user.email);
  initPostForm();
  loadPosts();
});

// --- Upload + create post ---
function initPostForm() {
  const titleEl = document.getElementById("intelTitle");
  const descEl = document.getElementById("intelDesc");
  const fileEl = document.getElementById("intelFile");
  const postBtn = document.getElementById("postBtn");
  const intelErr = document.getElementById("intelErr");

  postBtn?.addEventListener("click", async () => {
    intelErr.textContent = "";
    try {
      if (!me) { intelErr.textContent = "Please log in first."; return; }

      const title = (titleEl.value || "").trim();
      const desc = (descEl.value || "").trim();
      const file = fileEl.files[0];

      if (!title && !desc && !file) {
        intelErr.textContent = "Write something or upload media.";
        return;
      }

      postBtn.disabled = true;
      postBtn.textContent = "Posting...";

      let mediaURL = null, mediaType = null;
      if (file) {
        mediaType = file.type.startsWith("video") ? "video" :
                    file.type.startsWith("image") ? "image" : null;
        const key = `intelligence/${me.uid}/${Date.now()}-${encodeURIComponent(file.name)}`;
        const r = ref(storage, key);
        const snap = await uploadBytes(r, file);
        mediaURL = await getDownloadURL(snap.ref);
      }

      await addDoc(collection(db, "intelligencePosts"), {
        uid: me.uid,
        author: me.email || me.uid,
        title,
        desc,
        mediaURL,
        mediaType,
        createdAt: serverTimestamp(),
        reactions: {},
        comments: []
      });

      titleEl.value = "";
      descEl.value = "";
      fileEl.value = "";
      postBtn.textContent = "Post";
    } catch (err) {
      console.error("Post error:", err);
      intelErr.textContent = err.message || "Failed to post.";
    } finally {
      postBtn.disabled = false;
      loadPosts();
    }
  });
}

// --- Load posts with live updates ---
function loadPosts() {
  const intelList = document.getElementById("intelList");
  const q = query(collection(db, "intelligencePosts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    intelList.innerHTML = "";
    snap.forEach((docSnap) => {
      intelList.appendChild(renderPost(docSnap.id, docSnap.data()));
    });
  });
}

// --- Render post (with emojis + comments) ---
function renderPost(id, p) {
  const post = document.createElement("article");
  post.className = "post-card";

  let mediaHTML = "";
  if (p.mediaType === "image" && p.mediaURL) {
    mediaHTML = `<img class="intel-media" src="${p.mediaURL}" alt="">`;
  } else if (p.mediaType === "video" && p.mediaURL) {
    mediaHTML = `<video class="intel-media" controls playsinline src="${p.mediaURL}"></video>`;
  }

  const reactions = p.reactions || {};
  const comments = p.comments || [];
  const myUid = me?.uid;

  post.innerHTML = `
    <h3 class="intel-title">${escapeHtml(p.title || "")}</h3>
    ${mediaHTML}
    <div class="intel-desc">${escapeHtml(p.desc || "")}</div>
    <small>By ${escapeHtml(p.author || "Anonymous")} • ${fmtDate(p.createdAt)}</small>
    <div class="reactions" data-id="${id}">
      ${reactBtn("heart", reactions.heart?.length || 0)}
      ${reactBtn("laugh", reactions.laugh?.length || 0)}
      ${reactBtn("shock", reactions.shock?.length || 0)}
      ${reactBtn("sad", reactions.sad?.length || 0)}
      ${reactBtn("angry", reactions.angry?.length || 0)}
    </div>
    <div class="comments">
      <div class="list">${renderComments(comments)}</div>
      ${comments.length > 3 ? `<button class="see-more" data-id="${id}">See more</button>` : ""}
      <div class="comment-row">
        <input type="text" placeholder="Write a comment…" />
        <button class="btn">Comment</button>
      </div>
    </div>
  `;

  // react handler
  post.querySelectorAll(".react").forEach(span => {
    span.addEventListener("click", async () => {
      if (!myUid) return;
      const type = span.dataset.type;
      const refDoc = doc(db, "intelligencePosts", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) return;
      const cur = snap.data().reactions || {};
      const already = cur[type]?.includes(myUid);
      if (already) {
        await updateDoc(refDoc, { [`reactions.${type}`]: arrayRemove(myUid) });
      } else {
        await updateDoc(refDoc, { [`reactions.${type}`]: arrayUnion(myUid) });
      }
    });
  });

  // comment handler
  const input = post.querySelector(".comment-row input");
  const btn = post.querySelector(".comment-row .btn");
  btn?.addEventListener("click", async () => {
    const msg = (input.value || "").trim();
    if (!msg) return;
    const refDoc = doc(db, "intelligencePosts", id);
    const newComment = { text: msg, author: me.email || me.uid, createdAt: Timestamp.now() };
    await updateDoc(refDoc, { comments: arrayUnion(newComment) });
    input.value = "";
  });

  // see more handler
  post.querySelector(".see-more")?.addEventListener("click", async (e) => {
    const refDoc = doc(db, "intelligencePosts", id);
    const snap = await getDoc(refDoc);
    const all = (snap.data()?.comments || []).slice().sort((a,b)=>ts(a)-ts(b));
    post.querySelector(".comments .list").innerHTML = renderComments(all, Infinity);
    e.currentTarget.remove();
  });

  return post;
}

/* ---------- helpers ---------- */
function reactBtn(type, count){
  const emoji = {heart:"❤️", laugh:"😂", shock:"😲", sad:"😢", angry:"😡"}[type];
  return `<span class="react" data-type="${type}">${emoji} <span class="count">${count}</span></span>`;
}

function renderComments(comments, max = 3){
  const sorted = (comments || []).slice().sort((a,b)=> ts(a)-ts(b));
  const show = max === Infinity ? sorted : sorted.slice(Math.max(0, sorted.length - max));
  return show.map(c => `<div class="comment"><strong>${escapeHtml(c.author || "User")}:</strong> ${escapeHtml(c.text || "")}</div>`).join("");
}

function fmtDate(ts){
  try{
    if (ts?.toDate) return ts.toDate().toLocaleString();
    if (ts?.seconds) return new Date(ts.seconds*1000).toLocaleString();
  }catch{}
  return "";
}

const ts = (c) => c?.createdAt?.seconds ?? 0;
const escapeHtml = (s="") => s.replace(/[&<>"']/g, m => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[m]));



