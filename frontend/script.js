/* ============================================
   DRISHTI – Frontend Logic
   ============================================ */

// ── State ──
let mode = "calamity";
let calamityPoint = null;
let calamityMarker = null;
let heatLayer = null;
let calamityCircle = null;
let crowdLayer = L.layerGroup();
let startPoint = null;
let endPoint = null;
let startMarker = null;
let endMarker = null;
let routeLayer = null;
let activeCalamities = [];
let blockedZones = [];
let lastAnalyzeRadius = 300;

let map = null;
let mapInitialized = false;

const BLOCK_RADIUS_KM = 0.2;

// ── Marker Icons ──
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const yellowIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// ============================================
// TOAST NOTIFICATION SYSTEM
// ============================================
const TOAST_ICONS = {
  success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
  error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
  info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
};

function showToast(message, type = "info", duration = 4000) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] || TOAST_ICONS.info}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-exit");
    toast.addEventListener("animationend", () => toast.remove());
  }, duration);
}

// ============================================
// DARK MODE
// ============================================
function toggleDarkMode() {
  const html = document.documentElement;
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("drishti_theme", next);
}

function initTheme() {
  const saved = localStorage.getItem("drishti_theme");
  if (saved) {
    document.documentElement.setAttribute("data-theme", saved);
  }
}

// ============================================
// PASSWORD TOGGLE
// ============================================
function togglePassword(inputId, btn) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';
  } else {
    input.type = "password";
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

// ============================================
// LOADING STATE
// ============================================
function showLoading(text = "Analyzing...") {
  const overlay = document.getElementById("loadingOverlay");
  const loadingText = overlay.querySelector(".loading-text");
  if (loadingText) loadingText.textContent = text;
  overlay.classList.remove("hidden");
}

function hideLoading() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

// ============================================
// MODE INDICATOR
// ============================================
function updateModeIndicator() {
  const indicator = document.getElementById("modeIndicator");
  const modeText = document.getElementById("modeText");
  const btnCalamity = document.getElementById("btnSetCalamity");
  const btnRoute = document.getElementById("btnSetRoute");

  indicator.classList.remove("mode-calamity", "mode-route");
  btnCalamity.classList.remove("active-mode");
  btnRoute.classList.remove("active-mode");

  if (mode === "calamity") {
    indicator.classList.add("mode-calamity");
    modeText.textContent = "Calamity Mode — click map to set location";
    btnCalamity.classList.add("active-mode");
  } else {
    indicator.classList.add("mode-route");
    modeText.textContent = "Route Mode — click start, then end point";
    btnRoute.classList.add("active-mode");
  }
}

// ============================================
// AUTH: LOGIN / SIGNUP
// ============================================
function showLogin() {
  document.getElementById("loginForm").classList.remove("hidden");
  document.getElementById("signupForm").classList.add("hidden");
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("signupTab").classList.remove("active");
}

function showSignup() {
  document.getElementById("loginForm").classList.add("hidden");
  document.getElementById("signupForm").classList.remove("hidden");
  document.getElementById("loginTab").classList.remove("active");
  document.getElementById("signupTab").classList.add("active");
}

function showApp() {
  document.getElementById("authPage").classList.add("hidden");
  document.getElementById("appPage").classList.remove("hidden");
  const email = localStorage.getItem("user_email");
  document.getElementById("userLabel").textContent = email || "";
  const avatar = document.getElementById("userAvatar");
  if (email) avatar.textContent = email.charAt(0).toUpperCase();
  initMap();
  updateModeIndicator();
}

function showAuth() {
  document.getElementById("appPage").classList.add("hidden");
  document.getElementById("authPage").classList.remove("hidden");
}

// ── Init ──
window.addEventListener("DOMContentLoaded", () => {
  initTheme();
  const loggedIn = localStorage.getItem("logged_in") === "true";
  if (loggedIn && localStorage.getItem("user_email")) {
    showApp();
  } else {
    showAuth();
    showLogin();
  }
});

async function signup() {
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  if (!email || !password) {
    showToast("Please enter email and password", "warning");
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:8000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("user_email", email);
      localStorage.setItem("logged_in", "true");
      showToast("Account created successfully!", "success");
      showApp();
    } else {
      showToast(data.detail || "Signup failed", "error");
    }
  } catch (err) {
    showToast("Cannot connect to server", "error");
  }
}

async function login() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  if (!email || !password) {
    showToast("Please enter email and password", "warning");
    return;
  }

  try {
    const res = await fetch("http://127.0.0.1:8000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("user_email", email);
      localStorage.setItem("logged_in", "true");
      showToast("Welcome back!", "success");
      showApp();
    } else {
      showToast(data.detail || "Login failed", "error");
    }
  } catch (err) {
    showToast("Cannot connect to server", "error");
  }
}

