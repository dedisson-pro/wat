let chartCat = null, chartAct = null, chartTop = null;

async function loadDashboard() {
  try {
    const resp = await fetch(`${API_BASE}/dashboard`);
    const stats = await resp.json();
    renderDashboard(stats);
  } catch {
    console.error("Erreur dashboard");
  }
}

function renderDashboard(stats) {
  document.getElementById("statTotal").textContent = stats.total || 0;
  document.getElementById("statEdible").textContent = stats.by_category?.edible || 0;
  document.getElementById("statMedicinal").textContent = stats.by_category?.medicinal || 0;
  document.getElementById("statToxic").textContent = stats.by_category?.toxic || 0;

  const chartDefaults = {
    color: "#e8f5e9",
    plugins: { legend: { labels: { color: "#81c784" } } },
    scales: {
      x: { ticks: { color: "#81c784" }, grid: { color: "rgba(45,106,79,0.3)" } },
      y: { ticks: { color: "#81c784" }, grid: { color: "rgba(45,106,79,0.3)" } }
    }
  };

  // Donut catégories
  const catCtx = document.getElementById("chartCategories").getContext("2d");
  if (chartCat) chartCat.destroy();
  chartCat = new Chart(catCtx, {
    type: "doughnut",
    data: {
      labels: ["Comestibles", "Médicinales", "Toxiques", "Invasives"],
      datasets: [{
        data: [
          stats.by_category?.edible || 0,
          stats.by_category?.medicinal || 0,
          stats.by_category?.toxic || 0,
          stats.by_category?.invasive || 0
        ],
        backgroundColor: ["#52b788", "#64b5f6", "#e57373", "#ffb74d"],
        borderColor: "#1a2e1a",
        borderWidth: 2
      }]
    },
    options: {
      plugins: { legend: { labels: { color: "#81c784" } } },
      cutout: "65%"
    }
  });

  // Activité 7 jours
  const actCtx = document.getElementById("chartActivity").getContext("2d");
  if (chartAct) chartAct.destroy();
  const recent = (stats.recent || []).reverse();
  chartAct = new Chart(actCtx, {
    type: "line",
    data: {
      labels: recent.map(r => r.day),
      datasets: [{
        label: "Scans",
        data: recent.map(r => r.count),
        borderColor: "#52b788",
        backgroundColor: "rgba(82,183,136,0.15)",
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#52b788"
      }]
    },
    options: { ...chartDefaults, plugins: { legend: { display: false } } }
  });

  // Top plantes
  const topCtx = document.getElementById("chartTopPlants").getContext("2d");
  if (chartTop) chartTop.destroy();
  const top = stats.top_plants || [];
  chartTop = new Chart(topCtx, {
    type: "bar",
    data: {
      labels: top.map(p => p.scientific_name || "Inconnu"),
      datasets: [{
        label: "Nombre de scans",
        data: top.map(p => p.count),
        backgroundColor: "rgba(82,183,136,0.7)",
        borderColor: "#52b788",
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: { ...chartDefaults, plugins: { legend: { display: false } } }
  });
}
