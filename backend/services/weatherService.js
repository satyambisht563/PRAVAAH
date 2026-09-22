/**
 * weatherService.js
 * PRAVAAH Backend Service for Station Weather & Regional Met Intelligence
 */

const weatherData = require('../data/weather.json');

function getStationWeather(stationCode) {
  if (!stationCode) {
    return { isAvailable: false, error: "Weather data unavailable" };
  }
  const upper = stationCode.toUpperCase();
  if (weatherData[upper]) {
    return {
      station: upper,
      ...weatherData[upper],
      condLabel: weatherData[upper].condition,
      isAvailable: true,
      dataSource: "PRAVAAH Regional MET Network (Simulated Profiles)"
    };
  }
  return {
    station: upper,
    isAvailable: false,
    error: "Weather data unavailable"
  };
}

function getAllStationWeather() {
  return weatherData;
}

module.exports = {
  getStationWeather,
  getAllStationWeather
};
