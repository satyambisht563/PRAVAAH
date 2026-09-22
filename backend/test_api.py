"""
Test script for PRAVAAH 4.0 FastAPI endpoints using TestClient.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# 1. Health check
r = client.get("/api/health")
assert r.status_code == 200, f"Health failed: {r.status_code}"
print("[OK] GET /api/health passed:", r.json()["version"])

# 2. Chain pulling risk
r = client.get("/api/chain-pulling/risk?region=Bihar (ECR)&hour=18&train_type=Express&density=0.9")
assert r.status_code == 200, f"CP risk failed: {r.status_code}"
print("[OK] GET /api/chain-pulling/risk passed. Score:", r.json()["score"], r.json()["label"])

# 3. Chain pulling incidents
r = client.get("/api/chain-pulling/incidents?limit=5")
assert r.status_code == 200, f"CP incidents failed: {r.status_code}"
print("[OK] GET /api/chain-pulling/incidents passed. Total records in demo:", r.json()["summary"]["total_records"])

# 4. Regional weather
r = client.get("/api/weather/regional")
assert r.status_code == 200, f"Regional weather failed: {r.status_code}: {r.text}"
print("Weather response keys:", list(r.json().keys()))
print("[OK] GET /api/weather/regional passed. Regions monitored:", len(r.json().get("regions", [])))

# 5. Complaints
r = client.post("/api/complaints", json={
    "train": "12301",
    "coach": "B4",
    "category": "Cleanliness",
    "severity": "high",
    "description": "Washroom hygiene concern test"
})
assert r.status_code == 200, f"Complaint submission failed: {r.status_code}"
data = r.json()
print("[OK] POST /api/complaints passed. Assigned to:", data["complaint"]["assigned_staff_name"], f"({data['complaint']['assigned_role']})")

# 6. Driver report
r = client.post("/api/driver/report", json={
    "train": "12301",
    "type": "Cattle on Track",
    "severity": "high",
    "location": "CNB-PRYJ km 680",
    "description": "Cattle near track fence"
})
assert r.status_code == 200, f"Driver report failed: {r.status_code}"
print("[OK] POST /api/driver/report passed. Report ID:", r.json()["report"]["id"])

# 7. AI recommendations queue
r = client.get("/api/recommendations")
assert r.status_code == 200, f"Recommendations failed: {r.status_code}"
print("[OK] GET /api/recommendations passed. Queue length:", r.json()["total"])

# 8. Human Intervention logging
r = client.post("/api/interventions", json={
    "operator": "Senior Controller — Northern Zone",
    "action": "Issue Speed Restriction",
    "train": "12301",
    "region": "CNB-PRYJ",
    "reason": "Driver reported cattle on track"
})
assert r.status_code == 200, f"Intervention failed: {r.status_code}"
print("[OK] POST /api/interventions passed:", r.json()["intervention"]["id"])

# 9. Network Analytics
r = client.get("/api/analytics/network")
assert r.status_code == 200, f"Analytics failed: {r.status_code}"
print("[OK] GET /api/analytics/network passed. Punctuality:", r.json()["network_punctuality_pct"])

print("\nALL PRAVAAH 4.0 BACKEND API TESTS PASSED SUCCESSFULLY!")
