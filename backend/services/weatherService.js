/**
 * weatherService.js - PRAVAAH Live Weather v5.0
 * Uses Open-Meteo API (free, no API key needed)
 * Caches results for 30 minutes per station
 */

const https = require('https');
const stationsData = require('../data/stations.json');

const weatherCache = {};
const CACHE_MS = 30 * 60 * 1000; // 30 minutes

const WMO_CODES = {
  0: 'Clear', 1: 'Mainly Clear', 2: 'Partly Cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy Fog',
  51: 'Light Drizzle', 53: 'Drizzle', 55: 'Heavy Drizzle',
  61: 'Light Rain', 63: 'Rain', 65: 'Heavy Rain',
  71: 'Light Snow', 73: 'Snow', 75: 'Heavy Snow',
  80: 'Rain Showers', 81: 'Rain Showers', 82: 'Heavy Showers',
  95: 'Thunderstorm', 96: 'Thunderstorm with Hail', 99: 'Heavy Thunderstorm'
};

function getDelayFactor(wmoCode, windKph) {
  if ([45, 48].includes(wmoCode)) return 8;           // fog
  if ([65, 82, 95, 96, 99].includes(wmoCode)) return 10; // heavy rain/storm
  if ([61, 63, 80, 81].includes(wmoCode)) return 5;   // moderate rain
  if ([51, 53, 55].includes(wmoCode)) return 3;       // drizzle
  if (windKph > 60) return 5;                         // strong wind
  return 0;
}

function fetchOpenMeteo(lat, lon) {
  return new Promise((resolve, reject) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&timezone=Asia%2FKolkata`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function getStationWeather(stationCode) {
  const code = String(stationCode).toUpperCase();
  const now = Date.now();

  // Return cached data if still fresh
  if (weatherCache[code] && (now - weatherCache[code].fetchedAt) < CACHE_MS) {
    return weatherCache[code].data;
  }

  const station = stationsData[code];
  if (!station || !station.lat) {
    return {
      station: code, condition: 'Clear', condLabel: 'Clear',
      tempC: 28, windKph: 10, isFoggy: false, isRaining: false, delayFactor: 0
    };
  }

  try {
    const apiData = await fetchOpenMeteo(station.lat, station.lon);
    const current = apiData.current;
    const wmoCode = current.weathercode;
    const tempC = Math.round(current.temperature_2m);
    const windKph = Math.round(current.windspeed_10m);
    const condition = WMO_CODES[wmoCode] || 'Clear';
    const isFoggy = [45, 48].includes(wmoCode);
    const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(wmoCode);
    const delayFactor = getDelayFactor(wmoCode, windKph);

    const result = {
      station: code, stationName: station.name,
      condition, condLabel: condition,
      tempC, windKph, isFoggy, isRaining, delayFactor, wmoCode
    };
    weatherCache[code] = { data: result, fetchedAt: now };
    return result;
  } catch (err) {
    console.warn(`[WeatherService] API failed for ${code}: ${err.message} — using fallback`);
    const fallback = {
      station: code, stationName: station ? station.name : code,
      condition: 'Clear', condLabel: 'Clear',
      tempC: 28, windKph: 10, isFoggy: false, isRaining: false, delayFactor: 0
    };
    // Cache the fallback for 5 min only (retry sooner)
    weatherCache[code] = { data: fallback, fetchedAt: now - CACHE_MS + 5 * 60 * 1000 };
    return fallback;
  }
}

module.exports = { getStationWeather };
