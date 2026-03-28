"""Fixed analysis parameters for CASA pipeline consistency."""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AnalysisConfig:
    """Immutable analysis configuration. All parameters are fixed to ensure
    reproducibility across all datasets and users."""

    # Japanese -> English column mapping (from CASA software output)
    COLUMN_MAPPING: dict = field(default_factory=lambda: {
        "番号": "ID",
        "種別": "Type",
        "座標数": "Coord_count",
        "有効性": "Valid",
        "直線速度[μm/秒]": "VSL",
        "曲線速度[μm/秒]": "VCL",
        "平均速度[μm/秒]": "VAP",
        "直進性": "STR",
        "直線性": "LIN",
        "頭部振幅[μm]": "ALH",
        "頭部振動数[Hz]": "BCF",
        "曲線性": "WOB",
    })

    # Motile sperm filter
    MOTILE_TYPE: int = 99

    # All 8 standard CASA parameters
    ALL_CASA_PARAMS: list = field(default_factory=lambda: [
        "VCL", "VSL", "VAP", "LIN", "STR", "WOB", "ALH", "BCF"
    ])

    # Features used for t-SNE (Fernandez-Lopez 2022)
    TSNE_FEATURES: list = field(default_factory=lambda: [
        "VCL", "VSL", "ALH", "BCF"
    ])

    # t-SNE parameters
    TSNE_PERPLEXITIES: list = field(default_factory=lambda: [5, 10, 30, 50, 100])
    TSNE_MAX_ITER: int = 1000
    TSNE_INIT: str = "pca"
    TSNE_LEARNING_RATE: str = "auto"

    # K-means parameters
    N_CLUSTERS: int = 5
    KMEANS_N_INIT: int = 10
    RANDOM_STATE: int = 42
