import { auth, db, storage } from "./firebase-config.js";
import {
  collection, addDoc, doc, updateDoc, getDocs, query, orderBy, serverTimestamp, arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

const nameEl = document.getElementById("groupName");
const descEl = document.getElementById("groupDesc");
const fileEl = document.getElementById("groupFile");
const createBtn = document.getElementById("createBtn");
const listEl = document.getElementById("groupList");
const errEl = document.getElementById("err");

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
    v.onerror = () => reject();
    v.src = url;
  });
}

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  await loadGroups(user);
});

async function loadGroups(user) {
  const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  listEl.innerHTML = "";

  snapshot.forEach(docSnap => {
    const g = docSnap.data();
    const id = docSnap.id;
    const isMember = (g.members || []).includes(user.uid);

    const div = document.createElement("div");
    div.className = "group-card";

    let mediaHTML = "";
    if (g.mediaType === "video") mediaHTML = `<video src="${g.mediaURL}" controls muted></video>`;
    if (g.mediaType === "image") mediaHTML = `<img src="${g.mediaURL}" alt="group cover">`;

    div.innerHTML = `
      ${mediaHTML}
      <h3>${g.name}</h3>
      <p>${g.description}</p>
      <small>${g.members?.length || 0} members • by ${g.author || ""}</small>
      <button class="${isMember ? "open-btn" : "join-btn"}" data-id="${id}">
        ${isMember ? "Open Feed" : "Join Group"}
      </button>
      ${g.authorUid === user.uid ? `<button class="delete-btn" data-id="${id}">Delete</button>` : ""}
    `;

    listEl.appendChild(div);
  });

  // join/open handlers
  listEl.querySelectorAll(".join-btn, .open-btn").forEach(btn => {
    btn.onclick = async () => {
      const groupId = btn.dataset.id;
      if (btn.classList.contains("join-btn")) {
        await updateDoc(doc(db, "groups", groupId), {
          members: arrayUnion(auth.currentUser.uid)
        });
        await loadGroups(auth.currentUser);
      } else {
        window.location.href = `group-feed.html?id=${groupId}`;
      }
    };
  });

  // delete handlers
  listEl.querySelectorAll(".delete-btn").forEach(btn => {
    btn.onclick = async () => {
      if (!confirm("Delete this group?")) return;
      await updateDoc(doc(db, "groups", btn.dataset.id), { deleted: true });
      await loadGroups(auth.currentUser);
    };
  });
}

createBtn.addEventListener("click", async () => {
  errEl.textContent = "";
  const user = auth.currentUser;
  if (!user) return;

  const name = nameEl.value.trim();
  const desc = descEl.value.trim();
  const file = fileEl.files[0];
  if (!name || !desc) return errEl.textContent = "Please enter group name and description.";

  let mediaURL = null;
  let mediaType = null;
  if (file) {
    if (file.type.startsWith("video/")) {
      const dur = await getVideoDuration(file);
      if (dur > MAX_VIDEO_SECONDS) return errEl.textContent = "Video exceeds 3 minutes.";
      mediaType = "video";
    } else if (file.type.startsWith("image/")) {
      mediaType = "image";
    }
    const refPath = ref(storage, `groups/${Date.now()}_${file.name}`);
    await uploadBytes(refPath, file);
    mediaURL = await getDownloadURL(refPath);
  }

  await addDoc(collection(db, "groups"), {
    name,
    description: desc,
    author: user.email,
    authorUid: user.uid,
    members: [user.uid],
    mediaURL,
    mediaType,
    createdAt: serverTimestamp()
  });

  nameEl.value = descEl.value = "";
  fileEl.value = "";
  await loadGroups(user);
});


