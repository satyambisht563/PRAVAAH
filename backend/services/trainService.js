/**
 * trainService.js - PRAVAAH Train Service v5.0
 * FIXED: Correct NTES schedules, real delay engine, accurate position calculation
 *
 * KEY FIX - Position logic:
 *   effectiveTime = currentTime - delayMin
 *   This places the train where it ACTUALLY is on the schedule (before Gaya if delayed)
 *
 * KEY FIX - ETA logic:
 *   predictedETA = scheduledArrivalMin + delayMin
 *   Shows: "Scheduled: 22:36 | Delayed by 15 min | ETA: 22:51"
 */

const trainsData = require('../data/trains.json');
const delaysData = require('../data/delays.json');

const DAYS_OF_WEEK = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ─── Utilities ───────────────────────────────────────────────────────────────

function minToHHMM(m) {
  if (m === null || m === undefined || isNaN(m)) return '--:--';
  const norm = ((Math.round(m) % 1440) + 1440) % 1440;
  return String(Math.floor(norm / 60)).padStart(2, '0') + ':' + String(norm % 60).padStart(2, '0');
}

function parseDateInput(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatRunningDays(days) {
  if (!days || !days.length) return 'Not Scheduled';
  if (days.length === 7) return 'Daily (All Days)';
  const map = { MON: 'Mon', TUE: 'Tue', WED: 'Wed', THU: 'Thu', FRI: 'Fri', SAT: 'Sat', SUN: 'Sun' };
  return days.map(d => map[d] || d).join(', ');
}

// ─── Running Days ─────────────────────────────────────────────────────────────

function isTrainScheduledOnDate(trainNo, dateInput) {
  const train = trainsData[String(trainNo)];
  if (!train || !train.runningDays || !train.runningDays.length) return false;
  const d = parseDateInput(dateInput);
  if (isNaN(d.getTime())) return false;
  return train.runningDays.includes(DAYS_OF_WEEK[d.getDay()]);
}

// ─── Delay Engine ─────────────────────────────────────────────────────────────

function calculateDelay(trainNo, simEnv) {
  const info = delaysData[String(trainNo)] || { avgDelayMin: 10 };
  let delay = info.avgDelayMin;

  // Weather factor
  if (simEnv && simEnv.fog > 0.5) delay += 8;    // foggy
  else if (simEnv && simEnv.rain) delay += 5;     // rainy

  // Peak hour congestion
  const hour = new Date().getHours();
  if ((hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20)) delay += 5;

  // TSR active
  if (simEnv && simEnv.tsr) delay += 6;

  return Math.round(delay);
}

// ─── Core position calculator ─────────────────────────────────────────────────

function getTrainDynamicState(trainNo, dateInput, currentDayMinInput, simEnv) {
  const train = trainsData[String(trainNo)];
  if (!train) {
    return {
      trainNumber: trainNo, status: 'unavailable',
      statusText: 'TRAIN NOT FOUND', isScheduled: false,
      curKm: 0, totalKm: 1, progressPct: 0, finalDelayMin: 0,
      delayText: 'N/A', halts: []
    };
  }

  const now = new Date();
  const currentDayMin = (currentDayMinInput !== undefined && currentDayMinInput !== null)
    ? parseFloat(currentDayMinInput)
    : now.getHours() * 60 + now.getMinutes();

  const date = parseDateInput(dateInput);
  const isScheduled = isTrainScheduledOnDate(trainNo, date);
  const halts = train.halts;
  const depTime = train.depOffsetMin;
  const arrTime = depTime + train.durationMin;
  const totalKm = halts[halts.length - 1].km;

  if (!isScheduled) {
    return {
      trainNumber: train.number, trainName: train.name, type: train.type,
      corridorName: train.corridorName, runningDays: train.runningDays,
      runsText: 'Runs: ' + formatRunningDays(train.runningDays),
      originName: halts[0].name, originCode: halts[0].code,
      destName: halts[halts.length - 1].name, destCode: halts[halts.length - 1].code,
      status: 'not_scheduled', statusText: 'NOT SCHEDULED TODAY',
      isScheduled: false, curKm: 0, totalKm, progressPct: 0,
      finalDelayMin: 0, delayText: 'Not Operating Today',
      schedDestArr: minToHHMM(halts[halts.length - 1].arrM),
      predictedDestETA: minToHHMM(halts[halts.length - 1].arrM),
      halts: halts.map(h => ({
        code: h.code, name: h.name, km: h.km, platform: String(h.pf),
        scheduledArr: minToHHMM(h.arrM), predictedETA: minToHHMM(h.arrM),
        delayMin: 0, status: 'not_running'
      }))
    };
  }

  // ── Multi-day calendar offset ──
  const dTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dToday  = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dToday.getTime() - dTarget.getTime()) / 86400000);

  let absTime = currentDayMin;
  if (diffDays === 1) {
    absTime = 1440 + currentDayMin;
  } else if (diffDays === 2) {
    absTime = 2880 + currentDayMin;
  } else if (diffDays === 0 && arrTime > 1440) {
    // Check if yesterday's overnight train is still running
    const yesterday = new Date(dToday.getTime() - 86400000);
    const isYestScheduled = isTrainScheduledOnDate(trainNo, yesterday);
    const elapsedFromYest = 1440 + currentDayMin;
    if (isYestScheduled && elapsedFromYest < arrTime && currentDayMin < depTime) {
      absTime = elapsedFromYest;
    }
  } else if (diffDays > 2) {
    absTime = arrTime + 10; // already arrived
  } else if (diffDays < 0) {
    absTime = -10; // future journey
  }

  // ── Delay calculation ──
  const simEnvSafe = simEnv || { fog: 0, cong: 1.0, headway: 18, tsr: false };
  const delayMin = calculateDelay(trainNo, simEnvSafe);

  // ── Status checks ──
  if (absTime < depTime) {
    return {
      trainNumber: train.number, trainName: train.name, type: train.type,
      corridorName: train.corridorName, runningDays: train.runningDays,
      runsText: formatRunningDays(train.runningDays),
      originName: halts[0].name, originCode: halts[0].code,
      destName: halts[halts.length - 1].name, destCode: halts[halts.length - 1].code,
      status: 'not_departed', statusText: 'NOT YET DEPARTED',
      isScheduled: true, curKm: 0, totalKm, progressPct: 0,
      curSectionLabel: `At ${halts[0].name} (PF ${halts[0].pf}) · Dep: ${minToHHMM(depTime)} IST`,
      nextHalt: { name: halts[1] ? halts[1].name : halts[0].name, code: halts[1] ? halts[1].code : halts[0].code, platform: String(halts[1] ? halts[1].pf : halts[0].pf), scheduledArr: minToHHMM(halts[1] ? halts[1].arrM : halts[0].arrM), predictedETA: minToHHMM((halts[1] ? halts[1].arrM : halts[0].arrM) + delayMin), delayMin },
      finalDelayMin: delayMin,
      delayText: delayMin <= 2 ? 'On Time' : `Expected ${delayMin} min late`,
      schedDestArr: minToHHMM(halts[halts.length - 1].arrM),
      predictedDestETA: minToHHMM(halts[halts.length - 1].arrM + delayMin),
      halts: halts.map(h => ({
        code: h.code, name: h.name, km: h.km, platform: String(h.pf),
        scheduledArr: minToHHMM(h.arrM), predictedETA: minToHHMM(h.arrM + delayMin),
        delayMin, status: 'upcoming'
      }))
    };
  }

  if (absTime >= arrTime + delayMin) {
    return {
      trainNumber: train.number, trainName: train.name, type: train.type,
      corridorName: train.corridorName, runningDays: train.runningDays,
      runsText: formatRunningDays(train.runningDays),
      originName: halts[0].name, originCode: halts[0].code,
      destName: halts[halts.length - 1].name, destCode: halts[halts.length - 1].code,
      status: 'arrived', statusText: 'ARRIVED AT DESTINATION',
      isScheduled: true, curKm: totalKm, totalKm, progressPct: 100,
      curSectionLabel: `Arrived at ${halts[halts.length - 1].name}`,
      nextHalt: { name: halts[halts.length - 1].name, code: halts[halts.length - 1].code, platform: String(halts[halts.length - 1].pf), scheduledArr: minToHHMM(halts[halts.length - 1].arrM), predictedETA: minToHHMM(halts[halts.length - 1].arrM + delayMin), delayMin },
      finalDelayMin: delayMin,
      delayText: delayMin <= 2 ? 'On Time' : `Arrived ${delayMin} min late`,
      schedDestArr: minToHHMM(halts[halts.length - 1].arrM),
      predictedDestETA: minToHHMM(halts[halts.length - 1].arrM + delayMin),
      halts: halts.map(h => ({
        code: h.code, name: h.name, km: h.km, platform: String(h.pf),
        scheduledArr: minToHHMM(h.arrM), predictedETA: minToHHMM(h.arrM + delayMin),
        delayMin, status: 'passed'
      }))
    };
  }

  // ── POSITION FIX: use delay-adjusted time to find actual location on schedule ──
  // If train is 15 min delayed, look where it is on schedule 15 min ago.
  // Example: At 22:42 with 15 min delay → effectiveTime = 22:27 → BEFORE Gaya (sched 22:36) ✅
  const effectiveTime = Math.max(depTime, absTime - delayMin);

  // Find current segment
  let currentSeg = null;
  for (let i = 0; i < halts.length - 1; i++) {
    // At a scheduled halt stop
    if (effectiveTime >= halts[i].arrM && effectiveTime <= halts[i].depM) {
      currentSeg = { from: halts[i], to: halts[i + 1] || halts[i], index: i, atStation: true };
      break;
    }
    // Between two halts
    if (effectiveTime >= halts[i].depM && effectiveTime < halts[i + 1].arrM) {
      currentSeg = { from: halts[i], to: halts[i + 1], index: i, atStation: false };
      break;
    }
  }

  // Fallback: last segment
  if (!currentSeg) {
    currentSeg = { from: halts[halts.length - 2], to: halts[halts.length - 1], index: halts.length - 2, atStation: false };
  }

  const s1 = currentSeg.from;
  const s2 = currentSeg.to;

  // Interpolate km position within segment
  let curKm, progressPct;
  if (currentSeg.atStation) {
    curKm = s1.km;
  } else {
    const segDur = Math.max(1, s2.arrM - s1.depM);
    const elapsed = effectiveTime - s1.depM;
    const frac = Math.min(1, Math.max(0, elapsed / segDur));
    curKm = s1.km + frac * (s2.km - s1.km);
  }
  progressPct = Math.round((curKm / totalKm) * 100);

  // Next halt
  const nextHaltObj = currentSeg.atStation
    ? (halts[currentSeg.index + 1] || s2)
    : s2;

  // Build per-halt predictions with delay
  const haltsList = halts.map(h => {
    let status = 'upcoming';
    if (effectiveTime > h.depM) status = 'passed';
    else if (effectiveTime >= h.arrM && effectiveTime <= h.depM) status = 'at_station';
    return {
      code: h.code, name: h.name, km: Math.round(h.km), platform: String(h.pf),
      scheduledArr: minToHHMM(h.arrM),
      predictedETA: minToHHMM(h.arrM + delayMin),
      delayMin,
      status
    };
  });

  const delayText = delayMin <= 2 ? 'On Time' : `Delayed by ${delayMin} min`;

  return {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    corridorName: train.corridorName,
    runningDays: train.runningDays,
    runsText: formatRunningDays(train.runningDays),
    originName: halts[0].name, originCode: halts[0].code,
    destName: halts[halts.length - 1].name, destCode: halts[halts.length - 1].code,
    status: currentSeg.atStation ? 'at_station' : 'in_transit',
    statusText: currentSeg.atStation ? `AT ${s1.name.toUpperCase()}` : 'IN TRANSIT',
    isScheduled: true,
    curKm: Math.round(curKm),
    totalKm,
    progressPct,
    curSectionLabel: `${s1.name} → ${s2.name}`,
    nextHalt: {
      name: nextHaltObj.name,
      code: nextHaltObj.code,
      platform: String(nextHaltObj.pf),
      scheduledArr: minToHHMM(nextHaltObj.arrM),
      predictedETA: minToHHMM(nextHaltObj.arrM + delayMin),
      delayMin
    },
    finalDelayMin: delayMin,
    delayText,
    schedDestArr: minToHHMM(halts[halts.length - 1].arrM),
    predictedDestETA: minToHHMM(halts[halts.length - 1].arrM + delayMin),
    halts: haltsList
  };
}

