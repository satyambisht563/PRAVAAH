# PRAVAAH 4.0 — Intelligent ETS Railway Operations Platform

> **Smart India Hackathon 2026** | **Problem Statement ID: 26028** | **Team OASIS**  
> *Dynamic Forecast of Expected Time of Arrival (ETA), Human-in-the-Loop Operations & Multi-Stakeholder Intelligence*  
> **Collaborators:** Satyam Bisht ([@satyambisht563](https://github.com/satyambisht563)) · Samentha Massey ([@samenthamassey127-hue](https://github.com/samenthamassey127-hue))

---

## 🌟 System Architecture: Clean Separation of Concerns

The PRAVAAH platform has been restructured into a cleanly decoupled **Frontend** and **Backend** architecture:

```text
PRAVAAH/
│
├── frontend/                       # Pure Client Presentation Layer
│   ├── index.html                  # Semantic UI markup (8 role-based dashboards)
│   ├── css/
│   │   └── style.css               # Extracted design system, themes & animations
│   ├── js/
│   │   ├── config.js               # Central API configuration (http://localhost:5000/api)
│   │   ├── api/
│   │   │   ├── trainApi.js         # Train schedules, stations, and dynamic status API
│   │   │   ├── stationApi.js       # Station directory & platform resolver API
│   │   │   ├── weatherApi.js       # Station meteorological conditions API
│   │   │   └── complaintApi.js     # Passenger complaint & inspection scope API
│   │   └── app.js                  # UI controllers, SVG radar, driver gauges & audio
│   └── assets/                     # Audio chimes, icons, logos
│
├── backend/                        # High-Performance REST API Server
│   ├── server/
│   │   └── server.js               # Express application entry point (Port 5000)
│   ├── data/
│   │   ├── trains.json             # 14 verified trains with halts, platforms & running days
│   │   ├── stations.json           # Railway junction directory (zone, division, MPS)
│   │   ├── weather.json            # 111 station meteorological profiles
│   │   ├── staff_roster.json       # Synthetic coach manning & responsibility directory
│   │   ├── chain_pulling.json      # Alarm Chain Pulling (ACP) risk intelligence
│   │   ├── complaints.json         # Persistent passenger complaints store
│   │   └── trains_master.py        # Synchronized Python master dataset
│   ├── routes/
│   │   ├── trainRoutes.js          # /api/trains/* endpoints
│   │   ├── stationRoutes.js        # /api/stations/* endpoints
│   │   ├── weatherRoutes.js        # /api/weather/* endpoints
│   │   └── complaintRoutes.js      # /api/complaints/* endpoints
│   ├── services/
│   │   ├── trainService.js         # Schedule logic, calendar offset (diffDays), physics ETA engine
│   │   ├── stationService.js       # Station directory & platform lookup
│   │   ├── weatherService.js       # Station weather & regional MET intelligence
│   │   └── complaintService.js     # Decision engine for OBHS & coach inspection scope
│   ├── model/                      # ML Intelligence from PRAVMITY
│   │   ├── artifacts/              # xgb_model.pkl, scaler.pkl, feature_importances.csv, metrics.json
│   │   ├── predict.py
│   │   ├── train.py
│   │   └── features.py
│   ├── test_api.js                 # Automated API test suite
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── run_website.bat                 # One-click browser launcher
├── start_backend.bat               # One-click backend launcher
└── README.md                       # Complete project documentation
```

---

## 🚀 How to Run

### Method 1: Instant Standalone Run
1. Double-click **`run_website.bat`** (or open `frontend/index.html` in Chrome/Edge/Firefox).
2. The frontend boots immediately with local caching and connects to the backend as soon as it is online.

### Method 2: With Full Express Backend (Recommended)
1. **Start Backend**:
   ```bash
   cd backend
   npm install
   npm start
   ```
   * Server runs at `http://localhost:5000`
   * Health check: `http://localhost:5000/health`
2. **Launch Website**:
   Double-click **`run_website.bat`** or open `frontend/index.html`.

### Method 3: Run Backend Automated Tests
```bash
cd backend
npm test
```
Verifies all 8 core API capabilities:
- Health status (`/health`)
- 14 Fleet trains list (`/api/trains`)
- Operating schedule by date (Sunday vs Monday)
- Complete station sequences and official platforms
- Multi-day calendar offset and live progress (~64% on Day 2)
- Station directory lookup
- Distinct station weather profiles
- Complaint submission and automated coach inspection scope

---

## 🔑 Key Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/trains` | List all fleet trains with running days and origin/dest |
| `GET` | `/api/trains/:trainNo/schedule?date=...` | Evaluates if train runs on date (`isScheduled`) |
| `GET` | `/api/trains/:trainNo/stations` | All halts, kilometer marks, and verified platforms |
| `GET` | `/api/trains/:trainNo/status?date=...` | Dynamic train state (`NOT_SCHEDULED`, `SCHEDULED`, `RUNNING`, `COMPLETED`), accurate live position matching NTES progress, and physics ETA |
| `GET` | `/api/stations/:stationCode` | Station metadata, division, zone, and platforms |
| `GET` | `/api/weather/:stationCode` | Station-specific weather conditions |
| `POST`| `/api/complaints` | Submits complaint and returns calculated inspection scope |
| `GET` | `/api/complaints` | Lists recorded complaints |

---

## 🛠️ Technology Stack
* **Backend**: Node.js, Express 4, CORS, JSON data persistence, Dotenv
* **ML Intelligence**: Python 3, XGBoost (`xgb_model.pkl`), Scikit-learn, Pandas
* **Frontend**: Decoupled HTML5, CSS3 Variables, ES6 Modules/API Clients, SVG Vector Graphics, Google Maps API, Web Audio API

---

## 👥 Team OASIS & Collaborators

* **Satyam Bisht** ([@satyambisht563](https://github.com/satyambisht563)) — Core System Architecture & Full-Stack Platform Development
* **Samentha Massey** ([@samenthamassey127-hue](https://github.com/samenthamassey127-hue)) — Machine Learning Models, ETA Forecasting Intelligence & Collaborative Development

