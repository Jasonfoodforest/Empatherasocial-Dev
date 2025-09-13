// feed-logic.js
function submitPost() {
  const fileInput = document.getElementById("file");
  const captionInput = document.getElementById("caption");
  const file = fileInput.files[0];
  const caption = captionInput.value.trim();

  if (!file || !caption) {
    alert("Missing file or caption.");
    return;
  }

  const storageRef = storage.ref().child("uploads/" + file.name);
  storageRef.put(file).then(snapshot => {
    return snapshot.ref.getDownloadURL();
  }).then(url => {
    return db.collection("posts").add({
      url: url,
      caption: caption,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }).then(() => {
    alert("Upload successful!");
    fileInput.value = "";
    captionInput.value = "";
    loadPosts();
  }).catch(error => {
    console.error("Error uploading file:", error);
    alert("Upload failed.");
  });
}

let posts = [];
let currentPage = 0;
const postsPerPage = 1;

function renderFeed() {
  const container = document.getElementById("feedContainer");
  container.innerHTML = "";

  const start = currentPage * postsPerPage;
  const pagePosts = posts.slice(start, start + postsPerPage);

  for (const post of pagePosts) {
    const div = document.createElement("div");
    div.className = "post";

    if (post.url.endsWith(".mp4")) {
      const video = document.createElement("video");
      video.src = post.url;
      video.controls = true;
      div.appendChild(video);
    } else {
      const img = document.createElement("img");
      img.src = post.url;
      div.appendChild(img);
    }

    const caption = document.createElement("p");
    caption.textContent = post.caption;
    div.appendChild(caption);

    container.appendChild(div);
  }
}

function nextPage() {
  if ((currentPage + 1) * postsPerPage < posts.length) {
    currentPage++;
    renderFeed();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    renderFeed();
  }
}

function loadPosts() {
  db.collection("posts").orderBy("createdAt", "desc").get().then(snapshot => {
    posts = snapshot.docs.map(doc => doc.data());
    renderFeed();
  }).catch(error => {
    console.error("Error loading posts:", error);
  });
}