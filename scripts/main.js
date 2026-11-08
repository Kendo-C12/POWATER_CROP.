// POWATER CORP. v1.0.0.0 - Main Game Controller & GDevelop RuntimeScene Integration
// Coordinates GameEngine, Dual-Layer PixiJS Scene Rendering, Day/Night Cycle Lighting,
// Earthquake Screen Shake, Click-to-Repair, Keybinds, and UI Overlay

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};
  if (global.POWATER.GameController) {
    return;
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
      this.currentRuntimeScene = null;
      this.currentSceneName = '';
      this.keyListenerBound = false;
    }

    init(runtimeScene) {
      this.reinitScene(runtimeScene);
    }

    bindKeyboardShortcuts() {
      if (this.keyListenerBound || typeof window === 'undefined') return;
      this.keyListenerBound = true;
      window.addEventListener('keydown', (e) => {
        if (!this.game || !this.ui) return;
        const key = (e.key || '').toLowerCase();
        if (key === '1') this.ui.selectTool('power');
        else if (key === '2') this.ui.selectTool('water');
        else if (key === '3') this.ui.selectTool('sewage');
        else if (key === '4') this.ui.selectTool('build_solar');
        else if (key === '5') this.ui.selectTool('build_air_filter');
        else if (key === 'r') this.game.repairAllBroken();
        else if (key === 'i') this.ui.showSpecialItemsModal();
        else if (key === 'u') this.ui.showUpgradesModal();
        else if (key === ' ') this.game.togglePause();
      });
    }

    reinitScene(runtimeScene) {
      this.currentRuntimeScene = runtimeScene;
      this.currentSceneName = runtimeScene ? runtimeScene.getName() : 'Main';
      this.bindKeyboardShortcuts();

      // 1. Initialize Audio Engine
      if (!global.POWATER.soundManager) {
        global.POWATER.soundManager = new global.POWATER.SoundManager();
        global.POWATER.soundManager.init();
      }

      // 2. Initialize Core Simulation Engine
      if (!this.game) {
        this.game = new global.POWATER.GameEngine();
      }
      this.game.setRuntimeScene(runtimeScene);
      global.POWATER.game = this.game;

      // 3. Initialize UI Overlay & Modals
      if (!this.ui) {
        this.ui = new global.POWATER.UIManager(this.game);
      } else {
        this.ui.game = this.game;
      }
      global.POWATER.uiManager = this.ui;
      this.ui.init();

      // 4. Initialize PixiJS Graphics & Drawing UI Layers
      this.setupPixiLayers(runtimeScene);

      // 5. Detect and Start Level matching Scene Name (Tutorial, Bangkok, Tokyo, Rome, Amsterdam)
      const sName = this.currentSceneName.toLowerCase();
      if (sName.includes('tutorial')) {
        this.game.startTutorial();
      } else {
        let levelIdx = 0;
        if (sName.includes('tokyo')) levelIdx = 1;
        else if (sName.includes('rome') || sName.includes('venice')) levelIdx = 2;
        else if (sName.includes('amsterdam') || sName.includes('endless') || sName.includes('metropolis')) levelIdx = 3;

        this.game.startLevel(levelIdx);
        this.ui.showLevelBriefing(this.game.currentLevel);
      }

      this.initialized = true;
      this.lastTime = performance.now();
    }

    enableHighDPIRenderer(runtimeScene) {
      try {
        if (!runtimeScene || !runtimeScene.getGame) return;
        const game = runtimeScene.getGame();
        const gameRenderer = game && game.getRenderer ? game.getRenderer() : null;
        if (!gameRenderer) return;
        const pixiRenderer = gameRenderer.getPIXIRenderer ? gameRenderer.getPIXIRenderer() : null;
        const canvas = gameRenderer.getCanvas ? gameRenderer.getCanvas() : null;
        if (!pixiRenderer || !canvas) return;

        // Upgrade WebGL framebuffer from 1280x720 (1x) to 3x Supersampled 4K (3840x2160)
        // while keeping logical game coordinates strictly at 1280x720.
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
        const targetRes = Math.max(3, Math.min(4, Math.ceil(dpr * 2)));

        if (typeof PIXI !== 'undefined') {
          if (PIXI.settings) {
            PIXI.settings.RESOLUTION = targetRes;
            PIXI.settings.ROUND_PIXELS = true;
          }
          if (PIXI.Text) {
            PIXI.Text.defaultResolution = 4;
            PIXI.Text.defaultAutoResolution = false;
          }
        }

        if (pixiRenderer._powaterHiDPI !== targetRes) {
          pixiRenderer._powaterHiDPI = targetRes;

          gameRenderer._resizeCanvas = function () {
            if (!this._pixiRenderer || !this._domElementsContainer) return;
            const w = this._game.getGameResolutionWidth();
            const h = this._game.getGameResolutionHeight();

            if (this._threeRenderer && typeof this._threeRenderer.setPixelRatio === 'function') {
              this._threeRenderer.setPixelRatio(targetRes);
              this._threeRenderer.setSize(w, h, false);
            }
            this._pixiRenderer.resolution = targetRes;
            if (this._pixiRenderer._view) {
              this._pixiRenderer._view.resolution = targetRes;
            }
            this._pixiRenderer.resize(w, h);

            const isFull = this._forceFullscreen || this._isFullPage || this._isFullscreen;
            let cw = w;
            let ch = h;
            let maxW = Math.max(0, window.innerWidth - this._marginLeft - this._marginRight);
            let maxH = Math.max(0, window.innerHeight - this._marginTop - this._marginBottom);
            if (isFull && !this._keepRatio) {
              cw = maxW;
              ch = maxH;
            } else if ((isFull && this._keepRatio) || cw > maxW || ch > maxH) {
              let factor = maxW / cw;
              if (ch * factor > maxH) factor = maxH / ch;
              cw *= factor;
              ch *= factor;
            }
            if (this._gameCanvas) {
              this._gameCanvas.style.top = this._marginTop + (maxH - ch) / 2 + 'px';
              this._gameCanvas.style.left = this._marginLeft + (maxW - cw) / 2 + 'px';
              this._gameCanvas.style.width = cw + 'px';
              this._gameCanvas.style.height = ch + 'px';
              this._gameCanvas.style.imageRendering = 'auto';
            }
            this._domElementsContainer.style.top = this._marginTop + (maxH - ch) / 2 + 'px';
            this._domElementsContainer.style.left = this._marginLeft + (maxW - cw) / 2 + 'px';
            this._domElementsContainer.style.width = cw + 'px';
            this._domElementsContainer.style.height = ch + 'px';
            this._canvasWidth = cw;
            this._canvasHeight = ch;
          };

          gameRenderer._resizeCanvas();
        }
      } catch (e) {
        console.warn('High-DPI renderer setup warning:', e);
      }
    }

    setupPixiLayers(runtimeScene) {
      this.enableHighDPIRenderer(runtimeScene);
      try {
        const layer = runtimeScene.getLayer('');
        if (layer && layer.getRenderer) {
          const renderer = layer.getRenderer();
          const container = renderer.getRendererObject ? renderer.getRendererObject() : null;

          if (container && typeof PIXI !== 'undefined' && PIXI.Graphics) {
            // Layer 1: Wires & River Ripples (Z=2, beneath buildings and houses)
            const gfxWires = new PIXI.Graphics();
            if (renderer.addRendererObject) {
              renderer.addRendererObject(gfxWires, 2);
            } else {
              container.addChild(gfxWires);
            }
            this.pixiGfxWires = gfxWires;
            runtimeScene._powaterPixiGfxWires = gfxWires;

            // Layer 2: Status Rings, Pins, Day/Night Lighting & Live Drag Wire (Z=6)
            const gfxOverlay = new PIXI.Graphics();
            if (renderer.addRendererObject) {
              renderer.addRendererObject(gfxOverlay, 6);
            } else {
              container.addChild(gfxOverlay);
            }
            this.pixiGfxOverlay = gfxOverlay;
            runtimeScene._powaterPixiGfxOverlay = gfxOverlay;

            // Layer 2.5: Utility, Candle & Repair PNG Badges (Z=7)
            const badgeContainer = new PIXI.Container();
            if (renderer.addRendererObject) {
              renderer.addRendererObject(badgeContainer, 7);
            } else {
              container.addChild(badgeContainer);
            }
            this.pixiBadgeContainer = badgeContainer;
            runtimeScene._powaterPixiBadgeContainer = badgeContainer;

            // Layer 3: In-Game HUD, Vector Buttons, Floating Texts & Modals (Z=50, strictly above all scene sprites)
            const uiContainer = new PIXI.Container();
            if (renderer.addRendererObject) {
              renderer.addRendererObject(uiContainer, 50);
            } else {
              container.addChild(uiContainer);
            }
            this.pixiUIContainer = uiContainer;
            runtimeScene._powaterPixiUIContainer = uiContainer;
            if (this.ui && this.ui.setupPixi) {
              this.ui.setupPixi(uiContainer);
            }
          }
        }
      } catch (e) {
        console.error('Error initializing Pixi layers:', e);
      }
    }

    update(runtimeScene) {
      const currentName = runtimeScene ? runtimeScene.getName() : 'Main';
      if (!this.initialized || this.currentRuntimeScene !== runtimeScene || this.currentSceneName !== currentName) {
        this.reinitScene(runtimeScene);
      }

      const now = performance.now();
      const dt = Math.min(0.1, (now - (this.lastTime || now)) / 1000.0);
      this.lastTime = now;
      this.pulseTime += dt * 3.0;

      // 1. Input Coordinates
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

      // 2. In-Game UI Update & Click Consumption
      let uiHandled = false;
      if (this.ui && this.ui.update) {
        uiHandled = this.ui.update(dt, mouseX, mouseY, isMouseDown, this.wasMouseDown);
      }

      if (uiHandled) {
        this.selectedNode = null;
        this.dragStartNode = null;
        this.isDragging = false;
        this.wasMouseDown = isMouseDown;
        this.wasRightDown = isRightDown;
        return;
      }

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

        // 0. If clicked on a Broken Building (or using Repair tool), repair it immediately!
        if (hitNode && hitNode.isBroken) {
          this.game.repairBuilding(hitNode);
          this.ui.updateHUD();
        }
        else if (this.game.activeTool === 'repair') {
          if (hitNode && hitNode.isBuilding) {
            if (hitNode.isBroken) this.game.repairBuilding(hitNode);
            else this.game.addFloatingText('✅ อุปกรณ์ทำงานปกติ ไม่ต้องซ่อม', hitNode.getCenter().x, hitNode.getCenter().y - 20, '#06d6a0');
          } else {
            this.game.repairAllBroken();
          }
          this.ui.updateHUD();
        }
        // 1. Demolish tool
        else if (this.game.activeTool === 'delete') {
          this.game.deleteAt(mouseX, mouseY);
          this.ui.updateHUD();
        }
        // 2. Clicked on a Node: Start drag or click-to-connect!
        else if (hitNode) {
          if (this.selectedNode && this.selectedNode.id !== hitNode.id) {
            this.handleConnect(this.selectedNode, hitNode);
            this.selectedNode = null;
            this.dragStartNode = null;
            this.isDragging = false;
          } else {
            if (hitNode.config && hitNode.config.type === 'generator') {
              this.ui.selectTool('power');
            } else if (hitNode.config && hitNode.config.type === 'water_pump') {
              this.ui.selectTool('water');
            } else if (hitNode.config && hitNode.config.type === 'waste_filter') {
              this.ui.selectTool('sewage');
            } else if (hitNode.config && hitNode.config.type === 'air_filter') {
              this.game.addFloatingText('🍃 เครื่องกรองมลภาวะ: ลดมลภาวะ -0.2/วิ', hitNode.getCenter().x, hitNode.getCenter().y - 20, '#2ec4b6');
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
        // 3. Clicked on empty terrain: Place selected building
        else {
          this.selectedNode = null;
          this.dragStartNode = null;
          this.isDragging = false;

          if (this.game.activeTool && (this.game.activeTool.startsWith('build_') || this.game.activeTool === 'solar' || this.game.activeTool === 'air_filter')) {
            let typeKey = '';
            if (this.game.activeTool === 'build_gen') typeKey = 'generator_coal';
            else if (this.game.activeTool === 'build_solar' || this.game.activeTool === 'solar') typeKey = 'generator_solar';
            else if (this.game.activeTool === 'build_pump') typeKey = 'water_pump';
            else if (this.game.activeTool === 'build_filter') typeKey = 'waste_filter';
            else if (this.game.activeTool === 'build_air_filter' || this.game.activeTool === 'air_filter') typeKey = 'air_filter';

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

      // 3. Simulation Step
      this.game.update(dt);
      this.ui.updateHUD();

      // 4. Render Graphics
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

      // Apply Earthquake Screen Shake if active
      if (this.currentRuntimeScene && this.currentRuntimeScene.getLayer) {
        const baseLayer = this.currentRuntimeScene.getLayer('');
        if (baseLayer && typeof baseLayer.setCameraX === 'function') {
          if (this.game.screenShakeTimer > 0) {
            const jx = (Math.random() - 0.5) * 14;
            const jy = (Math.random() - 0.5) * 14;
            baseLayer.setCameraX(640 + jx);
            baseLayer.setCameraY(360 + jy);
          } else {
            baseLayer.setCameraX(640);
            baseLayer.setCameraY(360);
          }
        }
      }

      // === LAYER 1 (Underneath objects): River & Wires ===
      this.game.map.render(gfxW);
      this.game.connections.forEach(conn => conn.render(gfxW));

      // === LAYER 2 (Above objects): Day/Night Overlay, Status Rings, Badges & Preview Wires ===
      // 1. Day/Night Cycle Ambient Night Overlay (POWATER CORP.pdf: Day 1m, Night 1m)
      if (this.game.nightAlpha > 0.01) {
        gfxO.lineStyle(0);
        gfxO.beginFill(0x05081c, this.game.nightAlpha);
        gfxO.drawRect(0, 44, 1280, 676);
        gfxO.endFill();

        // Warm night light halos around powered houses & candle-lit houses
        this.game.houses.forEach(h => {
          if (h.hasPower || h.usingCandle) {
            const hc = h.getCenter();
            const haloCol = h.usingCandle ? 0xff9f1c : 0xffd166;
            gfxO.beginFill(haloCol, this.game.nightAlpha * 0.45);
            gfxO.drawCircle(hc.x, hc.y, 58);
            gfxO.endFill();
          }
        });
      }

      // 2. Rome Blackout Dimming Effect
      if (this.game.isBlackoutActive) {
        gfxO.lineStyle(0);
        gfxO.beginFill(0x03020a, 0.28);
        gfxO.drawRect(0, 44, 1280, 676);
        gfxO.endFill();
      }

      // 3. Render House Status Rings & PNG Badges
      this.game.houses.forEach(house => house.render(gfxO, this.pixiBadgeContainer));

      // 4. Render Building Footprints & Repair PNG Badges
      this.game.buildings.forEach(building => building.render(gfxO, this.pixiBadgeContainer));

      // 5. Selected Node Highlight
      const activeSource = (this.isDragging && this.dragStartNode) ? this.dragStartNode : this.selectedNode;
      if (activeSource) {
        const sc = activeSource.getCenter();
        const pulseR = 48 + Math.sin(this.pulseTime * 6) * 3;
        gfxO.lineStyle(3, 0xffd166, 0.9);
        gfxO.drawCircle(sc.x, sc.y, pulseR);
      }

      // 6. Live Dragging Preview Wire (Manhattan + two 45-degree corner turns)
      if (this.isDragging && this.dragStartNode) {
        const p1 = this.dragStartNode.getCenter();
        const p2 = { x: this.currentMouseX, y: this.currentMouseY };

        let wireColor = 0xffd166;
        if (this.game.activeTool === 'water') wireColor = 0x00b4d8;
        else if (this.game.activeTool === 'sewage') wireColor = 0xc77dff;

        const previewPath = (global.POWATER.ConnectionEntity && global.POWATER.ConnectionEntity.buildManhattanPoints)
          ? global.POWATER.ConnectionEntity.buildManhattanPoints(p1, p2, 0, 22)
          : { points: [p1, p2] };
        const pts = (previewPath && previewPath.points) || [p1, p2];

        const drawPreviewPoly = () => {
          if (pts.length < 2) return;
          gfxO.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            gfxO.lineTo(pts[i].x, pts[i].y);
          }
        };

        gfxO.lineStyle(7, 0x1a1334, 0.75);
        drawPreviewPoly();

        gfxO.lineStyle(3.5, wireColor, 1.0);
        drawPreviewPoly();

        gfxO.lineStyle(1.5, 0xffffff, 1.0);
        gfxO.beginFill(wireColor, 1.0);
        gfxO.drawCircle(p1.x, p1.y, 6.0);
        gfxO.drawCircle(p2.x, p2.y, 5.0);
        gfxO.endFill();

        const targetNode = this.game.getNodeAt(p2.x, p2.y);
        if (targetNode && targetNode.id !== this.dragStartNode.id) {
          const tc = targetNode.getCenter();
          const targetR = (targetNode.isHouse ? 54 : 44) + Math.sin(this.pulseTime * 6) * 4;
          gfxO.lineStyle(3, 0x06d6a0, 0.95);
          gfxO.drawCircle(tc.x, tc.y, targetR);
        }
      }

      // 7. Interactive Fast Tutorial Visual Guide (Manhattan Guide Line & Target Highlight)
      if (this.game.isTutorialMode && this.game.tutorialStep >= 1 && this.game.tutorialStep <= 4) {
        const step = this.game.tutorialStep;
        const house = this.game.houses[0];
        let srcNode = null;
        let dstNode = null;
        let guideColor = 0xffd166;

        if (step === 1) {
          srcNode = this.game.buildings.find(b => b.config && b.config.type === 'generator');
          dstNode = house;
          guideColor = 0xffd166;
        } else if (step === 2) {
          srcNode = this.game.buildings.find(b => b.config && b.config.type === 'water_pump');
          dstNode = house;
          guideColor = 0x00b4d8;
        } else if (step === 3) {
          srcNode = house;
          dstNode = this.game.buildings.find(b => b.config && b.config.type === 'waste_filter');
          guideColor = 0xc77dff;
        } else if (step === 4) {
          srcNode = this.game.buildings.find(b => b.isBroken) || this.game.buildings.find(b => b.config && b.config.type === 'water_pump');
          guideColor = 0xef476f;
        }

        if (srcNode && dstNode) {
          const c1 = srcNode.getCenter();
          const c2 = dstNode.getCenter();
          const gPath = (global.POWATER.ConnectionEntity && global.POWATER.ConnectionEntity.buildManhattanPoints)
            ? global.POWATER.ConnectionEntity.buildManhattanPoints(c1, c2, 0, 22)
            : { points: [c1, c2] };
          const gPts = (gPath && gPath.points) || [c1, c2];

          const pulseAlpha = 0.45 + 0.35 * Math.sin(this.pulseTime * 3);
          gfxO.lineStyle(4, guideColor, pulseAlpha);
          if (gPts.length >= 2) {
            gfxO.moveTo(gPts[0].x, gPts[0].y);
            for (let i = 1; i < gPts.length; i++) {
              gfxO.lineTo(gPts[i].x, gPts[i].y);
            }
          }

          // Animated cursor orb sliding along the Manhattan tutorial guide path
          const tProg = (this.pulseTime * 0.45) % 1.0;
          const pt = (global.POWATER.ConnectionEntity && global.POWATER.ConnectionEntity.getPointAtFraction)
            ? global.POWATER.ConnectionEntity.getPointAtFraction(gPath.segments || [], gPath.totalLength || 0, tProg, c1, c2)
            : { x: c1.x + (c2.x - c1.x) * tProg, y: c1.y + (c2.y - c1.y) * tProg };
          gfxO.lineStyle(2, 0xffffff, 0.95);
          gfxO.beginFill(guideColor, 1.0);
          gfxO.drawCircle(pt.x, pt.y, 7);
          gfxO.endFill();

          const rPulse = 46 + Math.sin(this.pulseTime * 5) * 5;
          gfxO.lineStyle(3, guideColor, 0.9);
          gfxO.drawCircle(c1.x, c1.y, rPulse);
          gfxO.drawCircle(c2.x, c2.y, rPulse + 6);
        } else if (srcNode && step === 4) {
          const c1 = srcNode.getCenter();
          const rPulse = 48 + Math.sin(this.pulseTime * 6) * 6;
          gfxO.lineStyle(3.5, 0xef476f, 0.95);
          gfxO.drawCircle(c1.x, c1.y, rPulse);
          gfxO.lineStyle(2, 0xffd166, 0.85);
          gfxO.drawCircle(c1.x, c1.y, rPulse + 10);
        }
      }
    }
  }

  global.POWATER.GameController = GameController;

})(typeof window !== 'undefined' ? window : globalThis);
