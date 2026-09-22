"""
PRAVAAH 4.0 — Regional Weather Impact Model

⚠️  SYNTHETIC / DEMO DATA — Weather impact values are MODELLED,
not derived from real-time Indian Railways operational data.

Architecture is designed to accept real weather API data when connected.
"""

from typing import Dict, Any

# ─────────────────────────────────────────────────────────────────────────────
# RAILWAY REGION DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

RAILWAY_REGIONS: Dict[str, Dict[str, Any]] = {
    "Delhi NCR": {
        "zone": "NR/NCR",
        "lat": 28.6139, "lon": 77.2090,
        "key_stations": ["NDLS", "NZM", "GZB", "DLI", "ANVT"],
        "primary_risk": "Fog (Winter)",
        "secondary_risk": "Extreme Heat (Summer)",
        "fog_season_months": [11, 12, 1, 2],
        "heat_season_months": [5, 6, 7],
        "rain_season_months": [7, 8, 9],
        "max_speed_restrictions": {
            "fog_dense": 30,
            "fog_moderate": 60,
            "heavy_rain": 75,
            "storm": 50,
            "clear": 130,
        },
    },
    "Mumbai Division": {
        "zone": "CR/WR",
        "lat": 19.0760, "lon": 72.8777,
        "key_stations": ["CSMT", "LTT", "MMCT", "BVI", "DR", "ADH"],
        "primary_risk": "Heavy Rain / Flooding",
        "secondary_risk": "Waterlogging",
        "fog_season_months": [],
        "heat_season_months": [4, 5],
        "rain_season_months": [6, 7, 8, 9],
        "max_speed_restrictions": {
            "fog_dense": 60,
            "fog_moderate": 90,
            "heavy_rain": 65,
            "storm": 50,
            "clear": 110,
        },
    },
    "Kolkata / Howrah": {
        "zone": "ER/SER",
        "lat": 22.5726, "lon": 88.3639,
        "key_stations": ["HWH", "SDAH", "SHM", "CLG"],
        "primary_risk": "Cyclone / Heavy Rain",
        "secondary_risk": "Flooding",
        "fog_season_months": [12, 1],
        "heat_season_months": [4, 5, 6],
        "rain_season_months": [6, 7, 8, 9, 10],
        "max_speed_restrictions": {
            "fog_dense": 40,
            "fog_moderate": 75,
            "heavy_rain": 60,
            "storm": 40,
            "clear": 120,
        },
    },
    "Patna / Bihar (ECR)": {
        "zone": "ECR",
        "lat": 25.5941, "lon": 85.1376,
        "key_stations": ["PNBE", "DNR", "GAYA", "DDU", "ARA"],
        "primary_risk": "Flooding (Monsoon)",
        "secondary_risk": "Fog (Winter)",
        "fog_season_months": [11, 12, 1, 2],
        "heat_season_months": [4, 5, 6],
        "rain_season_months": [7, 8, 9],
        "max_speed_restrictions": {
            "fog_dense": 30,
            "fog_moderate": 60,
            "heavy_rain": 65,
            "storm": 50,
            "clear": 110,
        },
    },
    "Varanasi / Prayagraj": {
        "zone": "ECR/NCR",
        "lat": 25.3176, "lon": 82.9739,
        "key_stations": ["BSB", "DDU", "PRYJ", "MZP"],
        "primary_risk": "Fog (Winter)",
        "secondary_risk": "Flooding (Monsoon)",
        "fog_season_months": [11, 12, 1, 2],
        "heat_season_months": [4, 5, 6],
        "rain_season_months": [7, 8, 9],
        "max_speed_restrictions": {
            "fog_dense": 30,
            "fog_moderate": 60,
            "heavy_rain": 70,
            "storm": 50,
            "clear": 120,
        },
    },
    "Kanpur / Lucknow": {
        "zone": "NCR/NER",
        "lat": 26.4499, "lon": 80.3319,
        "key_stations": ["CNB", "LKO", "LJN", "ETW"],
        "primary_risk": "Fog (Winter)",
        "secondary_risk": "Heavy Rain",
        "fog_season_months": [11, 12, 1, 2],
        "heat_season_months": [5, 6],
        "rain_season_months": [7, 8, 9],
        "max_speed_restrictions": {
            "fog_dense": 30,
            "fog_moderate": 60,
            "heavy_rain": 75,
            "storm": 55,
            "clear": 130,
        },
    },
    "Nagpur / Central India": {
        "zone": "CR/SECR",
        "lat": 21.1458, "lon": 79.0882,
        "key_stations": ["NGP", "ET", "BPL", "JBP"],
        "primary_risk": "Extreme Heat",
        "secondary_risk": "Heavy Rain (Monsoon)",
        "fog_season_months": [],
        "heat_season_months": [3, 4, 5, 6],
        "rain_season_months": [7, 8, 9],
        "max_speed_restrictions": {
            "fog_dense": 60,
            "fog_moderate": 100,
            "heavy_rain": 70,
            "storm": 55,
            "clear": 120,
        },
    },
    "Chennai / Southern": {
        "zone": "SR/SCR",
        "lat": 13.0827, "lon": 80.2707,
        "key_stations": ["MAS", "MS", "MSC", "TPJ"],
        "primary_risk": "Cyclone (NE Monsoon)",
        "secondary_risk": "Heavy Rain",
        "fog_season_months": [],
        "heat_season_months": [3, 4, 5],
        "rain_season_months": [10, 11, 12],
        "max_speed_restrictions": {
            "fog_dense": 50,
            "fog_moderate": 90,
            "heavy_rain": 60,
            "storm": 40,
            "clear": 110,
        },
    },
}


