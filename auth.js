// auth.js

firebase.auth().onAuthStateChanged((user) => {
  if (!user) {
    window.location.href = "index.html";
  }
});

function logout() {
  firebase.auth().signOut()
    .then(() => {
      alert("Signed out successfully.");
      window.location.href = "index.html";
    })
    .catch((error) => {
      console.error("Logout error:", error);
    });
}

