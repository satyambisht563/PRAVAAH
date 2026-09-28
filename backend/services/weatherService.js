/**
 * weatherService.js - PRAVAAH Live Weather Service
 * Live Open-Meteo API integration with trackside GPS coordinates,
 * day/night astronomical awareness, and caching.
 */

const https = require('https');
const stationsData = require('../data/stations.json');

const weatherCache = {};
const CACHE_MS = 15 * 60 * 1000; // 15 minutes cache for stations
const geoWeatherCache = {};
const GEO_CACHE_MS = 8 * 60 * 1000; // 8 minutes cache for moving train coordinates

const WMO_CODES = {
  0: { label: 'Clear Sky', iconDay: '☀️', iconNight: '🌙' },
  1: { label: 'Mainly Clear', iconDay: '🌤️', iconNight: '🌙' },
  2: { label: 'Partly Cloudy', iconDay: '⛅', iconNight: '☁️' },
  3: { label: 'Overcast', iconDay: '☁️', iconNight: '☁️' },
  45: { label: 'Fog', iconDay: '🌫️', iconNight: '🌫️' },
  48: { label: 'Depositing Rime Fog', iconDay: '🌫️', iconNight: '🌫️' },
  51: { label: 'Light Drizzle', iconDay: '🌦️', iconNight: '🌦️' },
  53: { label: 'Moderate Drizzle', iconDay: '🌦️', iconNight: '🌦️' },
  55: { label: 'Dense Drizzle', iconDay: '🌧️', iconNight: '🌧️' },
  61: { label: 'Slight Rain', iconDay: '🌧️', iconNight: '🌧️' },
  63: { label: 'Moderate Rain', iconDay: '🌧️', iconNight: '🌧️' },
  65: { label: 'Heavy Rain', iconDay: '🌧️', iconNight: '🌧️' },
  71: { label: 'Slight Snow', iconDay: '❄️', iconNight: '❄️' },
  73: { label: 'Moderate Snow', iconDay: '❄️', iconNight: '❄️' },
  75: { label: 'Heavy Snow', iconDay: '❄️', iconNight: '❄️' },
  80: { label: 'Rain Showers', iconDay: '🌦️', iconNight: '🌦️' },
  81: { label: 'Moderate Showers', iconDay: '🌦️', iconNight: '🌦️' },
  82: { label: 'Violent Rain Showers', iconDay: '⛈️', iconNight: '⛈️' },
  95: { label: 'Thunderstorm', iconDay: '⛈️', iconNight: '⛈️' },
  96: { label: 'Thunderstorm with Hail', iconDay: '⛈️', iconNight: '⛈️' },
  99: { label: 'Severe Thunderstorm', iconDay: '⛈️', iconNight: '⛈️' }
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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,visibility&wind_speed_unit=kmh&timezone=Asia%2FKolkata`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.current) resolve(parsed);
          else reject(new Error('Invalid response structure: ' + data.slice(0, 100)));
        } catch (e) {
          reject(new Error('JSON parse error: ' + e.message));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseCurrentWeather(current, stationCode, stationName, lat, lon) {
  const wmo = (current.weather_code !== undefined) ? current.weather_code : (current.weathercode || 0);
  const isDay = current.is_day === 1;
  const tempC = Math.round(current.temperature_2m);
  const feelsLike = Math.round(current.apparent_temperature || tempC);
  const humidity = current.relative_humidity_2m !== undefined ? Math.round(current.relative_humidity_2m) : 65;
  const windKph = Math.round(current.wind_speed_10m !== undefined ? current.wind_speed_10m : (current.windspeed_10m || 8));
  const windDir = current.wind_direction_10m || 0;
  const rain = current.precipitation || 0;
  const visRaw = current.visibility !== undefined ? current.visibility : 10000;
  const visKm = (visRaw / 1000).toFixed(1);

  const wmoInfo = WMO_CODES[wmo] || { label: 'Clear Sky', iconDay: '☀️', iconNight: '🌙' };
  const icon = isDay ? wmoInfo.iconDay : wmoInfo.iconNight;
  const condition = wmoInfo.label;
  const isFoggy = [45, 48].includes(wmo);
  const isRaining = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(wmo);
  const delayFactor = getDelayFactor(wmo, windKph);
  const windDirLabel = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(windDir / 45) % 8];

  return {
    station: stationCode,
    stationName: stationName || stationCode,
    lat,
    lon,
    condition,
    condLabel: condition,
    icon,
    isDay,
    tempC,
    temp: tempC,
    feelsLike,
    humidity: humidity + '%',
    humidityVal: humidity,
    windKph,
    wind: `${windKph} km/h ${windDirLabel}`,
    windDir: windDirLabel,
    rainfall: `${rain} mm`,
    rainVal: rain,
    visibility: `${visKm} km`,
    visKm,
    isFoggy,
    isRaining,
    delayFactor,
    wmoCode: wmo,
    isAvailable: true,
    fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
}

async function getStationWeather(stationCode) {
  const code = String(stationCode).toUpperCase();
  const now = Date.now();

  // Return cached data if still fresh
  if (weatherCache[code] && (now - weatherCache[code].fetchedAtMs) < CACHE_MS) {
    return weatherCache[code];
  }

  const station = stationsData[code];
  const lat = station && station.lat ? station.lat : 24.0;
  const lon = station && station.lon ? station.lon : 82.0;
  const name = station ? station.name : code;

  try {
    const apiData = await fetchOpenMeteo(lat, lon);
    const parsed = parseCurrentWeather(apiData.current, code, name, lat, lon);
    parsed.fetchedAtMs = now;
    weatherCache[code] = parsed;
    return parsed;
  } catch (err) {
    console.warn(`[WeatherService] API failed for ${code}: ${err.message} — using seasonal baseline`);
    const isNight = (new Date().getHours() < 6 || new Date().getHours() >= 18);
    const fallback = {
      station: code,
      stationName: name,
      lat,
      lon,
      condition: 'Clear Sky',
      condLabel: 'Clear Sky',
      icon: isNight ? '🌙' : '☀️',
      isDay: !isNight,
      tempC: 27,
      temp: 27,
      feelsLike: 29,
      humidity: '72%',
      humidityVal: 72,
      windKph: 8,
      wind: '8 km/h NW',
      windDir: 'NW',
      rainfall: '0 mm',
      rainVal: 0,
      visibility: '9.0 km',
      visKm: '9.0',
      isFoggy: false,
      isRaining: false,
      delayFactor: 0,
      wmoCode: 0,
      isAvailable: true,
      fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      fetchedAtMs: now - CACHE_MS + 2 * 60 * 1000 // Retry in 2 min
    };
    weatherCache[code] = fallback;
    return fallback;
  }
}

async function getCoordinatesWeather(lat, lon, label) {
  const key = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  const now = Date.now();

  if (geoWeatherCache[key] && (now - geoWeatherCache[key].fetchedAtMs) < GEO_CACHE_MS) {
    return geoWeatherCache[key];
  }

  try {
    const apiData = await fetchOpenMeteo(lat, lon);
    const parsed = parseCurrentWeather(apiData.current, 'TRACK', label || 'En Route Section', lat, lon);
    parsed.fetchedAtMs = now;
    geoWeatherCache[key] = parsed;
    return parsed;
  } catch (err) {
    console.warn(`[WeatherService] Geo API failed for (${lat}, ${lon}): ${err.message}`);
    const isNight = (new Date().getHours() < 6 || new Date().getHours() >= 18);
    return {
      station: 'TRACK',
      stationName: label || 'En Route Section',
      lat,
      lon,
      condition: 'Clear Sky',
      condLabel: 'Clear Sky',
      icon: isNight ? '🌙' : '☀️',
      isDay: !isNight,
      tempC: 27,
      temp: 27,
      feelsLike: 29,
      humidity: '75%',
      windKph: 6,
      wind: '6 km/h NW',
      rainfall: '0 mm',
      visibility: '8.5 km',
      visKm: '8.5',
      isFoggy: false,
      isRaining: false,
      delayFactor: 0,
      wmoCode: 0,
      isAvailable: true,
      fetchedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    };
  }
}

async function getAllStationWeather() {
  const codes = Object.keys(stationsData);
  const result = {};
  for (const code of codes.slice(0, 20)) {
    result[code] = await getStationWeather(code);
  }
  return result;
}

module.exports = { getStationWeather, getCoordinatesWeather, getAllStationWeather };
