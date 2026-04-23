let allScans = [];

async function loadHistory() {
  try {
    const resp = await fetch(`${API_BASE}/history`);
    allScans = await resp.json();
    renderHistory(allScans);
  } catch {
    document.getElementById("historyGrid").innerHTML = '<div class="empty-state">Erreur de chargement</div>';
  }
}

function renderHistory(scans) {
  const grid = document.getElementById("historyGrid");
  if (!scans.length) {
    grid.innerHTML = '<div class="empty-state">Aucun scan pour le moment</div>';
    return;
  }
  grid.innerHTML = scans.map(s => {
    const report = s.ai_report || {};
    const imgSrc = s.image_path ? `${API_BASE}/image/${s.image_path}` : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='160'%3E%3Crect fill='%231a2e1a' width='260' height='160'/%3E%3Ctext x='50%25' y='50%25' fill='%2352b788' text-anchor='middle' dy='.3em' font-size='40'%3E🌿%3C/text%3E%3C/svg%3E";
    return `
    <div class="history-card" onclick="openScanModal(${s.id})">
      <img src="${imgSrc}" alt="${s.common_name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22260%22 height=%22160%22%3E%3Crect fill=%22%231a2e1a%22 width=%22260%22 height=%22160%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%2352b788%22 text-anchor=%22middle%22 dy=%22.3em%22 font-size=%2240%22%3E🌿%3C/text%3E%3C/svg%3E'"/>
      <div class="history-card-body">
        <h4>${s.common_name || "Plante inconnue"}</h4>
        <p class="sci">${s.scientific_name || ""}</p>
        <div class="history-card-badges">
          <span class="mini-badge badge ${badgeClass(s.is_edible)}">🍽️ ${s.is_edible || "?"}</span>
          <span class="mini-badge badge ${badgeClass(s.is_toxic)}">⚠️ ${s.is_toxic || "?"}</span>
        </div>
        <p class="date">${formatDate(s.created_at)}</p>
      </div>
    </div>`;
  }).join("");
}

// Recherche
document.getElementById("historySearch").addEventListener("input", e => {
  const q = e.target.value.toLowerCase();
  renderHistory(allScans.filter(s =>
    (s.common_name || "").toLowerCase().includes(q) ||
    (s.scientific_name || "").toLowerCase().includes(q)
  ));
});

// Modal détail
async function openScanModal(id) {
  const resp = await fetch(`${API_BASE}/scan/${id}`);
  const scan = await resp.json();
  const report = scan.ai_report || {};

  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  const imgSrc = scan.image_path ? `${API_BASE}/image/${scan.image_path}` : "";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-close">
        <h3>${scan.common_name || "Plante"}</h3>
        <button onclick="this.closest('.modal-overlay').remove()">✕</button>
      </div>
      <div style="padding:1.5rem">
        ${imgSrc ? `<img src="${imgSrc}" style="width:100%;max-height:250px;object-fit:cover;border-radius:12px;margin-bottom:1rem" alt=""/>` : ""}
        <p style="color:var(--text-muted);font-style:italic;margin-bottom:0.5rem">${scan.scientific_name || ""}</p>
        <p style="color:var(--accent);font-size:0.85rem;margin-bottom:1rem">Famille : ${scan.family || "?"} | Confiance : ${scan.confidence || 0}%</p>
        <div class="badges-row" style="padding:0;margin-bottom:1rem">
          <span class="badge ${badgeClass(scan.is_edible)}">🍽️ Comestible : ${scan.is_edible || "?"}</span>
          <span class="badge ${badgeClass(scan.is_medicinal)}">💊 Médicinal : ${scan.is_medicinal || "?"}</span>
          <span class="badge ${badgeClass(scan.is_toxic)}">⚠️ Toxique : ${scan.is_toxic || "?"}</span>
          <span class="badge ${badgeClass(scan.is_invasive)}">🌍 Invasif : ${scan.is_invasive || "?"}</span>
        </div>
        <div class="result-section" style="margin-bottom:0.75rem"><h3>🌿 Santé</h3><p>${report.health_status || scan.health_status || "N/A"}</p></div>
        <div class="result-section" style="margin-bottom:0.75rem"><h3>🍽️ Comestibilité</h3><p>${report.edible_details || "N/A"}</p></div>
        <div class="result-section" style="margin-bottom:0.75rem"><h3>💊 Médicinal</h3><p>${report.medicinal_details || "N/A"}</p></div>
        <div class="result-section" style="margin-bottom:0.75rem"><h3>⚠️ Toxicité</h3><p>${report.toxic_details || "N/A"}</p></div>
        <div class="result-section"><h3>🌍 Environnement</h3><p>${report.environmental_impact || "N/A"}</p></div>
        <p style="color:var(--text-muted);font-size:0.8rem;margin-top:1rem">Scanné le ${formatDate(scan.created_at)}</p>
      </div>
    </div>`;
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

window.openScanModal = openScanModal;
