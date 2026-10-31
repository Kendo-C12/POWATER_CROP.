// POWATER CORP. - In-Game Drawing UI & Interaction Manager
// 100% Canvas Drawing (PixiJS Graphics & Text) - No HTML / CSS DOM elements
// Renders Top HUD, Bottom Toolbar Buttons, Hover/Click Interactions, and Modals

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
      this.activeModal = null; // null | 'briefing' | 'upgrades' | 'sdgs' | 'gameover' | 'victory' | 'grace_ended'
      this.modalData = {};
      this.hoveredButtonId = null;

      // Clean up any legacy DOM elements if they exist
      if (typeof document !== 'undefined') {
        const oldRoot = document.getElementById('powater-ui-root');
        if (oldRoot && oldRoot.remove) oldRoot.remove();
        const oldStyles = document.getElementById('powater-styles');
        if (oldStyles && oldStyles.remove) oldStyles.remove();
      }

      this.buttons = [];
      this.modalButtons = [];
      this.setupButtonLayout();
    }

    init() {
      // Clean up any legacy DOM elements from previous sessions
      if (typeof document !== 'undefined') {
        const oldRoot = document.getElementById('powater-ui-root');
        if (oldRoot && oldRoot.remove) oldRoot.remove();
        const oldStyles = document.getElementById('powater-styles');
        if (oldStyles && oldStyles.remove) oldStyles.remove();
      }
    }

    setupButtonLayout() {
      // Toolbar Button Sprites (Aligned along bottom, matching scene layout)
      const tbY = 658;
      const tbH = 48;
      const tbW = 64;

      this.buttons = [
        // Tools
        { id: 'power', objectName: 'btn_power', type: 'tool', toolId: 'power', x: 276, y: tbY, w: tbW, h: tbH, color: 0xffb703 },
        { id: 'water', objectName: 'btn_water', type: 'tool', toolId: 'water', x: 346, y: tbY, w: tbW, h: tbH, color: 0x00b4d8 },
        { id: 'sewage', objectName: 'btn_drain', type: 'tool', toolId: 'sewage', x: 416, y: tbY, w: tbW, h: tbH, color: 0x9d4edd },
        // Buildings
        { id: 'solar', objectName: 'btn_solar', type: 'build', buildId: 'solar', x: 494, y: tbY, w: tbW, h: tbH, color: 0xffd166 },
        { id: 'air_filter', objectName: 'btn_filter', type: 'build', buildId: 'air_filter', x: 564, y: tbY, w: tbW, h: tbH, color: 0x06d6a0 },
        // Game Controls
        { id: 'pause', objectName: 'btn_pause', type: 'action', action: 'togglePause', x: 642, y: tbY, w: tbW, h: tbH, color: 0xadb5bd },
        { id: 'speed', objectName: 'btn_speed', type: 'action', action: 'toggleSpeed', x: 712, y: tbY, w: tbW, h: tbH, color: 0xadb5bd },
        { id: 'upgrades', objectName: 'btn_upgrade', type: 'action', action: 'openUpgrades', x: 790, y: tbY, w: tbW, h: tbH, color: 0xffd166 },
        { id: 'sdgs', objectName: 'btn_sdgs', type: 'action', action: 'openSdgs', x: 860, y: tbY, w: tbW, h: tbH, color: 0x00b4d8 },
        { id: 'guide', objectName: 'btn_guide', type: 'action', action: 'openGuide', x: 930, y: tbY, w: tbW, h: tbH, color: 0x48cae4 }
      ];
    }

    setupPixi(container) {
      if (!container) return;
      this.container = container;

      // 1. Base Graphics Layer for Top HUD and Button Selection Glows
      this.gfx = new PIXI.Graphics();
      container.addChild(this.gfx);

      // 2. HUD Texts Container
      this.textContainer = new PIXI.Container();
      container.addChild(this.textContainer);

      // Create Top HUD Texts
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      this.txtLogo = new PIXI.Text('⚡💧 POWATER CORP.', { fontFamily: font, fontSize: 14, fontWeight: '900', fill: 0x00b4d8 });
      this.txtLogo.position.set(16, 12);
      this.textContainer.addChild(this.txtLogo);

      this.txtMoney = new PIXI.Text('💰 $120', { fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffd166 });
      this.txtMoney.position.set(240, 12);
      this.textContainer.addChild(this.txtMoney);

      this.txtServed = new PIXI.Text('🏘️ 0 / 0', { fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x06d6a0 });
      this.txtServed.position.set(380, 12);
      this.textContainer.addChild(this.txtServed);

      this.txtPollution = new PIXI.Text('☢️ 0.0 / 5.0', { fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: 0xffb703 });
      this.txtPollution.position.set(510, 13);
      this.textContainer.addChild(this.txtPollution);

      this.txtTime = new PIXI.Text('⏱️ Mon Day 1 (12:00)', { fontFamily: font, fontSize: 12, fontWeight: '600', fill: 0xadb5bd });
      this.txtTime.position.set(780, 13);
      this.textContainer.addChild(this.txtTime);

      this.txtStrikes = new PIXI.Text('⚠️ STRIKES:', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0xe63946 });
      this.txtStrikes.position.set(970, 13);
      this.textContainer.addChild(this.txtStrikes);

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

    updateHUD() {
      if (!this.game) return;

      // Update Top HUD Texts
      if (this.txtMoney) {
        this.txtMoney.text = `💰 $${Math.floor(this.game.money)}`;
      }
      if (this.txtServed) {
        const served = this.game.houses.filter(h => h.hasPower && h.hasWater).length;
        this.txtServed.text = `🏘️ ${served} / ${this.game.houses.length}`;
      }
      if (this.txtPollution) {
        const p = this.game.pollution.toFixed(1);
        const maxP = this.game.currentLevel ? this.game.currentLevel.maxPollution.toFixed(1) : '5.0';
        this.txtPollution.text = `☢️ ${p} / ${maxP}`;
      }
      if (this.txtTime) {
        const dName = this.game.dayNames ? this.game.dayNames[this.game.dayIndex] : 'Day';
        const dNum = (this.game.totalDaysPassed || 0) + 1;
        const hr = Math.floor(this.game.dayTime || 12);
        const min = Math.floor(((this.game.dayTime || 12) % 1) * 60);
        const timeStr = `${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        this.txtTime.text = `⏱️ ${dName} D${dNum} (${timeStr})`;
      }

      // Update Pause & Speed Button Labels if text elements exist
      if (this.buttonTexts) {
        if (this.buttonTexts['pause'] && this.buttonTexts['pause'].title) {
          this.buttonTexts['pause'].title.text = this.game.isPaused ? 'PLAY' : 'PAUSE';
        }
        if (this.buttonTexts['speed'] && this.buttonTexts['speed'].title) {
          this.buttonTexts['speed'].title.text = (this.game.gameSpeed || 1) === 2 ? '2X' : '1X';
        }
        if (this.buttonTexts['audio'] && this.buttonTexts['audio'].title && global.POWATER.soundManager) {
          this.buttonTexts['audio'].title.text = global.POWATER.soundManager.muted ? 'MUTED' : 'AUDIO';
        }
      }
    }

    update(dt, mouseX, mouseY, isMouseDown, wasMouseDown) {
      this.updateHUD();

      // 0. Sync button positions from GDevelop scene objects if moved by user
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
        clickConsumed = true; // Modal covers the game screen
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

      // 3. Render Top HUD & Button Selection Glows
      this.renderToolbarAndHUD(mouseX, mouseY);

      // Check if mouse is within Top HUD (y < 44) or Bottom Toolbar (y > 644)
      const inUIZone = mouseY < 44 || (mouseY >= 646 && mouseX >= 250 && mouseX <= 1010);
      return clickConsumed || inUIZone;
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
          case 'togglePause':
            if (this.game) {
              if (typeof this.game.togglePause === 'function') {
                this.game.togglePause();
              } else {
                this.game.isPaused = !this.game.isPaused;
              }
            }
            break;
          case 'toggleSpeed':
            if (this.game) {
              if (typeof this.game.toggleSpeed === 'function') {
                this.game.toggleSpeed();
              } else {
                this.game.gameSpeed = (this.game.gameSpeed === 1.0) ? 2.0 : 1.0;
              }
            }
            break;
          case 'openUpgrades':
            this.showUpgradesModal();
            break;
          case 'openSdgs':
            this.showSdgsModal();
            break;
          case 'toggleAudio':
            if (global.POWATER.soundManager) {
              global.POWATER.soundManager.toggleMute();
            }
            break;
          case 'openGuide':
            this.showLevelBriefing(this.game.currentLevel);
            break;
        }
      }
    }

    renderToolbarAndHUD(mouseX, mouseY) {
      if (!this.gfx) return;
      const g = this.gfx;
      g.clear();

      // --- TOP HUD BAR ---
      // Background bar
      g.beginFill(0x120d24, 0.94);
      g.drawRect(0, 0, 1280, 44);
      g.endFill();

      // Bottom border line
      g.lineStyle(1.5, 0x48cae4, 0.35);
      g.moveTo(0, 44);
      g.lineTo(1280, 44);

      // Top HUD Stat Pill Outlines
      const drawStatPill = (x, y, w, h) => {
        g.lineStyle(1, 0x48cae4, 0.25);
        g.beginFill(0x1a1334, 0.85);
        g.drawRoundedRect(x, y, w, h, 6);
        g.endFill();
      };

      drawStatPill(10, 6, 210, 32);  // Logo
      drawStatPill(230, 6, 130, 32); // Budget
      drawStatPill(370, 6, 120, 32); // Served
      drawStatPill(500, 6, 250, 32); // Pollution
      drawStatPill(760, 6, 190, 32); // Time
      drawStatPill(960, 6, 180, 32); // Strikes

      // Pollution Bar Draw
      const curP = this.game.pollution || 0;
      const maxP = this.game.currentLevel ? this.game.currentLevel.maxPollution : 5.0;
      const pct = Math.min(1.0, Math.max(0.0, curP / maxP));
      const barX = 615, barY = 18, barW = 120, barH = 8;

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

      // Complaint Pips (Strikes)
      const maxComplaints = CONFIG.MAX_COMPLAINTS || 3;
      const curComplaints = this.game.complaints || 0;
      for (let i = 0; i < maxComplaints; i++) {
        const pipX = 1060 + (i * 22);
        const pipY = 12;
        const struck = i < curComplaints;
        g.lineStyle(1, struck ? 0xff4d6d : 0xffffff, struck ? 1.0 : 0.3);
        g.beginFill(struck ? 0xe63946 : 0x221a44, 0.95);
        g.drawRoundedRect(pipX, pipY, 18, 18, 4);
        g.endFill();
      }

      // --- RENDER ACTIVE & HOVER SELECTION GLOWS AROUND BUTTON SPRITES ---
      for (let i = 0; i < this.buttons.length; i++) {
        const btn = this.buttons[i];
        const isHovered = (this.hoveredButtonId === btn.id);
        const isActive = (btn.toolId && this.game.activeTool === btn.toolId) ||
                         (btn.buildId && this.game.activeTool === btn.buildId) ||
                         (btn.id === 'pause' && this.game.isPaused) ||
                         (btn.id === 'speed' && this.game.gameSpeed === 2.0);

        if (isActive) {
          // Bright glowing outline around active tool
          g.lineStyle(3.5, btn.color || 0x00b4d8, 1.0);
          g.drawRoundedRect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 8);
          // Highlight underlay
          g.lineStyle(0);
          g.beginFill(btn.color || 0x00b4d8, 0.18);
          g.drawRoundedRect(btn.x, btn.y, btn.w, btn.h, 6);
          g.endFill();
        } else if (isHovered) {
          // Subtle glow on hover
          g.lineStyle(2, 0x48cae4, 0.85);
          g.drawRoundedRect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 8);
        }
      }
    }

    // --- MODAL RENDERING & INTERACTION (100% IN-GAME DRAWING) ---

    showLevelBriefing(level) {
      this.activeModal = 'briefing';
      this.modalData = { level: level || this.game.currentLevel };
      if (this.modalContainer) this.modalContainer.visible = true;
    }

    showUpgradesModal() {
      this.activeModal = 'upgrades';
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

      // 1. Semi-transparent Backdrop
      g.beginFill(0x0a0714, 0.82);
      g.drawRect(0, 0, 1280, 720);
      g.endFill();

      // 2. Centered Modal Box
      const mw = 620;
      const mh = 500;
      const mx = (1280 - mw) / 2;
      const my = (720 - mh) / 2;

      g.lineStyle(2, 0x00b4d8, 0.65);
      g.beginFill(0x150f2c, 0.98);
      g.drawRoundedRect(mx, my, mw, mh, 14);
      g.endFill();

      // Header Bar
      g.lineStyle(0);
      g.beginFill(0x00b4d8, 0.15);
      g.drawRoundedRect(mx + 2, my + 2, mw - 4, 50, 12);
      g.endFill();
      g.lineStyle(1.5, 0x48cae4, 0.3);
      g.moveTo(mx, my + 52);
      g.lineTo(mx + mw, my + 52);

      // Close Button [ X ]
      const closeBtn = { id: 'modal_close', x: mx + mw - 48, y: my + 10, w: 36, h: 32 };
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

      // 3. Render Modal Specific Content
      if (this.activeModal === 'briefing') {
        this.renderBriefingContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'upgrades') {
        this.renderUpgradesContent(mx, my, mw, mh, mouseX, mouseY);
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

      const title = new PIXI.Text(`📋 ภารกิจ: ${lvl.thaiName || 'กรุงเทพมหานคร'}`, {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0x00b4d8
      });
      title.position.set(mx + 20, my + 15);
      this.modalTextContainer.addChild(title);

      const briefingTxt = new PIXI.Text(
        `ยินดีต้อนรับสู่ ${lvl.name || 'Bangkok'}!\n\n` +
        `• แม่น้ำเจ้าพระยาแบ่งเมืองออกเป็นสองฝั่ง\n` +
        `• ลากสายไฟ (สีเหลือง) จากโรงไฟฟ้าหรือโซล่าร์ไปยังบ้านประชาชน\n` +
        `• ลากท่อน้ำดี (สีฟ้า) จากเครื่องสูบน้ำริมแม่น้ำไปยังบ้าน\n` +
        `• เมื่อบ้านได้รับน้ำ จะเกิดน้ำเสียขึ้นมา! ลากท่อระบายน้ำ (สีม่วง) ไประบายที่ท่อบำบัดริมน้ำ\n` +
        `• ควบคุมมลภาวะไม่ให้เกินเกณฑ์ (${lvl.maxPollution || 5.0}) และดูแลไม่ให้เกิดการประท้วง!\n\n` +
        `Amigo Quote: "Ciao! Connect utilities freely across the river and from house to house!"`,
        { fontFamily: font, fontSize: 13, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 50, lineHeight: 22 }
      );
      briefingTxt.position.set(mx + 25, my + 75);
      this.modalTextContainer.addChild(briefingTxt);

      // Start Button
      const startBtn = { id: 'btn_start', x: mx + mw / 2 - 90, y: my + mh - 65, w: 180, h: 42 };
      this.modalButtons.push(startBtn);
      const isHover = (mouseX >= startBtn.x && mouseX <= startBtn.x + startBtn.w && mouseY >= startBtn.y && mouseY <= startBtn.y + startBtn.h);

      this.modalGfx.lineStyle(2, 0x00b4d8, 1.0);
      this.modalGfx.beginFill(isHover ? 0x0096c7 : 0x00b4d8, 1.0);
      this.modalGfx.drawRoundedRect(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 8);
      this.modalGfx.endFill();

      const btnTxt = new PIXI.Text('เริ่มปฏิบัติการ! (START)', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffffff
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    renderUpgradesContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('🔧 ศูนย์อัปเกรดนวัตกรรมเมือง (Innovation Center)', {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffd166
      });
      title.position.set(mx + 20, my + 15);
      this.modalTextContainer.addChild(title);

      const upgrades = [
        { key: 'elec_cap', name: '⚡ เพิ่มกำลังไฟฟ้า (Power Capacity)', desc: 'เพิ่มประสิทธิภาพสายส่งและโรงไฟฟ้า +20%', cost: 50 },
        { key: 'water_cap', name: '💧 ระบบจ่ายน้ำดี (Water Capacity)', desc: 'เพิ่มกำลังปั๊มน้ำสะอาด +25%', cost: 50 },
        { key: 'waste_cap', name: '🟣 ระบบบำบัดน้ำเสีย (Sewage Capacity)', desc: 'เพิ่มอัตราการบำบัดน้ำเสีย +25%', cost: 60 },
        { key: 'poll_red', name: '🍃 นวัตกรรมลดมลพิษ (Green Tech)', desc: 'ลดการปล่อยมลภาวะโดยรวมทุกแหล่ง -15%', cost: 75 }
      ];

      for (let i = 0; i < upgrades.length; i++) {
        const up = upgrades[i];
        const cardY = my + 70 + (i * 92);
        const curLvl = (this.game.upgradeLevels && this.game.upgradeLevels[up.key]) || 0;
        const totalCost = Math.round(up.cost * Math.pow(1.5, curLvl));
        const canAfford = this.game.money >= totalCost;

        // Card Box
        this.modalGfx.lineStyle(1, 0x48cae4, 0.25);
        this.modalGfx.beginFill(0x1c1538, 0.9);
        this.modalGfx.drawRoundedRect(mx + 20, cardY, mw - 40, 80, 8);
        this.modalGfx.endFill();

        const nameTxt = new PIXI.Text(`${up.name} (Lv. ${curLvl})`, {
          fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffd166
        });
        nameTxt.position.set(mx + 35, cardY + 12);
        this.modalTextContainer.addChild(nameTxt);

        const descTxt = new PIXI.Text(up.desc, {
          fontFamily: font, fontSize: 11, fill: 0xadb5bd
        });
        descTxt.position.set(mx + 35, cardY + 38);
        this.modalTextContainer.addChild(descTxt);

        // Buy Button
        const buyBtn = { id: `buy_${up.key}`, key: up.key, cost: totalCost, x: mx + mw - 165, y: cardY + 22, w: 125, h: 36 };
        this.modalButtons.push(buyBtn);
        const isHover = (mouseX >= buyBtn.x && mouseX <= buyBtn.x + buyBtn.w && mouseY >= buyBtn.y && mouseY <= buyBtn.y + buyBtn.h);

        this.modalGfx.lineStyle(1.5, canAfford ? 0x06d6a0 : 0x6c757d, 0.9);
        this.modalGfx.beginFill(canAfford ? (isHover ? 0x00b4d8 : 0x06d6a0) : 0x332a4d, 0.95);
        this.modalGfx.drawRoundedRect(buyBtn.x, buyBtn.y, buyBtn.w, buyBtn.h, 6);
        this.modalGfx.endFill();

        const btnTxt = new PIXI.Text(`BUY $${totalCost}`, {
          fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: canAfford ? 0x120d24 : 0xadb5bd
        });
        btnTxt.anchor.set(0.5);
        btnTxt.position.set(buyBtn.x + buyBtn.w / 2, buyBtn.y + buyBtn.h / 2);
        this.modalTextContainer.addChild(btnTxt);
      }
    }

    renderSdgsContent(mx, my, mw, mh) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('🎯 เป้าหมายการพัฒนาที่ยั่งยืน (SDGs Impact)', {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0x00b4d8
      });
      title.position.set(mx + 20, my + 15);
      this.modalTextContainer.addChild(title);

      const sdgs = [
        { num: '6', title: 'SDG 6: น้ำสะอาดและสุขาภิบาล (Clean Water & Sanitation)', desc: 'จ่ายน้ำสะอาดให้ทุกครัวเรือนและบำบัดน้ำเสียก่อนปล่อยลงสู่แม่น้ำเจ้าพระยา', color: 0x26bde2 },
        { num: '7', title: 'SDG 7: พลังงานสะอาดที่ทุกคนเข้าถึงได้ (Affordable & Clean Energy)', desc: 'ขยายการใช้งานพลังงานแสงอาทิตย์ (Solar Farm) เพื่อลดการพึ่งพาพลังงานฟอสซิล', color: 0xfcc30b },
        { num: '11', title: 'SDG 11: เมืองและชุมชนที่ยั่งยืน (Sustainable Cities)', desc: 'จัดการระบบสาธารณูปโภคให้ประชาชนมีความสุข และไม่มีการประท้วงเกิดขึ้น', color: 0xfd9d24 },
        { num: '13', title: 'SDG 13: ปฏิบัติการอย่างเร่งด่วนเพื่อต่อสู้การเปลี่ยนแปลงสภาพภูมิอากาศ', desc: 'ติดตั้งเครื่องฟอกอากาศ (Air Filter) เพื่อดูดซับมลพิษและลดค่าคาร์บอนในเมือง', color: 0x3f7e44 }
      ];

      for (let i = 0; i < sdgs.length; i++) {
        const s = sdgs[i];
        const cardY = my + 72 + (i * 96);

        this.modalGfx.lineStyle(1.5, s.color, 0.4);
        this.modalGfx.beginFill(0x1a1334, 0.9);
        this.modalGfx.drawRoundedRect(mx + 20, cardY, mw - 40, 84, 8);
        this.modalGfx.endFill();

        const badgeTxt = new PIXI.Text(s.title, {
          fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: s.color
        });
        badgeTxt.position.set(mx + 35, cardY + 12);
        this.modalTextContainer.addChild(badgeTxt);

        const descTxt = new PIXI.Text(s.desc, {
          fontFamily: font, fontSize: 11, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 70, lineHeight: 18
        });
        descTxt.position.set(mx + 35, cardY + 38);
        this.modalTextContainer.addChild(descTxt);
      }
    }

    renderGraceEndedContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = new PIXI.Text('⚠️ หมดระยะเวลาเตรียมพร้อม (Grace Period Ended)', {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffb703
      });
      title.position.set(mx + 20, my + 15);
      this.modalTextContainer.addChild(title);

      const msg = new PIXI.Text(
        'ครบ 2 นาทีแรกของการก่อสร้างแล้ว!\n\n' +
        '• นับจากนี้เป็นต้นไป ประชาชนที่ขาดแคลนไฟฟ้าหรือน้ำประปาเกิน 27 วินาที จะเริ่มร้องเรียน!\n' +
        '• หากมีข้อร้องเรียนสะสมครบ 3 ครั้ง ประชาชนจะประท้วงหยุดงานทันที (Game Over)\n' +
        '• รีบตรวจเช็คบ้านทุกหลังให้ได้รับทั้ง ไฟฟ้า น้ำประปา และท่อระบายน้ำ อย่างทั่วถึง!',
        { fontFamily: font, fontSize: 13, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 50, lineHeight: 22 }
      );
      msg.position.set(mx + 25, my + 90);
      this.modalTextContainer.addChild(msg);

      const okBtn = { id: 'btn_ok', x: mx + mw / 2 - 90, y: my + mh - 70, w: 180, h: 42 };
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
      title.position.set(mx + 20, my + 15);
      this.modalTextContainer.addChild(title);

      const reason = this.modalData.reason || 'เมืองเกิดวิกฤตสิ่งแวดล้อมหรือการประท้วง';
      const msg = new PIXI.Text(
        `สาเหตุ: ${reason}\n\n` +
        `• สถิติบ้่านที่ดูแลสำเร็จสูงสุด: ${this.game.housesServedPeak || 0} หลัง\n` +
        `• วันที่บริหารเมืองได้: ${(this.game.totalDaysPassed || 0) + 1} วัน\n` +
        `• ระดับมลภาวะสุดท้าย: ${(this.game.pollution || 0).toFixed(2)}\n\n` +
        `อย่าเพิ่งท้อถอย! ลองวางแผนระบบท่อน้ำดี สายส่งไฟฟ้า และเครื่องฟอกอากาศให้สมดุลขึ้นในรอบถัดไป`,
        { fontFamily: font, fontSize: 13, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 50, lineHeight: 22 }
      );
      msg.position.set(mx + 25, my + 90);
      this.modalTextContainer.addChild(msg);

      const restartBtn = { id: 'btn_restart', x: mx + mw / 2 - 90, y: my + mh - 70, w: 180, h: 42 };
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
      title.position.set(mx + 20, my + 15);
      this.modalTextContainer.addChild(title);

      const msg = new PIXI.Text(
        `ยอดเยี่ยมมาก! คุณบริหารเมืองครบเป้าหมายอย่างยั่งยืน\n\n` +
        `• ประชาชนเข้าถึงน้ำสะอาดและไฟฟ้า 100%\n` +
        `• ควบคุมมลภาวะต่ำกว่าเกณฑ์ตลอดระยะเวลา\n` +
        `• ตอบสนองเป้าหมาย SDGs 6, 7, 11 และ 13 ได้อย่างสมบูรณ์แบบ!`,
        { fontFamily: font, fontSize: 13, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 50, lineHeight: 22 }
      );
      msg.position.set(mx + 25, my + 90);
      this.modalTextContainer.addChild(msg);

      const contBtn = { id: 'btn_cont', x: mx + mw / 2 - 90, y: my + mh - 70, w: 180, h: 42 };
      this.modalButtons.push(contBtn);
      const isHover = (mouseX >= contBtn.x && mouseX <= contBtn.x + contBtn.w && mouseY >= contBtn.y && mouseY <= contBtn.y + contBtn.h);

      this.modalGfx.lineStyle(2, 0x06d6a0, 1.0);
      this.modalGfx.beginFill(isHover ? 0x00b4d8 : 0x06d6a0, 1.0);
      this.modalGfx.drawRoundedRect(contBtn.x, contBtn.y, contBtn.w, contBtn.h, 8);
      this.modalGfx.endFill();

      const btnTxt = new PIXI.Text('เล่นต่อในโหมดเสรี (CONTINUE)', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x120d24
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(contBtn.x + contBtn.w / 2, contBtn.y + contBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
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

          if (btn.id === 'btn_restart') {
            this.closeModal();
            if (this.game) this.game.startLevel(this.game.currentLevelIndex || 0);
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

      // Clicking outside modal box closes it
      const mw = 620, mh = 500;
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
