const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PREVIEW_DIR = 'C:\\Users\\user\\AppData\\Local\\Temp\\GDTMP--1\\preview';
const PORT = 9876;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.wasm': 'application/wasm',
  '.css': 'text/css'
};

const PROJECT_ASSETS_DIR = 'C:\\Users\\user\\Desktop\\Folder\\GDEV_POWATER\\assets';

const server = http.createServer((req, res) => {
  let reqPath = decodeURIComponent(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  if (reqPath === '/manifest.webmanifest') {
    res.writeHead(200, { 'Content-Type': 'application/manifest+json' });
    res.end(JSON.stringify({ name: 'POWATER CORP.', short_name: 'POWATER', start_url: '.' }));
    return;
  }
  if (reqPath === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }

  let filePath = path.join(PREVIEW_DIR, reqPath);
  if (!fs.existsSync(filePath) && reqPath.startsWith('/assets/')) {
    filePath = path.join(PROJECT_ASSETS_DIR, reqPath.replace('/assets/', ''));
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PROJECT_ASSETS_DIR, path.basename(reqPath));
  }
  if (!fs.existsSync(filePath)) {
    filePath = path.join(PREVIEW_DIR, path.basename(reqPath));
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + reqPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

async function runTest() {
  await new Promise(resolve => server.listen(PORT, resolve));
  console.log('Static server listening on port', PORT);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to GDevelop preview...');
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2500));

  // Close initial briefing modal
  await page.evaluate(() => {
    if (window.POWATER && window.POWATER.uiManager) {
      window.POWATER.uiManager.closeModal();
    }
  });

  // 1. Test Complete Wiring of House 1 (Power + Water + Sewage) & Instant +$50 Completion Bonus
  const wiringResult = await page.evaluate(() => {
    const game = window.POWATER.game;
    const moneyBefore = game.money;
    const h = game.houses[0];
    const gen = game.buildings.find(b => b.config.type === 'generator');
    const pump = game.buildings.find(b => b.config.type === 'water_pump');
    const filter = game.buildings.find(b => b.config.type === 'waste_filter');

    game.connectNodes('power', gen, h);
    game.connectNodes('water', pump, h);
    game.connectNodes('sewage', filter, h);
    game.update(0.1);

    return {
      hasPower: h.hasPower,
      hasWater: h.hasWater,
      hasDrainage: h.hasDrainage,
      completedBonusPaid: h.completedBonusPaid,
      moneyDelta: Math.round(game.money - moneyBefore)
    };
  });
  console.log('1. House Completion & +$50 Bonus Test:', wiringResult);
  if (!wiringResult.completedBonusPaid || wiringResult.moneyDelta < 50) {
    throw new Error('House completion +$50 bonus failed!');
  }

  // 2. Test Repair Mechanic & Win Timer Pause
  const repairResult = await page.evaluate(() => {
    const game = window.POWATER.game;
    const pump = game.buildings.find(b => b.config.type === 'water_pump');
    pump.breakDown();
    game.update(0.1);
    const brokenState = {
      isBroken: pump.isBroken,
      winTimerState: game.winTimerState
    };
    game.repairBuilding(pump);
    game.update(0.1);
    return {
      brokenState,
      isBrokenAfterRepair: pump.isBroken
    };
  });
  console.log('2. Repair System & Win Timer Pause Test:', repairResult);
  if (!repairResult.brokenState.isBroken || repairResult.brokenState.winTimerState !== 'PAUSED' || repairResult.isBrokenAfterRepair) {
    throw new Error('Repair system or Win Timer Pause check failed!');
  }

  // 3. Test Map Upsize (x+10 houses up to 40 cap)
  const upsizeResult = await page.evaluate(() => {
    const game = window.POWATER.game;
    for (let i = 0; i < 12; i++) {
      game.spawnHouse();
    }
    return {
      houseCount: game.houses.length,
      upsizeTier: game.upsizeTier
    };
  });
  console.log('3. Map Upsize Test:', upsizeResult);
  if (upsizeResult.upsizeTier < 1) {
    throw new Error('Map Upsize did not trigger after exceeding 10 houses!');
  }

  // 4. Disaster Test Lab costs money; Rome blackout cuts all power; Amsterdam 1-complaint rule
  const levelsCheck = await page.evaluate(() => {
    const game = window.POWATER.game;
    const cfg = window.POWATER.CONFIG;

    // Tokyo (index 1): paid quake test
    game.startLevel(1);
    game.money = cfg.DISASTER_TEST_COST;
    const quakeOk = game.testDisaster('quake');
    const moneyAfterTest = game.money;
    const tokyoBrokenAfterQuake = game.buildings.filter(b => b.isBroken).length;
    const brokeTestRejected = !game.testDisaster('tide'); // $0 left -> refused

    // Rome (index 2): blackout -> no house keeps power
    game.startLevel(2);
    game.triggerRomeBlackout();
    game.update(0.1);
    const poweredDuringBlackout = game.houses.filter(h => h.hasPower).length;

    // Amsterdam (index 3)
    game.startLevel(3);
    const amsMaxComplaints = game.maxComplaints;

    // Return to Bangkok (index 0) for clean screenshot
    game.startLevel(0);
    const gen = game.buildings.find(b => b.config.type === 'generator');
    const pump = game.buildings.find(b => b.config.type === 'water_pump');
    const filter = game.buildings.find(b => b.config.type === 'waste_filter');
    game.houses.forEach(h => {
      game.connectNodes('power', gen, h);
      game.connectNodes('water', pump, h);
      game.connectNodes('sewage', filter, h);
    });
    game.update(0.2);

    return {
      quakeOk,
      moneyAfterTest,
      tokyoBrokenAfterQuake,
      brokeTestRejected,
      poweredDuringBlackout,
      amsMaxComplaints
    };
  });
  console.log('4. 4-Level Special Mechanics Verification:', levelsCheck);

  if (
    !levelsCheck.quakeOk ||
    levelsCheck.moneyAfterTest !== 0 ||
    levelsCheck.tokyoBrokenAfterQuake < 2 ||
    !levelsCheck.brokeTestRejected ||
    levelsCheck.poweredDuringBlackout !== 0 ||
    levelsCheck.amsMaxComplaints !== 1
  ) {
    throw new Error('4-Level special mechanics verification failed!');
  }

  // 5. Simulation keeps running while the cursor rests on the HUD (used to freeze time & pollution)
  await page.evaluate(() => { window.POWATER.uiManager.closeModal(); window.POWATER.game.startLevel(0); });
  await page.mouse.move(740, 20);
  await new Promise(r => setTimeout(r, 1500));
  const hoverElapsed = await page.evaluate(() => window.POWATER.game.levelElapsedTime);
  // 6. Tab cycles wire type
  await page.evaluate(() => { window.POWATER.game.activeTool = 'power'; });
  await page.keyboard.press('Tab');
  const afterTab = await page.evaluate(() => window.POWATER.game.activeTool);
  // 7. Tutorial runs all 9 steps (chaining, delete, series slowdown, repair, pollution, strikes) then shows lose video
  const tutSteps = await page.evaluate(() => {
    const g = window.POWATER.game;
    g.startTutorial();
    const seen = [];
    for (let i = 0; i < 9; i++) { seen.push(g.tutorialStep); g.skipTutorialStep(); g.update(0.05); }
    const ui = window.POWATER.uiManager;
    const r = { seen, final: g.tutorialStep, chained: !!(g.tutorialHouse3 && g.tutorialHouse3.hasPower && g.tutorialHouse3.hasDrainage), video: ui.activeModal === 'feature_video' && ui.modalData.videoKey };
    ui.closeModal();
    return r;
  });
  console.log('5-7. HUD hover / Tab / Tutorial:', { hoverElapsed, afterTab, tutSteps });
  if (hoverElapsed < 1.0 || afterTab !== 'water' || tutSteps.final !== 10 || tutSteps.seen.join() !== '1,2,3,4,5,6,7,8,9' || !tutSteps.chained || tutSteps.video !== 'lose_pollution') {
    throw new Error('HUD-hover simulation, Tab wire switch, or tutorial check failed!');
  }
  await page.evaluate(() => window.POWATER.game.startLevel(0));
  await page.mouse.move(640, 400);

  // 8. Wire rules: max length, spawn reachability, series slowdown -> complaint
  const rules = await page.evaluate(() => {
    const g = window.POWATER.game, C = window.POWATER.CONFIG;
    const R = C.MAX_WIRE_LENGTH;
    const d = (a, b) => Math.hypot(a.getCenter().x - b.getCenter().x, a.getCenter().y - b.getCenter().y);
    // a too-long wire is refused
    const gen = g.buildings.find(b => b.config.type === 'generator');
    const gc = gen.getCenter();
    const far = { id: 'far', isHouse: true, getCenter: () => ({ x: gc.x + R + 30, y: gc.y }) };
    const farRefused = !g.connectNodes('power', gen, far);
    // buildings cannot be demolished
    const nBuild = g.buildings.length;
    g.deleteAt(gc.x, gc.y);
    const buildingKept = g.buildings.length === nBuild;
    // every spawned house can be wired to all three utilities
    for (let i = 0; i < 12; i++) g.spawnHouse();
    const allReachable = g.houses.every(h => g.canSupplySpot(h.getCenter().x, h.getCenter().y));
    // series chain: hops 1..2 full, 3 = 75%, 6 = no flow
    const flows = [1, 2, 3, 4, 5, 6].map(n => g.chainFlow(n, 'power'));
    // a supplied house with a flow deficit eventually complains
    const h = g.houses[0];
    h.hasPower = h.hasWater = h.hasDrainage = true; h.flowDeficit = 0.5; h.unhappyTimer = 0;
    let complained = false;
    for (let t = 0; t < 70; t += 0.5) h.update(0.5, () => { complained = true; }, false);
    const longHops = g.linkHops({ fromNode: gen, toNode: { getCenter: () => ({ x: gc.x + 630, y: gc.y }) } });
    return { R, longHops, farRefused, buildingKept, allReachable, houses: g.houses.length, flows, complained };
  });
  console.log('8. Wire rules:', rules);
  if (rules.R !== 790 || Math.abs(rules.longHops - 2) > 1e-9 || !rules.farRefused || !rules.buildingKept || !rules.allReachable || rules.flows.join() !== '1,1,0.75,0.5,0.25,0' || !rules.complained) {
    throw new Error('Wire length / spawn reachability / series slowdown check failed!');
  }
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8b. Every house fully wired -> spawn timer runs faster
  const boost = await page.evaluate(() => {
    const g = window.POWATER.game;
    g.houses.forEach(h => { try { h.runtimeObject.deleteFromScene(g.runtimeScene); } catch (e) {} });
    g.houses = []; g.spawnTimer = 0; g.spawnHouse(null, 680, 280); // one house in direct reach of the Bangkok generator, pump and filter
    const t = (wire) => {
      g.connections = [];
      if (wire) {
        const by = (k) => g.buildings.find(b => b.config.type === k);
        g.houses.forEach(h => { g.connectNodes('power', by('generator'), h); g.connectNodes('water', by('water_pump'), h); g.connectNodes('sewage', h, by('waste_filter')); });
      }
      g.update(0.05); g.spawnTimer = 0; g.update(1);
      return g.spawnTimer;
    };
    const idle = t(false), wired = t(true);
    const all = g.houses.every(h => h.hasPower && h.hasWater && h.hasDrainage);
    const speeds = [g.toggleSpeed(), g.toggleSpeed(), g.toggleSpeed()];
    g.toggleSpeed(); g.toggleSpeed(); // -> 4x
    g.gameSpeed = 1;
    return { idle, wired, all, speeds };
  });
  console.log('8b. All-connected spawn boost / speed / ETA:', boost);
  if (!boost.all || boost.wired < boost.idle * 3 || boost.speeds.join() !== '2,4,1') {
    throw new Error('Spawn speedup / 4x speed / win ETA check failed!');
  }
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8c. Pollution starts at 5 houses; the 1:20 win hold only counts after that
  const pol = await page.evaluate(() => {
    const g = window.POWATER.game;
    g.startLevel(0);
    const before = { n: g.houses.length, active: g.pollutionActive() };
    while (g.houses.length < 5 && g.spawnHouse()) {}
    const after = { n: g.houses.length, active: g.pollutionActive() };
    return { before, after, hold: g.winTargetDuration };
  });
  console.log('8c. Pollution start / win hold:', pol);
  if (pol.before.active || pol.before.n >= 5 || !pol.after.active || pol.hold !== 0) throw new Error('Pollution start at 5 houses / no win hold check failed!');
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8d. maxPollution is sized so a minimal city (all drained, 1 generator, filters as needed) loses with 20s of hold left
  const minimal = await page.evaluate(() => {
    const g = window.POWATER.game, C = window.POWATER.CONFIG, lvl = g.currentLevel;
    const req = g.winRequiredHouses, s = C.POLLUTION_START_HOUSES, step = lvl.spawnInterval / 1000 / C.ALL_CONNECTED_SPAWN_SPEEDUP;
    const cap = g.buildings.find(b => b.config.type === 'waste_filter').config.capacity;
    const keep = g.buildings.filter(b => b.config.type !== 'waste_filter' && b.config.type !== 'water_pump');
    const realB = g.buildings, realH = g.houses;
    let t = 0, hitAt = null;
    g.pollution = 0; g.pollutionStartedNotified = true;
    while (t < 2000 && hitAt === null) {
      const n = Math.min(req, s + Math.floor(t / step));
      g.houses = Array.from({ length: n }, () => ({ hasWater: true, hasDrainage: true }));
      g.buildings = keep.concat(Array.from({ length: Math.ceil(n / cap) }, () => ({ config: { type: 'waste_filter' }, active: true, isBroken: false, usedCapacity: 1 })));
      g.updatePollution(0.05);
      t += 0.05;
      if (g.pollution >= lvl.maxPollution) hitAt = t;
    }
    g.houses = realH; g.buildings = realB; g.pollution = 0;
    return { max: lvl.maxPollution, reach15: (req - s) * step, polluted: Math.round(hitAt * 10) / 10 };
  });
  console.log('8d. Minimal-city pollution budget:', minimal);
  // no win hold: a minimal city reaches 15 houses (and wins) well before the limit, which lasts >= 60s of pollution
  if (minimal.polluted < 59.5 || minimal.polluted < minimal.reach15) throw new Error('maxPollution budget check failed!');

  // 8f. Fixed house layout: houses appear at config/<city>.json houseSpawnPoints in order
  const layout = await page.evaluate(() => {
    const g = window.POWATER.game;
    g.startLevel(0);
    while (g.houses.length < 15 && g.spawnHouse()) {}
    const pts = g.currentLevel.houseSpawnPoints || [];
    return { n: pts.length, houses: g.houses.length, match: g.houses.every((h, i) => Math.abs(h.getCenter().x - pts[i][0]) < 1 && Math.abs(h.getCenter().y - pts[i][1]) < 1) };
  });
  console.log('8f. Fixed house layout:', layout);
  if (layout.n !== 15 || layout.houses !== 15 || !layout.match) throw new Error('Fixed house layout check failed!');
  await page.evaluate(() => window.POWATER.game.startLevel(0));
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8e. Eco Filter 5s cooldown; money restarts per level while upgrades carry over
  const carry = await page.evaluate(() => {
    const g = window.POWATER.game;
    g.startLevel(0);
    g.money = 1000;
    const spots = [];
    for (let x = 80; x < 1200 && spots.length < 2; x += 20) for (let y = 120; y < 600 && spots.length < 2; y += 20) {
      if (!g.map.isPointInRiver(x, y) && [...g.buildings, ...g.houses, ...spots.map(p => ({ getCenter: () => p }))].every(e => Math.hypot(e.getCenter().x - x, e.getCenter().y - y) > 80)) spots.push({ x, y });
    }
    const first = g.placeBuilding('air_filter', spots[0].x, spots[0].y);
    const blocked = !g.placeBuilding('air_filter', spots[1].x, spots[1].y);
    g.levelElapsedTime += 5.1;
    const afterWait = g.placeBuilding('air_filter', spots[1].x, spots[1].y);
    g.money = 5000;
    g.buyUpgrade('poll_red');
    const up = g.upgradeLevels.poll_red;
    g.startLevel(1);
    return { first, blocked, afterWait, upBefore: up, upAfter: g.upgradeLevels.poll_red, money: g.money, budget: g.currentLevel.startingBudget };
  });
  console.log('8e. Filter cooldown / money & upgrades across levels:', carry);
  if (!carry.first || !carry.blocked || !carry.afterWait || carry.upAfter !== carry.upBefore || carry.upBefore < 1 || carry.money !== carry.budget) {
    throw new Error('Filter cooldown / level carry-over check failed!');
  }
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8g. Tutorial: fixed house spots, and it can't be "won" mid-tutorial by its 1-house rule
  const tut = await page.evaluate(() => {
    const g = window.POWATER.game;
    g.startTutorial();
    const intro = window.POWATER.uiManager.activeModal;
    window.POWATER.uiManager.closeModal();
    const p = (h) => h && [Math.round(h.getCenter().x), Math.round(h.getCenter().y)].join(',');
    const first = p(g.houses[0]);
    for (let i = 0; i < 3; i++) { g.skipTutorialStep(); g.update(0.05); }
    for (let t = 0; t < 60; t += 0.5) g.update(0.5);
    const second = p(g.tutorialHouse2);
    g.skipTutorialStep(); g.update(0.05); g.skipTutorialStep(); g.update(0.05);
    const r = { intro, first, second, third: p(g.tutorialHouse3), step: g.tutorialStep, won: g.isGameWon };
    window.POWATER.uiManager.closeModal();
    return r;
  });
  console.log('8g. Tutorial spots / no early win:', tut);
  if (tut.intro !== 'hud_intro' || tut.first !== '840,280' || tut.second !== '1040,290' || tut.third !== '1130,170' || tut.won || tut.step !== 6) throw new Error('Tutorial fixed spots / early win check failed!');
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8h. CONTINUE after winning keeps the level playable; 33% pollution warns once and opens the Eco Filter video
  const after = await page.evaluate(() => {
    const g = window.POWATER.game, u = window.POWATER.uiManager;
    g.startLevel(0);
    g.triggerGameWon();
    const modal = u.activeModal;
    u.closeModal(); // CONTINUE / X
    const t0 = g.levelElapsedTime;
    g.update(1); g.update(1);
    const runs = g.levelElapsedTime > t0 + 1.5 && !g.isGameWon;
    g.triggerGameWon();
    const noRefire = !g.isGameWon && u.activeModal !== 'victory';
    while (g.houses.length < 5 && g.spawnHouse()) {}
    g.pollution = g.currentLevel.maxPollution * 0.34;
    g.updatePollution(0.01);
    const video = u.activeModal === 'feature_video' && u.modalData && u.modalData.videoKey;
    u.closeModal();
    g.updatePollution(0.01);
    const once = u.activeModal !== 'feature_video';
    return { modal, runs, noRefire, video, once };
  });
  console.log('8h. Continue after win / 33% pollution advice:', after);
  if (after.modal !== 'victory' || !after.runs || !after.noRefire || after.video !== 'air_filter' || !after.once) throw new Error('Continue-after-win / pollution advice check failed!');
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8i. City disasters every 1-2 new houses from the start, never the same gap twice in a row
  const dis = await page.evaluate(() => {
    const g = window.POWATER.game;
    const out = {};
    [[1, 'triggerEarthquake'], [2, 'triggerRomeBlackout'], [0, 'triggerHighTide']].forEach(([lvl, fn]) => {
      g.startLevel(lvl);
      const start = g.houses.length, hits = [];
      const orig = g[fn].bind(g);
      g[fn] = () => { hits.push(g.houses.length); orig(); };
      for (let i = 0; i < 12; i++) g.spawnHouse();
      g[fn] = orig;
      const gaps = hits.map((h, i) => h - (i ? hits[i - 1] : start));
      out[g.currentLevel.id] = { start, hits, gaps };
    });
    return out;
  });
  console.log('8i. Disaster schedule:', JSON.stringify(dis));
  const disOk = Object.values(dis).every(d => d.hits.length >= 4 && d.gaps.every(x => x >= 1 && x <= 2) && d.gaps.every((x, i) => !i || x !== d.gaps[i - 1]));
  if (!disOk) throw new Error('Disaster schedule check failed!');
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8j. Hard mode: no 2.5x wires (a 500px link is refused), normal mode allows it
  const hardRes = await page.evaluate(() => {
    const g = window.POWATER.game;
    g.startLevel(0);
    const gen = g.buildings.find(b => b.config.type === 'generator'), gc = gen.getCenter();
    const far = { id: 'far500', isHouse: true, getCenter: () => ({ x: gc.x - 500, y: gc.y }) };
    g.hardMode = true;
    const hardRefused = !g.connectNodes('power', gen, far) && g.maxWireLength() === 315;
    g.hardMode = false;
    const normalOk = g.connectNodes('power', gen, far) && g.maxWireLength() === 790;
    g.connections = [];
    return { hardRefused, normalOk };
  });
  console.log('8j. Hard mode wire reach:', hardRes);
  if (!hardRes.hardRefused || !hardRes.normalOk) throw new Error('Hard mode check failed!');
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 8k. Bot example after the top-bar intro: a demo video per step, moved with back / next, then the player's turn
  const demo = await page.evaluate(() => {
    const g = window.POWATER.game, u = window.POWATER.uiManager;
    g.startTutorial();
    u.showTutorialDemo(0);
    const keys = [u.modalData.videoKey];
    u.tutorialDemoGo(-1); const stayFirst = u.modalData.demoStep === 0; // back on the first step does nothing
    for (let i = 0; i < 8; i++) { u.tutorialDemoGo(1); keys.push(u.modalData.videoKey); }
    u.tutorialDemoGo(-1); const back = u.modalData.demoStep; u.tutorialDemoGo(1);
    u.tutorialDemoGo(1); // last step -> start playing
    const r = { keys, stayFirst, back, modal: u.activeModal, step: g.tutorialStep, houses: g.houses.length };
    g.isTutorialMode = false;
    return r;
  });
  console.log('8k. Tutorial bot example (step videos):', JSON.stringify(demo));
  if (demo.keys.length !== 9 || new Set(demo.keys).size !== 9 || !demo.stayFirst || demo.back !== 7 || demo.modal || demo.step !== 1 || demo.houses !== 1) throw new Error('Tutorial example videos check failed!');
  await page.evaluate(() => window.POWATER.game.startLevel(0));

  // 9. City map image drives water; city cutscene (story intro for Bangkok) precedes the briefing
  const story = await page.evaluate(() => {
    const g = window.POWATER.game, u = window.POWATER.uiManager, m = g.map;
    const shoreOk = g.buildings.filter(b => b.config.mustBeNearWater).every(b => m.isNearRiver(b.getCenter().x, b.getCenter().y, 75) && !m.isPointInRiver(b.getCenter().x, b.getCenter().y));
    u.showCityCutscene(g.currentLevel);
    const first = u.modalData.pages[0].speaker, n = u.modalData.pages.length;
    u.advanceCutscene(true);
    const after = u.activeModal;
    u.closeModal();
    return { mask: !!m.mask, waterCells: m.waterCells ? m.waterCells.length : 0, shoreOk, first, n, after };
  });
  console.log('9. Map water mask / cutscene:', story);
  if (!story.mask || story.waterCells < 500 || !story.shoreOk || story.first !== 'ผู้บรรยาย' || story.n < 5 || story.n > 10 || story.after !== 'briefing') {
    throw new Error('Map water mask or city cutscene check failed!');
  }

  const screenshotPath = path.join(__dirname, '..', 'test_screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved gameplay screenshot to:', screenshotPath);

  const realErrors = errors.filter(e =>
    !e.includes('cloudflarestorage') &&
    !e.includes('manifest') &&
    !e.includes('screenshot') &&
    !e.includes('net::ERR_FAILED')
  );

  await browser.close();
  server.close();

  if (realErrors.length > 0) {
    console.error('Runtime errors:', realErrors);
    process.exit(1);
  }
  console.log('ALL POWATER CORP. v1.0.0.0 TESTS PASSED 100%!');
}

runTest().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
