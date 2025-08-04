// message.js
import { auth, db } from './firebase-config.js';
import {
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  query,
  orderBy,
  getDocs
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

document.addEventListener("DOMContentLoaded", () => {
  const usersList = document.getElementById("users");
  const messageInput = document.getElementById("messageInput");
  const sendBtn = document.getElementById("sendBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  let currentUser = null;
  let selectedUser = null;

  // Listen for auth changes
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      loadUsers(user.email);
    } else {
      window.location.href = "index.html";
    }
  });

  // Logout handler
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });

  // Load users list
  async function loadUsers(currentEmail) {
    usersList.innerHTML = "<p>Loading...</p>";
    const usersRef = collection(db, "users");
    const usersSnapshot = await getDocs(usersRef);
    usersList.innerHTML = "";

    usersSnapshot.forEach((docSnap) => {
      const user = docSnap.data();
      if (user.email !== currentEmail) {
        const li = document.createElement("li");
        li.textContent = user.name || user.email;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
          selectedUser = user;
          alert("Selected: " + (user.name || user.email));
        });
        usersList.appendChild(li);
      }
    });
  }

  // Send message
  sendBtn.addEventListener("click", async () => {
    const text = messageInput.value.trim();
    if (!text || !selectedUser) return;

    const messagesRef = collection(db, "messages");
    await addDoc(messagesRef, {
      from: currentUser.email,
      to: selectedUser.email,
      message: text,
      createdAt: new Date()
    });

    messageInput.value = "";
  });
});




