import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

// UI elements
const chatsEl = document.getElementById("chatsList");
const groupsEl = document.getElementById("groupsList");
const chatWithEl = document.getElementById("chatWith");
const msgListEl = document.getElementById("msgList");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");

let currentChatId = null;
let currentChatType = null; // "chat" or "group"
let me = null;

// ============================
// AUTH
// ============================
onAuthStateChanged(auth, (user) => {
  if (!user) {
    location.href = "./index.html";
    return;
  }
  me = user;
  loadChats(user);
  loadGroups(user);
});

function loadChats(user) {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", user.email), // ✅ use email
  );

  onSnapshot(q, (snapshot) => {
    chatsEl.innerHTML = "";
    snapshot.forEach((doc) => {
      const chat = doc.data();
      const div = document.createElement("div");
      div.textContent = chat.lastMsg || "Direct Chat"; // show last message
      div.onclick = () => openChat(doc.id, "chat");
      chatsEl.appendChild(div);
    });
  });
}

function loadGroups(user) {
  const q = query(
    collection(db, "groups"),
    where("members", "array-contains", user.email), // ✅ use email
  );

  onSnapshot(q, (snapshot) => {
    groupsEl.innerHTML = "";
    snapshot.forEach((doc) => {
      const group = doc.data();
      const div = document.createElement("div");
      div.textContent = group.name || "Group Chat";
      div.onclick = () => openChat(doc.id, "group");
      groupsEl.appendChild(div);
    });
  });
}

// ============================
// OPEN CHAT OR GROUP
// ============================
function openChat(chatId, type) {
  currentChatId = chatId;
  currentChatType = type;
  msgListEl.innerHTML = "";

  if (type === "chat") {
    chatWithEl.textContent = "Direct Chat";

    const msgCol = collection(db, "chats", chatId, "messages");
    const q = query(msgCol, orderBy("createdAt", "asc"));
    onSnapshot(q, (snapshot) => {
      msgListEl.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        const div = document.createElement("div");
        div.textContent = `${msg.senderEmail || "Unknown"}: ${msg.text}`;
        msgListEl.appendChild(div);
      });
    });
  } else if (type === "group") {
    chatWithEl.textContent = "Group Chat";

    const msgCol = collection(db, "groupMessages", chatId, "items");
    const q = query(msgCol, orderBy("createdAt", "asc"));
    onSnapshot(q, (snapshot) => {
      msgListEl.innerHTML = "";
      snapshot.forEach((docSnap) => {
        const msg = docSnap.data();
        const div = document.createElement("div");
        div.textContent = `${msg.senderEmail || "Unknown"}: ${msg.text}`;
        msgListEl.appendChild(div);
      });
    });
  }
}

// ============================
// SEND MESSAGE
// ============================
async function sendMessage() {
  if (!currentChatId || !msgInput.value.trim()) return;

  const text = msgInput.value.trim();

  if (currentChatType === "chat") {
    await addDoc(collection(db, "chats", currentChatId, "messages"), {
      text,
      senderEmail: me.email,
      createdAt: serverTimestamp(),
    });
  } else if (currentChatType === "group") {
    await addDoc(collection(db, "groupMessages", currentChatId, "items"), {
      text,
      senderEmail: me.email,
      createdAt: serverTimestamp(),
    });
  }

  msgInput.value = "";
}

sendBtn.onclick = sendMessage;
msgInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

// ============================
// LOGOUT
// ============================
document.getElementById("logoutBtn")?.addEventListener("click", () => {
  signOut(auth);
});
