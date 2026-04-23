// Sur Railway : même domaine. En local : port 5000
const API_BASE = window.location.port === "8080"
  ? `http://${window.location.hostname}:5000/api`
  : `${window.location.origin}/api`;

document.querySelectorAll(".nav-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(s => s.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
    if (tab.dataset.tab === "history") loadHistory();
    if (tab.dataset.tab === "dashboard") loadDashboard();
  });
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}

function badgeClass(val) {
  if (!val) return "badge-no";
  const v = val.toLowerCase();
  if (v === "oui") return "badge-yes";
  if (v === "non") return "badge-no";
  return "badge-partial";
}

function formatDate(dt) {
  return new Date(dt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

window.API_BASE = API_BASE;
window.badgeClass = badgeClass;
window.formatDate = formatDate;
