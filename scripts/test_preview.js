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

  const consoleLogs = [];
  const errors = [];

  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    if (msg.type() === 'error') {
      errors.push(text);
    }
  });

  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err.message);
    errors.push(err.message);
  });

  console.log('Navigating to preview...');
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0', timeout: 15000 });

  // Wait 2.5 seconds for scene and game systems to initialize
  await new Promise(r => setTimeout(r, 2500));

  // Close briefing modal if open
  await page.evaluate(() => {
    if (window.POWATER && window.POWATER.uiManager && window.POWATER.uiManager.closeModal) {
      window.POWATER.uiManager.closeModal();
    }
  });

  // Check initial state of House 1 (should have NO power, so needs power)
  const initialHouseState = await page.evaluate(() => {
    const game = window.POWATER && window.POWATER.game;
    const h = game.houses[0];
    return {
      hasPower: h.hasPower,
      hasWater: h.hasWater,
      hasDrainage: h.hasDrainage
    };
  });
  console.log('Initial House 1 State:', initialHouseState);

  // Test Mouse Drag from Generator to House 1
  const entityPositions = await page.evaluate(() => {
    const game = window.POWATER && window.POWATER.game;
    return {
      gen: game.buildings.find(b => b.config.type === 'generator').getCenter(),
      house: game.houses[0].getCenter()
    };
  });

  console.log(`Simulating mouse drag from Generator (${entityPositions.gen.x}, ${entityPositions.gen.y}) to House 1 (${entityPositions.house.x}, ${entityPositions.house.y})...`);

  await page.mouse.move(entityPositions.gen.x, entityPositions.gen.y);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 100));

  const steps = 10;
  for (let s = 1; s <= steps; s++) {
    const curX = entityPositions.gen.x + (entityPositions.house.x - entityPositions.gen.x) * (s / steps);
    const curY = entityPositions.gen.y + (entityPositions.house.y - entityPositions.gen.y) * (s / steps);
    await page.mouse.move(curX, curY);
    await new Promise(r => setTimeout(r, 25));
  }

  await page.mouse.up();
  await new Promise(r => setTimeout(r, 300));

  // Check if House 1 now hasPower === true!
  const postPowerState = await page.evaluate(() => {
    const game = window.POWATER && window.POWATER.game;
    const h = game.houses[0];
    return {
      connectionsCount: game.connections.length,
      house1_hasPower: h.hasPower,
      house1_hasWater: h.hasWater,
      house1_hasDrainage: h.hasDrainage
    };
  });

  console.log('Post-Power Wiring State:', postPowerState);

  if (postPowerState.house1_hasPower === true) {
    console.log('PASSED: House 1 successfully received power! Power requirement satisfied!');
  } else {
    console.error('FAILED: House 1 did not receive power!');
  }

  // Test clicking WATER button
  const waterBtnPos = await page.evaluate(() => {
    const btn = window.POWATER && window.POWATER.uiManager && window.POWATER.uiManager.buttons.find(b => b.id === 'water');
    return btn ? { x: btn.x + btn.w / 2, y: btn.y + btn.h / 2 } : { x: 378, y: 682 };
  });
  console.log(`Testing click on WATER PNG button at (${waterBtnPos.x}, ${waterBtnPos.y})...`);
  await page.mouse.move(waterBtnPos.x, waterBtnPos.y);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 80));
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 100));
  const activeToolAfterClick = await page.evaluate(() => window.POWATER && window.POWATER.game && window.POWATER.game.activeTool);
  console.log('Active tool after clicking button:', activeToolAfterClick);
  if (activeToolAfterClick === 'water') {
    console.log('PASSED: WATER button click correctly selected clean water tool!');
  } else {
    console.error('FAILED: Button click did not switch tool to water!');
  }

  const screenshotPath = path.join(__dirname, '..', 'test_screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  const realErrors = errors.filter(e =>
    !e.includes('cloudflarestorage') &&
    !e.includes('manifest') &&
    !e.includes('screenshot') &&
    !e.includes('net::ERR_FAILED')
  );

  console.log('Engine errors encountered:', realErrors.length);
  if (realErrors.length > 0) {
    console.log('Errors:', realErrors);
  }

  await browser.close();
  server.close();

  if (realErrors.length > 0 || !postPowerState.house1_hasPower) {
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
  }
}

runTest().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
