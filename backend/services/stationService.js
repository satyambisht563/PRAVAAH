/**
 * stationService.js
 * PRAVAAH Backend Service for Station Directory, Platforms & Jurisdiction
 */

const stationsData = require('../data/stations.json');
const trainsData = require('../data/trains.json');

function getAllStations() {
  return Object.values(stationsData);
}

function getStationByCode(code) {
  if (!code) return null;
  const upper = code.toUpperCase();
  return stationsData[upper] || null;
}

function getAssignedPlatform(trainNumber, defaultPf, stationCode) {
  if (trainNumber && stationCode) {
    const train = trainsData[trainNumber];
    if (train && train.halts) {
      const halt = train.halts.find(h => h.code === stationCode);
      if (halt && halt.pf) {
        return halt.pf;
      }
    }
  }
  return defaultPf || "1";
}

module.exports = {
  getAllStations,
  getStationByCode,
  getAssignedPlatform
};
