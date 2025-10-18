// auth-guard.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.warn("🚪 No user session — redirecting to login...");
    window.location.replace("./index.html");
  } else {
    console.log("🔒 Authenticated as:", user.email);
  }
});


