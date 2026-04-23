let currentScanId = null;
let chatHistory = [];
let selectedImageB64 = null;

const uploadZone = document.getElementById("uploadZone");
const uploadInner = document.getElementById("uploadInner");
const previewContainer = document.getElementById("previewContainer");
const previewImg = document.getElementById("previewImg");
const fileInput = document.getElementById("fileInput");
const resultCard = document.getElementById("resultCard");
const loadingOverlay = document.getElementById("loadingOverlay");

// Drag & drop
uploadZone.addEventListener("dragover", e => { e.preventDefault(); uploadZone.classList.add("drag-over"); });
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", e => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith("image/")) handleFile(file);
});

document.getElementById("btnGallery").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", e => e.target.files[0] && handleFile(e.target.files[0]));
document.getElementById("btnCamera").addEventListener("click", openCameraModal);

document.getElementById("btnReset").addEventListener("click", () => {
  uploadInner.classList.remove("hidden");
  previewContainer.classList.add("hidden");
  resultCard.classList.add("hidden");
  selectedImageB64 = null;
  fileInput.value = "";
});

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    selectedImageB64 = e.target.result;
    previewImg.src = selectedImageB64;
    uploadInner.classList.add("hidden");
    previewContainer.classList.remove("hidden");
    resultCard.classList.add("hidden");
  };
  reader.readAsDataURL(file);
}

// ── MODAL CAMÉRA ─────────────────────────────────────────────
// Sur mobile : getUserMedia (caméra native du téléphone)
// Sur PC     : OpenCV backend (capture webcam serveur)
function openCameraModal() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (isMobile) {
    openMobileCamera();
  } else {
    openPCCamera();
  }
}

