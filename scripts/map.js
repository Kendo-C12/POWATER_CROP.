// POWATER CORP. - City Map & River Environment
// Handles terrain grid, Chao Phraya river flow, dynamic pollution water coloring, and proximity checks

(function (global) {
  'use strict';

  class CityMap {
    constructor(levelConfig) {
      this.level = levelConfig;
      this.width = (global.POWATER && global.POWATER.CONFIG && global.POWATER.CONFIG.CANVAS_WIDTH) || 1280;
      this.height = (global.POWATER && global.POWATER.CONFIG && global.POWATER.CONFIG.CANVAS_HEIGHT) || 720;
      this.riverPath = levelConfig.riverPath;
      this.riverWidth = levelConfig.riverWidth || 80;
      this.waterTime = 0;
      this.pollutionVisual = 0.0;
      this.ripples = [];

      for (let i = 0; i < 28; i++) {
        this.ripples.push({
          t: Math.random(),
          offset: (Math.random() - 0.5) * (this.riverWidth * 0.7),
          speed: 0.12 + Math.random() * 0.18,
          size: 10 + Math.random() * 16
        });
      }
    }

    update(dt, currentPollution, maxPollution) {
      this.waterTime += dt;
      const targetVis = Math.min(1.0, currentPollution / Math.max(0.1, maxPollution));
      this.pollutionVisual += (targetVis - this.pollutionVisual) * dt * 2.0;

      this.ripples.forEach(r => {
        r.t += dt * r.speed;
        if (r.t > 1.0) {
          r.t = 0;
          r.offset = (Math.random() - 0.5) * (this.riverWidth * 0.7);
        }
      });
    }

    getRiverCenterAtY(y) {
      const pts = this.riverPath;
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

    isPointInRiver(x, y) {
      const rx = this.getRiverCenterAtY(y);
      return Math.abs(x - rx) < (this.riverWidth / 2);
    }

    isNearRiver(x, y, maxDist = 65) {
      const rx = this.getRiverCenterAtY(y);
      const dist = Math.abs(x - rx);
      return dist >= (this.riverWidth / 2) && dist <= (this.riverWidth / 2 + maxDist);
    }

    checkLineIntersectsRiver(p1, p2) {
      const r1 = this.getRiverCenterAtY(p1.y);
      const r2 = this.getRiverCenterAtY(p2.y);
      const side1 = p1.x < r1 ? -1 : 1;
      const side2 = p2.x < r2 ? -1 : 1;
      return side1 !== side2;
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

      // 2. Shoreline Glow
      const pts = this.riverPath;
      pixiGfx.lineStyle(this.riverWidth + 20, 0x0077b6, 0.2);
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) pixiGfx.moveTo(pts[i].x, pts[i].y);
        else pixiGfx.lineTo(pts[i].x, pts[i].y);
      }

      // 3. Dynamic River Color
      // Clean: Cyan-Blue (0x0096c7) -> Polluted: Murky Green-Brown (0x4a4e28)
      const rVal = Math.round(0x00 + (0x55 - 0x00) * this.pollutionVisual);
      const gVal = Math.round(0x96 + (0x5a - 0x96) * this.pollutionVisual);
      const bVal = Math.round(0xc7 + (0x28 - 0xc7) * this.pollutionVisual);
      const riverColor = (rVal << 16) | (gVal << 8) | bVal;

      pixiGfx.lineStyle(this.riverWidth, riverColor, 0.95);
      for (let i = 0; i < pts.length; i++) {
        if (i === 0) pixiGfx.moveTo(pts[i].x, pts[i].y);
        else pixiGfx.lineTo(pts[i].x, pts[i].y);
      }

      // 4. River Center Current Flow & Ripples
      pixiGfx.lineStyle(2, 0x90e0ef, 0.5 * (1.0 - this.pollutionVisual * 0.5));
      this.ripples.forEach(r => {
        const ry = r.t * this.height;
        const rx = this.getRiverCenterAtY(ry) + r.offset;
        pixiGfx.moveTo(rx - r.size / 2, ry);
        pixiGfx.lineTo(rx + r.size / 2, ry);
      });
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.CityMap = CityMap;

})(typeof window !== 'undefined' ? window : globalThis);
