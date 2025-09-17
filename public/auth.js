// Auth logic for EmpathEra Social
const el = (id) => document.getElementById(id);
const inEmail = el("inEmail");
const inPass = el("inPass");
const btnSignIn = el("btnSignIn");
const btnCreate = el("btnCreate");
const btnGoogle = el("btnGoogle");
const btnFacebook = el("btnFacebook");
const errEl = el("err");
el("yr").textContent = new Date().getFullYear();

function showErr(e) {
  console.error(e);
  const msg = e?.message || String(e) || "Something went wrong.";
  errEl.textContent = msg.replace("Firebase: ", "");
  setTimeout(() => errEl.textContent = "", 6000);
}

function goHome() {
  window.location.replace("./feed.html");
}

// Monitor auth state changes
firebase.auth().onAuthStateChanged((u) => {
  if (u) goHome();
});

// Sign in with email/password
btnSignIn.onclick = async () => {
  try {
    await firebase.auth().signInWithEmailAndPassword(inEmail.value, inPass.value);
    goHome();
  } catch (e) {
    showErr(e);
  }
};

// Create new account
btnCreate.onclick = async () => {
  try {
    await firebase.auth().createUserWithEmailAndPassword(inEmail.value, inPass.value);
    goHome();
  } catch (e) {
    showErr(e);
  }
};

// Google sign-in
btnGoogle.onclick = async () => {
  try {
    await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
    goHome();
  } catch (e) {
    showErr(e);
  }
};

// Facebook sign-in
btnFacebook.onclick = async () => {
  try {
    await firebase.auth().signInWithPopup(new firebase.auth.FacebookAuthProvider());
    goHome();
  } catch (e) {
    showErr(e);
  }
};