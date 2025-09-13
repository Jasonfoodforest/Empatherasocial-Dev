// server.js — serve from project root + simple clean-url routing + demo API
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(express.json());

// Serve ALL static files from the project root (CSS, JS, images, *.html if directly linked)
const ROOT = __dirname;
app.use(express.static(ROOT));

// Helper: serve a file if it exists
function sendIfExists(res, fileName, fallback = null, statusCode = 200) {
  const p = path.join(ROOT, fileName);
  if (fs.existsSync(p)) {
    return res.status(statusCode).sendFile(p);
  }
  if (fallback) {
    const f = path.join(ROOT, fallback);
    if (fs.existsSync(f)) return res.status(statusCode).sendFile(f);
  }
  return res.status(404).send("404 Not Found");
}

// 1) Home routes
app.get("/", (_req, res) => {
  // Prefer home.html, then index.html
  if (fs.existsSync(path.join(ROOT, "home.html"))) return res.sendFile(path.join(ROOT, "home.html"));
  if (fs.existsSync(path.join(ROOT, "index.html"))) return res.sendFile(path.join(ROOT, "index.html"));
  return res.status(404).send("home.html or index.html not found");
});

// 2) Named aliases you mentioned
app.get("/messages", (_req, res) => sendIfExists(res, "messages-copy.html", "messages.html"));
app.get("/group",    (_req, res) => sendIfExists(res, "group.html"));
app.get("/uploader", (_req, res) => sendIfExists(res, "fire-uploader.html"));

// 3) Generic clean-URL matcher: /about -> about.html, /contact -> contact.html, /feed -> feed.html, etc.
app.get("/:slug", (req, res, next) => {
  const htmlFile = `${req.params.slug}.html`;
  const p = path.join(ROOT, htmlFile);
  if (fs.existsSync(p)) return res.sendFile(p);
  return next(); // not found here → let 404 handler run
});

// 4) API demo you’ll replace with real AI later
app.post("/api/echo", (req, res) => {
  const text = (req.body && req.body.message) || "";
  res.json({ reply: `EmpathEra AI (demo): ${text}` });
});

// 5) 404 fallback → use your 404.html if present
app.use((_req, res) => {
  const p404 = path.join(ROOT, "404.html");
  if (fs.existsSync(p404)) return res.status(404).sendFile(p404);
  return res.status(404).send("404 Not Found");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server on http://localhost:${port}`));
