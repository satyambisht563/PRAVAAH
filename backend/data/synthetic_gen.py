"""
PRAVAAH 3.0 — Synthetic Training Data Generator

Generates 500,000 realistic train delay records based on Indian Railways
punctuality statistics for training the XGBoost model.

Run directly to generate and inspect data:
    python -m data.synthetic_gen
"""
import numpy as np
import pandas as pd
from pathlib import Path


FEATURE_COLS = [
    "hour", "dow", "section_km", "historical_p50", "historical_p90",
    "tsr_active", "tsr_speed", "congestion_idx", "weather_severity",
    "precipitation_mm", "headway_preceding", "load_factor", "zone",
    "train_class", "seasonal", "weekend", "capacity_util", "recovery_slack",
]


def generate_training_data(n_samples: int = 500_000, random_seed: int = 42) -> pd.DataFrame:
    """
    Generate a synthetic training dataset for XGBoost delay prediction.

    Each record represents one train-section passage with engineered features
    and a realistic target delay (in minutes).

    Args:
        n_samples: Number of records to generate.
        random_seed: Reproducibility seed.

    Returns:
        pd.DataFrame with FEATURE_COLS + 'delay_minutes' column.
    """
    rng = np.random.default_rng(random_seed)

    # ── Hour of day ──────────────────────────────────────────────────────────
    # Weighted toward peak morning (6-9) and evening (17-22) hours
    hour_probs = np.ones(24)
    hour_probs[6:10] *= 2.5
    hour_probs[17:23] *= 2.0
    hour_probs[0:5]   *= 0.6
    hour_probs /= hour_probs.sum()
    hour = rng.choice(24, n_samples, p=hour_probs)

    # ── Day of week ──────────────────────────────────────────────────────────
    dow = rng.integers(0, 7, n_samples)
    weekend = (dow >= 5).astype(int)

    # ── Section distance (km) ─────────────────────────────────────────────────
    section_km = rng.integers(50, 420, n_samples).astype(float)

    # ── Historical delay percentiles ──────────────────────────────────────────
    historical_p50 = rng.uniform(2, 25, n_samples)
    historical_p90 = historical_p50 + rng.uniform(3, 35, n_samples)

    # ── TSR (Temporary Speed Restriction) ─────────────────────────────────────
    tsr_active = (rng.random(n_samples) < 0.14).astype(int)
    tsr_speed_values = rng.choice([30, 45, 50, 65], n_samples)
    tsr_speed = tsr_active * tsr_speed_values.astype(float)

    # ── Congestion index ─────────────────────────────────────────────────────
    # Beta distribution: most sections moderate congestion, some very high
    congestion_idx = rng.beta(2.5, 2.0, n_samples)

    # ── Weather ──────────────────────────────────────────────────────────────
    # 0=clear, 1=fog, 2=rain, 3=storm
    weather_probs = [0.60, 0.20, 0.15, 0.05]
    weather_severity = rng.choice([0, 1, 2, 3], n_samples, p=weather_probs)
    precipitation_mm = np.where(
        weather_severity == 0, 0,
        np.where(weather_severity == 1, rng.uniform(0, 5, n_samples),
        np.where(weather_severity == 2, rng.uniform(1, 30, n_samples),
                 rng.uniform(10, 80, n_samples)))
    )

    # ── Headway from preceding train ──────────────────────────────────────────
    # Inversely correlated with congestion
    headway_base = 40 - congestion_idx * 28
    headway_preceding = np.clip(headway_base + rng.normal(0, 5, n_samples), 5, 65)

    # ── Load factor ──────────────────────────────────────────────────────────
    train_class = rng.choice([0, 1, 2], n_samples, p=[0.25, 0.25, 0.50])
    load_map = {0: (0.85, 0.97), 1: (0.78, 0.95), 2: (0.60, 0.92)}
    load_factor = np.array([
        rng.uniform(*load_map[cls]) for cls in train_class
    ])

    # ── Zone encoding (0-12) ─────────────────────────────────────────────────
    # Weighted: ECR(2) and NER(9) are chronic delay zones
    zone_probs = [0.12, 0.09, 0.12, 0.10, 0.10, 0.07, 0.09, 0.08, 0.09, 0.05, 0.05, 0.02, 0.02]
    zone = rng.choice(13, n_samples, p=zone_probs)

    # ── Seasonal factor ───────────────────────────────────────────────────────
    month = rng.integers(1, 13, n_samples)
    seasonal = np.where(
        (month >= 6) & (month <= 9), rng.uniform(1.15, 1.30, n_samples),   # monsoon
        np.where(
            (month == 12) | (month <= 2), rng.uniform(1.10, 1.20, n_samples),  # fog
            rng.uniform(0.95, 1.08, n_samples)                                   # normal
        )
    )

    # ── Capacity utilisation ──────────────────────────────────────────────────
    capacity_util = np.clip(congestion_idx * 0.8 + rng.uniform(0.1, 0.3, n_samples), 0.35, 0.99)

    # ── Recovery slack ────────────────────────────────────────────────────────
    # Minutes of scheduled slack beyond minimum possible running time
    recovery_slack = rng.uniform(0, 22, n_samples)

    # ── Target: delay_minutes ─────────────────────────────────────────────────
    # Physics-based formula calibrated to match IR punctuality statistics
    base_delay       = historical_p50 * (0.25 + 0.75 * congestion_idx)
    tsr_impact       = tsr_active * np.maximum(0, (110 - tsr_speed) / 110.0 * 14)
    weather_impact   = weather_severity * 3.5 + precipitation_mm * 0.18
    headway_impact   = np.maximum(0, (22 - headway_preceding) * 0.38)
    capacity_impact  = np.maximum(0, (capacity_util - 0.72) * 9)
    peak_hour_impact = np.where(
        ((hour >= 6) & (hour <= 9)) | ((hour >= 17) & (hour <= 21)), 2.5, 0.0
    )
    chronic_zone     = np.where((zone == 2) | (zone == 9), 3.5, 0.0)  # ECR, NER
    recovery_credit  = np.minimum(recovery_slack * 0.30, 5.0)

    raw_delay = (
        base_delay + tsr_impact + weather_impact + headway_impact
        + capacity_impact + peak_hour_impact + chronic_zone - recovery_credit
    ) * seasonal

    # Multiplicative noise + occasional outliers (unscheduled stoppages, etc.)
    noise = rng.normal(0, 2.8, n_samples)
    outlier_mask = rng.random(n_samples) < 0.03
    outlier_add  = rng.uniform(15, 60, n_samples) * outlier_mask

    delay_minutes = np.maximum(0, raw_delay + noise + outlier_add)

    # ── Assemble DataFrame ────────────────────────────────────────────────────
    df = pd.DataFrame({
        "hour":             hour,
        "dow":              dow,
        "section_km":       section_km,
        "historical_p50":   historical_p50,
        "historical_p90":   historical_p90,
        "tsr_active":       tsr_active,
        "tsr_speed":        tsr_speed,
        "congestion_idx":   congestion_idx,
        "weather_severity": weather_severity,
        "precipitation_mm": precipitation_mm,
        "headway_preceding": headway_preceding,
        "load_factor":      load_factor,
        "zone":             zone,
        "train_class":      train_class,
        "seasonal":         seasonal,
        "weekend":          weekend,
        "capacity_util":    capacity_util,
        "recovery_slack":   recovery_slack,
        "delay_minutes":    delay_minutes,
    })

    return df


if __name__ == "__main__":
    from rich.console import Console
    from rich.table import Table

    console = Console()
    console.print("[bold cyan]Generating 500,000 training records...[/bold cyan]")

    df = generate_training_data(n_samples=500_000)

    table = Table(title="Synthetic Training Data Statistics", show_header=True)
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")

    d = df["delay_minutes"]
    table.add_row("Total records",   f"{len(df):,}")
    table.add_row("Mean delay",      f"{d.mean():.2f} min")
    table.add_row("Median delay",    f"{d.median():.2f} min")
    table.add_row("Std dev",         f"{d.std():.2f} min")
    table.add_row("90th pct",        f"{d.quantile(.90):.2f} min")
    table.add_row("Max delay",       f"{d.max():.2f} min")
    table.add_row("On-time (≤5 min)",f"{(d<=5).mean()*100:.1f}%")
    table.add_row("TSR rate",        f"{df['tsr_active'].mean()*100:.1f}%")

    console.print(table)

    out = Path("model/artifacts")
    out.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out / "training_data.parquet", index=False)
    console.print(f"[green]Saved to model/artifacts/training_data.parquet[/green]")
