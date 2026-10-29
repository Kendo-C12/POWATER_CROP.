/**
 * POWATER CORP. - Wiring & Connection Subsystem
 * Reference: C:\Users\user\Downloads\Pre18-10 (POWATER CORP web edition)
 * 
 * Features:
 * - Click & drag from house to house to establish utility wiring
 * - Live wire preview line while dragging
 * - Target house hover highlight (pulsating ring)
 * - Prevents self-loops and duplicate connections
 * - High performance native PixiJS graphics rendering
 * - Right-click on wire to disconnect / remove wire
 */

(function (global) {
  'use strict';

  class WireConnection {
    constructor(fromHouse, toHouse, type = 'power') {
      this.fromHouse = fromHouse;
      this.toHouse = toHouse;
      this.fromId = fromHouse.id;
      this.toId = toHouse.id;
      this.type = type; // 'power', 'water', 'sewage'
      this.createdAt = Date.now();
    }

    getEndpoints() {
      if (!this.fromHouse || !this.toHouse) return null;
      return {
        x1: this.fromHouse.getX() + this.fromHouse.getWidth() / 2,
        y1: this.fromHouse.getY() + this.fromHouse.getHeight() / 2,
        x2: this.toHouse.getX() + this.toHouse.getWidth() / 2,
        y2: this.toHouse.getY() + this.toHouse.getHeight() / 2
      };
    }
  }

  class WiringManager {
    constructor() {
      this.connections = [];
      this.isDragging = false;
      this.dragStartHouse = null;
      this.hoveredHouse = null;
      this.currentMouseX = 0;
      this.currentMouseY = 0;
      this.wasMouseDown = false;
      this.wasRightDown = false;
      this.activeTool = 'power';
      this.pulseTime = 0;
    }

    findHouseAt(houses, x, y) {
      if (!houses || houses.length === 0) return null;
      for (let i = 0; i < houses.length; i++) {
        const h = houses[i];
        const hx = h.getX();
        const hy = h.getY();
        const hw = h.getWidth();
        const hh = h.getHeight();
        const pad = 15;
        if (
          x >= hx - pad &&
          x <= hx + hw + pad &&
          y >= hy - pad &&
          y <= hy + hh + pad
        ) {
          return h;
        }
      }
      return null;
    }

    distToSegment(px, py, x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    hasConnection(houseA, houseB) {
      return this.connections.some(
        c =>
          (c.fromId === houseA.id && c.toId === houseB.id) ||
          (c.fromId === houseB.id && c.toId === houseA.id)
      );
    }

    connectHouses(houseA, houseB, type = 'power') {
      if (!houseA || !houseB || houseA.id === houseB.id) return false;
      if (this.hasConnection(houseA, houseB)) return false;

      const conn = new WireConnection(houseA, houseB, type);
      this.connections.push(conn);

      try {
        if (houseA.getVariables && houseA.getVariables().has("IsPowered")) {
          houseA.getVariables().get("IsPowered").setBoolean(true);
        }
        if (houseB.getVariables && houseB.getVariables().has("IsPowered")) {
          houseB.getVariables().get("IsPowered").setBoolean(true);
        }
      } catch (e) {}

      return true;
    }

    deleteAt(x, y) {
      for (let i = this.connections.length - 1; i >= 0; i--) {
        const c = this.connections[i];
        const pts = c.getEndpoints();
        if (!pts) continue;
        const dist = this.distToSegment(x, y, pts.x1, pts.y1, pts.x2, pts.y2);
        if (dist < 18) {
          this.connections.splice(i, 1);
          return true;
        }
      }
      return false;
    }

    update(runtimeScene) {
      if (typeof window !== 'undefined') {
        window.gdjsCurrentScene = runtimeScene;
      }
      this.pulseTime += 0.05;
      const inputManager = runtimeScene.getGame().getInputManager();
      const mouseX = inputManager.getMouseX(runtimeScene);
      const mouseY = inputManager.getMouseY(runtimeScene);
      const isMouseDown = inputManager.isMouseButtonPressed(0);
      const isRightDown = inputManager.isMouseButtonPressed(1);
      const houses = runtimeScene.getObjects("house");

      this.currentMouseX = mouseX;
      this.currentMouseY = mouseY;
      this.hoveredHouse = this.findHouseAt(houses, mouseX, mouseY);

      // 1. Right click to delete wire
      if (isRightDown && !this.wasRightDown) {
        this.deleteAt(mouseX, mouseY);
      }
      this.wasRightDown = isRightDown;

      // 2. Left click down (Start dragging)
      if (isMouseDown && !this.wasMouseDown) {
        if (this.hoveredHouse) {
          this.dragStartHouse = this.hoveredHouse;
          this.isDragging = true;
        }
      }
      // 3. Left click up (Release & establish connection)
      else if (!isMouseDown && this.wasMouseDown) {
        if (this.isDragging && this.dragStartHouse) {
          const targetHouse = this.findHouseAt(houses, mouseX, mouseY);
          if (targetHouse && targetHouse.id !== this.dragStartHouse.id) {
            this.connectHouses(this.dragStartHouse, targetHouse, this.activeTool);
          }
        }
        this.isDragging = false;
        this.dragStartHouse = null;
      }

      this.wasMouseDown = isMouseDown;

      // Clean dead connections
      for (let i = this.connections.length - 1; i >= 0; i--) {
        const c = this.connections[i];
        const stillExists =
          houses.some(h => h.id === c.fromId) &&
          houses.some(h => h.id === c.toId);
        if (!stillExists) {
          this.connections.splice(i, 1);
        }
      }

      // Render wires using PixiJS
      this.render(runtimeScene);
    }

    render(runtimeScene) {
      try {
        if (!runtimeScene._powaterPixiGfx) {
          const layer = runtimeScene.getLayer("");
          if (layer && layer.getRenderer) {
            const renderer = layer.getRenderer();
            const container = renderer.getRendererObject
              ? renderer.getRendererObject()
              : null;
            if (container && typeof PIXI !== 'undefined' && PIXI.Graphics) {
              const gfx = new PIXI.Graphics();
              if (renderer.addRendererObject) {
                renderer.addRendererObject(gfx, 5);
              } else {
                container.addChild(gfx);
              }
              runtimeScene._powaterPixiGfx = gfx;
            }
          }
        }

        const gfx = runtimeScene._powaterPixiGfx;
        if (!gfx) return;

        gfx.clear();

        // 1. Draw established connections
        for (let i = 0; i < this.connections.length; i++) {
          const pts = this.connections[i].getEndpoints();
          if (!pts) continue;

          // Outer dark cable casing
          gfx.lineStyle(8, 0x1e1e24, 0.9);
          gfx.moveTo(pts.x1, pts.y1);
          gfx.lineTo(pts.x2, pts.y2);

          // Core electric wire (golden yellow)
          gfx.lineStyle(4, 0xffd166, 1.0);
          gfx.moveTo(pts.x1, pts.y1);
          gfx.lineTo(pts.x2, pts.y2);

          // Junction terminal dots
          gfx.lineStyle(2, 0xd49a15, 1.0);
          gfx.beginFill(0xffffff, 1.0);
          gfx.drawCircle(pts.x1, pts.y1, 6);
          gfx.drawCircle(pts.x2, pts.y2, 6);
          gfx.endFill();
        }

        // 2. Draw live dragging preview wire
        if (this.isDragging && this.dragStartHouse) {
          const x1 = this.dragStartHouse.getX() + this.dragStartHouse.getWidth() / 2;
          const y1 = this.dragStartHouse.getY() + this.dragStartHouse.getHeight() / 2;
          const x2 = this.currentMouseX;
          const y2 = this.currentMouseY;

          // Drag shadow
          gfx.lineStyle(6, 0x2b2d42, 0.7);
          gfx.moveTo(x1, y1);
          gfx.lineTo(x2, y2);

          // Live cyan wire
          gfx.lineStyle(3, 0x64dcff, 1.0);
          gfx.moveTo(x1, y1);
          gfx.lineTo(x2, y2);

          // Terminals
          gfx.lineStyle(2, 0xffffff, 1.0);
          gfx.beginFill(0x64dcff, 1.0);
          gfx.drawCircle(x1, y1, 8);
          gfx.endFill();

          gfx.beginFill(0xffff78, 1.0);
          gfx.drawCircle(x2, y2, 6);
          gfx.endFill();

          // Hover indicator ring around target house
          if (
            this.hoveredHouse &&
            this.hoveredHouse.id !== this.dragStartHouse.id
          ) {
            const tx = this.hoveredHouse.getX() + this.hoveredHouse.getWidth() / 2;
            const ty = this.hoveredHouse.getY() + this.hoveredHouse.getHeight() / 2;
            const ringR = 55 + Math.sin(this.pulseTime * 6) * 4;
            gfx.lineStyle(3, 0x50ffa0, 0.9);
            gfx.drawCircle(tx, ty, ringR);
          }
        }
      } catch (e) {
        console.error("Wiring render error:", e);
      }
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.WiringManager = WiringManager;
  global.POWATER.WireConnection = WireConnection;

})(
  typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
    ? globalThis
    : this
);
