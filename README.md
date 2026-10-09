# FIRE-HARMONIX

### Sensor-aware satellite fire intelligence for harmonizing MODIS and VIIRS observations

FIRE-HARMONIX is an independent research prototype for exploring and
comparing satellite-detected thermal anomalies from MODIS and VIIRS. It
combines an interactive 3D Earth globe, a shared spatial grid, a
transparent Harmonized Fire Activity Index (HFAI), an activity calendar,
and auditable observation data.

> **Scientific boundary:** A satellite thermal detection is not
> automatically a confirmed wildfire. It may represent a wildfire,
> agricultural burn, industrial flare, volcanic activity, or another hot
> surface. HFAI, agreement scores, anomaly labels, and benchmark
> forecasts are project-defined research outputs, not official alerts or
> emergency guidance.

## Contents

-   [Project at a glance](#project-at-a-glance)
-   [Why it exists](#why-it-exists)
-   [Features](#features)
-   [Architecture diagrams](#architecture-diagrams)
-   [Data and methodology](#data-and-methodology)
-   [HFAI formula](#hfai-formula)
-   [Machine-learning benchmarks](#machine-learning-benchmarks)
-   [API and static files](#api-and-static-files)
-   [Repository structure](#repository-structure)
-   [Run locally](#run-locally)
-   [Deploy to Vercel](#deploy-to-vercel)
-   [Security](#security)
-   [Limitations](#limitations)
-   [Competition checklist](#competition-checklist)
-   [Sources and attribution](#sources-and-attribution)
-   [License](#license)

## Project at a glance

  -----------------------------------------------------------------------
  Item                                Details
  ----------------------------------- -----------------------------------
  Purpose                             Sensor-aware exploration of MODIS
                                      and VIIRS thermal observations

  Interface                           HTML, CSS, JavaScript, MapLibre GL
                                      JS

  Local data service                  Python and SQLite

  Static hosting                      Vercel serving files from `public/`

  Included sample                     200 observations in the current
                                      dataset

  Common grid                         0.05° × 0.05°

  Research index                      Harmonized Fire Activity Index
                                      (HFAI)

  ML experiments                      Offline Isolation Forest and
                                      XGBoost

  Code license                        MIT, subject to third-party data
                                      and asset terms
  -----------------------------------------------------------------------

The 200-observation sample is a demonstration dataset, not a complete
live global fire archive.

## Why it exists

MODIS and VIIRS have different spatial resolutions, sensor
characteristics, and detection sensitivities. MODIS active-fire products
are commonly described at approximately 1 km nadir resolution, while
VIIRS active-fire products are commonly described at approximately 375 m
nadir resolution. Raw detection counts should not automatically be
treated as equivalent.

FIRE-HARMONIX demonstrates a transparent workflow to validate
observations, standardize time and sensor fields, map observations to a
common geographic grid, calculate project-defined features, and explore
results through a globe, calendar, and data table.

## Features

-   Interactive 3D Earth globe with regional camera presets and orbit
    controls.
-   MODIS and VIIRS filtering and distinct marker styles.
-   Clickable observations with coordinates, time, sensor, brightness,
    FRP, and derived fields where available.
-   Shared 0.05-degree grid identifiers.
-   Sensor comparison and harmonization pipeline.
-   Burning Activity Calendar.
-   Scenario Lab for inspecting HFAI calculations.
-   Searchable observation table and CSV download.
-   Static JSON assets for hosting without a running backend.
-   SQLite database and scripts for local data preparation.
-   Offline Isolation Forest and XGBoost feasibility experiments.

## Application modules

1.  **Overview:** Dataset summary, map, and selected-observation panel.
2.  **Global Explorer:** Expanded map for exploring sample coordinates.
3.  **Sensor Harmonization:** Sensor comparisons and processing
    explanation.
4.  **Activity Calendar:** Daily activity values from the sample.
5.  **Scenario Lab:** Deterministic HFAI inspection, not a live ML
    prediction service.
6.  **Data Explorer:** Observation table and CSV download.
7.  **Methodology:** Processing steps, assumptions, and limitations.

## Architecture diagrams

### Data preparation and dashboard

``` mermaid
flowchart TD
    A["MODIS and VIIRS sample files"] --> B["Validation and preparation"]
    B --> C["SQLite database"]
    C --> D["Static export script"]
    D --> E["Summary JSON"]
    D --> F["Observation JSON"]
    D --> G["CSV download"]
    E --> H["Browser dashboard"]
    F --> H
    G --> H
    H --> I["MapLibre globe"]
    H --> J["Harmonization views"]
    H --> K["Activity calendar"]
    H --> L["Scenario Lab"]
    H --> M["Data Explorer"]
```

### Local and hosted runtime

``` mermaid
flowchart LR
    subgraph Local["Local development"]
        A["Browser"] --> B["Python server"]
        B --> C["SQLite database"]
        B --> D["Public assets"]
    end
    subgraph Hosted["Vercel static hosting"]
        E["Visitor browser"] --> F["Static CDN"]
        F --> G["HTML CSS and JavaScript"]
        F --> H["Prebuilt JSON and CSV"]
        G --> I["MapLibre globe"]
        G --> H
        I --> J["External imagery tiles"]
    end
```

The hosted static site does not run `server.py` as a backend. It serves
prepared files from `public/`. The globe may need internet access to
load its library and external imagery.

## Data and methodology

### Data sample

The project report describes a deterministic sample derived from a
public Kaggle dataset based on NASA FIRMS active-fire products.

  Source file                    Instrument   Satellite family     Rows reported
  ------------------------------ ------------ ------------------ ---------------
  `fire_nrt_M-C61_565334.csv`    MODIS        Terra / Aqua                    67
  `fire_nrt_J1V-C2_565335.csv`   VIIRS        NOAA-20                         67
  `fire_nrt_SV-C2_565336.csv`    VIIRS        Suomi-NPP                       66
  **Total**                                                              **200**

Source fields include latitude, longitude, brightness, scan, track,
acquisition date/time, satellite, instrument, confidence, version,
background brightness, FRP, and day/night status. Derived fields should
remain separate from original source values.

The exact Kaggle dataset URL, author, version, and license must be
confirmed from the source records before release. The repository's MIT
license does not automatically cover the dataset.

### Processing pipeline

``` mermaid
flowchart TD
    A["Validate coordinates and required fields"] --> B["Remove exact duplicates"]
    B --> C["Standardize acquisition time to UTC"]
    C --> D["Normalize metrics within sensor groups"]
    D --> E["Assign common spatial grid IDs"]
    E --> F["Calculate agreement feature where supported"]
    F --> G["Calculate project-defined HFAI"]
    G --> H["Export summary and observation files"]
    H --> I["Explore results in dashboard"]
```

### Quality control

The preparation workflow is intended to validate latitude from -90° to
+90°, longitude from -180° to +180°, require necessary spatial and
sensor fields, remove exact duplicates, and preserve original fields
before feature engineering.

### Temporal standardization

Acquisition date and time are combined into UTC timestamps. Calendar
features may include year, month, week, hour, day of year, and season.
The intended analytical unit is a spatial grid cell and day, rather than
treating each satellite pixel as a separate measure of regional
activity.

### Within-sensor normalization

Brightness and Fire Radiative Power (FRP) are standardized within each
sensor group:

\[ z\_{i,s} = `\frac{x_{i,s} - \mu_s}{\sigma_s}`{=tex} \]

Here, (x\_{i,s}) is an observation value, (`\mu`{=tex}\_s) is the mean
for sensor group (s), and (`\sigma`{=tex}\_s) is its standard deviation.
This reduces direct scale differences but does not remove every source
of sensor bias.

### Common spatial grid

The configured grid resolution is (r = 0.05\^`\circ`{=tex}).

\[ g\_{`\mathrm{lat}`{=tex}} =
`\left`{=tex}`\lfloor `{=tex}`\frac{\mathrm{latitude}}{r}`{=tex}
`\right`{=tex}`\rfloor`{=tex} `\qquad`{=tex} g\_{`\mathrm{lon}`{=tex}} =
`\left`{=tex}`\lfloor `{=tex}`\frac{\mathrm{longitude}}{r}`{=tex}
`\right`{=tex}`\rfloor`{=tex} \]

The grid identifier is represented as `g_lat_g_lon`. A 0.05-degree grid
is about 5.5 km north-south, while east-west distance varies with
latitude.

### Sensor Agreement Score

For matched, normalized MODIS activity (M) and VIIRS activity (V):

\[ A = 1 - `\frac{|M - V|}{|M| + |V| + \epsilon}`{=tex} \]

The small (`\epsilon`{=tex}) prevents division by zero. The bundled
sample may not contain matched grid-day pairs for every observation.
Where matched values are unavailable, the project report describes a
bounded proxy based on normalized brightness and FRP consistency. This
proxy is not a direct cross-sensor match or an official NASA metric.

## HFAI formula

The documented project-defined index is:

\[ `\mathrm{HFAI}`{=tex} = 0.25C + 0.25F + 0.20B + 0.15A + 0.15Q \]

  Component     Weight Meaning
  ----------- -------- ----------------------------------------
  \(C\)           0.25 Normalized activity or detection count
  \(F\)           0.25 Scaled Fire Radiative Power
  \(B\)           0.20 Scaled brightness temperature
  \(A\)           0.15 Sensor agreement or documented proxy
  \(Q\)           0.15 Detection confidence or quality

These weights are engineering choices for a prototype and require
validation before scientific or operational use. Components must be
scaled consistently for the intended index range.

## Machine-learning benchmarks

The `ml/` directory contains an offline feasibility workflow. The
dashboard currently uses deterministic HFAI calculations and does not
serve live model predictions.

-   **Isolation Forest:** Unsupervised anomaly exploration. An unusual
    score does not mean an observation is a dangerous fire.
-   **XGBoost:** A next-day activity experiment using lagged and
    aggregated features. The sample is small and does not include key
    weather and fuel variables such as wind, humidity, and fuel
    moisture.

The project report gives these chronological test metrics. Verify them
against `models/metrics.json` before publishing:

  Method                          MAE     RMSE        R²
  -------------------------- -------- -------- ---------
  Historical-mean baseline     0.0499   0.0528   -0.2013
  Persistence baseline         0.0691   0.0917   -2.6185
  XGBoost regressor            0.0636   0.0775   -1.5837

The negative R² values mean the tested regression did not outperform the
test-set mean baseline under this evaluation. The test set is too small
to support claims of reliable global forecasting. The project report
also records 3 of 8 held-out test records flagged as unusual by
Isolation Forest; this is not a dependable estimate of a global anomaly
rate.

## API and static files

### Static paths used by the hosted dashboard

  -----------------------------------------------------------------------
  Path                                Purpose
  ----------------------------------- -----------------------------------
  `/api/summary.json`                 Precomputed totals, sensor
                                      summaries, and daily activity

  `/api/observations.json`            Precomputed observation records

  `/data/fire_samples.csv`            Downloadable CSV sample
  -----------------------------------------------------------------------

These are static files served from `public/`; they do not require a
running Python process on Vercel.

### Local Python API

The local server may also expose these routes. Confirm exact behavior
against `server.py` before treating this table as a definitive API
contract.

  ----------------------------------------------------------------------------------
  Method                  Route                              Purpose
  ----------------------- ---------------------------------- -----------------------
  `GET`                   `/api/summary`                     Dataset totals and
                                                             summaries

  `GET`                   `/api/observations`                Observation list

  `GET`                   `/api/observations?sensor=MODIS`   Sensor-filtered
                                                             observations

  `GET`                   `/api/observations/{id}`           One observation

  `GET`                   `/data/fire_samples.csv`           CSV download
  ----------------------------------------------------------------------------------

Dynamic Python routes are for local development unless a separate
supported backend is deployed.

## Repository structure

``` text
fire-harmonix/
├── data/
│   ├── fire_harmonix.db
│   └── fire_samples.csv
├── docs/
│   └── ARCHITECTURE.md
├── ml/
│   └── train_models.py
├── models/
│   ├── feature_manifest_v0.1.json
│   ├── isolation_forest_hfai_v0.1.joblib
│   ├── metrics.json
│   └── xgboost_fire_activity_v0.1.json
├── public/
│   ├── api/
│   │   ├── observations.json
│   │   └── summary.json
│   ├── data/
│   │   └── fire_samples.csv
│   ├── app.js
│   ├── globe-map.css
│   ├── globe-map.js
│   ├── index.html
│   └── styles.css
├── scripts/
│   ├── export_static_api.py
│   └── seed_data.py
├── .gitignore
├── .python-version
├── LICENSE
├── package.json
├── README.md
├── requirements-ml.txt
├── server.py
└── vercel.json
```

This is the expected layout described by the project report. Check the
current repository if any filename differs.

## Run locally

Python 3.11 or a compatible version is recommended.

``` bash
python server.py
```

Open the local address printed by the server, normally:

``` text
http://127.0.0.1:8000
```

If the SQLite database changes, regenerate the static files:

``` bash
python scripts/export_static_api.py
```

Check that the generated JSON and CSV files are written to the locations
expected by the frontend.

## Deploy to Vercel

1.  Push the final project to your GitHub repository.
2.  Open the Vercel dashboard and select **Add New Project**.
3.  Import the correct GitHub repository.
4.  Set **Framework Preset** to `Other`.
5.  Set **Root Directory** to the repository root.
6.  Leave **Build Command** empty if supported by the project settings.
7.  Set **Output Directory** to `public`.
8.  Leave **Install Command** empty if no build step is needed.
9.  Leave environment variables empty unless the implementation
    genuinely requires them.
10. Deploy and wait for the build to finish.
11. Open the public URL in a private browser window.
12. Test the globe, regional presets, sensor filters, observation
    selection, calendar, Scenario Lab, data table, and CSV download.

Confirm that `vercel.json` does not conflict with these settings and
that all frontend requests point to files present in the deployed
output.

### External imagery

The globe uses external map imagery and therefore needs internet access.
Check the provider's current attribution, usage, and redistribution
terms before release. Do not describe third-party imagery as owned by
FIRE-HARMONIX.

## Reproduce the ML benchmarks

Machine-learning dependencies are optional for normal dashboard use.
Install them only to run the offline experiments:

``` bash
python -m pip install -r requirements-ml.txt
python ml/train_models.py
```

Review generated metrics and model artifacts. Results can vary with
data, package versions, and random seeds; document the environment used
for published results.

## Security and configuration

The static dashboard is designed not to require private credentials or
production environment variables. Never place secrets in `public/`,
frontend JavaScript, static JSON, or this README.

Before publishing:

-   check for `.env` files, tokens, and private keys;
-   ensure `.gitignore` excludes local environments and secret files;
-   remember that deleting a secret from the latest commit does not
    remove it from Git history;
-   rotate any exposed credential;
-   verify that public datasets can be redistributed; and
-   review third-party dependency and imagery terms.

Do not claim a security scan passed unless it was actually run against
the relevant repository revision and Git history.

## Limitations

-   The sample contains only 200 observations from a limited period.
-   It is not a complete global archive or live feed.
-   Matched MODIS/VIIRS grid-day pairs may be unavailable.
-   The agreement proxy is not an official sensor-agreement product.
-   HFAI weights and thresholds need validation.
-   The ML test set is very small and forecast R² is negative.
-   The forecast experiment lacks key weather and fuel-condition
    variables.
-   External map imagery requires internet access and depends on its
    provider.
-   Further work needs multi-year regional histories, matched
    observations, and stronger validation.


## Sources and attribution

Before release, add direct links to the exact source pages used by the
repository.

-   **NASA FIRMS:** Active-fire data products and product documentation.
    Identify the exact product collection and download used for the
    sample.
-   **Kaggle dataset:** Cite the exact dataset page, author, license,
    and version. Do not rely on the dataset name alone.
-   **MODIS:** Cite the official instrument and product documentation
    used for resolution and product characteristics.
-   **VIIRS:** Cite the official instrument and product documentation
    used for resolution and product characteristics.
-   **MapLibre GL JS:** Retain applicable license and notices.
-   **Esri World Imagery:** Follow current imagery attribution and usage
    terms. Include required attribution in the map UI and documentation.
-   **Fonts and other assets:** Credit each exact source and license.

Useful starting points:

-   NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
-   MODIS: https://modis.gsfc.nasa.gov/
-   VIIRS: https://www.nesdis.noaa.gov/
-   MapLibre GL JS: https://maplibre.org/
-   Esri documentation: https://doc.arcgis.com/
-   NASA Space Apps Challenge: https://www.spaceappschallenge.org/

The exact Kaggle dataset page and current imagery terms still need to be
confirmed from the project records. Do not mark attribution as complete
until those sources are verified.

## License

Project code is licensed under the MIT License. See [`LICENSE`](LICENSE)
for the complete text. The MIT license does not automatically apply to
third-party datasets, imagery, libraries, fonts, or other external
assets.