function openMobileCamera() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:560px">
      <div class="modal-close">
        <h3>📷 Scanner une plante</h3>
        <button id="btnCloseCamera">✕</button>
      </div>
      <div style="padding:1rem;text-align:center">
        <div style="position:relative;display:inline-block;width:100%">
          <video id="cameraVideo" autoplay playsinline muted
            style="width:100%;border-radius:12px;background:#000;max-height:400px;object-fit:cover;display:block"></video>
          <div style="position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center">
            <div style="width:180px;height:180px;border:2px solid rgba(82,183,136,0.9);border-radius:12px;box-shadow:0 0 0 9999px rgba(0,0,0,0.4)"></div>
          </div>
        </div>
        <p id="camStatus" style="color:var(--text-muted);font-size:0.85rem;margin:0.75rem 0">Démarrage...</p>
        <div style="display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;margin-top:0.5rem">
          <button class="btn btn-primary" id="btnCapture" style="font-size:1.1rem;padding:0.75rem 2rem" disabled>📸 Capturer</button>
          <button class="btn btn-secondary" id="btnSwitchCam">🔄 Retourner</button>
        </div>
        <canvas id="cameraCanvas" style="display:none"></canvas>
      </div>
    </div>`;
  document.body.appendChild(modal);

  let stream = null;
  let facingMode = "environment";

  async function startStream() {
    if (stream) stream.getTracks().forEach(t => t.stop());
    document.getElementById("camStatus").textContent = "Démarrage...";
    document.getElementById("btnCapture").disabled = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      const video = document.getElementById("cameraVideo");
      video.srcObject = stream;
      await video.play();
      document.getElementById("camStatus").textContent = "Centrez la plante dans le cadre";
      document.getElementById("btnCapture").disabled = false;
    } catch (err) {
      document.getElementById("camStatus").textContent = "❌ " + err.message;
    }
  }

  const closeCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    modal.remove();
  };

  document.getElementById("btnCloseCamera").addEventListener("click", closeCamera);
  modal.addEventListener("click", e => { if (e.target === modal) closeCamera(); });
  document.getElementById("btnSwitchCam").addEventListener("click", () => {
    facingMode = facingMode === "environment" ? "user" : "environment";
    startStream();
  });
  document.getElementById("btnCapture").addEventListener("click", () => {
    const video = document.getElementById("cameraVideo");
    const canvas = document.getElementById("cameraCanvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0);
    selectedImageB64 = canvas.toDataURL("image/jpeg", 0.92);
    previewImg.src = selectedImageB64;
    uploadInner.classList.add("hidden");
    previewContainer.classList.remove("hidden");
    resultCard.classList.add("hidden");
    closeCamera();
  });

  startStream();
}

function openPCCamera() {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `
    <div class="modal-content" style="max-width:380px;text-align:center">
      <div class="modal-close">
        <h3>📷 Capture en cours</h3>
        <button id="btnCloseCamera">✕</button>
      </div>
      <div style="padding:2rem">
        <div class="spinner"></div>
        <p style="color:var(--text-muted);margin:1.2rem 0;line-height:1.8">
          📸 Capture de la webcam...<br/>
          <span style="color:var(--green-light);font-weight:600">Placez la plante devant la caméra</span>
        </p>
      </div>
    </div>`;
  document.body.appendChild(modal);

  let cancelled = false;
  const closeModal = () => { cancelled = true; modal.remove(); };
  document.getElementById("btnCloseCamera").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });

  fetch(`${API_BASE}/camera/capture`, { method: "POST" })
    .then(r => r.json())
    .then(data => {
      if (cancelled) return;
      modal.remove();
      if (data.error) { alert("Caméra : " + data.error); return; }
      selectedImageB64 = data.image_b64;
      previewImg.src = selectedImageB64;
      uploadInner.classList.add("hidden");
      previewContainer.classList.remove("hidden");
      resultCard.classList.add("hidden");
    })
    .catch(() => { if (!cancelled) { modal.remove(); alert("Erreur connexion serveur caméra."); } });
}

// ── ANALYSE ──────────────────────────────────────────────────
document.getElementById("btnAnalyze").addEventListener("click", analyzeImage);

async function analyzeImage() {
  if (!selectedImageB64) return;
  loadingOverlay.classList.remove("hidden");
  resultCard.classList.add("hidden");
  chatHistory = [];

  const steps = ["step1", "step2", "step3"];
  let stepIdx = 0;
  const stepInterval = setInterval(() => {
    if (stepIdx > 0) document.getElementById(steps[stepIdx - 1]).classList.replace("active", "done");
    if (stepIdx < steps.length) document.getElementById(steps[stepIdx]).classList.add("active");
    stepIdx++;
    if (stepIdx > steps.length) clearInterval(stepInterval);
  }, 1200);

  let lat = null, lon = null;
  try {
    const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 }));
    lat = pos.coords.latitude; lon = pos.coords.longitude;
  } catch {}

  try {
    const resp = await fetch(`${API_BASE}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_b64: selectedImageB64, latitude: lat, longitude: lon })
    });
    clearInterval(stepInterval);
    steps.forEach(s => { document.getElementById(s).classList.remove("active"); document.getElementById(s).classList.add("done"); });
    const data = await resp.json();
    loadingOverlay.classList.add("hidden");
    steps.forEach(s => document.getElementById(s).classList.remove("active", "done"));
    if (data.error) { alert("Erreur : " + data.error); return; }
    currentScanId = data.scan_id;
    renderResult(data);
  } catch (err) {
    clearInterval(stepInterval);
    loadingOverlay.classList.add("hidden");
    steps.forEach(s => document.getElementById(s).classList.remove("active", "done"));
    alert("Erreur de connexion au serveur.");
  }
}

