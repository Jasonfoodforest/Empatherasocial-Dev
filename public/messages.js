// message.js
import { auth, db, storage } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref as sRef,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// --- UI refs
const ui = {
  chatList: document.getElementById("chatList"),
  groupList: document.getElementById("groupList"),
  messages: document.getElementById("messages"),
  messageInput: document.getElementById("messageInput"),
  fileInput: document.getElementById("fileInput"),
  attachBtn: document.getElementById("attachBtn"),
  sendBtn: document.getElementById("sendBtn"),
  activeTitle: document.getElementById("activeTitle"),
  progress: document.getElementById("progress"),
  err: document.getElementById("err"),
};

// --- State
let me = null,
  unsubMsgs = null,
  pendingFile = null;
let active = { type: null, roomKey: null, groupId: null, members: [] };

// consistent room key for direct chats
const roomKey = (a, b) => [a, b].sort((x, y) => x.localeCompare(y)).join("_");

// ---------- Auth ----------
onAuthStateChanged(auth, async (u) => {
  if (!u) {
    location.replace("./index.html");
    return;
  }
  me = { uid: u.uid, email: u.email || u.uid }; // fallback to uid if no email
  loadChats();
  loadGroups();
});

// ---------- Load lists ----------
function loadChats() {
  ui.chatList.innerHTML = "";
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", me.email),
    orderBy("lastAt", "desc"),
  );
  onSnapshot(
    q,
    (snap) => {
      ui.chatList.innerHTML = "";
      snap.forEach((d) => {
        const c = d.data();
        const other =
          (c.participants || []).find((p) => p !== me.email) || "(unknown)";
        const btn = document.createElement("button");
        btn.className = "pill";
        btn.textContent = other;
        btn.onclick = () => openDirect(other);
        ui.chatList.appendChild(btn);
      });
    },
    showErr,
  );
}

function loadGroups() {
  ui.groupList.innerHTML = "";
  const q = query(collection(db, "groups"), orderBy("createdAt", "desc"));
  onSnapshot(
    q,
    (snap) => {
      ui.groupList.innerHTML = "";
      snap.forEach((d) => {
        const g = d.data();
        const btn = document.createElement("button");
        btn.className = "pill";
        btn.textContent = `${g.name || "Group"} (${(g.members || []).length} members)`;
        btn.onclick = () => openGroup(d.id, g.members || []);
        ui.groupList.appendChild(btn);
      });
    },
    showErr,
  );
}

// ---------- Open rooms ----------
function openDirect(peerEmail) {
  const rk = roomKey(me.email, peerEmail);
  active = {
    type: "direct",
    roomKey: rk,
    groupId: null,
    members: [me.email, peerEmail],
  };
  ui.activeTitle.textContent = peerEmail;
  bindMessages("direct", rk);

  // ensure chat doc exists
  setDoc(
    doc(db, "chats", rk),
    {
      participants: active.members,
      lastAt: serverTimestamp(),
      lastMsg: "",
    },
    { merge: true },
  );
}

function openGroup(groupId, members) {
  active = { type: "group", roomKey: null, groupId, members };
  ui.activeTitle.textContent = `${members.length} members`;
  bindMessages("group", groupId);
}

// ---------- Bind messages ----------
function bindMessages(type, id) {
  if (unsubMsgs) unsubMsgs();
  ui.messages.innerHTML = "";

  const base =
    type === "direct"
      ? collection(db, "messages", id, "chats")
      : collection(db, "groupMessages", id, "items");

  const q = query(base, orderBy("createdAt", "asc"));
  unsubMsgs = onSnapshot(
    q,
    (snap) => {
      ui.messages.innerHTML = "";
      snap.forEach((docSnap) => {
        renderMsg(docSnap.data());
      });
      ui.messages.scrollTop = ui.messages.scrollHeight;
    },
    showErr,
  );
}

function renderMsg(m) {
  const div = document.createElement("div");
  div.className = "msg";
  const when = m.createdAt?.toDate?.()
    ? m.createdAt.toDate().toLocaleString()
    : "";
  div.innerHTML = `
    <div class="meta">
      <span>${m.senderEmail || m.sender || "anon"}</span>
      <span>•</span>
      <span>${when}</span>
    </div>
    <div class="bubble"></div>
  `;
  if (m.text) div.querySelector(".bubble").textContent = m.text;

  if (m.mediaURL) {
    if ((m.mediaType || "").startsWith("video/")) {
      const v = document.createElement("video");
      v.className = "vid";
      v.src = m.mediaURL;
      v.controls = true;
      v.preload = "metadata";
      div.appendChild(v);
    } else {
      const img = document.createElement("img");
      img.className = "thumb";
      img.src = m.mediaURL;
      img.alt = "";
      div.appendChild(img);
    }
  }
  ui.messages.appendChild(div);
}

// ---------- Compose ----------
ui.attachBtn.onclick = () => ui.fileInput.click();
ui.fileInput.onchange = (e) => {
  pendingFile = e.target.files?.[0] || null;
};

ui.sendBtn.onclick = async () => {
  if (!active.type) return showErr({ message: "Pick a chat first" });
  const text = (ui.messageInput.value || "").trim();
  if (!text && !pendingFile) return;

  ui.err.textContent = "";
  ui.progress.textContent = "";

  try {
    let mediaURL = "",
      mediaType = "";
    if (pendingFile) {
      const folder = active.type === "direct" ? active.roomKey : active.groupId;
      const path = `chat_uploads/${folder}/${me.uid}/${Date.now()}-${pendingFile.name}`;
      const r = sRef(storage, path);
      const task = uploadBytesResumable(r, pendingFile);
      task.on("state_changed", (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        ui.progress.textContent = `Uploading ${pct}%`;
      });
      await task;
      mediaURL = await getDownloadURL(r);
      mediaType = pendingFile.type || "";
      ui.progress.textContent = "";
    }

    const base =
      active.type === "direct"
        ? collection(db, "messages", active.roomKey, "chats")
        : collection(db, "groupMessages", active.groupId, "items");

    await addDoc(base, {
      text,
      mediaURL,
      mediaType,
      senderUid: me.uid,
      senderEmail: me.email,
      createdAt: serverTimestamp(),
    });

    if (active.type === "direct") {
      await updateDoc(doc(db, "chats", active.roomKey), {
        lastAt: serverTimestamp(),
        lastMsg: text
          ? text.slice(0, 120)
          : mediaType.startsWith("video/")
            ? "[video]"
            : "[image]",
      });
    }

    ui.messageInput.value = "";
    ui.fileInput.value = "";
    pendingFile = null;
  } catch (e) {
    showErr(e);
  }
};

function showErr(e) {
  console.error(e);
  ui.err.textContent = e?.message || String(e);
}
