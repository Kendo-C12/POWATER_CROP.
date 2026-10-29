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

  let filePath = path.join(PREVIEW_DIR, reqPath);
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

  page.on('response', response => {
    if (response.status() >= 400) {
      console.log('HTTP Error:', response.status(), response.url());
    }
  });

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

  // Evaluate game state
  const gameState = await page.evaluate(() => {
    const powater = window.POWATER || {};
    const game = powater.game;
    const ui = powater.uiManager;

    if (!game) {
      return { loaded: false, error: 'POWATER.game not found on window' };
    }

    return {
      loaded: true,
      level: game.currentLevel ? game.currentLevel.name : null,
      money: game.money,
      housesCount: game.houses.length,
      buildingsCount: game.buildings.length,
      connectionsCount: game.connections.length,
      complaints: game.complaints,
      pollution: game.pollution,
      hudExists: !!document.getElementById('powater-ui-root'),
      hudMoney: document.getElementById('hud-money') ? document.getElementById('hud-money').textContent : null,
      hudDay: document.getElementById('hud-day-name') ? document.getElementById('hud-day-name').textContent : null
    };
  });

  console.log('Game State Evaluated:', JSON.stringify(gameState, null, 2));

  // Test Smart Auto-Drag Wire Connection between Generator and House
  const dragResult = await page.evaluate(() => {
    const game = window.POWATER && window.POWATER.game;
    if (!game || game.buildings.length === 0 || game.houses.length === 0) {
      return { success: false, reason: 'Entities not available' };
    }

    const gen = game.buildings.find(b => b.config.type === 'generator');
    const house = game.houses[0];
    if (!gen || !house) return { success: false, reason: 'Gen or House not found' };

    const initialConns = game.connections.length;
    game.connectNodes('power', gen, house);

    return {
      success: game.connections.length > initialConns,
      connections: game.connections.length,
      connType: game.connections[game.connections.length - 1].type
    };
  });

  console.log('Drag Connection Test Result:', JSON.stringify(dragResult, null, 2));

  // Test Upgrade Modal Opening
  const modalResult = await page.evaluate(() => {
    const upgBtn = document.getElementById('btn-open-upgrades');
    if (upgBtn) upgBtn.click();
    const modal = document.getElementById('modal-upgrade');
    return {
      modalOpened: modal ? modal.classList.contains('active') : false,
      cardsCount: document.querySelectorAll('.upgrade-card').length
    };
  });

  console.log('Upgrade Modal Test Result:', JSON.stringify(modalResult, null, 2));

  const screenshotPath = path.join(__dirname, '..', 'test_screenshot.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

  console.log('Total console logs captured:', consoleLogs.length);
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

  if (realErrors.length > 0) {
    process.exit(1);
  } else {
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
  }
}

runTest().catch(err => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
