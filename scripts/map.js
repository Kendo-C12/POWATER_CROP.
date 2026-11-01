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
        { x: 610, y: 0 },
        { x: 650, y: 180 },
        { x: 570, y: 360 },
        { x: 690, y: 540 },
        { x: 650, y: 720 }
      ];
      this._riverWidth = (levelConfig && levelConfig.riverWidth) || 100;
      this.waterTime = 0;
      this.pollutionVisual = 0.0;
      this.ripples = [];

      for (let i = 0; i < 28; i++) {
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
      if (id === 'venice') return 420;
      if (id === 'tokyo') return 460;
      return 490;
    }

    getRiverDefaultWidth() {
      const id = (this.level && this.level.id) ? this.level.id.toLowerCase() : '';
      if (id === 'venice') return 400;
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
      if (riverObj) {
        return (this._riverWidth || 100) * (riverObj.getWidth() / defW);
      }
      return this._riverWidth || 100;
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
            // Smooth cosine spline matching the visual river curve in river.png
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

    isPointInRiver(x, y) {
      const rx = this.getRiverCenterAtY(y);
      return Math.abs(x - rx) < (this.getRiverWidth() / 2);
    }

    isNearRiver(x, y, maxDist = 65) {
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

      // Urban Grid lines are provided by the scene object 'grid_bg' (assets/grid_bg.png)!
      // The scene object 'river' is the single source of truth for the river visual!
      // No duplicate second river body is drawn here.

      // 2. Dynamic river water tint on the scene object if present
      const riverObj = this.getRiverObject();
      if (riverObj && typeof riverObj.setColor === 'function') {
        // Clean: 255;255;255 (normal sprite) -> Polluted: 130;150;75 (toxic murky brownish green)
        const rC = Math.round(255 - (255 - 130) * this.pollutionVisual);
        const gC = Math.round(255 - (255 - 150) * this.pollutionVisual);
        const bC = Math.round(255 - (255 - 75) * this.pollutionVisual);
        riverObj.setColor(`${rC};${gC};${bC}`);
      }

      // 3. Smooth animated water droplets drifting down the zigzag current (from reference game Pre18-10)
      const riverW = this.getRiverWidth();
      this.ripples.forEach(r => {
        const ry = r.t * this.height;
        const rx = this.getRiverCenterAtY(ry) + (r.offsetFrac || 0) * (riverW * 0.65);
        const rColor = this.pollutionVisual > 0.5 ? 0xb4dc64 : 0xe0fbfc;
        const alpha = (this.pollutionVisual > 0.5 ? 0.16 : 0.22) * (1.0 - this.pollutionVisual * 0.3);

        pixiGfx.beginFill(rColor, alpha);
        pixiGfx.drawEllipse(rx, ry, r.size, r.size * 0.3);
        pixiGfx.endFill();
      });
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.CityMap = CityMap;

})(typeof window !== 'undefined' ? window : globalThis);
