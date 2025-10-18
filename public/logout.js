// logout.js
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

document.addEventListener("DOMContentLoaded", () => {
  // Supports multiple logout button IDs if different pages use different naming
  const logoutBtns = [
    document.getElementById("btnLogout"),
    document.getElementById("logoutBtn"),
    document.querySelector("a[href='logout.html']"),
  ].filter(Boolean);

  logoutBtns.forEach((el) => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        console.log("✅ User signed out successfully.");
        // Clear cached user data
        localStorage.removeItem("user");
        sessionStorage.clear();
        // Redirect cleanly to login page
        window.location.replace("./index.html");
      } catch (err) {
        console.error("Logout failed:", err);
        alert("Logout failed. Please refresh and try again.");
      }
    });
  });
});
