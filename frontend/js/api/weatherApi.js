/**
 * weatherApi.js
 * Client-side API layer for Station-specific Weather
 */
const WeatherAPI = {
  async getStationWeather(stationCode) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/weather/${stationCode}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.weather || { isAvailable: false, error: 'Weather unavailable' };
    } catch (err) {
      console.warn('[WeatherAPI] getStationWeather fallback:', err.message);
      if (typeof getStationWeather === 'function') {
        return getStationWeather(stationCode);
      }
      return { isAvailable: false, error: 'Weather unavailable' };
    }
  }
};
