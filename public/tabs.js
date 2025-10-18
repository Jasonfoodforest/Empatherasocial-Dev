// Highlight the active tab
const active = document.body.dataset.active;
document.querySelectorAll("nav a").forEach(a => {
  if (active && a.href.includes(`${active}.html`)) {
    a.classList.add("active");
  }
});
