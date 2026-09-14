const tabs = document.querySelectorAll(".tabs button");
const panels = document.querySelectorAll(".panel");

tabs.forEach((button) => {
  button.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("active"));
    panels.forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.tab).classList.add("active");
  });
});
