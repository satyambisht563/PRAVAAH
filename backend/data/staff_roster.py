"""
PRAVAAH 4.0 — Synthetic Staff Responsibility & Coaching Roster Dataset

⚠️  SYNTHETIC / DEMO DATA — NOT REAL RAILWAY STAFF DATA
─────────────────────────────────────────────────────────────
Modelled on standard Indian Railways coach-manning and operational staffing patterns:
  • Train Superintendent / Conductor (Overall In-charge)
  • Travelling Ticket Examiner (TTE) — typically 1 TTE per 2-3 AC coaches or 3-4 Sleeper coaches
  • Coach Attendant (OBHS - Onboard Housekeeping Staff) — 1 attendant per coach or pair
  • Train Electrical & Mechanical Staff (AC Coach Mechanic, Escorting Staff)
  • RPF (Railway Protection Force) Escort Staff
  • Catering / Pantry Manager

This dataset provides the accountability linkage for passenger complaints and operational alerts.
"""

from typing import Dict, List, Any, Optional

# Synthetic staff database
SYNTHETIC_STAFF_MEMBERS = [
    {"staff_id": "STF-1001", "name": "Rajesh Kumar Sharma", "role": "Train Superintendent", "zone": "NR", "contact_ext": "401", "badge": "TS-772"},
    {"staff_id": "STF-1002", "name": "Amitabh Sengupta", "role": "Head TTE (Travelling Ticket Examiner)", "zone": "ER", "contact_ext": "402", "badge": "TTE-319"},
    {"staff_id": "STF-1003", "name": "Vikram Singh Chauhan", "role": "TTE (AC Coaches)", "zone": "NCR", "contact_ext": "403", "badge": "TTE-482"},
    {"staff_id": "STF-1004", "name": "Pradeep R. Nair", "role": "TTE (Sleeper Coaches)", "zone": "SR", "contact_ext": "404", "badge": "TTE-621"},
    {"staff_id": "STF-1005", "name": "Manoj Paswan", "role": "OBHS Lead (Housekeeping Supervisor)", "zone": "ECR", "contact_ext": "405", "badge": "OBHS-104"},
    {"staff_id": "STF-1006", "name": "Sunil V. Deshmukh", "role": "AC Coach Maintenance Technician", "zone": "CR", "contact_ext": "406", "badge": "TECH-88"},
    {"staff_id": "STF-1007", "name": "Dinesh Chandra Joshi", "role": "Electrical Escorting Staff", "zone": "WR", "contact_ext": "407", "badge": "ELEC-215"},
    {"staff_id": "STF-1008", "name": "Sub-Inspector Ravi Kant", "role": "RPF Escort Commander", "zone": "RPF-HQ", "contact_ext": "182", "badge": "RPF-512"},
    {"staff_id": "STF-1009", "name": "Mohammed Farooq", "role": "Pantry Car Manager (IRCTC)", "zone": "IRCTC", "contact_ext": "409", "badge": "IRCTC-84"},
    {"staff_id": "STF-1010", "name": "Anita Kumari", "role": "Coach Attendant (First AC / H1)", "zone": "NR", "contact_ext": "410", "badge": "ATT-12"},
]

# Standard coach-to-responsibility mapping
def get_staff_for_coach_and_category(coach: str, category: str) -> Dict[str, Any]:
    """
    Resolve responsible staff member and escalation tier based on coach and issue category.
    """
    category_lower = category.lower()
    coach_upper = coach.upper()

    if any(k in category_lower for k in ["clean", "washroom", "toilet", "water", "garbage", "hygiene"]):
        primary = SYNTHETIC_STAFF_MEMBERS[4]  # OBHS Lead
        secondary = SYNTHETIC_STAFF_MEMBERS[0]  # TS
        sla_minutes = 20
    elif any(k in category_lower for k in ["ac", "fan", "cooling", "heat", "temperature"]):
        primary = SYNTHETIC_STAFF_MEMBERS[5]  # AC Tech
        secondary = SYNTHETIC_STAFF_MEMBERS[6]  # Elec Escort
        sla_minutes = 30
    elif any(k in category_lower for k in ["light", "charging", "switch", "power"]):
        primary = SYNTHETIC_STAFF_MEMBERS[6]  # Elec Escort
        secondary = SYNTHETIC_STAFF_MEMBERS[0]  # TS
        sla_minutes = 25
    elif any(k in category_lower for k in ["safety", "security", "theft", "chain", "fight", "drunk", "unauthorized"]):
        primary = SYNTHETIC_STAFF_MEMBERS[7]  # RPF
        secondary = SYNTHETIC_STAFF_MEMBERS[0]  # TS
        sla_minutes = 10
    elif any(k in category_lower for k in ["food", "pantry", "meal", "water bottle", "tea", "catering"]):
        primary = SYNTHETIC_STAFF_MEMBERS[8]  # Pantry Manager
        secondary = SYNTHETIC_STAFF_MEMBERS[0]  # TS
        sla_minutes = 30
    elif any(k in category_lower for k in ["berth", "seat", "unreserved", "ticket", "boarding", "staff"]):
        if coach_upper.startswith("A") or coach_upper.startswith("B") or coach_upper.startswith("H"):
            primary = SYNTHETIC_STAFF_MEMBERS[2]  # TTE AC
        else:
            primary = SYNTHETIC_STAFF_MEMBERS[3]  # TTE Sleeper
        secondary = SYNTHETIC_STAFF_MEMBERS[1]  # Head TTE
        sla_minutes = 25
    else:
        primary = SYNTHETIC_STAFF_MEMBERS[0]  # TS
        secondary = SYNTHETIC_STAFF_MEMBERS[1]  # Head TTE
        sla_minutes = 30

    return {
        "coach": coach,
        "category": category,
        "assigned_staff_id": primary["staff_id"],
        "assigned_staff_name": primary["name"],
        "assigned_role": primary["role"],
        "contact_ext": primary["contact_ext"],
        "escalation_staff_name": secondary["name"],
        "escalation_role": secondary["role"],
        "sla_resolution_minutes": sla_minutes,
        "data_notice": "⚠️ SYNTHETIC / DEMO STAFF ROSTER",
    }
