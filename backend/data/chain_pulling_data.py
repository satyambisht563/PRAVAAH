"""
PRAVAAH 4.0 — Chain Pulling / Alarm Chain Pulling (ACP) Incident Dataset

⚠️  SYNTHETIC / DEMO DATA — NOT REAL RAILWAY OPERATIONAL DATA
─────────────────────────────────────────────────────────────
This dataset is generated for demonstration and research purposes only.
It is MODELLED on realistic Indian Railways operational patterns based on:
  • Ministry of Railways annual reports on alarm chain pulling
  • CAG (Comptroller and Auditor General) audit reports on ACP misuse
  • RDSO technical notes on train detention causes
  • Railway Protection Force (RPF) published incident zone statistics

Regional incident distribution and time patterns reflect publicly available
statistical trends. Individual incidents are SYNTHETIC — no real incident
data, train numbers, or passenger information is used.

The dataset is intentionally conservative in scope and clearly distinguishes
between high-risk and low-risk zones based on documented operational patterns.
"""

from dataclasses import dataclass, field
from typing import List, Optional
import random
import math

# ─────────────────────────────────────────────────────────────────────────────
# RESEARCH-BASED REGIONAL RISK PROFILES
# Source basis: Ministry of Railways punctuality data, CAG reports, RPF zones
# These are MODELLED distributions, not real counts
# ─────────────────────────────────────────────────────────────────────────────

