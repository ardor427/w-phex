const tabs = document.querySelectorAll(".tabs button");
const panels = document.querySelectorAll(".panel");

function activateTab(id) {
  const button = document.querySelector(`.tabs button[data-tab="${id}"]`);
  const panel = document.getElementById(id);
  if (!button || !panel) return;
  tabs.forEach((item) => item.classList.remove("active"));
  panels.forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  panel.classList.add("active");
}

tabs.forEach((button) => {
  button.addEventListener("click", () => {
    activateTab(button.dataset.tab);
    if (button.dataset.tab === "anatomy") {
      history.replaceState(null, "", "#anatomy");
    } else {
      history.replaceState(null, "", location.pathname);
    }
  });
});

const anatomyIds = new Set([
  "anatomy",
  "outside",
  "names",
  "axes",
  "plate",
  "pack",
  "column",
  "comb",
  "head",
  "panel",
  "baffle",
  "nozzle",
  "loads",
  "open",
]);

const hash = location.hash.replace("#", "");
if (anatomyIds.has(hash)) {
  activateTab("anatomy");
  if (hash !== "anatomy") {
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}
