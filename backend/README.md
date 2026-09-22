# PRAVAAH Railway Operations Backend

High-performance, decoupled Express/Node.js RESTful API server for Indian Railways real-time fleet tracking, timetable schedules, multi-station jurisdiction, weather profiles, and passenger complaint inspection intelligence.

---

## Architecture Overview

```text
backend/
├── server/
│   └── server.js               # Express application entry point, CORS, request logger
├── data/
│   ├── trains.json             # 14 trains with 100% verified halts, runningDays, and platforms
│   ├── stations.json           # Network stations directory, division, zone, and MPS
│   ├── weather.json            # 111 station-specific meteorological profiles
│   ├── staff_roster.json       # Synthetic coach manning & responsibility directory
│   ├── chain_pulling.json      # ACP incident risk database & regional profiles
│   ├── complaints.json         # Persistent passenger complaints store
│   └── trains_master.py        # Synchronized Python master dataset
├── routes/
│   ├── trainRoutes.js          # /api/trains/* endpoints
│   ├── stationRoutes.js        # /api/stations/* endpoints
│   ├── weatherRoutes.js        # /api/weather/* endpoints
│   └── complaintRoutes.js      # /api/complaints/* endpoints
├── services/
│   ├── trainService.js         # Schedule logic, calendar offset (diffDays), physics ETA engine
│   ├── stationService.js       # Station directory & platform resolver
│   ├── weatherService.js       # Station weather & regional MET intelligence
│   └── complaintService.js     # Decision engine for OBHS & coach inspection scope
├── model/                      # ML artifacts from PRAVMITY
│   ├── artifacts/              # xgb_model.pkl, scaler.pkl, feature_importances.csv, metrics.json
│   ├── predict.py
│   ├── train.py
│   └── features.py
├── test_api.js                 # Automated API test suite
├── package.json
├── .env.example
└── README.md
```

---

## Getting Started

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 3. Start the Server
* **Production / Normal Start**:
  ```bash
  npm start
  ```
* **Development Auto-Reload**:
  ```bash
  npm run dev
  ```
The server will bind to port **5000** (or your configured `PORT`).

### 4. Run Automated Test Suite
```bash
npm test
```
Verifies health, schedule evaluation, multi-day offset, platform data, distinct weather, and inspection scope calculations.

---

## API Reference

### 1. Trains (`/api/trains`)

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/trains` | — | List all fleet trains with running days and origin/dest summaries. |
| `GET` | `/api/trains/:trainNo` | — | Get full train metadata and halt sequences. |
| `GET` | `/api/trains/:trainNo/schedule` | `?date=YYYY-MM-DD` | Returns schedule and evaluates whether the train operates on the given date (`isScheduled`). |
| `GET` | `/api/trains/:trainNo/stations` | — | Returns full station sequence, kilometer marks, and official platforms. |
| `GET` | `/api/trains/:trainNo/status` | `?date=YYYY-MM-DD&timeMin=990` | Returns dynamic operational state: `NOT_SCHEDULED`, `SCHEDULED`, `RUNNING`, or `COMPLETED`. Live progress matches NTES (~64% on Day 2) with physics-based ETA. |
| `GET` | `/api/trains/:trainNo/live` | `?date=YYYY-MM-DD` | Alias for `/status`. |

#### Example: Schedule Check
```bash
curl "http://localhost:5000/api/trains/12301/schedule?date=2026-09-27"
```
```json
{
  "success": true,
  "schedule": {
    "trainNumber": "12301",
    "trainName": "Howrah Rajdhani Express",
    "queryDate": "2026-09-27",
    "queryDay": "Sunday (SUN)",
    "isScheduled": false,
    "statusText": "NOT SCHEDULED TODAY",
    "runningDays": ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    "runsText": "Mon, Tue, Wed, Thu, Fri, Sat"
  }
}
```

---

### 2. Stations (`/api/stations`)

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/stations` | — | List all stations in the directory. |
| `GET` | `/api/stations/:stationCode` | — | Get station details (division, zone, platforms, MPS). |
| `GET` | `/api/stations/:stationCode/platform` | `?train=12424` | Get verified assigned platform for a train at that station. |

---

### 3. Weather (`/api/weather`)

| Method | Endpoint | Query Params | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/weather/:stationCode` | — | Get weather conditions for specific station (temperature, condition, visibility, wind). |
| `GET` | `/api/weather` | `?station=HWH` | Query station weather by parameter or get all stations. |

---

### 4. Passenger Complaints (`/api/complaints`)

| Method | Endpoint | Payload | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/complaints` | `{ train, passengerClass, coach, category, severity, description }` | Submits complaint, computes inspection scope, assigns responsible staff, and saves complaint. |
| `POST` | `/api/complaints/inspection-scope` | `{ passengerClass, coach, category, severity }` | Evaluates inspection scope without creating a record. |
| `GET` | `/api/complaints` | `?train=...&status=...` | List complaints with optional filtering. |
| `GET` | `/api/complaints/:id` | — | Get single complaint by ID. |
| `PATCH`| `/api/complaints/:id` | `{ status, notes }` | Update complaint status or add resolution notes. |

#### Example: Complaint Inspection Scope Response
```json
{
  "scopeType": "MULTI_COACH",
  "coachesToInspect": ["B3", "B4", "B5"],
  "numberOfCoaches": 3,
  "reason": "Potential AC/service issue affecting adjacent coaches in 3A carriage block.",
  "assignedStaff": {
    "name": "Sunil V. Deshmukh",
    "role": "AC Coach Maintenance Technician",
    "badge": "TECH-88"
  }
}
```

---

## How the Frontend Connects

The frontend makes asynchronous `fetch()` requests to `http://localhost:5000/api` through its dedicated API layer:
* `frontend/js/api/trainApi.js`
* `frontend/js/api/stationApi.js`
* `frontend/js/api/weatherApi.js`
* `frontend/js/api/complaintApi.js`

If the backend server is temporarily offline, the frontend's API client gracefully falls back to cached snapshot data so the user interface never crashes.
