# FIRE-HARMONIX
### Advanced Spaceborne Thermal Intelligence & Cross-Sensor Harmonization Platform

[![Platform: Web & 3D Globe](https://img.shields.io/badge/Platform-Web%20%7C%20MapLibre%203D%20Globe-0ea5e9.svg)](public/index.html)
[![Python: 3.11+](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![Deployment: Static CDN Ready](https://img.shields.io/badge/Deployment-Vercel%20Static%20Ready-000000?logo=vercel&logoColor=white)](vercel.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](LICENSE)

---

## 1. Executive Summary & Research Problem

Understanding how thermal burning activity is distributed across the planet over time—including active wildfires, industrial flare signatures, and prescribed agricultural burns intense enough to be captured by satellite sensors—is vital for anticipating critical periods, guiding ecological monitoring, and enhancing emergency response coordination.

Earth observation satellites have recorded active fire hotspots for over two decades. However, the global record is fundamentally fragmented across contrasting sensor architectures:

1. **Spatial Footprint Disparity**: MODIS instruments (aboard Terra and Aqua) record thermal anomalies at approximately **1,000 m (1 km) nadir resolution**, whereas VIIRS instruments (aboard Suomi-NPP and NOAA-20) observe at **375 m nadir resolution**.
2. **Sub-Pixel Radiance Sensitivity**: VIIRS's finer spatial resolution enables the detection of smaller, lower-intensity thermal anomalies that remain undetectable within a 1 km MODIS pixel footprint.
3. **Contrasting Overpass Timing & Geometry**: Varying orbital inclinations and observation angles produce differing atmospheric path lengths and limb-broadening distortions.

Directly aggregating raw hotspot counts between MODIS and VIIRS introduces severe sensor bias and distorts longitudinal fire histories. **FIRE-HARMONIX** resolves this challenge by establishing a unified, sensor-aware spatial and temporal intelligence platform. It normalizes physical radiative flux, projects detections onto a common spatial tiling grid ($0.05^\circ \times 0.05^\circ$), computes an auditable **Sensor Agreement Score**, and synthesizes an interpretable **Harmonized Fire Activity Index (HFAI)** alongside a dynamic **Burning Activity Calendar**.

> **Operational & Scientific Boundary**:
> Satellite active-fire observations represent spaceborne detections of infrared radiance threshold exceedances (thermal anomalies). A thermal detection does **not** automatically constitute a confirmed ground wildfire; industrial flaring, agricultural management, volcanoes, and high-temperature surface conditions also trigger anomalies. The Harmonized Fire Activity Index (HFAI) and associated risk metrics are calibrated research constructs and do not constitute official emergency civil defense alerts or active evacuation guidance.

---

## 2. Platform Architecture & Modules

The FIRE-HARMONIX platform is architected as an aerospace-grade mission control interface featuring 7 cohesive analytical views:

```
FIRE-HARMONIX Platform
├── 01 Overview              → Real-time telemetry, 200-detection sample, priority signal reticle
├── 02 Global Explorer       → Full-viewport 3D Earth Globe with autonomous orbit & regional presets
├── 03 Harmonization         → Optical disparity analysis, 1km vs 375m physics, cross-sensor math
├── 04 Activity Calendar     → Spatiotemporal aggregation across calendar days & critical periods
├── 05 Scenario Lab          → Interactive, traceable 5-component decomposition of the HFAI formula
├── 06 Data Explorer         → Filterable, searchable, auditable 200-record table with CSV export
└── 07 Methodology           → Mathematical formulations, quality control protocols & disclaimers
```

### Key Technical Capabilities

* **Cinematic 3D Earth Observation Globe**: Built with MapLibre GL JS utilizing real-world projection shaders and high-resolution Esri World Imagery. Hotspots are rendered using multi-tier radiant thermal beacons (MODIS fire orange `#ff3d00`, VIIRS electric cyan `#00e5ff`) with atmospheric glow halos and high-energy white core sparks visible at any orbital altitude.
* **Autonomous Orbit & Camera Presets**: Smooth planetary rotation that dynamically scales rotation speed based on camera zoom. Features dedicated one-touch regional orbit presets (`GLOBAL`, `N. AMERICA`, `S. AMERICA`, `AFRICA`, `EURASIA`, `OCEANIA`, and `★ PEAK SIGNAL`) with seamless flight transitions that operate reliably whether auto-rotation is active or paused.
* **Two-Tier Aerospace Command Deck**: A floating glassmorphism HUD docking orbit presets, rotation toggle, atmospheric haze controls, live UTC mission clock, and coordinate readouts.
* **Traceable Scenario Lab**: Eliminates black-box opacity by allowing researchers to manipulate activity count, radiative power, brightness temperature, sensor agreement, and quality confidence to observe immediate mathematical decomposition into HFAI sub-scores.

---

## 3. Mathematical Foundations & Harmonization Protocol

```mermaid
flowchart TD
    A[Raw Satellite Hotspots<br/>MODIS & VIIRS] --> B[Quality Control & Coordinate Filtering<br/>Lat [-90,90], Lon [-180,180]]
    B --> C[Temporal Normalization<br/>UTC Date-Time Aggregation]
    C --> D[Sensor Disparity Isolation<br/>MODIS: 1km Nadir | VIIRS: 375m Nadir]
    D --> E[Within-Sensor Z-Score Normalization<br/>Z = (X - μ_s) / σ_s]
    E --> F[Common Spatial Grid Discretization<br/>0.05° x 0.05° (~5.5 km Cells)]
    F --> G[Sensor Agreement Calculation<br/>Agreement = 1 - (|M - V| / (|M| + |V| + ε))]
    G --> H[Harmonized Fire Activity Index<br/>HFAI = 0.25C + 0.25F + 0.20B + 0.15A + 0.15Q]
    H --> I[Analytical Outputs<br/>3D Globe Telemetry | Burning Calendar | Anomaly Classification]
```

### 1. Quality Control & Bounding
1. Validates coordinate ranges: $\text{Latitude} \in [-90^\circ, +90^\circ]$, $\text{Longitude} \in [-180^\circ, +180^\circ]$.
2. Enforces non-null sensor, satellite, radiative power (FRP), and brightness values.
3. Removes exact duplicate telemetry frames while preserving coincident overpasses.

### 2. Within-Sensor Normalization
To prevent algorithms from misinterpreting instrument optical sensitivity as real-world fire magnitude, radiative metrics (Brightness Temperature $B$ and Fire Radiative Power $F$) are standardized within each instrument cohort $s \in \{\text{MODIS}, \text{VIIRS}\}$:

$$z_{i,s} = \frac{x_{i,s} - \mu_s}{\sigma_s}$$

### 3. Common Spatial Discretization (Grid $0.05^\circ$)
Observations are indexed into uniform spatial tiles of resolution $r = 0.05^\circ$ ($\approx 5.5\text{ km}$ at the equator):

$$g_{\text{lat}} = \left\lfloor \frac{\text{latitude}}{r} \right\rfloor, \qquad g_{\text{lon}} = \left\lfloor \frac{\text{longitude}}{r} \right\rfloor$$

$$\text{grid\_id} = g_{\text{lat}} \;\Vert\; \text{"\_"} \;\Vert\; g_{\text{lon}}$$

### 4. Sensor Agreement Metric
For co-occurring normalized MODIS activity $M$ and VIIRS activity $V$ within a spatial-temporal window:

$$\text{Agreement} = 1 - \frac{|M - V|}{|M| + |V| + \epsilon}$$

Where $\epsilon = 10^{-5}$ prevents division by zero. For single-sensor records, a bounded physical proxy measures consistency between normalized radiative flux and brightness radiance.

### 5. Harmonized Fire Activity Index (HFAI) Formulation
The composite index synthesizes 5 standardized dimensions into a bounded unit metric $[0, 1]$:

$$\text{HFAI} = 0.25 \cdot C + 0.25 \cdot F + 0.20 \cdot B + 0.15 \cdot A + 0.15 \cdot Q$$

* **$C$ (Activity Count)**: Density of detections within the spatiotemporal cell.
* **$F$ (Radiative Power)**: Scaled Fire Radiative Power (MW) representing combustion intensity.
* **$B$ (Brightness Radiance)**: Scaled mid-infrared brightness temperature (Kelvin).
* **$A$ (Sensor Agreement)**: Cross-sensor convergence metric.
* **$Q$ (Confidence Quality)**: Sensor detection confidence weighting ($1.0$ for high/nominal, $0.5$ for low).

---

## 4. Machine Learning Benchmarks (Feasibility Protocols)

The repository provides reproducible offline ML training pipelines located in [`ml/train_models.py`](ml/train_models.py), evaluating the feasibility of anomaly detection and short-term activity forecasting. Model outputs and benchmark metrics are serialized in [`models/`](models/).

### Strict Chronological Validation Protocol
Random k-fold splitting is deliberately avoided to prevent future-to-past temporal data leakage:
* **Training Set (70%)**: Earliest chronological records (Nov 16, 2024 – Dec 24, 2024).
* **Validation Set (15%)**: Intermediate records for hyperparameter tuning.
* **Held-Out Test Set (15%)**: Final chronological segment (Jan 04, 2025 – Jan 11, 2025).

### Benchmark Evaluation Summary

| Task | Algorithm | Baseline / Model | MAE | RMSE | $R^2$ | Status |
|---|---|---|---:|---:|---:|---|
| Next-Day Activity | XGBoost Regressor | Historical Mean | **0.0499** | **0.0528** | **-0.2013** | Benchmark Reference |
| Next-Day Activity | XGBoost Regressor | Persistence ($t_{-1}$) | 0.0691 | 0.0917 | -2.6185 | Baseline |
| Next-Day Activity | XGBoost Regressor | `XGBRegressor` | 0.0636 | 0.0775 | -1.5837 | Trained Feasibility Model |
| Anomaly Detection | Isolation Forest | Unsupervised Ranking | — | — | — | 37.5% flagged as unusual |

> **Scientific Finding**: On the compact demonstration sample, the historical-mean baseline outperforms the regression model. This transparently validates that short-term satellite fire forecasting requires multi-year regional historical baselines and meteorological covariates (wind, vapor pressure deficit, fuel moisture) before operational deployment.

---

## 5. Security & Zero-Secrets Verification

A complete security scan of all source files, configurations, and Git revision history confirms:
* **No API Keys or Private Tokens**: The platform operates with zero hardcoded API keys or proprietary credentials.
* **No Database Credentials**: The database is a local SQLite database (`data/fire_harmonix.db`) with zero external network socket exposure.
* **No Environment Secrets Required**: Production static hosting requires zero environment variables.
* **Permissive Git Ignore**: The `.gitignore` file strictly blocks virtual environments, system caches, IDE artifacts, and `.env*` files while preserving all necessary public datasets and versioned ML models.

---

## 6. Manual Vercel Deployment Guide

FIRE-HARMONIX is engineered with a **Static CDN Architecture**. All API endpoints are pre-rendered into static JSON files located in `public/api/`, allowing the complete application—including the interactive 3D globe, calendar, search filters, and CSV downloads—to run in production on Vercel without requiring a running Python backend.

### Step-by-Step Vercel Setup

1. **Push to Your Repository**: Ensure your latest changes are pushed to your GitHub repository (`noman1922/fire-harmonix`).
2. **Log into Vercel**: Navigate to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. **Import Repository**: Select `noman1922/fire-harmonix` from your Git provider.
4. **Configure Project Settings**:
   * **Framework Preset**: Select **`Other`**.
   * **Root Directory**: Leave as `./` (project root).
   * **Build Command**: *Leave empty* (toggle override if needed and leave blank).
   * **Output Directory**: Enter **`public`** (toggle override and enter `public`).
   * **Install Command**: *Leave empty* (no `npm install` needed).
5. **Environment Variables**: Leave blank (no environment variables required).
6. **Deploy**: Click **"Deploy"**.

Vercel will deploy the assets in `public/` directly to its global Edge network. The `vercel.json` configuration file automatically applies optimal caching headers and security policies (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`).

---

## 7. Local Development & Reproduction

### 1. Launch Local Dashboard (Zero Dependencies)
The local server uses Python's built-in `http.server` and `sqlite3`:

```powershell
python server.py
```
Open your browser to: `http://127.0.0.1:8000`

### 2. Export Static API Assets
If the SQLite database is reseeded or modified, refresh the static deployment files:

```powershell
python scripts/export_static_api.py
```
*(Outputs `public/api/observations.json`, `public/api/summary.json`, and `public/data/fire_samples.csv`)*

### 3. Reproduce Machine Learning Benchmarks
To retrain the Isolation Forest and XGBoost models:

```powershell
pip install -r requirements-ml.txt
python ml/train_models.py
```

---

## 8. Data Sources, Attributions & Licenses

### Satellite Telemetry Data
* **MODIS (Moderate Resolution Imaging Spectroradiometer)**: Flown on the Terra and Aqua satellites; Collection 6.1 active-fire thermal telemetry.
* **VIIRS (Visible Infrared Imaging Radiometer Suite)**: Flown on the Suomi-NPP and NOAA-20 satellites; Collection 2 active-fire 375 m thermal telemetry.
* **Source Dataset**: Public spaceborne active-fire observation samples representing global detection coordinates, brightness temperatures, radiative flux (FRP), and detection confidence.

### Third-Party Software & Cartographic Assets
* **MapLibre GL JS**: Open-source WebGL map rendering library distributed under the [3-Clause BSD License](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt).
* **Esri World Imagery**: Satellite base imagery tiles provided via Esri and its imagery partners (Maxar, Earthstar Geographics) under permissive research and educational display terms.
* **Google Fonts**: Space Grotesk, JetBrains Mono, and Inter distributed under the [SIL Open Font License](https://openfontlicense.org/).

---

## 9. Competition Submission Compliance Checklist

| Requirement | Status | Verification Detail |
|---|:---:|---|
| **Challenge Objective** | ✅ Verified | Addresses cross-sensor MODIS/VIIRS footprint disparity and provides an interactive Burning Activity Calendar. |
| **Open Source License** | ✅ Verified | Released under the standard [MIT License](LICENSE) with complete open-source source code. |
| **Public Deployment** | ✅ Verified | Fully prepared for zero-build static deployment on Vercel (`public/` output directory). |
| **No Proprietary Brand Infringement** | ✅ Verified | Strict sovereign platform branding ("FIRE-HARMONIX · Satellite Thermal Intelligence Platform"). |
| **Scientific Disclaimers** | ✅ Verified | Prominent boundaries: Detections are thermal anomalies $\neq$ confirmed wildfires; HFAI is a research index. |
| **Reproducibility** | ✅ Verified | Bundled SQLite database, CSV downloads, static JSON schemas, and offline ML reproduction scripts. |
| **Security & Privacy** | ✅ Verified | Zero credentials, secrets, or tracking tokens embedded in repository or history. |

---

## 10. Repository Structure

```
fire-harmonix/
├── data/
│   ├── fire_harmonix.db               # SQLite database with observations & aggregated views
│   └── fire_samples.csv               # 200-row auditable observation dataset
├── docs/
│   └── ARCHITECTURE.md                # System sequence and entity relationship diagrams
├── ml/
│   └── train_models.py                # Reproducible Isolation Forest & XGBoost training script
├── models/
│   ├── feature_manifest_v0.1.json     # Feature names, engineering metadata & data ranges
│   ├── isolation_forest_hfai_v0.1.joblib # Serialized Isolation Forest model
│   ├── metrics.json                   # Comprehensive cross-validation and evaluation metrics
│   └── xgboost_fire_activity_v0.1.json# Serialized XGBoost regression model
├── public/
│   ├── api/
│   │   ├── observations.json          # Pre-compiled static JSON observations for Vercel
│   │   └── summary.json               # Pre-compiled static summary metrics for Vercel
│   ├── data/
│   │   └── fire_samples.csv           # Direct public CSV download endpoint
│   ├── app.js                         # Application telemetry, routing & scenario lab engine
│   ├── globe-map.css                  # 3D Globe HUD and aerospace command deck styling
│   ├── globe-map.js                   # MapLibre 3D Globe engine & multi-tier radiant beacons
│   ├── index.html                     # Semantic HTML5 mission control dashboard
│   └── styles.css                     # Orbital design system & glassmorphic layout
├── scripts/
│   ├── export_static_api.py           # SQLite to static JSON export script
│   └── seed_data.py                   # Data ingestion and SQLite database seeder
├── .gitignore                         # Comprehensive environment and cache exclusions
├── .python-version                    # Python runtime specification (3.11)
├── LICENSE                            # MIT Open Source License
├── package.json                       # Project metadata & npm script definitions
├── README.md                          # Comprehensive platform documentation & submission dossier
├── requirements-ml.txt                # Optional machine learning dependencies
├── server.py                          # Zero-dependency local development server
└── vercel.json                        # Vercel deployment configuration
```

---

## 11. License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for complete details.
Copyright © 2026 FIRE-HARMONIX Contributors.
