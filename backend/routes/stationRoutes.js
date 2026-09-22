const express = require('express');
const router = express.Router();
const stationService = require('../services/stationService');

// GET /api/stations - all stations
router.get('/', (req, res) => {
  try {
    const stations = stationService.getAllStations();
    res.json({ success: true, count: stations.length, stations });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stations/:stationCode - specific station
router.get('/:stationCode', (req, res) => {
  try {
    const code = req.params.stationCode;
    const station = stationService.getStationByCode(code);
    if (!station) {
      return res.status(404).json({ success: false, error: 'Station ' + code + ' not found in directory.' });
    }
    res.json({ success: true, station });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/stations/:stationCode/platform
router.get('/:stationCode/platform', (req, res) => {
  try {
    const code = req.params.stationCode;
    const trainNo = req.query.train;
    const defaultPf = req.query.defaultPf || "1";
    const assignedPf = stationService.getAssignedPlatform(trainNo, defaultPf, code);
    res.json({ success: true, stationCode: code, trainNumber: trainNo, assignedPlatform: assignedPf });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
