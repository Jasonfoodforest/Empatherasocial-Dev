import { auth, db, storage } from "./firebase-config.js";
import {
  collection, addDoc, serverTimestamp, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc, getDoc, arrayUnion, arrayRemove, Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise(res => setTimeout(res, ms));
const escapeHtml = (s="") => s.replace(/[&<>"']/g, m => (
  {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]
));

let me = null;
let unsubscribeFeed = null;

/* ---------- Initialize when DOM is fully loaded ---------- */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("📱 Feed page ready, waiting for Firebase...");
  await sleep(200); // small delay to let mobile browsers stabilize
  safeInit();
});

async function safeInit() {
  try {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("User not logged in -> redirect");
        window.location.href = "./index.html";
        return;
      }
      me = user;
      console.log("✅ Logged in as", me.email);
      bindLogout();
      bindPost();
      await sleep(200);
      startFeed();
    });
  } catch (err) {
    console.error("🔥 Initialization failed:", err);
  }
}

/* ---------- Logout ---------- */
function bindLogout() {
  const logoutEl = document.getElementById("btnLogout");
  if (!logoutEl) return;
  logoutEl.onclick = async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      console.log("🚪 Signed out successfully");
      window.location.replace("./index.html");
    } catch (err) {
      console.error("Logout failed", err);
      alert("Logout failed. Please refresh.");
    }
  };
}

/* ---------- Post Creation ---------- */
function bindPost() {
  const postBtn = $("postBtn");
  const postText = $("postText");
  const postFile = $("postFile");
  const hintEl = $("postHint");
  if (!postBtn || !postText || !postFile) return;

  postBtn.onclick = async () => {
    if (!me) return alert("Please log in first.");

    try {
      postBtn.disabled = true;
      hintEl.textContent = "Posting…";

      const text = (postText.value || "").trim();
      let mediaURL = null, mediaType = null;

      if (postFile.files[0]) {
        const f = postFile.files[0];
        const r = ref(storage, `uploads/${me.uid}/${Date.now()}-${encodeURIComponent(f.name)}`);
        await uploadBytes(r, f);
        mediaURL = await getDownloadURL(r);
        mediaType = f.type.startsWith("video/") ? "video" :
                    f.type.startsWith("image/") ? "image" : "file";
      }

      await addDoc(collection(db, "posts"), {
        uid: me.uid,
        author: me.email || me.uid,
        text,
        mediaURL,
        mediaType,
        createdAt: serverTimestamp(),
        reactions: { heart:[], laugh:[], shock:[], sad:[], angry:[] },
        comments: []
      });

      postText.value = "";
      postFile.value = "";
      hintEl.textContent = "Posted!";
      setTimeout(() => hintEl.textContent = "", 1200);
    } catch (err) {
      console.error("Post failed:", err);
      hintEl.textContent = "❌ Failed to post. Try again.";
    } finally {
      postBtn.disabled = false;
    }
  };
}

/* ---------- Feed Snapshot ---------- */
function startFeed() {
  const feedEl = $("feedList");
  if (!feedEl) return;

  console.log("📡 Subscribing to posts...");
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

  // retry up to 3 times if Firestore not ready
  let tries = 0;
  const subscribe = async () => {
    try {
      if (unsubscribeFeed) unsubscribeFeed();
      unsubscribeFeed = onSnapshot(q, (snap) => {
        if (snap.empty) {
          feedEl.innerHTML = `<p style="text-align:center;color:#9ca3af;">No posts yet</p>`;
          return;
        }
        feedEl.innerHTML = "";
        snap.forEach((docSnap) => {
          feedEl.appendChild(renderPost(docSnap.id, docSnap.data()));
        });
        setupVideoObserver();
      });
    } catch (err) {
      tries++;
      console.warn("Retrying snapshot in 300ms...", tries);
      if (tries < 3) {
        await sleep(300);
        subscribe();
      } else {
        console.error("❌ Feed failed after retries", err);
      }
    }
  };
  subscribe();
}

