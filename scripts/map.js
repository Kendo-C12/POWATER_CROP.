// POWATER CORP. - City Map & River Environment
// Handles terrain grid, Chao Phraya river flow, dynamic pollution water coloring, and proximity checks

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
        { x: 630, y: 0 },
        { x: 630, y: 720 }
      ];
      this._riverWidth = (levelConfig && levelConfig.riverWidth) || 100;
      this.waterTime = 0;
      this.pollutionVisual = 0.0;
      this.ripples = [];

      for (let i = 0; i < 28; i++) {
        this.ripples.push({
          t: Math.random(),
          offsetFrac: Math.random() - 0.5,
          speed: 0.12 + Math.random() * 0.18,
          size: 10 + Math.random() * 16
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

    get riverWidth() {
      return this.getRiverWidth();
    }

    set riverWidth(val) {
      this._riverWidth = val;
    }

    getRiverWidth() {
      const riverObj = this.getRiverObject();
      if (riverObj) {
        return riverObj.getWidth();
      }
      return this._riverWidth || 100;
    }

    getRiverCenterAtY(y) {
      const riverObj = this.getRiverObject();
      if (riverObj) {
        return riverObj.getX() + (riverObj.getWidth() / 2);
      }
      const pts = this.riverPath;
      if (pts && pts.length > 0) {
        for (let i = 0; i < pts.length - 1; i++) {
          const p1 = pts[i];
          const p2 = pts[i + 1];
          if (y >= p1.y && y <= p2.y) {
            const frac = (y - p1.y) / (p2.y - p1.y);
            return p1.x + (p2.x - p1.x) * frac;
          }
        }
        return pts[0].x;
      }
      return 630;
    }

    isPointInRiver(x, y) {
      const riverObj = this.getRiverObject();
      if (riverObj) {
        const rx = riverObj.getX();
        const rw = riverObj.getWidth();
        const ry = riverObj.getY();
        const rh = riverObj.getHeight();
        return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
      }
      const rx = this.getRiverCenterAtY(y);
      return Math.abs(x - rx) < (this.getRiverWidth() / 2);
    }

    isNearRiver(x, y, maxDist = 65) {
      const riverObj = this.getRiverObject();
      if (riverObj) {
        const rx = riverObj.getX();
        const rw = riverObj.getWidth();
        const distToLeft = Math.abs(x - rx);
        const distToRight = Math.abs(x - (rx + rw));
        const minDist = Math.min(distToLeft, distToRight);
        const inside = x >= rx && x <= rx + rw;
        return !inside && minDist <= maxDist;
      }
      const rx = this.getRiverCenterAtY(y);
      const halfW = this.getRiverWidth() / 2;
      const dist = Math.abs(x - rx);
      return dist >= halfW && dist <= (halfW + maxDist);
    }

    checkLineIntersectsRiver(p1, p2) {
      const r1 = this.getRiverCenterAtY(p1.y);
      const r2 = this.getRiverCenterAtY(p2.y);
      const side1 = p1.x < r1 ? -1 : 1;
      const side2 = p2.x < r2 ? -1 : 1;
      return side1 !== side2;
    }

    update(dt, currentPollution, maxPollution) {
      this.waterTime += dt;
      const targetVis = Math.min(1.0, currentPollution / Math.max(0.1, maxPollution));
      this.pollutionVisual += (targetVis - this.pollutionVisual) * dt * 2.0;

      this.ripples.forEach(r => {
        r.t += dt * r.speed;
        if (r.t > 1.0) {
          r.t = 0;
          r.offsetFrac = Math.random() - 0.5;
        }
      });
    }

    render(pixiGfx) {
      if (!pixiGfx) return;

      // 1. Urban Grid lines
      pixiGfx.lineStyle(1, 0x1f2442, 0.4);
      const step = 32;
      for (let x = 0; x < this.width; x += step) {
        pixiGfx.moveTo(x, 0);
        pixiGfx.lineTo(x, this.height);
      }
      for (let y = 0; y < this.height; y += step) {
        pixiGfx.moveTo(0, y);
        pixiGfx.lineTo(this.width, y);
      }

      // The scene object 'river' is the single source of truth for the visual river!
      // No duplicate second river is drawn here.

      // 2. Dynamic river water tint on the scene object if present
      const riverObj = this.getRiverObject();
      if (riverObj && typeof riverObj.setColor === 'function') {
        // Clean: 255;255;255 (normal sprite) -> Polluted: 140;160;90 (murky)
        const rC = Math.round(255 - (255 - 140) * this.pollutionVisual);
        const gC = Math.round(255 - (255 - 160) * this.pollutionVisual);
        const bC = Math.round(255 - (255 - 90) * this.pollutionVisual);
        riverObj.setColor(`${rC};${gC};${bC}`);
      }

      // 3. River Center Current Flow & Ripples (subtle water ripples over the river object)
      const riverW = this.getRiverWidth();
      pixiGfx.lineStyle(2, 0xffffff, 0.35 * (1.0 - this.pollutionVisual * 0.5));
      this.ripples.forEach(r => {
        const ry = r.t * this.height;
        const rx = this.getRiverCenterAtY(ry) + (r.offsetFrac || 0) * (riverW * 0.7);
        pixiGfx.moveTo(rx - r.size / 2, ry);
        pixiGfx.lineTo(rx + r.size / 2, ry);
      });
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.CityMap = CityMap;

})(typeof window !== 'undefined' ? window : globalThis);
