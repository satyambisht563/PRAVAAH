/**
 * trainApi.js
 * Client-side API layer for Train Metadata, Schedules, Stations & Dynamic Live Status
 */
const TrainAPI = {
  async getAllTrains() {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/trains`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.trains || [];
    } catch (err) {
      console.warn('[TrainAPI] getAllTrains fallback:', err.message);
      return [];
    }
  },

  async getTrain(trainNo) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/trains/${trainNo}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.train || null;
    } catch (err) {
      console.warn('[TrainAPI] getTrain fallback:', err.message);
      return null;
    }
  },

  async getSchedule(trainNo, dateStr) {
    try {
      const q = dateStr ? `?date=${encodeURIComponent(dateStr)}` : '';
      const res = await fetch(`${CONFIG.API_BASE_URL}/trains/${trainNo}/schedule${q}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.schedule || null;
    } catch (err) {
      console.warn('[TrainAPI] getSchedule fallback:', err.message);
      return null;
    }
  },

  async getStations(trainNo) {
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/trains/${trainNo}/stations`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.stations || [];
    } catch (err) {
      console.warn('[TrainAPI] getStations fallback:', err.message);
      return [];
    }
  },

  async getDynamicStatus(trainNo, dateStr, timeMin, envParams = {}) {
    try {
      const params = new URLSearchParams();
      if (dateStr) params.append('date', dateStr);
      if (timeMin !== undefined && timeMin !== null) params.append('timeMin', timeMin);
      if (envParams.fog !== undefined) params.append('fog', envParams.fog);
      if (envParams.cong !== undefined) params.append('cong', envParams.cong);
      if (envParams.headway !== undefined) params.append('headway', envParams.headway);
      if (envParams.tsr !== undefined) params.append('tsr', envParams.tsr ? '1' : '0');

      const url = `${CONFIG.API_BASE_URL}/trains/${trainNo}/status?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.dynamicState || null;
    } catch (err) {
      console.warn('[TrainAPI] getDynamicStatus fallback to client calculation:', err.message);
      if (typeof calculateTrainDynamicState === 'function') {
        return calculateTrainDynamicState(trainNo, timeMin, dateStr);
      }
      return null;
    }
  }
};
