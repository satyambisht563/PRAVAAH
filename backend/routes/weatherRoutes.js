const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');

// GET /api/weather/:stationCode
router.get('/:stationCode', (req, res) => {
  try {
    const code = req.params.stationCode;
    const weather = weatherService.getStationWeather(code);
    res.json({ success: true, station: code.toUpperCase(), weather });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/weather (query by ?station=HWH)
router.get('/', (req, res) => {
  try {
    const code = req.query.station;
    if (code) {
      const weather = weatherService.getStationWeather(code);
      return res.json({ success: true, station: code.toUpperCase(), weather });
    }
    const all = weatherService.getAllStationWeather();
    res.json({ success: true, count: Object.keys(all).length, weather: all });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
