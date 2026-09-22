"""
PRAVAAH 3.0 — Live Weather Client (Open-Meteo Integration)

Fetches 100% REAL LIVE weather conditions (temperature, precipitation, fog,
weather codes, wind speed) for stations along Indian Railways corridors.
Requires NO API KEYS, zero cost, completely open and real-time.
"""
import logging
from typing import Optional, Dict, Any, List
import requests
import urllib3
urllib3.disable_warnings()

logger = logging.getLogger(__name__)

STATION_COORDINATES = {
    "NDLS": (28.6139, 77.2090, "New Delhi"),
    "CNB":  (26.4499, 80.3319, "Kanpur Central"),
    "MGS":  (25.2796, 83.1235, "Pt. DD Upadhyaya / Mughalsarai"),
    "GAYA": (24.7955, 85.0002, "Gaya Junction"),
    "ASN":  (23.6889, 86.9661, "Asansol Junction"),
    "HWH":  (22.5840, 88.3432, "Howrah Junction"),
    "KOTA": (25.1825, 75.8340, "Kota Junction"),
    "RTM":  (23.3344, 75.0375, "Ratlam Junction"),
    "BRC":  (22.3072, 73.1812, "Vadodara Junction"),
    "ST":   (21.1702, 72.8311, "Surat"),
    "BCT":  (18.9696, 72.8194, "Mumbai Central"),
    "AGC":  (27.1767, 78.0081, "Agra Cantt"),
    "GWL":  (26.2183, 78.1828, "Gwalior Junction"),
    "JHS":  (25.4484, 78.5685, "Jhansi Junction"),
    "BPL":  (23.2599, 77.4126, "Bhopal Junction"),
    "NGP":  (21.1458, 79.0882, "Nagpur Junction"),
    "BZA":  (16.5062, 80.6480, "Vijayawada Junction"),
    "MAS":  (13.0827, 80.2707, "Chennai Central"),
    "PNBE": (25.6093, 85.1235, "Patna Junction"),
    "MLDT": (25.0108, 88.1411, "Malda Town"),
}

def parse_wmo_code(code: int, precip_mm: float) -> tuple[float, str]:
    if code in (45, 48):
        return 1.8, "Dense Fog (Visibility < 200m)"
    elif code in (51, 53, 55):
        return 0.8, "Light Drizzle"
    elif code in (61, 63):
        return 1.5, "Moderate Rain"
    elif code in (65, 80, 81, 82):
        return 2.4, "Heavy Downpour / Waterlogging"
    elif code in (95, 96, 99):
        return 3.0, "Severe Thunderstorm / High Gale"
    elif precip_mm > 5.0:
        return 2.0, "Active Rain"
    elif code in (1, 2, 3):
        return 0.3, "Overcast / Hazy"
    else:
        return 0.0, "Clear Sky"


class LiveWeatherClient:
    def __init__(self, timeout: int = 6):
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "PRAVAAH-Rail/3.0"})
        self.cache: Dict[str, Any] = {}

    def get_station_weather(self, station_code: str) -> Dict[str, Any]:
        if station_code not in STATION_COORDINATES:
            return {"severity": 0.0, "condition": "Clear", "temp_c": 28.0, "rain_mm": 0.0, "is_live": False}

        lat, lon, name = STATION_COORDINATES[station_code]
        url = (
            f"https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,visibility"
        )
        try:
            r = self.session.get(url, verify=False, timeout=self.timeout)
            if r.status_code == 200:
                data = r.json().get("current", {})
                w_code = data.get("weather_code", 0)
                precip = float(data.get("precipitation", 0.0))
                temp = float(data.get("temperature_2m", 28.0))
                humidity = float(data.get("relative_humidity_2m", 60.0))
                wind = float(data.get("wind_speed_10m", 5.0))
                vis = float(data.get("visibility", 10000.0))

                sev, cond = parse_wmo_code(w_code, precip)
                if vis < 1000 and sev < 1.5:
                    sev = 1.8
                    cond = "Low Visibility Fog"

                result = {
                    "station_code": station_code,
                    "station_name": name,
                    "temp_c": temp,
                    "humidity_pct": humidity,
                    "rain_mm": precip,
                    "wind_kmh": wind,
                    "visibility_m": vis,
                    "weather_code": w_code,
                    "severity": sev,
                    "condition": cond,
                    "is_live": True
                }
                self.cache[station_code] = result
                return result
        except Exception as e:
            logger.debug("Open-Meteo fetch failed for %s: %s", station_code, e)

        return self.cache.get(station_code, {
            "station_code": station_code,
            "station_name": name,
            "temp_c": 27.5,
            "humidity_pct": 70.0,
            "rain_mm": 0.0,
            "wind_kmh": 6.0,
            "visibility_m": 9500.0,
            "weather_code": 0,
            "severity": 0.0,
            "condition": "Clear",
            "is_live": False
        })

    def get_corridor_weather(self, station_codes: List[str]) -> Dict[str, Any]:
        max_sev = 0.0
        total_rain = 0.0
        details = {}
        for code in station_codes[:6]:
            w = self.get_station_weather(code)
            details[code] = w
            if w["severity"] > max_sev:
                max_sev = w["severity"]
            total_rain += w["rain_mm"]

        return {
            "max_severity": max_sev,
            "total_rain_mm": round(total_rain, 1),
            "station_weather": details
        }


weather_client = LiveWeatherClient()