/* ---------- Render Post ---------- */
function renderPost(id, d) {
  const post = document.createElement("article");
  post.className = "post" + (d.uid === me?.uid ? " own" : "");

  const del = `<button class="x" data-id="${id}">x</button>`;
  const media = d.mediaURL
    ? d.mediaType === "video"
      ? `<video class="media video-post" src="${d.mediaURL}" muted playsinline controls></video>`
      : `<img class="media" src="${d.mediaURL}" alt="">`
    : "";

  post.innerHTML = `
    ${del}
    <a class="author" href="./profile.html?uid=${encodeURIComponent(d.uid)}">${d.author || "User"}</a>
    ${d.text ? `<div class="content">${escapeHtml(d.text)}</div>` : ""}
    ${media}
    <div class="when">${fmtDate(d.createdAt)}</div>
    <div class="reactions" data-id="${id}">
      ${reactBtn("heart", d.reactions?.heart?.length || 0)}
      ${reactBtn("laugh", d.reactions?.laugh?.length || 0)}
      ${reactBtn("shock", d.reactions?.shock?.length || 0)}
      ${reactBtn("sad", d.reactions?.sad?.length || 0)}
      ${reactBtn("angry", d.reactions?.angry?.length || 0)}
    </div>
    <div class="comments">
      <div class="list">${renderComments(d.comments || [])}</div>
      <div class="comment-row">
        <input type="text" placeholder="Write a comment…" />
        <button class="btn">Comment</button>
      </div>
    </div>
  `;

  // delete button
  post.querySelector(".x")?.addEventListener("click", async () => {
    if (confirm("Delete this post?")) {
      await deleteDoc(doc(db, "posts", id));
    }
  });

  // reaction buttons
  post.querySelectorAll(".react").forEach(span => {
    span.onclick = async () => {
      if (!me) return;
      const type = span.dataset.type;
      const refDoc = doc(db, "posts", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) return;
      const cur = snap.data().reactions || {};
      const already = cur[type]?.includes(me.uid);
      if (already)
        await updateDoc(refDoc, { [`reactions.${type}`]: arrayRemove(me.uid) });
      else
        await updateDoc(refDoc, { [`reactions.${type}`]: arrayUnion(me.uid) });
    };
  });

  // comment button
  const input = post.querySelector(".comment-row input");
  const btn = post.querySelector(".comment-row .btn");
  btn.onclick = async () => {
    const msg = input.value.trim();
    if (!msg) return;
    await updateDoc(doc(db, "posts", id), {
      comments: arrayUnion({ text: msg, author: me.email, createdAt: Timestamp.now() })
    });
    input.value = "";
  };

  return post;
}

/* ---------- Reactions & Helpers ---------- */
function reactBtn(type, n) {
  const emoji = { heart:"❤️", laugh:"😂", shock:"😲", sad:"😢", angry:"😡" }[type];
  return `<span class="react" data-type="${type}">${emoji} <span class="count">${n}</span></span>`;
}

function renderComments(arr = []) {
  return arr.slice(-3).map(c =>
    `<div class="comment"><strong>${escapeHtml(c.author)}:</strong> ${escapeHtml(c.text)}</div>`
  ).join("");
}

function fmtDate(ts) {
  try {
    if (ts?.toDate) return ts.toDate().toLocaleString();
    if (ts?.seconds) return new Date(ts.seconds * 1000).toLocaleString();
  } catch {}
  return "";
}

function setupVideoObserver() {
  const vids = document.querySelectorAll(".video-post");
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const v = entry.target;
      if (entry.isIntersecting) {
        vids.forEach(x => x !== v && x.pause());
        v.play().catch(()=>{});
      } else v.pause();
    });
  }, { threshold: 0.6 });
  vids.forEach(v => obs.observe(v));
}


