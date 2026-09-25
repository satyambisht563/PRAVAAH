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
  const info = delaysData[String(trainNo)] || { avgDelayMin: 0 };
  let delay = info.avgDelayMin || 0;

  if (delay > 0) {
    if (simEnv && simEnv.fog > 0.5) delay += 6;
    else if (simEnv && simEnv.rain) delay += 4;
    if (simEnv && simEnv.tsr) delay += 5;
  }
  return Math.round(delay);
}

// ─── Core position calculator ─────────────────────────────────────────────────

function getTrainDynamicState(trainNo, dateInput, currentDayMinInput, simEnv) {
  const train = trainsData[String(trainNo)];
  if (!train) return { status: 'unavailable', trainNumber: trainNo };

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
    return buildNotScheduledResponse(train, halts, totalKm);
  }

  // Multi-day calendar offset
  const dTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dToday.getTime() - dTarget.getTime()) / 86400000);

  let absTime = currentDayMin;
  let isOvernightRunActive = false;

  if (diffDays === 1) {
    absTime = 1440 + currentDayMin;
    isOvernightRunActive = true;
  } else if (diffDays === 2) {
    absTime = 2880 + currentDayMin;
    isOvernightRunActive = true;
  } else if (diffDays === 0) {
    const yesterday = new Date(dToday.getTime() - 86400000);
    const isYesterdayScheduled = isTrainScheduledOnDate(trainNo, yesterday);
    const elapsedFromYesterday = 1440 + currentDayMin;

    if (arrTime > 1440 && isYesterdayScheduled && elapsedFromYesterday < (arrTime + 60) && currentDayMin < depTime) {
      absTime = elapsedFromYesterday;
      isOvernightRunActive = true;
    } else {
      absTime = currentDayMin;
    }
  } else if (diffDays > 2) {
    absTime = arrTime + 10;
  } else if (diffDays < 0) {
    absTime = -10;
  }

  const isNotStarted = (absTime < depTime);
  const delayInfo = delaysData[String(trainNo)] || { avgDelayMin: 0 };
  let finalDelay = isNotStarted ? 0 : (delayInfo.avgDelayMin || 0);

  if (!isNotStarted && finalDelay > 0 && simEnv) {
    if (simEnv.fog > 0.5) finalDelay += 6;
    if (simEnv.tsr) finalDelay += 5;
  }

  // When delayed, the physical progress corresponds to (absTime - delayAtCurrentPosition)
  // Progressive delay: increases as distance increases
  let effectiveTime = absTime;
  if (!isNotStarted && finalDelay > 0) {
    const approxRatio = Math.min(1, Math.max(0, (absTime - depTime) / train.durationMin));
    const currentDelayMin = Math.round(finalDelay * approxRatio);
    effectiveTime = Math.max(depTime, absTime - currentDelayMin);
  }

  if (absTime < depTime) {
    return buildNotDepartedResponse(train, halts, totalKm, depTime, finalDelay);
  }
  if (absTime >= arrTime + finalDelay) {
    return buildArrivedResponse(train, halts, totalKm, finalDelay, delayInfo.actualArrTime);
  }

  // Find current segment
  let currentSeg = null;
  for (let i = 0; i < halts.length - 1; i++) {
    if (effectiveTime >= halts[i].arrM && effectiveTime <= halts[i].depM) {
      currentSeg = { from: halts[i], to: halts[i + 1] || halts[i], index: i, atStation: true };
      break;
    }
    if (effectiveTime >= halts[i].depM && effectiveTime < halts[i + 1].arrM) {
      currentSeg = { from: halts[i], to: halts[i + 1], index: i, atStation: false };
      break;
    }
  }

  if (!currentSeg) {
    currentSeg = { from: halts[halts.length - 2], to: halts[halts.length - 1], index: halts.length - 2, atStation: false };
  }

  const s1 = currentSeg.from;
  const s2 = currentSeg.to;

  let curKm;
  if (currentSeg.atStation) {
    curKm = s1.km;
  } else {
    const segDur = Math.max(1, s2.arrM - s1.depM);
    const elapsed = effectiveTime - s1.depM;
    const frac = Math.min(1, Math.max(0, elapsed / segDur));
    curKm = s1.km + frac * (s2.km - s1.km);
  }
  const progressPct = Math.round((curKm / totalKm) * 100);

  const nextHaltObj = currentSeg.atStation ? (halts[currentSeg.index + 1] || s2) : s2;

  // Build per-halt predictions with progressive delay
  const haltsList = halts.map((h, i) => {
    const isOrigin = (i === 0);
    const schedM = isOrigin ? h.depM : h.arrM;
    const isPassed = (effectiveTime > h.depM);
    const isCurrent = currentSeg.atStation ? (h.code === s1.code) : (h.code === s2.code);

    let haltDelay = 0;
    if (!isOrigin && finalDelay > 0) {
      haltDelay = Math.round(finalDelay * Math.min(1, h.km / totalKm));
    }
    const predETA = isPassed ? schedM : (schedM + haltDelay);

    let status = 'upcoming';
    if (isPassed) status = 'passed';
    else if (isCurrent) status = 'current';

    return {
      code: h.code,
      name: h.name,
      km: Math.round(h.km),
      platform: String(h.pf),
      scheduledArr: minToHHMM(schedM),
      predictedETA: minToHHMM(predETA),
      delayMin: haltDelay,
      status
    };
  });

  const curHaltDelay = Math.round(finalDelay * (curKm / totalKm));
  const delayText = curHaltDelay <= 2 ? 'On Time' : `Delayed by ${curHaltDelay} min`;

  return {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    corridorName: train.corridorName,
    runningDays: train.runningDays,
    runsText: formatRunningDays(train.runningDays),
    originName: halts[0].name,
    originCode: halts[0].code,
    destName: halts[halts.length - 1].name,
    destCode: halts[halts.length - 1].code,
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
      predictedETA: minToHHMM(nextHaltObj.arrM + Math.round(finalDelay * (nextHaltObj.km / totalKm))),
      delayMin: Math.round(finalDelay * (nextHaltObj.km / totalKm))
    },
    finalDelayMin: finalDelay,
    delayText,
    schedDestArr: minToHHMM(halts[halts.length - 1].arrM),
    predictedDestETA: minToHHMM(halts[halts.length - 1].arrM + finalDelay),
    halts: haltsList
  };
}

