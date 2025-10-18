import { auth, db, storage } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc, doc
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const postText = document.getElementById("postText");
const postFile = document.getElementById("postFile");
const postBtn = document.getElementById("postBtn");
const postErr = document.getElementById("postErr");
const feed = document.getElementById("feed");
const groupTitle = document.getElementById("groupTitle");
const groupDesc = document.getElementById("groupDesc");

const MAX_VIDEO_SECONDS = 180;

// Get video duration helper
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

// Load group posts
async function loadPosts(groupId) {
  const q = query(
    collection(db, "groupPosts"),
    where("groupId", "==", groupId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  feed.innerHTML = "";

  snap.forEach((docSnap) => {
    const p = docSnap.data();
    const postId = docSnap.id;
    const postDiv = document.createElement("div");
    postDiv.className = "group-post";

    let mediaHTML = "";
    if (p.mediaType === "image") {
      mediaHTML = `<img src="${p.mediaURL}" alt="group media" />`;
    } else if (p.mediaType === "video") {
      mediaHTML = `<video controls src="${p.mediaURL}"></video>`;
    }

    const emojis = ["❤️", "😂", "😮", "😢", "😡"];
    const reactionsHTML = emojis
      .map(
        (e) =>
          `<button data-emoji="${e}" class="react-btn">${e} ${
            p.reactions?.[e] || 0
          }</button>`
      )
      .join(" ");

    const commentsHTML = (p.comments || [])
      .map((c) => `<div class="comment"><strong>${c.user}</strong>: ${c.text}</div>`)
      .join("");

    postDiv.innerHTML = `
      <h4>${p.author}</h4>
      <p>${p.text || ""}</p>
      ${mediaHTML}
      <small>${new Date(
        p.createdAt?.seconds * 1000 || Date.now()
      ).toLocaleString()}</small>
      <div class="reactions">${reactionsHTML}</div>
      <div class="comment-box">
        <input type="text" placeholder="Write a comment..." />
        <button>Comment</button>
      </div>
      <div class="comments">${commentsHTML}</div>
    `;

    // Add reactions
    postDiv.querySelectorAll(".react-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const emoji = btn.dataset.emoji;
        const refDoc = doc(db, "groupPosts", postId);
        const count = (p.reactions?.[emoji] || 0) + 1;
        await updateDoc(refDoc, { [`reactions.${emoji}`]: count });
        await loadPosts(groupId);
      });
    });

    // Add comments
    const commentInput = postDiv.querySelector(".comment-box input");
    const commentBtn = postDiv.querySelector(".comment-box button");
    commentBtn.addEventListener("click", async () => {
      const text = commentInput.value.trim();
      if (!text) return;
      const refDoc = doc(db, "groupPosts", postId);
      const newComment = { user: auth.currentUser.email, text };
      const newComments = [...(p.comments || []), newComment];
      await updateDoc(refDoc, { comments: newComments });
      commentInput.value = "";
      await loadPosts(groupId);
    });

    feed.appendChild(postDiv);
  });
}

// Create post
postBtn.addEventListener("click", async () => {
  postErr.textContent = "";
  const user = auth.currentUser;
  if (!user) return (postErr.textContent = "Please log in first.");

  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");
  if (!groupId) return (postErr.textContent = "Missing group ID.");

  const text = postText.value.trim();
  const file = postFile.files[0];
  if (!text && !file)
    return (postErr.textContent = "Write something or upload media.");

  let mediaURL = null;
  let mediaType = null;

  if (file) {
    if (file.type.startsWith("video/")) {
      const dur = await getVideoDuration(file);
      if (dur > MAX_VIDEO_SECONDS) {
        postErr.textContent = "Video exceeds 3-minute limit.";
        return;
      }
      mediaType = "video";
    } else if (file.type.startsWith("image/")) {
      mediaType = "image";
    }
    const storageRef = ref(storage, `group-posts/${groupId}/${Date.now()}_${file.name}`);
    const snap = await uploadBytes(storageRef, file);
    mediaURL = await getDownloadURL(snap.ref);
  }

  await addDoc(collection(db, "groupPosts"), {
    groupId,
    author: user.email,
    text,
    mediaURL,
    mediaType,
    createdAt: serverTimestamp(),
    reactions: {},
    comments: [],
  });

  postText.value = "";
  postFile.value = "";
  await loadPosts(groupId);
});

// Init
auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("id");
  const name = params.get("name") || "Group";
  const desc = params.get("desc") || "Welcome to your group space.";
  groupTitle.textContent = name;
  groupDesc.textContent = desc;
  await loadPosts(groupId);
});
// Back button navigation
document.getElementById("backBtn")?.addEventListener("click", () => {
  window.location.href = "group.html";
});


