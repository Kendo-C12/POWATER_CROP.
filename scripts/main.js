// POWATER CORP. - Main Game Controller & GDevelop RuntimeScene Integration
// Coordinates GameEngine, Dual-Layer PixiJS Scene Rendering, User Input, and UI Overlay

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};
  if (global.POWATER.GameController) {
    return; // Prevent prototype invalidation on repeated frame execution
  }

  class GameController {
    constructor() {
      this.game = null;
      this.ui = null;
      this.pixiGfxWires = null;
      this.pixiGfxOverlay = null;
      this.initialized = false;
      this.wasMouseDown = false;
      this.wasRightDown = false;
      this.dragStartNode = null;
      this.selectedNode = null;
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartY = 0;
      this.currentMouseX = 0;
      this.currentMouseY = 0;
      this.pulseTime = 0;
      this.lastTime = 0;
    }

    init(runtimeScene) {
      if (this.initialized) return;

      // 1. Initialize Audio Engine
      if (!global.POWATER.soundManager) {
        global.POWATER.soundManager = new global.POWATER.SoundManager();
        global.POWATER.soundManager.init();
      }

      // 2. Initialize Core Simulation Engine
      this.game = new global.POWATER.GameEngine();
      this.game.setRuntimeScene(runtimeScene);
      global.POWATER.game = this.game;

      // 3. Initialize UI Overlay & Modals
      this.ui = new global.POWATER.UIManager(this.game);
      global.POWATER.uiManager = this.ui;
      this.ui.init();

      // 4. Start Demo City Level (Bangkok)
      this.game.startLevel(0);
      this.ui.showLevelBriefing(this.game.currentLevel);

      // 5. Initialize Dual PixiJS Graphics Layers
      this.setupPixiLayers(runtimeScene);

      this.initialized = true;
      this.lastTime = performance.now();
    }

    setupPixiLayers(runtimeScene) {
      try {
        const layer = runtimeScene.getLayer('');
        if (layer && layer.getRenderer) {
          const renderer = layer.getRenderer();
          const container = renderer.getRendererObject ? renderer.getRendererObject() : null;

          if (container && typeof PIXI !== 'undefined' && PIXI.Graphics) {
            // Layer 1: Wires & River (Z=2, beneath buildings and houses)
            const gfxWires = new PIXI.Graphics();
            if (renderer.addRendererObject) {
              renderer.addRendererObject(gfxWires, 2);
            } else {
              container.addChild(gfxWires);
            }
            this.pixiGfxWires = gfxWires;
            runtimeScene._powaterPixiGfxWires = gfxWires;

            // Layer 2: Status Rings, Pins, Hover Rings & Live Drag Wire (Z=6, above buildings and houses)
            const gfxOverlay = new PIXI.Graphics();
            if (renderer.addRendererObject) {
              renderer.addRendererObject(gfxOverlay, 6);
            } else {
              container.addChild(gfxOverlay);
            }
            this.pixiGfxOverlay = gfxOverlay;
            runtimeScene._powaterPixiGfxOverlay = gfxOverlay;
          }
        }
      } catch (e) {
        console.error('Error initializing Pixi layers:', e);
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

      // 1. Input Coordinates (Layer-converted world coordinates)
      const inputManager = runtimeScene.getGame().getInputManager();
      let mouseX = 0;
      let mouseY = 0;

      if (typeof gdjs !== 'undefined' && gdjs.evtTools && gdjs.evtTools.input) {
        mouseX = gdjs.evtTools.input.getMouseX(runtimeScene, '');
        mouseY = gdjs.evtTools.input.getMouseY(runtimeScene, '');
      } else {
        mouseX = inputManager.getCursorX();
        mouseY = inputManager.getCursorY();
      }

      const isMouseDown = inputManager.isMouseButtonPressed(0);
      const isRightDown = inputManager.isMouseButtonPressed(1);

      this.currentMouseX = mouseX;
      this.currentMouseY = mouseY;
      this.game.currentPointerPos = { x: mouseX, y: mouseY };

      const hitNode = this.game.getNodeAt(mouseX, mouseY);
      this.game.hoveredNode = hitNode;

      // Right-click quick delete
      if (isRightDown && !this.wasRightDown) {
        this.selectedNode = null;
        this.dragStartNode = null;
        this.isDragging = false;
        this.game.deleteAt(mouseX, mouseY);
        this.ui.updateHUD();
      }
      this.wasRightDown = isRightDown;

      // Left-click down
      if (isMouseDown && !this.wasMouseDown) {
        if (global.POWATER.soundManager) global.POWATER.soundManager.resume();

        // 1. Demolish tool
        if (this.game.activeTool === 'delete') {
          this.game.deleteAt(mouseX, mouseY);
          this.ui.updateHUD();
        }
        // 2. Clicked on a Node: Start drag or click-to-connect!
        else if (hitNode) {
          // If we already had a selected node from a previous click, connect them!
          if (this.selectedNode && this.selectedNode.id !== hitNode.id) {
            this.handleConnect(this.selectedNode, hitNode);
            this.selectedNode = null;
            this.dragStartNode = null;
            this.isDragging = false;
          } else {
            // Auto-select corresponding tool
            if (hitNode.config && hitNode.config.type === 'generator') {
              this.ui.selectTool('power');
            } else if (hitNode.config && hitNode.config.type === 'water_pump') {
              this.ui.selectTool('water');
            } else if (hitNode.config && hitNode.config.type === 'waste_filter') {
              this.ui.selectTool('sewage');
            } else if (hitNode.config && hitNode.config.type === 'air_filter') {
              this.game.addFloatingText('🍃 เครื่องฟอกอากาศ: ลดมลภาวะ -0.2/วิ', hitNode.getCenter().x, hitNode.getCenter().y - 20, '#2ec4b6');
            } else if (hitNode.isHouse || hitNode.entityType === 'house') {
              if (!['power', 'water', 'sewage'].includes(this.game.activeTool)) {
                if (hitNode.hasWater && !hitNode.hasDrainage) this.ui.selectTool('sewage');
                else if (!hitNode.hasPower) this.ui.selectTool('power');
                else if (!hitNode.hasWater) this.ui.selectTool('water');
                else this.ui.selectTool('power');
              }
            }

            this.dragStartNode = hitNode;
            this.selectedNode = hitNode;
            this.isDragging = true;
            this.dragStartX = mouseX;
            this.dragStartY = mouseY;
          }
        }
        // 3. Clicked on empty terrain:
        else {
          this.selectedNode = null;
          this.dragStartNode = null;
          this.isDragging = false;

          if (this.game.activeTool.startsWith('build_')) {
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
      }
      // Left-click up (release)
      else if (!isMouseDown && this.wasMouseDown) {
        if (this.isDragging && this.dragStartNode) {
          const dragDist = Math.hypot(mouseX - this.dragStartX, mouseY - this.dragStartY);
          const endNode = this.game.getNodeAt(mouseX, mouseY);

          // If dragged a distance and ended over another node, complete the connection!
          if (dragDist > 15 && endNode && endNode.id !== this.dragStartNode.id) {
            this.handleConnect(this.dragStartNode, endNode);
            this.selectedNode = null;
          } else if (dragDist > 15 && !endNode) {
            this.selectedNode = null;
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

    handleConnect(nodeA, nodeB) {
      if (!nodeA || !nodeB || nodeA.id === nodeB.id) return;

      let connectType = this.game.activeTool;
      if ((nodeA.config && nodeA.config.type === 'generator') || (nodeB.config && nodeB.config.type === 'generator')) {
        connectType = 'power';
      } else if ((nodeA.config && nodeA.config.type === 'water_pump') || (nodeB.config && nodeB.config.type === 'water_pump')) {
        connectType = 'water';
      } else if ((nodeA.config && nodeA.config.type === 'waste_filter') || (nodeB.config && nodeB.config.type === 'waste_filter')) {
        connectType = 'sewage';
      } else if (nodeA.isHouse && nodeB.isHouse) {
        connectType = ['power', 'water', 'sewage'].includes(this.game.activeTool) ? this.game.activeTool : 'power';
      }

      this.game.connectNodes(connectType, nodeA, nodeB);
      this.ui.updateHUD();
    }

    render() {
      if (!this.pixiGfxWires || !this.pixiGfxOverlay) return;
      const gfxW = this.pixiGfxWires;
      const gfxO = this.pixiGfxOverlay;

      gfxW.clear();
      gfxO.clear();

      // === LAYER 1 (Underneath objects): River & Wires ===
      // 1. Render Map & River
      this.game.map.render(gfxW);

      // 2. Render Established Connections
      this.game.connections.forEach(conn => conn.render(gfxW));

      // === LAYER 2 (Above objects): Status Rings, Pins, Preview Lines & Hover Rings ===
      // 3. Render House Status Rings & Pins
      this.game.houses.forEach(house => house.render(gfxO));

      // 4. Render Building Footprints & Indicators
      this.game.buildings.forEach(building => building.render(gfxO));

      // 5. Selected Node Highlight (Click-to-Connect)
      const activeSource = (this.isDragging && this.dragStartNode) ? this.dragStartNode : this.selectedNode;
      if (activeSource) {
        const sc = activeSource.getCenter();
        const pulseR = 48 + Math.sin(this.pulseTime * 6) * 3;
        gfxO.lineStyle(3, 0xffd166, 0.9);
        gfxO.drawCircle(sc.x, sc.y, pulseR);
      }

      // 6. Live Dragging Preview Wire (Above everything!)
      if (this.isDragging && this.dragStartNode) {
        const p1 = this.dragStartNode.getCenter();
        const p2 = { x: this.currentMouseX, y: this.currentMouseY };

        let wireColor = 0xffd166;
        if (this.game.activeTool === 'water') wireColor = 0x00b4d8;
        else if (this.game.activeTool === 'sewage') wireColor = 0xc77dff;

        // Outer dark casing
        gfxO.lineStyle(7, 0x1a1334, 0.75);
        gfxO.moveTo(p1.x, p1.y);
        gfxO.lineTo(p2.x, p2.y);

        // Core bright wire
        gfxO.lineStyle(3.5, wireColor, 1.0);
        gfxO.moveTo(p1.x, p1.y);
        gfxO.lineTo(p2.x, p2.y);

        // Terminals
        gfxO.lineStyle(1.5, 0xffffff, 1.0);
        gfxO.beginFill(wireColor, 1.0);
        gfxO.drawCircle(p1.x, p1.y, 6.0);
        gfxO.drawCircle(p2.x, p2.y, 5.0);
        gfxO.endFill();

        // Target hover pulsating ring
        const targetNode = this.game.getNodeAt(p2.x, p2.y);
        if (targetNode && targetNode.id !== this.dragStartNode.id) {
          const tc = targetNode.getCenter();
          const targetR = (targetNode.isHouse ? 54 : 44) + Math.sin(this.pulseTime * 6) * 4;
          gfxO.lineStyle(3, 0x06d6a0, 0.95);
          gfxO.drawCircle(tc.x, tc.y, targetR);
        }
      }
    }
  }

  global.POWATER.GameController = GameController;

})(typeof window !== 'undefined' ? window : globalThis);