function buildNotScheduledResponse(train, halts, totalKm) {
  const originHalt = halts[0];
  const destHalt = halts[halts.length - 1];
  return {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    corridorName: train.corridorName,
    runningDays: train.runningDays,
    runsText: formatRunningDays(train.runningDays),
    originName: originHalt.name,
    originCode: originHalt.code,
    destName: destHalt.name,
    destCode: destHalt.code,
    status: 'not_scheduled',
    statusText: 'NOT SCHEDULED TODAY',
    isScheduled: false,
    curKm: 0,
    totalKm,
    progressPct: 0,
    finalDelayMin: 0,
    delayText: 'Not Operating Today',
    curSectionLabel: 'Train does not run today',
    nextHalt: {
      name: originHalt.name,
      code: originHalt.code,
      platform: String(originHalt.pf),
      scheduledArr: minToHHMM(originHalt.depM),
      predictedETA: minToHHMM(originHalt.depM),
      delayMin: 0
    },
    schedDestArr: minToHHMM(destHalt.arrM),
    predictedDestETA: minToHHMM(destHalt.arrM),
    halts: halts.map((h, i) => ({
      code: h.code,
      name: h.name,
      km: Math.round(h.km),
      platform: String(h.pf),
      scheduledArr: minToHHMM(i === 0 ? h.depM : h.arrM),
      predictedETA: minToHHMM(i === 0 ? h.depM : h.arrM),
      delayMin: 0,
      status: 'not_running'
    }))
  };
}