# ─────────────────────────────────────────────────────────────────────────────
# IMPACT SCORING ENGINE
# ─────────────────────────────────────────────────────────────────────────────

WEATHER_IMPACT_MATRIX = {
    "clear": {"severity": 0.0, "speed_reduction_pct": 0, "delay_range": (0, 0), "risk": "NONE"},
    "partly_cloudy": {"severity": 0.1, "speed_reduction_pct": 0, "delay_range": (0, 2), "risk": "NONE"},
    "light_rain": {"severity": 0.3, "speed_reduction_pct": 5, "delay_range": (2, 8), "risk": "LOW"},
    "heavy_rain": {"severity": 0.65, "speed_reduction_pct": 20, "delay_range": (12, 22), "risk": "HIGH"},
    "flooding": {"severity": 0.90, "speed_reduction_pct": 45, "delay_range": (30, 120), "risk": "CRITICAL"},
    "fog_moderate": {"severity": 0.55, "speed_reduction_pct": 35, "delay_range": (15, 45), "risk": "HIGH"},
    "fog_dense": {"severity": 0.80, "speed_reduction_pct": 60, "delay_range": (30, 90), "risk": "CRITICAL"},
    "storm": {"severity": 0.85, "speed_reduction_pct": 50, "delay_range": (20, 80), "risk": "CRITICAL"},
    "extreme_heat": {"severity": 0.35, "speed_reduction_pct": 10, "delay_range": (5, 15), "risk": "MEDIUM"},
    "strong_wind": {"severity": 0.45, "speed_reduction_pct": 15, "delay_range": (5, 20), "risk": "MEDIUM"},
    "cyclone_warning": {"severity": 0.95, "speed_reduction_pct": 100, "delay_range": (60, 300), "risk": "CRITICAL"},
}


def calculate_weather_impact(region: str, condition: str, train_type: str = "Express") -> dict:
    """
    Calculate weather impact on railway operations for a given region/condition.
    
    ⚠️  Returns MODELLED impact, not real operational data.
    """
    matrix = WEATHER_IMPACT_MATRIX.get(condition, WEATHER_IMPACT_MATRIX["clear"])
    region_data = RAILWAY_REGIONS.get(region, {})
    
    # Train type modifiers
    train_modifiers = {
        "Rajdhani Express": 0.85,    # Better priority, but slower in adverse conditions
        "Vande Bharat Express": 0.80,  # Modern, but sensitive to conditions
        "Shatabdi Express": 0.82,
        "Duronto Express": 0.88,
        "Superfast Express": 0.92,
        "Express": 1.0,
        "Mail": 1.0,
        "Intercity Express": 1.05,
        "Passenger": 1.10,
    }
    modifier = train_modifiers.get(train_type, 1.0)
    
    severity = matrix["severity"]
    speed_reduction = matrix["speed_reduction_pct"]
    delay_min, delay_max = matrix["delay_range"]
    
    return {
        "region": region,
        "condition": condition,
        "train_type": train_type,
        "impact_score": round(severity * 100),
        "risk_level": matrix["risk"],
        "speed_reduction_pct": speed_reduction,
        "estimated_delay_min": delay_min,
        "estimated_delay_max": delay_max,
        "recommended_max_speed": region_data.get("max_speed_restrictions", {}).get(
            condition if condition in ["fog_dense", "fog_moderate", "heavy_rain", "storm"] else "clear",
            100
        ),
        "key_concerns": get_key_concerns(region, condition),
        "operational_action": get_operational_action(condition),
        "data_label": "MODELLED / DEMO — Not real-time operational data",
    }


