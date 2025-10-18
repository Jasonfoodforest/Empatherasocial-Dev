import { auth, db, storage } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

// Elements
const logoutBtn = document.getElementById("logoutBtn");
const newChatInput = document.getElementById("newChatInput");
const startChatBtn = document.getElementById("startChatBtn");
const chatList = document.getElementById("chatList");
const chatHeader = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const fileInput = document.getElementById("fileInput");

let currentUser = null;
let currentChatId = null;
let unsubscribeMessages = null;

// --- Logout ---
logoutBtn?.addEventListener("click", async () => {
  try {
    await signOut(auth);
    window.location.replace("index.html");
  } catch (err) {
    console.error("Logout error:", err);
  }
});

// --- Auth ---
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("index.html");
  } else {
    currentUser = user;
    loadChats();
  }
});

// --- Load Chats ---
function loadChats() {
  const q = query(
    collection(db, "chats"),
    where("participants", "array-contains", currentUser.email)
  );

  onSnapshot(q, async (snapshot) => {
    chatList.innerHTML = "";
    if (snapshot.empty) {
      chatList.innerHTML = `<li class="empty">No chats yet</li>`;
      return;
    }

    const chats = [];
    for (const docSnap of snapshot.docs) {
      const chatId = docSnap.id;
      const chat = docSnap.data();

      // get last message
      const msgsQuery = query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "desc")
      );
      const msgSnapshot = await getDocs(msgsQuery);

      let lastMsg = "No messages yet";
      if (!msgSnapshot.empty) {
        const m = msgSnapshot.docs[0].data();
        lastMsg = m.text
          ? m.text
          : m.fileType?.startsWith("image/")
          ? "📷 Image"
          : m.fileType?.startsWith("video/")
          ? "🎥 Video"
          : "📎 File";
      }

      // unread count
      let unreadCount = 0;
      msgSnapshot.forEach((m) => {
        const data = m.data();
        if (!data.readBy?.includes(currentUser.email)) unreadCount++;
      });

      chats.push({ id: chatId, ...chat, lastMsg, unreadCount });
    }

    renderChatList(chats);
  });
}

// --- Render Chat List ---
function renderChatList(chats) {
  chatList.innerHTML = "";
  chats.forEach((chat) => {
    const li = document.createElement("li");
    li.dataset.id = chat.id;
    li.className = "chat-item";

    li.innerHTML = `
      <div class="chat-info">
        <span class="chat-names">${chat.participants
          .filter((p) => p !== currentUser.email)
          .join(", ")}</span>
        ${
          chat.unreadCount > 0
            ? `<span class="badge pulse">${chat.unreadCount}</span>`
            : ""
        }
      </div>
      <small class="chat-preview">${chat.lastMsg}</small>
      <button class="chat-delete-btn">×</button>
    `;

    // open chat
    li.addEventListener("click", (e) => {
      if (e.target.classList.contains("chat-delete-btn")) return;
      openChat(chat.id, chat.participants);
    });

    // delete chat
    li.querySelector(".chat-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await deleteDoc(doc(db, "chats", chat.id));
      if (currentChatId === chat.id) {
        messagesDiv.innerHTML = "";
        chatHeader.textContent = "Select a chat";
      }
    });

    chatList.appendChild(li);
  });
}

// --- Open Chat ---
function openChat(chatId, participants) {
  currentChatId = chatId;
  chatHeader.textContent = participants.join(", ");
  messagesDiv.innerHTML = "";

  if (unsubscribeMessages) unsubscribeMessages();

  const msgsQuery = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt")
  );

  unsubscribeMessages = onSnapshot(msgsQuery, async (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach((msgSnap) => renderMessage(msgSnap.id, msgSnap.data()));
    messagesDiv.scrollTo({
      top: messagesDiv.scrollHeight,
      behavior: "smooth"
    });

    // mark unread messages as read
    snapshot.forEach(async (msgSnap) => {
      const msg = msgSnap.data();
      if (!msg.readBy?.includes(currentUser.email)) {
        const msgRef = doc(db, "chats", chatId, "messages", msgSnap.id);
        await updateDoc(msgRef, {
          readBy: [...(msg.readBy || []), currentUser.email],
        });
      }
    });
  });

  document
    .querySelectorAll("#chatList li")
    .forEach((li) => li.classList.remove("active"));
  const activeLi = [...document.querySelectorAll("#chatList li")].find(
    (li) => li.dataset.id === chatId
  );
  if (activeLi) activeLi.classList.add("active");
}

// --- Render Message ---
function renderMessage(id, msg) {
  const div = document.createElement("div");
  div.className = "msg " + (msg.sender === currentUser.email ? "mine" : "theirs");

  let content = `<div>${msg.text || ""}</div>`;
  if (msg.fileUrl) {
    if (msg.fileType?.startsWith("image/")) {
      content += `<img src="${msg.fileUrl}" class="msg-media" />`;
    } else if (msg.fileType?.startsWith("video/")) {
      content += `<video controls playsinline class="msg-video">
                    <source src="${msg.fileUrl}" type="${msg.fileType}">
                  </video>`;
    }
  }
  content += `<div class="timestamp">${new Date(
    msg.createdAt
  ).toLocaleString()}</div>`;
  if (msg.sender === currentUser.email) {
    content += `<button class="delete-btn" data-id="${id}">×</button>`;
  }

  div.innerHTML = content;

  const delBtn = div.querySelector(".delete-btn");
  if (delBtn) {
    delBtn.onclick = async () => {
      await deleteDoc(doc(db, "chats", currentChatId, "messages", id));
    };
  }

  messagesDiv.appendChild(div);
}

// --- Send Message ---
sendBtn?.addEventListener("click", sendMessage);
messageInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

async function sendMessage() {
  if (!currentChatId) return;
  const text = messageInput.value.trim();
  const file = fileInput?.files?.[0];
  if (!text && !file) return;

  let fileUrl = null,
    fileType = null;
  if (file) {
    fileType = file.type;
    const storageRef = ref(
      storage,
      `chats/${currentChatId}/${Date.now()}_${file.name}`
    );
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
  }

  await addDoc(collection(db, "chats", currentChatId, "messages"), {
    text,
    sender: currentUser.email,
    createdAt: Date.now(),
    fileUrl,
    fileType,
    readBy: [currentUser.email],
  });

  // ✅ Safe clear for mobile
  setTimeout(() => {
    messageInput.value = "";
    messageInput.blur();
    if (fileInput) fileInput.value = "";
  }, 50);
}

// --- Start New Chat ---
startChatBtn?.addEventListener("click", async () => {
  const emails = newChatInput.value
    .split(",")
    .map((e) => e.trim()) // keep case sensitivity
    .filter(Boolean);
  if (emails.length === 0) return;
  if (!emails.includes(currentUser.email)) emails.push(currentUser.email);

  await addDoc(collection(db, "chats"), {
    participants: emails,
    createdAt: Date.now(),
  });

  newChatInput.value = "";
  alert("💡 Tip: Enter emails comma-separated, in lowercase for best results.");
});
