// POWATER CORP. - UI & Modal Manager
// Injects and coordinates Top HUD, Bottom Toolbar, Modals, Keyboard Shortcuts & Live Stats

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};
  if (global.POWATER.UIManager) return;

  const POWATER = global.POWATER || {};
  const CONFIG = POWATER.CONFIG || {};

  class UIManager {
    constructor(game) {
      this.game = game;
      this.root = null;
      this.toolButtons = [];
      this.hudElements = {};
      this.modals = {};
      this.lastSecond = -1;
    }

    init() {
      if (typeof document === 'undefined') return;
      if (document.getElementById('powater-ui-root')) {
        this.root = document.getElementById('powater-ui-root');
        return;
      }

      this.injectStyles();
      this.injectHtml();
      this.cacheDom();
      this.bindEvents();
      this.updateHUD();
    }

    injectStyles() {
      const style = document.createElement('style');
      style.id = 'powater-styles';
      style.textContent = `
        #powater-ui-root {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          pointer-events: none;
          z-index: 99999;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #f8f9fa;
          user-select: none;
          box-sizing: border-box;
        }
        #powater-ui-root * {
          box-sizing: border-box;
        }

        /* TOP HUD */
        #top-hud {
          pointer-events: auto;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 64px;
          background: rgba(18, 13, 36, 0.92);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(72, 202, 228, 0.25);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
        }
        .hud-left, .hud-center, .hud-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          background: rgba(0, 180, 216, 0.15);
          border: 1px solid rgba(72, 202, 228, 0.3);
          border-radius: 8px;
          padding: 5px 12px;
        }
        .logo-badge span.title {
          font-weight: 900;
          font-size: 14px;
          letter-spacing: 0.5px;
          background: linear-gradient(135deg, #00b4d8, #ffd166);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .select-level-dropdown {
          background: #17112e;
          border: 1px solid rgba(72, 202, 228, 0.3);
          color: #fff;
          font-weight: 700;
          font-size: 12px;
          border-radius: 6px;
          padding: 4px 8px;
          outline: none;
          cursor: pointer;
        }

        /* Stat Widgets */
        .stat-widget {
          background: rgba(26, 19, 52, 0.88);
          border: 1px solid rgba(72, 202, 228, 0.25);
          border-radius: 8px;
          padding: 4px 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 95px;
        }
        .stat-widget .stat-icon {
          font-size: 16px;
        }
        .stat-widget .stat-meta {
          display: flex;
          flex-direction: column;
        }
        .stat-widget .stat-label {
          font-size: 9px;
          color: #adb5bd;
          text-transform: uppercase;
        }
        .stat-widget .stat-val {
          font-size: 14px;
          font-weight: 800;
        }
        .stat-widget.money .stat-val {
          color: #ffd166;
        }
        .stat-widget.grace {
          border-color: rgba(6, 214, 160, 0.5);
          background: rgba(6, 214, 160, 0.08);
        }
        .stat-widget.grace .stat-val {
          color: #06d6a0;
        }

        /* Pollution Bar */
        .stat-widget.pollution {
          min-width: 140px;
        }
        .pollution-bar-bg {
          width: 100%;
          height: 5px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
          overflow: hidden;
          margin-top: 2px;
        }
        .pollution-bar-fill {
          height: 100%;
          width: 0%;
          background: #06d6a0;
          transition: width 0.3s, background-color 0.3s;
        }

        /* Complaints Box */
        .complaints-box {
          display: flex;
          gap: 4px;
          margin-top: 1px;
        }
        .complaint-pip {
          width: 14px;
          height: 14px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          color: #666;
        }
        .complaint-pip.active {
          background: #e63946;
          border-color: #ff4d6d;
          color: #fff;
          box-shadow: 0 0 6px #e63946;
        }

        /* Header Buttons */
        .btn-header {
          pointer-events: auto;
          background: rgba(26, 19, 52, 0.85);
          border: 1px solid rgba(72, 202, 228, 0.3);
          border-radius: 8px;
          color: #fff;
          font-weight: 700;
          font-size: 11px;
          padding: 6px 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .btn-header:hover {
          background: rgba(0, 180, 216, 0.25);
          border-color: #00b4d8;
        }
        .btn-header.highlight {
          background: linear-gradient(135deg, rgba(255, 209, 102, 0.25), rgba(255, 183, 3, 0.35));
          border-color: #ffd166;
          color: #ffd166;
        }

        .speed-group {
          display: flex;
          background: rgba(15, 12, 30, 0.8);
          border-radius: 8px;
          border: 1px solid rgba(72, 202, 228, 0.2);
          padding: 2px;
        }
        .speed-btn {
          pointer-events: auto;
          background: transparent;
          border: none;
          color: #adb5bd;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
        }
        .speed-btn.active {
          background: #00b4d8;
          color: #fff;
        }

        /* BOTTOM TOOLBAR */
        #bottom-toolbar {
          pointer-events: auto;
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(18, 13, 36, 0.94);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(72, 202, 228, 0.3);
          border-radius: 12px;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
        }
        .tool-btn {
          background: rgba(26, 19, 52, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 5px 9px;
          color: #f8f9fa;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 68px;
          transition: all 0.15s;
        }
        .tool-btn:hover {
          background: rgba(0, 180, 216, 0.2);
          border-color: #00b4d8;
        }
        .tool-btn.active {
          background: rgba(0, 180, 216, 0.35);
          border-color: #ffd166;
          box-shadow: 0 0 10px rgba(0, 180, 216, 0.5);
        }
        .tool-btn .tool-cost {
          font-size: 9px;
          color: #06d6a0;
        }
        .tool-btn .keybind {
          font-size: 8px;
          color: #adb5bd;
          background: rgba(0,0,0,0.4);
          padding: 1px 4px;
          border-radius: 3px;
        }
        .tool-divider {
          width: 1px;
          height: 28px;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 4px;
        }

        /* MODALS */
        .modal-backdrop {
          pointer-events: auto;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(10, 7, 20, 0.85);
          backdrop-filter: blur(8px);
          display: none;
          align-items: center;
          justify-content: center;
          z-index: 100000;
        }
        .modal-backdrop.active {
          display: flex;
        }
        .modal-window {
          background: #17112e;
          border: 1px solid rgba(72, 202, 228, 0.35);
          border-radius: 14px;
          width: 90%;
          max-width: 600px;
          box-shadow: 0 12px 36px rgba(0,0,0,0.7);
          overflow: hidden;
        }
        .modal-header {
          padding: 14px 18px;
          background: rgba(0, 180, 216, 0.12);
          border-bottom: 1px solid rgba(72, 202, 228, 0.25);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .modal-header h2 {
          font-size: 15px;
          font-weight: 800;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .modal-close {
          background: transparent;
          border: none;
          color: #adb5bd;
          font-size: 20px;
          cursor: pointer;
        }
        .modal-body {
          padding: 16px 18px;
          max-height: 70vh;
          overflow-y: auto;
        }
        .modal-footer {
          padding: 12px 18px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: flex-end;
        }
        .btn-primary {
          background: #00b4d8;
          border: none;
          border-radius: 8px;
          color: #fff;
          font-weight: 700;
          font-size: 13px;
          padding: 8px 16px;
          cursor: pointer;
        }
        .btn-primary:hover {
          background: #0096c7;
        }

        /* Upgrade Cards */
        .upgrade-card {
          background: rgba(26, 19, 52, 0.9);
          border: 1px solid rgba(72, 202, 228, 0.2);
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .upgrade-info h4 {
          margin: 0 0 4px 0;
          font-size: 13px;
          color: #ffd166;
        }
        .upgrade-info p {
          margin: 0;
          font-size: 11px;
          color: #adb5bd;
        }
        .upgrade-btn {
          background: #06d6a0;
          border: none;
          border-radius: 6px;
          padding: 6px 12px;
          font-weight: 800;
          font-size: 12px;
          color: #120d24;
          cursor: pointer;
        }
      `;
      document.head.appendChild(style);
    }

    injectHtml() {
      const root = document.createElement('div');
      root.id = 'powater-ui-root';
      root.innerHTML = `
        <!-- TOP HUD -->
        <header id="top-hud">
          <div class="hud-left">
            <div class="logo-badge" id="btn-show-briefing" title="ดูภารกิจ & Amigo">
              <span style="font-size:16px;">⚡💧</span>
              <span class="title">POWATER CORP.</span>
            </div>
            <select class="select-level-dropdown" id="select-level">
              <option value="0">กรุงเทพฯ (Bangkok - Demo)</option>
              <option value="1">เวนิส (Venice - Italy)</option>
              <option value="2">โตเกียว (Tokyo - Japan)</option>
              <option value="3">โหมดไม่มีที่สิ้นสุด (Endless)</option>
            </select>
          </div>

          <div class="hud-center">
            <!-- Budget -->
            <div class="stat-widget money" title="งบประมาณคงเหลือ">
              <div class="stat-icon">💰</div>
              <div class="stat-meta">
                <span class="stat-label">งบประมาณ</span>
                <span class="stat-val" id="hud-money">$120</span>
              </div>
            </div>

            <!-- Population -->
            <div class="stat-widget" title="ประชากรที่มีสุขภาวะ">
              <div class="stat-icon">🏘️</div>
              <div class="stat-meta">
                <span class="stat-label">สุขภาวะ</span>
                <span class="stat-val" id="hud-houses-served">0 / 0</span>
              </div>
            </div>

            <!-- Pollution -->
            <div class="stat-widget pollution" id="hud-pollution-box" title="มลภาวะรวม">
              <div class="stat-icon">☢️</div>
              <div class="stat-meta" style="flex:1;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span class="stat-label">มลภาวะ <span id="hud-pollution-rate" style="font-size:9px; font-weight:700; color:#06d6a0;">(+0.00/s)</span></span>
                  <span class="stat-label" id="hud-pollution-text">0.0 / 5.0</span>
                </div>
                <div class="pollution-bar-bg">
                  <div class="pollution-bar-fill" id="hud-pollution-bar"></div>
                </div>
              </div>
            </div>

            <!-- Grace Period -->
            <div class="stat-widget grace" id="hud-grace-box" title="ช่วงเตรียมตัว 2 นาทีแรก">
              <div class="stat-icon">🛡️</div>
              <div class="stat-meta">
                <span class="stat-label">ช่วงเตรียมตัว</span>
                <span class="stat-val" id="hud-grace-timer">02:00</span>
              </div>
            </div>

            <!-- Complaints -->
            <div class="stat-widget" title="คำร้องเรียน (3 ครั้ง = แพ้)">
              <div class="stat-icon">⚠️</div>
              <div class="stat-meta">
                <span class="stat-label">ร้องเรียน (<span id="hud-complaints-text">0/3</span>)</span>
                <div class="complaints-box">
                  <div class="complaint-pip">✖</div>
                  <div class="complaint-pip">✖</div>
                  <div class="complaint-pip">✖</div>
                </div>
              </div>
            </div>

            <!-- Calendar -->
            <div class="stat-widget" title="วันในสัปดาห์">
              <div class="stat-icon">📅</div>
              <div class="stat-meta">
                <span class="stat-label">ปฏิทิน</span>
                <span class="stat-val" id="hud-day-name" style="font-size:12px;">MON (D1)</span>
              </div>
            </div>
          </div>

          <div class="hud-right">
            <div class="speed-group">
              <button class="speed-btn" id="btn-pause">⏸</button>
              <button class="speed-btn active" id="btn-speed-1x">1x</button>
              <button class="speed-btn" id="btn-speed-2x">2x</button>
            </div>
            <button class="btn-header highlight" id="btn-open-upgrades">⚙️ UPGRADE</button>
            <button class="btn-header" id="btn-open-sdg">🌍 SDGs</button>
            <button class="btn-header" id="btn-toggle-sfx">🔊 SFX</button>
            <button class="btn-header" id="btn-toggle-music">🎵 BGM</button>
          </div>
        </header>

        <!-- BOTTOM TOOLBAR -->
        <nav id="bottom-toolbar">
          <button class="tool-btn active" data-tool="power" title="สายไฟฟ้า (ฟรี)">
            <span>⚡ สายไฟ</span>
            <span class="tool-cost">ฟรี</span>
            <span class="keybind">1</span>
          </button>
          <button class="tool-btn" data-tool="water" title="ท่อน้ำดี (ฟรี)">
            <span>💧 ท่อน้ำ</span>
            <span class="tool-cost">ฟรี</span>
            <span class="keybind">2</span>
          </button>
          <button class="tool-btn" data-tool="sewage" title="ท่อระบายน้ำเสีย (ฟรี)">
            <span>🧪 ระบายน้ำ</span>
            <span class="tool-cost">ฟรี</span>
            <span class="keybind">3</span>
          </button>

          <div class="tool-divider"></div>

          <button class="tool-btn" data-tool="build_gen" title="โรงไฟฟ้า ($30)">
            <span>🏭 โรงไฟฟ้า</span>
            <span class="tool-cost">$30</span>
            <span class="keybind">4</span>
          </button>
          <button class="tool-btn" data-tool="build_solar" title="โซลาร์เซลล์ 0% มลภาวะ ($60)">
            <span>☀️ โซลาร์</span>
            <span class="tool-cost">$60</span>
            <span class="keybind">5</span>
          </button>
          <button class="tool-btn" data-tool="build_pump" title="ปั๊มน้ำริมแม่น้ำ ($30)">
            <span>💧 ปั๊มน้ำ</span>
            <span class="tool-cost">$30</span>
            <span class="keybind">6</span>
          </button>
          <button class="tool-btn" data-tool="build_filter" title="จุดปล่อยน้ำเสียริมแม่น้ำ ($40)">
            <span>🧪 ปล่อยน้ำเสีย</span>
            <span class="tool-cost">$40</span>
            <span class="keybind">7</span>
          </button>
          <button class="tool-btn" data-tool="build_air_filter" title="เครื่องฟอกอากาศ ($40)">
            <span>🍃 ฟอกอากาศ</span>
            <span class="tool-cost">$40</span>
            <span class="keybind">8</span>
          </button>

          <div class="tool-divider"></div>

          <button class="tool-btn" data-tool="delete" title="รื้อถอน (คืนเงิน 50%)">
            <span>🧹 รื้อถอน</span>
            <span class="keybind">D</span>
          </button>
        </nav>

        <!-- MODAL: UPGRADE SHOP -->
        <div class="modal-backdrop" id="modal-upgrade">
          <div class="modal-window">
            <div class="modal-header">
              <h2>⚙️ POWATER CORP. UPGRADE CENTER</h2>
              <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body" id="upgrade-cards-container"></div>
            <div class="modal-footer">
              <button class="btn-primary modal-close">เสร็จสิ้น (กลับสู่เกม)</button>
            </div>
          </div>
        </div>

        <!-- MODAL: SDGs -->
        <div class="modal-backdrop" id="modal-sdg">
          <div class="modal-window">
            <div class="modal-header">
              <h2>🌍 UNITED NATIONS SDGs x POWATER CORP.</h2>
              <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <div style="font-size:13px; line-height:1.6; color:#cbd5e1;">
                <div style="border-left: 3px solid #26bde2; padding-left: 10px; margin-bottom: 12px;">
                  <h4 style="color:#26bde2; margin:0 0 4px 0;">SDG 6: Clean Water and Sanitation</h4>
                  <p style="margin:0;">บำบัดน้ำเสียผ่านบ่อบำบัดริมแม่น้ำ เพื่อไม่ให้น้ำเสียรั่วไหลลงสู่แม่น้ำสายหลักของเมือง</p>
                </div>
                <div style="border-left: 3px solid #fcc30b; padding-left: 10px; margin-bottom: 12px;">
                  <h4 style="color:#fcc30b; margin:0 0 4px 0;">SDG 7: Affordable and Clean Energy</h4>
                  <p style="margin:0;">เลือกใช้พลังงานแสงอาทิตย์ (Solar Farm) เพื่อผลิตไฟฟ้าโดยไม่ปล่อยมลภาวะสู่บรรยากาศ</p>
                </div>
                <div style="border-left: 3px solid #fd9d24; padding-left: 10px; margin-bottom: 12px;">
                  <h4 style="color:#fd9d24; margin:0 0 4px 0;">SDG 11: Sustainable Cities</h4>
                  <p style="margin:0;">วางผังเมืองและโครงสร้างพื้นฐานคู่ขนาน (ไฟฟ้า + น้ำ + สิ่งแวดล้อม) อย่างชาญฉลาดและยั่งยืน</p>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-primary modal-close">ปิด</button>
            </div>
          </div>
        </div>

        <!-- MODAL: MISSION BRIEFING -->
        <div class="modal-backdrop" id="modal-briefing">
          <div class="modal-window">
            <div class="modal-header">
              <h2><span>🗺️</span> <span id="briefing-title">กรุงเทพมหานคร</span></h2>
              <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <p style="font-style:italic; color:#ffd166; font-size:13px; margin-bottom:10px;" id="briefing-quote"></p>
              <p style="font-size:12px; line-height:1.6; color:#cbd5e1;" id="briefing-desc"></p>
              <div style="margin-top:12px; font-size:12px; color:#48cae4;">
                <strong>เป้าหมายภารกิจ:</strong> อยู่รอดให้ครบจำนวนวัน และดูแลประชาชนให้ได้รับน้ำและไฟฟ้าครบถ้วน มลภาวะต้องไม่เกินลิมิต!
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-primary modal-close">เริ่มบริหารโครงสร้างพื้นฐาน ➔</button>
            </div>
          </div>
        </div>

        <!-- MODAL: GRACE PERIOD ENDED -->
        <div class="modal-backdrop" id="modal-grace-ended">
          <div class="modal-window">
            <div class="modal-header">
              <h2 style="color:#ffd166;">⚠️ การแจ้งเตือนจาก Amigo</h2>
              <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
              <p style="font-size:13px; line-height:1.6; color:#f8f9fa;">
                "ครบกำหนดช่วงเวลาเตรียมตัว 2 นาทีแรกแล้ว! จากนี้เป็นต้นไป ประชาชนจะเริ่มนับถอยหลังความอดทน หากบ้านใดขาดแคลนไฟฟ้า น้ำสะอาด หรือน้ำเสียเอ่อล้น จะเกิดการร้องเรียนทันที (3 ครั้ง = Game Over)!"
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn-primary modal-close" id="btn-resume-from-grace">รับทราบและลุยต่อ ➔</button>
            </div>
          </div>
        </div>

        <!-- MODAL: GAME OVER -->
        <div class="modal-backdrop" id="modal-gameover">
          <div class="modal-window">
            <div class="modal-header" style="background:rgba(230,57,70,0.2);">
              <h2 style="color:#ff4d6d;">💀 GAME OVER (เมืองล่มสลาย)</h2>
            </div>
            <div class="modal-body">
              <p id="gameover-reason" style="font-size:14px; color:#f8f9fa; line-height:1.6;"></p>
            </div>
            <div class="modal-footer">
              <button class="btn-primary" id="btn-restart-level">เริ่มเล่นด่านนี้ใหม่ ↺</button>
            </div>
          </div>
        </div>

        <!-- MODAL: GAME WON -->
        <div class="modal-backdrop" id="modal-gamewon">
          <div class="modal-window">
            <div class="modal-header" style="background:rgba(6,214,160,0.2);">
              <h2 style="color:#06d6a0;">🏆 ภารกิจสำเร็จ! (VICTORY)</h2>
            </div>
            <div class="modal-body">
              <p style="font-size:14px; color:#f8f9fa; line-height:1.6;">
                ยอดเยี่ยมมาก! คุณบริหารโครงข่ายสาธารณูปโภคได้อย่างยั่งยืน ประชาชนมีสุขภาวะครบถ้วน และรักษาสิ่งแวดล้อมไม่ให้มลพิษเกินเกณฑ์!
              </p>
            </div>
            <div class="modal-footer">
              <button class="btn-primary" id="btn-next-level">ด่านถัดไป ➔</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(root);
      this.root = root;
    }

    cacheDom() {
      this.hudElements.money = document.getElementById('hud-money');
      this.hudElements.housesServed = document.getElementById('hud-houses-served');
      this.hudElements.pollutionText = document.getElementById('hud-pollution-text');
      this.hudElements.pollutionBar = document.getElementById('hud-pollution-bar');
      this.hudElements.pollutionRate = document.getElementById('hud-pollution-rate');
      this.hudElements.graceTimer = document.getElementById('hud-grace-timer');
      this.hudElements.graceBox = document.getElementById('hud-grace-box');
      this.hudElements.complaintsText = document.getElementById('hud-complaints-text');
      this.hudElements.complaintBoxes = document.querySelectorAll('.complaint-pip');
      this.hudElements.dayName = document.getElementById('hud-day-name');

      this.modals.upgrade = document.getElementById('modal-upgrade');
      this.modals.sdg = document.getElementById('modal-sdg');
      this.modals.briefing = document.getElementById('modal-briefing');
      this.modals.graceEnded = document.getElementById('modal-grace-ended');
      this.modals.gameover = document.getElementById('modal-gameover');
      this.modals.gamewon = document.getElementById('modal-gamewon');

      this.toolButtons = document.querySelectorAll('.tool-btn');
    }

    bindEvents() {
      // 1. Tool selection
      this.toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const tool = btn.getAttribute('data-tool');
          this.selectTool(tool);
          if (POWATER.soundManager) POWATER.soundManager.playClick();
        });
      });

      // 2. Speed & Pause controls
      document.getElementById('btn-pause').addEventListener('click', () => {
        this.game.isPaused = !this.game.isPaused;
        document.getElementById('btn-pause').classList.toggle('active', this.game.isPaused);
        if (POWATER.soundManager) POWATER.soundManager.playClick();
      });

      document.getElementById('btn-speed-1x').addEventListener('click', () => {
        this.game.gameSpeed = 1.0;
        document.getElementById('btn-speed-1x').classList.add('active');
        document.getElementById('btn-speed-2x').classList.remove('active');
      });

      document.getElementById('btn-speed-2x').addEventListener('click', () => {
        this.game.gameSpeed = 2.0;
        document.getElementById('btn-speed-2x').classList.add('active');
        document.getElementById('btn-speed-1x').classList.remove('active');
      });

      // 3. Modals
      document.getElementById('btn-open-upgrades').addEventListener('click', () => {
        this.openUpgradeModal();
        if (POWATER.soundManager) POWATER.soundManager.playClick();
      });

      document.getElementById('btn-open-sdg').addEventListener('click', () => {
        this.modals.sdg.classList.add('active');
        if (POWATER.soundManager) POWATER.soundManager.playClick();
      });

      document.getElementById('btn-show-briefing').addEventListener('click', () => {
        this.showLevelBriefing(this.game.currentLevel);
        if (POWATER.soundManager) POWATER.soundManager.playClick();
      });

      // 4. Audio toggles
      document.getElementById('btn-toggle-sfx').addEventListener('click', (e) => {
        if (POWATER.soundManager) {
          const enabled = POWATER.soundManager.toggleSfx();
          e.currentTarget.textContent = enabled ? '🔊 SFX' : '🔇 SFX';
        }
      });

      document.getElementById('btn-toggle-music').addEventListener('click', (e) => {
        if (POWATER.soundManager) {
          const enabled = POWATER.soundManager.toggleMusic();
          e.currentTarget.textContent = enabled ? '🎵 BGM' : '🔇 BGM';
        }
      });

      // 5. Modal closes
      document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const modal = e.target.closest('.modal-backdrop');
          if (modal) modal.classList.remove('active');
          if (POWATER.soundManager) POWATER.soundManager.playClick();
        });
      });

      document.getElementById('btn-resume-from-grace').addEventListener('click', () => {
        this.modals.graceEnded.classList.remove('active');
        this.game.isPaused = false;
      });

      document.getElementById('btn-restart-level').addEventListener('click', () => {
        this.modals.gameover.classList.remove('active');
        this.game.startLevel(this.game.levelIndex);
      });

      document.getElementById('btn-next-level').addEventListener('click', () => {
        this.modals.gamewon.classList.remove('active');
        const nextIdx = (this.game.levelIndex + 1) % CONFIG.LEVELS.length;
        this.game.startLevel(nextIdx);
        document.getElementById('select-level').value = nextIdx;
      });

      // 6. Level select
      document.getElementById('select-level').addEventListener('change', (e) => {
        const idx = parseInt(e.target.value);
        this.game.startLevel(idx);
        this.showLevelBriefing(this.game.currentLevel);
      });

      // 7. Keybinds
      window.addEventListener('keydown', (e) => {
        switch (e.key.toLowerCase()) {
          case '1': this.selectTool('power'); break;
          case '2': this.selectTool('water'); break;
          case '3': this.selectTool('sewage'); break;
          case '4': this.selectTool('build_gen'); break;
          case '5': this.selectTool('build_solar'); break;
          case '6': this.selectTool('build_pump'); break;
          case '7': this.selectTool('build_filter'); break;
          case '8': this.selectTool('build_air_filter'); break;
          case 'd':
          case 'x': this.selectTool('delete'); break;
          case ' ':
            this.game.isPaused = !this.game.isPaused;
            document.getElementById('btn-pause').classList.toggle('active', this.game.isPaused);
            break;
          case 'u': this.openUpgradeModal(); break;
        }
      });
    }

    selectTool(tool) {
      this.game.activeTool = tool;
      this.toolButtons.forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tool') === tool);
      });
    }

    updateHUD() {
      if (!this.hudElements.money) return;

      // Money
      this.hudElements.money.textContent = `$${Math.floor(this.game.money)}`;

      // Population
      const happyCount = this.game.houses.filter(h => h.hasPower && h.hasWater && h.hasDrainage).length;
      const targetCount = this.game.currentLevel.targetHousesServed || 12;
      this.hudElements.housesServed.textContent = `${happyCount} / ${targetCount}`;

      // Pollution
      const curPoll = this.game.pollution;
      const maxPoll = this.game.currentLevel.maxPollution || 5.0;
      this.hudElements.pollutionText.textContent = `${curPoll.toFixed(1)} / ${maxPoll.toFixed(1)}`;
      const pollPct = Math.min(100, (curPoll / maxPoll) * 100);
      this.hudElements.pollutionBar.style.width = `${pollPct}%`;
      this.hudElements.pollutionBar.style.backgroundColor = pollPct > 75 ? '#e63946' : (pollPct > 45 ? '#ffd166' : '#06d6a0');

      const rateVal = this.game.currentPollutionRate;
      this.hudElements.pollutionRate.textContent = `(${rateVal >= 0 ? '+' : ''}${rateVal.toFixed(2)}/s)`;
      this.hudElements.pollutionRate.style.color = rateVal > 0 ? '#ffb703' : '#06d6a0';

      // Grace Period
      const remGrace = Math.max(0, (CONFIG.GRACE_PERIOD_SECONDS || 120) - this.game.levelElapsedTime);
      const mins = Math.floor(remGrace / 60);
      const secs = Math.floor(remGrace % 60);
      this.hudElements.graceTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (remGrace <= 0) {
        this.hudElements.graceBox.style.display = 'none';
      } else {
        this.hudElements.graceBox.style.display = 'flex';
      }

      // Complaints
      this.hudElements.complaintsText.textContent = `${this.game.complaints}/${CONFIG.MAX_COMPLAINTS}`;
      this.hudElements.complaintBoxes.forEach((pip, idx) => {
        pip.classList.toggle('active', idx < this.game.complaints);
      });

      // Day & Calendar
      const dayName = this.game.dayNames[this.game.dayIndex];
      this.hudElements.dayName.textContent = `${dayName} (D${this.game.totalDaysPassed + 1})`;
    }

    openUpgradeModal() {
      const container = document.getElementById('upgrade-cards-container');
      if (!container) return;
      container.innerHTML = '';

      Object.values(CONFIG.UPGRADES).forEach(upg => {
        const curLv = this.game.upgradeLevels[upg.id] || 0;
        const isMax = curLv >= upg.maxLevel;
        const cost = isMax ? 'MAX' : `$${Math.round(upg.baseCost * Math.pow(upg.costMult, curLv))}`;

        const card = document.createElement('div');
        card.className = 'upgrade-card';
        card.innerHTML = `
          <div class="upgrade-info">
            <h4>${upg.icon} ${upg.name} (LV. ${curLv}/${upg.maxLevel})</h4>
            <p>${upg.desc}</p>
          </div>
          <button class="upgrade-btn" ${isMax ? 'disabled style=\"opacity:0.5;\"' : ''}>
            ${isMax ? 'MAX' : `ซื้อ (${cost})`}
          </button>
        `;

        if (!isMax) {
          card.querySelector('.upgrade-btn').addEventListener('click', () => {
            this.game.buyUpgrade(upg.id);
            this.openUpgradeModal();
            this.updateHUD();
          });
        }

        container.appendChild(card);
      });

      this.modals.upgrade.classList.add('active');
    }

    showLevelBriefing(level) {
      if (!level) return;
      document.getElementById('briefing-title').textContent = level.thaiName || level.name;
      document.getElementById('briefing-quote').textContent = `"${level.amigoQuote || ''}"`;
      document.getElementById('briefing-desc').textContent = level.briefing || '';
      this.modals.briefing.classList.add('active');
    }

    showGracePeriodEndedModal() {
      this.modals.graceEnded.classList.add('active');
    }

    showGameOverModal(reason) {
      document.getElementById('gameover-reason').textContent = reason || 'ประชาชนยื่นเรื่องร้องเรียนครบ 3 รอบ!';
      this.modals.gameover.classList.add('active');
    }

    showGameWonModal() {
      this.modals.gamewon.classList.add('active');
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.UIManager = UIManager;

})(typeof window !== 'undefined' ? window : globalThis);
