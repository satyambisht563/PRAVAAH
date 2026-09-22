/**
 * server.js
 * PRAVAAH Railway Operations Backend Server
 * High-performance Express API Server for Train Dynamic Tracking,
 * Route Station Sequences, Weather & Passenger Inspection Scope
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Attempt to load .env if available
try {
  require('dotenv').config();
} catch (e) {}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req, res, next) => {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`[${ts}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'PRAVAAH Railway Operations Backend',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    service: 'PRAVAAH Railway Operations Backend',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Mount Routes
const trainRoutes = require('../routes/trainRoutes');
const stationRoutes = require('../routes/stationRoutes');
const weatherRoutes = require('../routes/weatherRoutes');
const complaintRoutes = require('../routes/complaintRoutes');

app.use('/api/trains', trainRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/complaints', complaintRoutes);

// Chain Pulling and Interventions endpoints from PRAVMITY
app.get('/api/chain-pulling/risk', (req, res) => {
  try {
    const cpData = require('../data/chain_pulling.json');
    res.json({ success: true, ...cpData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/staff/lookup', (req, res) => {
  try {
    const roster = require('../data/staff_roster.json');
    const category = req.query.category || '';
    const coach = req.query.coach || '';
    res.json({ success: true, staff: roster });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Optional static frontend serving for single-port deployments
const frontendPath = path.join(__dirname, '../../frontend');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint ${req.method} ${req.originalUrl} not found.`
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`  🚀 PRAVAAH Backend Server running on port ${PORT}`);
    console.log(`  🌐 Health: http://localhost:${PORT}/health`);
    console.log(`  🚆 Trains: http://localhost:${PORT}/api/trains`);
    console.log(`  📍 Stations: http://localhost:${PORT}/api/stations`);
    console.log(`  ⛅ Weather: http://localhost:${PORT}/api/weather`);
    console.log(`  🎫 Complaints: http://localhost:${PORT}/api/complaints`);
    console.log('====================================================');
  });
}

module.exports = app;
