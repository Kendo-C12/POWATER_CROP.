// POWATER CORP. v1.0.2.0 - In-Game UI, Interactive Fast Tutorial Coach & Feature Video Player
// Includes clickable [▶] Video Help icons above every feature button, a 60 FPS procedural
// Feature Video Player modal, and an interactive Fast Scene Tutorial coach bar.

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
      this.activeModal = null; // null | 'briefing' | 'upgrades' | 'special_items' | 'sdgs' | 'feature_video' | 'gameover' | 'victory' | 'grace_ended'
      this.modalData = {};
      this.showSdg15Story = false;
      this.hoveredButtonId = null;
      this.hoveredVideoBtnId = null;

      // Feature Video Player state
      this.videoTime = 0.0;
      this.videoDuration = 6.0;
      this.videoPaused = false;

      this.buttons = [];
      this.videoButtons = [];
      this.tutorialButtons = [];
      this.modalButtons = [];
      this.textPools = { modal: [], tutorial: [], floating: [] };
      this.textPoolIdx = { modal: 0, tutorial: 0, floating: 0 };
      this.setupButtonLayout();
    }

    resetTextPool(poolName) {
      this.textPoolIdx[poolName] = 0;
    }

    makeText(str, style, poolName = 'modal') {
      const s = String(str == null ? '' : str);
      const st = Object.assign({ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }, style);
      if (typeof PIXI !== 'undefined' && PIXI.Text) {
        PIXI.Text.defaultResolution = 4;
        PIXI.Text.defaultAutoResolution = false;
      }
      if (!poolName || !this.textPools[poolName]) {
        const tx = new PIXI.Text(s, st);
        tx.resolution = 4;
        if ('roundPixels' in tx) tx.roundPixels = true;
        return tx;
      }
      const pool = this.textPools[poolName];
      const idx = this.textPoolIdx[poolName]++;
      let tx = pool[idx];
      if (!tx) {
        tx = new PIXI.Text(s, st);
        tx.resolution = 4;
        if ('roundPixels' in tx) tx.roundPixels = true;
        pool.push(tx);
      } else {
        tx.resolution = 4;
        if ('roundPixels' in tx) tx.roundPixels = true;
        tx.anchor.set(0, 0);
        tx.alpha = 1.0;
        tx.style = st;
        if (tx.text !== s) tx.text = s;
      }
      return tx;
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

      // 11 Toolbar Buttons (DELETE is vector-only) matching the GDevelop PNG Sprite instances on the dock tray
      this.buttons = [
        { id: 'power', objectName: 'btn_power', title: '⚡ POWER', sub: '[1] WIRE', videoKey: 'power', type: 'tool', toolId: 'power', x: 238, y: tbY, w: tbW, h: tbH, color: 0xffb703 },
        { id: 'water', objectName: 'btn_water', title: '💧 WATER', sub: '[2] PIPE', videoKey: 'water', type: 'tool', toolId: 'water', x: 312, y: tbY, w: tbW, h: tbH, color: 0x00b4d8 },
        { id: 'sewage', objectName: 'btn_drain', title: '🧪 DRAIN', sub: '[3] SEWAGE', videoKey: 'sewage', type: 'tool', toolId: 'sewage', x: 386, y: tbY, w: tbW, h: tbH, color: 0x9d4edd },
        { id: 'delete', title: '🗑️ DELETE', sub: '[X] WIRE', type: 'tool', toolId: 'delete', x: 460, y: tbY, w: tbW, h: tbH, color: 0xadb5bd },
        { id: 'air_filter', objectName: 'btn_filter', title: '🍃 FILTER', sub: '[4] $40', videoKey: 'air_filter', type: 'build', buildId: 'build_air_filter', x: 534, y: tbY, w: tbW, h: tbH, color: 0x06d6a0 },
        { id: 'repair', objectName: 'btn_repair', title: '🔧 REPAIR', sub: '[R] FIX', videoKey: 'repair', type: 'action', action: 'repairTool', x: 608, y: tbY, w: tbW, h: tbH, color: 0xff5a5f },
        { id: 'special', objectName: 'btn_special', title: '🧪 TEST', sub: '[I] LAB', videoKey: 'special', type: 'action', action: 'openSpecialItems', x: 682, y: tbY, w: tbW, h: tbH, color: 0x06d6a0 },
        { id: 'pause', objectName: 'btn_pause', title: '⏸️ PAUSE', sub: '[SPACE]', type: 'action', action: 'togglePause', x: 756, y: tbY, w: tbW, h: tbH, color: 0xadb5bd },
        { id: 'speed', objectName: 'btn_speed', title: '⏩ SPEED', sub: '1X / 2X', type: 'action', action: 'toggleSpeed', x: 830, y: tbY, w: tbW, h: tbH, color: 0xadb5bd },
        { id: 'upgrades', objectName: 'btn_upgrade', title: '⬆️ TECH', sub: '[U] UPGRD', videoKey: 'upgrades', type: 'action', action: 'openUpgrades', x: 904, y: tbY, w: tbW, h: tbH, color: 0xffd166 },
        { id: 'guide', objectName: 'btn_guide', title: '📖 LEVELS', sub: 'BRIEFING', videoKey: 'guide', type: 'action', action: 'openGuide', x: 978, y: tbY, w: tbW, h: tbH, color: 0x48cae4 },
        { id: 'logo', type: 'action', action: 'openGuide', x: 8, y: 6, w: 185, h: 32 }
      ];

      // Clickable Video Demo Icons [▶] directly ABOVE each feature button (y = 626)
      this.videoButtons = [];
      for (let i = 0; i < this.buttons.length; i++) {
        const b = this.buttons[i];
        if (b.videoKey) {
          this.videoButtons.push({
            id: `vid_${b.videoKey}`,
            videoKey: b.videoKey,
            parentBtnId: b.id,
            x: b.x + 14,
            y: 626,
            w: 36,
            h: 24,
            color: b.color || 0x00b4d8
          });
        }
      }
    }

    setupPixi(container) {
      if (!container) return;
      this.container = container;
      if (typeof container.removeChildren === 'function') {
        container.removeChildren();
      }

      // 1. Base Graphics Layer for Top HUD, Tutorial Coach Bar, and Button Selection Glows
      this.gfx = new PIXI.Graphics();
      container.addChild(this.gfx);

      // 2. HUD Texts & Real PNG Icons Container
      this.textContainer = new PIXI.Container();
      container.addChild(this.textContainer);

      try {
        this.sprLogo = new PIXI.Sprite(PIXI.Texture.from('logo_powater.png'));
        this.sprLogo.width = 24;
        this.sprLogo.height = 24;
        this.sprLogo.position.set(14, 10);
        this.textContainer.addChild(this.sprLogo);

        this.sprDayNight = new PIXI.Sprite(PIXI.Texture.from('icon_day.png'));
        this.sprDayNight.width = 22;
        this.sprDayNight.height = 22;
        this.sprDayNight.position.set(842, 11);
        this.textContainer.addChild(this.sprDayNight);
      } catch (e) {}

      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      this.txtLogo = this.makeText('BANGKOK v1.0', { fontFamily: font, fontSize: 12, fontWeight: '900', fill: 0x00b4d8 }, null);
      this.txtLogo.position.set(42, 14);
      this.textContainer.addChild(this.txtLogo);

      this.txtMoney = this.makeText('💰 $150', { fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffd166 }, null);
      this.txtMoney.position.set(206, 13);
      this.textContainer.addChild(this.txtMoney);

      this.txtServed = this.makeText('🏘️ 0/3 (Up:0)', { fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: 0x06d6a0 }, null);
      this.txtServed.position.set(322, 14);
      this.textContainer.addChild(this.txtServed);

      this.txtWinTimer = this.makeText('🏆 WIN: 00:00/05:00 (>15)', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0x90e0ef }, null);
      this.txtWinTimer.position.set(472, 14);
      this.textContainer.addChild(this.txtWinTimer);

      this.txtPollution = this.makeText('☢️ 0.0/6.0', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0xffb703 }, null);
      this.txtPollution.position.set(666, 14);
      this.textContainer.addChild(this.txtPollution);

      this.txtTime = this.makeText('☀️ DAY | MON D1', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0xe9ecef }, null);
      this.txtTime.position.set(868, 14);
      this.textContainer.addChild(this.txtTime);

      this.txtStrikes = this.makeText('⚠️ STRIKES:', { fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0xe63946 }, null);
      this.txtStrikes.position.set(1062, 14);
      this.textContainer.addChild(this.txtStrikes);

      this.txtDisasterBanner = this.makeText('', { fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: 0xffffff }, null);
      this.txtDisasterBanner.anchor.set(0.5, 0.5);
      this.txtDisasterBanner.position.set(640, 62);
      this.textContainer.addChild(this.txtDisasterBanner);

      // 2.5 High-DPI Crisp Vector Button & Video Badge Labels (4x Retina resolution)
      this.toolbarLabelContainer = new PIXI.Container();
      container.addChild(this.toolbarLabelContainer);
      for (let i = 0; i < this.buttons.length; i++) {
        const b = this.buttons[i];
        if (!b.title) continue;
        b._txtTitle = this.makeText(b.title, { fontFamily: font, fontSize: 10.5, fontWeight: '900', fill: 0xffffff }, null);
        b._txtTitle.anchor.set(0.5, 0.5);
        this.toolbarLabelContainer.addChild(b._txtTitle);

        b._txtSub = this.makeText(b.sub || '', { fontFamily: font, fontSize: 9, fontWeight: 'bold', fill: b.color || 0x48cae4 }, null);
        b._txtSub.anchor.set(0.5, 0.5);
        this.toolbarLabelContainer.addChild(b._txtSub);
      }
      for (let i = 0; i < this.videoButtons.length; i++) {
        const vb = this.videoButtons[i];
        vb._txtVid = this.makeText('▶ VID', { fontFamily: font, fontSize: 9, fontWeight: '900', fill: 0xffd166 }, null);
        vb._txtVid.anchor.set(0.5, 0.5);
        this.toolbarLabelContainer.addChild(vb._txtVid);
      }

      // Tutorial Coach Dynamic Texts Container
      this.tutorialUIContainer = new PIXI.Container();
      container.addChild(this.tutorialUIContainer);

      // Floating Texts Container
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
        if (this.game.isTutorialMode) {
          this.txtLogo.text = '🎓 TUTORIAL v1.0';
        } else {
          const rawName = this.game.currentLevel ? (this.game.currentLevel.name || 'Bangkok') : 'POWATER';
          const cleanCity = rawName.replace(/^\d+\.\s*/, '').split(',')[0].toUpperCase();
          this.txtLogo.text = `${cleanCity} v1.0`;
        }
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
        const startIn = (CONFIG.POLLUTION_START_DELAY_SECONDS || 180) - (this.game.levelElapsedTime || 0);
        if (startIn > 0 && !this.game.isTutorialMode) {
          const m = Math.floor(startIn / 60), sec = String(Math.floor(startIn % 60)).padStart(2, '0');
          this.txtPollution.text = `☢️ เริ่มใน ${m}:${sec}`;
        } else {
          this.txtPollution.text = `☢️ ${p}/${maxP}`;
        }
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
        this.txtDisasterBanner.text = this.game.isTutorialMode ? '' : (this.game.activeDisasterText || '');
      }
    }

    update(dt, mouseX, mouseY, isMouseDown, wasMouseDown) {
      this.updateHUD();
      if (!this.videoPaused) {
        this.videoTime = (this.videoTime + dt) % this.videoDuration;
      }

      // Sync button positions from GDevelop scene objects & hide static bitmap duplicates so 4K vector buttons have zero ghosting
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
              if (typeof obj.hide === 'function') obj.hide(true);
            }
          }
        }
        const vidObjs = this.game.runtimeScene.getObjects('btn_video_help');
        if (vidObjs && vidObjs.length > 0) {
          for (let j = 0; j < vidObjs.length; j++) {
            if (vidObjs[j] && typeof vidObjs[j].hide === 'function') vidObjs[j].hide(true);
          }
        }
        // Keep video icons aligned right above their parent buttons
        for (let i = 0; i < this.videoButtons.length; i++) {
          const vb = this.videoButtons[i];
          const parent = this.buttons.find(b => b.id === vb.parentBtnId);
          if (parent) {
            vb.x = parent.x + (parent.w - vb.w) / 2;
            vb.y = parent.y - 28;
          }
        }
      }

      const justClicked = isMouseDown && !wasMouseDown;
      let clickConsumed = false;

      // 1. Check Interactions with Modal if Open
      if (this.activeModal) {
        this.renderToolbarAndHUD(mouseX, mouseY);
        clickConsumed = true;
        if (justClicked) {
          this.handleModalClick(mouseX, mouseY);
        }
        this.renderModal(mouseX, mouseY);
        return true;
      }

      // 2. Check Clicks on Fast Tutorial Coach Bar Buttons if in Tutorial Mode
      if (this.game && this.game.isTutorialMode && justClicked) {
        for (let i = 0; i < this.tutorialButtons.length; i++) {
          const tb = this.tutorialButtons[i];
          if (mouseX >= tb.x && mouseX <= tb.x + tb.w && mouseY >= tb.y && mouseY <= tb.y + tb.h) {
            if (global.POWATER.soundManager) global.POWATER.soundManager.playClick();
            if (tb.id === 'tut_auto_step') {
              this.game.skipTutorialStep();
            } else if (tb.id === 'tut_start_bangkok') {
              this.switchToLevelIndex(0);
            }
            return true;
          }
        }
      }

      // 3. Check Hover and Clicks on Video Demo Icons [▶] Above Feature Buttons
      let hoveredVidBtn = null;
      for (let i = 0; i < this.videoButtons.length; i++) {
        const vb = this.videoButtons[i];
        if (mouseX >= vb.x && mouseX <= vb.x + vb.w && mouseY >= vb.y && mouseY <= vb.y + vb.h) {
          hoveredVidBtn = vb;
          break;
        }
      }
      this.hoveredVideoBtnId = hoveredVidBtn ? hoveredVidBtn.id : null;

      if (hoveredVidBtn && justClicked) {
        if (global.POWATER.soundManager) global.POWATER.soundManager.playClick();
        this.showFeatureVideoModal(hoveredVidBtn.videoKey);
        return true;
      }

      // 4. Check Hover and Clicks on Toolbar & HUD Buttons
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

      // 5. Render Top HUD, Video Icons, Tutorial Coach Bar, & Floating Texts
      this.renderToolbarAndHUD(mouseX, mouseY);
      this.renderTutorialCoachBar(mouseX, mouseY);
      this.renderFloatingTexts();

      const inUIZone = mouseY < 44 || (mouseY >= 624 && mouseX >= 195 && mouseX <= 1065);
      return clickConsumed || inUIZone;
    }

    renderTutorialCoachBar(mouseX, mouseY) {
      if (!this.tutorialUIContainer) return;
      this.tutorialUIContainer.removeChildren();
      this.resetTextPool('tutorial');
      this.tutorialButtons = [];

      if (!this.game || !this.game.isTutorialMode) return;

      const g = this.gfx;
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const step = this.game.tutorialStep || 1;

      const barX = 160, barY = 48, barW = 960, barH = 44;
      g.lineStyle(2, 0x06d6a0, 0.95);
      g.beginFill(0x131d38, 0.94);
      g.drawRoundedRect(barX, barY, barW, barH, 8);
      g.endFill();

      const msgs = {
        1: '🎓 1/9: ลากสายไฟ (สีเหลือง) จาก โรงปั่นไฟ ไปยัง บ้าน — สายยาวได้ไม่เกินวงกลมรอบจุดเริ่ม',
        2: '🎓 2/9: ลากท่อน้ำดี (สีฟ้า) จาก ปั๊มน้ำริมแม่น้ำ ไปยัง บ้าน — กด Tab เพื่อสลับชนิดสาย',
        3: '🎓 3/9: ลากท่อน้ำเสีย (สีม่วง) จาก บ้าน ไปยัง ถังบำบัดริมแม่น้ำ รับโบนัส +$50',
        4: '🎓 4/9: บ้านใหม่อยู่ไกลเกินระยะสายจากโรงงาน: พ่วงจาก บ้านเดิม ไป บ้านใหม่ ให้ครบ ไฟ/น้ำ/น้ำเสีย',
        5: '🎓 5/9: ลบสาย: คลิกขวาที่สาย หรือกด 🗑️ DELETE [X] แล้วคลิกสาย — จากนั้นลากต่อใหม่ให้บ้านครบทุกหลัง',
        6: '🐢 6/9: พ่วงบ้านหลังที่ 3 ต่อจากหลังที่ 2 — ยิ่งพ่วงยาว ไฟ/น้ำยิ่งไหลช้า (ไอคอนกะพริบ) บ้านจะเติมไม่ทันและร้องเรียน',
        7: '🎓 7/9: ปั๊มน้ำเสีย (ประแจแดง)! คลิกที่ปั๊ม หรือกด REPAIR [R] แล้วคลิกปั๊มเพื่อซ่อม',
        8: '☢️ 8/9 วิธีแพ้ที่ 1 — มลภาวะ: ค่า ☢️ ด้านบนเต็มขีดจำกัด = Game Over! (โรงไฟฟ้าและน้ำเสียเพิ่มมลภาวะ) วางเครื่องกรองอากาศ [4] เพื่อลด',
        9: '⚠️ 9/9 วิธีแพ้ที่ 2 — ร้องเรียน: บ้านขาดไฟ/น้ำ/ท่อน้ำเสีย หรือพ่วงยาวจนเติมไม่ทัน จะร้องเรียน 1 Strike และรีเซ็ต Win Timer — ครบ 3 Strike = Game Over'
      };
      const stepMsg = msgs[step] || '🎉 ฝึกสอนสำเร็จครบ 100%! คลิก [▶] เหนือปุ่มเพื่อดูวิดีโอฟีเจอร์ หรือเริ่มด่าน Bangkok ได้เลย!';

      // Point at the HUD pill the lose-condition steps talk about
      const hl = step === 8 ? [660, 6, 172, 32] : (step === 9 ? [1056, 6, 214, 32] : null);
      if (hl) {
        g.lineStyle(3, 0xff5a5f, 0.6 + 0.4 * Math.sin(Date.now() / 150));
        g.drawRoundedRect(hl[0] - 3, hl[1] - 2, hl[2] + 6, hl[3] + 4, 9);
      }

      const txt = this.makeText(stepMsg, {
        fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: 0xffffff, wordWrap: true, wordWrapWidth: barW - 300
      }, 'tutorial');
      txt.anchor.set(0, 0.5);
      txt.position.set(barX + 16, barY + barH / 2);
      this.tutorialUIContainer.addChild(txt);

      // Auto-complete current step button (steps 1..9; step 9 is the "got it" confirm)
      if (step >= 1 && step <= 9) {
        const autoBtn = { id: 'tut_auto_step', x: barX + barW - 275, y: barY + 6, w: 125, h: 32 };
        this.tutorialButtons.push(autoBtn);
        const isHov = (mouseX >= autoBtn.x && mouseX <= autoBtn.x + autoBtn.w && mouseY >= autoBtn.y && mouseY <= autoBtn.y + autoBtn.h);
        g.lineStyle(1.5, 0xffd166, 0.9);
        g.beginFill(isHov ? 0xffb703 : 0x282048, 0.95);
        g.drawRoundedRect(autoBtn.x, autoBtn.y, autoBtn.w, autoBtn.h, 6);
        g.endFill();

        const autoTxt = this.makeText(step === 9 ? '✅ เข้าใจแล้ว' : '⏭️ ทำขั้นตอนนี้ให้', {
          fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: isHov ? 0x120d24 : 0xffd166
        }, 'tutorial');
        autoTxt.anchor.set(0.5);
        autoTxt.position.set(autoBtn.x + autoBtn.w / 2, autoBtn.y + autoBtn.h / 2);
        this.tutorialUIContainer.addChild(autoTxt);
      }

      // Start Bangkok Level 1 Button
      const goBtn = { id: 'tut_start_bangkok', x: barX + barW - 142, y: barY + 6, w: 134, h: 32 };
      this.tutorialButtons.push(goBtn);
      const isGoHov = (mouseX >= goBtn.x && mouseX <= goBtn.x + goBtn.w && mouseY >= goBtn.y && mouseY <= goBtn.y + goBtn.h);
      g.lineStyle(1.5, 0x06d6a0, 1.0);
      g.beginFill(isGoHov ? 0x00b4d8 : 0x06d6a0, 1.0);
      g.drawRoundedRect(goBtn.x, goBtn.y, goBtn.w, goBtn.h, 6);
      g.endFill();

      const goTxt = this.makeText('🚀 เริ่มด่าน Bangkok', {
        fontFamily: font, fontSize: 11, fontWeight: 'bold', fill: 0x120d24
      }, 'tutorial');
      goTxt.anchor.set(0.5);
      goTxt.position.set(goBtn.x + goBtn.w / 2, goBtn.y + goBtn.h / 2);
      this.tutorialUIContainer.addChild(goTxt);
    }

    renderFloatingTexts() {
      if (!this.floatingTextContainer || !this.game) return;
      this.floatingTextContainer.removeChildren();
      this.resetTextPool('floating');
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const list = this.game.floatingTexts || [];
      for (let i = 0; i < list.length; i++) {
        const ft = list[i];
        const t = this.makeText(ft.text, {
          fontFamily: font,
          fontSize: 13,
          fontWeight: 'bold',
          fill: ft.color || '#ffd166',
          stroke: '#0a0714',
          strokeThickness: 3
        }, 'floating');
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
        this.triggerAction(btn.action);
      }
    }

    triggerAction(actionName) {
      switch (actionName) {
        case 'repairTool':
          this.selectTool('repair');
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
        case 'startBangkok':
          this.switchToLevelIndex(0);
          break;
        case 'startFastTutorial':
          this.closeModal();
          if (this.game) this.game.startTutorial();
          break;
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

      drawStatPill(8, 6, 185, 32);
      drawStatPill(198, 6, 112, 32);
      drawStatPill(314, 6, 148, 32);
      drawStatPill(466, 6, 190, 32);
      drawStatPill(660, 6, 172, 32);
      drawStatPill(836, 6, 216, 32);
      drawStatPill(1056, 6, 214, 32);

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

      // Complaint Pips
      const maxComplaints = Math.min(3, this.game.maxComplaints || CONFIG.MAX_COMPLAINTS || 3);
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
      if (!this.game.isTutorialMode && this.game.activeDisasterText) {
        g.lineStyle(1.5, 0xff5a5f, 0.9);
        g.beginFill(0x3b0d1e, 0.9);
        g.drawRoundedRect(380, 48, 520, 28, 6);
        g.endFill();
      }

      // Render Crisp Vector Button Cards, Active/Hover Glows & 4x Retina Button Labels
      const brokenCount = this.game.buildings ? this.game.buildings.filter(b => b.isBroken).length : 0;
      for (let i = 0; i < this.buttons.length; i++) {
        const btn = this.buttons[i];
        if (btn.id === 'logo') continue;
        const isHovered = (this.hoveredButtonId === btn.id);
        const isActive = (btn.toolId && this.game.activeTool === btn.toolId) ||
                         (btn.buildId && this.game.activeTool === btn.buildId) ||
                         (btn.id === 'repair' && (this.game.activeTool === 'repair' || brokenCount > 0)) ||
                         (btn.id === 'special' && (this.game.isFloodActive || this.game.isBlackoutActive)) ||
                         (btn.id === 'pause' && this.game.isPaused) ||
                         (btn.id === 'speed' && this.game.gameSpeed === 2.0);

        const accentCol = btn.color || 0x00b4d8;

        // Crisp vector button background + top accent bar so zooming in never blurs
        g.lineStyle(isActive ? 2.5 : (isHovered ? 2.0 : 1.5), isActive ? accentCol : (isHovered ? 0x48cae4 : accentCol), isActive ? 1.0 : 0.9);
        g.beginFill(isActive ? 0x241d46 : (isHovered ? 0x1f193d : 0x181332), 0.98);
        g.drawRoundedRect(btn.x, btn.y, btn.w, btn.h, 7);
        g.endFill();

        g.lineStyle(0);
        g.beginFill(accentCol, isActive ? 0.95 : 0.85);
        g.drawRoundedRect(btn.x + 1, btn.y + 1, btn.w - 2, 6, 4);
        g.endFill();

        if (isActive) {
          g.lineStyle(2.5, accentCol, 0.95);
          g.drawRoundedRect(btn.x - 2, btn.y - 2, btn.w + 4, btn.h + 4, 8);
        }

        if (btn._txtTitle) {
          if (btn.id === 'pause') {
            btn._txtTitle.text = this.game.isPaused ? '▶️ RESUME' : '⏸️ PAUSE';
          }
          btn._txtTitle.position.set(Math.round(btn.x + btn.w * 0.5), Math.round(btn.y + 21));
        }
        if (btn._txtSub) {
          if (btn.id === 'speed') {
            btn._txtSub.text = (this.game.gameSpeed === 2.0) ? '⚡ 2X FAST' : '1X / 2X';
          } else if (btn.id === 'repair' && brokenCount > 0) {
            btn._txtSub.text = `⚠️ FIX (${brokenCount})`;
          } else if (btn.id === 'repair') {
            const repCost = this.game.getRepairCost ? this.game.getRepairCost() : 0;
            btn._txtSub.text = repCost > 0 ? `[R] FIX $${repCost}` : '[R] FIX';
          } else if (btn.id === 'power' && CONFIG.PIPES && CONFIG.PIPES.POWER) {
            btn._txtSub.text = CONFIG.PIPES.POWER.cost > 0 ? `[1] $${CONFIG.PIPES.POWER.cost}` : '[1] WIRE';
          } else if (btn.id === 'water' && CONFIG.PIPES && CONFIG.PIPES.WATER) {
            btn._txtSub.text = CONFIG.PIPES.WATER.cost > 0 ? `[2] $${CONFIG.PIPES.WATER.cost}` : '[2] PIPE';
          } else if (btn.id === 'sewage' && CONFIG.PIPES && CONFIG.PIPES.SEWAGE) {
            btn._txtSub.text = CONFIG.PIPES.SEWAGE.cost > 0 ? `[3] $${CONFIG.PIPES.SEWAGE.cost}` : '[3] SEWAGE';
          } else if (btn.id === 'air_filter' && this.game.getBuildingCost && CONFIG.BUILDINGS) {
            btn._txtSub.text = `[4] $${this.game.getBuildingCost(CONFIG.BUILDINGS.AIR_FILTER)}`;
          }
          btn._txtSub.position.set(Math.round(btn.x + btn.w * 0.5), Math.round(btn.y + 37));
        }
      }

      // Render Crisp Vector Video Demo Icons [▶] Above Feature Buttons
      for (let i = 0; i < this.videoButtons.length; i++) {
        const vb = this.videoButtons[i];
        const isHov = (this.hoveredVideoBtnId === vb.id);
        g.lineStyle(isHov ? 2.0 : 1.5, isHov ? 0xffd166 : 0x00b4d8, 0.95);
        g.beginFill(isHov ? 0x28204d : 0x14102a, 0.96);
        g.drawRoundedRect(vb.x, vb.y, vb.w, vb.h, 5);
        g.endFill();

        if (vb._txtVid) {
          vb._txtVid.style.fill = isHov ? 0xffffff : 0xffd166;
          vb._txtVid.position.set(Math.round(vb.x + vb.w * 0.5), Math.round(vb.y + vb.h * 0.5));
        }
      }
    }

    // --- MODALS ---

    showFeatureVideoModal(videoKey) {
      const videos = CONFIG.FEATURE_VIDEOS || {};
      const vData = videos[videoKey] || videos.power;
      this.activeModal = 'feature_video';
      this.modalData = { videoKey: videoKey, video: vData };
      this.videoTime = 0.0;
      this.videoPaused = false;
      if (this.modalContainer) this.modalContainer.visible = true;
    }

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
      this.resetTextPool('modal');

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
      const txtX = this.makeText('✕', { fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffffff });
      txtX.anchor.set(0.5);
      txtX.position.set(closeBtn.x + closeBtn.w / 2, closeBtn.y + closeBtn.h / 2);
      this.modalTextContainer.addChild(txtX);

      if (this.activeModal === 'feature_video') {
        this.renderFeatureVideoContent(mx, my, mw, mh, mouseX, mouseY);
      } else if (this.activeModal === 'briefing') {
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

    // --- 60 FPS ANIMATED FEATURE VIDEO PLAYER MODAL ---
    renderFeatureVideoContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const g = this.modalGfx;
      const vKey = this.modalData.videoKey || 'power';
      const vInfo = this.modalData.video || (CONFIG.FEATURE_VIDEOS && CONFIG.FEATURE_VIDEOS.power) || {};

      const title = this.makeText(vInfo.title || '🎬 วิดีโอสาธิตการใช้งานฟีเจอร์', {
        fontFamily: font, fontSize: 15, fontWeight: 'bold', fill: 0xffd166
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const subTxt = this.makeText(vInfo.subtitle || '', {
        fontFamily: font, fontSize: 12, fill: 0x90e0ef
      });
      subTxt.position.set(mx + 24, my + 58);
      this.modalTextContainer.addChild(subTxt);

      // Video Player Viewport Frame (520 x 220)
      const vx = mx + 80;
      const vy = my + 84;
      const vw = 520;
      const vh = 220;

      g.lineStyle(2, 0x48cae4, 0.85);
      g.beginFill(0x0d1226, 1.0);
      g.drawRoundedRect(vx, vy, vw, vh, 10);
      g.endFill();

      // Subtle blueprint grid inside video viewport
      g.lineStyle(1, 0x1e294b, 0.55);
      for (let gx = vx + 40; gx < vx + vw; gx += 40) {
        g.moveTo(gx, vy + 2);
        g.lineTo(gx, vy + vh - 30);
      }
      for (let gy = vy + 40; gy < vy + vh - 30; gy += 40) {
        g.moveTo(vx + 2, gy);
        g.lineTo(vx + vw - 2, gy);
      }

      // Normalized video playback progress t in [0..1] over 6.0 seconds
      const t = (this.videoTime % this.videoDuration) / this.videoDuration;
      this.drawAnimatedFeatureScene(g, vKey, vx, vy, vw, vh - 30, t);

      // Video Player Control Bar at bottom of viewport
      const ctrlY = vy + vh - 28;
      g.lineStyle(0);
      g.beginFill(0x181f3c, 0.96);
      g.drawRoundedRect(vx + 2, ctrlY, vw - 4, 26, 6);
      g.endFill();

      // Play/Pause toggle button on video bar
      const playBtn = { id: 'vid_toggle_play', x: vx + 8, y: ctrlY + 3, w: 54, h: 20 };
      this.modalButtons.push(playBtn);
      g.lineStyle(1, 0x48cae4, 0.7);
      g.beginFill(0x222c52, 0.95);
      g.drawRoundedRect(playBtn.x, playBtn.y, playBtn.w, playBtn.h, 4);
      g.endFill();

      const playTxt = this.makeText(this.videoPaused ? '▶ PLAY' : '⏸ PAUSE', {
        fontFamily: font, fontSize: 10, fontWeight: 'bold', fill: 0xffd166
      });
      playTxt.anchor.set(0.5);
      playTxt.position.set(playBtn.x + playBtn.w / 2, playBtn.y + playBtn.h / 2);
      this.modalTextContainer.addChild(playTxt);

      // Scrubber Progress Bar
      const scrubX = vx + 72, scrubY = ctrlY + 9, scrubW = vw - 165, scrubH = 8;
      g.lineStyle(1, 0x48cae4, 0.4);
      g.beginFill(0x090c1a, 0.9);
      g.drawRoundedRect(scrubX, scrubY, scrubW, scrubH, 4);
      g.endFill();

      g.lineStyle(0);
      g.beginFill(0x06d6a0, 1.0);
      g.drawRoundedRect(scrubX, scrubY, Math.max(6, scrubW * t), scrubH, 4);
      g.endFill();

      const timeLbl = this.makeText(`00:0${Math.floor(this.videoTime)} / 00:06`, {
        fontFamily: font, fontSize: 10, fontWeight: 'bold', fill: 0xadb5bd
      });
      timeLbl.position.set(vx + vw - 84, ctrlY + 6);
      this.modalTextContainer.addChild(timeLbl);

      // Step-by-Step Instructions Box below Video
      const steps = vInfo.steps || [];
      const stepBoxY = vy + vh + 12;
      g.lineStyle(1, 0x48cae4, 0.3);
      g.beginFill(0x1a1334, 0.92);
      g.drawRoundedRect(mx + 30, stepBoxY, mw - 60, 96, 8);
      g.endFill();

      const stepsTxt = this.makeText(steps.join('\n'), {
        fontFamily: font, fontSize: 12, fill: 0xe9ecef, lineHeight: 24, wordWrap: true, wordWrapWidth: mw - 90
      });
      stepsTxt.position.set(mx + 45, stepBoxY + 12);
      this.modalTextContainer.addChild(stepsTxt);

      // Bottom Action Button: "Use This Feature Now!"
      const useAct = vInfo.useAction || { type: 'tool', value: 'power', label: '⚡ ใช้งานฟีเจอร์นี้ทันที!' };
      const useBtn = { id: 'vid_use_feature', useAction: useAct, x: mx + mw / 2 - 150, y: my + mh - 54, w: 300, h: 42 };
      this.modalButtons.push(useBtn);
      const isUseHover = (mouseX >= useBtn.x && mouseX <= useBtn.x + useBtn.w && mouseY >= useBtn.y && mouseY <= useBtn.y + useBtn.h);

      g.lineStyle(2, 0x06d6a0, 1.0);
      g.beginFill(isUseHover ? 0x00b4d8 : 0x06d6a0, 1.0);
      g.drawRoundedRect(useBtn.x, useBtn.y, useBtn.w, useBtn.h, 8);
      g.endFill();

      const useBtnTxt = this.makeText(useAct.label, {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x120d24
      });
      useBtnTxt.anchor.set(0.5);
      useBtnTxt.position.set(useBtn.x + useBtn.w / 2, useBtn.y + useBtn.h / 2);
      this.modalTextContainer.addChild(useBtnTxt);
    }

    drawAnimatedFeatureScene(g, vKey, vx, vy, vw, vh, t) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const addSprite = (imgName, x, y, w, h) => {
        try {
          const sp = new PIXI.Sprite(PIXI.Texture.from(imgName));
          sp.anchor.set(0.5);
          sp.width = w;
          sp.height = h;
          sp.position.set(x, y);
          this.modalTextContainer.addChild(sp);
          return sp;
        } catch (e) { return null; }
      };
      const addLabel = (str, x, y, col = 0xffd166, size = 12) => {
        const tx = this.makeText(str, { fontFamily: font, fontSize: size, fontWeight: 'bold', fill: col, stroke: '#0a0714', strokeThickness: 3 });
        tx.anchor.set(0.5);
        tx.position.set(x, y);
        this.modalTextContainer.addChild(tx);
      };

      // Helper to draw animated cursor arrow
      const drawCursor = (cx, cy, clicking = false) => {
        g.lineStyle(2, 0x120d24, 1.0);
        g.beginFill(clicking ? 0x06d6a0 : 0xffffff, 1.0);
        g.drawCircle(cx, cy, clicking ? 8 : 6);
        g.endFill();
        if (clicking) {
          g.lineStyle(2, 0xffd166, 0.9);
          g.drawCircle(cx, cy, 14);
        }
      };

      if (vKey === 'power' || vKey === 'water' || vKey === 'sewage') {
        const srcImg = vKey === 'power' ? 'Power.png' : (vKey === 'water' ? 'Blue barrel.png' : 'Orange barrel.png');
        const wireCol = vKey === 'power' ? 0xffd166 : (vKey === 'water' ? 0x00b4d8 : 0xc77dff);
        const badgeImg = vKey === 'power' ? 'badge_power.png' : (vKey === 'water' ? 'badge_water.png' : 'badge_drain.png');

        const p1 = { x: vx + 130, y: vy + 125 };
        const p2 = { x: vx + 380, y: vy + 68 };

        // Draw river strip for water/sewage
        if (vKey !== 'power') {
          g.lineStyle(0);
          g.beginFill(0x0077b6, 0.45);
          g.drawRect(vx + 70, vy + 4, 45, vh - 8);
          g.endFill();
        }

        // Animate Manhattan drag from t = 0.1 to 0.55, connected at t >= 0.55
        const dragProg = Math.max(0, Math.min(1, (t - 0.1) / 0.45));
        const curEnd = {
          x: p1.x + (p2.x - p1.x) * dragProg,
          y: p1.y + (p2.y - p1.y) * dragProg
        };

        if (t >= 0.1) {
          const pathData = global.POWATER.ConnectionEntity.buildManhattanPoints(p1, curEnd, 0, 22);
          if (pathData && pathData.points) {
            g.lineStyle(4, wireCol, 0.95);
            g.moveTo(pathData.points[0].x, pathData.points[0].y);
            for (let i = 1; i < pathData.points.length; i++) {
              g.lineTo(pathData.points[i].x, pathData.points[i].y);
            }
            if (t >= 0.55) {
              const pulsePos = global.POWATER.ConnectionEntity.getPointAlongPath(pathData, (t * 3) % 1.0);
              g.beginFill(0xffffff, 1.0);
              g.drawCircle(pulsePos.x, pulsePos.y, 4);
              g.endFill();
            }
          }
        }

        addSprite(srcImg, p1.x, p1.y, 48, 48);
        addSprite('House.png', p2.x, p2.y, 68, 46);

        // House status ring
        g.lineStyle(3, t >= 0.55 ? 0x06d6a0 : 0xffb703, 0.9);
        g.drawCircle(p2.x, p2.y, 38);

        if (t < 0.55) {
          addSprite(badgeImg, p2.x, p2.y - 46, 22, 22);
        } else {
          addLabel('+$50 บ้านสมบูรณ์ (Complete)!', p2.x, p2.y - 46, 0x06d6a0, 12);
        }

        drawCursor(curEnd.x, curEnd.y, t >= 0.1 && t <= 0.58);
      }
      else if (vKey === 'repair') {
        const px = vx + 260, py = vy + 105;
        const isBroken = (t >= 0.15 && t < 0.62);
        addSprite('Blue barrel.png', px, py, 56, 56);

        g.lineStyle(3.5, isBroken ? 0xe63946 : 0x06d6a0, 1.0);
        g.drawCircle(px, py, 38);

        if (isBroken) {
          addSprite('badge_repair.png', px, py - 48, 28, 28);
          addLabel('⚠️ เครื่องปั๊มเสีย! (Win Timer: PAUSED)', px, vy + 24, 0xff5a5f, 12);
          const curX = vx + 380 - Math.min(1, Math.max(0, (t - 0.3) / 0.28)) * 120;
          const curY = vy + 150 - Math.min(1, Math.max(0, (t - 0.3) / 0.28)) * 45;
          drawCursor(curX, curY, t >= 0.55);
        } else if (t >= 0.62) {
          addLabel('🔧 ซ่อมแซมสำเร็จ! น้ำไหลปกติ & Win Timer เดินต่อ!', px, vy + 26, 0x06d6a0, 12);
        } else {
          addLabel('ปั๊มน้ำทำงานปกติ (มีโอกาสเสีย 30% ทุก 2 นาที)', px, vy + 26, 0x90e0ef, 12);
        }
      }
      else if (vKey === 'special') {
        // Disaster Test Lab: pay $50 -> simulated flood washes over the city
        const ax = vx + vw / 2, ay = vy + 105;
        const cost = (typeof CONFIG.DISASTER_TEST_COST === 'number') ? CONFIG.DISASTER_TEST_COST : 50;
        if (t >= 0.45) {
          g.beginFill(0x0077b6, 0.45);
          g.drawRect(vx + 8, vy + 8, vw - 16, vh - 16);
          g.endFill();
          addLabel(`🧪 จำลองภัยพิบัติสำเร็จ (-$${cost}) ตรวจจุดที่ชำรุด!`, ax, vy + 24, 0xffd166, 12);
        } else {
          addLabel(`🧪 ศูนย์ทดสอบภัยพิบัติ: ทดสอบครั้งละ $${cost}`, ax, vy + 24, 0x06d6a0, 12);
        }
        addSprite('House.png', ax, ay, 64, 44);
        drawCursor(ax, vy + 150, t >= 0.38 && t <= 0.5);
      }
      else if (vKey === 'air_filter') {
        const bx = vx + 180, by = vy + 100;
        const hx = vx + 360, hy = vy + 100;
        if (t >= 0.25) {
          addSprite('AirFilter.png', bx, by, 54, 54);
          g.lineStyle(2.5, 0x2ec4b6, 0.9);
          g.drawCircle(bx, by, 34 + Math.sin(t * 18) * 4);
        }
        addSprite('House.png', hx, hy, 68, 46);
        addLabel('🍃 ดูดซับมลพิษอัตโนมัติ -0.2 หน่วย/วินาที', vx + vw / 2, vy + 24, 0x06d6a0, 12);
        drawCursor(bx, by, t >= 0.2 && t <= 0.35);
      }
      else if (vKey === 'lose_pollution') {
        // Two coal plants puff smoke while the pollution bar fills to the limit -> GAME OVER
        const p = Math.min(1, t / 0.8);
        addSprite('Power.png', vx + 150, vy + 120, 56, 56);
        addSprite('Power.png', vx + 260, vy + 135, 56, 56);
        for (let i = 0; i < 6; i++) {
          const k = (t * 2 + i / 6) % 1;
          g.lineStyle(0);
          g.beginFill(0x6c757d, 0.55 * (1 - k));
          g.drawCircle(vx + (i % 2 ? 260 : 150) + Math.sin(k * 6 + i) * 8, vy + 95 - k * 70, 8 + k * 14);
          g.endFill();
        }
        const bx = vx + 340, by = vy + 60, bw = 150, bh = 16;
        g.lineStyle(1.5, 0xffffff, 0.5);
        g.beginFill(0x000000, 0.5);
        g.drawRoundedRect(bx, by, bw, bh, 6);
        g.endFill();
        g.lineStyle(0);
        g.beginFill(p > 0.75 ? 0xe63946 : (p > 0.45 ? 0xffb703 : 0x06d6a0), 1);
        g.drawRoundedRect(bx, by, Math.max(6, bw * p), bh, 6);
        g.endFill();
        addLabel(`☢️ ${(p * 6).toFixed(1)} / 6.0`, bx + bw / 2, by + 34, 0xffd166, 12);
        addLabel('โรงปั่นไฟ +0.3/วิ ต่อเครื่อง', vx + 205, vy + 180, 0xadb5bd, 11);
        if (t >= 0.8) {
          g.beginFill(0xe63946, 0.35);
          g.drawRect(vx + 4, vy + 4, vw - 8, vh - 8);
          g.endFill();
          addLabel('💀 GAME OVER: มลภาวะเกินขีดจำกัด!', vx + vw / 2, vy + 140, 0xffffff, 16);
        }
      }
      else if (vKey === 'lose_complaint') {
        // Pump -> 5 houses in series; flow slows down the chain, end houses complain -> 3 strikes -> GAME OVER
        const py = vy + 110;
        addSprite('Blue barrel.png', vx + 45, py, 40, 40);
        const hx = (i) => vx + 120 + i * 85;
        g.lineStyle(4, 0x00b4d8, 0.9);
        g.moveTo(vx + 65, py);
        g.lineTo(hx(4), py);
        for (let i = 0; i < 5; i++) {
          // flow pulses get slower and fainter down the chain
          const flow = Math.max(0, 1 - 0.25 * Math.max(0, i + 1 - 2));
          const k = (t * 3 * (0.3 + flow)) % 1;
          g.lineStyle(0);
          g.beginFill(0xffffff, 0.3 + 0.6 * flow);
          g.drawCircle((i === 0 ? vx + 65 : hx(i - 1)) + k * 85, py, 4);
          g.endFill();
          addSprite('House.png', hx(i), py - 30, 56, 38);
          addLabel(`${Math.round(flow * 100)}%`, hx(i), py + 22, flow >= 1 ? 0x06d6a0 : (flow > 0.4 ? 0xffd166 : 0xe63946), 11);
          const unhappy = Math.min(1, t * (1 - flow) * 2.2);
          if (unhappy > 0) {
            g.beginFill(0x1a1334, 0.9);
            g.drawRect(hx(i) - 20, py + 36, 40, 5);
            g.endFill();
            g.beginFill(unhappy > 0.6 ? 0xe63946 : 0xffd166, 1);
            g.drawRect(hx(i) - 20, py + 36, 40 * unhappy, 5);
            g.endFill();
          }
        }
        const strikes = t >= 0.85 ? 3 : (t >= 0.6 ? 2 : (t >= 0.35 ? 1 : 0));
        addLabel(`⚠️ STRIKES: ${'■'.repeat(strikes)}${'□'.repeat(3 - strikes)}`, vx + vw - 90, vy + 24, 0xff5a5f, 12);
        addLabel('พ่วงยิ่งยาว ยิ่งไหลช้า → บ้านปลายสายเติมไม่ทัน → ร้องเรียน', vx + vw / 2 - 40, vy + 24, 0xffd166, 11);
        if (t >= 0.88) {
          g.beginFill(0xe63946, 0.35);
          g.drawRect(vx + 4, vy + 4, vw - 8, vh - 8);
          g.endFill();
          addLabel('💀 GAME OVER: ถูกร้องเรียนครบ 3 ครั้ง!', vx + vw / 2, vy + 172, 0xffffff, 16);
        }
      }
      else {
        // Upgrades, SDGs / Upsize / Day-Night, or Win Timer Demo
        const isNightDemo = (vKey === 'sdgs' && t >= 0.5);
        if (isNightDemo) {
          g.beginFill(0x05081c, 0.55);
          g.drawRect(vx + 4, vy + 4, vw - 8, vh - 8);
          g.endFill();
        }
        addSprite(isNightDemo ? 'icon_night.png' : 'icon_day.png', vx + 70, vy + 40, 32, 32);
        addSprite('House.png', vx + 180, vy + 105, 62, 42);
        addSprite('House.png', vx + 270, vy + 105, 62, 42);
        addSprite('House.png', vx + 360, vy + 105, 62, 42);
        addLabel(
          vKey === 'upgrades'
            ? '⚡ อัปเกรดไฟ +20% | ☢️ ลดมลพิษ -5% | 💧 ปั๊มน้ำ +20%'
            : (vKey === 'sdgs'
              ? '🗺️ ขยายแมพทุก +10 หลัง (ตันที่ 40 หลัง) & ☀️/🌙 Day/Night 1 นาที'
              : '🏆 ดูแลบ้าน > 15 หลังครบ 5 นาทีเพื่อชนะด่าน!'),
          vx + vw / 2, vy + 30, 0x06d6a0, 12
        );
      }
    }

    renderBriefingContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const lvl = this.modalData.level || this.game.currentLevel || {};
      const curLvlIdx = this.game ? (this.game.levelIndex || 0) : 0;

      const title = this.makeText(`📋 POWATER CORP. v1.0.2.0 — เลือกด่าน & โหมดฝึกสอนด่วน`, {
        fontFamily: font, fontSize: 15.5, fontWeight: 'bold', fill: 0x00b4d8
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      // 5 Tabs across top: 0. Fast Tutorial + 4 Main Levels
      const levelTabs = [
        { name: '🎓 0. Tutorial', idx: -1 },
        { name: '1. Bangkok', idx: 0 },
        { name: '2. Tokyo', idx: 1 },
        { name: '3. Rome', idx: 2 },
        { name: '4. Amsterdam', idx: 3 }
      ];

      const tabW = (mw - 40 - (levelTabs.length - 1) * 6) / levelTabs.length;
      const tabH = 32;
      const tabY = my + 56;

      for (let i = 0; i < levelTabs.length; i++) {
        const lt = levelTabs[i];
        const tabX = mx + 20 + i * (tabW + 6);
        const isSelected = (lt.idx === -1) ? Boolean(this.game && this.game.isTutorialMode) : (!this.game.isTutorialMode && curLvlIdx === lt.idx);
        const isHover = (mouseX >= tabX && mouseX <= tabX + tabW && mouseY >= tabY && mouseY <= tabY + tabH);

        this.modalButtons.push({ id: lt.idx === -1 ? 'start_fast_tutorial' : `select_level_${lt.idx}`, x: tabX, y: tabY, w: tabW, h: tabH });

        this.modalGfx.lineStyle(1.5, isSelected ? 0x06d6a0 : (isHover ? 0x48cae4 : 0x3d3460), isSelected ? 1.0 : 0.6);
        this.modalGfx.beginFill(isSelected ? 0x0077b6 : (isHover ? 0x221a44 : 0x181232), 0.95);
        this.modalGfx.drawRoundedRect(tabX, tabY, tabW, tabH, 6);
        this.modalGfx.endFill();

        const tabTxt = this.makeText(lt.name, {
          fontFamily: font,
          fontSize: 11.5,
          fontWeight: isSelected ? 'bold' : 'normal',
          fill: isSelected ? 0xffffff : (isHover ? 0x90e0ef : 0xadb5bd)
        });
        tabTxt.anchor.set(0.5);
        tabTxt.position.set(tabX + tabW / 2, tabY + tabH / 2);
        this.modalTextContainer.addChild(tabTxt);
      }

      const briefingTxt = this.makeText(
        `🏛️ บทบาทผู้เล่น: นายกเทศมนตรี (Mayor of the City)\n` +
        `📍 ${lvl.thaiName || 'เมืองเป้าหมาย'}\n` +
        `🌍 บริบทความท้าทาย: ${lvl.cityChallenge || 'การพัฒนาเมืองอย่างยั่งยืน'}\n\n` +
        `${lvl.briefing || ''}\n\n` +
        `• ข้อได้เปรียบ (+): ${lvl.conditionPlus || '-'}\n` +
        `• ความท้าทาย (-): ${lvl.conditionMinus || '-'}\n` +
        `• การได้เงิน: บ้าน Complete รับทันที +$50 | รายได้รายสัปดาห์: [บ้าน Complete] x $40\n` +
        `• วิดีโอสาธิต: คลิกปุ่มไอคอน [▶] สีฟ้าเหนือปุ่มเครื่องมือด้านล่างเพื่อดูวิดีโอวิธีใช้แต่ละฟีเจอร์!\n\n` +
        `🎩 Amigo TheGOATHimself (ที่ปรึกษาด้านสิ่งแวดล้อม): "${lvl.amigoQuote || ''}"`,
        { fontFamily: font, fontSize: 12, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 46, lineHeight: 19 }
      );
      briefingTxt.position.set(mx + 23, my + 98);
      this.modalTextContainer.addChild(briefingTxt);

      // Button 1: Start Fast 30s Tutorial
      const tutBtn = { id: 'start_fast_tutorial', x: mx + mw / 2 - 205, y: my + mh - 54, w: 195, h: 40 };
      this.modalButtons.push(tutBtn);
      const isTutHover = (mouseX >= tutBtn.x && mouseX <= tutBtn.x + tutBtn.w && mouseY >= tutBtn.y && mouseY <= tutBtn.y + tutBtn.h);

      this.modalGfx.lineStyle(2, 0x06d6a0, 1.0);
      this.modalGfx.beginFill(isTutHover ? 0x00b4d8 : 0x06d6a0, 1.0);
      this.modalGfx.drawRoundedRect(tutBtn.x, tutBtn.y, tutBtn.w, tutBtn.h, 8);
      this.modalGfx.endFill();

      const tutTxt = this.makeText('🎓 ฝึกสอนด่วน (TUTORIAL)', {
        fontFamily: font, fontSize: 12.5, fontWeight: 'bold', fill: 0x120d24
      });
      tutTxt.anchor.set(0.5);
      tutTxt.position.set(tutBtn.x + tutBtn.w / 2, tutBtn.y + tutBtn.h / 2);
      this.modalTextContainer.addChild(tutTxt);

      // Button 2: Start Selected Level
      const startBtn = { id: 'btn_start', x: mx + mw / 2 + 10, y: my + mh - 54, w: 195, h: 40 };
      this.modalButtons.push(startBtn);
      const isStartHover = (mouseX >= startBtn.x && mouseX <= startBtn.x + startBtn.w && mouseY >= startBtn.y && mouseY <= startBtn.y + startBtn.h);

      this.modalGfx.lineStyle(2, 0x00b4d8, 1.0);
      this.modalGfx.beginFill(isStartHover ? 0x0096c7 : 0x00b4d8, 1.0);
      this.modalGfx.drawRoundedRect(startBtn.x, startBtn.y, startBtn.w, startBtn.h, 8);
      this.modalGfx.endFill();

      const btnTxt = this.makeText('🚀 เริ่มด่านนี้! (START)', {
        fontFamily: font, fontSize: 12.5, fontWeight: 'bold', fill: 0xffffff
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(startBtn.x + startBtn.w / 2, startBtn.y + startBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    renderSpecialItemsContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const cost = (typeof CONFIG.DISASTER_TEST_COST === 'number') ? CONFIG.DISASTER_TEST_COST : 50;
      const canAfford = this.game.money >= cost;
      const title = this.makeText(`🧪 ศูนย์ทดสอบภัยพิบัติ (DISASTER TEST LAB) — ค่าทดสอบ $${cost} / ครั้ง`, {
        fontFamily: font, fontSize: 15, fontWeight: 'bold', fill: 0x06d6a0
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const desc = this.makeText(
        'ใช้งบประมาณเทศบาลจำลองภัยพิบัติเพื่อทดสอบความพร้อมของโครงข่ายน้ำและไฟ (ซ่อมอุปกรณ์ได้โดยคลิกที่อาคารที่เสียทีละจุด)',
        { fontFamily: font, fontSize: 11.5, fill: 0xadb5bd, wordWrap: true, wordWrapWidth: mw - 64 }
      );
      desc.position.set(mx + 32, my + 72);
      this.modalTextContainer.addChild(desc);

      const actionButtons = [
        { id: 'act_test_tide', label: '🌊 ทดสอบน้ำขึ้น', color: 0x00b4d8 },
        { id: 'act_test_quake', label: '🌋 ทดสอบแผ่นดินไหว', color: 0xff5a5f },
        { id: 'act_test_blackout', label: '⚡ ทดสอบไฟดับ', color: 0xffd166 },
        { id: 'act_test_flood', label: '🛟 ทดสอบน้ำท่วม', color: 0x9d4edd }
      ];

      const abW = 140;
      for (let i = 0; i < actionButtons.length; i++) {
        const ab = actionButtons[i];
        const bx = mx + 32 + i * (abW + 12);
        const by = my + 120;
        const bh = 54;
        const isHover = canAfford && (mouseX >= bx && mouseX <= bx + abW && mouseY >= by && mouseY <= by + bh);
        const col = canAfford ? ab.color : 0x6c757d;

        this.modalButtons.push({ id: ab.id, x: bx, y: by, w: abW, h: bh });

        this.modalGfx.lineStyle(1.5, col, 0.9);
        this.modalGfx.beginFill(isHover ? col : 0x241b42, 0.95);
        this.modalGfx.drawRoundedRect(bx, by, abW, bh, 6);
        this.modalGfx.endFill();

        const abTxt = this.makeText(`${ab.label}
($${cost})`, {
          fontFamily: font, fontSize: 11.5, fontWeight: 'bold', align: 'center',
          fill: canAfford ? (isHover ? 0x120d24 : 0xffffff) : 0x6c757d
        });
        abTxt.anchor.set(0.5);
        abTxt.position.set(bx + abW / 2, by + bh / 2);
        this.modalTextContainer.addChild(abTxt);
      }
    }

    renderUpgradesContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = this.makeText('🔧 UPGRADE — ศูนย์อัปเกรดเทคโนโลยี POWATER CORP.', {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffd166
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const upgCfg = CONFIG.UPGRADES || {};
      const uElec = upgCfg.ELECTRICITY_CAPACITY || {};
      const uPoll = upgCfg.POLLUTION_REDUCTION || {};
      const uWater = upgCfg.WATER_PUMP_CAPACITY || {};
      const uWaste = upgCfg.WASTE_FILTER_CAPACITY || {};
      const upgrades = [
        { key: 'elec_cap', name: '⚡ ELECTRICITY +20% FASTER', desc: 'เพิ่มประสิทธิภาพการส่งกระแสไฟฟ้า +20% (สูงสุด Lv. 5)', baseCost: uElec.baseCost ?? 10, mult: uElec.costMult ?? 1.8, maxLvl: uElec.maxLevel ?? 5 },
        { key: 'poll_red', name: '☢️ POLLUTION -5%', desc: 'ลดอัตราการปล่อยมลภาวะทุกแหล่ง -5% ต่อระดับ (สูงสุด Lv. 10)', baseCost: uPoll.baseCost ?? 100, mult: uPoll.costMult ?? 1.5, maxLvl: uPoll.maxLevel ?? 10 },
        { key: 'water_cap', name: '💧 WATER PUMP +20% FASTER', desc: 'เพิ่มความจุและแรงดันเครื่องปั๊มน้ำสะอาด +20% (สูงสุด Lv. 5)', baseCost: uWater.baseCost ?? 10, mult: uWater.costMult ?? 1.8, maxLvl: uWater.maxLevel ?? 5 },
        { key: 'waste_cap', name: '🧪 WASTEWATER FILTER +25%', desc: 'เพิ่มความจุการบำบัดน้ำเสียริมแม่น้ำ +25% (สูงสุด Lv. 5)', baseCost: uWaste.baseCost ?? 25, mult: uWaste.costMult ?? 1.6, maxLvl: uWaste.maxLevel ?? 5 }
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

        const nameTxt = this.makeText(`${up.name} (LV. ${curLvl}/${up.maxLvl})`, {
          fontFamily: font, fontSize: 13.5, fontWeight: 'bold', fill: 0xffd166
        });
        nameTxt.position.set(mx + 35, cardY + 16);
        this.modalTextContainer.addChild(nameTxt);

        const descTxt = this.makeText(up.desc, {
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

        const btnTxt = this.makeText(isMax ? 'MAX LEVEL' : `BUY $${totalCost}`, {
          fontFamily: font, fontSize: 12, fontWeight: 'bold', fill: canAfford ? 0x120d24 : 0xadb5bd
        });
        btnTxt.anchor.set(0.5);
        btnTxt.position.set(buyBtn.x + buyBtn.w / 2, buyBtn.y + buyBtn.h / 2);
        this.modalTextContainer.addChild(btnTxt);
      }
    }

    renderSdgsContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = this.makeText('🎯 SDGs & Roadmap — Core Concept: The Urban Sustainability Crisis', {
        fontFamily: font, fontSize: 14.5, fontWeight: 'bold', fill: 0x00b4d8
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const isSdg15Unlocked = Boolean(this.game && this.game.sdg15Unlocked);

      const sdgs = [
        {
          id: 'sdg6',
          title: 'SDG 6: CLEAN WATER AND SANITATION',
          desc: 'การจัดการน้ำสะอาดและระบบสุขาภิบาล เพื่อให้ประชาชนทุกครัวเรือนเข้าถึงน้ำที่มีคุณภาพ สูบน้ำสะอาดและบำบัดน้ำเสียริมแม่น้ำ',
          color: 0x26bde2,
          tag: 'CORE UTILITY'
        },
        {
          id: 'sdg7',
          title: 'SDG 7: AFFORDABLE AND CLEAN ENERGY',
          desc: 'การส่งเสริมพลังงานสะอาดและการเข้าถึงไฟฟ้าอย่างทั่วถึง และลดมลภาวะด้วยเครื่องกรองอากาศ (Eco Filter)',
          color: 0xfcc30b,
          tag: 'CORE UTILITY'
        },
        {
          id: 'sdg15',
          title: 'SDG 15: LIFE ON LAND (🌱 EASTER EGG & MINI-ACHIEVEMENT)',
          desc: (this.showSdg15Story || isSdg15Unlocked)
            ? '✅ บันทึกผู้ว่าฯ: "ตึกรามสร้างใหม่ได้ แต่ผืนป่ามิอาจฟื้นคืนได้ง่ายดาย... ผู้ว่าฯ ดูแลธรรมชาติไม่ปล่อยมลพิษทำลายสิ่งแวดล้อม นกและต้นไม้ยังคงเบ่งบานเคียงคู่มหานคร"'
            : '🔒 Easter Egg: ติดตั้งเครื่องกรอง Eco Filter หรือรักษาระดับมลภาวะให้บริสุทธิ์เพื่อฟังเรื่องสั้นบันทึกผู้ว่าฯ (หรือคลิกปุ่มเพื่อเปิดอ่าน)',
          color: 0x56ab2f,
          tag: isSdg15Unlocked ? 'ACHIEVED' : 'EASTER EGG'
        }
      ];

      for (let i = 0; i < sdgs.length; i++) {
        const s = sdgs[i];
        const cardY = my + 56 + (i * 74);

        this.modalGfx.lineStyle(1.5, s.color, 0.45);
        this.modalGfx.beginFill(0x1a1334, 0.9);
        this.modalGfx.drawRoundedRect(mx + 20, cardY, mw - 40, 66, 8);
        this.modalGfx.endFill();

        const badgeTxt = this.makeText(`${s.title} [${s.tag}]`, {
          fontFamily: font, fontSize: 11.5, fontWeight: 'bold', fill: s.color
        });
        badgeTxt.position.set(mx + 32, cardY + 8);
        this.modalTextContainer.addChild(badgeTxt);

        const descTxt = this.makeText(s.desc, {
          fontFamily: font, fontSize: 10.5, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 160, lineHeight: 16
        });
        descTxt.position.set(mx + 32, cardY + 28);
        this.modalTextContainer.addChild(descTxt);

        // Interactive Button for SDG 15 Easter Egg Story
        if (s.id === 'sdg15') {
          const storyBtn = { id: 'toggle_sdg15_story', x: mx + mw - 145, y: cardY + 18, w: 110, h: 30 };
          this.modalButtons.push(storyBtn);
          const isHov = mouseX >= storyBtn.x && mouseX <= storyBtn.x + storyBtn.w && mouseY >= storyBtn.y && mouseY <= storyBtn.y + storyBtn.h;

          this.modalGfx.lineStyle(1.5, 0x56ab2f, 0.9);
          this.modalGfx.beginFill(isHov ? 0x2d6a4f : 0x1b4332, 0.95);
          this.modalGfx.drawRoundedRect(storyBtn.x, storyBtn.y, storyBtn.w, storyBtn.h, 6);
          this.modalGfx.endFill();

          const sBtnTxt = this.makeText(this.showSdg15Story ? '📖 ซ่อนเรื่องสั้น' : '🌱 อ่านเรื่องสั้น', {
            fontFamily: font, fontSize: 10.5, fontWeight: 'bold', fill: 0x95d5b2
          });
          sBtnTxt.anchor.set(0.5);
          sBtnTxt.position.set(storyBtn.x + storyBtn.w / 2, storyBtn.y + storyBtn.h / 2);
          this.modalTextContainer.addChild(sBtnTxt);
        }
      }

      const rmY = my + 284;
      this.modalGfx.lineStyle(1.5, 0x06d6a0, 0.45);
      this.modalGfx.beginFill(0x181232, 0.95);
      this.modalGfx.drawRoundedRect(mx + 20, rmY, mw - 40, 235, 8);
      this.modalGfx.endFill();

      const rmHeader = this.makeText('🏛️ สารจากนายกเทศมนตรี & แผนการพัฒนาเมืองยั่งยืน (Roadmap):', {
        fontFamily: font, fontSize: 12.5, fontWeight: 'bold', fill: 0x06d6a0
      });
      rmHeader.position.set(mx + 32, rmY + 10);
      this.modalTextContainer.addChild(rmHeader);

      const roadmapText = this.makeText(
        '• ปรัชญาการบริหาร: "เป้าหมายสูงสุดไม่ใช่การสร้างเมืองที่ใหญ่ที่สุด แต่คือการสร้างเมืองที่เติบโตได้อย่างยั่งยืน"\n' +
        '• v1.0.3.2 (Current): 4 ด่านหลัก, Fast Tutorial, วิดีโอสาธิต [▶], ระบบซ่อมบำรุง, กลางวัน/กลางคืน, Upsize 40 หลัง, SDG 15 Easter Egg\n' +
        '• v1.1 - Seasonal Update: ระบบ 4 ฤดูกาล ส่งผลต่อแสงแดด ปริมาณน้ำฝน และความต้องการสาธารณูปโภค\n' +
        '• v1.2 - Save The World Update: เมืองใหม่ระดับโลก และระบบป่าไม้ (Forestry System) ขยายความสมบูรณ์ SDG 15\n' +
        '• v1.3 - Monopoly Update: ตัวละครผู้ช่วยและ In-Game Currency ตอบสนองความยั่งยืนทางการเงิน\n' +
        '• v1.4 - MMD (Man Made Disaster) Update: รับมือภัยจากมนุษย์ เช่น อัคคีภัยเมือง และภาวะโลกร้อน',
        { fontFamily: font, fontSize: 11, fill: 0xe9ecef, wordWrap: true, wordWrapWidth: mw - 65, lineHeight: 21 }
      );
      roadmapText.position.set(mx + 32, rmY + 34);
      this.modalTextContainer.addChild(roadmapText);
    }

    renderGraceEndedContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = this.makeText('⚠️ หมดระยะเวลาเตรียมพร้อม (Protecting Time Ended)', {
        fontFamily: font, fontSize: 16, fontWeight: 'bold', fill: 0xffb703
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const msg = this.makeText(
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

      const btnTxt = this.makeText('รับทราบ! ลุยต่อ', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0x120d24
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(okBtn.x + okBtn.w / 2, okBtn.y + okBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    renderGameOverContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = this.makeText('💀 ภารกิจล้มเหลว (GAME OVER)', {
        fontFamily: font, fontSize: 18, fontWeight: 'bold', fill: 0xe63946
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const reason = this.modalData.reason || 'เมืองเกิดวิกฤตสิ่งแวดล้อมหรือการประท้วง';
      const msg = this.makeText(
        `สาเหตุ: ${reason}\n\n` +
        `• สถิติบ้านที่ดูแลสำเร็จสูงสุด: ${this.game.housesServedPeak || 0} หลัง\n` +
        `• เวลาสะสม Win Timer ล่าสุด: ${this.formatMMSS(this.game.winHoldTimer || 0)} / 05:00\n` +
        `• วันที่บริหารเมืองได้: ${(this.game.totalDaysPassed || 0) + 1} วัน\n` +
        `• ระดับมลภาวะสุดท้าย: ${(this.game.pollution || 0).toFixed(2)}\n\n` +
        `เคล็ดลับ: คลิกปุ่ม [▶] เหนือไอคอนด้านล่างเพื่อดูวิดีโอสาธิตการใช้ฟีเจอร์ได้ทุกเมื่อ!`,
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

      const btnTxt = this.makeText('เล่นใหม่อีกครั้ง (RETRY)', {
        fontFamily: font, fontSize: 13, fontWeight: 'bold', fill: 0xffffff
      });
      btnTxt.anchor.set(0.5);
      btnTxt.position.set(restartBtn.x + restartBtn.w / 2, restartBtn.y + restartBtn.h / 2);
      this.modalTextContainer.addChild(btnTxt);
    }

    renderVictoryContent(mx, my, mw, mh, mouseX, mouseY) {
      const font = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      const title = this.makeText('🏆 ภารกิจสำเร็จ! ยินดีด้วย (VICTORY)', {
        fontFamily: font, fontSize: 18, fontWeight: 'bold', fill: 0x06d6a0
      });
      title.position.set(mx + 20, my + 14);
      this.modalTextContainer.addChild(title);

      const curLvl = this.game.currentLevel ? (this.game.currentLevel.name || 'Bangkok') : 'City';
      const msg = this.makeText(
        `ยอดเยี่ยมมากท่านนายกเทศมนตรี! คุณบริหาร ${curLvl} ผ่านเงื่อนไขการชนะครบสมบูรณ์!\n\n` +
        `• ดูแลบ้านมากกว่า 15 หลังให้มีน้ำและไฟใช้ตลอดเวลาครบ 5 นาทีเต็ม!\n` +
        `• ควบคุมมลภาวะต่ำกว่าเกณฑ์และรับมือภัยพิบัติได้อย่างยอดเยี่ยม\n` +
        `• ตอบสนองเป้าหมาย SDGs 6, 7 และ 15 (Life on Land) รักษาสมดุลมหานครกับธรรมชาติอย่างยั่งยืน!`,
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

      const nextTxt = this.makeText('ด่านถัดไป (NEXT LEVEL)', {
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

      const btnTxt = this.makeText('เล่นต่อในด่านนี้ (CONTINUE)', {
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

          if (btn.id === 'vid_toggle_play') {
            this.videoPaused = !this.videoPaused;
            return;
          }

          if (btn.id === 'vid_use_feature') {
            const act = btn.useAction || {};
            this.closeModal();
            if (act.type === 'tool') {
              this.selectTool(act.value);
            } else if (act.type === 'video') {
              this.showFeatureVideoModal(act.value);
            } else if (act.type === 'action') {
              this.triggerAction(act.value);
            }
            return;
          }

          if (btn.id === 'start_fast_tutorial') {
            this.closeModal();
            if (this.game) this.game.startTutorial();
            return;
          }

          if (btn.id === 'toggle_sdg15_story') {
            this.showSdg15Story = !this.showSdg15Story;
            if (this.game) {
              this.game.sdg15Unlocked = true;
              if (this.showSdg15Story) {
                this.game.addFloatingText('🌱 ปลดล็อก Easter Egg บันทึกเรื่องสั้น SDG 15 (Life on Land)!', CONFIG.CANVAS_WIDTH / 2, 70, '#56ab2f');
                if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
              }
            }
            return;
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

          if (btn.id && btn.id.startsWith('act_test_')) {
            if (this.game && this.game.testDisaster && this.game.testDisaster(btn.id.slice(9))) this.closeModal();
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
