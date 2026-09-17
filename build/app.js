const tabs = document.querySelectorAll(".tabs button");
const panels = document.querySelectorAll(".panel");
let viewerPromise;

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
      mountBloc3D();
    } else if (button.dataset.tab === "p667") {
      history.replaceState(null, "", "#p667");
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
  mountBloc3D();
  if (hash !== "anatomy") {
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
} else if (hash === "p667") {
  activateTab("p667");
}

function mountBloc3D() {
  const el = document.getElementById("bloc-3d");
  if (!el) return;
  if (!viewerPromise) {
    viewerPromise = import("./bloc3d.js?v=16")
      .then((mod) => mod.initBloc3D(el))
      .catch((err) => {
        console.error(err);
        el.textContent = "3D를 불러오지 못했습니다. 네트워크에서 three.js CDN을 허용하는지 확인하십시오.";
      });
  } else {
    viewerPromise.then((api) => api?.resize?.());
  }
}
