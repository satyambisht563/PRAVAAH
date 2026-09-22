/**
 * trainService.js
 * PRAVAAH Backend Service for Train Master Data, Running Days, Halts, and Spatial Dynamic State
 */

const path = require('path');
const trainsData = require('../data/trains.json');

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAYS_FULL_NAMES = {
  "SUN": "Sunday",
  "MON": "Monday",
  "TUE": "Tuesday",
  "WED": "Wednesday",
  "THU": "Thursday",
  "FRI": "Friday",
  "SAT": "Saturday"
};

function minToHHMM(m) {
  if (m === null || m === undefined || isNaN(m)) return "--:--";
  const norm = ((Math.round(m) % 1440) + 1440) % 1440;
  const hh = Math.floor(norm / 60);
  const mm = norm % 60;
  return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
}

function parseDateInput(dateInput) {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date && !isNaN(dateInput.getTime())) return dateInput;
  if (typeof dateInput === 'string') {
    const parts = dateInput.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

function formatRunningDays(daysList) {
  if (!daysList || !Array.isArray(daysList) || daysList.length === 0) return "Not Scheduled";
  if (daysList.length === 7) return "Mon, Tue, Wed, Thu, Fri, Sat, Sun (Daily)";
  const mapAbbr = { "MON": "Mon", "TUE": "Tue", "WED": "Wed", "THU": "Thu", "FRI": "Fri", "SAT": "Sat", "SUN": "Sun" };
  return daysList.map(d => mapAbbr[d] || d).join(", ");
}

function getAllTrains() {
  return Object.values(trainsData).map(t => ({
    number: t.number,
    name: t.name,
    type: t.type,
    corridorName: t.corridorName,
    origin: t.halts[0] ? { code: t.halts[0].code, name: t.halts[0].name, schedDep: minToHHMM(t.depOffsetMin), platform: t.halts[0].pf } : null,
    destination: t.halts[t.halts.length - 1] ? { code: t.halts[t.halts.length - 1].code, name: t.halts[t.halts.length - 1].name, schedArr: minToHHMM(t.halts[t.halts.length - 1].arrM), platform: t.halts[t.halts.length - 1].pf } : null,
    totalDistanceKm: t.halts[t.halts.length - 1] ? t.halts[t.halts.length - 1].km : 0,
    totalDurationMin: t.durationMin,
    runningDays: t.runningDays,
    runsText: formatRunningDays(t.runningDays),
    totalStations: t.halts.length
  }));
}

function getTrainByNumber(trainNo) {
  const t = trainsData[trainNo];
  if (!t) return null;
  return {
    ...t,
    runsText: formatRunningDays(t.runningDays)
  };
}

function isTrainScheduledOnDate(trainNo, dateInput) {
  const train = trainsData[trainNo];
  if (!train) return false;
  if (!train.runningDays || !Array.isArray(train.runningDays) || train.runningDays.length === 0) return false;
  const d = parseDateInput(dateInput);
  if (isNaN(d.getTime())) return false;
  const dayCode = DAYS_OF_WEEK[d.getDay()];
  return train.runningDays.includes(dayCode);
}

function getTrainSchedule(trainNo, dateInput) {
  const train = trainsData[trainNo];
  if (!train) return null;
  const d = parseDateInput(dateInput);
  const dayCode = DAYS_OF_WEEK[d.getDay()];
  const isScheduled = train.runningDays.includes(dayCode);
  return {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    queryDate: d.toISOString().split('T')[0],
    queryDay: DAYS_FULL_NAMES[dayCode] + ' (' + dayCode + ')',
    isScheduled: isScheduled,
    statusText: isScheduled ? 'SCHEDULED TO RUN' : 'NOT SCHEDULED TODAY',
    runningDays: train.runningDays,
    runsText: formatRunningDays(train.runningDays),
    depOffsetMin: train.depOffsetMin,
    schedDepartureTime: minToHHMM(train.depOffsetMin),
    durationMin: train.durationMin,
    haltsCount: train.halts.length
  };
}

function getTrainStations(trainNo) {
  const train = trainsData[trainNo];
  if (!train) return null;
  return {
    trainNumber: train.number,
    trainName: train.name,
    totalDistanceKm: train.halts[train.halts.length - 1].km,
    stations: train.halts.map(h => ({
      code: h.code,
      name: h.name,
      km: h.km,
      arrTime: minToHHMM(h.arrM),
      depTime: minToHHMM(h.depM),
      platform: h.pf,
      type: h.type || 'major'
    }))
  };
}

function getTrainDynamicState(trainNo, dateInput, currentDayMinInput, simEnvInput) {
  const train = trainsData[trainNo];
  if (!train || !train.halts || train.halts.length === 0) {
    return {
      trainNumber: trainNo,
      trainName: train ? train.name : ("Train " + trainNo),
      status: "unavailable",
      statusText: "SCHEDULE DATA UNAVAILABLE",
      isScheduled: false,
      curKm: 0,
      totalKm: 1,
      progressPct: 0,
      curSpeed: 0,
      curSectionLabel: "Schedule Data Unavailable",
      nextHalt: { name: "Unavailable", code: "—", pf: "—" },
      destETA: "Schedule Data Unavailable",
      finalDelay: 0,
      factors: { congestion: 0, weather: 0, tsr: 0, headway: 0, recovery: 0 },
      halts: []
    };
  }

  const date = parseDateInput(dateInput);
  const now = new Date();
  const currentDayMin = (currentDayMinInput !== undefined && currentDayMinInput !== null)
    ? parseFloat(currentDayMinInput)
    : (now.getHours() * 60 + now.getMinutes());

  const simEnv = simEnvInput || { fog: 0, cong: 1.0, headway: 18, tsr: false };

  const halts = train.halts;
  const totalKm = halts[halts.length - 1].km || 1;
  const depTime = train.depOffsetMin;
  const duration = train.durationMin;
  const arrTime = depTime + duration;

  // 1. Check if scheduled on selected date
  const isScheduledToday = isTrainScheduledOnDate(trainNo, date);
  if (!isScheduledToday) {
    const parsedHalts = halts.map(h => ({
      code: h.code,
      name: h.name,
      km: Math.round(h.km),
      sched: minToHHMM(h.arrM),
      predTime: minToHHMM(h.arrM),
      delayMin: 0,
      platform: h.pf,
      type: h.type || "major",
      status: "not_running"
    }));

    return {
      trainNumber: train.number,
      trainName: train.name,
      type: train.type,
      corridorName: train.corridorName,
      runningDays: train.runningDays || [],
      originName: halts[0].name,
      originCode: halts[0].code,
      destName: halts[halts.length - 1].name,
      destCode: halts[halts.length - 1].code,
      status: "not_scheduled",
      statusText: "NOT SCHEDULED TODAY",
      runsText: "Runs: " + formatRunningDays(train.runningDays),
      isScheduled: false,
      curKm: 0,
      totalKm: totalKm,
      progressPct: 0,
      curSpeed: 0,
      curSectionLabel: "Not Scheduled Today · " + formatRunningDays(train.runningDays),
      nextHalt: halts[0],
      destETA: "Not Operating Today",
      finalDelay: 0,
      factors: { congestion: 0, weather: 0, tsr: 0, headway: 0, recovery: 0 },
      halts: parsedHalts
    };
  }

  // 2. Multi-day Calendar Offset (NTES Alignment)
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

    if (arrTime > 1440 && isYesterdayScheduled && elapsedFromYesterday < arrTime && currentDayMin < depTime) {
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

  const hour = (currentDayMin / 60) % 24;
  let diurnalCong = 1.0;
  if (hour >= 8 && hour <= 10.5) diurnalCong = 1.65;
  else if (hour >= 17 && hour <= 20.5) diurnalCong = 1.55;
  else if (hour >= 23 || hour <= 4) diurnalCong = 0.85;

  let operationalDelay = 0;
  if (absTime > depTime + 700) {
    operationalDelay = Math.min(26, Math.round((absTime - depTime - 700) * 0.035));
  }
  const effectiveProgressTime = Math.max(depTime, absTime - operationalDelay);

  let currentSeg = null, isCompleted = false, isNotStarted = false;
  if (absTime < depTime) {
    isNotStarted = true;
  } else if (absTime >= arrTime) {
    isCompleted = true;
  } else {
    for (let i = 0; i < halts.length - 1; i++) {
      if (effectiveProgressTime >= halts[i].depM && effectiveProgressTime < halts[i + 1].arrM) {
        currentSeg = { from: halts[i], to: halts[i + 1], index: i };
        break;
      }
    }
  }

  let curKm = 0, curSpeed = 0, curSectionLabel = "";
  let nextHalt = halts[halts.length - 1];

  if (isNotStarted) {
    curKm = 0;
    curSpeed = 0;
    curSectionLabel = "At " + halts[0].name + " (PF " + halts[0].pf + ") · Sched Dep: " + minToHHMM(depTime) + " IST";
    nextHalt = halts[1] || halts[0];
  } else if (isCompleted) {
    curKm = totalKm;
    curSpeed = 0;
    curSectionLabel = "Safely Arrived at " + halts[halts.length - 1].name;
    nextHalt = halts[halts.length - 1];
  } else if (currentSeg) {
    const s1 = currentSeg.from, s2 = currentSeg.to;
    const segDur = Math.max(1, s2.arrM - s1.depM);
    const elapsed = effectiveProgressTime - s1.depM;
    const frac = Math.min(1, Math.max(0, elapsed / segDur));
    curKm = s1.km + frac * (s2.km - s1.km);
    curSpeed = Math.round(112 + Math.sin(elapsed * 0.4) * 16);
    curSectionLabel = s1.name + " → " + s2.name + " · km " + Math.round(curKm);
    nextHalt = s2;
  } else {
    const hm = halts.find(h => effectiveProgressTime >= h.arrM && effectiveProgressTime <= h.depM);
    if (hm) {
      curKm = hm.km;
      curSpeed = 0;
      curSectionLabel = "Station Halt: " + hm.name + " (PF " + hm.pf + ")";
      const idx = halts.indexOf(hm);
      nextHalt = halts[Math.min(halts.length - 1, idx + 1)];
    }
  }

  const effCong = diurnalCong * (simEnv.cong || 1.0);
  const wPen = ((simEnv.fog || 0) / 30.0) * 4.2;
  const tsrPen = simEnv.tsr ? 8.5 : 0;
  const headwayPen = Math.max(0, (22 - (simEnv.headway || 18)) * 0.45);
  const factorAcc = { congestion: 0, weather: 0, tsr: 0, headway: 0, recovery: 0 };
  let runningDelay = operationalDelay;

  const parsedHalts = halts.map((h, i) => {
    const schedArrMin = h.arrM;
    const isPassed = !isNotStarted && (absTime >= h.depM);
    
    let isCurrent = false;
    if (isNotStarted) {
      isCurrent = (i === 0);
    } else if (currentSeg) {
      isCurrent = (h.code === currentSeg.to.code);
    } else {
      isCurrent = (absTime >= h.arrM && absTime <= h.depM);
    }

    if (isPassed) {
      return {
        code: h.code, name: h.name, km: Math.round(h.km),
        sched: minToHHMM(schedArrMin), predTime: minToHHMM(schedArrMin),
        delayMin: 0, platform: h.pf, type: h.type || "major", status: "passed"
      };
    }

    const segDist = (i > 0) ? Math.max(10, h.km - halts[i - 1].km) : 35;
    const tCong = (segDist / 85) * (1.5 + 2.4 * effCong);
    const tWeath = wPen, tTsr = tsrPen, tHeadway = headwayPen;
    const added = Math.max(0, tCong * 0.40 + tWeath * 0.30 + tTsr * 0.35 + tHeadway * 0.20);
    const recovSlack = (segDist > 140) ? 4.0 : 1.2;
    const netAdded = Math.max(0, added - recovSlack * 0.42);

    runningDelay += netAdded;
    factorAcc.congestion += tCong * 0.40;
    factorAcc.weather += tWeath * 0.30;
    factorAcc.tsr += tTsr * 0.35;
    factorAcc.headway += tHeadway * 0.20;
    factorAcc.recovery += recovSlack * 0.42;

    const predM = (schedArrMin + runningDelay) % 1440;
    return {
      code: h.code, name: h.name, km: Math.round(h.km),
      sched: minToHHMM(schedArrMin), predTime: minToHHMM(predM),
      delayMin: Math.round(runningDelay), platform: h.pf,
      type: h.type || "major", status: isCurrent ? "current" : "upcoming"
    };
  });

  const finalDelay = Math.round(runningDelay);
  const dest = parsedHalts[parsedHalts.length - 1];

  const statusKey = isCompleted ? "completed" : isNotStarted ? "scheduled" : "running";
  const statusLabel = isCompleted ? "RUN COMPLETED" : (isOvernightRunActive ? "RUNNING LIVE (Day 2 En Route)" : (isNotStarted ? "SCHEDULED TODAY" : "RUNNING LIVE"));

  return {
    trainNumber: train.number,
    trainName: train.name,
    type: train.type,
    corridorName: train.corridorName,
    runningDays: train.runningDays || [],
    originName: halts[0].name,
    originCode: halts[0].code,
    destName: dest.name,
    destCode: dest.code,
    status: statusKey,
    statusText: statusLabel,
    isOvernightActive: isOvernightRunActive,
    runsText: "Runs: " + formatRunningDays(train.runningDays),
    isScheduled: true,
    curKm: Math.round(curKm),
    totalKm: totalKm,
    progressPct: Math.round((curKm / totalKm) * 100),
    curSpeed: curSpeed,
    curSectionLabel: curSectionLabel,
    nextHalt: nextHalt,
    destETA: dest.predTime + " IST",
    finalDelay: finalDelay,
    factors: factorAcc,
    halts: parsedHalts
  };
}

module.exports = {
  getAllTrains,
  getTrainByNumber,
  isTrainScheduledOnDate,
  getTrainSchedule,
  getTrainStations,
  getTrainDynamicState,
  minToHHMM
};
