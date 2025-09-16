const express = require("express");
const path = require("path");

const app = express();

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, "public")));

// Default route → load index.html from public
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}, serving files from /public`);
});