def get_key_concerns(region: str, condition: str) -> list:
    concern_map = {
        "heavy_rain": ["Track waterlogging risk", "Reduced visibility", "Signal failure risk", "Bridge monitoring required"],
        "flooding": ["Track submersion", "Emergency speed restriction", "Route diversion may be needed", "RPF/NDRF coordination"],
        "fog_dense": ["Zero visibility sections", "ATP/TPWS mandatory", "Extended headway required", "All signals at caution"],
        "fog_moderate": ["Reduced visibility", "Speed restriction imposed", "Fog devices active"],
        "storm": ["High wind risk", "Overhead wire disruption", "Debris on track possible", "Signal failure risk"],
        "extreme_heat": ["Track buckling risk above 45°C", "Speed restriction on vulnerable sections", "Cooling system stress"],
        "cyclone_warning": ["Complete suspension likely", "Emergency evacuation protocols", "All movement suspended"],
        "clear": ["Normal operations"],
    }
    return concern_map.get(condition, ["Standard precautions"])


def get_operational_action(condition: str) -> str:
    actions = {
        "heavy_rain": "Issue speed restriction order. Monitor track drainage. Alert all loco pilots.",
        "flooding": "STOP ALL TRAINS on affected section. Issue emergency order. Contact DRM.",
        "fog_dense": "Implement Absolute Block working. Fog signals mandatory. Speed 30-60 km/h max.",
        "fog_moderate": "Enhanced vigilance. Speed restriction 60-75 km/h. Fog devices deployed.",
        "storm": "Speed restriction 50 km/h. Halt trains at nearest station if storm intensifies.",
        "extreme_heat": "Monitor track temperature. Speed restriction on curved/vulnerable sections if > 45°C.",
        "cyclone_warning": "Evacuate passengers at nearest safe station. Suspend operations.",
        "clear": "Normal operations. No restrictions.",
        "light_rain": "Normal operations with enhanced vigilance.",
    }
    return actions.get(condition, "Enhanced vigilance required.")


# ─────────────────────────────────────────────────────────────────────────────
# DEMO REGIONAL STATUS (simulated current conditions for dashboard)
# ─────────────────────────────────────────────────────────────────────────────

DEMO_CURRENT_CONDITIONS = {
    "Delhi NCR": {"condition": "fog_moderate", "temp": 16, "humidity": 88, "visibility_m": 800},
    "Mumbai Division": {"condition": "heavy_rain", "temp": 29, "humidity": 95, "visibility_m": 2000},
    "Kolkata / Howrah": {"condition": "light_rain", "temp": 27, "humidity": 82, "visibility_m": 5000},
    "Patna / Bihar (ECR)": {"condition": "fog_dense", "temp": 14, "humidity": 92, "visibility_m": 200},
    "Varanasi / Prayagraj": {"condition": "fog_moderate", "temp": 17, "humidity": 86, "visibility_m": 600},
    "Kanpur / Lucknow": {"condition": "partly_cloudy", "temp": 22, "humidity": 70, "visibility_m": 8000},
    "Nagpur / Central India": {"condition": "extreme_heat", "temp": 42, "humidity": 35, "visibility_m": 10000},
    "Chennai / Southern": {"condition": "heavy_rain", "temp": 30, "humidity": 91, "visibility_m": 2500},
}

CONDITION_ICONS = {
    "clear": "☀️",
    "partly_cloudy": "⛅",
    "light_rain": "🌦️",
    "heavy_rain": "🌧️",
    "flooding": "🌊",
    "fog_moderate": "🌫️",
    "fog_dense": "🌫️",
    "storm": "⛈️",
    "extreme_heat": "🔥",
    "strong_wind": "💨",
    "cyclone_warning": "🌀",
}


if __name__ == "__main__":
    import json
    print("=== PRAVAAH 4.0 — Weather Impact Model ===")
    print("⚠️  MODELLED/DEMO DATA")
    result = calculate_weather_impact("Mumbai Division", "heavy_rain", "Rajdhani Express")
    print(json.dumps(result, indent=2))
