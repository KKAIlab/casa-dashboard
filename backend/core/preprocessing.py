"""CASA data preprocessing: encoding detection, column mapping, motile filtering."""

import pandas as pd
import chardet
from pathlib import Path

from core.config import AnalysisConfig

CONFIG = AnalysisConfig()


def detect_encoding(filepath: Path) -> str:
    """Detect file encoding using chardet."""
    with open(filepath, "rb") as f:
        raw = f.read(10000)
    result = chardet.detect(raw)
    return result["encoding"]


def read_casa_csv(filepath: Path) -> pd.DataFrame | None:
    """Read a CASA CSV file, auto-detecting encoding and mapping columns."""
    encoding = detect_encoding(filepath)
    try:
        df = pd.read_csv(filepath, encoding=encoding)
    except Exception:
        # Fallback: try shift_jis then utf-8
        for enc in ("shift_jis", "utf-8"):
            try:
                df = pd.read_csv(filepath, encoding=enc)
                break
            except Exception:
                continue
        else:
            return None

    # Map Japanese column names to English
    df = df.rename(columns=CONFIG.COLUMN_MAPPING)
    return df


def preprocess_file(
    filepath: Path,
    mouse_id: str,
    field_num: int,
    group: str,
) -> pd.DataFrame | None:
    """Process a single CASA CSV file: read, map columns, filter motile, add metadata."""
    df = read_casa_csv(filepath)
    if df is None:
        return None

    # Filter motile sperm (Type == 99)
    if "Type" not in df.columns:
        return None

    df_motile = df[df["Type"] == CONFIG.MOTILE_TYPE].copy()
    if len(df_motile) == 0:
        return None

    # Add metadata
    df_motile["Mouse"] = mouse_id
    df_motile["Field"] = field_num
    df_motile["Group"] = group

    # Select output columns
    output_cols = CONFIG.ALL_CASA_PARAMS + ["Mouse", "Field", "Group"]
    missing = [c for c in output_cols if c not in df_motile.columns]
    if missing:
        return None

    return df_motile[output_cols].reset_index(drop=True)


def preprocess_multiple_files(
    file_configs: list[dict],
) -> pd.DataFrame | None:
    """Process multiple CASA CSV files and concatenate.

    file_configs: list of {"filepath": Path, "mouse_id": str, "field_num": int, "group": str}
    """
    all_data = []
    for fc in file_configs:
        df = preprocess_file(
            filepath=fc["filepath"],
            mouse_id=fc["mouse_id"],
            field_num=fc["field_num"],
            group=fc["group"],
        )
        if df is not None:
            all_data.append(df)

    if not all_data:
        return None

    return pd.concat(all_data, ignore_index=True)
