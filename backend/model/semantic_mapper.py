"""
PRAVAAH 3.0 — Semantic Feature Mapper & Missing-Value Robustness Engine

Allows the XGBoost model to ingest datasets or API payloads where feature
names differ from standard names (e.g., 'dist_km' instead of 'section_km')
and intelligently imputes missing values using railway physics and live environmental telemetry.
"""
import re
import logging
from typing import Dict, Any, Tuple, Optional
import numpy as np

logger = logging.getLogger(__name__)

CANONICAL_FEATURES = [
    "hour", "dow", "section_km", "historical_p50", "historical_p90",
    "tsr_active", "tsr_speed", "congestion_idx", "weather_severity",
    "precipitation_mm", "headway_preceding", "load_factor", "zone",
    "train_class", "seasonal", "weekend", "capacity_util", "recovery_slack",
]

FEATURE_ALIASES = {
    "hour": [
        "hour", "dep_hour", "departure_hour", "time_hour", "hr", "sched_hour",
        "current_hour", "hod", "hour_of_day"
    ],
    "dow": [
        "dow", "day_of_week", "weekday", "day", "day_index", "week_day", "wday"
    ],
    "section_km": [
        "section_km", "distance", "dist_km", "track_length", "section_length",
        "segment_km", "km", "distance_km", "block_distance", "route_km", "dist"
    ],
    "historical_p50": [
        "historical_p50", "p50", "median_delay", "expected_delay_median",
        "avg_historical_delay", "p50_delay", "hist_delay_p50", "median_late_min", "typical_delay"
    ],
    "historical_p90": [
        "historical_p90", "p90", "90th_percentile_delay", "worst_case_historical",
        "p90_delay", "hist_delay_p90", "max_typical_delay", "p90_late_min"
    ],
    "tsr_active": [
        "tsr_active", "speed_restriction", "temporary_speed_restriction",
        "caution_order", "is_tsr", "tsr_flag", "slow_order", "has_tsr",
        "restriction_active", "track_caution", "speed_caution"
    ],
    "tsr_speed": [
        "tsr_speed", "caution_speed", "restricted_speed", "tsr_kmh",
        "speed_limit_tsr", "speed_cap", "caution_kmh", "restricted_kmh"
    ],
    "congestion_idx": [
        "congestion_idx", "traffic_density", "line_capacity_utilization",
        "track_saturation", "congestion", "congestion_ratio", "route_load",
        "section_congestion", "track_congestion", "bottle_neck_index", "congestion_score"
    ],
    "weather_severity": [
        "weather_severity", "climate_severity", "weather_code", "weather_impact",
        "weather_condition", "storm_index", "fog_level", "weather_sev",
        "visibility_penalty", "climate_factor", "weather_alert_level"
    ],
    "precipitation_mm": [
        "precipitation_mm", "rainfall", "rain_mm", "precipitation", "rain",
        "snowfall_mm", "hourly_rain", "precip_mm", "rain_rate", "precipitation_rate"
    ],
    "headway_preceding": [
        "headway_preceding", "train_spacing", "preceding_train_gap", "headway",
        "signal_gap_min", "train_interval", "gap_minutes", "spacing_min",
        "preceding_headway", "headway_min", "block_gap"
    ],
    "load_factor": [
        "load_factor", "passenger_load", "crowd_density", "occupancy_rate",
        "booking_ratio", "seat_utilization", "train_occupancy", "crowd_index", "passenger_occupancy"
    ],
    "zone": [
        "zone", "railway_zone", "admin_zone", "zone_code", "operating_zone",
        "zone_id", "zonal_railway", "ir_zone"
    ],
    "train_class": [
        "train_class", "category", "train_type", "priority_tier",
        "service_type", "class", "train_category", "priority_level"
    ],
    "seasonal": [
        "seasonal", "seasonal_factor", "season_multiplier", "month_factor",
        "monsoon_factor", "seasonal_index", "season_weight"
    ],
    "weekend": [
        "weekend", "is_weekend", "weekend_flag", "holiday_factor", "is_holiday"
    ],
    "capacity_util": [
        "capacity_util", "route_saturation", "capacity", "line_utilization",
        "track_utilization", "section_saturation", "line_capacity"
    ],
    "recovery_slack": [
        "recovery_slack", "buffer_time", "slack_minutes", "schedule_margin",
        "recovery_time", "make_up_slack", "catchup_slack", "buffer_min", "slack_min"
    ]
}

DOMAIN_DEFAULTS = {
    "hour": 14.0,              # afternoon default
    "dow": 2.0,               # Wednesday default
    "section_km": 80.0,       # typical inter-station block in India
    "historical_p50": 6.0,    # 6 min median delay on Indian Railways
    "historical_p90": 18.0,   # 18 min 90th percentile
    "tsr_active": 0.0,        # no restriction by default
    "tsr_speed": 0.0,
    "congestion_idx": 0.50,   # moderate congestion baseline
    "weather_severity": 0.0,  # clear weather default
    "precipitation_mm": 0.0,  # no rain default
    "headway_preceding": 18.0,# 18 min safe headway
    "load_factor": 0.85,      # 85% occupancy
    "zone": 1.0,              # NCR / default zone
    "train_class": 0.0,       # Rajdhani priority
    "seasonal": 1.02,         # normal season
    "weekend": 0.0,           # weekday
    "capacity_util": 0.72,    # 72% line utilization
    "recovery_slack": 2.0,    # 2 min schedule buffer
}


class SemanticFeatureMapper:
    """
    Intelligently maps arbitrary dictionary keys to canonical features
    and applies domain-aware imputation for missing features.
    """

    def __init__(self):
        self.alias_to_canonical = {}
        for canonical, aliases in FEATURE_ALIASES.items():
            for alias in aliases:
                norm = self._normalize_key(alias)
                self.alias_to_canonical[norm] = canonical

    @staticmethod
    def _normalize_key(k: str) -> str:
        return re.sub(r"[^a-z0-9]", "", str(k).lower())

    def resolve_key(self, raw_key: str) -> Optional[str]:
        norm = self._normalize_key(raw_key)
        if norm in self.alias_to_canonical:
            return self.alias_to_canonical[norm]

        for alias_norm, canonical in self.alias_to_canonical.items():
            if norm and (alias_norm in norm or norm in alias_norm):
                return canonical

        return None

    def transform_dict_to_vector(
        self,
        raw_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Tuple[np.ndarray, Dict[str, str]]:
        context = context or {}
        resolved_features = {}
        mapping_report = {}

        for k, v in raw_data.items():
            canonical = self.resolve_key(k)
            if canonical and v is not None and v != "":
                try:
                    resolved_features[canonical] = float(v)
                    mapping_report[k] = f"Mapped to '{canonical}' ({v})"
                except (ValueError, TypeError):
                    pass

        vector = []
        for feat in CANONICAL_FEATURES:
            if feat in resolved_features:
                val = resolved_features[feat]
            elif feat in context:
                val = float(context[feat])
                mapping_report[f"[imputed: {feat}]"] = f"From context: {val}"
            else:
                val = DOMAIN_DEFAULTS.get(feat, 0.0)
                mapping_report[f"[imputed: {feat}]"] = f"Domain physics default: {val}"
            vector.append(val)

        return np.array(vector, dtype=np.float64), mapping_report


mapper = SemanticFeatureMapper()
