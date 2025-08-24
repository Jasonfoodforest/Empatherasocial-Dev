// feed.js
//Feed Updated
import { db, auth, storage } from './firebase-config.js';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

document.addEventListener("DOMContentLoaded", () => {
  const postBtn = document.getElementById("postBtn");
  const postCaption = document.getElementById("postCaption");
  const mediaFile = document.getElementById("mediaFile");
  const feedContainer = document.getElementById("feedContainer");
  const logoutBtn = document.getElementById("logoutBtn");

  // Logout handler
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        window.location.href = "index.html";
      } catch (err) {
        alert("Logout error: " + err.message);
      }
    });
  }

  // Render a single post
  const renderPost = (postId, data) => {
    const postElement = document.createElement("div");
    postElement.classList.add("post");

    const user = data.user || "Anonymous";
    const caption = data.caption || "";
    const reactions = data.reactions || { like: 0, heart: 0, sad: 0 };
    const comments = data.comments || [];
    const imgTag = data.imageUrl ? `<img src="${data.imageUrl}" style="max-width:100%; margin-top:10px;" />` : "";

    postElement.innerHTML = `
      <p><strong>${user}</strong></p>
      <p>${caption}</p>
      ${imgTag}
      <div class="reactions">
        <button class="reactBtn" data-id="${postId}" data-type="like">👍 ${reactions.like}</button>
        <button class="reactBtn" data-id="${postId}" data-type="heart">❤️ ${reactions.heart}</button>
        <button class="reactBtn" data-id="${postId}" data-type="sad">😢 ${reactions.sad}</button>
      </div>
      <div class="comments">
        <input type="text" placeholder="Add comment..." class="commentInput" data-id="${postId}" />
        <button class="addCommentBtn" data-id="${postId}">Comment</button>
        <ul>
          ${comments.map(c => `<li><strong>${c.user}</strong>: ${c.text}</li>`).join("")}
        </ul>
      </div>
    `;

    return postElement;
  };

  // Post submit
  postBtn.addEventListener("click", async () => {
    const caption = postCaption.value.trim();
    const user = auth.currentUser?.email || "Anonymous";
    const file = mediaFile.files[0];
    let imageUrl = "";

    if (!caption && !file) return;

    if (file) {
      const storageRef = ref(storage, `posts/${user}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(storageRef);
    }

    await addDoc(collection(db, "posts"), {
      user,
      caption,
      imageUrl,
      reactions: { like: 0, heart: 0, sad: 0 },
      comments: [],
      timestamp: serverTimestamp()
    });

    postCaption.value = "";
    mediaFile.value = "";
  });

  // Listen for auth changes
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    // Real-time posts
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    onSnapshot(q, snapshot => {
      feedContainer.innerHTML = "";
      snapshot.forEach(docSnap => {
        const postElement = renderPost(docSnap.id, docSnap.data());
        feedContainer.appendChild(postElement);
      });

      // Attach reaction listeners
      document.querySelectorAll(".reactBtn").forEach(btn => {
        btn.onclick = async () => {
          const postRef = doc(db, "posts", btn.dataset.id);
          const type = btn.dataset.type;
          const snap = await getDoc(postRef);
          const post = snap.data();
          const current = post.reactions?.[type] || 0;
          await updateDoc(postRef, {
            [`reactions.${type}`]: current + 1
          });
        };
      });

      // Attach comment listeners
      document.querySelectorAll(".addCommentBtn").forEach(btn => {
        btn.onclick = async () => {
          const postId = btn.dataset.id;
          const input = document.querySelector(`.commentInput[data-id="${postId}"]`);
          const commentText = input.value.trim();
          const username = auth.currentUser?.email || "Anonymous";

          if (!commentText) return;

          const postRef = doc(db, "posts", postId);
          await updateDoc(postRef, {
            comments: arrayUnion({ user: username, text: commentText })
          });

          input.value = "";
        };
      });
    });
  });
});
