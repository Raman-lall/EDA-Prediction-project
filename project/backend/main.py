from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import io
import json
from scipy import stats

app = FastAPI(title="EDA API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def safe_json(obj):
    """Convert numpy/pandas types to JSON-safe Python types."""
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return None if np.isnan(obj) or np.isinf(obj) else float(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    if isinstance(obj, pd.Timestamp):
        return str(obj)
    if isinstance(obj, float) and (np.isnan(obj) or np.isinf(obj)):
        return None
    return obj


def df_to_json_safe(d: dict) -> dict:
    return json.loads(json.dumps(d, default=safe_json))


def load_df(file: UploadFile) -> pd.DataFrame:
    contents = file.file.read()
    name = file.filename.lower()
    if name.endswith(".csv"):
        return pd.read_csv(io.BytesIO(contents))
    elif name.endswith((".xls", ".xlsx")):
        return pd.read_excel(io.BytesIO(contents))
    elif name.endswith(".json"):
        return pd.read_json(io.BytesIO(contents))
    elif name.endswith(".parquet"):
        return pd.read_parquet(io.BytesIO(contents))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV, Excel, JSON, or Parquet.")


@app.post("/upload")
async def upload_dataset(file: UploadFile = File(...)):
    df = load_df(file)

    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    categorical_cols = df.select_dtypes(include=["object", "category"]).columns.tolist()
    datetime_cols = df.select_dtypes(include=["datetime"]).columns.tolist()

    # --- Overview ---
    overview = {
        "filename": file.filename,
        "rows": int(df.shape[0]),
        "cols": int(df.shape[1]),
        "columns": df.columns.tolist(),
        "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "datetime_cols": datetime_cols,
        "memory_mb": round(df.memory_usage(deep=True).sum() / 1024 / 1024, 3),
        "duplicated_rows": int(df.duplicated().sum()),
        "preview": df.head(10).replace({np.nan: None}).to_dict(orient="records"),
    }

    # --- Missing values ---
    missing = []
    for col in df.columns:
        n_miss = int(df[col].isna().sum())
        missing.append({
            "column": col,
            "missing": n_miss,
            "pct": round(n_miss / len(df) * 100, 2),
            "dtype": str(df[col].dtype),
        })
    missing.sort(key=lambda x: x["missing"], reverse=True)

    # --- Numeric stats ---
    numeric_stats = []
    for col in numeric_cols:
        s = df[col].dropna()
        if len(s) == 0:
            continue
        q1, q3 = float(s.quantile(0.25)), float(s.quantile(0.75))
        iqr = q3 - q1
        outliers = int(((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)).sum())
        try:
            skewness = float(s.skew())
            kurtosis = float(s.kurtosis())
        except Exception:
            skewness, kurtosis = None, None
        # histogram
        counts, bin_edges = np.histogram(s, bins=min(30, len(s.unique())))
        numeric_stats.append({
            "column": col,
            "count": int(s.count()),
            "mean": float(s.mean()),
            "median": float(s.median()),
            "std": float(s.std()),
            "min": float(s.min()),
            "max": float(s.max()),
            "q1": q1,
            "q3": q3,
            "iqr": iqr,
            "skewness": skewness,
            "kurtosis": kurtosis,
            "outliers": outliers,
            "histogram": {
                "counts": counts.tolist(),
                "bins": bin_edges.tolist(),
            },
            "boxplot": {
                "min": float(s.min()),
                "q1": q1,
                "median": float(s.median()),
                "q3": q3,
                "max": float(s.max()),
                "outliers": s[((s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr))].tolist()[:50],
            },
        })

    # --- Categorical stats ---
    categorical_stats = []
    for col in categorical_cols:
        s = df[col].dropna()
        vc = s.value_counts()
        categorical_stats.append({
            "column": col,
            "count": int(s.count()),
            "unique": int(s.nunique()),
            "top": str(vc.index[0]) if len(vc) else None,
            "top_freq": int(vc.iloc[0]) if len(vc) else 0,
            "bar": {
                "labels": vc.index[:20].tolist(),
                "values": vc.values[:20].tolist(),
            },
        })

    # --- Correlation matrix ---
    corr_data = None
    if len(numeric_cols) >= 2:
        corr = df[numeric_cols].corr()
        corr_data = {
            "columns": numeric_cols,
            "matrix": corr.replace({np.nan: None}).values.tolist(),
        }

    # --- Pairwise scatter (top 5 numeric cols) ---
    scatter_pairs = []
    top_cols = numeric_cols[:5]
    for i in range(len(top_cols)):
        for j in range(i + 1, len(top_cols)):
            cx, cy = top_cols[i], top_cols[j]
            sub = df[[cx, cy]].dropna().sample(min(500, len(df)), random_state=42)
            scatter_pairs.append({
                "x_col": cx,
                "y_col": cy,
                "x": sub[cx].tolist(),
                "y": sub[cy].tolist(),
            })

    # --- Normality tests ---
    normality = []
    for col in numeric_cols[:10]:
        s = df[col].dropna()
        if len(s) < 8:
            continue
        sample = s.sample(min(5000, len(s)), random_state=0)
        try:
            stat, p = stats.shapiro(sample) if len(sample) <= 5000 else stats.normaltest(sample)
            normality.append({"column": col, "statistic": round(float(stat), 4), "p_value": round(float(p), 6), "normal": bool(p > 0.05)})
        except Exception:
            pass

    result = {
        "overview": overview,
        "missing": missing,
        "numeric_stats": numeric_stats,
        "categorical_stats": categorical_stats,
        "correlation": corr_data,
        "scatter_pairs": scatter_pairs,
        "normality": normality,
    }
    return df_to_json_safe(result)


@app.get("/")
def root():
    return {"message": "EDA API is running. POST /upload with a file."}