// ─── Exported Service Functions ───────────────────────────────────────────────

function getAllTrains() {
  return Object.values(trainsData).map(t => ({
    number: t.number,
    name: t.name,
    type: t.type,
    corridorName: t.corridorName,
    origin: {
      code: t.halts[0].code, name: t.halts[0].name,
      schedDep: minToHHMM(t.depOffsetMin), platform: String(t.halts[0].pf)
    },
    destination: {
      code: t.halts[t.halts.length - 1].code, name: t.halts[t.halts.length - 1].name,
      schedArr: minToHHMM(t.halts[t.halts.length - 1].arrM),
      platform: String(t.halts[t.halts.length - 1].pf)
    },
    totalDistanceKm: t.halts[t.halts.length - 1].km,
    totalDurationMin: t.durationMin,
    runningDays: t.runningDays,
    runsText: formatRunningDays(t.runningDays),
    totalStations: t.halts.length,
    avgDelayMin: (delaysData[t.number] || {}).avgDelayMin || 10
  }));
}

function getTrainByNumber(trainNo) {
  const t = trainsData[String(trainNo)];
  if (!t) return null;
  return {
    ...t,
    runsText: formatRunningDays(t.runningDays),
    avgDelayMin: (delaysData[String(trainNo)] || {}).avgDelayMin || 10
  };
}

