/**
 * config.js
 * Centralized API configuration for PRAVAAH frontend
 */
const CONFIG = {
  API_BASE_URL: (window.location.port === '5000' || window.location.port === '8000')
    ? window.location.origin + '/api'
    : 'http://localhost:5000/api',
  SYNC_INTERVAL_MS: 3000
};
