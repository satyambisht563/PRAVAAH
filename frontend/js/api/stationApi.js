/**
 * stationApi.js
 * Client-side API layer for Stations Directory and Platform Assignments
 */
const StationAPI = {
  async getAllStations() {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/stations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.stations || [];
    } catch (err) {
      console.warn('[StationAPI] getAllStations fallback:', err.message);
      return [];
    }
  },

  async getStation(code) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/stations/${code}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.station || null;
    } catch (err) {
      console.warn('[StationAPI] getStation fallback:', err.message);
      return null;
    }
  },

  async getPlatform(stationCode, trainNumber, defaultPf = '1') {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/stations/${stationCode}/platform?train=${trainNumber}&defaultPf=${defaultPf}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.assignedPlatform || defaultPf;
    } catch (err) {
      return defaultPf;
    }
  }
};