function renderResult(data) {
  const { plant, analysis } = data;
  document.getElementById("resultImg").src = selectedImageB64;
  document.getElementById("resultCommonName").textContent = plant.common_name;
  document.getElementById("resultScientificName").textContent = plant.scientific_name;
  document.getElementById("resultFamily").textContent = "Famille : " + plant.family;
  const conf = plant.confidence || 0;
  document.getElementById("confidenceBar").style.width = conf + "%";
  document.getElementById("confidenceVal").textContent = conf + "%";

  const badges = [
    { label: "🍽️ Comestible : " + (analysis.is_edible || "?"), val: analysis.is_edible },
    { label: "💊 Médicinal : " + (analysis.is_medicinal || "?"), val: analysis.is_medicinal },
    { label: "⚠️ Toxique : " + (analysis.is_toxic || "?"), val: analysis.is_toxic },
    { label: "🌍 Invasif : " + (analysis.is_invasive || "?"), val: analysis.is_invasive },
  ];
  document.getElementById("badgesRow").innerHTML = badges.map(b =>
    `<span class="badge ${badgeClass(b.val)}">${b.label}</span>`
  ).join("");

  document.getElementById("healthStatus").textContent = analysis.health_status || "Non disponible";
  document.getElementById("edibleDetails").textContent = analysis.edible_details || "Non disponible";

  // Images de recettes via Wikimedia
  const recipeImages = document.getElementById("recipeImages");
  let recipes = analysis.recipe_images || [];
  if (!recipes.length && analysis.recipe_suggestions) {
    recipes = analysis.recipe_suggestions.map(r => ({ name: r, image_url: null }));
  }
  if (!recipes.length) {
    const pname = plant.common_name || plant.scientific_name || "cette plante";
    recipes = [
      { name: "Sauce à base de " + pname, image_url: null },
      { name: "Soupe traditionnelle de " + pname, image_url: null },
      { name: "Plat sauté de " + pname, image_url: null }
    ];
  }

  if (recipes.length > 0 && analysis.is_edible !== "Non") {
    recipeImages.innerHTML = `<p style="font-size:0.8rem;color:var(--accent);margin-bottom:0.5rem;width:100%">🍽️ Idées de recettes</p>` +
      recipes.slice(0, 3).map(r => `
        <div class="recipe-card">
          ${r.image_url
            ? `<img src="${r.image_url}" alt="${r.name}" loading="lazy" onerror="this.style.display='none'"/>`
            : `<div style="width:100%;height:110px;background:var(--bg2);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:2rem">🍽️</div>`
          }
          <p>${r.name}</p>
        </div>`).join("");
  } else {
    recipeImages.innerHTML = "";
  }
  document.getElementById("medicinalDetails").textContent = analysis.medicinal_details || "Non disponible";
  document.getElementById("toxicDetails").textContent = analysis.toxic_details || "Non disponible";
  document.getElementById("envImpact").textContent = analysis.environmental_impact || "Non disponible";

  document.getElementById("chatMessages").innerHTML = `<div class="chat-msg ai">🌿 ${analysis.summary || "Analyse complète disponible ci-dessus."}</div>`;
  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({ behavior: "smooth" });
}

// ── CHAT ─────────────────────────────────────────────────────
document.getElementById("btnSend").addEventListener("click", sendChat);
document.getElementById("chatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });

async function sendChat() {
  const input = document.getElementById("chatInput");
  const msg = input.value.trim();
  if (!msg || !currentScanId) return;
  input.value = "";
  const chatBox = document.getElementById("chatMessages");
  chatBox.innerHTML += `<div class="chat-msg user">${msg}</div>`;
  chatBox.scrollTop = chatBox.scrollHeight;
  chatHistory.push({ role: "user", content: msg });
  try {
    const resp = await fetch(`${API_BASE}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scan_id: currentScanId, message: msg, history: chatHistory })
    });
    const data = await resp.json();
    const reply = data.reply || "Désolé, je n'ai pas pu répondre.";
    chatHistory.push({ role: "assistant", content: reply });
    chatBox.innerHTML += `<div class="chat-msg ai">${reply}</div>`;
    // Afficher l'image générée si disponible
    if (data.image_url) {
      chatBox.innerHTML += `
        <div class="chat-msg ai" style="padding:0.5rem">
          <p style="font-size:0.8rem;color:var(--accent);margin-bottom:0.5rem">🖼️ Image associée</p>
          <img src="${data.image_url}" alt="Recette"
            style="width:100%;max-width:320px;border-radius:10px;display:block"
            onerror="this.style.display='none'"/>
        </div>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
  } catch {
    chatBox.innerHTML += `<div class="chat-msg ai">Erreur de connexion à l'agent IA.</div>`;
  }
}
