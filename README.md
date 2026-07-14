# CASA Sperm Motility Dashboard

A browser-based interactive dashboard for Computer-Assisted Sperm Analysis (CASA). Visualize sperm motility landscapes using t-SNE dimensionality reduction and K-Means clustering.

**All computation runs in your browser. No server, no installation, no data upload to the cloud.**

**[Open Dashboard](https://kkailab.github.io/casa-dashboard/)**

---

## What is this?

This tool takes CASA (Computer-Assisted Sperm Analysis) data and creates an interactive **Motility Landscape** — a 2D visualization where each dot is one sperm cell, positioned by its movement characteristics using t-SNE. Cells with similar motility patterns cluster together, revealing subpopulations that traditional mean-based statistics miss.

### What you can do

- **Upload** your CASA CSV files (directly from the CASA software, Japanese or English)
- **Visualize** t-SNE motility landscapes with automatic clustering
- **Classify** cells by WHO 5th-ed. motility categories (PR / NP / IM) and Mortimer hyperactivation criteria
- **Compare** different genotypes or treatment groups side-by-side with Welch's t-test
- **Analyze** cluster proportions, parameter distributions, and per-mouse summary stats
- **Export** analyzed cell data, per-mouse stats, motility summaries, and comparison tables as CSV
- **Predict** fertility potential using reference population comparison

---

## Quick Start Guide

### Step 1: Open the dashboard

Go to **[https://kkailab.github.io/casa-dashboard/](https://kkailab.github.io/casa-dashboard/)**

You'll see a sidebar with 5 pages:
- **Dashboard** — overview of your uploaded datasets
- **Data Management** — upload and manage CSV files
- **Analysis** — run t-SNE and view results
- **Cross-Species** — train a human fertility axis, project mouse data onto it, co-embed both species
- **Prediction** — compare against reference populations

### Step 2: Upload your data

Click **Data Management** in the sidebar.

**Option A: Upload raw CASA CSV** (from the CASA software directly)

1. Click **"Upload Raw CASA CSV"** (blue button, selected by default)
2. Fill in the form:
   - **Dataset name**: give it a descriptive name (e.g., `WT_mouse1`)
   - **Genotype**: the genotype of this sample (e.g., `WT`, `KO`, `Het`)
   - **Mouse ID**: individual mouse identifier (e.g., `WT_01`)
   - **Group**: experimental group (e.g., `WT`, `KO`)
3. Drag and drop your CSV file into the dashed box (or click to browse)
4. The file will be parsed automatically. Shift-JIS and UTF-8 encodings are both supported.

**Option B: Import pre-processed CSV** (if you already ran t-SNE elsewhere)

1. Click **"Import Processed CSV"** button
2. Fill in Dataset name and Genotype
3. Upload a CSV that already contains `tSNE1`, `tSNE2`, and `Cluster` columns
4. The dashboard will skip computation and display results immediately

### Step 3: Run analysis

Click **Analysis** in the sidebar.

1. Select your dataset from the dropdown (top right)
2. Click **"Run Analysis"**
3. Wait for the computation:
   - Small datasets (<500 sperm): ~30 seconds
   - Medium datasets (~2000 sperm): ~3-5 minutes
   - A progress indicator will show the current step
4. When complete, you'll see:
   - **t-SNE Landscape** — each dot is a sperm, colored by cluster
   - **Cluster Proportions** — bar chart showing cluster distribution per mouse
   - **Parameter Distributions** — box plots of VCL, VSL, ALH, BCF by cluster

> **Tip:** If you imported a pre-processed CSV with existing t-SNE results, you don't need to click "Run Analysis" — the charts appear automatically.

### Step 4: Compare genotypes (optional)

At the bottom of the Analysis page:

1. Hold `Ctrl` (or `Cmd` on Mac) and select 2+ analyzed datasets from the multi-select box
2. Click **"Compare"**
3. A combined t-SNE plot shows all datasets overlaid, colored by group

### Step 5: Predict fertility (optional)

Click **Prediction** in the sidebar.

1. Select an analyzed dataset
2. Upload a **reference CSV** with labeled populations (fertile/subfertile)
3. Choose a prediction model:
   - **Model A**: Compares cluster proportions to reference groups
   - **Model B**: Measures density similarity in t-SNE space

---

## CSV File Format

### Raw CASA CSV (from the software)

The dashboard accepts CSV files directly exported from CASA software. Japanese column headers are automatically mapped:

| Japanese Header | English | Description |
|----------------|---------|-------------|
| 種別 | Type | Sperm type (99 = motile) |
| 曲線速度[um/秒] | VCL | Curvilinear velocity |
| 直線速度[um/秒] | VSL | Straight-line velocity |
| 平均速度[um/秒] | VAP | Average path velocity |
| 直線性 | LIN | Linearity (VSL/VCL) |
| 直進性 | STR | Straightness (VSL/VAP) |
| 曲線性 | WOB | Wobble (VAP/VCL) |
| 頭部振幅[um] | ALH | Lateral head displacement |
| 頭部振動数[Hz] | BCF | Beat cross frequency |

- Both **Shift-JIS** and **UTF-8** encodings are supported (auto-detected)
- Only motile sperm (**Type = 99**) are included in analysis
- English column headers work too (if your CASA software exports in English)

**Robust to real-world export quirks.** The importer auto-handles the
variations that real CASA software produces, so you can drop files in as-is:

- **Micro-sign variants** — `µm` (U+00B5), `μm` (Greek mu), and romanized `um`
  all map correctly (this previously caused silent "no data" failures).
- **Metadata/preamble rows** — sample name, date, and software-version lines
  before the real column header are detected and skipped automatically.
- **Full-width brackets/units** (`頭部振幅［µm］`) and **English headers with
  units** (`VCL [µm/s]`) are recognized.
- **Clear errors** — if a required column (VCL/VSL/ALH/BCF) is missing, or no
  rows are motile, the upload reports exactly what's wrong instead of failing
  silently.

### Pre-processed CSV (for import)

If you already ran analysis elsewhere, your CSV should contain:

```
VCL, VSL, VAP, LIN, STR, WOB, ALH, BCF, Mouse, Group, tSNE1, tSNE2, Cluster
```

---

## How It Works

### Analysis Pipeline

```
Raw CASA CSV
    |
    v
[1] Parse CSV (auto-detect encoding)
    |
    v
[2] Map Japanese columns to English
    |
    v
[3] Filter motile sperm (Type = 99)
    |
    v
[4] t-SNE dimensionality reduction
    - Features: VCL, VSL, ALH, BCF
    - Tests perplexities: 5, 10, 30, 50, 100
    - Selects best by KL divergence
    |
    v
[5] K-Means clustering (k=5)
    - Seeded RNG for reproducibility
    |
    v
[6] Statistics
    - Mean/SD per parameter per mouse
    - Cluster proportions per mouse
    - Welch's t-test for group comparison
```

### Data Privacy

- All computation runs **in your browser** using JavaScript
- Your data is stored in **IndexedDB** (browser local storage)
- **Nothing is sent to any server** — the entire app is a static website
- Data persists across page refreshes but is local to your browser/device
- To clear all data: Data Management > click Delete on each dataset

### CASA Parameters Explained

| Parameter | Full Name | What It Measures | Unit |
|-----------|-----------|-----------------|------|
| **VCL** | Curvilinear Velocity | Total distance traveled along the actual path per second | um/s |
| **VSL** | Straight-Line Velocity | Distance from first to last point per second | um/s |
| **VAP** | Average Path Velocity | Distance along a smoothed average path per second | um/s |
| **LIN** | Linearity | How straight the path is (VSL/VCL). 1.0 = perfectly straight | ratio |
| **STR** | Straightness | Straightness relative to average path (VSL/VAP) | ratio |
| **WOB** | Wobble | Side-to-side oscillation (VAP/VCL) | ratio |
| **ALH** | Lateral Head Displacement | Amplitude of head movement perpendicular to average path | um |
| **BCF** | Beat Cross Frequency | How often the head crosses the average path | Hz |

---

## FAQ

**Q: How long does analysis take?**
A: Depends on the number of motile sperm. ~30s for 500, ~3-5 min for 2000. The bottleneck is t-SNE computation in the browser.

**Q: Can I analyze multiple mice together?**
A: Upload each mouse as a separate dataset, run analysis on each, then use the "Compare" feature on the Analysis page.

**Q: My CSV won't upload / shows 0 sperm**
A: Check that your CSV has a `Type` (or `種別`) column. Only rows with `Type = 99` (motile sperm) are included. If your data is already filtered, use "Import Processed CSV" instead.

**Q: The t-SNE plot looks different from my Python analysis**
A: Expected. t-SNE results vary between implementations due to initialization and optimization differences. The clustering patterns should be qualitatively similar.

**Q: Where is my data stored?**
A: In your browser's IndexedDB. It stays on your computer and survives page refreshes. Clearing browser data or using a different browser/device will start fresh.

**Q: Can I export the results?**
A: Yes. After running analysis, the Analysis page shows an Export bar with four buttons:
- **Cells (full)** — every analyzed cell with all CASA parameters, t-SNE coords, cluster, WHO class, hyperactivation flag.
- **Per-mouse means** — mean ± SD of every CASA parameter per mouse.
- **WHO motility** — per-mouse counts and percentages for PR/NP/IM and hyperactivated.
- **Cluster proportions** — per-mouse cluster distribution (%).

For comparison tables, the Cross-Genotype Comparison panel has its own Export CSV button. Plot toolbar still lets you save individual figures as SVG/PNG.

**Q: What are PR / NP / IM and Hyperactivated?**
A: WHO 5th edition motility categories and Mortimer's hyperactivation criteria:

| Label | Meaning | Cutoff |
|-------|---------|--------|
| **PR** | Progressive | VAP ≥ 25 µm/s OR VSL ≥ 20 µm/s |
| **NP** | Non-progressive | Motile but below progressive cutoffs |
| **IM** | Immotile | VCL ≤ 5 µm/s |
| **Hyperactivated** | Mortimer criteria | VCL ≥ 150 µm/s AND LIN ≤ 0.5 AND ALH ≥ 7 µm |

These are computed automatically and shown in the WHO Motility Classification chart.

**Q: I just want to try it without uploading anything.**
A: Two options on the Data Management page:
- **Download sample CSV** (top right) — synthetic WT vs KO mouse data with t-SNE pre-computed; re-upload via "Import Processed CSV".
- **Built-in Human References** section — one-click load of synthetic human cell-level data drawn from WHO 5th-edition normative ranges (fertile and subfertile profiles). After loading, run analysis from the Analysis page.

**Q: Is there real human CASA data I can use?**
A: Yes — the **VISEM** dataset (SimulaMet/NTNU, CC BY 4.0) contains real human sperm video CASA measurements for ~85 donors. We can't redistribute it, but `scripts/import_visem.mjs` converts it into the dashboard's CSV schema. See [Using real human data: VISEM](#using-real-human-data-visem) below.

---

## For Developers

### Local Development

```bash
git clone https://github.com/KKAIlab/casa-dashboard.git
cd casa-dashboard/frontend
npm install
npm run dev          # dev server at http://localhost:3000
npm test             # run tests (vitest)
npm run build        # production build to dist/
```

### Architecture

```
frontend/
├── src/
│   ├── engine/          # Analysis engine (pure JS, no dependencies on React)
│   │   ├── config.js        # Fixed CASA parameters + WHO/Mortimer cutoffs
│   │   ├── preprocessing.js # CSV parsing, column mapping, motile filtering
│   │   ├── tsne.js          # t-SNE implementation
│   │   ├── clustering.js    # K-Means + z-score standardization
│   │   ├── statistics.js    # Descriptive stats, Welch's t-test, group comparison
│   │   ├── motility.js      # WHO classification + hyperactivation detection
│   │   ├── exporter.js      # CSV serialization + browser download helpers
│   │   ├── prediction.js    # Cluster classifier, density scoring
│   │   ├── crossSpecies.js  # Fertility-axis training + projection + co-embed
│   │   └── pipeline.js      # Orchestrates the full analysis
│   ├── db/              # IndexedDB storage layer (idb)
│   ├── hooks/           # React hooks (useDB, useEngine)
│   ├── pages/           # Dashboard, DataManagement, Analysis, CrossSpecies, Prediction
│   └── components/      # Charts (Plotly), FileUploader, DataTable, GroupComparisonPanel, StatsSummaryTable
├── public/
│   └── sample_processed.csv  # Synthetic WT vs KO dataset for trying the UI
├── __tests__/           # Vitest tests for engine and DB
└── vite.config.js       # Vite + React + Tailwind CSS
```

### Tech Stack

- **UI**: React 19, Vite 8, Tailwind CSS 4, React Router (HashRouter)
- **Charts**: Plotly.js via react-plotly.js
- **CSV**: PapaParse
- **Statistics**: jStat
- **Storage**: IndexedDB via idb
- **Deployment**: GitHub Actions -> GitHub Pages

### Tests

```bash
cd frontend && npm test
# 54 tests across 12 test files
# Covers: config, preprocessing, clustering, t-SNE, statistics, motility classification,
#         CSV exporter, group comparison, cross-species axis + co-embed, prediction,
#         full pipeline, IndexedDB
```

---

## Cross-species bridging: mouse → human fertility

The **Cross-Species** page answers a translational question:
*do my KO mouse sperm look more like human-fertile or human-subfertile cells?*

It combines two complementary readouts:

**B. Fertility-axis projection (quantitative)** — train a Fisher-style linear
discriminant on standardized CASA features from human fertile vs subfertile
references. Each new cell gets a signed score (positive = closer to the
fertile pole) and a logistic-squashed P(fertile). Per-mouse means feed a
between-group Welch's t-test, e.g. *WT vs Omega6-HUFA-deficient*.

**A. Co-embedded landscape (qualitative)** — combined t-SNE of human + mouse
cells with per-source z-score normalization, so absolute scale differences
(mouse VCL ~200 vs human ~90 µm/s) don't dominate the layout. Lets you
visually check whether KO mouse cells overlap the human-subfertile region.

### Workflow

1. **Load human reference data** — Data Management → "Built-in Human References"
   loads `who_human_fertile.csv` and `who_human_subfertile.csv`. Or upload
   real VISEM data (see below).
2. **Upload mouse data** — Data Management → "Upload Raw CASA CSV" for each
   mouse. Use the `Group` field for *WT* / *Omega6KO* / etc.
3. **Cross-Species page**:
   - Pick the fertile dataset(s) as the *positive pole*, subfertile as the
     *negative pole*, choose features (default: VCL, VSL, LIN, ALH, BCF), and
     click **Train axis**. Inspect feature weights and train accuracy.
   - Pick mouse datasets and click **Project**. You get score histograms
     overlaid on the human reference distributions, a per-mouse summary table,
     and a Welch t-test between mouse Groups.
   - Click **Run co-embedding** for the qualitative t-SNE landscape.
4. **Export per-mouse scores** as CSV for downstream stats / figures.

### Caveats

- The axis is linear in standardized feature space; it cannot capture
  non-linear motility-class interactions. For a non-linear classifier,
  pre-cluster cells and project on cluster proportions instead.
- Per-mouse t-test treats mice as the experimental unit (correct for
  pseudoreplication); cell-level tests will be much more "significant" but
  inflated.
- Synthetic WHO references are useful as smoke-test scaffolding; for
  publication-grade comparisons use real human data (VISEM, in-house cohort).

## Using real human data: VISEM

[VISEM](https://datasets.simula.no/visem/) (Haugen et al., SimulaMet/NTNU) is a
publicly released human sperm dataset under **CC BY 4.0** that includes
per-participant semen analysis and frame-level CASA measurements for ~85 donors.
We do **not** redistribute it; download it from the official dataset page and
convert it locally:

```bash
# 1. Download VISEM from its dataset page (search "VISEM SimulaMet").
#    Expected layout after extraction:
#      visem/
#        semen_analysis_data.csv      # per-participant aggregates (PR%, IM%, …)
#        videos/<participant_id>/*.csv  # per-video CASA frames

# 2. Convert into the dashboard's CSV schema.
node scripts/import_visem.mjs ./visem ./visem_csv

# 3. Each visem_csv/visem_<participant>.csv can be uploaded via
#    Data Management → "Import Processed CSV".
#    Group is auto-labelled "normal" / "subnormal" using WHO 5th ed. PR ≥ 32%.
```

Options:

| Flag | Meaning |
|------|---------|
| `--frames-per-cell N` | Average every N consecutive frames into one synthetic "cell" (default 30, ~1 s at 30 fps). Set to 1 to keep per-frame rows. |
| `--max-participants N` | Limit number of participants processed (debugging). |
| `--dry-run` | Parse and report counts only; no files written. |

The script lives at [`scripts/import_visem.mjs`](scripts/import_visem.mjs); see
the file header for full schema mapping notes.

## Built-in reference data (synthetic)

For users who don't have real human data on hand, the dashboard ships two
reference CSVs in [`frontend/public/references/`](frontend/public/references):

- `who_human_fertile.csv` — 3 donors, 465 cells, drawn from WHO 5th-ed. normative
  ranges (PR≈55%, hyperactivated≈10%, VCL≈95±18 µm/s).
- `who_human_subfertile.csv` — 3 donors, 445 cells, asthenozoospermia profile
  (PR≈22%, hyperactivated≈3%, VCL≈55±18 µm/s).

Both load via the **Built-in Human References** card on Data Management. They
are derived from published distributions (WHO 2010, Mortimer 1990, Holt 1985)
and are clearly labelled as synthetic — they are **not** real patient data.

## Reference

- Fernandez-Lopez, P. et al. (2022). "Predicting fertility from sperm motility landscapes." *Communications Biology* 5:1027. doi:10.1038/s42003-022-03986-2
- WHO (2010). *WHO Laboratory Manual for the Examination and Processing of Human Semen, 5th edition.*
- Haugen, T. B. et al. (2019). "VISEM: A multimodal video dataset of human spermatozoa." *Proc. ACM Multimedia Systems Conference (MMSys '19).*

## License

Open source for academic and research purposes.
