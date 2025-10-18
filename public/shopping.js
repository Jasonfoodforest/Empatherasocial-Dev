// shopping.js
import { auth, db, storage } from "./firebase-config.js";
import {
  collection, addDoc, orderBy, onSnapshot, serverTimestamp,
  updateDoc, doc, deleteDoc, getDoc, arrayUnion, arrayRemove, Timestamp,
  query // ✅ added import
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let me = null;

// --- Auth guard ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("./index.html");
    return;
  }
  me = user;
  console.log("🛍️ Shopping loaded as", user.email);
  initComposer();
  loadItems();
});

// --- Composer (upload new item) ---
function initComposer() {
  const titleEl = document.getElementById("title");
  const priceEl = document.getElementById("price");
  const descEl  = document.getElementById("desc");
  const fileEl  = document.getElementById("file");
  const postBtn = document.getElementById("postBtn");
  const errEl   = document.getElementById("err");

  postBtn.addEventListener("click", async () => {
    errEl.textContent = "";
    try {
      if (!me) throw new Error("Please log in.");
      postBtn.disabled = true;
      postBtn.textContent = "Posting…";

      const title = (titleEl.value || "").trim();
      const price = (priceEl.value || "").trim();
      const desc = (descEl.value || "").trim();
      const file = fileEl.files[0];
      if (!title && !desc && !file) throw new Error("Enter info or upload media.");

      let mediaURL = null, mediaType = null;
      if (file) {
        mediaType = file.type.startsWith("video") ? "video" :
                    file.type.startsWith("image") ? "image" : null;
        const key = `shopping/${me.uid}/${Date.now()}-${encodeURIComponent(file.name)}`;
        const r = ref(storage, key);
        await uploadBytes(r, file);
        mediaURL = await getDownloadURL(r);
      }

      await addDoc(collection(db, "items"), {
        title,
        price,
        desc,
        mediaURL,
        mediaType,
        authorUid: me.uid,
        author: me.email || "Anonymous",
        createdAt: serverTimestamp(),
        reactions: {},
        comments: []
      });

      titleEl.value = priceEl.value = descEl.value = "";
      fileEl.value = "";
      errEl.textContent = "✅ Posted!";
      setTimeout(() => (errEl.textContent = ""), 1500);
    } catch (err) {
      console.error(err);
      errEl.textContent = err.message || "Error posting item.";
    } finally {
      postBtn.disabled = false;
      postBtn.textContent = "Post Item";
    }
  });
}

// --- Load and render items (3-column grid, newest first) ---
function loadItems() {
  const listEl = document.getElementById("shoppingList");
  const q = query(collection(db, "items"), orderBy("createdAt", "desc")); // ✅ newest first
  onSnapshot(q, (snap) => {
    listEl.innerHTML = "";
    listEl.style.display = "grid";
    listEl.style.gridTemplateColumns = "repeat(auto-fill, minmax(300px, 1fr))";
    listEl.style.gap = "20px";
    snap.forEach((docSnap) => {
      listEl.appendChild(renderItem(docSnap.id, docSnap.data()));
    });
  });
}

