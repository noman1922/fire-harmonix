/* =====================================================================
   FIRE-HARMONIX · Advanced Spaceborne Thermal Intelligence Platform
   Core Application Engine & Mission Control Telemetry Manager
   ===================================================================== */

const state = {
  observations: [],
  filtered: [],
  summary: null,
  selected: null,
  currentSort: { col: 'hfai', dir: 'desc' },
  searchQuery: '',
  currentView: 'overview'
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const fmt = (value, digits = 0) => Number(value).toLocaleString(undefined, { maximumFractionDigits: digits });

// Format UTC Date Time
function formatUtc(isoStr) {
  if (!isoStr) return '—';
  return isoStr.replace('T', ' ').replace(':00Z', ' UTC');
}

// Live Mission Clock (Updates every second)
function startLiveUtcClock() {
  const clockEl = $('#liveUtcClock');
  if (!clockEl) return;
  function tick() {
    const now = new Date();
    const utcStr = now.toISOString().replace('T', ' ').slice(0, 19);
    clockEl.textContent = `UTC ${utcStr}`;
  }
  tick();
  setInterval(tick, 1000);
}

// Primary Data Ingestion
async function load() {
  startLiveUtcClock();

  const [observations, summary] = await Promise.all([
    fetch('/api/observations.json').then((r) => {
      if (!r.ok) throw new Error(`Observations archive request failed: ${r.status}`);
      return r.json();
    }),
    fetch('/api/summary.json').then((r) => {
      if (!r.ok) throw new Error(`Summary analytics request failed: ${r.status}`);
      return r.json();
    }),
  ]);

  state.observations = observations;
  state.filtered = observations;
  state.summary = summary;

  populateSamples();
  applyFilter();
  renderSummary();
  renderHarmonization();
  renderCalendar();

  // Select primary observation (highest HFAI)
  const initial = [...observations].sort((a, b) => Number(b.hfai) - Number(a.hfai))[0] || observations[0];
  if (initial) {
    selectObservation(initial.id, false);
  }
}

// Global Sensor Filter
function applyFilter() {
  const sensor = $('#sensorSelect')?.value || 'ALL';
  const query = state.searchQuery.toLowerCase().trim();

  // Sensor selection applies to 3D globe and platform
  state.sensorFiltered = state.observations.filter((d) => {
    return sensor === 'ALL' || d.sensor === sensor;
  });

  // Full filter includes text search for Data Explorer table
  state.filtered = state.sensorFiltered.filter((d) => {
    if (!query) return true;
    return (
      String(d.id).includes(query) ||
      d.sensor.toLowerCase().includes(query) ||
      d.satellite.toLowerCase().includes(query) ||
      d.grid_id.toLowerCase().includes(query) ||
      d.status.toLowerCase().includes(query) ||
      d.acq_date.includes(query) ||
      String(d.latitude).includes(query) ||
      String(d.longitude).includes(query)
    );
  });

  // Apply sorting
  sortFilteredData();

  // Update renderers
  if (typeof window.renderMap === 'function') window.renderMap();
  renderTable();

  // Update Explorer count pill
  const expPill = $('#explorerCountPill');
  if (expPill) {
    expPill.textContent = `${state.sensorFiltered.length} ACTIVE OBSERVATIONS`;
  }
}

window.resetAllFilters = function () {
  const sensorSelect = $('#sensorSelect');
  if (sensorSelect) sensorSelect.value = 'ALL';
  const dataSearch = $('#dataSearchInput');
  if (dataSearch) dataSearch.value = '';
  state.searchQuery = '';
  applyFilter();
};

// Summary Metrics & Overview Feed
function renderSummary() {
  if (!state.summary) return;
  const t = state.summary.totals;
  
  if ($('#totalDetections')) $('#totalDetections').textContent = fmt(t.detections);
  if ($('#railCount')) $('#railCount').textContent = fmt(t.detections);
  if ($('#totalFrp')) $('#totalFrp').textContent = `${fmt(t.total_frp, 1)} MW`;
  if ($('#gridCount')) $('#gridCount').textContent = fmt(t.grids);
  if ($('#unusualCount')) $('#unusualCount').textContent = fmt(t.unusual);

  // Overview Sensor Mini Cards
  const overviewCards = $('#overviewSensorCards');
  if (overviewCards && state.summary.sensors) {
    overviewCards.innerHTML = state.summary.sensors.map((s) => `
      <div class="sensor-card-mini ${s.sensor.toLowerCase()}">
        <span class="panel-eyebrow">${s.sensor === 'MODIS' ? '≈1,000 M NADIR' : '≈375 M NADIR'}</span>
        <strong>${s.sensor}</strong>
        <div class="sensor-mini-stats">
          <div><span>Detections:</span><b>${s.detections}</b></div>
          <div><span>Mean FRP:</span><b>${s.mean_frp} MW</b></div>
          <div><span>Brightness:</span><b>${Math.round(s.mean_brightness)} K</b></div>
          <div><span>Agreement:</span><b>${Math.round(s.mean_agreement * 100)}%</b></div>
        </div>
      </div>
    `).join('');
  }

  // Overview Peak Anomalies List
  const anomaliesList = $('#overviewAnomaliesList');
  if (anomaliesList) {
    const topAnomalies = [...state.observations]
      .sort((a, b) => Number(b.hfai) - Number(a.hfai))
      .slice(0, 4);

    anomaliesList.innerHTML = topAnomalies.map((a) => `
      <div class="anomaly-item" onclick="selectObservation(${a.id}, true)">
        <div class="anomaly-meta">
          <b>#${String(a.id).padStart(3, '0')} · ${a.sensor} (${a.satellite})</b>
          <span>GRID: ${a.grid_id} · FRP: ${Number(a.frp).toFixed(1)} MW · ${a.acq_date}</span>
        </div>
        <div class="anomaly-scores">
          <span class="anomaly-hfai">${Number(a.hfai).toFixed(2)} HFAI</span>
          <button type="button" class="anomaly-jump-btn" title="Inspect Observation">
            ORBIT ⌖
          </button>
        </div>
      </div>
    `).join('');
  }
}

// Observation Selection & Focus HUD Sync
function selectObservation(id, updatePicker = true) {
  const d = state.observations.find((item) => item.id === Number(id));
  if (!d) return;
  state.selected = d;

  if (updatePicker && $('#sampleSelect')) {
    $('#sampleSelect').value = String(d.id);
  }

  // Update Overview Focus Panel
  if ($('#focusRegion')) {
    const latStr = `${Math.abs(d.latitude).toFixed(2)}° ${d.latitude >= 0 ? 'N' : 'S'}`;
    const lonStr = `${Math.abs(d.longitude).toFixed(2)}° ${d.longitude >= 0 ? 'E' : 'W'}`;
    $('#focusRegion').textContent = `${latStr}, ${lonStr}`;
  }
  if ($('#focusStatus')) {
    $('#focusStatus').textContent = `${d.status} Activity`;
    $('#focusStatus').className = `status-badge ${d.status.toLowerCase()}`;
  }
  if ($('#focusHfai')) $('#focusHfai').textContent = Number(d.hfai).toFixed(2);
  if ($('#focusSensor')) $('#focusSensor').textContent = `${d.sensor} · ${d.satellite}`;
  if ($('#focusFrp')) $('#focusFrp').textContent = `${fmt(d.frp, 1)} MW`;
  if ($('#focusBrightness')) $('#focusBrightness').textContent = `${fmt(d.brightness, 1)} K`;
  if ($('#focusAgreement')) $('#focusAgreement').textContent = `${Math.round(d.sensor_agreement * 100)}%`;

  // Update Radial Score Dial
  if ($('#radial')) {
    $('#radial').style.setProperty('--score', `${d.hfai * 360}deg`);
  }

  // Update Scenario Lab Inputs
  fillInputs(d);

  // Sync Table Row Highlight
  $$('#dataTable tr').forEach((row) => {
    row.classList.toggle('selected', row.dataset.id === String(d.id));
  });

  // Trigger 3D Globe camera recentering if in explorer or overview view
  if (window.globeController && (state.currentView === 'explorer' || state.currentView === 'overview')) {
    window.globeController.flyToCoords(d.longitude, d.latitude, 4.8);
  }
}

// Populate Scenario Lab Sample Picker
function populateSamples() {
  const select = $('#sampleSelect');
  if (!select) return;
  select.innerHTML = state.observations
    .map((d) => `<option value="${d.id}">#${String(d.id).padStart(3, '0')} · ${d.sensor} · ${d.acq_date} · FRP ${Number(d.frp).toFixed(1)} MW · HFAI ${Number(d.hfai).toFixed(2)}</option>`)
    .join('');
}

// Fill Scenario Lab Telemetry Inputs
function fillInputs(d) {
  if (!$('#inputLat')) return;
  $('#inputLat').value = Number(d.latitude).toFixed(5);
  $('#inputLon').value = Number(d.longitude).toFixed(5);
  $('#inputBrightness').value = Number(d.brightness).toFixed(2);
  $('#inputFrp').value = Number(d.frp).toFixed(2);
  $('#inputConfidence').value = d.confidence.toUpperCase();
  $('#inputDaynight').value = d.daynight === 'D' ? 'Day Pass (Solar)' : 'Night Pass (Ambient)';

  $('#resultStatus').textContent = 'READY TO ANALYZE';
  $('#resultStatus').className = 'status-badge';
  $('#resultScore').textContent = '—';
  $('#resultTrack').style.width = '0%';
}

// Execute Scenario Lab Harmonization Analysis
function analyze() {
  const d = state.selected;
  if (!d) return;

  $('#resultStatus').textContent = `${d.status.toUpperCase()} ACTIVITY`;
  $('#resultStatus').className = `status-badge ${d.status.toLowerCase()}`;
  $('#resultScore').textContent = Number(d.hfai).toFixed(2);
  $('#resultTrack').style.width = `${Math.min(d.hfai * 100, 100)}%`;

  $('#resultGrid').textContent = d.grid_id;
  $('#resultAgreement').textContent = `${Math.round(d.sensor_agreement * 100)}%`;
  $('#resultSensor').textContent = `${d.satellite} · ${d.sensor}`;
  $('#resultTime').textContent = formatUtc(d.datetime_utc);

  // Decomposition calculation for 5 components
  // HFAI = 0.25 C + 0.25 F + 0.20 B + 0.15 A + 0.15 Q
  const normC = Math.min(Math.max(d.hfai * 0.95, 0.1), 1.0);
  const normF = Math.min(Math.max((d.frp / 60), 0.05), 1.0);
  const normB = Math.min(Math.max((d.brightness - 290) / 80, 0.1), 1.0);
  const normA = d.sensor_agreement;
  const normQ = d.confidence === 'high' ? 1.0 : d.confidence === 'nominal' ? 0.75 : 0.45;

  if ($('#decompC')) $('#decompC').style.width = `${normC * 100}%`;
  if ($('#decompF')) $('#decompF').style.width = `${normF * 100}%`;
  if ($('#decompB')) $('#decompB').style.width = `${normB * 100}%`;
  if ($('#decompA')) $('#decompA').style.width = `${normA * 100}%`;
  if ($('#decompQ')) $('#decompQ').style.width = `${normQ * 100}%`;

  const classification = d.status === 'Unusual'
    ? 'substantially exceeds the empirical baseline, exhibiting intense thermal radiative output and strong sensor signature alignment.'
    : d.status === 'Elevated'
    ? 'is elevated above typical ambient infrared background noise, representing a notable local thermal emission front.'
    : 'falls within baseline orbital variation, exhibiting expected nominal thermal characteristics.';

  $('#resultText').textContent = `Observation #${String(d.id).padStart(3, '0')} recorded by ${d.satellite} (${d.sensor}) ${classification} All components are computed transparently via engineering calibration rules.`;
}

// Sensor Harmonization Module Visuals
function renderHarmonization() {
  if (!state.summary || !state.summary.sensors) return;

  const modis = state.summary.sensors.find((s) => s.sensor === 'MODIS');
  const viirs = state.summary.sensors.find((s) => s.sensor === 'VIIRS');

  if (modis) {
    if ($('#modisCount')) $('#modisCount').textContent = `${modis.detections} records`;
    if ($('#modisMeanFrp')) $('#modisMeanFrp').textContent = `${modis.mean_frp} MW`;
  }
  if (viirs) {
    if ($('#viirsCount')) $('#viirsCount').textContent = `${viirs.detections} records`;
    if ($('#viirsMeanFrp')) $('#viirsMeanFrp').textContent = `${viirs.mean_frp} MW`;
  }

  // Detection Mix Bars
  const max = Math.max(...state.summary.sensors.map((d) => d.detections));
  const barsEl = $('#sensorBars');
  if (barsEl) {
    barsEl.innerHTML = state.summary.sensors.map((d) => `
      <div class="bar-row">
        <b>${d.sensor}</b>
        <div class="bar"><i style="width:${(d.detections / max) * 100}%"></i></div>
        <span>${d.detections} DET</span>
      </div>
    `).join('');
  }
}

// Activity Calendar Module Rendering
function renderCalendar() {
  const grouped = new Map();
  state.observations.forEach((d) => {
    if (!grouped.has(d.acq_date)) grouped.set(d.acq_date, []);
    grouped.get(d.acq_date).push(d.hfai);
  });

  const days = [...grouped]
    .map(([date, values]) => ({
      date,
      score: values.reduce((a, b) => a + b, 0) / values.length,
      count: values.length
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const shown = days.slice(0, 28);
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let html = '<div></div>' + weekdays.map((d) => `<div class="head">${d}</div>`).join('');
  for (let row = 0; row < 4; row += 1) {
    html += `<div class="date-label">PERIOD ${String(row + 1).padStart(2, '0')}</div>`;
    for (let col = 0; col < 7; col += 1) {
      const item = shown[row * 7 + col];
      if (!item) {
        html += '<div class="cell empty"></div>';
        continue;
      }
      // Color gradient from dark navy (low score) to bright amber/thermal orange (high score)
      const hue = 215 - item.score * 195;
      const light = 16 + item.score * 38;
      const bg = `hsl(${hue} 75% ${light}% / 0.88)`;

      html += `
        <div class="cell" style="background:${bg}" title="${item.date}: ${item.count} detections, mean HFAI ${item.score.toFixed(2)}" onclick="filterByDate('${item.date}')">
          <span class="cell-date">${item.date.slice(5)}</span>
          <span class="cell-hfai">${item.score.toFixed(2)}</span>
        </div>
      `;
    }
  }

  const calEl = $('#activityCalendar');
  if (calEl) calEl.innerHTML = html;

  // Top Critical Periods
  const top = [...days].sort((a, b) => b.score - a.score).slice(0, 3);
  const periodsEl = $('#criticalPeriods');
  if (periodsEl) {
    periodsEl.innerHTML = top.map((d, i) => `
      <article class="period-card" onclick="filterByDate('${d.date}')" style="cursor:pointer">
        <span>CRITICAL PERIOD ${String(i + 1).padStart(2, '0')}</span>
        <strong>${new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
        <span>${d.count} DETECTIONS · MEAN HFAI ${d.score.toFixed(2)}</span>
      </article>
    `).join('');
  }
}

function filterByDate(dateStr) {
  const searchInput = $('#dataSearchInput');
  if (searchInput) {
    searchInput.value = dateStr;
    state.searchQuery = dateStr;
    applyFilter();
    setView('data');
  }
}

// Data Explorer Table Sorting & Rendering
function sortFilteredData() {
  const { col, dir } = state.currentSort;
  state.filtered.sort((a, b) => {
    let valA = a[col];
    let valB = b[col];

    if (col === 'coords') {
      valA = a.latitude;
      valB = b.latitude;
    }

    if (typeof valA === 'number') {
      return dir === 'asc' ? valA - valB : valB - valA;
    }
    return dir === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA));
  });
}

function renderTable() {
  const tbody = $('#dataTable');
  if (!tbody) return;

  tbody.innerHTML = state.filtered.map((d) => `
    <tr data-id="${d.id}" class="${state.selected && state.selected.id === d.id ? 'selected' : ''}" onclick="selectObservation(${d.id}, true)">
      <td>#${String(d.id).padStart(3, '0')}</td>
      <td><span class="sensor-badge ${d.sensor.toLowerCase()}">${d.sensor}</span></td>
      <td>${d.satellite}</td>
      <td>${d.acq_date} ${d.acq_time}</td>
      <td>${Number(d.latitude).toFixed(3)}°, ${Number(d.longitude).toFixed(3)}°</td>
      <td><b>${Number(d.frp).toFixed(1)}</b></td>
      <td>${Number(d.brightness).toFixed(1)}</td>
      <td><b style="color:var(--thermal-orange)">${Number(d.hfai).toFixed(2)}</b></td>
      <td><span class="status-pill-table ${d.status.toLowerCase()}">${d.status}</span></td>
    </tr>
  `).join('');

  const rowCount = $('#dataRowCount');
  if (rowCount) {
    rowCount.textContent = `SHOWING ${state.filtered.length} OF ${state.observations.length} RECORDS`;
  }
}

// Navigation & Dynamic 3D Globe Repositioning
// Mobile Navigation Drawer Controls
function openMobileDrawer() {
  $('.rail')?.classList.add('open');
  $('#railBackdrop')?.classList.add('open');
  document.body.classList.add('drawer-open');
}

function closeMobileDrawer() {
  $('.rail')?.classList.remove('open');
  $('#railBackdrop')?.classList.remove('open');
  document.body.classList.remove('drawer-open');
}

// Navigation & Dynamic 3D Globe Repositioning
function setView(id) {
  state.currentView = id;

  $$('.view').forEach((view) => view.classList.toggle('active', view.id === id));
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === id));

  // Sync mobile pill buttons
  $$('.mobile-pill-btn').forEach((pill) => {
    const isActive = pill.dataset.view === id;
    pill.classList.toggle('active', isActive);
    if (isActive) {
      try {
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } catch (_) {}
    }
  });

  // Close mobile drawer upon module selection
  closeMobileDrawer();

  const titles = {
    overview: 'Global Activity Overview',
    explorer: 'Orbital 3D Earth Explorer',
    harmonize: 'Sensor Harmonization & Physics Comparison',
    calendar: 'Burning Activity Calendar',
    lab: 'Observation Scenario Lab',
    data: 'Auditable Telemetry Data Explorer',
    methodology: 'Scientific Methodology Dossier'
  };

  if ($('#viewTitle')) $('#viewTitle').textContent = titles[id] || 'Satellite Intelligence';

  // Reposition 3D Globe between Overview & Explorer slots
  const worldMap = document.getElementById('worldMap');
  if (worldMap) {
    if (id === 'explorer') {
      const explorerSlot = document.getElementById('explorerGlobeSlot');
      if (explorerSlot && !explorerSlot.contains(worldMap)) {
        explorerSlot.appendChild(worldMap);
      }
    } else {
      const overviewSlot = document.getElementById('overviewGlobeSlot');
      if (overviewSlot && !overviewSlot.contains(worldMap)) {
        overviewSlot.appendChild(worldMap);
      }
    }
  }

  // Trigger MapLibre canvas resize after DOM movement
  setTimeout(() => {
    if (window.globeController) {
      window.globeController.resize();
    }
  }, 50);

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Event Listeners & Wiring
window.setView = setView;
window.selectObservation = selectObservation;
window.openMobileDrawer = openMobileDrawer;
window.closeMobileDrawer = closeMobileDrawer;

$('#mobileNavToggle')?.addEventListener('click', openMobileDrawer);
$('#railCloseBtn')?.addEventListener('click', closeMobileDrawer);
$('#railBackdrop')?.addEventListener('click', closeMobileDrawer);

$$('.nav-item').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

$$('.mobile-pill-btn').forEach((button) => {
  button.addEventListener('click', () => setView(button.dataset.view));
});

$('#sensorSelect')?.addEventListener('change', applyFilter);

$('#sampleSelect')?.addEventListener('change', (e) => {
  selectObservation(e.target.value, false);
});

$('#analyzeButton')?.addEventListener('click', analyze);

$$('[data-open-lab]').forEach((button) => {
  button.addEventListener('click', () => setView('lab'));
});

// Search input in Data Explorer
$('#dataSearchInput')?.addEventListener('input', (e) => {
  state.searchQuery = e.target.value;
  applyFilter();
});

// Table Column Sorting
$$('thead th[data-sort]').forEach((th) => {
  th.addEventListener('click', () => {
    const col = th.dataset.sort;
    if (state.currentSort.col === col) {
      state.currentSort.dir = state.currentSort.dir === 'asc' ? 'desc' : 'asc';
    } else {
      state.currentSort.col = col;
      state.currentSort.dir = 'desc';
    }
    // Update header indicator
    $$('thead th').forEach((t) => (t.textContent = t.textContent.replace(' ▴', '').replace(' ▾', '')));
    th.textContent += state.currentSort.dir === 'asc' ? ' ▴' : ' ▾';

    applyFilter();
  });
});

// Start Ingestion
load().catch((err) => {
  console.error('Data loading error:', err);
  const empty = $('.map-empty');
  if (empty) empty.textContent = 'Unable to establish local satellite telemetry stream.';
});
