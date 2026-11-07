// POWATER CORP. v1.0.0.0 - In-Game UI, Real PNG Sprite HUD & Modal Manager
// Integrates GDevelop PNG Sprite buttons/icons with PixiJS telemetry, Win Timer, Day/Night icon,
// Special Items Shop (Rome Candles Bulk Restock & Amsterdam 500 EUR Flood Pump), Repair, Upgrades, and Roadmap

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};

  const CONFIG = (global.POWATER && global.POWATER.CONFIG) || {};

  class UIManager {
    constructor(game) {
      this.game = game;
      this.container = null;
      this.gfx = null;
      this.modalContainer = null;
      this.modalGfx = null;
      this.activeModal = null; // null | 'briefing' | 'upgrades' | 'special_items' | 'sdgs' | 'gameover' | 'victory' | 'grace_ended'
      this.modalData = {};
      this.hoveredButtonId = null;

      this.buttons = [];
      this.modalButtons = [];
      this.setupButtonLayout();
    }

    init() {
      if (typeof document !== 'undefined') {
        const oldRoot = document.getElementById('powater-ui-root');
        if (oldRoot && oldRoot.remove) oldRoot.remove();
        const oldStyles = document.getElementById('powater-styles');
        if (oldStyles && oldStyles.remove) oldStyles.remove();
      }
    }

    setupButtonLayout() {
      const tbY = 658;
      const tbH = 48;
      const tbW = 64;

      // 12 Toolbar Buttons matching the 12 GDevelop PNG Sprite instances on the dock tray (x: 200..1080)
      this.buttons = [
        // Utility Wiring Tools
        { id: 'power', objectName: 'btn_power', type: 'tool', toolId: 'power', x: 208, y: tbY, w: tbW, h: tbH, color: 0xffb703 },
        { id: 'water', objectName: 'btn_water', type: 'tool', toolId: 'water', x: 276, y: tbY, w: tbW, h: tbH, color: 0x00b4d8 },
        { id: 'sewage', objectName: 'btn_drain', type: 'tool', toolId: 'sewage', x: 344, y: tbY, w: tbW, h: tbH, color: 0x9d4edd },
        // Buildings & Repair / Special Items
        { id: 'solar', objectName: 'btn_solar', type: 'build', buildId: 'build_solar', x: 420, y: tbY, w: tbW, h: tbH, color: 0xffd166 },
        { id: 'air_filter', objectName: 'btn_filter', type: 'build', buildId: 'build_air_filter', x: 488, y: tbY, w: tbW, h: tbH, color: 0x06d6a0 },
        { id: 'repair', objectName: 'btn_repair', type: 'action', action: 'repairToolOrAll', x: 556, y: tbY, w: tbW, h: tbH, color: 0xff5a5f },
        { id: 'special', objectName: 'btn_special', type: 'action', action: 'openSpecialItems', x: 624, y: tbY, w: tbW, h: tbH, color: 0x06d6a0 },
        // Simulation & Info Controls
        { id: 'pause', objectName: 'btn_pause', type: 'action', action: 'togglePause', x: 700, y: tbY, w: tbW, h: tbH, color: 0xadb5bd },
        { id: 'speed', objectName: 'btn_speed', type: 'action', action: 'toggleSpeed', x: 768, y: tbY, w: tbW, h: tbH, color: 0xadb5bd },
        { id: 'upgrades', objectName: 'btn_upgrade', type: 'action', action: 'openUpgrades', x: 844, y: tbY, w: tbW, h: tbH, color: 0xffd166 },
        { id: 'sdgs', objectName: 'btn_sdgs', type: 'action', action: 'openSdgs', x: 912, y: tbY, w: tbW, h: tbH, color: 0x00b4d8 },
        { id: 'guide', objectName: 'btn_guide', type: 'action', action: 'openGuide', x: 980, y: tbY, w: tbW, h: tbH, color: 0x48cae4 },
        // Top-left Logo click area
        { id: 'logo', type: 'action', action: 'openGuide', x: 8, y: 6, w: 185, h: 32 }
      ];
    }

    setupPixi(container) {
      if (!container) return;
      this.container = container;
      if (typeof container.removeChildren === 'function') {
        container.removeChildren();
      }

      // 1. Base Graphics Layer for Top HUD, Disaster Banners, and Button Selection Glows
      this.gfx = new PIXI.Graphics();
      container.addChild(this.gfx);

      // 2. HUD Texts & Real PNG Icons Container
      this.textContainer = new PIXI.Container();
      container.addChild(this.textContainer);

      // Real PNG Logo Sprite in Top-Left HUD
      try {
        this.sprLogo = new PIXI.Sprite(PIXI.Texture.from('logo_powater.png'));
        this.sprLogo.width = 24;
        this.sprLogo.height = 24;
        this.sprLogo.position.set(14, 10);
        this.textContainer.addChild(this.sprLogo);

        // Real PNG Day/Night Cycle Icon Sprite in Top HUD
        this.sprDayNight = new PIXI.Sprite(PIXI.Texture.from('icon_day.png'));
        this.sprDayNight.width = 22;
        this.sprDayNight.height = 22;
        this.sprDayNight.position.set(842, 11);
        this.textContainer.addChild(this.sprDayNight);
      } catch (e) {}

      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      this.txtLogo = new PIXI.Text('BANGKOK v1.0', { fontFamily: font, fontSize: 12, fontWeight: '900', fill: 0x00b4d8 });
      this.txtLogo.position.set(42, 14);
      this.textContainer.addChild(this.txtLogo);

      this.txtMoney = new PIXI.Text('💰 $150', { fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffd166 });
      this.txtMoney.position.set(206, 13);
      this.textContainer.addChild(this.txtMoney);

      this.txtServed = new PIXI.Text('🏘️ 0/3 (Cap 40)', { fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: 0x06d6a0 });
      this.txtServed.position.set(322, 14);
      this.textContainer.addChild(this.txtServed);

      this.txtWinTimer = new PIXI.Text('🏆 WIN: 00:00/05:00 (>15)', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0x90e0ef });
      this.txtWinTimer.position.set(472, 14);
      this.textContainer.addChild(this.txtWinTimer);

      this.txtPollution = new PIXI.Text('☢️ 0.0/6.0', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0xffb703 });
      this.txtPollution.position.set(666, 14);
      this.textContainer.addChild(this.txtPollution);

      this.txtTime = new PIXI.Text('☀️ DAY | MON D1', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0xe9ecef });
      this.txtTime.position.set(868, 14);
      this.textContainer.addChild(this.txtTime);

      this.txtStrikes = new PIXI.Text('⚠️ STRIKES:', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0xe63946 });
      this.txtStrikes.position.set(1062, 14);
      this.textContainer.addChild(this.txtStrikes);

      this.txtDisasterBanner = new PIXI.Text('', { fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: 0xffffff });
      this.txtDisasterBanner.anchor.set(0.5, 0.5);
      this.txtDisasterBanner.position.set(640, 62);
      this.textContainer.addChild(this.txtDisasterBanner);

      // Floating Texts Container (rendered in PixiJS so all notifications are visible!)
      this.floatingTextContainer = new PIXI.Container();
      container.addChild(this.floatingTextContainer);

      // 3. Modal Layer Container (Placed on top of HUD)
      this.modalContainer = new PIXI.Container();
      this.modalContainer.visible = false;
      container.addChild(this.modalContainer);

      this.modalGfx = new PIXI.Graphics();
      this.modalContainer.addChild(this.modalGfx);

      this.modalTextContainer = new PIXI.Container();
      this.modalContainer.addChild(this.modalTextContainer);
    }

    selectTool(toolId) {
      if (this.game) {
        this.game.activeTool = toolId;
        if (typeof this.game.selectTool === 'function') {
          this.game.selectTool(toolId);
        }
      }
      this.updateHUD();
    }

    formatMMSS(totalSec) {
      const s = Math.max(0, Math.floor(totalSec));
      const mm = Math.floor(s / 60);
      const ss = s % 60;
      return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    }

    updateHUD() {
      if (!this.game) return;

      if (this.txtLogo) {
        const rawName = this.game.currentLevel ? (this.game.currentLevel.name || 'Bangkok') : 'POWATER';
        const cleanCity = rawName.replace(/^\d+\.\s*/, '').split(',')[0].toUpperCase();
        this.txtLogo.text = `${cleanCity} v1.0`;
      }
      if (this.txtMoney) {
        this.txtMoney.text = `💰 $${Math.floor(this.game.money)}`;
      }
      if (this.txtServed) {
        const complete = this.game.houses.filter(h => h.hasPower && h.hasWater).length;
        const total = this.game.houses.length;
        const upTier = this.game.upsizeTier || 0;
        this.txtServed.text = `🏘️ ${complete}/${total} (Up:${upTier})`;
      }
      if (this.txtWinTimer) {
        const curStr = this.formatMMSS(this.game.winHoldTimer || 0);
        const tgtStr = this.formatMMSS(this.game.winTargetDuration || 300);
        const st = this.game.winTimerState || 'WAITING';
        if (st === 'PAUSED') {
          this.txtWinTimer.text = `⏸️ WIN: ${curStr}/${tgtStr} (PAUSED)`;
          this.txtWinTimer.style.fill = 0xff5a5f;
        } else if (st === 'RUNNING') {
          this.txtWinTimer.text = `🏆 WIN: ${curStr}/${tgtStr} (HOLD!)`;
          this.txtWinTimer.style.fill = 0x06d6a0;
        } else {
          const req = this.game.winRequiredHouses || 15;
          this.txtWinTimer.text = `🏆 WIN: ${curStr}/${tgtStr} (>${req}หลัง)`;
          this.txtWinTimer.style.fill = 0x90e0ef;
        }
      }
      if (this.txtPollution) {
        const p = this.game.pollution.toFixed(1);
        const maxP = this.game.currentLevel ? this.game.currentLevel.maxPollution.toFixed(1) : '6.0';
        this.txtPollution.text = `☢️ ${p}/${maxP}`;
      }
      if (this.txtTime) {
        const dName = this.game.dayNames ? this.game.dayNames[this.game.dayIndex] : 'MON';
        const dNum = (this.game.totalDaysPassed || 0) + 1;
        const phase = this.game.isNight ? 'NIGHT' : 'DAY';
        const cycleRem = 60 - Math.floor((this.game.dayNightTimer || 0) % 60);
        this.txtTime.text = `${phase} (${cycleRem}s) | ${dName} D${dNum}`;
        this.txtTime.style.fill = this.game.isNight ? 0x90e0ef : 0xffd166;
      }
      if (this.sprDayNight && typeof PIXI !== 'undefined') {
        try {
          this.sprDayNight.texture = PIXI.Texture.from(this.game.isNight ? 'icon_night.png' : 'icon_day.png');
          this.sprDayNight.width = 22;
          this.sprDayNight.height = 22;
        } catch (e) {}
      }
      if (this.txtDisasterBanner) {
        this.txtDisasterBanner.text = this.game.activeDisasterText || '';
      }
    }

    update(dt, mouseX, mouseY, isMouseDown, wasMouseDown) {
      this.updateHUD();

      // Sync button positions from GDevelop scene objects if moved by user in scene editor
      if (this.game && this.game.runtimeScene && this.game.runtimeScene.getObjects) {
        for (let i = 0; i < this.buttons.length; i++) {
          const btn = this.buttons[i];
          if (btn.objectName) {
            const objs = this.game.runtimeScene.getObjects(btn.objectName);
            if (objs && objs.length > 0) {
              const obj = objs[0];
              btn.x = obj.getX();
              btn.y = obj.getY();
              btn.w = obj.getWidth();
              btn.h = obj.getHeight();
            }
          }
        }
      }

      const justClicked = isMouseDown && !wasMouseDown;
      let clickConsumed = false;

      // 1. Check Interactions with Modal if Open
      if (this.activeModal) {
        clickConsumed = true;
        if (justClicked) {
          this.handleModalClick(mouseX, mouseY);
        }
        this.renderModal(mouseX, mouseY);
        return true;
      }

      // 2. Check Hover and Clicks on Toolbar & HUD Buttons
      let hoveredBtn = null;
      for (let i = 0; i < this.buttons.length; i++) {
        const btn = this.buttons[i];
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          hoveredBtn = btn;
          break;
        }
      }

      this.hoveredButtonId = hoveredBtn ? hoveredBtn.id : null;

      if (hoveredBtn && justClicked) {
        this.handleButtonClick(hoveredBtn);
        clickConsumed = true;
      }

      // 3. Render Top HUD, Floating Texts & Button Selection Glows
      this.renderToolbarAndHUD(mouseX, mouseY);
      this.renderFloatingTexts();

      const inUIZone = mouseY < 44 || (mouseY >= 646 && mouseX >= 195 && mouseX <= 1065);
      return clickConsumed || inUIZone;
    }

    renderFloatingTexts() {
      if (!this.floatingTextContainer || !this.game) return;
      this.floatingTextContainer.removeChildren();
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const list = this.game.floatingTexts || [];
      for (let i = 0; i < list.length; i++) {
        const ft = list[i];
        const t = new PIXI.Text(ft.text, {
          fontFamily: font,
          fontSize: 13,
          fontWeight: 'bold',
          fill: ft.color || '#ffd166',
          stroke: '#0a0714',
          strokeThickness: 3
        });
        t.anchor.set(0.5);
        t.alpha = Math.max(0, Math.min(1, ft.life));
        t.position.set(ft.x, ft.y);
        this.floatingTextContainer.addChild(t);
      }
    }

    handleButtonClick(btn) {
      if (global.POWATER.soundManager) {
        global.POWATER.soundManager.playClick();
      }

      if (btn.type === 'tool') {
        this.selectTool(btn.toolId);
      } else if (btn.type === 'build') {
        this.selectTool(btn.buildId);
      } else if (btn.type === 'action') {
        switch (btn.action) {
          case 'repairToolOrAll':
            if (this.game) {
              const fixed = this.game.repairAllBroken();
              if (fixed === 0) {
                this.selectTool('repair');
              }
            }
            break;
          case 'openSpecialItems':
            this.showSpecialItemsModal();
            break;
          case 'togglePause':
            if (this.game) this.game.togglePause();
            break;
          case 'toggleSpeed':
            if (this.game) this.game.toggleSpeed();
            break;
          case 'openUpgrades':
            this.showUpgradesModal();
            break;
          case 'openSdgs':
            this.showSdgsModal();
            break;
          case 'openGuide':
            this.showLevelBriefing(this.game.currentLevel);
            break;
        }
      }
    }

    renderToolbarAndHUD() {
      if (!this.gfx || !this.game) return;
      const g = this.gfx;
      g.clear();

      const screenW = 1280;
      g.lineStyle(1.5, 0x48cae4, 0.35);
      g.moveTo(0, 44);
      g.lineTo(screenW, 44);

      const drawStatPill = (x, y, w, h, borderCol = 0x48cae4) => {
        g.lineStyle(1, borderCol, 0.3);
        g.beginFill(0x1a1334, 0.88);
        g.drawRoundedRect(x, y, w, h, 6);
        g.endFill();
      };

      drawStatPill(8, 6, 185, 32);    // Logo + Level
      drawStatPill(198, 6, 112, 32);  // Money
      drawStatPill(314, 6, 148, 32);  // Houses & Upsize
      drawStatPill(466, 6, 190, 32);  // Win Timer
      drawStatPill(660, 6, 172, 32);  // Pollution
      drawStatPill(836, 6, 216, 32);  // Day/Night + Clock
      drawStatPill(1056, 6, 214, 32); // Strikes

      // Pollution Bar Draw
      const curP = this.game.pollution || 0;
      const maxP = this.game.currentLevel ? this.game.currentLevel.maxPollution : 6.0;
      const pct = Math.min(1.0, Math.max(0.0, curP / maxP));
      const barX = 755, barY = 18, barW = 68, barH = 8;

      g.lineStyle(1, 0xffffff, 0.2);
      g.beginFill(0x000000, 0.5);
      g.drawRoundedRect(barX, barY, barW, barH, 4);
      g.endFill();

      let pColor = 0x06d6a0;
      if (pct > 0.75) pColor = 0xe63946;
      else if (pct > 0.45) pColor = 0xffb703;

      if (pct > 0) {
        g.lineStyle(0);
        g.beginFill(pColor, 0.95);
        g.drawRoundedRect(barX, barY, Math.max(4, barW * pct), barH, 4);
        g.endFill();
      }

      // Complaint Pips (Strikes - 1 pip in Amsterdam, 3 in others)
      const maxComplaints = this.game.maxComplaints || CONFIG.MAX_COMPLAINTS || 3;
      const curComplaints = this.game.complaints || 0;
      for (let i = 0; i < maxComplaints; i++) {
        const pipX = 1145 + (i * 24);
        const pipY = 13;
        const struck = i < curComplaints;
        g.lineStyle(1.5, struck ? 0xff4d6d : 0xffffff, struck ? 1.0 : 0.35);
        g.beginFill(struck ? 0xe63946 : 0x221a44, 0.95);
        g.drawRoundedRect(pipX, pipY, 18, 18, 4);
        g.endFill();
      }

      // Active Disaster Banner background below HUD
      if (this.game.activeDisasterText) {
        g.lineStyle(1.5, 0xff5a5f, 0.9);
        g.beginFill(0x3b0d1e, 0.9);
        g.drawRoundedRect(380, 48, 520, 28, 6);
        g.endFill();
      }

      // Render Active & Hover Selection Glows Around Toolbar Button Sprites
      const brokenCount = this.game.buildings ? this.game.buildings.filter(b => b.isBroken).length : 0;
      for (let i = 0; i < this.buttons.length; i++) {
        const btn = this.buttons[i];
        const isHovered = (this.hoveredButtonId === btn.id);
        const isActive = (btn.toolId && this.game.activeTool === btn.toolId) ||
                         (btn.buildId && this.game.activeTool === btn.buildId) ||
                         (btn.id === 'repair' && (this.game.activeTool === 'repair' || brokenCount > 0)) ||
                         (btn.id === 'special' && (this.game.isFloodActive || this.game.isBlackoutActive)) ||
                         (btn.id === 'pause' && this.game.isPaused) ||
                         (btn.id === 'speed' && this.game.gameSpeed === 2.0);

        if (isActive) {
          g.lineStyle(3.5, btn.color || 0x00b4d8, 1.0);
          g.drawRoundedRect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 8);
          g.lineStyle(0);
          g.beginFill(btn.color || 0x00b4d8, 0.18);
          g.drawRoundedRect(btn.x, btn.y, btn.w, btn.h, 6);
          g.endFill();
        } else if (isHovered) {
          g.lineStyle(2, 0x48cae4, 0.85);
          g.drawRoundedRect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 8);
        }
      }
    }

    // --- MODALS ---

    showLevelBriefing(level) {
      this.activeModal = 'briefing';
      this.modalData = { level: level || this.game.currentLevel };
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    showUpgradesModal() {
      this.activeModal = 'upgrades';
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    showSpecialItemsModal() {
      this.activeModal = 'special_items';
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    showSdgsModal() {
      this.activeModal = 'sdgs';
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    showGracePeriodEndedModal() {
      this.activeModal = 'grace_ended';
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    showGameOverModal(reason) {
      this.activeModal = 'gameover';
      this.modalData = { reason: reason || 'มลภาวะหรือการร้องเรียนเกินเกณฑ์' };
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    showGameWonModal() {
      this.activeModal = 'victory';
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    closeModal() {
      this.activeModal = null;
      if (this.modalContainer) this.modalContainer.visible = false;
      this.modalButtons = [];
      if (this.modalTextContainer) this.modalTextContainer.removeChildren();
      if (this.game && this.game.isPaused) {
        this.game.isPaused = false;
      }
    }

    renderModal(mouseX, mouseY) {
      if (!this.modalGfx) return;
      const g = this.modalGfx;
      g.clear();
      this.modalButtons = [];
      this.modalTextContainer.removeChildren();

      g.beginFill(0x0a0714, 0.84);
      g.drawRect(0, 0, 1280, 720);
      g.endFill();

      const mw = 680;
      const mh = 540;
      const mx = (1280 - mw) / 2;
      const my = (720 - mh) / 2;

      g.lineStyle(2, 0x00b4d8, 0.7);
      g.beginFill(0x150f2c, 0.98);
      g.drawRoundedRect(mx, my, mw, mh, 14);
      g.endFill();

      g.lineStyle(0);
      g.beginFill(0x00b4d8, 0.15);
      g.drawRoundedRect(mx + 2, my + 2, mw - 4, 48, 12);
      g.endFill();
      g.lineStyle(1.5, 0x48cae4, 0.3);
      g.moveTo(mx, my + 50);
      g.lineTo(mx + mw, my + 50);

      const closeBtn = { id: 'modal_close', x: mx + mw - 46, y: my + 9, w: 34, h: 32 };
      this.modalButtons.push(closeBtn);
      const isCloseHover = (mouseX >= closeBtn.x && mouseX <= closeBtn.x + closeBtn.w && mouseY >= closeBtn.y && mouseY <= closeBtn.y + closeBtn.h);
      g.lineStyle(1, isCloseHover ? 0xff4d6d : 0xadb5bd, 0.8);
      g.beginFill(isCloseHover ? 0xe63946 : 0x221a44, 0.8);
      g.drawRoundedRect(closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, 6);
      g.endFill();

      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const txtX = new PIXI.Text('✕', { fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffffff });
      txtX.anchor.set(0.5);
      txtX.position.set(closeBtn.x + closeBtn.w / 2, closeBtn.y + closeBtn.h / 2);
      this.modalTextContainer.addChild(txtX);

      if (this.activeModal === 'briefing') {
        this.renderBriefingContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'upgrades') {
        this.renderUpgradesContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'special_items') {
        this.renderSpecialItemsContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'sdgs') {
        this.renderSdgsContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'grace_ended') {
        this.renderGraceEndedContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'gameover') {
        this.renderGameOverContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'victory') {
        this.renderVictoryContent(mx, my, mw, mh, mouseX, mouseY);
      }
    }

    renderBriefingContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const lvl = this.modalData.level || this.game.currentLevel || {};
      const curLvlIdx = this.game ? (this.game.levelIndex || 0) : 0;

      const title = new PIXI.Text(`📋 POWATER CORP. v1.0.0.0 — 4 ด่านหลัก & เงื่อนไขพิเศษ`, {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0x00b4d8
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const levelTabs = [
        { name: '1. Bangkok', idx: 0 },
        { name: '2. Tokyo', idx: 1 },
        { name: '3. Rome', idx: 2 },
        { name: '4. Amsterdam', idx: 3 }
      ];

      const tabW = (mw - 40 - (levelTabs.length - 1) * 8) / levelTabs.length;
      const tabH = 32;
      const tabY = my + 56;

      for (let i = 0; i < levelTabs.length; i++) {
        const lt = levelTabs[i];
        const tabX = mx + 20 + i * (tabW + 8);
        const isSelected = (curLvlIdx === lt.idx);
        const isHover = (mouseX >= tabX && mouseX <= tabX + tabW && mouseY >= tabY && mouseY <= tabY + tabH);

        this.modalButtons.push({ id: `select_level_${lt.idx}`, x: tabX, y: tabY, w: tabW, h: tabH });

        this.modalGfx.lineStyle(1.5, isSelected ? 0x00b4d8 : (isHover ? 0x48cae4 : 0x3d3460), isSelected ? 1.0 : 0.6);
        this.modalGfx.beginFill(isSelected ? 0x0077b6 : (isHover ? 0x221a44 : 0x181232), 0.95);
        this.modalGfx.drawRoundedRect(tabX, tabY, tabW, tabH, 6);
        this.modalGfx.endFill();

        const tabTxt = new PIXI.Text(lt.name, {
          fontFamily: font,
          fontSize: 12,
          fontWeight: isSelected ? 'bold' : 'normal',
          fill: isSelected ? 0xffffff : (isHover ? 0x90e0ef : 0xadb5bd)
        });
        tabTxt.anchor.set(0.5);
        tabTxt.position.set(tabX + tabW / 2, tabY + tabH / 2);
        this.modalTextContainer.addChild(tabTxt);
      }

      const briefingTxt = new PIXI.Text(
        `📍 ${lvl.thaiName || 'เมืองเป้าหมาย'}\n\n` +
        `${lvl.briefing || ''}\n\n` +
        `• ข้อได้เปรียบ (+): ${lvl.conditionPlus || '-'}\n` +
        `• ความท้าทาย (-): ${lvl.conditionMinus || '-'}\n` +
        `• การได้เงิน: บ้าน Complete รับทันที +$50 | รายได้รายสัปดาห์: [บ้าน Complete] x $40\n` +
        `• ระบบใหม่: ซ่อมเครื่องปั๊ม (Repair 30% ทุก 2 นาที) | Day/Night (1 นาที) | ขยายแมพ (ตันที่ 40 หลัง)\n` +
        `• เงื่อนไขชนะ: บ้าน > 15 หลังมีน้ำและไฟต่อเนื่อง 5 นาที (Pause เมื่อต้องซ่อม/เกิดภัยพิบัติ, Reset เมื่อถูกร้องเรียน)\n\n` +
        `🎩 Amigo TheGOATHimself: "${lvl.amigoQuote || ''}"`,
        { fontFamily: font, fontSize: 12.5, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 46, lineHeight: 20 }
      );
      briefingTxt.position.set(mx + 23, my + 98);
      this.modalTextContainer.addChild(briefingTxt);

      const startBtn = { id: 'btn_start', x: mx + mw / 2 - 95, y: my + mh - 54, w: 190, h: 40 };
      this.modalButtons.push(startBtn);
      const isStartHover = (mouseX >= startBtn.x && mouseX <= startBtn.x + startBtn.w && mouseY >= startBtn.y && mouseY <= startBtn.y + startBtn.h);

      this.modalGfx.lineStyle(2, 0x00b4d8, 1.0);
      this.modalGfx.beginFill(isStartHover ? 0x0096c7 : 0x00b4d8, 1.0);
      this.modalGfx.drawRoundedRect(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 8);
      this.modalGfx.endFill();

      const btnTxt = new PIXI.Text('เริ่มปฏิบัติการ! (START)', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffffff
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    renderSpecialItemsContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('🎒 ร้านค้าไอเทมพิเศษ & ศูนย์รับมือภัยพิบัติ (SPECIAL ITEMS & REPAIR)', {
        fontFamily: font, fontSize: 15, fontWeight: 'bold', fill: 0x06d6a0
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      // Section 1: Rome Bulk Candle Restock (20€, 50€, 100€, 500€ - 10 EUR/box)
      this.modalGfx.lineStyle(1, 0xffd166, 0.4);
      this.modalGfx.beginFill(0x1c1538, 0.92);
      this.modalGfx.drawRoundedRect(mx + 20, my + 62, mw - 40, 145, 8);
      this.modalGfx.endFill();

      const candleTitle = new PIXI.Text(
        `🕯️ Item พิเศษด่าน Rome: Candle (เทียนไขสำรองยามไฟดับ) — สต็อกปัจจุบัน: ${this.game.candleStock || 0} กล่อง`,
        { fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffd166 }
      );
      candleTitle.position.set(mx + 32, my + 72);
      this.modalTextContainer.addChild(candleTitle);

      const candleDesc = new PIXI.Text(
        'ต้องซื้อแบบ Bulk Restock (กล่องละ 10 EUR): หากไฟดับชาวบ้านต้องใช้เทียน บ้านละ 1 กล่อง/รอบที่ไฟดับ เพื่อไม่ให้ถูกร้องเรียน!',
        { fontFamily: font, fontSize: 11.5, fill: 0xadb5bd }
      );
      candleDesc.position.set(mx + 32, my + 96);
      this.modalTextContainer.addChild(candleDesc);

      const packs = (CONFIG.SPECIAL_ITEMS && CONFIG.SPECIAL_ITEMS.CANDLE_PACKS) || [];
      const btnW = 142;
      for (let i = 0; i < packs.length; i++) {
        const pk = packs[i];
        const bx = mx + 32 + i * (btnW + 12);
        const by = my + 132;
        const bh = 54;
        const canAfford = this.game.money >= pk.cost;
        const isHover = (mouseX >= bx && mouseX <= bx + btnW && mouseY >= by && mouseY <= by + bh);

        this.modalButtons.push({ id: `buy_candle_${pk.id}`, packId: pk.id, x: bx, y: by, w: btnW, h: bh });

        this.modalGfx.lineStyle(1.5, canAfford ? 0xffd166 : 0x6c757d, 0.9);
        this.modalGfx.beginFill(canAfford ? (isHover ? 0xffb703 : 0x2d2250) : 0x221a38, 0.95);
        this.modalGfx.drawRoundedRect(bx, by, btnW, bh, 6);
        this.modalGfx.endFill();

        const bTxt = new PIXI.Text(`${pk.label}\n(BUY $${pk.cost})`, {
          fontFamily: font, fontSize: 11.5, fontWeight: 'bold', align: 'center',
          fill: canAfford ? (isHover ? 0x120d24 : 0xffd166) : 0x6c757d
        });
        bTxt.anchor.set(0.5);
        bTxt.position.set(bx + btnW / 2, by + bh / 2);
        this.modalTextContainer.addChild(bTxt);
      }

      // Section 2: Amsterdam Emergency Flood Pump (500 EUR, One-Time Use)
      const pumpY = my + 220;
      this.modalGfx.lineStyle(1, 0x00b4d8, 0.4);
      this.modalGfx.beginFill(0x1c1538, 0.92);
      this.modalGfx.drawRoundedRect(mx + 20, pumpY, mw - 40, 120, 8);
      this.modalGfx.endFill();

      const floodStatus = this.game.isFloodActive
        ? `🌊 กำลังเกิดน้ำท่วม! (เหลือเวลา ${Math.max(0, Math.ceil(120 - this.game.floodTimer))}s ก่อน Game Over)`
        : `สถานะน้ำท่วม: ปกติ (มีเครื่องสูบน้ำสำรอง: ${this.game.floodPumpsOwned || 0} เครื่อง)`;
      const pumpTitle = new PIXI.Text(`🛟 Item พิเศษด่าน Amsterdam: เครื่องสูบน้ำฉุกเฉิน (500 EUR) — ${floodStatus}`, {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x00b4d8
      });
      pumpTitle.position.set(mx + 32, pumpY + 12);
      this.modalTextContainer.addChild(pumpTitle);

      const pumpDesc = new PIXI.Text(
        'เครื่องละ 500 EUR (One-Time Use): ใช้สูบน้ำออกทันทีเมื่อเกิดน้ำท่วมใหญ่ทุกๆ 4 สัปดาห์ (28 วัน) ถ้าน้ำท่วมเกิน 2 นาที Game Over!',
        { fontFamily: font, fontSize: 11.5, fill: 0xadb5bd, wordWrap: true, wordWrapWidth: mw - 230 }
      );
      pumpDesc.position.set(mx + 32, pumpY + 40);
      this.modalTextContainer.addChild(pumpDesc);

      const pumpBtn = { id: 'buy_flood_pump', x: mx + mw - 190, y: pumpY + 34, w: 155, h: 48 };
      this.modalButtons.push(pumpBtn);
      const canBuyPump = this.game.money >= 500 || (this.game.floodPumpsOwned > 0);
      const isPumpHover = (mouseX >= pumpBtn.x && mouseX <= pumpBtn.x + pumpBtn.w && mouseY >= pumpBtn.y && mouseY <= pumpBtn.y + pumpBtn.h);

      this.modalGfx.lineStyle(1.5, canBuyPump ? 0x06d6a0 : 0x6c757d, 0.95);
      this.modalGfx.beginFill(canBuyPump ? (isPumpHover ? 0x00b4d8 : 0x06d6a0) : 0x2d2444, 0.95);
      this.modalGfx.drawRoundedRect(pumpBtn.x, pumpBtn.y, pumpBtn.w, pumpBtn.h, 6);
      this.modalGfx.endFill();

      const pumpBtnLabel = this.game.floodPumpsOwned > 0 ? 'USE PUMP (FREE)' : 'BUY & PUMP $500';
      const pumpBtnTxt = new PIXI.Text(pumpBtnLabel, {
        fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: canBuyPump ? 0x120d24 : 0x6c757d
      });
      pumpBtnTxt.anchor.set(0.5);
      pumpBtnTxt.position.set(pumpBtn.x + pumpBtn.w / 2, pumpBtn.y + pumpBtn.h / 2);
      this.modalTextContainer.addChild(pumpBtnTxt);

      // Section 3: Maintenance & Weather Simulation Controls
      const repY = my + 354;
      this.modalGfx.lineStyle(1, 0xff5a5f, 0.4);
      this.modalGfx.beginFill(0x1c1538, 0.92);
      this.modalGfx.drawRoundedRect(mx + 20, repY, mw - 40, 125, 8);
      this.modalGfx.endFill();

      const brokenCnt = this.game.buildings.filter(b => b.isBroken).length;
      const repTitle = new PIXI.Text(
        `🔧 ระบบซ่อมบำรุง (Repair System) & ทดสอบสภาพอากาศสุดขั้ว — อุปกรณ์ที่เสียตอนนี้: ${brokenCnt} แห่ง`,
        { fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xff5a5f }
      );
      repTitle.position.set(mx + 32, repY + 12);
      this.modalTextContainer.addChild(repTitle);

      const actionButtons = [
        { id: 'act_repair_all', label: `🔧 ซ่อมทั้งหมด (${brokenCnt})`, color: 0x06d6a0 },
        { id: 'act_test_tide', label: '🌊 ทดสอบน้ำขึ้น', color: 0x00b4d8 },
        { id: 'act_test_quake', label: '🌋 ทดสอบแผ่นดินไหว', color: 0xff5a5f },
        { id: 'act_test_blackout', label: '🕯️ ทดสอบไฟดับ', color: 0xffd166 },
        { id: 'act_test_flood', label: '🛟 ทดสอบน้ำท่วม', color: 0x9d4edd }
      ];

      const abW = 114;
      for (let i = 0; i < actionButtons.length; i++) {
        const ab = actionButtons[i];
        const bx = mx + 30 + i * (abW + 8);
        const by = repY + 52;
        const bh = 48;
        const isHover = (mouseX >= bx && mouseX <= bx + abW && mouseY >= by && mouseY <= by + bh);

        this.modalButtons.push({ id: ab.id, x: bx, y: by, w: abW, h: bh });

        this.modalGfx.lineStyle(1.5, ab.color, 0.9);
        this.modalGfx.beginFill(isHover ? ab.color : 0x241b42, 0.95);
        this.modalGfx.drawRoundedRect(bx, by, abW, bh, 6);
        this.modalGfx.endFill();

        const abTxt = new PIXI.Text(ab.label, {
          fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: isHover ? 0x120d24 : 0xffffff
        });
        abTxt.anchor.set(0.5);
        abTxt.position.set(bx + abW / 2, by + bh / 2);
        this.modalTextContainer.addChild(abTxt);
      }
    }

    renderUpgradesContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('🔧 UPGRADE — ศูนย์อัปเกรดเทคโนโลยี POWATER CORP.', {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffd166
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      // Matches page 2 of POWATER IDEA PITCH.pdf (ELECTRICITY +20% FASTER Lv 1/5 10$, POLLUTION -5% Lv 1/10 100$, WATER PUMP +20% FASTER Lv 1/5 10$)
      const upgrades = [
        { key: 'elec_cap', name: '⚡ ELECTRICITY +20% FASTER', desc: 'เพิ่มประสิทธิภาพการส่งกระแสไฟฟ้า +20% (สูงสุด Lv. 5)', baseCost: 10, mult: 1.8, maxLvl: 5 },
        { key: 'poll_red', name: '☢️ POLLUTION -5%', desc: 'ลดอัตราการปล่อยมลภาวะทุกแหล่ง -5% ต่อระดับ (สูงสุด Lv. 10)', baseCost: 100, mult: 1.5, maxLvl: 10 },
        { key: 'water_cap', name: '💧 WATER PUMP +20% FASTER', desc: 'เพิ่มความจุและแรงดันเครื่องปั๊มน้ำสะอาด +20% (สูงสุด Lv. 5)', baseCost: 10, mult: 1.8, maxLvl: 5 },
        { key: 'waste_cap', name: '🧪 WASTEWATER FILTER +25%', desc: 'เพิ่มความจุการบำบัดน้ำเสียริมแม่น้ำ +25% (สูงสุด Lv. 5)', baseCost: 25, mult: 1.6, maxLvl: 5 }
      ];

      for (let i = 0; i < upgrades.length; i++) {
        const up = upgrades[i];
        const cardY = my + 68 + (i * 108);
        const curLvl = (this.game.upgradeLevels && this.game.upgradeLevels[up.key]) || 0;
        const isMax = curLvl >= up.maxLvl;
        const totalCost = Math.round(up.baseCost * Math.pow(up.mult, Math.max(0, curLvl - (up.key === 'poll_red' ? 0 : 1))));
        const canAfford = !isMax && this.game.money >= totalCost;

        this.modalGfx.lineStyle(1, 0x48cae4, 0.25);
        this.modalGfx.beginFill(0x1c1538, 0.9);
        this.modalGfx.drawRoundedRect(mx + 20, cardY, mw - 40, 92, 8);
        this.modalGfx.endFill();

        const nameTxt = new PIXI.Text(`${up.name} (LV. ${curLvl}/${up.maxLvl})`, {
          fontFamily: font, fontSize: 13.5, fontWeight: 'bold', fill: 0xffd166
        });
        nameTxt.position.set(mx + 35, cardY + 16);
        this.modalTextContainer.addChild(nameTxt);

        const descTxt = new PIXI.Text(up.desc, {
          fontFamily: font, fontSize: 11.5, fill: 0xadb5bd
        });
        descTxt.position.set(mx + 35, cardY + 46);
        this.modalTextContainer.addChild(descTxt);

        const buyBtn = { id: `buy_${up.key}`, key: up.key, cost: totalCost, x: mx + mw - 165, y: cardY + 26, w: 125, h: 40 };
        this.modalButtons.push(buyBtn);
        const isHover = (mouseX >= buyBtn.x && mouseX <= buyBtn.x + buyBtn.w && mouseY >= buyBtn.y && mouseY <= buyBtn.y + buyBtn.h);

        this.modalGfx.lineStyle(1.5, canAfford ? 0x06d6a0 : 0x6c757d, 0.9);
        this.modalGfx.beginFill(canAfford ? (isHover ? 0x00b4d8 : 0x06d6a0) : 0x332a4d, 0.95);
        this.modalGfx.drawRoundedRect(buyBtn.x, buyBtn.y, buyBtn.w, buyBtn.h, 6);
        this.modalGfx.endFill();

        const btnTxt = new PIXI.Text(isMax ? 'MAX LEVEL' : `BUY $${totalCost}`, {
          fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: canAfford ? 0x120d24 : 0xadb5bd
        });
        btnTxt.anchor.set(0.5);
        btnTxt.position.set(buyBtn.x + buyBtn.w / 2, buyBtn.y + buyBtn.h / 2);
        this.modalTextContainer.addChild(btnTxt);
      }
    }

    renderSdgsContent(mx, my, mw) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('🎯 Connection with SDGs & Future Roadmap (v1.0 - v1.4)', {
        fontFamily: font, fontSize: 15, fontWeight: 'bold', fill: 0x00b4d8
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const sdgs = [
        { title: 'SDG 6: CLEAN WATER AND SANITATION', desc: 'เป็นการทำให้เล็งเห็นปัญหาการระบายน้ำที่เกิดขึ้นทุกวันให้เป็นรูปธรรมและเข้าใจง่าย', color: 0x26bde2 },
        { title: 'SDG 7: AFFORDABLE AND CLEAN ENERGY', desc: 'สร้างความตระหนักถึงการใช้ไฟฟ้าอย่างประหยัด และมองหาช่องทางใหม่ๆ ในการสร้างพลังงานสะอาด (Solar Cell)', color: 0xfcc30b },
        { title: 'SDG 11: SUSTAINABLE CITIES AND COMMUNITIES', desc: 'เสริมทักษะการสร้างเมืองให้ยั่งยืนโดยใช้ความสามารถในการคิดด้วยภาพจำลอง', color: 0xfd9d24 }
      ];

      for (let i = 0; i < sdgs.length; i++) {
        const s = sdgs[i];
        const cardY = my + 62 + (i * 78);

        this.modalGfx.lineStyle(1.5, s.color, 0.45);
        this.modalGfx.beginFill(0x1a1334, 0.9);
        this.modalGfx.drawRoundedRect(mx + 20, cardY, mw - 40, 68, 8);
        this.modalGfx.endFill();

        const badgeTxt = new PIXI.Text(s.title, {
          fontFamily: font, fontSize: 12.5, fontWeight: 'bold', fill: s.color
        });
        badgeTxt.position.set(mx + 32, cardY + 10);
        this.modalTextContainer.addChild(badgeTxt);

        const descTxt = new PIXI.Text(s.desc, {
          fontFamily: font, fontSize: 11, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 65
        });
        descTxt.position.set(mx + 32, cardY + 34);
        this.modalTextContainer.addChild(descTxt);
      }

      // Feature Plan Roadmap (from POWATER CORP.pdf)
      const rmY = my + 302;
      this.modalGfx.lineStyle(1.5, 0x06d6a0, 0.45);
      this.modalGfx.beginFill(0x181232, 0.95);
      this.modalGfx.drawRoundedRect(mx + 20, rmY, mw - 40, 215, 8);
      this.modalGfx.endFill();

      const rmHeader = new PIXI.Text('🚀 Technical & Future Roadmap (Feature Plan):', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x06d6a0
      });
      rmHeader.position.set(mx + 32, rmY + 12);
      this.modalTextContainer.addChild(rmHeader);

      const roadmapText = new PIXI.Text(
        '• v1.0.0.0 (Current): 4 ด่านหลัก (Bangkok, Tokyo, Rome, Amsterdam), Repair, Day/Night, Upsize 40 หลัง\n' +
        '• v1.1 - Seasonal Update: ระบบฤดูกาล (Seasonal Weather & Energy Output)\n' +
        '• v1.2 - Save The World Update: เพิ่มเมืองใหม่ และ ระบบป่าไม้ (Forestry Carbon Sink)\n' +
        '• v1.3 - Monopoly Update: เพิ่มระบบ Gacha [ตัวละครผู้ช่วย] และ In-App Purchase เพิ่มความหมายของ In-Game Currency\n' +
        '• v1.4 - MMD (Man Made Disaster) Update: ภัยจากมนุษย์ เช่น ไฟไหม้ โลกร้อน ฯลฯ',
        { fontFamily: font, fontSize: 11.5, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 65, lineHeight: 22 }
      );
      roadmapText.position.set(mx + 32, rmY + 40);
      this.modalTextContainer.addChild(roadmapText);
    }

    renderGraceEndedContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('⚠️ หมดระยะเวลาเตรียมพร้อม (Protecting Time Ended)', {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffb703
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const msg = new PIXI.Text(
        'ครบ 2 นาทีแรกของการเตรียมโครงข่ายเมืองแล้ว!\n\n' +
        '• นับจากนี้ บ้านที่ขาดน้ำประปา ไฟฟ้า หรือท่อระบายน้ำเกิน 27 วินาที จะยื่นเรื่องร้องเรียน!\n' +
        '• หากถูกร้องเรียน เวลาสะสมเพื่อชนะ (Win Timer 5 นาที) จะถูกรีเซ็ตกลับเป็น 0:00 ทันที!\n' +
        '• ในด่าน Tokyo/Amsterdam โอกาสเกิดแผ่นดินไหว (Earthquake) จะเริ่มทำงานทุกๆ 1 นาที!\n' +
        '• หมั่นตรวจสอบและซ่อมแซมเครื่องปั๊มน้ำ/โรงไฟฟ้าที่ขึ้นไอคอนประแจสีแดง!',
        { fontFamily: font, fontSize: 13, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 50, lineHeight: 22 }
      );
      msg.position.set(mx + 25, my + 90);
      this.modalTextContainer.addChild(msg);

      const okBtn = { id: 'btn_ok', x: mx + mw / 2 - 90, y: my + mh - 65, w: 180, h: 42 };
      this.modalButtons.push(okBtn);
      const isHover = (mouseX >= okBtn.x && mouseX <= okBtn.x + okBtn.w && mouseY >= okBtn.y && mouseY <= okBtn.y + okBtn.h);

      this.modalGfx.lineStyle(2, 0x06d6a0, 1.0);
      this.modalGfx.beginFill(isHover ? 0x00b4d8 : 0x06d6a0, 1.0);
      this.modalGfx.drawRoundedRect(okBtn.x, okBtn.y, okBtn.w, okBtn.h, 8);
      this.modalGfx.endFill();

      const btnTxt = new PIXI.Text('รับทราบ! ลุยต่อ', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x120d24
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(okBtn.x + okBtn.w / 2, okBtn.y + okBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    renderGameOverContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('💀 ภารกิจล้มเหลว (GAME OVER)', {
        fontFamily: font, fontSize: 18, fontWeight: 'bold', fill: 0xe63946
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const reason = this.modalData.reason || 'เมืองเกิดวิกฤตสิ่งแวดล้อมหรือการประท้วง';
      const msg = new PIXI.Text(
        `สาเหตุ: ${reason}\n\n` +
        `• สถิติบ้านที่ดูแลสำเร็จสูงสุด: ${this.game.housesServedPeak || 0} หลัง\n` +
        `• เวลาสะสม Win Timer ล่าสุด: ${this.formatMMSS(this.game.winHoldTimer || 0)} / 05:00\n` +
        `• วันที่บริหารเมืองได้: ${(this.game.totalDaysPassed || 0) + 1} วัน\n` +
        `• ระดับมลภาวะสุดท้าย: ${(this.game.pollution || 0).toFixed(2)}\n\n` +
        `เคล็ดลับ: กดปุ่ม REPAIR [R] ทันทีที่เครื่องปั๊มเสีย และเตรียมไอเทมพิเศษในปุ่ม ITEMS [I] ให้พร้อม!`,
        { fontFamily: font, fontSize: 13, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 50, lineHeight: 22 }
      );
      msg.position.set(mx + 25, my + 90);
      this.modalTextContainer.addChild(msg);

      const restartBtn = { id: 'btn_restart', x: mx + mw / 2 - 90, y: my + mh - 65, w: 180, h: 42 };
      this.modalButtons.push(restartBtn);
      const isHover = (mouseX >= restartBtn.x && mouseX <= restartBtn.x + restartBtn.w && mouseY >= restartBtn.y && mouseY <= restartBtn.y + restartBtn.h);

      this.modalGfx.lineStyle(2, 0xe63946, 1.0);
      this.modalGfx.beginFill(isHover ? 0xff4d6d : 0xe63946, 1.0);
      this.modalGfx.drawRoundedRect(restartBtn.x, restartBtn.y, restartBtn.w, restartBtn.h, 8);
      this.modalGfx.endFill();

      const btnTxt = new PIXI.Text('เล่นใหม่อีกครั้ง (RETRY)', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffffff
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(restartBtn.x + restartBtn.w / 2, restartBtn.y + restartBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    renderVictoryContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('🏆 ภารกิจสำเร็จ! ยินดีด้วย (VICTORY)', {
        fontFamily: font, fontSize: 18, fontWeight: 'bold', fill: 0x06d6a0
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const curLvl = this.game.currentLevel ? (this.game.currentLevel.name || 'Bangkok') : 'City';
      const msg = new PIXI.Text(
        `ยอดเยี่ยมมาก! คุณบริหาร ${curLvl} ผ่านเงื่อนไขการชนะครบสมบูรณ์!\n\n` +
        `• ดูแลบ้านมากกว่า 15 หลังให้มีน้ำและไฟใช้ตลอดเวลาครบ 5 นาทีเต็ม!\n` +
        `• ควบคุมมลภาวะต่ำกว่าเกณฑ์และรับมือภัยพิบัติได้อย่างยอดเยี่ยม\n` +
        `• ตอบสนองเป้าหมาย SDGs 6, 7 และ 11 ได้อย่างสมบูรณ์แบบ!`,
        { fontFamily: font, fontSize: 13, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 50, lineHeight: 22 }
      );
      msg.position.set(mx + 25, my + 90);
      this.modalTextContainer.addChild(msg);

      const nextBtn = { id: 'btn_next_level', x: mx + mw / 2 - 185, y: my + mh - 65, w: 175, h: 42 };
      this.modalButtons.push(nextBtn);
      const isNextHover = (mouseX >= nextBtn.x && mouseX <= nextBtn.x + nextBtn.w && mouseY >= nextBtn.y && mouseY <= nextBtn.y + nextBtn.h);

      this.modalGfx.lineStyle(2, 0x00b4d8, 1.0);
      this.modalGfx.beginFill(isNextHover ? 0x0096c7 : 0x0077b6, 1.0);
      this.modalGfx.drawRoundedRect(nextBtn.x, nextBtn.y, nextBtn.w, nextBtn.h, 8);
      this.modalGfx.endFill();

      const nextTxt = new PIXI.Text('ด่านถัดไป (NEXT LEVEL)', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffffff
      });
      nextTxt.anchor.set(0.5);
      nextTxt.position.set(nextBtn.x + nextBtn.w / 2, nextBtn.y + nextBtn.h / 2);
      this.modalTextContainer.addChild(nextTxt);

      const contBtn = { id: 'btn_cont', x: mx + mw / 2 + 10, y: my + mh - 65, w: 175, h: 42 };
      this.modalButtons.push(contBtn);
      const isHover = (mouseX >= contBtn.x && mouseX <= contBtn.x + contBtn.w && mouseY >= contBtn.y && mouseY <= contBtn.y + contBtn.h);

      this.modalGfx.lineStyle(2, 0x06d6a0, 1.0);
      this.modalGfx.beginFill(isHover ? 0x00b4d8 : 0x06d6a0, 1.0);
      this.modalGfx.drawRoundedRect(contBtn.x, contBtn.y, contBtn.w, contBtn.h, 8);
      this.modalGfx.endFill();

      const btnTxt = new PIXI.Text('เล่นต่อในด่านนี้ (CONTINUE)', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x120d24
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(contBtn.x + contBtn.w / 2, contBtn.y + contBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    switchToLevelIndex(idx) {
      const sceneNames = ['Main', 'Tokyo', 'Rome', 'Amsterdam'];
      const targetScene = sceneNames[idx] || 'Main';
      if (this.game && this.game.runtimeScene && this.game.runtimeScene.getGame) {
        const sceneStack = this.game.runtimeScene.getGame().getSceneStack();
        if (sceneStack && typeof sceneStack.replace === 'function') {
          try {
            sceneStack.replace(targetScene, true);
            return;
          } catch (e) {}
        }
      }
      if (this.game) this.game.startLevel(idx);
    }

    handleModalClick(mouseX, mouseY) {
      for (let i = 0; i < this.modalButtons.length; i++) {
        const btn = this.modalButtons[i];
        if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) {
          if (global.POWATER.soundManager) {
            global.POWATER.soundManager.playClick();
          }

          if (btn.id === 'modal_close' || btn.id === 'btn_start' || btn.id === 'btn_ok' || btn.id === 'btn_cont') {
            this.closeModal();
            return;
          }

          if (btn.id && btn.id.startsWith('select_level_')) {
            const idx = parseInt(btn.id.replace('select_level_', ''), 10);
            this.closeModal();
            this.switchToLevelIndex(idx);
            return;
          }

          if (btn.id === 'btn_next_level') {
            this.closeModal();
            const nextLvl = ((this.game.levelIndex || 0) + 1) % 4;
            this.switchToLevelIndex(nextLvl);
            return;
          }

          if (btn.id === 'btn_restart') {
            this.closeModal();
            if (this.game) this.game.startLevel(this.game.levelIndex || 0);
            return;
          }

          if (btn.id && btn.id.startsWith('buy_candle_')) {
            if (this.game && this.game.buyCandlePack) {
              this.game.buyCandlePack(btn.packId);
            }
            return;
          }

          if (btn.id === 'buy_flood_pump') {
            if (this.game && this.game.useEmergencyFloodPump) {
              this.game.useEmergencyFloodPump();
            }
            return;
          }

          if (btn.id === 'act_repair_all') {
            if (this.game && this.game.repairAllBroken) {
              this.game.repairAllBroken();
            }
            return;
          }

          if (btn.id === 'act_test_tide') {
            this.closeModal();
            if (this.game && this.game.triggerHighTide) this.game.triggerHighTide();
            return;
          }
          if (btn.id === 'act_test_quake') {
            this.closeModal();
            if (this.game && this.game.triggerEarthquake) this.game.triggerEarthquake();
            return;
          }
          if (btn.id === 'act_test_blackout') {
            this.closeModal();
            if (this.game && this.game.triggerRomeBlackout) this.game.triggerRomeBlackout();
            return;
          }
          if (btn.id === 'act_test_flood') {
            this.closeModal();
            if (this.game && this.game.triggerAmsterdamFlood) this.game.triggerAmsterdamFlood();
            return;
          }

          if (btn.id && btn.id.startsWith('buy_')) {
            const key = btn.key;
            if (this.game && this.game.buyUpgrade) {
              this.game.buyUpgrade(key);
            }
            return;
          }
        }
      }

      const mw = 680, mh = 540;
      const mx = (1280 - mw) / 2, my = (720 - mh) / 2;
      if (mouseX < mx || mouseX > mx + mw || mouseY < my || mouseY > my + mh) {
        if (this.activeModal !== 'gameover' && this.activeModal !== 'victory') {
          this.closeModal();
        }
      }
    }
  }

  global.POWATER.UIManager = UIManager;

})(typeof window !== 'undefined' ? window : globalThis);
