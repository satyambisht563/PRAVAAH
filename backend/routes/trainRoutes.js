const express = require('express');
const router = express.Router();
const trainService = require('../services/trainService');

// GET /api/trains - list all fleet trains
router.get('/', (req, res) => {
  try {
    const trains = trainService.getAllTrains();
    res.json({ success: true, count: trains.length, trains });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trains/:trainNumber/schedule
router.get('/:trainNumber/schedule', (req, res) => {
  try {
    const trainNo = req.params.trainNumber;
    const dateInput = req.query.date;
    const schedule = trainService.getTrainSchedule(trainNo, dateInput);
    if (!schedule) {
      return res.status(404).json({ success: false, error: 'Train ' + trainNo + ' not found.' });
    }
    res.json({ success: true, schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trains/:trainNumber/stations
router.get('/:trainNumber/stations', (req, res) => {
  try {
    const trainNo = req.params.trainNumber;
    const stns = trainService.getTrainStations(trainNo);
    if (!stns) {
      return res.status(404).json({ success: false, error: 'Train ' + trainNo + ' not found.' });
    }
    res.json({ success: true, ...stns });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/trains/:trainNumber/status (and alias /live)
function handleStatus(req, res) {
  try {
    const trainNo = req.params.trainNumber;
    const dateInput = req.query.date;
    const timeMin = req.query.timeMin !== undefined ? parseFloat(req.query.timeMin) : undefined;
    
    const simEnv = {
      fog: req.query.fog !== undefined ? parseFloat(req.query.fog) : 0,
      cong: req.query.cong !== undefined ? parseFloat(req.query.cong) : 1.0,
      headway: req.query.headway !== undefined ? parseFloat(req.query.headway) : 18,
      tsr: req.query.tsr === 'true' || req.query.tsr === '1'
    };

    const dynamicState = trainService.getTrainDynamicState(trainNo, dateInput, timeMin, simEnv);
    if (!dynamicState || dynamicState.status === 'unavailable') {
      return res.status(404).json({ success: false, error: 'Train ' + trainNo + ' not found or unavailable.', dynamicState });
    }
    res.json({ success: true, dynamicState });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

router.get('/:trainNumber/status', handleStatus);
router.get('/:trainNumber/live', handleStatus);

// GET /api/trains/:trainNumber - train metadata
router.get('/:trainNumber', (req, res) => {
  try {
    const trainNo = req.params.trainNumber;
    const train = trainService.getTrainByNumber(trainNo);
    if (!train) {
      return res.status(404).json({ success: false, error: 'Train ' + trainNo + ' not found.' });
    }
    res.json({ success: true, train });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
