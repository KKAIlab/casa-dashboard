import pandas as pd
from core.preprocessing import detect_encoding, read_casa_csv, preprocess_file


def test_detect_encoding_shift_jis(sample_raw_csv_shift_jis):
    enc = detect_encoding(sample_raw_csv_shift_jis)
    assert enc.lower().replace("-", "_") in ("shift_jis", "shift_jis_2004", "cp932")


def test_detect_encoding_utf8(sample_raw_csv_utf8):
    enc = detect_encoding(sample_raw_csv_utf8)
    assert "utf" in enc.lower()


def test_read_casa_csv_shift_jis(sample_raw_csv_shift_jis):
    df = read_casa_csv(sample_raw_csv_shift_jis)
    assert df is not None
    assert "VCL" in df.columns
    assert "VSL" in df.columns
    assert "Type" in df.columns


def test_preprocess_file_filters_motile(sample_raw_csv_shift_jis):
    df = preprocess_file(sample_raw_csv_shift_jis, mouse_id="Test_01", field_num=1, group="Het")
    # Original has 5 rows: 3 motile (Type==99), 2 non-motile
    assert len(df) == 3
    assert list(df["Mouse"].unique()) == ["Test_01"]
    assert list(df["Group"].unique()) == ["Het"]
    assert "Type" not in df.columns  # Type should be dropped after filtering
    assert set(["VCL", "VSL", "VAP", "LIN", "STR", "WOB", "ALH", "BCF"]).issubset(df.columns)
