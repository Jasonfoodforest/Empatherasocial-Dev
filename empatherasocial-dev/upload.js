// upload.js
import { app, storage, db, auth } from './firebase-config.js';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

document.getElementById("postBtn").addEventListener("click", async () => {
  const caption = document.getElementById("captionInput").value;
  const file = document.getElementById("fileInput").files[0];

  if (!caption || !file) {
    alert("Please provide both a caption and a file.");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    alert("You must be signed in to post.");
    return;
  }

  try {
    const storageRef = ref(storage, `posts/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);
    const fileURL = await getDownloadURL(storageRef);

    await addDoc(collection(db, "posts"), {
      caption: caption,
      imageUrl: fileURL,
      createdAt: serverTimestamp(),
      userEmail: user.email
    });

    alert("Post uploaded successfully!");
    document.getElementById("captionInput").value = "";
    document.getElementById("fileInput").value = "";
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Something went wrong. Try again.");
  }
});

