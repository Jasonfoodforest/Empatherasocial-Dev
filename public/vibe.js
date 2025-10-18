// vibe.js
import { auth, db } from "./firebase-config.js";
import {
  collection, query, orderBy, onSnapshot, doc,
  updateDoc, getDoc, arrayUnion, arrayRemove,
  Timestamp, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

let me = null;

// --- Auth check ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.warn("⚠️ No user signed in, redirecting...");
    window.location.replace("./index.html");
    return;
  }
  me = user;
  console.log("✅ Vibe tab loaded as", user.email);
  startVibe();
});

// --- Load posts ---
function startVibe() {
  const vibeEl = document.getElementById("vibeList");
  if (!vibeEl) return;

  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
  onSnapshot(q, (snap) => {
    vibeEl.innerHTML = "";
    snap.forEach((docSnap) => {
      vibeEl.appendChild(renderPost(docSnap.id, docSnap.data()));
    });
  });
}

// --- Render post ---
function renderPost(id, data) {
  let { author, uid, text, mediaURL, mediaType, createdAt,
        reactions = {}, comments = [] } = data;

  reactions = {
    heart: reactions.heart || [],
    laugh: reactions.laugh || [],
    shock: reactions.shock || [],
    sad:   reactions.sad   || [],
    angry: reactions.angry || []
  };

  const post = document.createElement("article");
  post.className = "post" + (uid === me?.uid ? " own" : "");

  const delBtn = `<button class="x" data-id="${id}">x</button>`;
  let mediaHtml = "";

  if (mediaURL) {
    if (mediaType === "video") {
      mediaHtml = `
        <video class="media" src="${mediaURL}" autoplay muted playsinline controls
               style="max-width:50%;border-radius:12px;display:block;margin-top:10px;"></video>`;
    } else if (mediaType === "image") {
      mediaHtml = `
        <img class="media" src="${mediaURL}" alt=""
             style="max-width:50%;border-radius:12px;display:block;margin-top:10px;">`;
    }
  }

  post.innerHTML = `
    ${delBtn}
    <a class="author" href="./profile.html?uid=${encodeURIComponent(uid)}">${author || "Anonymous"}</a>
    ${text ? `<div class="content">${escapeHtml(text)}</div>` : ""}
    ${mediaHtml}
    <div class="when">${fmtDate(createdAt)}</div>

    <div class="reactions" data-id="${id}">
      ${reactBtn("heart", reactions.heart.length)}
      ${reactBtn("laugh", reactions.laugh.length)}
      ${reactBtn("shock", reactions.shock.length)}
      ${reactBtn("sad",   reactions.sad.length)}
      ${reactBtn("angry", reactions.angry.length)}
    </div>

    <div class="comments">
      <div class="list">${renderComments(comments)}</div>
      ${comments.length > 3 ? `<button class="see-more" data-id="${id}">See more comments</button>` : ""}
      <div class="comment-row">
        <input type="text" placeholder="Write a comment…" />
        <button class="btn">Comment</button>
      </div>
    </div>
  `;

  // delete post
  post.querySelector(".x")?.addEventListener("click", async () => {
    if (!confirm("Delete this post?")) return;
    await deleteDoc(doc(db, "posts", id));
  });

  // reactions
  post.querySelectorAll(".react").forEach(span => {
    span.addEventListener("click", async () => {
      if (!me) return;
      const type = span.dataset.type;
      const refDoc = doc(db, "posts", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) return;
      const cur = snap.data().reactions || {};
      const myTypes = Object.entries(cur).filter(([, arr]) => arr.includes(me.uid)).map(([k]) => k);

      const already = cur[type]?.includes(me.uid);
      if (already) {
        await updateDoc(refDoc, { [`reactions.${type}`]: arrayRemove(me.uid) });
        return;
      }
      if (myTypes.length >= 2) {
        alert("You can react with up to 2 emojis per post.");
        return;
      }
      await updateDoc(refDoc, { [`reactions.${type}`]: arrayUnion(me.uid) });
    });
  });

  // comments
  const input = post.querySelector(".comment-row input");
  const btn = post.querySelector(".comment-row .btn");
  btn?.addEventListener("click", async () => {
    const msg = (input.value || "").trim();
    if (!msg) return;
    const refDoc = doc(db, "posts", id);
    const newComment = { text: msg, author: me.email || me.uid, createdAt: Timestamp.now() };
    await updateDoc(refDoc, { comments: arrayUnion(newComment) });
    input.value = "";
  });

  // see more comments
  post.querySelector(".see-more")?.addEventListener("click", async (e) => {
    const refDoc = doc(db, "posts", id);
    const snap = await getDoc(refDoc);
    const all = (snap.data()?.comments || []).slice().sort((a, b) => ts(a) - ts(b));
    post.querySelector(".comments .list").innerHTML = renderComments(all, Infinity);
    e.currentTarget.remove();
  });

  return post;
}

/* ---------- helpers ---------- */
function reactBtn(type, count) {
  const emoji = { heart: "❤️", laugh: "😂", shock: "😲", sad: "😢", angry: "😡" }[type];
  return `<span class="react" data-type="${type}" title="React">${emoji} <span class="count">${count}</span></span>`;
}

function renderComments(comments, max = 3) {
  const sorted = (comments || []).slice().sort((a, b) => ts(a) - ts(b));
  const show = max === Infinity ? sorted : sorted.slice(Math.max(0, sorted.length - max));
  return show.map(c => `<div class="comment"><strong>${escapeHtml(c.author || "User")}:</strong> ${escapeHtml(c.text || "")}</div>`).join("");
}

function fmtDate(ts) {
  try {
    if (ts?.toDate) return ts.toDate().toLocaleString();
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  } catch { }
  return "";
}

const ts = (c) => c?.createdAt?.seconds ?? 0;
const escapeHtml = (s = "") => s.replace(/[&<>"']/g, m => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[m]));