function logout() {
  localStorage.removeItem("user_email");
  localStorage.removeItem("logged_in");
  showToast("Logged out", "info");
  showAuth();
  showLogin();
}

// ============================================
// MAP INITIALIZATION
// ============================================
function initMap() {
  if (mapInitialized) {
    setTimeout(() => map.invalidateSize(), 200);
    return;
  }

  map = L.map("map").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);

  crowdLayer.addTo(map);
  loadCrowdReports();

  map.on("click", function (e) {
    if (mode === "calamity") {
      calamityPoint = e.latlng;

      if (calamityMarker) map.removeLayer(calamityMarker);

      calamityMarker = L.marker(calamityPoint, { icon: redIcon })
        .addTo(map)
        .bindPopup("Calamity selected")
        .openPopup();

      map.setView(calamityPoint, 15);
      drawRiskHeatmap();
      showToast("Calamity location set", "info");
    } else if (mode === "route") {
      if (!startPoint) {
        startPoint = e.latlng;
        if (startMarker) map.removeLayer(startMarker);

        startMarker = L.marker(startPoint)
          .addTo(map)
          .bindPopup("Start")
          .openPopup();
        showToast("Start point set — now click the end point", "info");
        return;
      }

      if (!endPoint) {
        endPoint = e.latlng;
        if (endMarker) map.removeLayer(endMarker);

        endMarker = L.marker(endPoint)
          .addTo(map)
          .bindPopup("End")
          .openPopup();
        showToast("End point set — press Analyze Route", "success");
        return;
      }
    }
  });

  mapInitialized = true;

  setTimeout(() => {
    map.invalidateSize();
  }, 300);
}

// ============================================
// SET MODE
// ============================================
function setMode(selectedMode) {
  mode = selectedMode;

  if (mode === "route") {
    if (startMarker) map.removeLayer(startMarker);
    if (endMarker) map.removeLayer(endMarker);
    startMarker = null;
    endMarker = null;
    startPoint = null;
    endPoint = null;
    showToast("Route mode — click start, then end point on map", "info");
  }

  if (mode === "calamity") {
    showToast("Calamity mode — click on map to set location", "info");
  }

  updateModeIndicator();
}

// ============================================
// ANALYZE SAFETY
// ============================================
async function analyze() {
  if (!calamityPoint) {
    showToast("Select a calamity point on the map first", "warning");
    return;
  }

  const userEmail = localStorage.getItem("user_email");
  if (!userEmail) {
    showToast("Login required", "error");
    return;
  }

  const savedCenter = map.getCenter();
  const savedZoom = map.getZoom();

  showLoading("Analyzing safety...");

  try {
    const response = await fetch("http://127.0.0.1:8000/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: document.getElementById("report").value,
        lat: calamityPoint.lat,
        lon: calamityPoint.lng,
        distance: Number(document.getElementById("distance").value),
        time_min: Number(document.getElementById("time").value),
        user_email: userEmail
      })
    });

    if (!response.ok) {
      hideLoading();
      showToast("Analysis API failed", "error");
      return;
    }

    const data = await response.json();

    if (!data || !data.calamity) {
      hideLoading();
      showToast("Analysis returned no data", "error");
      return;
    }

    // Update markers
    if (calamityMarker) map.removeLayer(calamityMarker);

    calamityMarker = L.marker(calamityPoint, { icon: redIcon })
      .addTo(map)
      .bindPopup(`
        <b>${data.status}</b><br>
        Calamity: ${data.calamity}<br>
        Risk: ${data.risk}<br>
        Confidence: ${data.confidence}
      `)
      .openPopup();

    // Store the radius for route avoidance
    lastAnalyzeRadius = data.radius || 300;

    if (calamityCircle) map.removeLayer(calamityCircle);

    calamityCircle = L.circle(calamityPoint, {
      radius: lastAnalyzeRadius,
      color:
        data.status === "SAFE" ? "green" :
        data.status === "CAUTION" ? "orange" :
        "red",
      fillOpacity: 0.25
    }).addTo(map);

    // Update result card
    updateResultCard(data);

    await loadCrowdReports();

    map.setView(savedCenter, savedZoom, { animate: false });

    hideLoading();
    showToast(`Analysis complete — ${data.status}`, data.status === "SAFE" ? "success" : data.status === "CAUTION" ? "warning" : "error");

  } catch (err) {
    hideLoading();
    showToast("Cannot connect to server", "error");
  }
}

