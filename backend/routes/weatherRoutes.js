const express = require('express');
const router = express.Router();
const weatherService = require('../services/weatherService');

// GET /api/weather/geo?lat=...&lon=...&name=...
router.get('/geo', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const name = req.query.name || 'En Route Section';
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ success: false, error: 'Valid lat and lon query parameters required' });
    }
    const weather = await weatherService.getCoordinatesWeather(lat, lon, name);
    res.json({ success: true, location: name, weather });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/weather/:stationCode
router.get('/:stationCode', async (req, res) => {
  try {
    const code = req.params.stationCode;
    if (code.toLowerCase() === 'geo') return; // Handled above
    const weather = await weatherService.getStationWeather(code);
    res.json({ success: true, station: code.toUpperCase(), weather });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/weather (query by ?station=HWH or ?lat=..&lon=..)
router.get('/', async (req, res) => {
  try {
    const code = req.query.station;
    if (code) {
      const weather = await weatherService.getStationWeather(code);
      return res.json({ success: true, station: code.toUpperCase(), weather });
    }
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (!isNaN(lat) && !isNaN(lon)) {
      const name = req.query.name || 'En Route Section';
      const weather = await weatherService.getCoordinatesWeather(lat, lon, name);
      return res.json({ success: true, location: name, weather });
    }
    const all = await weatherService.getAllStationWeather();
    res.json({ success: true, count: Object.keys(all).length, weather: all });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
