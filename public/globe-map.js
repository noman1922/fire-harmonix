/* =====================================================================
   FIRE-HARMONIX · Cinematic 3D Earth Globe Engine
   Autonomous Spaceborne Thermal Intelligence Platform
   Built with MapLibre GL JS Globe Projection & Multi-Spectral Auras
   ===================================================================== */
(() => {
  const container = document.getElementById('worldMap');
  if (!container || !window.maplibregl) return;

  const originalRenderMap = window.renderMap;
  const originalSelectObservation = window.selectObservation;

  container.classList.add('maplibre-world');
  container.innerHTML = `
    <div class="map-empty" id="mapLoadingState">
      <div class="map-spinner"></div>
      <span>ESTABLISHING SATELLITE UPLINK &amp; IMAGERY TILES…</span>
    </div>
    
    <!-- Floating Mission Telemetry HUD (Top Left) -->
    <div class="map-hud map-hud-topleft">
      <div class="hud-tag"><span class="hud-beacon"></span> ORBITAL TELEMETRY</div>
      <div class="hud-metric">
        <span class="hud-label">SURFACE SENSORS</span>
        <strong id="globeRecordCount">200 DETECTIONS</strong>
      </div>
      <div class="hud-coords" id="mapCoordinates">SCANNING ORBITAL SPHERE…</div>
      <button type="button" id="hudResetFilterBtn" class="hud-filter-reset-btn" style="display:none;" title="Clear filter and show all 200 records">
        ↺ RESET FILTER (SHOW ALL)
      </button>
    </div>

    <!-- Floating Hotspot Inspector & Integrated Legend (Top Right) -->
    <div class="map-hud map-hud-topright" id="mapFocusInspector">
      <div class="hud-tag-alt"><span class="hud-beacon-orange"></span> ACTIVE OBSERVATION</div>
      <div class="hud-target-name" id="hudTargetName">NOAA-20 · VIIRS</div>
      <div class="hud-target-stats">
        <div><span>HFAI INDEX</span><b id="hudTargetHfai">—</b></div>
        <div><span>RADIATIVE POWER</span><b id="hudTargetFrp">—</b></div>
      </div>
      <button type="button" class="hud-action-btn" id="hudFlyToTarget" title="Center camera on active observation">
        CENTER ORBIT ⌖
      </button>

      <!-- Integrated Visual Legend -->
      <div class="hud-integrated-legend">
        <span class="legend-chip modis"><i class="glow-dot modis"></i> MODIS (1km)</span>
        <span class="legend-chip viirs"><i class="glow-dot viirs"></i> VIIRS (375m)</span>
        <span class="legend-chip select"><i class="glow-ring"></i> SELECTED</span>
      </div>
    </div>

    <!-- Floating Aerospace Command Deck (Bottom Bar) -->
    <div class="map-hud-command-deck" aria-label="Globe navigation controls">
      <!-- Tier 1: Region Orbit Presets Bar -->
      <div class="hud-deck-row hud-presets-row">
        <span class="hud-deck-label">CAMERA ORBIT</span>
        <div class="hud-presets-ribbon">
          <button type="button" data-preset="global" class="preset-btn active" title="Global Planetary Orbit">
            <span class="preset-dot"></span>GLOBAL
          </button>
          <button type="button" data-preset="namerica" class="preset-btn" title="North America Orbit">
            <span class="preset-dot"></span>N. AMERICA
          </button>
          <button type="button" data-preset="samerica" class="preset-btn" title="South America Orbit">
            <span class="preset-dot"></span>S. AMERICA
          </button>
          <button type="button" data-preset="africa" class="preset-btn" title="Africa Orbit">
            <span class="preset-dot"></span>AFRICA
          </button>
          <button type="button" data-preset="eurasia" class="preset-btn" title="Eurasia Orbit">
            <span class="preset-dot"></span>EURASIA
          </button>
          <button type="button" data-preset="oceania" class="preset-btn" title="Oceania Orbit">
            <span class="preset-dot"></span>OCEANIA
          </button>
          <button type="button" data-preset="peak" class="preset-btn peak-btn" title="Jump to Peak Radiance Signal">
            <span class="preset-dot-orange"></span>★ PEAK SIGNAL
          </button>
        </div>
      </div>

      <!-- Tier 2: Spacecraft Controls & Calibration Strip -->
      <div class="hud-deck-row hud-controls-row">
        <div class="hud-status-badge">
          <span class="hud-status-pulse"></span>
          <span id="hudStatusText">AUTONOMOUS ORBIT ACTIVE</span>
        </div>
        <div class="hud-deck-tools">
          <button type="button" id="mapToggleSpin" class="hud-tool-btn active" title="Toggle autonomous Earth rotation">
            <span class="pill-dot live"></span> ROTATION: ON
          </button>
          <button type="button" id="mapToggleFog" class="hud-tool-btn active" title="Toggle atmospheric haze">
            ATMOSPHERE: ON
          </button>
          <div class="hud-zoom-trio">
            <button type="button" id="mapZoomIn" aria-label="Zoom In" title="Zoom In">+</button>
            <button type="button" id="mapZoomOut" aria-label="Zoom Out" title="Zoom Out">−</button>
            <button type="button" id="mapReset" aria-label="Reset View" title="Reset Global View">⌖</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const emptyCollection = { type: 'FeatureCollection', features: [] };
  let mapReady = false;
  let sourceReady = false;
  let isRotating = true;
  let userInteracting = false;
  let isFlying = false; // Prevents rotation from interrupting camera flyTo animations
  let fogEnabled = true;
  let popup = null;
  let spinAnimation = null;
  let flySafetyTimer = null;

  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        earthImagery: {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'Satellite Imagery © Esri, Maxar, Earthstar Geographics'
        }
      },
      layers: [
        {
          id: 'earth-imagery',
          type: 'raster',
          source: 'earthImagery',
          paint: {
            'raster-opacity': 0.95,
            'raster-saturation': -0.12,
            'raster-contrast': 0.2,
            'raster-brightness-min': 0.02,
            'raster-brightness-max': 0.88
          }
        }
      ],
      glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf'
    },
    center: [18, 14],
    zoom: 1.25,
    minZoom: 1,
    maxZoom: 14,
    pitch: 15,
    projection: { type: 'globe' },
    attributionControl: false,
    dragRotate: true,
    touchPitch: true,
    cooperativeGestures: false
  });

  // Apply Atmospheric Fog & Starfield
  function setAtmosphereFog(enabled) {
    if (typeof map.setFog !== 'function') return;
    if (enabled) {
      map.setFog({
        color: 'rgb(4, 10, 24)',
        'high-color': 'rgb(24, 78, 138)',
        'space-color': 'rgb(1, 4, 10)',
        'horizon-blend': 0.18,
        'star-intensity': 0.85
      });
    } else {
      map.setFog({
        color: 'rgb(2, 4, 10)',
        'high-color': 'rgb(4, 10, 20)',
        'space-color': 'rgb(0, 0, 0)',
        'horizon-blend': 0.02,
        'star-intensity': 0.1
      });
    }
  }

  function toFeature(d) {
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [Number(d.longitude), Number(d.latitude)] },
      properties: {
        id: Number(d.id),
        sensor: String(d.sensor || ''),
        satellite: String(d.satellite || ''),
        frp: Number(d.frp || 0),
        brightness: Number(d.brightness || 0),
        hfai: Number(d.hfai || 0),
        status: String(d.status || 'Nominal'),
        date: String(d.acq_date || ''),
        time: String(d.acq_time || ''),
        confidence: String(d.confidence ?? 'nominal'),
        agreement: Number(d.sensor_agreement || 0),
        grid_id: String(d.grid_id || ''),
        daynight: String(d.daynight || 'D')
      }
    };
  }

  function collection(records) {
    return { type: 'FeatureCollection', features: (records || []).map(toFeature) };
  }

  function addDataLayers() {
    // cluster: false ensures every single one of the 200 dots is individually rendered!
    map.addSource('fire-observations', {
      type: 'geojson',
      data: emptyCollection,
      cluster: false
    });

    map.addSource('selected-observation', {
      type: 'geojson',
      data: emptyCollection
    });

    // 1. MODIS & VIIRS Multi-Tier Thermal Beacon Architecture
    // Specially tuned so EVERY dot shines with radiant clarity across the globe at any zoom level!
    for (const sensor of ['MODIS', 'VIIRS']) {
      const id = sensor.toLowerCase();
      const isModis = sensor === 'MODIS';
      const glowColor = isModis ? '#ff3d00' : '#00e5ff';
      const ringColor = isModis ? '#ff781f' : '#38bdf8';
      const sparkColor = '#ffffff';

      // Tier 1: Outer Atmospheric Luminous Aura (Expansive radial glow)
      map.addLayer({
        id: `${id}-glow`,
        type: 'circle',
        source: 'fire-observations',
        filter: ['==', ['get', 'sensor'], sensor],
        paint: {
          'circle-color': glowColor,
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, [
              'interpolate', ['linear'], ['get', 'hfai'],
              0, 7.5,
              0.5, 12,
              1, 20
            ],
            5, [
              'interpolate', ['linear'], ['get', 'hfai'],
              0, 12,
              0.5, 19,
              1, 32
            ]
          ],
          'circle-opacity': 0.72,
          'circle-blur': 0.5,
          'circle-pitch-alignment': 'viewport'
        }
      });

      // Tier 2: Radiant Thermal Disk (Vivid sensor signature ring with white stroke)
      map.addLayer({
        id: `${id}-points`,
        type: 'circle',
        source: 'fire-observations',
        filter: ['==', ['get', 'sensor'], sensor],
        paint: {
          'circle-color': ringColor,
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, [
              'interpolate', ['linear'], ['get', 'hfai'],
              0, 4.0,
              0.5, 6.0,
              1, 9.0
            ],
            5, [
              'interpolate', ['linear'], ['get', 'hfai'],
              0, 5.5,
              0.5, 8.5,
              1, 13.0
            ]
          ],
          'circle-opacity': 1,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.4,
          'circle-pitch-alignment': 'viewport'
        }
      });

      // Tier 3: Core Star Spark (Crisp radiant white center, ensuring immediate visibility)
      map.addLayer({
        id: `${id}-spark`,
        type: 'circle',
        source: 'fire-observations',
        filter: ['==', ['get', 'sensor'], sensor],
        paint: {
          'circle-color': sparkColor,
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            1, 2.0,
            5, 3.5
          ],
          'circle-opacity': 0.95,
          'circle-pitch-alignment': 'viewport'
        }
      });
    }

    // 2. Selected Reticle Outer Halo
    map.addLayer({
      id: 'selected-ring-outer',
      type: 'circle',
      source: 'selected-observation',
      paint: {
        'circle-radius': 22,
        'circle-color': 'rgba(56, 189, 248, 0.25)',
        'circle-stroke-color': '#38bdf8',
        'circle-stroke-width': 1.8,
        'circle-stroke-dasharray': [2, 1],
        'circle-pitch-alignment': 'viewport'
      }
    });

    // 3. Selected Reticle Inner Target
    map.addLayer({
      id: 'selected-ring',
      type: 'circle',
      source: 'selected-observation',
      paint: {
        'circle-radius': 11,
        'circle-color': 'rgba(255, 255, 255, 0)',
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2.6,
        'circle-pitch-alignment': 'viewport'
      }
    });

    sourceReady = true;
  }

  function updateSelectedPoint() {
    if (!sourceReady || typeof state === 'undefined' || !state.selected) return;
    const selected = state.selected;
    const source = map.getSource('selected-observation');
    if (source) source.setData(collection([selected]));

    // Update Floating HUD Target Card
    const targetName = document.getElementById('hudTargetName');
    const targetHfai = document.getElementById('hudTargetHfai');
    const targetFrp = document.getElementById('hudTargetFrp');
    if (targetName) targetName.textContent = `${selected.sensor} · ${selected.satellite}`;
    if (targetHfai) targetHfai.textContent = Number(selected.hfai).toFixed(2);
    if (targetFrp) targetFrp.textContent = `${Number(selected.frp).toFixed(1)} MW`;
  }

  function safe(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function showPopup(feature, lngLat) {
    const p = feature.properties;
    if (popup) popup.remove();
    popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      maxWidth: '280px',
      offset: 14,
      className: 'fire-mission-popup'
    })
      .setLngLat(lngLat)
      .setHTML(`
        <div class="fire-popup-box">
          <div class="popup-head">
            <span class="popup-sensor-badge ${p.sensor.toLowerCase()}">${safe(p.sensor)}</span>
            <span class="popup-sat-tag">${safe(p.satellite)}</span>
          </div>
          <div class="popup-title">
            <strong>${safe(p.status)} Thermal Anomaly</strong>
          </div>
          <div class="popup-grid">
            <div class="p-stat"><span>HFAI INDEX</span><b class="hfai-num">${Number(p.hfai).toFixed(2)}</b></div>
            <div class="p-stat"><span>FRP (MW)</span><b>${Number(p.frp).toFixed(1)} MW</b></div>
            <div class="p-stat"><span>TEMP</span><b>${Number(p.brightness).toFixed(1)} K</b></div>
            <div class="p-stat"><span>AGREEMENT</span><b>${Math.round(p.agreement * 100)}%</b></div>
          </div>
          <div class="popup-meta">
            <div><span>GRID ID:</span> ${safe(p.grid_id)}</div>
            <div><span>ACQUIRED:</span> ${safe(p.date)} ${safe(p.time)} UTC</div>
          </div>
          <button type="button" class="popup-deep-link" onclick="window.selectObservation(${Number(p.id)}, true); if(window.setView) window.setView('lab');">
            INSPECT IN SCENARIO LAB →
          </button>
        </div>
      `)
      .addTo(map);

    originalSelectObservation(Number(p.id), false);
    updateSelectedPoint();
  }

  function setCursor(value) {
    map.getCanvas().style.cursor = value;
  }

  // Smooth Earth Auto-Rotation (Dampened dynamically at high zoom so continents remain stationed)
  function spinStep() {
    if (isRotating && !userInteracting && !isFlying && mapReady && map) {
      const center = map.getCenter();
      const zoom = map.getZoom();
      // At zoom 1.25: 0.08 deg (planetary orbit)
      // At zoom 3.2+: step smoothly dampens so regions stay in frame while rotation is ON
      const step = 0.08 * Math.pow(0.55, Math.max(0, zoom - 1.25));
      center.lng -= step;
      map.easeTo({ center, duration: 110, easing: (t) => t });
    }
    spinAnimation = setTimeout(spinStep, 110);
  }

  map.on('load', () => {
    try {
      map.setProjection({ type: 'globe' });
      setAtmosphereFog(true);
    } catch (err) {
      console.warn('Atmospheric globe effect note:', err);
    }

    addDataLayers();
    mapReady = true;

    const loader = document.getElementById('mapLoadingState');
    if (loader) loader.style.display = 'none';

    map.resize();
    if (typeof window.renderMap === 'function') window.renderMap();

    // Start auto-rotation
    spinStep();
  });

  // User Interaction Temporarily Pauses Auto-Rotation
  map.on('mousedown', () => { userInteracting = true; });
  map.on('mouseup', () => { userInteracting = false; });
  map.on('dragend', () => { userInteracting = false; });
  map.on('touchstart', () => { userInteracting = true; });
  map.on('touchend', () => { userInteracting = false; });

  for (const sensor of ['modis', 'viirs']) {
    map.on('click', `${sensor}-points`, (event) => {
      const feature = event.features && event.features[0];
      if (feature) showPopup(feature, event.lngLat);
    });
    map.on('mouseenter', `${sensor}-points`, () => setCursor('pointer'));
    map.on('mouseleave', `${sensor}-points`, () => setCursor('grab'));
  }

  map.on('mousemove', (event) => {
    const coords = document.getElementById('mapCoordinates');
    if (coords) {
      const lat = event.lngLat.lat;
      const lng = event.lngLat.lng;
      const latStr = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
      const lngStr = `${Math.abs(lng).toFixed(2)}° ${lng >= 0 ? 'E' : 'W'}`;
      coords.textContent = `TARGET: ${latStr} / ${lngStr} · ELEV ${(map.getZoom() * 420).toFixed(0)}KM`;
    }
  });

  map.on('error', (event) => {
    if (event && event.error) {
      console.warn('MapLibre resource warning:', event.error.message || event.error);
    }
  });

  // Global Camera Orbit Presets Configuration
  const CAMERA_PRESETS = {
    global: { center: [18, 14], zoom: 1.25, pitch: 15, bearing: 0, label: 'GLOBAL' },
    namerica: { center: [-98, 38], zoom: 3.2, pitch: 25, bearing: -5, label: 'N. AMERICA' },
    samerica: { center: [-60, -18], zoom: 3.2, pitch: 20, bearing: 10, label: 'S. AMERICA' },
    africa: { center: [20, 2], zoom: 3.2, pitch: 20, bearing: 0, label: 'AFRICA' },
    eurasia: { center: [85, 48], zoom: 2.8, pitch: 25, bearing: -10, label: 'EURASIA' },
    oceania: { center: [134, -25], zoom: 3.4, pitch: 20, bearing: 15, label: 'OCEANIA' }
  };

  // Safe Camera Transition Helper (Guaranteed to work whether rotation is ON or OFF!)
  function flyCameraSafely(cameraConfig, onComplete) {
    isFlying = true;
    if (popup) popup.remove();
    if (flySafetyTimer) clearTimeout(flySafetyTimer);

    try { map.stop(); } catch (err) {}

    const statusText = document.getElementById('hudStatusText');
    if (statusText) statusText.textContent = 'CAMERA REPOSITIONING…';

    let finished = false;
    const finishFlight = () => {
      if (finished) return;
      finished = true;
      if (flySafetyTimer) clearTimeout(flySafetyTimer);
      isFlying = false;
      const status = document.getElementById('hudStatusText');
      if (status) {
        status.textContent = isRotating ? 'AUTONOMOUS ORBIT ACTIVE' : 'ORBIT STATIONED';
      }
      if (onComplete) onComplete();
    };

    map.once('moveend', finishFlight);

    map.flyTo({
      ...cameraConfig,
      duration: 1200,
      essential: true
    });

    // Safety fallback timer
    flySafetyTimer = setTimeout(finishFlight, 1350);
  }

  // Preset Navigation Buttons Wiring
  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const presetKey = btn.dataset.preset;

      if (presetKey === 'peak') {
        const records = typeof state !== 'undefined'
          ? (Array.isArray(state.sensorFiltered) ? state.sensorFiltered : (Array.isArray(state.filtered) ? state.filtered : []))
          : [];
        if (records && records.length) {
          const peak = [...records].sort((a, b) => Number(b.hfai) - Number(a.hfai))[0];
          if (peak) {
            window.selectObservation(peak.id, true);
            flyCameraSafely({
              center: [Number(peak.longitude), Number(peak.latitude)],
              zoom: 5.5,
              pitch: 35,
              bearing: 15
            }, () => {
              showPopup(toFeature(peak), [Number(peak.longitude), Number(peak.latitude)]);
            });
          }
        }
        return;
      }

      const cfg = CAMERA_PRESETS[presetKey];
      if (cfg) {
        flyCameraSafely(cfg);
      }
    });
  });

  // Rotation Toggle Button Wiring
  const spinBtn = document.getElementById('mapToggleSpin');
  if (spinBtn) {
    spinBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isRotating = !isRotating;
      spinBtn.classList.toggle('active', isRotating);
      const dot = spinBtn.querySelector('.pill-dot');
      if (dot) dot.classList.toggle('live', isRotating);
      spinBtn.innerHTML = `<span class="pill-dot ${isRotating ? 'live' : ''}"></span> ROTATION: ${isRotating ? 'ON' : 'OFF'}`;
      const statusText = document.getElementById('hudStatusText');
      if (statusText) {
        statusText.textContent = isRotating ? 'AUTONOMOUS ORBIT ACTIVE' : 'ORBIT STATIONED';
      }
      if (!isRotating) {
        try { map.stop(); } catch (err) {}
      }
    });
  }

  // Fog Toggle Button Wiring
  const fogBtn = document.getElementById('mapToggleFog');
  if (fogBtn) {
    fogBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fogEnabled = !fogEnabled;
      fogBtn.classList.toggle('active', fogEnabled);
      fogBtn.textContent = `ATMOSPHERE: ${fogEnabled ? 'ON' : 'OFF'}`;
      setAtmosphereFog(fogEnabled);
    });
  }

  // Center Orbit on Active Target Wiring
  const flyTargetBtn = document.getElementById('hudFlyToTarget');
  if (flyTargetBtn) {
    flyTargetBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof state !== 'undefined' && state.selected) {
        flyCameraSafely({
          center: [Number(state.selected.longitude), Number(state.selected.latitude)],
          zoom: 5.5,
          pitch: 35,
          bearing: 15
        }, () => {
          showPopup(toFeature(state.selected), [Number(state.selected.longitude), Number(state.selected.latitude)]);
        });
      }
    });
  }

  // Zoom and Reset controls
  document.getElementById('mapZoomIn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isFlying = true;
    map.zoomTo(Math.min(map.getZoom() + 0.9, 14), { duration: 350 });
    setTimeout(() => { isFlying = false; }, 400);
  });
  document.getElementById('mapZoomOut')?.addEventListener('click', (e) => {
    e.stopPropagation();
    isFlying = true;
    map.zoomTo(Math.max(map.getZoom() - 0.9, 1), { duration: 350 });
    setTimeout(() => { isFlying = false; }, 400);
  });
  document.getElementById('mapReset')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (popup) popup.remove();
    flyCameraSafely({ center: [18, 14], zoom: 1.25, pitch: 15, bearing: 0 });
    document.querySelectorAll('[data-preset]').forEach((b) => b.classList.remove('active'));
    document.querySelector('[data-preset="global"]')?.classList.add('active');
  });

  // Filter Reset Button in HUD
  const resetFilterBtn = document.getElementById('hudResetFilterBtn');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window.resetAllFilters === 'function') {
        window.resetAllFilters();
      }
    });
  }

  window.renderMap = function renderGlobeMap() {
    if (!mapReady || !sourceReady) return;
    const records = typeof state !== 'undefined'
      ? (Array.isArray(state.sensorFiltered) ? state.sensorFiltered : (Array.isArray(state.filtered) ? state.filtered : []))
      : [];
    map.getSource('fire-observations').setData(collection(records));

    const count = document.getElementById('globeRecordCount');
    if (count) count.textContent = `${records.length} DETECTIONS`;

    const resetBtn = document.getElementById('hudResetFilterBtn');
    if (resetBtn && typeof state !== 'undefined' && Array.isArray(state.observations)) {
      if (records.length < state.observations.length) {
        resetBtn.style.display = 'inline-flex';
        resetBtn.textContent = `↺ RESET FILTER (${records.length}/${state.observations.length})`;
      } else {
        resetBtn.style.display = 'none';
      }
    }

    if (records.length && (!state.selected || !records.find((r) => r.id === state.selected.id))) {
      const highest = [...records].sort((a, b) => Number(b.hfai) - Number(a.hfai))[0];
      if (highest) window.selectObservation(highest.id, false);
    } else {
      updateSelectedPoint();
    }
  };

  window.selectObservation = function selectObservationWithGlobe(id, updatePicker = true) {
    originalSelectObservation(id, updatePicker);
    updateSelectedPoint();
  };

  // Expose Globe Controller for External Modules
  window.globeController = {
    map,
    resize: () => { if (map) map.resize(); },
    flyToCoords: (lng, lat, zoom = 5.2) => {
      flyCameraSafely({ center: [Number(lng), Number(lat)], zoom, pitch: 30, bearing: 15 });
    },
    selectAndFly: (id) => {
      window.selectObservation(id, true);
      if (state.selected) {
        window.globeController.flyToCoords(state.selected.longitude, state.selected.latitude);
      }
    }
  };

  window.addEventListener('resize', () => {
    if (map) map.resize();
  });
})();