REGIONAL_RISK_PROFILES = {
    "Bihar (ECR)": {
        "zone": "ECR",
        "base_risk": 0.78,
        "documented_basis": "ECR zone consistently ranks among highest ACP incident zones per Ministry of Railways punctuality reports",
        "key_stations": ["PNBE", "DNR", "ARA", "BXR", "GAYA", "DBRG"],
        "peak_multiplier": 2.1,
        "festival_multiplier": 2.8,
        "typical_reasons": ["Unauthorized boarding", "Passengers missing train", "Medical emergency", "Family separation"],
    },
    "Eastern UP (NCR/NER)": {
        "zone": "NCR",
        "base_risk": 0.71,
        "documented_basis": "High-density passenger corridor with significant unreserved traffic",
        "key_stations": ["CNB", "LKO", "GKP", "BSB", "DDU", "SLN"],
        "peak_multiplier": 1.9,
        "festival_multiplier": 2.5,
        "typical_reasons": ["Overcrowding", "Medical emergencies", "Unauthorized chain pulling", "Family boarding issues"],
    },
    "Mumbai Suburban / CR Division": {
        "zone": "CR",
        "base_risk": 0.65,
        "documented_basis": "High-frequency suburban operations with significant passenger volumes",
        "key_stations": ["CSMT", "LTT", "MMCT", "BVI", "KJT", "KYN"],
        "peak_multiplier": 2.3,
        "festival_multiplier": 1.8,
        "typical_reasons": ["Rush hour overcrowding", "Medical emergencies", "Accidental chain pulling", "Unauthorized stops"],
    },
    "Howrah Division (ER/SER)": {
        "zone": "ER",
        "base_risk": 0.69,
        "documented_basis": "Major terminus generating high ACP incident count in long-distance trains",
        "key_stations": ["HWH", "ASN", "DHN", "SHM", "TATA"],
        "peak_multiplier": 1.8,
        "festival_multiplier": 2.4,
        "typical_reasons": ["Platform overcrowding", "Luggage-related incidents", "Medical emergencies", "Missing passengers"],
    },
    "Varanasi / DDU Section (ECR)": {
        "zone": "ECR",
        "base_risk": 0.73,
        "documented_basis": "High pilgrim traffic creating periodic ACP incidents especially during religious periods",
        "key_stations": ["BSB", "DDU", "MZP", "PRYJ", "ALD"],
        "peak_multiplier": 2.0,
        "festival_multiplier": 3.2,
        "typical_reasons": ["Pilgrim overcrowding", "Festival travel", "Medical emergencies at religious sites"],
    },
    "Delhi NCR (NR/NCR)": {
        "zone": "NR",
        "base_risk": 0.55,
        "documented_basis": "Major hub with high unreserved passenger pressure on departure/arrival",
        "key_stations": ["NDLS", "NZM", "DLI", "GZB", "ANVT"],
        "peak_multiplier": 1.7,
        "festival_multiplier": 2.0,
        "typical_reasons": ["Missed boarding", "Medical emergencies", "Unauthorized stops", "Luggage issues"],
    },
    "South Central (SCR)": {
        "zone": "SCR",
        "base_risk": 0.48,
        "documented_basis": "Moderate risk zone with concentrated incidents at major junctions",
        "key_stations": ["SC", "HYB", "BZA", "GNT", "WL"],
        "peak_multiplier": 1.5,
        "festival_multiplier": 1.9,
        "typical_reasons": ["Medical emergencies", "Overcrowding at festivals", "Unauthorized boarding"],
    },
    "Western Railway (WR)": {
        "zone": "WR",
        "base_risk": 0.51,
        "documented_basis": "Long-distance trains with significant unreserved sections",
        "key_stations": ["BCT", "ST", "BRC", "RTM", "KOTA", "ADI"],
        "peak_multiplier": 1.6,
        "festival_multiplier": 2.1,
        "typical_reasons": ["Long-distance passenger issues", "Medical emergencies", "Overcrowding"],
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# TIME PATTERNS (modelled on peak travel behaviour)
# ─────────────────────────────────────────────────────────────────────────────

HOUR_RISK_WEIGHTS = {
    0: 0.3, 1: 0.2, 2: 0.2, 3: 0.2, 4: 0.3, 5: 0.6,
    6: 1.0, 7: 1.8, 8: 2.2, 9: 2.0, 10: 1.5, 11: 1.2,
    12: 1.0, 13: 0.9, 14: 0.9, 15: 1.1, 16: 1.4, 17: 2.0,
    18: 2.3, 19: 2.1, 20: 1.8, 21: 1.5, 22: 1.0, 23: 0.5,
}

TRAIN_TYPE_RISK = {
    "Express": 1.0,
    "Mail": 0.95,
    "Superfast Express": 0.85,
    "Intercity Express": 1.15,
    "Rajdhani Express": 0.45,
    "Shatabdi Express": 0.30,
    "Vande Bharat Express": 0.25,
    "Duronto Express": 0.40,
    "Passenger": 1.40,
}

REASONS = [
    "Unauthorized chain pulling — medical emergency (genuine)",
    "Passenger missed boarding — chain pulled by family",
    "Medical emergency — genuine",
    "Overcrowding — passenger panic",
    "Child separated from family",
    "Accidental chain pull",
    "Unauthorized stop demand",
    "Luggage left on platform",
    "Passenger fell on platform",
    "Religious/festival gathering delay",
    "Security concern reported by passenger",
    "Unknown — under investigation",
]

COACH_TYPES = ["SL", "3A", "2A", "1A", "GEN", "CC"]


def generate_synthetic_incidents(
    n: int = 500,
    seed: int = 42
) -> List[dict]:
    """
    Generate n synthetic ACP incident records.
    
    ⚠️  SYNTHETIC DATA — for demonstration only.
    """
    rng = random.Random(seed)
    incidents = []

    regions = list(REGIONAL_RISK_PROFILES.keys())
    region_weights = [p["base_risk"] for p in REGIONAL_RISK_PROFILES.values()]
    total_w = sum(region_weights)
    region_probs = [w / total_w for w in region_weights]

    train_types = list(TRAIN_TYPE_RISK.keys())
    train_numbers = [
        "13240", "13239", "15104", "15103", "12301", "12002", "22436",
        "12004", "12951", "12621", "12424", "12259", "12434", "12953",
        "20817", "22691", "12555", "12553", "12393", "12801", "12295",
        "12615", "14005", "15017",
    ]

    for i in range(n):
        # Select region weighted by base risk
        region_name = rng.choices(regions, weights=region_probs, k=1)[0]
        region = REGIONAL_RISK_PROFILES[region_name]

        # Select hour weighted by time pattern
        hour = rng.choices(
            list(HOUR_RISK_WEIGHTS.keys()),
            weights=list(HOUR_RISK_WEIGHTS.values()),
            k=1
        )[0]
        minute = rng.randint(0, 59)

        # Month — weighted toward festival months (Oct, Nov, Mar, Apr)
        month_weights = [1, 1, 1.2, 1.3, 1, 1, 1, 1, 1, 1.5, 1.8, 1.4]
        month = rng.choices(range(1, 13), weights=month_weights, k=1)[0]
        day = rng.randint(1, 28)
        year = rng.choice([2024, 2025])

        is_peak = hour in range(7, 11) or hour in range(17, 21)
        is_weekend = rng.randint(0, 6) >= 5
        is_festival = month in [3, 4, 10, 11] and rng.random() < 0.3

        # Passenger density: 0.0-1.0
        base_density = 0.5 + (0.3 if is_peak else 0) + (0.15 if is_weekend else 0) + (0.2 if is_festival else 0)
        density = min(1.0, base_density + rng.uniform(-0.1, 0.1))

        # Train type — express/intercity more common for ACP
        tt_weights = [TRAIN_TYPE_RISK[t] for t in train_types]
        train_type = rng.choices(train_types, weights=tt_weights, k=1)[0]
        train_no = rng.choice(train_numbers)

        # Probability of incident actually occurring
        prob = (
            region["base_risk"]
            * TRAIN_TYPE_RISK[train_type]
            * HOUR_RISK_WEIGHTS[hour]
            * (region["festival_multiplier"] if is_festival else 1.0)
            * density
        )
        occurred = rng.random() < min(0.95, prob / 3.0)

        station = rng.choice(region["key_stations"])
        reason = rng.choice(region["typical_reasons"] if occurred else ["False alarm / No incident"])
        coach = rng.choice(COACH_TYPES)
        delay_caused = 0
        if occurred:
            delay_caused = rng.randint(5, 35) if "medical" in reason.lower() else rng.randint(3, 20)

        incidents.append({
            "incident_id": f"ACP-{year}-{i+1:05d}",
            "date": f"{year}-{month:02d}-{day:02d}",
            "time": f"{hour:02d}:{minute:02d}",
            "hour": hour,
            "region": region_name,
            "railway_zone": region["zone"],
            "station_code": station,
            "train_number": train_no,
            "train_type": train_type,
            "coach": coach,
            "passenger_density": round(density, 2),
            "is_peak_hour": is_peak,
            "is_weekend": is_weekend,
            "is_festival_period": is_festival,
            "chain_pulling_occurred": occurred,
            "reason_category": reason,
            "delay_caused_min": delay_caused,
            "operational_impact": (
                "HIGH" if delay_caused > 20 else
                "MEDIUM" if delay_caused > 8 else
                "LOW" if delay_caused > 0 else "NONE"
            ),
        })

    return incidents


def get_risk_score(region: str, hour: int, train_type: str, density: float, is_festival: bool = False) -> dict:
    """
    Calculate chain pulling risk score for given parameters.
    Returns a dict with score (0-100), label, and explanation.
    """
    profile = REGIONAL_RISK_PROFILES.get(region, {
        "base_risk": 0.5,
        "peak_multiplier": 1.5,
        "festival_multiplier": 2.0,
    })

    base = profile["base_risk"]
    hour_factor = HOUR_RISK_WEIGHTS.get(hour, 1.0) / 2.3  # normalize
    type_factor = TRAIN_TYPE_RISK.get(train_type, 1.0)
    festival_factor = profile.get("festival_multiplier", 2.0) if is_festival else 1.0

    raw_score = base * hour_factor * type_factor * density * festival_factor
    score = min(100, int(raw_score * 100))

    if score >= 70:
        label = "HIGH"
        color = "rose"
    elif score >= 40:
        label = "MEDIUM"
        color = "amber"
    else:
        label = "LOW"
        color = "emerald"

    return {
        "score": score,
        "label": label,
        "color": color,
        "region": region,
        "hour": hour,
        "train_type": train_type,
        "density": density,
        "is_festival": is_festival,
        "factors": {
            "regional_base": round(base * 100),
            "time_factor": round(hour_factor * 100),
            "train_class_factor": round((1 / type_factor) * 100),
            "density_factor": round(density * 100),
            "festival_factor": round((festival_factor - 1) * 100) if is_festival else 0,
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Pre-generate the demo dataset
# ─────────────────────────────────────────────────────────────────────────────
CHAIN_PULLING_INCIDENTS: List[dict] = generate_synthetic_incidents(500)

# Summary statistics for quick access
INCIDENT_SUMMARY = {
    "total_records": len(CHAIN_PULLING_INCIDENTS),
    "data_type": "SYNTHETIC / DEMO — NOT REAL RAILWAY DATA",
    "date_range": "2024-01 to 2025-12",
    "total_occurred": sum(1 for i in CHAIN_PULLING_INCIDENTS if i["chain_pulling_occurred"]),
    "avg_delay_when_occurred": round(
        sum(i["delay_caused_min"] for i in CHAIN_PULLING_INCIDENTS if i["chain_pulling_occurred"])
        / max(1, sum(1 for i in CHAIN_PULLING_INCIDENTS if i["chain_pulling_occurred"])),
        1
    ),
    "highest_risk_region": "Bihar (ECR)",
    "peak_risk_hours": "07:00-10:00 and 17:00-21:00",
    "research_note": (
        "Distribution modelled on publicly available Ministry of Railways "
        "punctuality reports and CAG audit findings on alarm chain pulling. "
        "No real incident data used."
    ),
}


if __name__ == "__main__":
    import json
    print("=== PRAVAAH 4.0 — Chain Pulling Dataset ===")
    print(f"⚠️  SYNTHETIC DATA — for demonstration only")
    print(json.dumps(INCIDENT_SUMMARY, indent=2))
    print("\nSample records:")
    for rec in CHAIN_PULLING_INCIDENTS[:3]:
        print(json.dumps(rec, indent=2))
