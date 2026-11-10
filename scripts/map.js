// POWATER CORP. v1.0.0.0 - City Map, River Flow, High Tide & Flood Environment
// Handles terrain grid, city river sprites, smooth animated water current ripples, High Tide & Flood visuals

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};
  if (global.POWATER.CityMap) return;

  class CityMap {
    constructor(levelConfig, runtimeScene = null) {
      this.level = levelConfig || {};
      this.runtimeScene = runtimeScene;
      this.width = (global.POWATER && global.POWATER.CONFIG && global.POWATER.CONFIG.CANVAS_WIDTH) || 1280;
      this.height = (global.POWATER && global.POWATER.CONFIG && global.POWATER.CONFIG.CANVAS_HEIGHT) || 720;
      this.riverPath = (levelConfig && levelConfig.riverPath) || [
        { x: 610, y: 0 },
        { x: 650, y: 180 },
        { x: 570, y: 360 },
        { x: 690, y: 540 },
        { x: 650, y: 720 }
      ];
      this._riverWidth = (levelConfig && levelConfig.riverWidth) || 100;
      this.waterTime = 0;
      this.pollutionVisual = 0.0;
      this.isHighTide = false;
      this.isFloodActive = false;
      this.ripples = [];
      this.cell = 8; // water mask resolution (px)
      this.mask = null;

      for (let i = 0; i < 32; i++) {
        this.ripples.push({
          t: Math.random(),
          offsetFrac: (Math.random() - 0.5) * 0.75,
          speed: 0.10 + Math.random() * 0.16,
          size: 4 + Math.random() * 8
        });
      }
    }

    setRuntimeScene(scene) {
      this.runtimeScene = scene;
    }

    getRiverObject() {
      if (this.runtimeScene && typeof this.runtimeScene.getObjects === 'function') {
        const objs = this.runtimeScene.getObjects('river');
        if (objs && objs.length > 0) return objs[0];
      }
      return null;
    }

    getRiverDefaultX() {
      const id = (this.level && this.level.id) ? this.level.id.toLowerCase() : '';
      if (id === 'rome' || id === 'venice') return 420;
      if (id === 'tokyo') return 460;
      return 490;
    }

    getRiverDefaultWidth() {
      const id = (this.level && this.level.id) ? this.level.id.toLowerCase() : '';
      if (id === 'rome' || id === 'venice') return 400;
      if (id === 'tokyo') return 240;
      return 280;
    }

    get riverWidth() {
      return this.getRiverWidth();
    }

    set riverWidth(val) {
      this._riverWidth = val;
    }

    getRiverWidth() {
      const riverObj = this.getRiverObject();
      const defW = this.getRiverDefaultWidth();
      let baseW = this._riverWidth || 100;
      if (riverObj) {
        baseW = baseW * (riverObj.getWidth() / defW);
      }
      if (this.isHighTide) {
        baseW *= 1.18;
      }
      return baseW;
    }

    getRiverCenterAtY(y) {
      const riverObj = this.getRiverObject();
      const defX = this.getRiverDefaultX();
      const defW = this.getRiverDefaultWidth();
      let shiftX = 0;
      let scaleX = 1.0;
      if (riverObj) {
        shiftX = riverObj.getX() - defX;
        scaleX = riverObj.getWidth() / defW;
      }

      const pts = this.riverPath;
      if (pts && pts.length > 0) {
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          if (y >= p1.y && y <= p2.y) {
            const frac = (y - p1.y) / (p2.y - p1.y);
            const smoothFrac = (1 - Math.cos(frac * Math.PI)) / 2;
            const baseX = p1.x + (p2.x - p1.x) * smoothFrac;
            const localX = (baseX - defX) * scaleX;
            return defX + shiftX + localX;
          }
        }
        return (pts[0].x - defX) * scaleX + defX + shiftX;
      }
      return (defX + defW / 2) + shiftX;
    }

    // Water comes from the city map image (scene object 'map_bg'): cyan water vs cream land on an 8px grid.
    // Falls back to the old spline river when the image can't be read.
    buildWaterMask() {
      if (this.mask || this._maskFailed) return this.mask;
      try {
        const objs = this.runtimeScene && this.runtimeScene.getObjects ? this.runtimeScene.getObjects('map_bg') : null;
        const bg = objs && objs[0];
        const spr = bg && bg.getRendererObject ? bg.getRendererObject() : null;
        const base = spr && spr.texture && spr.texture.baseTexture;
        const src = base && base.valid && base.resource && base.resource.source;
        if (!src || typeof document === 'undefined') return null;
        const C = this.cell, cols = Math.ceil(this.width / C), rows = Math.ceil(this.height / C);
        const cv = document.createElement('canvas');
        cv.width = cols; cv.height = rows;
        const ctx = cv.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(src, bg.getX() / C, bg.getY() / C, bg.getWidth() / C, bg.getHeight() / C);
        const px = ctx.getImageData(0, 0, cols, rows).data;
        const mask = new Uint8Array(cols * rows);
        for (let i = 0; i < mask.length; i++) mask[i] = (px[i * 4 + 3] > 0 && px[i * 4 + 2] - px[i * 4] > 50) ? 1 : 0;
        this.cols = cols; this.rows = rows; this.mask = mask;
        this.waterCells = []; this.edgeCells = []; this.waterRuns = [];
        for (let r = 0; r < rows; r++) {
          let runStart = -1;
          for (let c = 0; c <= cols; c++) {
            const w = c < cols && mask[r * cols + c];
            if (w) {
              this.waterCells.push(r * cols + c);
              const land = (cc, rr) => cc >= 0 && rr >= 0 && cc < cols && rr < rows && !mask[rr * cols + cc];
              if (land(c - 1, r) || land(c + 1, r) || land(c, r - 1) || land(c, r + 1)) this.edgeCells.push(r * cols + c);
              if (runStart < 0) runStart = c;
            } else if (runStart >= 0) {
              this.waterRuns.push([runStart * C, r * C, (c - runStart) * C]);
              runStart = -1;
            }
          }
        }
      } catch (e) {
        this._maskFailed = true; // e.g. tainted canvas: keep the spline fallback
      }
      return this.mask;
    }

    waterAt(x, y) {
      const c = Math.floor(x / this.cell), r = Math.floor(y / this.cell);
      return c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.mask[r * this.cols + c] === 1;
    }

    waterWithin(x, y, radius) {
      const C = this.cell, rr = Math.ceil(radius / C);
      const c0 = Math.floor(x / C), r0 = Math.floor(y / C);
      for (let dr = -rr; dr <= rr; dr++) {
        for (let dc = -rr; dc <= rr; dc++) {
          if ((dc * dc + dr * dr) * C * C > (radius + C) * (radius + C)) continue;
          const c = c0 + dc, r = r0 + dr;
          if (c >= 0 && r >= 0 && c < this.cols && r < this.rows && this.mask[r * this.cols + c]) return true;
        }
      }
      return false;
    }

    isPointInRiver(x, y) {
      if (this.buildWaterMask()) return this.isHighTide ? this.waterWithin(x, y, 10) : this.waterAt(x, y);
      const rx = this.getRiverCenterAtY(y);
      return Math.abs(x - rx) < (this.getRiverWidth() / 2);
    }

    isNearRiver(x, y, maxDist = 75) {
      if (this.buildWaterMask()) return this.waterWithin(x, y, maxDist);
      const rx = this.getRiverCenterAtY(y);
      const halfW = this.getRiverWidth() / 2;
      const dist = Math.abs(x - rx);
      return dist >= halfW * 0.85 && dist <= (halfW + maxDist);
    }

    checkLineIntersectsRiver(p1, p2) {
      if (this.buildWaterMask()) {
        const n = Math.max(1, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 6));
        for (let i = 0; i <= n; i++) {
          if (this.waterAt(p1.x + (p2.x - p1.x) * i / n, p1.y + (p2.y - p1.y) * i / n)) return true;
        }
        return false;
      }
      const r1 = this.getRiverCenterAtY(p1.y);
      const r2 = this.getRiverCenterAtY(p2.y);
      const side1 = p1.x < r1 ? -1 : 1;
      const side2 = p2.x < r2 ? -1 : 1;
      return side1 !== side2;
    }

    update(dt, currentPollution, maxPollution, isHighTide = false, isFloodActive = false) {
      this.waterTime += dt;
      this.isHighTide = isHighTide;
      this.isFloodActive = isFloodActive;
      const targetVis = Math.min(1.0, currentPollution / Math.max(0.1, maxPollution));
      this.pollutionVisual += (targetVis - this.pollutionVisual) * dt * 2.0;

      const speedMult = this.isHighTide ? 1.6 : 1.0;
      this.ripples.forEach(r => {
        r.t += dt * r.speed * speedMult;
        if (r.t > 1.0) {
          r.t = 0;
          r.offsetFrac = (Math.random() - 0.5) * 0.75;
          r.cell = -1;
        }
      });
    }

    render(pixiGfx) {
      if (!pixiGfx) return;

      // 1. Dynamic river water tint on the GDevelop scene object 'river'
      const riverObj = this.getRiverObject();
      if (riverObj && typeof riverObj.setColor === 'function') {
        const rC = Math.round(255 - (255 - 130) * this.pollutionVisual);
        const gC = Math.round(255 - (255 - 150) * this.pollutionVisual);
        const bC = Math.round(255 - (255 - 75) * this.pollutionVisual);
        riverObj.setColor(`${rC};${gC};${bC}`);
      }

      // Image-based water: pollution tint, high-tide shoreline glow and drifting ripples on real water cells
      if (this.buildWaterMask()) {
        const C = this.cell;
        if (this.pollutionVisual > 0.02) {
          pixiGfx.lineStyle(0);
          pixiGfx.beginFill(0x7a8f3a, Math.min(0.5, this.pollutionVisual * 0.5));
          this.waterRuns.forEach(([x, y, w]) => pixiGfx.drawRect(x, y, w, C));
          pixiGfx.endFill();
        }
        if (this.isHighTide) {
          pixiGfx.lineStyle(0);
          pixiGfx.beginFill(0x00b4d8, 0.28 + Math.sin(this.waterTime * 4.0) * 0.1);
          this.edgeCells.forEach(i => pixiGfx.drawCircle((i % this.cols) * C + C / 2, Math.floor(i / this.cols) * C + C / 2, 7));
          pixiGfx.endFill();
        }
        if (this.waterCells.length) {
          this.ripples.forEach(r => {
            if (!(r.cell >= 0)) r.cell = this.waterCells[Math.floor(Math.random() * this.waterCells.length)];
            const rx = (r.cell % this.cols) * C + (r.t - 0.5) * 18;
            const ry = Math.floor(r.cell / this.cols) * C + Math.sin(r.t * Math.PI * 2) * 2;
            pixiGfx.beginFill(this.pollutionVisual > 0.5 ? 0xb4dc64 : 0xffffff, 0.35 * Math.sin(r.t * Math.PI));
            pixiGfx.drawEllipse(rx, ry, r.size, r.size * 0.32);
            pixiGfx.endFill();
          });
        }
        if (this.isFloodActive) {
          pixiGfx.beginFill(0x0077b6, 0.25 + Math.sin(this.waterTime * 3.5) * 0.08);
          pixiGfx.drawRect(0, 44, this.width, this.height - 44);
          pixiGfx.endFill();
        }
        return;
      }

      // 2. High Tide glowing shoreline surge
      const riverW = this.getRiverWidth();
      if (this.isHighTide) {
        const pulse = 0.22 + Math.sin(this.waterTime * 4.0) * 0.08;
        pixiGfx.lineStyle(14, 0x00b4d8, pulse);
        for (let y = 0; y <= this.height; y += 24) {
          const rx = this.getRiverCenterAtY(y);
          if (y === 0) pixiGfx.moveTo(rx, y);
          else pixiGfx.lineTo(rx, y);
        }
      }

      // 3. Smooth animated water droplets drifting down the curvy river current
      this.ripples.forEach(r => {
        const ry = r.t * this.height;
        const rx = this.getRiverCenterAtY(ry) + (r.offsetFrac || 0) * (riverW * 0.65);
        const rColor = this.pollutionVisual > 0.5 ? 0xb4dc64 : (this.isHighTide ? 0x90e0ef : 0xe0fbfc);
        const alpha = (this.pollutionVisual > 0.5 ? 0.18 : 0.26) * (1.0 - this.pollutionVisual * 0.3);

        pixiGfx.lineStyle(0);
        pixiGfx.beginFill(rColor, alpha);
        pixiGfx.drawEllipse(rx, ry, r.size, r.size * 0.32);
        pixiGfx.endFill();
      });

      // 4. Amsterdam Flood Rising Water Overlay
      if (this.isFloodActive) {
        const waveAlpha = 0.25 + Math.sin(this.waterTime * 3.5) * 0.08;
        pixiGfx.beginFill(0x0077b6, waveAlpha);
        pixiGfx.drawRect(0, 44, this.width, this.height - 44);
        pixiGfx.endFill();
      }
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.CityMap = CityMap;

})(typeof window !== 'undefined' ? window : globalThis);
