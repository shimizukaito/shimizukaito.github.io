const root = document.documentElement;
const toggle = document.querySelector(".theme-toggle");
const savedTheme = localStorage.getItem("portfolio-theme");
if (savedTheme === "dark") {
  root.classList.add("dark");
}

toggle?.addEventListener("click", () => {
  root.classList.toggle("dark");
  localStorage.setItem("portfolio-theme", root.classList.contains("dark") ? "dark" : "light");
});

