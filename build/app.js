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

document.querySelectorAll("a[data-tab]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const id = link.dataset.tab;
    activateTab(id);
    history.replaceState(null, "", "#" + id);
    if (id === "anatomy") mountBloc3D();
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
    viewerPromise = import("./bloc3d.js?v=20")
      .then((mod) => mod.initBloc3D(el))
      .catch((err) => {
        console.error(err);
        el.textContent = "3D를 불러오지 못했습니다. 네트워크에서 three.js CDN을 허용하는지 확인하십시오.";
      });
  } else {
    viewerPromise.then((api) => api?.resize?.());
  }
}

const CITE_DOCS = {
  662: "API 662 2nd Ed. (April 2002) / ISO 15547:2000",
  "662-1": "API 662-1 1st Ed. (Feb 2006, reaffirmed 2011)",
  667: "API 667 1st Ed. (March 2022), formerly 662-1",
  810: "API 810 1st Ed. (Oct 2025) / Errata 1 (July 2026)",
  IOM: "벤더 IOM · API 조항이 아님",
  NOTE: "학습 노트 · 단일 조항이 아님",
};

const citePop = document.createElement("div");
citePop.className = "cite-pop";
citePop.id = "cite-pop";
citePop.hidden = true;
citePop.setAttribute("role", "dialog");
citePop.setAttribute("aria-label", "출처 위치");
document.body.appendChild(citePop);

let citeOpen = null;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function parseCite(raw) {
  return raw.split("|").map((part) => {
    const cut = part.indexOf(":");
    const code = (cut === -1 ? part : part.slice(0, cut)).trim();
    const para = (cut === -1 ? "" : part.slice(cut + 1)).trim();
    return { code, para, title: CITE_DOCS[code] || code };
  });
}

function closeCite() {
  citePop.hidden = true;
  citePop.innerHTML = "";
  if (citeOpen) citeOpen.setAttribute("aria-expanded", "false");
  citeOpen = null;
}

function placeCitePop(button) {
  const box = button.getBoundingClientRect();
  citePop.style.left = "12px";
  citePop.style.top = `${box.bottom + 8}px`;
  const pop = citePop.getBoundingClientRect();
  let left = box.left;
  let top = box.bottom + 8;
  if (left + pop.width > window.innerWidth - 12) left = window.innerWidth - pop.width - 12;
  if (top + pop.height > window.innerHeight - 12) top = box.top - pop.height - 8;
  if (left < 12) left = 12;
  if (top < 12) top = 12;
  citePop.style.left = `${left}px`;
  citePop.style.top = `${top}px`;
}

function openCite(button) {
  const items = parseCite(button.dataset.cite || "");
  citePop.innerHTML = `
    <p class="cite-pop-kicker">출처 위치</p>
    <ul>
      ${items
        .map(
          (item) => `
        <li>
          <strong>${escapeHtml(item.title)}</strong>
          <div class="para">${escapeHtml(item.para)}</div>
        </li>`
        )
        .join("")}
    </ul>
    <p class="cite-pop-note">조항 위치만 표시합니다. 원문을 붙여 넣지 않았습니다. 해당 표준을 직접 확인하십시오.</p>
  `;
  citePop.hidden = false;
  button.setAttribute("aria-expanded", "true");
  citeOpen = button;
  placeCitePop(button);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(".cite");
  if (button) {
    event.preventDefault();
    if (citeOpen === button) {
      closeCite();
      return;
    }
    if (citeOpen) citeOpen.setAttribute("aria-expanded", "false");
    openCite(button);
    return;
  }
  if (!citePop.hidden && !event.target.closest("#cite-pop")) closeCite();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeCite();
});

window.addEventListener("scroll", () => {
  if (citeOpen) placeCitePop(citeOpen);
}, true);

window.addEventListener("resize", closeCite);