// ============================================
// RESULT CARD
// ============================================
function updateResultCard(data) {
  const card = document.getElementById("resultCard");
  card.classList.remove("hidden");

  document.getElementById("resultCalamity").textContent = data.calamity || "—";
  document.getElementById("resultRisk").textContent = data.risk || "—";
  document.getElementById("resultConfidence").textContent = data.confidence || "—";
  document.getElementById("resultRadius").textContent = data.radius ? `${data.radius}m` : "—";

  const statusEl = document.getElementById("resultStatus");
  statusEl.textContent = data.status;
  statusEl.className = "result-status";

  if (data.status === "SAFE") statusEl.classList.add("status-safe");
  else if (data.status === "CAUTION") statusEl.classList.add("status-caution");
  else statusEl.classList.add("status-blocked");
}

// ============================================
// CROWD REPORTS
// ============================================
async function loadCrowdReports() {
  crowdLayer.clearLayers();
  activeCalamities = [];
  blockedZones = [];

  try {
    const response = await fetch("http://127.0.0.1:8000/crowd-reports");
    const data = await response.json();

    data.forEach(report => {
      activeCalamities.push(report);

      // Use actual radius from API and include MEDIUM+ confidence
      if (report.confidence === "HIGH" || report.confidence === "MEDIUM") {
        blockedZones.push({
          lat: report.lat,
          lon: report.lon,
          radius: (report.radius || 300) / 1000  // meters → km
        });
      }

      const icon =
        report.risk === "SAFE" ? greenIcon :
        report.risk === "CAUTION" ? yellowIcon :
        redIcon;

      L.marker([report.lat, report.lon], { icon })
        .addTo(crowdLayer)
        .bindPopup(`
          <b>${report.calamity}</b><br>
          Risk: ${report.risk}<br>
          Confidence: ${report.confidence}
        `);
    });

    renderReportsList(data);
  } catch (err) {
    // Silently fail — reports will show as empty
  }
}

function renderReportsList(reports) {
  const container = document.getElementById("reportsList");

  if (!reports || reports.length === 0) {
    container.innerHTML = '<p class="empty-state">No reports yet</p>';
    return;
  }

  const recent = reports.slice(0, 8);
  container.innerHTML = recent.map(r => {
    const riskClass = r.risk === "SAFE" ? "risk-safe" : r.risk === "CAUTION" ? "risk-caution" : "risk-blocked";
    const timeAgo = r.minutes_ago != null ? `${Math.round(r.minutes_ago)}m ago` : "";
    return `
      <div class="report-item">
        <span class="report-badge ${riskClass}"></span>
        <div class="report-info">
          <div class="report-type">${r.calamity}</div>
          <div class="report-meta">${r.risk} · ${r.confidence} · ${timeAgo}</div>
        </div>
      </div>
    `;
  }).join("");
}

// ============================================
// HEATMAP
// ============================================
function drawRiskHeatmap() {
  if (!calamityPoint) return;

  if (heatLayer) map.removeLayer(heatLayer);

  let heatPoints = [];
  for (let latOffset = -0.01; latOffset <= 0.01; latOffset += 0.002) {
    for (let lonOffset = -0.01; lonOffset <= 0.01; lonOffset += 0.002) {
      let lat = calamityPoint.lat + latOffset;
      let lon = calamityPoint.lng + lonOffset;
      let intensity = 1 - getDistanceKm(lat, lon, calamityPoint.lat, calamityPoint.lng);
      if (intensity > 0) heatPoints.push([lat, lon, intensity]);
    }
  }

  heatLayer = L.heatLayer(heatPoints, {
    radius: 35,
    blur: 35
  }).addTo(map);
}

// ============================================
// DISTANCE CALCULATION
// ============================================
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ============================================
// ROUTING
// ============================================
async function getRoute(start, end) {
  const url = `https://router.project-osrm.org/route/v1/driving/` +
              `${start.lng},${start.lat};${end.lng},${end.lat}` +
              `?overview=full&geometries=geojson&alternatives=true`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.routes || data.routes.length === 0) {
    return [];
  }

  return data.routes.map(r => r.geometry.coordinates);
}

