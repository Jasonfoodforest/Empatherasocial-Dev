import { auth, db, storage } from "./firebase-config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-storage.js";

let me = null;
let currentChatId = null;

// DOM elements
const chatList = document.getElementById("chatList");
const chatHeader = document.getElementById("chatHeader");
const messagesDiv = document.getElementById("messages");
const msgInput = document.getElementById("msgInput");
const fileInput = document.getElementById("fileInput");
const sendBtn = document.getElementById("sendBtn");
const startChatBtn = document.getElementById("startChatBtn");
const newChatEmail = document.getElementById("newChatEmail");

// track unsubscribe
let unsubscribeMessages = null;

// auth state
auth.onAuthStateChanged((u) => {
  if (!u) {
    location.href = "./index.html";
    return;
  }
  me = u;
  loadChats();
});

// load chat list
function loadChats() {
  const q = query(collection(db, "chats"), orderBy("lastAt", "desc"));
  onSnapshot(q, (snapshot) => {
    chatList.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const chat = docSnap.data();
      if (chat.participants && chat.participants.includes(me.email)) {
        const li = document.createElement("li");
        li.textContent = chat.participants
          .filter((p) => p !== me.email)
          .join(", ");
        li.style.cursor = "pointer";
        li.onclick = () => openChat(docSnap.id, chat.participants);
        chatList.appendChild(li);
      }
    });
  });
}

// open chat
async function openChat(chatId, participants) {
  currentChatId = chatId;
  chatHeader.textContent = "Chat with: " + participants.join(", ");
  messagesDiv.innerHTML = "";

  if (unsubscribeMessages) unsubscribeMessages();

  const msgsRef = collection(db, "messages");
  const q = query(msgsRef, orderBy("createdAt", "asc"));
  unsubscribeMessages = onSnapshot(q, (snapshot) => {
    messagesDiv.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const msg = docSnap.data();
      if (msg.chatId === chatId) {
        const div = document.createElement("div");
        div.style.border = "1px solid #ddd";
        div.style.margin = "5px";
        div.style.padding = "5px";
        div.style.borderRadius = "6px";

        // Text
        if (msg.text) {
          const p = document.createElement("p");
          p.textContent = `${msg.from}: ${msg.text}`;
          div.appendChild(p);
        }

        // File preview by MIME type
        if (msg.fileUrl) {
          if (msg.fileType?.startsWith("image/")) {
            const img = document.createElement("img");
            img.src = msg.fileUrl;
            img.style.maxWidth = "200px";
            img.style.display = "block";
            div.appendChild(img);
          } else if (msg.fileType?.startsWith("video/")) {
            const video = document.createElement("video");
            video.src = msg.fileUrl;
            video.controls = true;
            video.style.maxWidth = "300px";
            video.style.display = "block";
            div.appendChild(video);
          } else if (msg.fileType?.startsWith("audio/")) {
            const audio = document.createElement("audio");
            audio.src = msg.fileUrl;
            audio.controls = true;
            audio.style.display = "block";
            div.appendChild(audio);
          } else {
            // Fallback link
            const link = document.createElement("a");
            link.href = msg.fileUrl;
            link.target = "_blank";
            link.textContent = "Download File";
            div.appendChild(link);
          }
        }

        // Timestamp
        if (msg.createdAt?.toDate) {
          const time = document.createElement("small");
          time.textContent = msg.createdAt.toDate().toLocaleString();
          div.appendChild(document.createElement("br"));
          div.appendChild(time);
        }

        messagesDiv.appendChild(div);
      }
    });

    // ✅ Auto-scroll to bottom
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
}

// send message
sendBtn.onclick = async () => {
  if (!currentChatId) {
    alert("Please select a chat first");
    return;
  }

  let fileUrl = null;
  let fileType = null;

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    const storageRef = ref(
      storage,
      `chat-uploads/${me.uid}/${Date.now()}_${file.name}`,
    );
    await uploadBytes(storageRef, file);
    fileUrl = await getDownloadURL(storageRef);
    fileType = file.type; // ✅ keep MIME type
  }

  await addDoc(collection(db, "messages"), {
    chatId: currentChatId,
    from: me.email,
    text: msgInput.value,
    fileUrl,
    fileType, // ✅ stored in Firestore
    createdAt: serverTimestamp(),
  });

  // update lastMsg in chats
  const chatRef = doc(db, "chats", currentChatId);
  await setDoc(
    chatRef,
    {
      lastMsg: msgInput.value || (fileUrl ? "File" : ""),
      lastAt: serverTimestamp(),
    },
    { merge: true },
  );

  msgInput.value = "";
  fileInput.value = "";
};

// start new chat
startChatBtn.onclick = async () => {
  const email = newChatEmail.value.trim();
  if (!email) return;

  const participants = [me.email, email].sort();
  const chatId = participants.join("_");

  const chatRef = doc(db, "chats", chatId);
  const chatSnap = await getDoc(chatRef);
  if (!chatSnap.exists()) {
    await setDoc(chatRef, {
      participants,
      lastMsg: "",
      lastAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }

  openChat(chatId, participants);
  newChatEmail.value = "";
};
