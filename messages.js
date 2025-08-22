import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  addDoc,
  getDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { auth, db } from "./firebase-config.js"; // ✅ direct import

// ------------------ Elements ------------------
const createChatBtn = document.getElementById("createChatBtn");
const chatIdInput = document.getElementById("chatId");
const participantsInput = document.getElementById("participants");

const sendMessageBtn = document.getElementById("sendMessageBtn");
const chatIdMessageInput = document.getElementById("currentChatId"); 
const messageInput = document.getElementById("messageInput");
const messagesDiv = document.getElementById("messages");

// ------------------ Create Chat ------------------
createChatBtn.addEventListener("click", async () => {
  const chatId = chatIdInput.value.trim();
  const participantsRaw = participantsInput.value.trim();

  if (!chatId || !participantsRaw) {
    alert("Chat ID aur participants fill karo!");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Login required!");
    return;
  }

  const participants = participantsRaw.split(",").map(uid => uid.trim());
  if (!participants.includes(user.uid)) {
    participants.push(user.uid);
  }

  try {
    await setDoc(doc(db, "messages", chatId), {
      participants: participants,
      createdAt: serverTimestamp()
    });
    alert("Chat created successfully!");
  } catch (error) {
    console.error("Error creating chat:", error);
  }
});

// ------------------ Send Message ------------------
sendMessageBtn.addEventListener("click", async () => {
  const chatId = chatIdMessageInput.value.trim();
  const text = messageInput.value.trim();

  if (!chatId || !text) {
    alert("Chat ID aur message fill karo!");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("Login required!");
    return;
  }

  try {
    const chatDoc = await getDoc(doc(db, "messages", chatId));
    if (!chatDoc.exists()) {
      alert("Chat does not exist!");
      return;
    }

    const chatData = chatDoc.data();
    if (!chatData.participants.includes(user.uid)) {
      alert("Aap is chat ke participant nahi ho!");
      return;
    }

    await addDoc(collection(db, "messages", chatId, "chats"), {
      sender: user.uid,
      text: text,
      createdAt: serverTimestamp()
    });
    messageInput.value = "";
  } catch (error) {
    console.error("Error sending message:", error);
  }
});

// ------------------ Realtime Messages ------------------
function listenForMessages(chatId) {
  const q = query(
    collection(db, "messages", chatId, "chats"),
    orderBy("createdAt", "asc")
  );

  onSnapshot(q, snapshot => {
    messagesDiv.innerHTML = "";
    snapshot.forEach(doc => {
      const msg = doc.data();
      const div = document.createElement("div");
      div.textContent = `${msg.sender}: ${msg.text}`;
      messagesDiv.appendChild(div);
    });
  });
}

// ------------------ Auth Listener ------------------
onAuthStateChanged(auth, user => {
  if (user) {
    console.log("Logged in as:", user.uid);
    sendMessageBtn.disabled = false;

    chatIdMessageInput.addEventListener("change", async () => {
      const chatId = chatIdMessageInput.value.trim();
      if (!chatId) return;

      const chatDoc = await getDoc(doc(db, "messages", chatId));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        if (chatData.participants.includes(user.uid)) {
          listenForMessages(chatId);
        } else {
          alert("Aap is chat ke participant nahi ho!");
        }
      } else {
        alert("Chat not found!");
      }
    });
  } else {
    console.log("User not logged in");
    sendMessageBtn.disabled = true;
  }
});