function buildNotDepartedResponse(train, halts, totalKm, depTime, delayMin) {
  const originHalt = halts[0];
  const destHalt = halts[halts.length - 1];
  const delayText = delayMin <= 2 ? 'On Time' : `Expected ${delayMin} min late`;
  const nextHaltObj = halts[1] || originHalt;
  const nextDelay = halts[1] ? Math.round(delayMin * (halts[1].km / totalKm)) : 0;

  return {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    corridorName: train.corridorName,
    runningDays: train.runningDays,
    runsText: formatRunningDays(train.runningDays),
    originName: originHalt.name,
    originCode: originHalt.code,
    destName: destHalt.name,
    destCode: destHalt.code,
    status: 'not_departed',
    statusText: 'NOT YET DEPARTED',
    isScheduled: true,
    curKm: 0,
    totalKm,
    progressPct: 0,
    curSectionLabel: `At ${originHalt.name} (PF ${originHalt.pf}) · Dep: ${minToHHMM(depTime)}`,
    finalDelayMin: delayMin,
    delayText,
    schedDestArr: minToHHMM(destHalt.arrM),
    predictedDestETA: minToHHMM(destHalt.arrM + delayMin),
    nextHalt: {
      name: nextHaltObj.name,
      code: nextHaltObj.code,
      platform: String(nextHaltObj.pf),
      scheduledArr: minToHHMM(halts[1] ? nextHaltObj.arrM : depTime),
      predictedETA: minToHHMM((halts[1] ? nextHaltObj.arrM : depTime) + nextDelay),
      delayMin: nextDelay
    },
    halts: halts.map((h, i) => {
      const isOrigin = (i === 0);
      const schedM = isOrigin ? h.depM : h.arrM;
      const hDelay = isOrigin ? 0 : Math.round(delayMin * (h.km / totalKm));
      return {
        code: h.code,
        name: h.name,
        km: Math.round(h.km),
        platform: String(h.pf),
        scheduledArr: minToHHMM(schedM),
        predictedETA: minToHHMM(schedM + hDelay),
        delayMin: hDelay,
        status: isOrigin ? 'at_station' : 'upcoming'
      };
    })
  };
}

function buildArrivedResponse(train, halts, totalKm, delayMin, actualArrTime) {
  const schedDestArr = minToHHMM(halts[halts.length - 1].arrM);
  const actualArrival = actualArrTime || minToHHMM(halts[halts.length - 1].arrM + delayMin);
  const delayText = delayMin <= 2 ? 'On Time' : `Arrived ${delayMin} min late (${actualArrival} IST)`;

  return {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    status: 'arrived',
    statusText: 'ARRIVED AT DESTINATION',
    isScheduled: true,
    curKm: totalKm,
    totalKm,
    progressPct: 100,
    finalDelayMin: delayMin,
    delayText,
    curSectionLabel: `Arrived at ${halts[halts.length - 1].name} (${actualArrival} IST)`,
    schedDestArr,
    predictedDestETA: actualArrival,
    nextHalt: {
      name: halts[halts.length - 1].name,
      code: halts[halts.length - 1].code,
      platform: String(halts[halts.length - 1].pf),
      scheduledArr: schedDestArr,
      predictedETA: actualArrival,
      delayMin
    },
    halts: halts.map((h, i) => {
      const isOrigin = (i === 0);
      const isDest = (i === halts.length - 1);
      const schedM = isOrigin ? h.depM : h.arrM;
      const hDelay = isOrigin ? 0 : Math.round(delayMin * (h.km / totalKm));
      return {
        code: h.code,
        name: h.name,
        km: Math.round(h.km),
        platform: String(h.pf),
        scheduledArr: minToHHMM(schedM),
        predictedETA: isDest ? actualArrival : minToHHMM(schedM + hDelay),
        delayMin: hDelay,
        status: 'passed'
      };
    })
  };
}

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
