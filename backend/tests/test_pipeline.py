import json
from pathlib import Path
from core.pipeline import run_full_pipeline, import_processed_data


def test_run_full_pipeline(sample_raw_csv_shift_jis, tmp_path):
    output_dir = tmp_path / "output"
    file_configs = [
        {
            "filepath": sample_raw_csv_shift_jis,
            "mouse_id": "Test_01",
            "field_num": 1,
            "group": "Het",
        }
    ]
    result = run_full_pipeline(file_configs, output_dir)

    assert result["status"] == "done"
    assert result["total_sperm"] == 3  # 3 motile from 5 total
    assert (output_dir / "cleaned.csv").exists()
    assert (output_dir / "analyzed.csv").exists()
    assert (output_dir / "stats.json").exists()

    with open(output_dir / "stats.json") as f:
        stats = json.load(f)
    assert "baseline" in stats
    assert "cluster_proportions" in stats


def test_import_processed_data(sample_tsne_df, tmp_path):
    csv_path = tmp_path / "imported.csv"
    sample_tsne_df.to_csv(csv_path, index=False)

    result = import_processed_data(csv_path)
    assert result["has_tsne"] is True
    assert result["has_clusters"] is True
    assert result["n_rows"] == len(sample_tsne_df)
