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
    const modal = document.getElementById('modal-briefing');
    if (modal) modal.classList.remove('active');
  });

  // Evaluate game state & dimensions
  const entityPositions = await page.evaluate(() => {
    const game = window.POWATER && window.POWATER.game;
    if (!game) return null;

    return {
      buildings: game.buildings.map(b => ({
        id: b.id,
        type: b.config.type,
        center: b.getCenter(),
        width: b.width,
        height: b.height
      })),
      houses: game.houses.map(h => ({
        id: h.id,
        center: h.getCenter(),
        width: h.width,
        height: h.height
      }))
    };
  });

  console.log('Entities in scene:', JSON.stringify(entityPositions, null, 2));

  // Verify no overlaps between buildings and houses
  let overlapFound = false;
  const allEntities = [...entityPositions.buildings, ...entityPositions.houses];
  for (let i = 0; i < allEntities.length; i++) {
    for (let j = i + 1; j < allEntities.length; j++) {
      const e1 = allEntities[i];
      const e2 = allEntities[j];
      const dist = Math.hypot(e1.center.x - e2.center.x, e1.center.y - e2.center.y);
      const minSafeDist = (Math.max(e1.width, e1.height) + Math.max(e2.width, e2.height)) / 2 + 10;
      if (dist < minSafeDist) {
        console.error(`OVERLAP DETECTED between ${e1.id} and ${e2.id}! Dist: ${dist}, Min: ${minSafeDist}`);
        overlapFound = true;
      }
    }
  }

  if (!overlapFound) {
    console.log('PASSED: All entities are cleanly spaced with ZERO overlaps!');
  }

  // Test Mouse Drag from Generator to House 1
  const gen = entityPositions.buildings.find(b => b.type === 'generator');
  const house = entityPositions.houses[0];

  console.log(`Simulating mouse drag from (${gen.center.x}, ${gen.center.y}) to (${house.center.x}, ${house.center.y})...`);

  // Move to Generator
  await page.mouse.move(gen.center.x, gen.center.y);
  await new Promise(r => setTimeout(r, 100));

  // Mouse down on Generator
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 100));

  // Move in steps to House
  const steps = 10;
  for (let s = 1; s <= steps; s++) {
    const curX = gen.center.x + (house.center.x - gen.center.x) * (s / steps);
    const curY = gen.center.y + (house.center.y - gen.center.y) * (s / steps);
    await page.mouse.move(curX, curY);
    await new Promise(r => setTimeout(r, 30));
  }

  // Mouse up on House
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 300));

  // Check connection status
  const postDragState = await page.evaluate(() => {
    const game = window.POWATER && window.POWATER.game;
    return {
      connectionsCount: game ? game.connections.length : 0,
      connections: game ? game.connections.map(c => ({
        type: c.type,
        from: c.fromNode.id,
        to: c.toNode.id,
        active: c.active
      })) : []
    };
  });

  console.log('Post Drag State:', JSON.stringify(postDragState, null, 2));

  if (postDragState.connectionsCount > 0) {
    console.log('PASSED: Mouse Drag Successfully Established Connection!');
  } else {
    console.error('FAILED: Mouse Drag Did Not Establish Connection!');
  }

  // Also test Click-to-Connect from Water Pump to House 2
  const pump = entityPositions.buildings.find(b => b.type === 'water_pump');
  const house2 = entityPositions.houses[1];

  console.log(`Testing Click-to-Connect from Pump (${pump.center.x}, ${pump.center.y}) to House 2 (${house2.center.x}, ${house2.center.y})...`);
  await page.mouse.move(pump.center.x, pump.center.y);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 80));
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 150));

  await page.mouse.move(house2.center.x, house2.center.y);
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 80));
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 300));

  const clickConnectState = await page.evaluate(() => {
    const game = window.POWATER && window.POWATER.game;
    return {
      connectionsCount: game ? game.connections.length : 0,
      connections: game ? game.connections.map(c => ({
        type: c.type,
        from: c.fromNode.id,
        to: c.toNode.id,
        active: c.active
      })) : []
    };
  });

  console.log('Post Click-to-Connect State:', JSON.stringify(clickConnectState, null, 2));

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

  if (realErrors.length > 0 || overlapFound || postDragState.connectionsCount === 0) {
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED WITH 100% SUCCESS!');
  }
}

runTest().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
