// POWATER CORP. - Main Game Controller & GDevelop RuntimeScene Integration
// Coordinates GameEngine, PixiJS Scene Rendering, User Input, and UI Overlay

(function (global) {
  'use strict';

  const POWATER = global.POWATER || {};

  class GameController {
    constructor() {
      this.game = null;
      this.ui = null;
      this.pixiGfx = null;
      this.initialized = false;
      this.wasMouseDown = false;
      this.wasRightDown = false;
      this.dragStartNode = null;
      this.isDragging = false;
      this.currentMouseX = 0;
      this.currentMouseY = 0;
      this.pulseTime = 0;
      this.lastTime = 0;
    }

    init(runtimeScene) {
      if (this.initialized) return;

      // 1. Initialize Audio Engine
      if (!POWATER.soundManager) {
        POWATER.soundManager = new POWATER.SoundManager();
        POWATER.soundManager.init();
      }

      // 2. Initialize Core Simulation Engine
      this.game = new POWATER.GameEngine();
      this.game.setRuntimeScene(runtimeScene);
      POWATER.game = this.game;

      // 3. Initialize UI Overlay & Modals
      this.ui = new POWATER.UIManager(this.game);
      POWATER.uiManager = this.ui;
      this.ui.init();

      // 4. Start Demo City Level (Bangkok)
      this.game.startLevel(0);
      this.ui.showLevelBriefing(this.game.currentLevel);

      // 5. Initialize PixiJS Graphics Layer in GDevelop
      this.setupPixiLayer(runtimeScene);

      this.initialized = true;
      this.lastTime = performance.now();
    }

    setupPixiLayer(runtimeScene) {
      try {
        const layer = runtimeScene.getLayer('');
        if (layer && layer.getRenderer) {
          const renderer = layer.getRenderer();
          const container = renderer.getRendererObject ? renderer.getRendererObject() : null;

          if (container && typeof PIXI !== 'undefined' && PIXI.Graphics) {
            const gfx = new PIXI.Graphics();
            if (renderer.addRendererObject) {
              renderer.addRendererObject(gfx, 2);
            } else {
              container.addChild(gfx);
            }
            this.pixiGfx = gfx;
            runtimeScene._powaterPixiGfx = gfx;
          }
        }
      } catch (e) {
        console.error('Error initializing Pixi layer:', e);
      }
    }

    update(runtimeScene) {
      if (!this.initialized) {
        this.init(runtimeScene);
      }

      const now = performance.now();
      const dt = Math.min(0.1, (now - (this.lastTime || now)) / 1000.0);
      this.lastTime = now;
      this.pulseTime += dt * 3.0;

      // 1. Input Processing
      const inputManager = runtimeScene.getGame().getInputManager();
      const mouseX = inputManager.getMouseX(runtimeScene);
      const mouseY = inputManager.getMouseY(runtimeScene);
      const isMouseDown = inputManager.isMouseButtonPressed(0);
      const isRightDown = inputManager.isMouseButtonPressed(1);

      this.currentMouseX = mouseX;
      this.currentMouseY = mouseY;
      this.game.currentPointerPos = { x: mouseX, y: mouseY };

      const hitNode = this.game.getNodeAt(mouseX, mouseY);
      this.game.hoveredNode = hitNode;

      // Right-click quick delete
      if (isRightDown && !this.wasRightDown) {
        this.game.deleteAt(mouseX, mouseY);
        this.ui.updateHUD();
      }
      this.wasRightDown = isRightDown;

      // Left-click down
      if (isMouseDown && !this.wasMouseDown) {
        if (POWATER.soundManager) POWATER.soundManager.resume();

        // 1. Demolish tool
        if (this.game.activeTool === 'delete') {
          this.game.deleteAt(mouseX, mouseY);
          this.ui.updateHUD();
        }
        // 2. Clicked on a Node: Smart Auto-drag!
        else if (hitNode) {
          if (hitNode.config && hitNode.config.type === 'generator') {
            this.ui.selectTool('power');
            this.dragStartNode = hitNode;
            this.isDragging = true;
          } else if (hitNode.config && hitNode.config.type === 'water_pump') {
            this.ui.selectTool('water');
            this.dragStartNode = hitNode;
            this.isDragging = true;
          } else if (hitNode.config && hitNode.config.type === 'waste_filter') {
            this.ui.selectTool('sewage');
            this.dragStartNode = hitNode;
            this.isDragging = true;
          } else if (hitNode.config && hitNode.config.type === 'air_filter') {
            this.game.addFloatingText('🍃 เครื่องฟอกอากาศ: ลดมลภาวะ -0.2/วิ', hitNode.x, hitNode.y - 20, '#2ec4b6');
          } else if (hitNode instanceof POWATER.HouseEntity) {
            // Dragging from house
            if (!['power', 'water', 'sewage'].includes(this.game.activeTool)) {
              if (hitNode.hasWater && !hitNode.hasDrainage) this.ui.selectTool('sewage');
              else if (!hitNode.hasPower) this.ui.selectTool('power');
              else if (!hitNode.hasWater) this.ui.selectTool('water');
              else this.ui.selectTool('power');
            }
            this.dragStartNode = hitNode;
            this.isDragging = true;
          }
        }
        // 3. Clicked on empty terrain with building placement tool
        else if (this.game.activeTool.startsWith('build_')) {
          let typeKey = '';
          if (this.game.activeTool === 'build_gen') typeKey = 'generator_coal';
          else if (this.game.activeTool === 'build_solar') typeKey = 'generator_solar';
          else if (this.game.activeTool === 'build_pump') typeKey = 'water_pump';
          else if (this.game.activeTool === 'build_filter') typeKey = 'waste_filter';
          else if (this.game.activeTool === 'build_air_filter') typeKey = 'air_filter';

          if (typeKey) {
            this.game.placeBuilding(typeKey, mouseX, mouseY);
            this.ui.updateHUD();
          }
        }
      }
      // Left-click up (release)
      else if (!isMouseDown && this.wasMouseDown) {
        if (this.isDragging && this.dragStartNode) {
          const endNode = this.game.getNodeAt(mouseX, mouseY);
          if (endNode && endNode.id !== this.dragStartNode.id) {
            let connectType = this.game.activeTool;
            if ((this.dragStartNode.config && this.dragStartNode.config.type === 'generator') || (endNode.config && endNode.config.type === 'generator')) {
              connectType = 'power';
            } else if ((this.dragStartNode.config && this.dragStartNode.config.type === 'water_pump') || (endNode.config && endNode.config.type === 'water_pump')) {
              connectType = 'water';
            } else if ((this.dragStartNode.config && this.dragStartNode.config.type === 'waste_filter') || (endNode.config && endNode.config.type === 'waste_filter')) {
              connectType = 'sewage';
            } else if (this.dragStartNode instanceof POWATER.HouseEntity && endNode instanceof POWATER.HouseEntity) {
              connectType = ['power', 'water', 'sewage'].includes(this.game.activeTool) ? this.game.activeTool : 'power';
            }

            this.game.connectNodes(connectType, this.dragStartNode, endNode);
            this.ui.updateHUD();
          }
        }
        this.isDragging = false;
        this.dragStartNode = null;
      }
      this.wasMouseDown = isMouseDown;

      // 2. Simulation Step
      this.game.update(dt);
      this.ui.updateHUD();

      // 3. Render Graphics
      this.render();
    }

    render() {
      if (!this.pixiGfx) return;
      const gfx = this.pixiGfx;
      gfx.clear();

      // 1. Render Map & Chao Phraya River
      this.game.map.render(gfx);

      // 2. Render Established Connections (Wires & Pipes)
      this.game.connections.forEach(conn => conn.render(gfx));

      // 3. Render House Status Rings & Pins
      this.game.houses.forEach(house => house.render(gfx));

      // 4. Render Building Footprints & Indicators
      this.game.buildings.forEach(building => building.render(gfx));

      // 5. Render Live Dragging Preview Wire
      if (this.isDragging && this.dragStartNode) {
        const p1 = this.dragStartNode.getCenter();
        const p2 = { x: this.currentMouseX, y: this.currentMouseY };

        let wireColor = 0xffd166;
        if (this.game.activeTool === 'water') wireColor = 0x00b4d8;
        else if (this.game.activeTool === 'sewage') wireColor = 0xc77dff;

        // Outer glow
        gfx.lineStyle(6, 0x1a1334, 0.7);
        gfx.moveTo(p1.x, p1.y);
        gfx.lineTo(p2.x, p2.y);

        // Core line
        gfx.lineStyle(3, wireColor, 1.0);
        gfx.moveTo(p1.x, p1.y);
        gfx.lineTo(p2.x, p2.y);

        // Start & End terminals
        gfx.lineStyle(1.5, 0xffffff, 1.0);
        gfx.beginFill(wireColor, 1.0);
        gfx.drawCircle(p1.x, p1.y, 6);
        gfx.drawCircle(p2.x, p2.y, 5);
        gfx.endFill();

        // Target hover pulse ring
        const targetNode = this.game.getNodeAt(p2.x, p2.y);
        if (targetNode && targetNode.id !== this.dragStartNode.id) {
          const tc = targetNode.getCenter();
          const ringR = 48 + Math.sin(this.pulseTime * 5) * 4;
          gfx.lineStyle(3, 0x06d6a0, 0.9);
          gfx.drawCircle(tc.x, tc.y, ringR);
        }
      }
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.GameController = GameController;

  // GDevelop Lifecycle Entry Point
  if (!global._powaterControllerInstance) {
    global._powaterControllerInstance = new GameController();
  }

})(typeof window !== 'undefined' ? window : globalThis);
