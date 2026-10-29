const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PREVIEW_DIR = 'C:\\Users\\user\\AppData\\Local\\Temp\\GDTMP--1\\preview';
const PORT = 9876;

// 1. Simple HTTP static server
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
  
  let filePath = path.join(PREVIEW_DIR, reqPath);
  if (!fs.existsSync(filePath) && reqPath.startsWith('/assets/')) {
    filePath = path.join(PROJECT_ASSETS_DIR, reqPath.replace('/assets/', ''));
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

  // Wait 2 seconds for game loop to tick and scene to load
  await new Promise(r => setTimeout(r, 2000));

  // Evaluate game state
  const gameState = await page.evaluate(() => {
    const scene = window.gdjsCurrentScene || (gdjs && gdjs._lastCreatedScene);
    if (!scene) {
      return { loaded: false, error: 'No scene instance found yet' };
    }
    const houses = scene.getObjects('house') || [];
    const houseCoords = houses.map(h => ({
      x: h.getX(),
      y: h.getY(),
      cx: h.getX() + h.getWidth() / 2,
      cy: h.getY() + h.getHeight() / 2,
      w: h.getWidth(),
      h: h.getHeight()
    }));
    const wiring = scene._powaterWiringInstance;
    const conns = wiring ? wiring.connections.length : 0;
    return {
      loaded: true,
      houseCount: houses.length,
      houseCoords,
      connectionsCount: conns
    };
  });

  console.log('Game State:', JSON.stringify(gameState, null, 2));

  // If houses exist, simulate dragging a wire between house 0 and house 1
  if (gameState.houseCount >= 2) {
    const h0 = gameState.houseCoords[0];
    const h1 = gameState.houseCoords[1];

    console.log(`Simulating drag from (${h0.cx}, ${h0.cy}) to (${h1.cx}, ${h1.cy})...`);
    await page.mouse.move(h0.cx, h0.cy);
    await page.mouse.down();
    await new Promise(r => setTimeout(r, 100));

    await page.mouse.move(h1.cx, h1.cy, { steps: 10 });
    await new Promise(r => setTimeout(r, 100));

    await page.mouse.up();
    await new Promise(r => setTimeout(r, 500));
  }

  // Check state after wiring
  const postWiringState = await page.evaluate(() => {
    const scene = gdjs && gdjs._lastCreatedScene;
    const wiring = scene && scene._powaterWiringInstance;
    return {
      connectionsCount: wiring ? wiring.connections.length : 0
    };
  });

  console.log('Post-wiring connections:', postWiringState.connectionsCount);

  // Take screenshot
  const screenshotPath = 'C:\\Users\\user\\Desktop\\Folder\\GDEV_POWATER\\test_screenshot.png';
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  await browser.close();
  server.close();

  console.log('Total console logs captured:', consoleLogs.length);
  console.log('Errors encountered:', errors.length);
  if (errors.length > 0) {
    console.error('Errors:', errors);
  } else {
    console.log('TEST PASSED WITH ZERO ERRORS!');
  }
}

runTest().catch(err => {
  console.error('Test script failed:', err);
  server.close();
  process.exit(1);
});