function getTrainSchedule(trainNo, dateInput) {
  const t = trainsData[String(trainNo)];
  if (!t) return null;
  const isScheduled = isTrainScheduledOnDate(trainNo, dateInput);
  const delayMin = (delaysData[String(trainNo)] || {}).avgDelayMin || 10;
  return {
    trainNumber: t.number, trainName: t.name, type: t.type,
    isScheduled,
    runningDays: t.runningDays, runsText: formatRunningDays(t.runningDays),
    origin: { code: t.halts[0].code, name: t.halts[0].name, schedDep: minToHHMM(t.depOffsetMin) },
    destination: { code: t.halts[t.halts.length - 1].code, name: t.halts[t.halts.length - 1].name, schedArr: minToHHMM(t.halts[t.halts.length - 1].arrM) },
    avgDelayMin: delayMin,
    halts: t.halts.map(h => ({
      code: h.code, name: h.name, km: h.km, platform: String(h.pf),
      scheduledArr: minToHHMM(h.arrM), scheduledDep: minToHHMM(h.depM),
      predictedETA: isScheduled ? minToHHMM(h.arrM + delayMin) : minToHHMM(h.arrM)
    }))
  };
}

function getTrainStations(trainNo) {
  const t = trainsData[String(trainNo)];
  if (!t) return null;
  return {
    trainNumber: t.number, trainName: t.name,
    origin: t.halts[0].code, destination: t.halts[t.halts.length - 1].code,
    totalStations: t.halts.length,
    stations: t.halts.map(h => ({
      code: h.code, name: h.name, km: h.km,
      platform: String(h.pf), scheduledArr: minToHHMM(h.arrM)
    }))
  };
}

module.exports = {
  getAllTrains,
  getTrainByNumber,
  isTrainScheduledOnDate,
  getTrainSchedule,
  getTrainStations,
  getTrainDynamicState
};
