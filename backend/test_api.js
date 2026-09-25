const http = require('http');
const app = require('./server/server');

const PORT = 5555;
let server;

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('  RUNNING PRAVAAH BACKEND API VERIFICATION SUITE');
  console.log('====================================================\n');

  server = app.listen(PORT);

  try {
    // 1. Health
    const resHealth = await request('GET', '/health');
    console.log('[1] GET /health ->', resHealth.status, resHealth.body.status);
    if (resHealth.status !== 200 || resHealth.body.status !== 'UP') throw new Error('Health check failed');

    // 2. Trains list
    const resTrains = await request('GET', '/api/trains');
    console.log('[2] GET /api/trains ->', resTrains.status, `count: ${resTrains.body.count}`);
    if (resTrains.body.count < 12) throw new Error('Expected at least 12 trains');

    // 3. Schedule evaluation (Sunday vs Monday for 12301)
    const resSchedSun = await request('GET', '/api/trains/12301/schedule?date=2026-09-27');
    console.log('[3a] 12301 Sunday -> isScheduled:', resSchedSun.body.schedule.isScheduled, `(${resSchedSun.body.schedule.statusText})`);
    if (resSchedSun.body.schedule.isScheduled !== false) throw new Error('12301 should NOT be scheduled on Sunday');

    const resSchedMon = await request('GET', '/api/trains/12301/schedule?date=2026-09-21');
    console.log('[3b] 12301 Monday -> isScheduled:', resSchedMon.body.schedule.isScheduled, `(${resSchedMon.body.schedule.statusText})`);
    if (resSchedMon.body.schedule.isScheduled !== true) throw new Error('12301 should be scheduled on Monday');

    // 4. Stations sequence and platforms
    const resStns = await request('GET', '/api/trains/12424/stations');
    console.log('[4] 12424 stations -> count:', resStns.body.stations.length, 'Origin PF:', resStns.body.stations[0].platform, 'Dest PF:', resStns.body.stations[resStns.body.stations.length - 1].platform);
    if (resStns.body.stations.length < 15) throw new Error('12424 should have at least 15 halts, got: ' + resStns.body.stations.length);

    // 5. Dynamic state for multi-day train 12424 (Yesterday at 16:30 IST - dynamic date)
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    const yestStr = yest.toISOString().split('T')[0];
    const resStatusYest = await request('GET', `/api/trains/12424/status?date=${yestStr}&timeMin=990`);
    const dynState = resStatusYest.body.dynamicState;
    console.log('[5] 12424 Yesterday at 16:30 IST ->', dynState.status, '| Section:', dynState.curSectionLabel, '| Delay:', dynState.delayText);
    if (!dynState || !dynState.status) throw new Error('12424 dynamic state missing status field');

    // 6. Station directory
    const resDdu = await request('GET', '/api/stations/DDU');
    console.log('[6] GET /api/stations/DDU ->', resDdu.body.station.name, `(${resDdu.body.station.division})`);
    if (resDdu.body.station.code !== 'DDU') throw new Error('DDU station lookup failed');

    // 7. Weather distinctness
    const resW_HWH = await request('GET', '/api/weather/HWH');
    const resW_GAYA = await request('GET', '/api/weather/GAYA');
    const hwhW = resW_HWH.body.weather || resW_HWH.body;
    const gayaW = resW_GAYA.body.weather || resW_GAYA.body;
    console.log('[7] Weather HWH:', (hwhW.tempC || hwhW.temp || '?') + 'C', (hwhW.condLabel || hwhW.condition || ''), '| GAYA:', (gayaW.tempC || gayaW.temp || '?') + 'C', (gayaW.condLabel || gayaW.condition || ''));
    if (resW_HWH.status !== 200 || resW_GAYA.status !== 200) throw new Error('Weather API returned non-200 status');

    // 8. Complaints & Inspection Scope
    const resCompScope = await request('POST', '/api/complaints/inspection-scope', {
      passengerClass: '3A',
      coach: 'B4',
      category: 'AC / Fan',
      severity: 'high'
    });
    console.log('[8a] Inspection Scope (AC High Severity):', resCompScope.body.inspectionScope.scopeType, 'Coaches:', resCompScope.body.inspectionScope.coachesToInspect);
    if (resCompScope.body.inspectionScope.scopeType !== 'MULTI_COACH') throw new Error('AC High should be MULTI_COACH');

    const resCreateComp = await request('POST', '/api/complaints', {
      train: '12301',
      passengerClass: '3A',
      coach: 'B4',
      category: 'Cleanliness',
      severity: 'high',
      description: 'Test washroom flush issue'
    });
    console.log('[8b] Created Complaint:', resCreateComp.body.complaint.id, 'Assigned Staff:', resCreateComp.body.complaint.assignedStaff.name);
    if (!resCreateComp.body.complaint.id) throw new Error('Complaint creation failed');

    console.log('\n====================================================');
    console.log('  ✅ ALL BACKEND API TESTS PASSED SUCCESSFULLY!');
    console.log('====================================================');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTests();
