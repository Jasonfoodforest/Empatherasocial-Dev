import { auth, db, storage } from "./firebase-config.js";
import {
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let currentUser = null;
let activeChat = null;
let activeChatType = null; // "direct" | "group"

// DOM elements
const logoutBtn = document.getElementById("logoutBtn");
const userEmailEl = document.getElementById("userEmail");
const newChatEmail = document.getElementById("newChatEmail");
const startChatBtn = document.getElementById("startChatBtn");
const chatList = document.getElementById("chatList");
const groupList = document.getElementById("groupList");
const chatHeader = document.getElementById("chatHeader");
const messagesEl = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const fileInput = document.getElementById("fileInput");
const sendBtn = document.getElementById("sendBtn");

// 🔹 Auth state
onAuthStateChanged(auth, (u) => {
  if (!u) {
    location.href = "./index.html";
    return;
  }
  currentUser = u;
  userEmailEl.textContent = u.email || "Anonymous";
  loadChats();
  loadGroups();
});

// 🔹 Logout
logoutBtn.onclick = () => {
  signOut(auth).then(() => (location.href = "./index.html"));
};

// 🔹 Load chats
function loadChats() {
  onSnapshot(collection(db, "chats"), (snap) => {
    chatList.innerHTML = "";
    snap.forEach((docSnap) => {
      const chat = docSnap.data();
      if (chat.participants.includes(currentUser.email)) {
        const btn = document.createElement("button");
        btn.textContent = chat.lastMsg || "(no messages)";
        btn.style.display = "block";
        btn.style.width = "100%";
        btn.style.margin = "4px 0";
        btn.onclick = () =>
          openChat(docSnap.id, "direct", chat.participants.join(", "));
        chatList.appendChild(btn);
      }
    });
  });
}

// 🔹 Load groups
function loadGroups() {
  onSnapshot(collection(db, "groups"), (snap) => {
    groupList.innerHTML = "";
    snap.forEach((docSnap) => {
      const g = docSnap.data();
      if (g.members.includes(currentUser.email)) {
        const btn = document.createElement("button");
        btn.textContent = g.name + " → " + (g.lastMsg || "");
        btn.style.display = "block";
        btn.style.width = "100%";
        btn.style.margin = "4px 0";
        btn.onclick = () => openChat(docSnap.id, "group", g.name);
        groupList.appendChild(btn);
      }
    });
  });
}

// 🔹 Open chat or group
function openChat(id, type, label) {
  activeChat = id;
  activeChatType = type;
  chatHeader.textContent = label;
  messagesEl.innerHTML = "";

  let refCol =
    type === "direct"
      ? collection(db, "chats", id, "messages")
      : collection(db, "groups", id, "messages");

  const q = query(refCol, orderBy("createdAt", "asc"));
  onSnapshot(q, (snap) => {
    messagesEl.innerHTML = "";
    snap.forEach((docSnap) => {
      const m = docSnap.data();
      const div = document.createElement("div");
      div.style.marginBottom = "6px";
      let content = `<strong>${m.senderEmail}</strong> (${m.createdAt?.toDate().toLocaleTimeString()}): `;
      if (m.text) content += m.text;
      if (m.fileUrl) {
        if (m.fileUrl.match(/\.(jpeg|jpg|png|gif)$/i)) {
          content += `<br><img src="${m.fileUrl}" style="max-width:200px; border-radius:6px;">`;
        } else {
          content += `<br><a href="${m.fileUrl}" target="_blank">📎 File</a>`;
        }
      }
      div.innerHTML = content;
      messagesEl.appendChild(div);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  });
}

// 🔹 Send message
async function sendMessage() {
  if (!activeChat) return;
  const text = messageInput.value.trim();
  const file = fileInput.files[0];

  let fileUrl = null;
  if (file) {
    const storageRef = ref(storage, `messages/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
    fileInput.value = "";
  }

  const msg = {
    senderEmail: currentUser.email,
    text: text || null,
    fileUrl: fileUrl || null,
    createdAt: serverTimestamp(),
  };

  const refCol =
    activeChatType === "direct"
      ? collection(db, "chats", activeChat, "messages")
      : collection(db, "groups", activeChat, "messages");

  await addDoc(refCol, msg);
  messageInput.value = "";
}

// 🔹 Start new chat
async function startChat() {
  const email = newChatEmail.value.trim();
  if (!email) return;
  const chatId = [currentUser.email, email].sort().join("_");

  const chatRef = doc(db, "chats", chatId);
  await setDoc(
    chatRef,
    {
      participants: [currentUser.email, email],
      createdAt: serverTimestamp(),
      lastAt: serverTimestamp(),
      lastMsg: "New chat started",
    },
    { merge: true },
  );

  newChatEmail.value = "";
}

// 🔹 Listeners
sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});
startChatBtn.onclick = startChat;
