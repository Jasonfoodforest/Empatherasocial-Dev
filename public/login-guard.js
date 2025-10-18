import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";

onAuthStateChanged(auth, (user) => {
  if (user) {
    // Already logged in? -> skip login page
    window.location.href = "./feed.html";
  }
});
