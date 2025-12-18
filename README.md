# CASA Sperm Motility Dashboard

An interactive data visualization dashboard for Computer-Assisted Sperm Analysis (CASA), designed for analyzing sperm flagellar dynamics and motility parameters.

## 🌐 Live Demo

**[View Dashboard](https://kkailab.github.io/casa-dashboard/)**

## 📊 Features

### Interactive Visualizations
- **Heatmap Analysis**: Z-score visualization of flagellar dynamics (VCL, ALH, BCF) grouped by genotype
- **Scatter Plot**: VCL vs BCF correlation analysis with density contours
- **Distribution Plots**: Violin plots for key motility metrics comparison
- **Real-time Filtering**: Dynamic data filtering with customizable thresholds

### Data Analysis
- **Statistical Comparison**: Automatic calculation of mean, standard deviation, and p-values (Welch's t-test)
- **Multi-group Support**: Compare WT (Wild Type) vs KO (Knockout) groups
- **Quality Control**: Built-in data filtering for validity, minimum velocity, and track length

### Key Metrics Analyzed
- **VCL** (Curvilinear Velocity) - 曲線速度
- **VSL** (Straight-Line Velocity) - 直線速度
- **VAP** (Average Path Velocity) - 平均経路速度
- **ALH** (Amplitude of Lateral Head Displacement) - 側向頭部振幅
- **BCF** (Beat Cross Frequency) - 頭部交差頻度
- **LIN** (Linearity = VSL/VCL) - 直線性
- **STR** (Straightness = VSL/VAP) - 直進性

## 🚀 Getting Started

### Option 1: Load Demo Data
1. Visit the [live dashboard](https://kkailab.github.io/casa-dashboard/)
2. Click **"Load Demo Dataset"** to explore with sample data
3. Interact with filters and visualization controls in the sidebar

### Option 2: Upload Your Own Data
1. Prepare CSV files from your CASA system (Shift-JIS or UTF-8 encoding)
2. Upload WT (Wild Type) files using the "WT Files" button
3. Upload KO (Knockout) files using the "KO Files" button
4. The dashboard will automatically process and visualize your data

### CSV File Requirements
Your CSV files should contain the following columns (Japanese or English headers):
- Validity (有効性)
- VCL (曲線速度[μm/秒])
- VSL (直線速度[μm/秒])
- VAP (平均速度[μm/秒])
- ALH (頭部振幅[μm])
- BCF (頭部振動数[Hz])
- LIN
- STR
- Points (座標数)

## 🎛️ Control Panel

### Scatter Plot Settings
- **Threshold Coloring Mode**: Separate cells into high/low BCF frequency groups
- **BCF Threshold Slider**: Adjust the frequency cutoff (0-40 Hz)
- **Density Overlay**: Toggle 2D histogram contours for distribution visualization

### Data Filters
- **Min VCL**: Filter by minimum curvilinear velocity (0-200 μm/s)
- **Min BCF**: Filter by minimum beat frequency (0-30 Hz)
- **Min VSL**: Filter by minimum straight-line velocity (0-80 μm/s)
- **Min ALH**: Filter by minimum head displacement (0-10 μm)

### Visualization Options
- **Heatmap Sort**: Sort cells by BCF, VCL, or ALH
- **Group Visibility**: Toggle WT/KO groups on/off
- **Density Contours**: Show/hide distribution density

## 📥 Export Data

Click the **"Export CSV"** button to download your filtered dataset with all calculated metrics for further analysis.

## 🧬 Scientific Background

This tool is designed for researchers studying:
- Male fertility and reproductive biology
- Sperm motility patterns and flagellar dynamics
- Genotype-phenotype associations in sperm function
- Pharmacological or genetic interventions affecting sperm motility

## 🛠️ Technology Stack

- **React 18**: UI framework
- **Plotly.js**: Interactive scientific visualizations
- **Tailwind CSS**: Styling and responsive design
- **PapaParse**: CSV parsing
- **jStat**: Statistical calculations

## 📖 Usage Tips

1. **Quality Control**: The dashboard automatically filters out:
   - Invalid tracks (Validity ≠ 1)
   - Low velocity cells (VCL ≤ 10 μm/s, VSL ≤ 5 μm/s)
   - Short tracks (Points < 50)

2. **Statistical Significance**: P-values are calculated using Welch's t-test:
   - `****` p < 0.0001
   - `***` p < 0.001
   - `**` p < 0.01
   - `*` p < 0.05
   - `ns` = not significant

3. **Heatmap Interpretation**:
   - Blue = Below mean (negative z-score)
   - White = Near mean (z-score ≈ 0)
   - Red = Above mean (positive z-score)

## 📄 License

This project is open source and available for academic and research purposes.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/KKAIlab/casa-dashboard/issues).

## 👨‍🔬 Citation

If you use this dashboard in your research, please cite:

```
CASA Sperm Motility Dashboard
GitHub: https://github.com/KKAIlab/casa-dashboard
URL: https://kkailab.github.io/casa-dashboard/
```

## 📧 Contact

For questions or collaboration inquiries, please open an issue on GitHub.

---

**Built with ❤️ for the reproductive biology research community**