// --- Render each item (card layout with emojis + comments) ---
function renderItem(id, data) {
  const { title, price, desc, mediaURL, mediaType, createdAt, author, authorUid } = data;
  const reactions = data.reactions || {};
  const comments  = data.comments  || [];

  const card = document.createElement("article");
  card.className = "card";
  card.style.background = "#1a1d22";
  card.style.borderRadius = "16px";
  card.style.padding = "16px";
  card.style.boxShadow = "0 8px 24px rgba(0,0,0,.3)";
  card.style.position = "relative";

  let mediaHtml = "";
  if (mediaURL) {
    if (mediaType === "video")
      mediaHtml = `<video class="media" src="${mediaURL}" controls playsinline style="width:100%;border-radius:12px;margin-top:8px;max-height:280px;object-fit:cover;"></video>`;
    else
      mediaHtml = `<img class="media" src="${mediaURL}" alt="" style="width:100%;border-radius:12px;margin-top:8px;max-height:280px;object-fit:cover;">`;
  }

  card.innerHTML = `
    ${authorUid === me?.uid ? `<button class="delete" data-id="${id}" style="background:#ff8b24;color:#fff;border:none;border-radius:8px;padding:4px 8px;cursor:pointer;position:absolute;top:10px;right:10px;">x</button>` : ""}
    <div class="title" style="font-size:18px;font-weight:700;margin-bottom:4px;color:#6ee7ff;">${escapeHtml(title || "Untitled")}</div>
    <div class="price" style="color:#18c964;font-weight:700;">${escapeHtml(price || "")}</div>
    <div class="desc" style="font-size:14px;color:#cbd5e1;margin:6px 0;">${escapeHtml(desc || "")}</div>
    ${mediaHtml}
    <div class="timestamp" style="font-size:12px;color:#94a3b8;margin-top:8px;">${fmtDate(createdAt)} • ${escapeHtml(author || "")}</div>
    <div class="reactions" data-id="${id}" style="display:flex;gap:12px;align-items:center;margin:8px 0 12px;">
      ${reactBtn("heart", reactions.heart?.length || 0)}
      ${reactBtn("laugh", reactions.laugh?.length || 0)}
      ${reactBtn("shock", reactions.shock?.length || 0)}
      ${reactBtn("sad", reactions.sad?.length || 0)}
      ${reactBtn("angry", reactions.angry?.length || 0)}
    </div>
    <div class="comments" style="background:#151a20;border-radius:14px;padding:10px;">
      <div class="list">${renderComments(comments)}</div>
      ${comments.length > 3 ? `<button class="see-more" data-id="${id}" style="background:#2a323c;color:#cfe;border:none;border-radius:10px;padding:7px 12px;cursor:pointer;font-weight:700;">See more</button>` : ""}
      <div class="comment-row" style="display:flex;gap:10px;margin-top:8px;">
        <input type="text" placeholder="Write a comment…" style="flex:1;padding:9px 10px;border:none;border-radius:10px;background:#0f1217;color:#fff;" />
        <button class="btn" style="padding:9px 13px;border:none;border-radius:10px;background:#18c964;color:#04150e;cursor:pointer;font-weight:700;">Comment</button>
      </div>
    </div>
  `;

  // delete
  card.querySelector(".delete")?.addEventListener("click", async () => {
    if (!confirm("Delete this item?")) return;
    await deleteDoc(doc(db, "items", id));
  });

  // reactions
  card.querySelectorAll(".react").forEach(span => {
    span.addEventListener("click", async () => {
      const type = span.dataset.type;
      const refDoc = doc(db, "items", id);
      const snap = await getDoc(refDoc);
      if (!snap.exists()) return;
      const cur = snap.data().reactions || {};
      const already = cur[type]?.includes(me.uid);
      if (already) {
        await updateDoc(refDoc, { [`reactions.${type}`]: arrayRemove(me.uid) });
      } else {
        await updateDoc(refDoc, { [`reactions.${type}`]: arrayUnion(me.uid) });
      }
    });
  });

  // comments
  const input = card.querySelector(".comment-row input");
  const btn = card.querySelector(".comment-row .btn");
  btn?.addEventListener("click", async () => {
    const msg = (input.value || "").trim();
    if (!msg) return;
    const refDoc = doc(db, "items", id);
    const newComment = { text: msg, author: me.email || me.uid, createdAt: Timestamp.now() };
    await updateDoc(refDoc, { comments: arrayUnion(newComment) });
    input.value = "";
  });

  // see more comments
  card.querySelector(".see-more")?.addEventListener("click", async (e) => {
    const refDoc = doc(db, "items", id);
    const snap = await getDoc(refDoc);
    const all = (snap.data()?.comments || []).slice().sort((a,b)=>ts(a)-ts(b));
    card.querySelector(".comments .list").innerHTML = renderComments(all, Infinity);
    e.currentTarget.remove();
  });

  return card;
}

/* ---------- helpers ---------- */
function reactBtn(type, count){
  const emoji = {heart:"❤️", laugh:"😂", shock:"😲", sad:"😢", angry:"😡"}[type];
  return `<span class="react" data-type="${type}" style="cursor:pointer;user-select:none;">${emoji} <span class="count" style="margin-left:6px;color:#cbd5e1;">${count}</span></span>`;
}

function renderComments(comments, max = 3){
  const sorted = (comments || []).slice().sort((a,b)=> ts(a)-ts(b));
  const show = max === Infinity ? sorted : sorted.slice(Math.max(0, sorted.length - max));
  return show.map(c => `<div class="comment" style="margin:6px 0;"><strong>${escapeHtml(c.author || "User")}:</strong> ${escapeHtml(c.text || "")}</div>`).join("");
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


