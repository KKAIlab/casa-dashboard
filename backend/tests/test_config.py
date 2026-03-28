from core.config import AnalysisConfig


def test_config_has_fixed_parameters():
    cfg = AnalysisConfig()
    assert cfg.TSNE_PERPLEXITIES == [5, 10, 30, 50, 100]
    assert cfg.N_CLUSTERS == 5
    assert cfg.RANDOM_STATE == 42
    assert cfg.KMEANS_N_INIT == 10
    assert cfg.TSNE_FEATURES == ["VCL", "VSL", "ALH", "BCF"]
    assert cfg.ALL_CASA_PARAMS == ["VCL", "VSL", "VAP", "LIN", "STR", "WOB", "ALH", "BCF"]
    assert cfg.MOTILE_TYPE == 99


def test_column_mapping():
    cfg = AnalysisConfig()
    assert cfg.COLUMN_MAPPING["曲線速度[μm/秒]"] == "VCL"
    assert cfg.COLUMN_MAPPING["直線速度[μm/秒]"] == "VSL"
    assert cfg.COLUMN_MAPPING["種別"] == "Type"
    assert len(cfg.COLUMN_MAPPING) == 12
