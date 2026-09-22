"""
PRAVAAH 3.0 — Feature Engineering Pipeline

Transforms raw train/environment data into the 18-dimensional feature
vector expected by the XGBoost model.
"""
import numpy as np
from datetime import datetime
from typing import Optional
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from data.trains_master import (
    get_section_stats, ZONE_ENCODING, TRAIN_CLASS_ENCODING,
    hhmm_to_minutes, minutes_to_hhmm,
)

FEATURE_NAMES = [
    "hour", "dow", "section_km", "historical_p50", "historical_p90",
    "tsr_active", "tsr_speed", "congestion_idx", "weather_severity",
    "precipitation_mm", "headway_preceding", "load_factor", "zone",
    "train_class", "seasonal", "weekend", "capacity_util", "recovery_slack",
]


def _get_seasonal(month: int) -> float:
    """Return seasonal multiplier based on month."""
    if 6 <= month <= 9:
        return 1.22   # monsoon
    if month == 12 or month <= 2:
        return 1.16   # dense fog season
    return 1.02       # normal


def extract_features(
    train: dict,
    from_station_idx: int,
    to_station_idx: int,
    environment: dict,
    current_delay_min: float,
) -> np.ndarray:
    """
    Build the 18-dimensional feature vector for a single train section.

    Args:
        train: Train record from trains_master.TRAINS
        from_station_idx: Index of departure station in train['stations']
        to_station_idx: Index of arrival station in train['stations']
        environment: Live environment state dict with keys:
            - tsr_map: {section_key: {active, speed}}
            - weather: {severity, precipitation_mm}
            - congestion_scale: float multiplier (default 1.0)
        current_delay_min: Current accumulated delay at from_station

    Returns:
        np.ndarray of shape (18,) with feature values.
    """
    stations = train["stations"]
    from_st = stations[from_station_idx]
    to_st   = stations[to_station_idx]

    # ── Time features ─────────────────────────────────────────────────────────
    origin_min = hhmm_to_minutes(train["origin_time_hhmm"])
    dep_hhmm   = from_st.get("dep") or from_st.get("arr") or "12:00"
    dep_min    = hhmm_to_minutes(dep_hhmm)
    # Scheduled minutes from midnight at departure station, adjusted for delay
    actual_dep_min = (origin_min + (dep_min - origin_min) + current_delay_min) % 1440
    hour = int(actual_dep_min // 60)
    now  = datetime.now()
    dow  = now.weekday()      # 0=Mon … 6=Sun
    month = now.month

    # ── Section geometry ──────────────────────────────────────────────────────
    section_km = float(to_st["km"] - from_st["km"])

    # ── Historical stats ──────────────────────────────────────────────────────
    stats = get_section_stats(from_st["code"], to_st["code"])
    historical_p50 = stats["p50"]
    historical_p90 = stats["p90"]
    capacity_util  = stats["capacity"]
    avg_speed      = stats["avg_speed"]
    cong_base      = stats["cong_base"]

    # ── TSR ───────────────────────────────────────────────────────────────────
    tsr_map     = environment.get("tsr_map", {})
    section_key = f"{from_st['code']}_{to_st['code']}"
    tsr_info    = tsr_map.get(section_key, {"active": False, "speed": 0})
    tsr_active  = 1 if tsr_info.get("active") else 0
    tsr_speed   = float(tsr_info.get("speed", 0)) if tsr_active else 0.0

    # ── Congestion ────────────────────────────────────────────────────────────
    congestion_scale = environment.get("congestion_scale", 1.0)
    congestion_idx   = float(min(1.0, cong_base * congestion_scale))

    # ── Weather ───────────────────────────────────────────────────────────────
    weather           = environment.get("weather", {})
    weather_severity  = float(weather.get("severity", 0))
    precipitation_mm  = float(weather.get("precipitation_mm", 0))

    # ── Headway ───────────────────────────────────────────────────────────────
    headway_preceding = float(max(5.0, 40.0 - congestion_idx * 28.0))

    # ── Load factor ───────────────────────────────────────────────────────────
    load_map = {"rajdhani": 0.92, "shatabdi": 0.86, "duronto": 0.89, "express": 0.74, "mail": 0.72}
    load_factor = load_map.get(train.get("type", "express"), 0.75)

    # ── Zone ─────────────────────────────────────────────────────────────────
    zone_str = from_st.get("zone", train.get("zone", "NR"))
    zone     = ZONE_ENCODING.get(zone_str, 0)

    # ── Train class ───────────────────────────────────────────────────────────
    train_class = TRAIN_CLASS_ENCODING.get(train.get("type", "express"), 2)

    # ── Seasonal ─────────────────────────────────────────────────────────────
    seasonal = _get_seasonal(month)

    # ── Weekend ───────────────────────────────────────────────────────────────
    weekend = 1 if dow >= 5 else 0

    # ── Recovery slack ────────────────────────────────────────────────────────
    arr_hhmm = to_st.get("arr") or to_st.get("dep") or dep_hhmm
    arr_min  = hhmm_to_minutes(arr_hhmm)
    scheduled_section_min = float((arr_min - dep_min) % 1440)
    min_possible_min      = (section_km / avg_speed) * 60.0
    recovery_slack        = max(0.0, scheduled_section_min - min_possible_min)

    return np.array([
        hour, dow, section_km, historical_p50, historical_p90,
        tsr_active, tsr_speed, congestion_idx, weather_severity,
        precipitation_mm, headway_preceding, load_factor, zone,
        train_class, seasonal, weekend, capacity_util, recovery_slack,
    ], dtype=np.float64)


def build_feature_matrix(records: list) -> "pd.DataFrame":
    """
    Build a pandas DataFrame from a list of feature dicts (for batch prediction).

    Each dict should have keys matching FEATURE_NAMES.
    """
    import pandas as pd
    rows = []
    for rec in records:
        row = [rec.get(f, 0.0) for f in FEATURE_NAMES]
        rows.append(row)
    return pd.DataFrame(rows, columns=FEATURE_NAMES)