async function analyzeRoute() {
  if (mode !== "route") {
    mode = "route";
    showToast("Click start, then end point on the map", "info");
    updateModeIndicator();
    return;
  }

  if (!startPoint || !endPoint) {
    showToast("Select both start and end points", "warning");
    return;
  }

  if (!calamityPoint && activeCalamities.length > 0) {
    calamityPoint = {
      lat: activeCalamities[0].lat,
      lng: activeCalamities[0].lon   // normalize to .lng for Leaflet consistency
    };
  }

  if (!calamityPoint) {
    showToast("No calamity data available", "warning");
    return;
  }

  showLoading("Finding safest route...");

  try {
    // Include the active calamity point as a blocked zone
    const routeBlockedZones = [...blockedZones];
    if (calamityPoint) {
      routeBlockedZones.push({
        lat: calamityPoint.lat,
        lon: calamityPoint.lng || calamityPoint.lon,  // handle both property names
        radius: lastAnalyzeRadius / 1000  // meters → km
      });
    }

    const candidates = [];

    // 1) Direct route
    const directRoutes = await getRoute(startPoint, endPoint);
    for (const r of directRoutes) {
      const status = checkRouteSafety(r, routeBlockedZones);
      if (status !== "BLOCKED") {
        const length = routeLengthKm(r);
        const score = length + (status === "CAUTION" ? 10 : 0);
        candidates.push({ route: r, score, status });
      }
    }

    // 2) Detour routes
    const detours = generateDetourPoints(calamityPoint);

    for (const d of detours) {
      const routeAlternatives = await getRouteViaDetour(startPoint, d, endPoint);
      if (!routeAlternatives) continue;

      // Evaluate each alternative route from this detour
      for (const route of routeAlternatives) {
        const status = checkRouteSafety(route, routeBlockedZones);
        if (status === "BLOCKED") continue;

        const length = routeLengthKm(route);
        const score = length + (status === "CAUTION" ? 10 : 0);

        candidates.push({ route, score, status });
      }
    }

    if (candidates.length === 0) {
      hideLoading();
      showToast("No safe route available", "error");
      return;
    }

    candidates.sort((a, b) => a.score - b.score);
    const finalRoute = candidates[0].route;

    if (routeLayer) map.removeLayer(routeLayer);

    routeLayer = L.geoJSON({
      type: "LineString",
      coordinates: finalRoute
    }, {
      style: { color: "#10b981", weight: 5, opacity: 0.85 }
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds());

    hideLoading();
    showToast("Safe route found!", "success");

  } catch (err) {
    hideLoading();
    showToast("Route analysis failed", "error");
  }
}

function checkRouteSafety(routePoints, zones) {
  const checkZones = zones || blockedZones;
  let hasCaution = false;

  // Check every point for full coverage of small calamity zones
  for (let i = 0; i < routePoints.length; i++) {
    let lon = routePoints[i][0];
    let lat = routePoints[i][1];

    for (let z of checkZones) {
      let dist = getDistanceKm(lat, lon, z.lat, z.lon);
      // Block if inside the full radius
      if (dist <= z.radius) return "BLOCKED";
      // Caution if within 1.5x the radius
      if (dist <= z.radius * 1.5) hasCaution = true;
    }
  }
  return hasCaution ? "CAUTION" : "SAFE";
}

function generateDetourPoints(calamity) {
  // Scale detour distances relative to the largest blocked zone radius
  const maxBlockedRadiusKm = Math.max(
    lastAnalyzeRadius / 1000,
    ...blockedZones.map(z => z.radius),
    0.3  // minimum floor of 300m
  );

  // Detour waypoints at 1.5x, 2.5x, 4x, 6x the blocked radius
  const radii = [
    maxBlockedRadiusKm * 1.5,
    maxBlockedRadiusKm * 2.5,
    maxBlockedRadiusKm * 4,
    maxBlockedRadiusKm * 6
  ];
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  const points = [];
  const calamityLng = calamity.lng || calamity.lon;  // handle both property names

  for (const r of radii) {
    for (const a of angles) {
      const rad = (a * Math.PI) / 180;
      points.push({
        lat: calamity.lat + (r * Math.cos(rad)) / 111,
        lng: calamityLng + (r * Math.sin(rad)) / (111 * Math.cos(calamity.lat * Math.PI / 180))
      });
    }
  }

  return points;
}

async function getRouteViaDetour(start, detour, end) {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start.lng},${start.lat};` +
    `${detour.lng},${detour.lat};` +
    `${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson&alternatives=true`;

  const res = await fetch(url);
  const data = await res.json();

  // Return all alternative routes for better candidate selection
  if (!data.routes || data.routes.length === 0) return null;
  return data.routes.map(r => r.geometry.coordinates);
}

function routeLengthKm(routePoints) {
  let total = 0;
  for (let i = 1; i < routePoints.length; i++) {
    const [lon1, lat1] = routePoints[i - 1];
    const [lon2, lat2] = routePoints[i];
    total += getDistanceKm(lat1, lon1, lat2, lon2);
  }
  return total;
}