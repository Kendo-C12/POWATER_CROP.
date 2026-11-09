// POWATER CORP. v1.0.0.0 - Core Game Simulation Engine
// Implements all mechanics from POWATER IDEA PITCH.pdf & POWATER CORP.pdf:
// - Win Condition: >15 completed houses held for 5-7 min (pauses on Repair/Disaster, resets on Complaint)
// - Economy: +50 instant per completed house, +[completed houses]*40 per week
// - Repair System: 30% pump breakdown chance every 2 minutes + click/hotkey repair
// - Day/Night Cycle: 1 min Day, 1 min Night
// - Map Upsize: expands every +10 houses up to 40 houses max
// - 4 Levels (Bangkok, Tokyo, Rome, Amsterdam) with High Tide, Earthquake, Blackout, Flood + paid Disaster Test Lab

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};
  if (global.POWATER.GameEngine) {
    return;
  }

  const CONFIG = global.POWATER.CONFIG || {};

  class GameEngine {
    constructor() {
      this.levelIndex = 0;
      this.currentLevel = CONFIG.LEVELS ? CONFIG.LEVELS[0] : {};
      this.map = new global.POWATER.CityMap(this.currentLevel);

      // Simulation State
      this.money = this.currentLevel.startingBudget || 150;
      this.pollution = 0.0;
      this.currentPollutionRate = 0.0;
      this.complaints = 0;
      this.maxComplaints = this.currentLevel.maxComplaints || CONFIG.MAX_COMPLAINTS || 3;
      this.complaintLog = [];
      this.isGameOver = false;
      this.isGameWon = false;
      this.isPaused = false;
      this.gameSpeed = 1.0;

      // Win Condition State (POWATER CORP.pdf: >15 houses for 5-7 minutes)
      this.winHoldTimer = 0.0;
      this.winTargetDuration = CONFIG.WIN_HOLD_DURATION_SECONDS || 300;
      this.winRequiredHouses = CONFIG.WIN_REQUIRED_HOUSES || 15;
      this.winTimerState = 'WAITING'; // 'WAITING' | 'RUNNING' | 'PAUSED'

      // Calendar & Clock (15 seconds per game day -> 7 days = 1 week)
      this.dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      this.dayIndex = 0;
      this.dayTime = 0.0;
      this.dayDuration = 15.0;
      this.totalDaysPassed = 0;
      this.weeksPassed = 0;
      this.levelElapsedTime = 0.0;
      this.gracePeriodActive = true;
      this.gracePeriodWarningShown = false;
      this.pollutionStartedNotified = false;

      // Day/Night Cycle (POWATER CORP.pdf: Day 1 min, Night 1 min)
      this.dayNightTimer = 0.0;
      this.isNight = false;
      this.nightAlpha = 0.0;

      // Repair System (POWATER CORP.pdf: 30% chance every 2 minutes)
      this.repairCheckTimer = 0.0;

      // Map Upsize System (POWATER CORP.pdf: +10 houses per upsize, cap at 40)
      this.upsizeTier = 0;
      this.maxHousesCap = CONFIG.MAX_HOUSES_CAP || 40;

      // Extreme Weather & Disasters State
      this.activeDisasterText = '';
      this.isHighTide = false;
      this.highTideTimer = 0.0;

      // Tokyo Earthquake state
      this.earthquakeMinuteTimer = 0.0;
      this.minutesWithoutQuake = 0;
      this.guaranteedQuakeTriggered = false;
      this.postGuaranteedQuakeBonus = 0.0;
      this.screenShakeTimer = 0.0;

      // Rome Blackout state
      this.isBlackoutActive = false;
      this.blackoutTimer = 0.0;

      // Amsterdam Flood state
      this.isFloodActive = false;
      this.floodTimer = 0.0;
      this.floodMaxDuration = 45.0; // Flood lasts 45s before receding

      // Entities
      this.houses = [];
      this.buildings = [];
      this.connections = [];
      this.floatingTexts = [];
      this.nextEntityId = 1;

      // Upgrades
      this.upgradeLevels = {
        elec_cap: 1,
        poll_red: 0,
        water_cap: 1,
        waste_cap: 1
      };

      // Spawner
      this.spawnTimer = 0;
      this.housesServedPeak = 0;
      this.completedHousesCount = 0;

      // Easter Egg / Mini-Achievement: SDG 15 Life on Land
      this.sdg15Unlocked = false;

      // Fast Interactive Scene Tutorial State
      this.isTutorialMode = false;
      this.tutorialStep = 0;
      this.tutorialStepTimer = 0.0;

      // Tools & Dragging
      this.activeTool = 'power';
      this.dragStartNode = null;
      this.currentPointerPos = { x: 0, y: 0 };
      this.isDragging = false;
      this.hoveredNode = null;
      this.runtimeScene = null;
    }

    setRuntimeScene(scene) {
      this.runtimeScene = scene;
      if (this.map && typeof this.map.setRuntimeScene === 'function') {
        this.map.setRuntimeScene(scene);
      }
    }

    togglePause() {
      this.isPaused = !this.isPaused;
      return this.isPaused;
    }

    toggleSpeed() {
      this.gameSpeed = (this.gameSpeed === 1.0) ? 2.0 : 1.0;
      return this.gameSpeed;
    }

    selectTool(toolId) {
      this.activeTool = toolId;
    }

    getBuildingCost(buildCfg) {
      if (!buildCfg) return 0;
      let cost = (typeof buildCfg.cost === 'number') ? buildCfg.cost : 30;
      const fco = this.currentLevel && this.currentLevel.featureCostOverrides;
      if (fco && fco.buildings && buildCfg.id && typeof fco.buildings[buildCfg.id] === 'number') {
        cost = fco.buildings[buildCfg.id];
      }
      // Tokyo condition (+): Clean Energy -25%
      if (buildCfg.clean && this.currentLevel && this.currentLevel.cleanEnergyDiscount) {
        cost = cost * (1.0 - this.currentLevel.cleanEnergyDiscount);
      }
      // Amsterdam condition (+): All initial construction costs -5%
      if (this.currentLevel && this.currentLevel.buildCostDiscount) {
        cost = cost * (1.0 - this.currentLevel.buildCostDiscount);
      }
      return Math.round(cost);
    }

    getRepairCost() {
      const fco = this.currentLevel && this.currentLevel.featureCostOverrides;
      if (fco && typeof fco.repairCostPerBuilding === 'number') {
        return fco.repairCostPerBuilding;
      }
      return (typeof CONFIG.REPAIR_COST_PER_BUILDING === 'number') ? CONFIG.REPAIR_COST_PER_BUILDING : 0;
    }

    getConnectionCost(type, crossesRiver) {
      let cost = 0;
      if (CONFIG.PIPES && type) {
        const pipeCfg = CONFIG.PIPES[type.toUpperCase()];
        if (pipeCfg && typeof pipeCfg.cost === 'number') cost += pipeCfg.cost;
      }
      if (crossesRiver && typeof CONFIG.RIVER_CROSSING_EXTRA_COST === 'number') {
        cost += CONFIG.RIVER_CROSSING_EXTRA_COST;
      }
      return Math.max(0, Math.round(cost));
    }

    reloadStageConfig() {
      if (this.isTutorialMode && CONFIG.TUTORIAL_LEVEL) {
        this.currentLevel = CONFIG.TUTORIAL_LEVEL;
      } else if (CONFIG.LEVELS && CONFIG.LEVELS[this.levelIndex]) {
        this.currentLevel = CONFIG.LEVELS[this.levelIndex];
      }
      const lvl = this.currentLevel || {};
      this.maxComplaints = lvl.maxComplaints || CONFIG.MAX_COMPLAINTS || 3;
      this.winTargetDuration = lvl.winHoldDurationSeconds || CONFIG.WIN_HOLD_DURATION_SECONDS || 300;
      this.winRequiredHouses = lvl.winRequiredHouses || CONFIG.WIN_REQUIRED_HOUSES || 15;
      this.maxHousesCap = lvl.maxHousesCap || CONFIG.MAX_HOUSES_CAP || 40;
      this.dayDuration = CONFIG.DAY_DURATION_IN_GAME_SECONDS || 15.0;
      if (CONFIG.DISASTERS && CONFIG.DISASTERS.FLOOD && typeof CONFIG.DISASTERS.FLOOD.maxDurationSecondsBeforeGameOver === 'number') {
        this.floodMaxDuration = CONFIG.DISASTERS.FLOOD.maxDurationSecondsBeforeGameOver;
      }
      if (this.levelElapsedTime < 1.0 && typeof lvl.startingBudget === 'number' && !this.isTutorialMode) {
        this.money = lvl.startingBudget;
      }
    }

    startLevel(levelIndex) {
      this.levelIndex = levelIndex;
      this.currentLevel = (CONFIG.LEVELS && CONFIG.LEVELS[levelIndex]) || CONFIG.LEVELS[0];
      this.map = new global.POWATER.CityMap(this.currentLevel, this.runtimeScene);

      this.money = this.currentLevel.startingBudget || 150;
      this.pollution = 0.0;
      this.currentPollutionRate = 0.0;
      this.complaints = 0;
      this.maxComplaints = this.currentLevel.maxComplaints || CONFIG.MAX_COMPLAINTS || 3;
      this.complaintLog = [];
      this.isGameOver = false;
      this.isGameWon = false;
      this.isPaused = false;
      this.gameSpeed = 1.0;

      // Win Timer reset (supports per-stage overrides from stage_config.json)
      this.winHoldTimer = 0.0;
      this.winTargetDuration = this.currentLevel.winHoldDurationSeconds || CONFIG.WIN_HOLD_DURATION_SECONDS || 300;
      this.winRequiredHouses = this.currentLevel.winRequiredHouses || CONFIG.WIN_REQUIRED_HOUSES || 15;
      this.maxHousesCap = this.currentLevel.maxHousesCap || CONFIG.MAX_HOUSES_CAP || 40;
      this.dayDuration = CONFIG.DAY_DURATION_IN_GAME_SECONDS || 15.0;
      this.winTimerState = 'WAITING';

      // Time & Cycles reset
      this.dayIndex = 0;
      this.dayTime = 0.0;
      this.totalDaysPassed = 0;
      this.weeksPassed = 0;
      this.levelElapsedTime = 0.0;
      this.gracePeriodActive = true;
      this.gracePeriodWarningShown = false;
      this.pollutionStartedNotified = false;

      this.dayNightTimer = 0.0;
      this.isNight = false;
      this.nightAlpha = 0.0;
      this.repairCheckTimer = 0.0;
      this.upsizeTier = 0;

      // Disasters reset
      this.activeDisasterText = '';
      this.isHighTide = false;
      this.highTideTimer = 0.0;
      this.earthquakeMinuteTimer = 0.0;
      this.minutesWithoutQuake = 0;
      this.guaranteedQuakeTriggered = false;
      this.postGuaranteedQuakeBonus = 0.0;
      this.screenShakeTimer = 0.0;

      this.isBlackoutActive = false;
      this.blackoutTimer = 0.0;

      this.isFloodActive = false;
      this.floodTimer = 0.0;
      this.isTutorialMode = false;
      this.tutorialStep = 0;
      this.tutorialStepTimer = 0.0;

      // Clean existing runtime objects if any
      if (this.runtimeScene) {
        this.buildings.forEach(b => {
          if (b.destroy) b.destroy();
          if (b.runtimeObject) {
            try { b.runtimeObject.deleteFromScene(this.runtimeScene); } catch (e) {}
          }
        });
        this.houses.forEach(h => {
          if (h.destroy) h.destroy();
          if (h.runtimeObject) {
            try { h.runtimeObject.deleteFromScene(this.runtimeScene); } catch (e) {}
          }
        });
      }

      this.houses = [];
      this.buildings = [];
      this.connections = [];
      this.floatingTexts = [];
      this.spawnTimer = 0;
      this.housesServedPeak = 0;
      this.completedHousesCount = 0;
      this.sdg15Unlocked = false;

      this.setupStartingCity();

      if (global.POWATER.soundManager) {
        global.POWATER.soundManager.resume();
      }
    }

    startTutorial() {
      this.startLevel(0);
      this.currentLevel = CONFIG.TUTORIAL_LEVEL || this.currentLevel;
      this.isTutorialMode = true;
      this.tutorialStep = 1;
      this.tutorialStepTimer = 0.0;
      this.tutorialHouse2 = null;
      this.money = 300;
      this.activeTool = 'power';

      // Keep only 1 house for fast 30-second interactive tutorial
      while (this.houses.length > 1) {
        const extra = this.houses.pop();
        if (extra.destroy) extra.destroy();
        if (extra.runtimeObject && this.runtimeScene) {
          try { extra.runtimeObject.deleteFromScene(this.runtimeScene); } catch (e) {}
        }
      }
      this.addFloatingText('🎓 เริ่มโหมดฝึกสอนด่วน (Fast Scene Tutorial)! ทำตามลูกศรแนะนำได้เลย', CONFIG.CANVAS_WIDTH / 2, 115, '#06d6a0');
    }

    // Free spot near a node for tutorial spawns (same river side, not in river, not on top of anything)
    findTutorialSpot(near) {
      const c = near.getCenter ? near.getCenter() : { x: near.centerX, y: near.centerY };
      const offs = [[0, 150], [0, -150], [160, 0], [-160, 0], [140, 140], [-140, 140], [140, -140], [-140, -140]];
      for (let i = 0; i < offs.length; i++) {
        const x = c.x + offs[i][0], y = c.y + offs[i][1];
        if (x < 60 || x > CONFIG.CANVAS_WIDTH - 60 || y < 100 || y > CONFIG.CANVAS_HEIGHT - 120) continue;
        if (this.map.isPointInRiver(x, y) || this.map.isNearRiver(x, y, 40)) continue;
        const busy = [...this.houses, ...this.buildings].some(e => {
          const ec = e.getCenter ? e.getCenter() : { x: e.centerX, y: e.centerY };
          return Math.hypot(ec.x - x, ec.y - y) < 95;
        });
        if (!busy) return { x, y };
      }
      return null;
    }

    // Tutorial steps: 1 power, 2 water, 3 sewage, 4 chain a new house, 5 repair,
    // 6 lose-by-pollution (place Eco Filter), 7 lose-by-strikes (read & confirm), 8 done
    updateTutorial(dt) {
      if (!this.isTutorialMode || this.tutorialStep <= 0) return;
      this.tutorialStepTimer += dt;
      const h0 = this.houses[0];
      const h1 = this.tutorialHouse2;
      const pump = this.buildings.find(b => b.config && b.config.type === 'water_pump');
      if (!h0) return;
      const say = (msg, col) => this.addFloatingText(msg, CONFIG.CANVAS_WIDTH / 2, 150, col);
      const sfx = (name) => { if (global.POWATER.soundManager) global.POWATER.soundManager[name](); };
      const next = () => { this.tutorialStep++; this.tutorialStepTimer = 0; };

      if (this.tutorialStep === 1 && h0.hasPower) {
        next();
        this.activeTool = 'water';
        say('✅ ขั้นที่ 1 สำเร็จ! ลากท่อน้ำดีสีฟ้าจากปั๊มน้ำไปที่บ้าน (กด Tab เพื่อสลับชนิดสาย)', '#00b4d8');
        sfx('playUpgrade');
      } else if (this.tutorialStep === 2 && h0.hasWater) {
        next();
        this.activeTool = 'sewage';
        say('✅ ขั้นที่ 2 สำเร็จ! ลากท่อน้ำเสียสีม่วงจากบ้านไปที่ถังบำบัดริมน้ำ', '#c77dff');
        sfx('playUpgrade');
      } else if (this.tutorialStep === 3 && h0.hasDrainage) {
        next();
        this.activeTool = 'power';
        const spot = this.findTutorialSpot(h0);
        this.tutorialHouse2 = spot ? this.spawnHouse(h0.side || null, spot.x, spot.y) : null;
        say('✅ บ้านสมบูรณ์ +$50! มีบ้านหลังใหม่: ลากสายจากบ้านเดิมไปบ้านใหม่ได้เลย (Tab สลับ ไฟ/น้ำ/น้ำเสีย)', '#ffd166');
        sfx('playUpgrade');
      } else if (this.tutorialStep === 4 && (!h1 || (h1.hasPower && h1.hasWater && h1.hasDrainage))) {
        next();
        this.activeTool = 'repair';
        if (pump) pump.breakDown();
        say('✅ ต่อพ่วงบ้านสำเร็จ! ปั๊มน้ำเสียแล้ว: คลิกที่ปั๊ม หรือกด REPAIR [R] แล้วคลิกปั๊มเพื่อซ่อม', '#ff5a5f');
        sfx('playPollutionWarn');
      } else if (this.tutorialStep === 5 && pump && !pump.isBroken) {
        next();
        this.activeTool = 'build_air_filter';
        this.tutorialFilterCount = this.buildings.filter(b => b.config.type === 'air_filter').length;
        this.pollution = this.currentLevel.maxPollution * 0.8;
        say('☢️ วิธีแพ้ที่ 1: มลภาวะเต็มหลอด = Game Over! วางเครื่องกรองอากาศ [4] เพื่อลดมลภาวะ', '#ff5a5f');
        sfx('playPollutionWarn');
      } else if (this.tutorialStep === 6 && this.buildings.filter(b => b.config.type === 'air_filter').length > (this.tutorialFilterCount || 0)) {
        next();
        this.activeTool = null;
        say('✅ เครื่องกรองกำลังลดมลภาวะ! ต่อไป วิธีแพ้ที่ 2: การร้องเรียน (Strike)', '#06d6a0');
        sfx('playUpgrade');
      }
      // Step 7 is read-only: the player confirms with the coach-bar button (skipTutorialStep)
    }

    skipTutorialStep() {
      if (!this.isTutorialMode) return;
      const h0 = this.houses[0];
      const h1 = this.tutorialHouse2;
      const gen = this.buildings.find(b => b.config && b.config.type === 'generator');
      const pump = this.buildings.find(b => b.config && b.config.type === 'water_pump');
      const filter = this.buildings.find(b => b.config && b.config.type === 'waste_filter');
      if (this.tutorialStep === 1 && gen && h0) {
        this.connectNodes('power', gen, h0);
      } else if (this.tutorialStep === 2 && pump && h0) {
        this.connectNodes('water', pump, h0);
      } else if (this.tutorialStep === 3 && filter && h0) {
        this.connectNodes('sewage', h0, filter);
      } else if (this.tutorialStep === 4 && h0 && h1) {
        ['power', 'water', 'sewage'].forEach(t => this.connectNodes(t, h0, h1));
      } else if (this.tutorialStep === 5) {
        const broken = this.buildings.find(b => b.isBroken);
        if (broken) broken.repair();
      } else if (this.tutorialStep === 6) {
        const spot = h0 && this.findTutorialSpot(h0);
        if (spot) this.createBuilding('air_filter', spot.x, spot.y);
        else this.tutorialFilterCount = -1;
      } else if (this.tutorialStep === 7) {
        this.tutorialStep = 8;
        this.pollution = 0;
        this.addFloatingText('🎉 ฝึกสอนครบทุกขั้นตอน! เริ่มด่าน Bangkok ได้เลย', CONFIG.CANVAS_WIDTH / 2, 115, '#06d6a0');
        if (global.POWATER.soundManager) global.POWATER.soundManager.playWin();
      }
    }

    setupStartingCity() {
      let foundAny = false;

      if (this.runtimeScene && this.runtimeScene.getObjects) {
        const buildingMappings = [
          { name: 'generator', key: 'GENERATOR_COAL' },
          { name: 'water_pump', key: 'WATER_PUMP' },
          { name: 'waste_filter', key: 'WASTE_FILTER' },
          { name: 'air_filter', key: 'AIR_FILTER' }
        ];

        for (let i = 0; i < buildingMappings.length; i++) {
          const m = buildingMappings[i];
          const objs = this.runtimeScene.getObjects(m.name);
          for (let j = 0; j < objs.length; j++) {
            const obj = objs[j];
            const alreadyTracked = this.buildings.some(b => b.runtimeObject === obj);
            if (!alreadyTracked) {
              const buildCfg = CONFIG.BUILDINGS[m.key];
              if (buildCfg) {
                const w = buildCfg.width || 56;
                const h = buildCfg.height || 56;
                if (obj.setSize) obj.setSize(w, h);
                const cx = obj.getX() + w / 2;
                const cy = obj.getY() + h / 2;
                const building = new global.POWATER.BuildingEntity(
                  `b_${this.nextEntityId++}`,
                  buildCfg,
                  obj,
                  cx,
                  cy
                );
                this.buildings.push(building);
                foundAny = true;
              }
            }
          }
        }

        const houseObjs = this.runtimeScene.getObjects('house');
        for (let j = 0; j < houseObjs.length; j++) {
          const obj = houseObjs[j];
          const alreadyTracked = this.houses.some(h => h.runtimeObject === obj);
          if (!alreadyTracked) {
            const w = 84, h = 56;
            if (obj.setSize) obj.setSize(w, h);
            const cx = obj.getX() + w / 2;
            const cy = obj.getY() + h / 2;
            const riverCenterX = this.map ? this.map.getRiverCenterAtY(cy) : 600;
            const side = cx < riverCenterX ? 'left' : 'right';
            const house = new global.POWATER.HouseEntity(
              `h_${this.nextEntityId++}`,
              obj,
              cx,
              cy,
              side
            );
            this.houses.push(house);
            foundAny = true;
          }
        }
      }

      if (!foundAny) {
        this.createBuilding('water_pump', 680, 270);
        this.createBuilding('waste_filter', 740, 470);
        this.createBuilding('generator_coal', 860, 270);
        this.spawnHouse('right', 860, 110);
        this.spawnHouse('right', 920, 460);
        this.spawnHouse('left', 350, 320);
      }
    }

    createBuilding(typeKey, centerX, centerY) {
      const buildCfg = CONFIG.BUILDINGS[typeKey.toUpperCase()];
      if (!buildCfg) return null;

      const w = buildCfg.width || 56;
      const h = buildCfg.height || 56;

      let runtimeObj = null;
      if (this.runtimeScene && buildCfg.objectName) {
        try {
          const objs = this.runtimeScene.createObject(buildCfg.objectName);
          if (objs) {
            if (objs.setSize) objs.setSize(w, h);
            objs.setPosition(centerX - w / 2, centerY - h / 2);
            objs.setZOrder(4);
            runtimeObj = objs;
          }
        } catch (e) {
          console.warn('GDevelop createObject error for building:', e);
        }
      }

      const building = new global.POWATER.BuildingEntity(
        `b_${this.nextEntityId++}`,
        buildCfg,
        runtimeObj,
        centerX,
        centerY
      );
      this.buildings.push(building);
      return building;
    }

    spawnHouse(side = null, forceX = null, forceY = null) {
      // Cap at 40 houses max per POWATER CORP.pdf ("จนตันที่ 40 หลัง")
      if (this.houses.length >= this.maxHousesCap) {
        return null;
      }

      let x = forceX;
      let y = forceY;

      if (x === null || y === null) {
        const sideChoice = side || (Math.random() < 0.5 ? 'left' : 'right');
        let valid = false;
        let attempts = 0;
        // As Map Upsizes (tiers 0..3), allow tighter urban packing so up to 40 houses fit cleanly
        const baseMinDist = CONFIG.MIN_HOUSE_DISTANCE || 135;
        const minDist = Math.max(76, baseMinDist - this.upsizeTier * 18);
        const marginYTop = Math.max(62, 85 - this.upsizeTier * 7);
        const marginYBottom = Math.max(85, 110 - this.upsizeTier * 7);
        const marginX = Math.max(48, 75 - this.upsizeTier * 8);

        while (!valid && attempts < 140) {
          attempts++;
          y = marginYTop + Math.random() * (CONFIG.CANVAS_HEIGHT - marginYTop - marginYBottom);
          const riverCenterX = this.map.getRiverCenterAtY(y);

          if (sideChoice === 'left') {
            x = marginX + Math.random() * Math.max(40, (riverCenterX - marginX - this.map.riverWidth / 2 - 35));
          } else {
            const startX = riverCenterX + this.map.riverWidth / 2 + 40;
            x = startX + Math.random() * Math.max(40, (CONFIG.CANVAS_WIDTH - startX - marginX));
          }

          const tooClose = [...this.houses, ...this.buildings].some(e => {
            const c = e.getCenter ? e.getCenter() : { x: e.centerX, y: e.centerY };
            return Math.hypot(c.x - x, c.y - y) < minDist;
          });
          const inRiver = this.map.isPointInRiver(x, y);

          if (!tooClose && !inRiver) {
            valid = true;
            side = sideChoice;
          }
        }

        if (!valid) return null;
      }

      const scale = Math.max(0.75, 1.0 - this.upsizeTier * 0.07);
      const w = Math.round(84 * scale);
      const h = Math.round(56 * scale);
      let runtimeObj = null;
      if (this.runtimeScene) {
        try {
          const objs = this.runtimeScene.createObject('house');
          if (objs) {
            if (objs.setSize) objs.setSize(w, h);
            objs.setPosition(x - w / 2, y - h / 2);
            objs.setZOrder(3);
            runtimeObj = objs;
          }
        } catch (e) {
          console.warn('GDevelop createObject error for house:', e);
        }
      }

      const house = new global.POWATER.HouseEntity(`h_${this.nextEntityId++}`, runtimeObj, x, y, side);
      house.applyUpsizeScale(scale);
      this.houses.push(house);

      this.checkMapUpsize();

      if (global.POWATER.soundManager) {
        global.POWATER.soundManager.playPlace();
      }
      return house;
    }

    checkMapUpsize() {
      // POWATER CORP.pdf: "Upsize: หากมีบ้าน x+10 หลัง ให้ขยายแมพ 1 ครั้งไปเรื่อยๆ จนตันที่ 40 หลัง"
      const count = this.houses.length;
      const targetTier = Math.min(3, Math.floor(count / (CONFIG.UPSIZE_STEP_HOUSES || 10)));
      if (targetTier > this.upsizeTier) {
        this.upsizeTier = targetTier;
        const scale = Math.max(0.75, 1.0 - this.upsizeTier * 0.07);
        this.houses.forEach(h => h.applyUpsizeScale(scale));
        const maxCapNow = Math.min(40, (this.upsizeTier + 1) * 10);
        this.addFloatingText(
          `🗺️ MAP UPSIZE! ขยายเมืองระดับ ${this.upsizeTier} (รองรับ ${maxCapNow}/40 หลัง)`,
          CONFIG.CANVAS_WIDTH / 2,
          110,
          '#00b4d8'
        );
        if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
      }
    }

    update(rawDt) {
      if (this.isPaused || this.isGameOver || this.isGameWon) return;
      const dt = rawDt * this.gameSpeed;

      // 1. Time, Weekly Economy & Day/Night Cycle
      this.updateTime(dt);
      this.updateDayNightCycle(dt);

      // 2. Protecting Time / Grace Period Management (2 minutes)
      this.levelElapsedTime += dt;
      if (this.levelElapsedTime < CONFIG.GRACE_PERIOD_SECONDS) {
        this.gracePeriodActive = true;
      } else {
        if (!this.gracePeriodWarningShown) {
          this.gracePeriodActive = false;
          this.gracePeriodWarningShown = true;
          this.isPaused = true;
          if (global.POWATER.soundManager) global.POWATER.soundManager.playComplaint();
          if (global.POWATER.uiManager) global.POWATER.uiManager.showGracePeriodEndedModal();
        } else {
          this.gracePeriodActive = false;
        }
      }

      // 3. Procedural House Spawner (respecting level spawnInterval & 40-house cap)
      const spawnIntervalSec = ((this.currentLevel && this.currentLevel.spawnInterval) || 18000) / 1000.0;
      this.spawnTimer += dt;
      if (this.spawnTimer >= spawnIntervalSec && this.houses.length < this.maxHousesCap) {
        this.spawnTimer = 0;
        this.spawnHouse();
      }

      // 4. Synchronize any houses created by GDevelop Event Sheet (capped at 40)
      if (this.runtimeScene && this.runtimeScene.getObjects) {
        const sceneHouses = this.runtimeScene.getObjects('house');
        for (let i = 0; i < sceneHouses.length; i++) {
          const obj = sceneHouses[i];
          const alreadyTracked = this.houses.some(h => h.runtimeObject === obj);
          if (!alreadyTracked) {
            if (this.houses.length >= this.maxHousesCap) {
              try { obj.deleteFromScene(this.runtimeScene); } catch (e) {}
              continue;
            }
            const scale = Math.max(0.75, 1.0 - this.upsizeTier * 0.07);
            const w = Math.round(84 * scale), h = Math.round(56 * scale);
            if (obj.setSize) obj.setSize(w, h);
            const cx = obj.getX() + w / 2;
            const cy = obj.getY() + h / 2;
            const riverCenterX = this.map ? this.map.getRiverCenterAtY(cy) : 550;
            const side = cx < riverCenterX ? 'left' : 'right';
            const house = new global.POWATER.HouseEntity(`h_${this.nextEntityId++}`, obj, cx, cy, side);
            house.applyUpsizeScale(scale);
            this.houses.push(house);
            this.checkMapUpsize();
          }
        }
      }

      // 5. Repair & Extreme Weather / Disasters Update
      this.updateRepairAndDisasters(dt);

      // 6. Utility Network Flow Propagation (Power, Water, Sewage)
      this.simulateNetwork();

      // 7. Update Houses & Award Instant +$50 Completion Bonus
      let completeCount = 0;
      let trickleEarned = 0;
      this.houses.forEach(h => {
        h.update(dt, (house, reason) => this.handleComplaint(house, reason), this.gracePeriodActive);
        const isHouseComplete = h.hasPower && h.hasWater && h.hasDrainage;
        if (isHouseComplete) {
          completeCount++;
          trickleEarned += (CONFIG.REVENUE_PER_HAPPY_HOUSE_SEC || 0.8) * dt;
          // POWATER CORP.pdf: "ทำให้บ้าน complete - 50 ทันที"
          if (!h.completedBonusPaid) {
            h.completedBonusPaid = true;
            const bonus = CONFIG.HOUSE_COMPLETE_BONUS || 50;
            this.money += bonus;
            this.addFloatingText(`+$${bonus} บ้านสมบูรณ์!`, h.centerX, h.centerY - 28, '#06d6a0');
            if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
          }
        }
      });
      this.completedHousesCount = completeCount;
      this.housesServedPeak = Math.max(this.housesServedPeak, completeCount);
      if (trickleEarned > 0) {
        this.money += trickleEarned;
      }

      // 8. Pollution Simulation
      this.updatePollution(dt);

      // 9. Update Map & Entities
      this.map.update(dt, this.pollution, this.currentLevel.maxPollution, this.isHighTide, this.isFloodActive);
      this.buildings.forEach(b => b.update(dt));
      this.connections.forEach(c => c.update(dt));
      this.floatingTexts = this.floatingTexts.filter(ft => ft.update(dt));

      // 10. Win / Lose Conditions & Fast Tutorial Coach
      this.updateTutorial(dt);
      this.checkGameConditions(dt);
    }

    updateTime(dt) {
      this.dayTime += dt / this.dayDuration;
      if (this.dayTime >= 1.0) {
        this.dayTime -= 1.0;
        this.dayIndex = (this.dayIndex + 1) % this.dayNames.length;
        this.totalDaysPassed++;

        // POWATER CORP.pdf: "[จำนวน บ้านที่ complete]*40/ต่อสัปดาห์"
        if (this.totalDaysPassed % 7 === 0) {
          this.weeksPassed++;
          const completeHouses = this.houses.filter(h => h.hasPower && h.hasWater && h.hasDrainage).length;
          const perHouseRev = (typeof CONFIG.WEEKLY_REVENUE_PER_COMPLETE_HOUSE === 'number') ? CONFIG.WEEKLY_REVENUE_PER_COMPLETE_HOUSE : 40;
          const weeklyIncome = completeHouses * perHouseRev;
          const baseGrant = (typeof CONFIG.WEEKLY_BASE_GRANT === 'number') ? CONFIG.WEEKLY_BASE_GRANT : 40;
          const totalWeekly = weeklyIncome + baseGrant;
          this.money += totalWeekly;
          this.addFloatingText(
            `📅 สัปดาห์ที่ ${this.weeksPassed}: +$${totalWeekly} (บ้านสมบูรณ์ ${completeHouses}x$${perHouseRev} + งบ $${baseGrant})`,
            CONFIG.CANVAS_WIDTH / 2,
            85,
            '#ffd166'
          );
          if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
        }

        // Check Day-based Extreme Weather triggers (Every 15 days: High Tide / Blackout; Every 28 days: Flood)
        this.onNewDayWeatherCheck();
      }
    }

    updateDayNightCycle(dt) {
      // POWATER CORP.pdf: "Day/Night Cycle: day 1 นาที, night 1 นาที"
      const dayDur = CONFIG.DAY_DURATION_SECONDS || 60;
      const nightDur = CONFIG.NIGHT_DURATION_SECONDS || 60;
      const cycleDur = dayDur + nightDur;
      this.dayNightTimer = (this.dayNightTimer + dt) % cycleDur;
      const wasNight = this.isNight;
      this.isNight = this.dayNightTimer >= dayDur;

      if (this.isNight && !wasNight) {
        this.addFloatingText('🌙 เข้าสู่เวลากลางคืน (Night Cycle - 1 นาที)', CONFIG.CANVAS_WIDTH / 2, 75, '#90e0ef');
      } else if (!this.isNight && wasNight) {
        this.addFloatingText('☀️ เข้าสู่เวลากลางวัน (Day Cycle - 1 นาที)', CONFIG.CANVAS_WIDTH / 2, 75, '#ffd166');
      }

      const targetAlpha = this.isNight ? 0.34 : 0.0;
      this.nightAlpha += (targetAlpha - this.nightAlpha) * Math.min(1.0, dt * 1.8);
    }

    onNewDayWeatherCheck() {
      const lvl = this.currentLevel || {};
      const dis = CONFIG.DISASTERS || {};
      const tideDays = (dis.HIGH_TIDE && dis.HIGH_TIDE.everyNDays) || 15;
      const blackoutDays = (dis.BLACKOUT && dis.BLACKOUT.everyNDays) || 15;
      const blackoutChance = (dis.BLACKOUT && typeof dis.BLACKOUT.chance === 'number') ? dis.BLACKOUT.chance : 0.125;
      const floodDays = (dis.FLOOD && dis.FLOOD.everyNDays) || 28;

      // 1. Bangkok & Amsterdam: High Tide every N in-game days
      if (lvl.hasHighTide && this.totalDaysPassed > 0 && this.totalDaysPassed % tideDays === 0) {
        this.triggerHighTide();
      }

      // 2. Rome: Blackout chance every N in-game days
      if (lvl.hasBlackout && this.totalDaysPassed > 0 && this.totalDaysPassed % blackoutDays === 0) {
        if (Math.random() < blackoutChance || this.totalDaysPassed === blackoutDays) {
          this.triggerRomeBlackout();
        }
      }

      // 3. Amsterdam: Main Flood every 4 weeks (28 in-game days)
      if (lvl.hasFlood && this.totalDaysPassed > 0 && this.totalDaysPassed % floodDays === 0) {
        this.triggerAmsterdamFlood();
      }
    }

    updateRepairAndDisasters(dt) {
      if (this.screenShakeTimer > 0) {
        this.screenShakeTimer = Math.max(0, this.screenShakeTimer - dt);
      }

      // 1. Periodic Repair Breakdown (POWATER CORP.pdf: 30% chance every 2 minutes)
      const repairInterval = CONFIG.REPAIR_CHECK_INTERVAL_SECONDS || 120;
      const tideMultiplier = this.isHighTide ? 2.0 : 1.0;
      this.repairCheckTimer += dt * tideMultiplier;
      if (this.repairCheckTimer >= repairInterval) {
        this.repairCheckTimer = 0;
        const chance = (typeof CONFIG.REPAIR_BREAKDOWN_CHANCE === 'number') ? CONFIG.REPAIR_BREAKDOWN_CHANCE : 0.30;
        let brokeCount = 0;
        this.buildings.forEach(b => {
          if (b.config && b.config.canBreakDown && !b.isBroken) {
            // During High Tide, riverside buildings have higher breakdown chance
            const effChance = (this.isHighTide && b.config.mustBeNearWater) ? Math.min(0.65, chance * 1.8) : chance;
            if (Math.random() < effChance) {
              b.breakDown();
              brokeCount++;
            }
          }
        });
        if (brokeCount > 0) {
          this.addFloatingText(
            `🔧 อุปกรณ์ขัดข้อง ${brokeCount} แห่ง! คลิกที่อุปกรณ์หรือกดปุ่ม REPAIR เพื่อซ่อมแซม`,
            CONFIG.CANVAS_WIDTH / 2,
            105,
            '#ff5a5f'
          );
          if (global.POWATER.soundManager) global.POWATER.soundManager.playPollutionWarn();
        }
      }

      // 2. High Tide duration countdown
      if (this.isHighTide) {
        this.highTideTimer -= dt;
        if (this.highTideTimer <= 0) {
          this.isHighTide = false;
          this.addFloatingText('🌊 ระดับน้ำขึ้นกลับสู่สภาวะปกติแล้ว', CONFIG.CANVAS_WIDTH / 2, 95, '#06d6a0');
        }
      }

      // 3. Tokyo & Amsterdam Earthquake (every 1 minute after Protecting Time)
      if (!this.gracePeriodActive && this.currentLevel && this.currentLevel.hasEarthquake) {
        const eqCfg = (CONFIG.DISASTERS && CONFIG.DISASTERS.EARTHQUAKE) || {};
        const checkInterval = eqCfg.checkEverySeconds || 60.0;
        const baseChance = (typeof eqCfg.baseChance === 'number') ? eqCfg.baseChance : 0.125;
        const escalateAfter = eqCfg.escalateAfterMinutes || 3;
        const escalateBonus = (typeof eqCfg.escalateBonusPerMinute === 'number') ? eqCfg.escalateBonusPerMinute : 0.05;
        const guaranteedMin = eqCfg.guaranteedAtMinute || 5;

        this.earthquakeMinuteTimer += dt;
        if (this.earthquakeMinuteTimer >= checkInterval) {
          this.earthquakeMinuteTimer -= checkInterval;
          this.minutesWithoutQuake++;

          // POWATER CORP.pdf Tokyo Earthquake rule:
          // Base 10-15% (12.5%). After 3 mins without quake, +5%/min. At 5 mins without quake, forced 100% quake!
          // After forced quake, condition becomes +5% every minute.
          let quakeChance = baseChance + this.postGuaranteedQuakeBonus;
          let forceQuake = false;

          if (!this.guaranteedQuakeTriggered) {
            if (this.minutesWithoutQuake >= guaranteedMin) {
              forceQuake = true;
              this.guaranteedQuakeTriggered = true;
            } else if (this.minutesWithoutQuake > escalateAfter) {
              quakeChance += (this.minutesWithoutQuake - escalateAfter) * escalateBonus;
            }
          } else {
            this.postGuaranteedQuakeBonus += escalateBonus;
            quakeChance = baseChance + this.postGuaranteedQuakeBonus;
          }

          if (forceQuake || Math.random() < quakeChance) {
            this.minutesWithoutQuake = 0;
            this.triggerEarthquake();
          }
        }
      }

      // 4. Rome Blackout countdown
      if (this.isBlackoutActive) {
        this.blackoutTimer -= dt;
        if (this.blackoutTimer <= 0) {
          this.isBlackoutActive = false;
          this.addFloatingText('⚡ กระแสไฟฟ้าในกรุงโรมกลับมาใช้งานได้ตามปกติแล้ว!', CONFIG.CANVAS_WIDTH / 2, 95, '#06d6a0');
        }
      }

      // 5. Amsterdam Flood countdown
      if (this.isFloodActive) {
        this.floodTimer += dt;
        if (this.floodTimer >= this.floodMaxDuration) {
          this.isFloodActive = false;
          this.floodTimer = 0.0;
          this.addFloatingText('🌊 ระดับน้ำท่วมใน Amsterdam ลดลงสู่สภาวะปกติเรียบร้อยแล้ว!', CONFIG.CANVAS_WIDTH / 2, 95, '#06d6a0');
        }
      }

      // Update active disaster status banner text
      const alerts = [];
      if (this.isFloodActive) {
        const rem = Math.max(0, Math.ceil(this.floodMaxDuration - this.floodTimer));
        alerts.push(`🌊 FLOOD! ระดับน้ำท่วม (${rem}s)`);
      }
      if (this.isBlackoutActive) {
        alerts.push(`⚡ BLACKOUT! ไฟดับชั่วคราว (${Math.ceil(this.blackoutTimer)}s)`);
      }
      if (this.isHighTide) {
        alerts.push(`🌊 น้ำขึ้นสูง (${Math.ceil(this.highTideTimer)}s)`);
      }
      const brokenCount = this.buildings.filter(b => b.isBroken).length;
      if (brokenCount > 0) {
        alerts.push(`🔧 ต้องซ่อม ${brokenCount} จุด`);
      }
      this.activeDisasterText = alerts.join(' | ');
    }

    triggerHighTide() {
      const tideCfg = (CONFIG.DISASTERS && CONFIG.DISASTERS.HIGH_TIDE) || {};
      this.isHighTide = true;
      this.highTideTimer = tideCfg.durationSeconds || 25.0;
      const breakChance = (typeof tideCfg.riversideBreakChance === 'number') ? tideCfg.riversideBreakChance : 0.5;
      let broken = 0;
      this.buildings.forEach(b => {
        if (b.config && b.config.mustBeNearWater && !b.isBroken && Math.random() < breakChance) {
          b.breakDown();
          broken++;
        }
      });
      this.addFloatingText(
        `🌊 Extreme Weather: น้ำขึ้นสูง (High Tide)! อุปกรณ์ริมน้ำชำรุด ${broken} แห่ง!`,
        CONFIG.CANVAS_WIDTH / 2,
        95,
        '#00b4d8'
      );
      if (global.POWATER.soundManager) global.POWATER.soundManager.playPollutionWarn();
    }

    triggerEarthquake() {
      this.screenShakeTimer = 2.0;
      let brokenCount = 0;
      // POWATER CORP.pdf: "Need to Repair Every Water and Electric Pump"
      this.buildings.forEach(b => {
        if (b.config && (b.config.type === 'generator' || b.config.type === 'water_pump' || b.config.type === 'waste_filter')) {
          b.breakDown();
          brokenCount++;
        }
      });
      this.addFloatingText(
        `🌋 EARTHQUAKE! แผ่นดินไหวรุนแรง! เครื่องปั๊มน้ำและโรงไฟฟ้าเสียหาย ${brokenCount} แห่ง ต้องซ่อมทันที!`,
        CONFIG.CANVAS_WIDTH / 2,
        100,
        '#e63946'
      );
      if (global.POWATER.soundManager) global.POWATER.soundManager.playComplaint();
    }

    triggerRomeBlackout() {
      const blkCfg = (CONFIG.DISASTERS && CONFIG.DISASTERS.BLACKOUT) || {};
      this.isBlackoutActive = true;
      this.blackoutTimer = blkCfg.durationSeconds || 25.0;
      this.addFloatingText(
        '⚡ ไฟดับครั้งใหญ่ในโรม! พลังงานไฟฟ้าขัดข้องชั่วคราว Win Timer หยุดเดิน',
        CONFIG.CANVAS_WIDTH / 2,
        100,
        '#ffd166'
      );
      if (global.POWATER.soundManager) global.POWATER.soundManager.playPollutionWarn();
    }

    triggerAmsterdamFlood() {
      if (this.isFloodActive) return;
      this.isFloodActive = true;
      this.floodTimer = 0.0;
      this.addFloatingText(
        `🌊 ภัยพิบัติหลัก: น้ำท่วมใหญ่ใน Amsterdam! ระดับน้ำจะลดลงใน ${Math.round(this.floodMaxDuration)}s`,
        CONFIG.CANVAS_WIDTH / 2,
        100,
        '#e63946'
      );
      if (global.POWATER.soundManager) global.POWATER.soundManager.playComplaint();
    }

    // testDisaster: costs $50 from the Disaster Simulation Lab (v1.0.4.0)
    testDisaster(disasterType) {
      const cost = (typeof CONFIG.DISASTER_TEST_COST === 'number') ? CONFIG.DISASTER_TEST_COST : 50;
      if (this.money < cost) {
        this.addFloatingText(`งบประมาณไม่พอสำหรับการทดสอบภัยพิบัติ! (ต้องการ $${cost})`, CONFIG.CANVAS_WIDTH / 2, 100, '#e63946');
        return false;
      }
      this.money -= cost;
      this.addFloatingText(`🧪 ใช้งบทดสอบภัยพิบัติ -$${cost} (งบวิจัยและทดสอบ)`, CONFIG.CANVAS_WIDTH / 2, 65, '#ffd166');
      if (disasterType === 'tide') this.triggerHighTide();
      else if (disasterType === 'quake') this.triggerEarthquake();
      else if (disasterType === 'blackout') this.triggerRomeBlackout();
      else if (disasterType === 'flood') this.triggerAmsterdamFlood();
      return true;
    }

    repairBuilding(building) {
      if (!building || !building.isBroken) return false;
      const repCost = this.getRepairCost();
      const c = building.getCenter();
      if (repCost > 0 && this.money < repCost) {
        this.addFloatingText(`งบไม่พอซ่อมแซม! (ต้องการ $${repCost})`, c.x, c.y - 25, '#e63946');
        return false;
      }
      if (repCost > 0) this.money -= repCost;
      building.repair();
      this.addFloatingText(repCost > 0 ? `🔧 ซ่อมแซมสำเร็จ! (-$${repCost})` : '🔧 ซ่อมแซมสำเร็จ!', c.x, c.y - 25, '#06d6a0');
      if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
      return true;
    }

    simulateNetwork() {
      this.houses.forEach(h => {
        h.hasPower = false;
        h.hasWater = false;
        h.hasDrainage = false;
        h.producesWaste = false;
        if (h.runtimeObject && h.runtimeObject.getVariables && h.runtimeObject.getVariables().has("IsPowered")) {
          h.runtimeObject.getVariables().get("IsPowered").setBoolean(false);
        }
      });

      this.buildings.forEach(b => {
        b.usedCapacity = 0;
      });

      this.connections.forEach(c => {
        c.active = false;
      });

      // 1. Simulate Power and Clean Water networks
      ['power', 'water'].forEach(type => {
        this.simulateTypeNetwork(type);
      });

      // Rome Blackout override: if Blackout is active, all power is cut (Win Timer pauses)
      if (this.isBlackoutActive) {
        this.houses.forEach(h => { h.hasPower = false; });
      }

      // 2. Houses that consume clean water produce wastewater
      this.houses.forEach(h => {
        if (h.hasWater) {
          h.producesWaste = true;
        }
      });

      // 3. Simulate Sewage Drainage network
      this.simulateSewageNetwork();
    }

    simulateTypeNetwork(type) {
      let sourceBuildings = [];
      if (type === 'power') {
        sourceBuildings = this.buildings.filter(b => b.config.type === 'generator' && b.active && !b.isBroken);
      } else if (type === 'water') {
        sourceBuildings = this.buildings.filter(b => b.config.type === 'water_pump' && b.active && !b.isBroken);
      }

      sourceBuildings.forEach(b => {
        if (b.config.type === 'generator') {
          b.capacity = Infinity;
        } else if (b.config.type === 'water_pump') {
          // Rome (+): Unlimited house-to-house water chaining
          if (this.currentLevel && this.currentLevel.unlimitedWaterChain) {
            b.capacity = Infinity;
          } else {
            const capMult = 1.0 + (this.upgradeLevels.water_cap - 1) * CONFIG.UPGRADES.WATER_PUMP_CAPACITY.bonusPerLevel;
            b.capacity = Math.round(b.config.capacity * capMult);
          }
        }
      });

      const typeConns = this.connections.filter(c => c.type === type);

      sourceBuildings.forEach(source => {
        let availableCap = source.capacity;
        const visited = new Set();
        const queue = [source];
        visited.add(source.id);

        while (queue.length > 0 && (availableCap === Infinity || availableCap > 0)) {
          const current = queue.shift();

          typeConns.forEach(conn => {
            let nextNode = null;
            if (conn.fromNode.id === current.id && !visited.has(conn.toNode.id)) {
              nextNode = conn.toNode;
            } else if (conn.toNode.id === current.id && !visited.has(conn.fromNode.id)) {
              nextNode = conn.fromNode;
            }

            if (nextNode) {
              conn.active = true;
              visited.add(nextNode.id);
              queue.push(nextNode);

              if (nextNode.isHouse || nextNode.entityType === 'house') {
                let served = false;
                if (type === 'power' && !nextNode.hasPower) {
                  nextNode.hasPower = true;
                  served = true;
                  if (nextNode.runtimeObject && nextNode.runtimeObject.getVariables && nextNode.runtimeObject.getVariables().has("IsPowered")) {
                    nextNode.runtimeObject.getVariables().get("IsPowered").setBoolean(true);
                  }
                } else if (type === 'water' && !nextNode.hasWater) {
                  nextNode.hasWater = true;
                  served = true;
                }

                if (served) {
                  source.usedCapacity++;
                  if (availableCap !== Infinity) availableCap--;
                }
              }
            }
          });
        }
      });
    }

    simulateSewageNetwork() {
      const wasteFilters = this.buildings.filter(b => b.config.type === 'waste_filter' && b.active && !b.isBroken);
      const sewageConns = this.connections.filter(c => c.type === 'sewage');

      wasteFilters.forEach(filter => {
        const capMult = 1.0 + (this.upgradeLevels.poll_red || 0) * 0.15 + ((this.upgradeLevels.waste_cap || 1) - 1) * 0.25;
        filter.capacity = (this.currentLevel && this.currentLevel.unlimitedWaterChain)
          ? Infinity
          : Math.round(filter.config.capacity * capMult);
        let remainingCap = filter.capacity;

        const visited = new Set();
        const queue = [filter];
        visited.add(filter.id);

        while (queue.length > 0 && (remainingCap === Infinity || remainingCap > 0)) {
          const current = queue.shift();

          sewageConns.forEach(conn => {
            let nextNode = null;
            if (conn.fromNode.id === current.id && !visited.has(conn.toNode.id)) {
              nextNode = conn.toNode;
            } else if (conn.toNode.id === current.id && !visited.has(conn.fromNode.id)) {
              nextNode = conn.fromNode;
            }

            if (nextNode) {
              conn.active = true;
              visited.add(nextNode.id);
              queue.push(nextNode);

              if (nextNode.isHouse || nextNode.entityType === 'house') {
                if (nextNode.producesWaste && !nextNode.hasDrainage) {
                  nextNode.hasDrainage = true;
                  filter.usedCapacity++;
                  if (remainingCap !== Infinity) remainingCap--;
                } else if (!nextNode.producesWaste) {
                  nextNode.hasDrainage = true;
                }
              }
            }
          });
        }
      });
    }

    updatePollution(dt) {
      const delay = CONFIG.POLLUTION_START_DELAY_SECONDS || 180;
      if (this.levelElapsedTime < delay && !this.isTutorialMode) {
        this.currentPollutionRate = 0.0;
        this.pollution = 0.0;
        return;
      }

      if (!this.pollutionStartedNotified) {
        this.pollutionStartedNotified = true;
        this.addFloatingText('⚠️ ครบ 3 นาที: ระบบคำนวณมลภาวะเริ่มทำงานแล้ว!', CONFIG.CANVAS_WIDTH / 2, 80, '#ffd166');
        if (global.POWATER.soundManager) global.POWATER.soundManager.playPollutionWarn();
      }

      const rates = CONFIG.POLLUTION_RATES;
      const stagePollMult = (this.currentLevel && typeof this.currentLevel.pollutionMultiplier === 'number')
        ? this.currentLevel.pollutionMultiplier
        : 1.0;
      const reductionFactor = Math.max(0.4, 1.0 - (this.upgradeLevels.poll_red * CONFIG.UPGRADES.POLLUTION_REDUCTION.bonusPerLevel)) * stagePollMult;

      const activeCoalGens = this.buildings.filter(b => b.config.type === 'generator' && !b.config.clean && b.active && !b.isBroken);
      let delta = activeCoalGens.length * rates.ELECTRIC_GENERATOR * reductionFactor * dt;

      const activeOutlets = this.buildings.filter(b => b.config.type === 'waste_filter' && b.active && !b.isBroken && b.usedCapacity > 0);
      const housesDrained = this.houses.filter(h => h.hasWater && h.hasDrainage).length;
      const housesUndrained = this.houses.filter(h => h.hasWater && !h.hasDrainage).length;

      if (activeOutlets.length > 0 || housesDrained > 0) {
        const discharge = activeOutlets.length * rates.WASTEWATER_OUTLET_BASE + housesDrained * rates.WASTEWATER_DISCHARGE_PER_HOUSE;
        delta += discharge * reductionFactor * dt;
      }

      if (housesUndrained > 0) {
        delta += housesUndrained * rates.UNTREATED_SEWAGE_PER_HOUSE * reductionFactor * dt;
      }

      const activeAirFilters = this.buildings.filter(b => b.config.type === 'air_filter' && b.active);
      delta -= activeAirFilters.length * rates.AIR_FILTER_REDUCTION * dt;

      delta -= rates.NATURAL_DILUTION * dt;

      this.currentPollutionRate = dt > 0 ? (delta / dt) : 0;
      this.pollution = Math.max(0.0, this.pollution + delta);

      if (this.runtimeScene && this.runtimeScene.getVariables) {
        try {
          const sceneVars = this.runtimeScene.getVariables();
          if (sceneVars.has('Pollution_total')) {
            sceneVars.get('Pollution_total').setNumber(Math.round(this.pollution));
          }
        } catch (e) {}
      }

      if (this.pollution >= this.currentLevel.maxPollution * CONFIG.POLLUTION_WARN_THRESHOLD) {
        if (Math.random() < 0.04 && global.POWATER.soundManager) {
          global.POWATER.soundManager.playPollutionWarn();
        }
      }
    }

    handleComplaint(house, reason) {
      this.complaints++;
      // POWATER CORP.pdf: "แต่หากถูกร้องเรียน Timer Reset"
      if (this.winHoldTimer > 0) {
        this.winHoldTimer = 0.0;
        this.addFloatingText('⏱️ ถูกร้องเรียน! เวลาชนะ (Win Timer) ถูกรีเซ็ตเป็น 0:00!', CONFIG.CANVAS_WIDTH / 2, 120, '#e63946');
      }

      this.complaintLog.push({
        id: this.complaints,
        houseId: house.id,
        reason: reason,
        time: `${this.dayNames[this.dayIndex]} Day ${this.totalDaysPassed + 1}`
      });

      const maxAllowed = this.maxComplaints || 3;
      this.addFloatingText(`⚠️ ร้องเรียน: ${reason} (${this.complaints}/${maxAllowed})`, house.centerX, house.centerY - 25, '#e63946');
      if (global.POWATER.soundManager) global.POWATER.soundManager.playComplaint();

      if (this.complaints >= maxAllowed) {
        const msg = maxAllowed === 1
          ? 'รัฐบาลอัมสเตอร์ดัมรับคำร้องเรียนไม่ได้! ถูกร้องเรียน 1 ครั้ง Game Over ทันที!'
          : 'ประชาชนยื่นเรื่องร้องเรียนครบ 3 รอบ! (ขาดแคลนสาธารณูปโภคต่อเนื่อง)';
        this.triggerGameOver(msg);
      }
    }

    checkGameConditions(dt = 0) {
      // 1. Lose Condition: Pollution limit
      if (this.pollution >= this.currentLevel.maxPollution) {
        this.triggerGameOver(`ค่ามลภาวะสูงเกินขีดจำกัด (${this.pollution.toFixed(1)} / ${this.currentLevel.maxPollution.toFixed(1)}) จนเมืองเป็นพิษ!`);
        return;
      }

      // 2. Win Condition (POWATER CORP.pdf):
      // "บ้าน > 15 หลังมีน้ำและไฟใช้ตลอดเวลาเป็นเวลา 5-7 นาที (หากเกิดการเสีย/Disaster หรือต้อง Repair เวลาจะ Pause ไว้ แต่หากถูกร้องเรียน Timer Reset)"
      const hasBrokenEquipment = this.buildings.some(b => b.isBroken);
      const hasActiveDisaster = this.isFloodActive || (this.isBlackoutActive && this.houses.some(h => !h.hasPower));
      const suppliedHouses = this.houses.filter(h => h.hasPower && h.hasWater).length;

      if (hasBrokenEquipment || hasActiveDisaster) {
        this.winTimerState = 'PAUSED';
      } else if (suppliedHouses >= this.winRequiredHouses) {
        this.winTimerState = 'RUNNING';
        this.winHoldTimer += dt;
        if (this.winHoldTimer >= this.winTargetDuration) {
          this.triggerGameWon();
        }
      } else {
        this.winTimerState = 'WAITING';
      }
    }

    triggerGameOver(reason) {
      if (this.isGameOver) return;
      this.isGameOver = true;
      this.gameOverReason = reason;
      if (global.POWATER.soundManager) global.POWATER.soundManager.playGameOver();
      if (global.POWATER.uiManager) global.POWATER.uiManager.showGameOverModal(reason);
    }

    triggerGameWon() {
      if (this.isGameWon) return;
      this.isGameWon = true;
      if (global.POWATER.soundManager) global.POWATER.soundManager.playWin();
      if (global.POWATER.uiManager) global.POWATER.uiManager.showGameWonModal();
    }

    placeBuilding(typeKey, x, y) {
      const buildCfg = CONFIG.BUILDINGS[typeKey.toUpperCase()];
      if (!buildCfg) return false;

      const actualCost = this.getBuildingCost(buildCfg);

      if (this.money < actualCost) {
        this.addFloatingText(`งบประมาณไม่พอ! (ต้องการ $${actualCost})`, x, y - 20, '#e63946');
        return false;
      }

      if (buildCfg.mustBeNearWater && !this.map.isNearRiver(x, y, 75)) {
        const lbl = buildCfg.type === 'waste_filter'
          ? 'ต้องสร้างจุดปล่อยน้ำเสียริมแม่น้ำเท่านั้น!'
          : 'ต้องสร้างปั๊มน้ำริมแม่น้ำเท่านั้น!';
        this.addFloatingText(lbl, x, y - 20, '#ffd166');
        return false;
      }

      if (this.map.isPointInRiver(x, y)) {
        this.addFloatingText('ไม่สามารถสร้างในแม่น้ำได้!', x, y - 20, '#e63946');
        return false;
      }

      const collided = [...this.buildings, ...this.houses].some(e => {
        const c = e.getCenter ? e.getCenter() : { x: e.centerX, y: e.centerY };
        return Math.hypot(c.x - x, c.y - y) < 60;
      });
      if (collided) {
        this.addFloatingText('พื้นที่ถูกใช้งานแล้ว!', x, y - 20, '#e63946');
        return false;
      }

      this.money -= actualCost;
      this.createBuilding(typeKey, x, y);

      // Easter Egg / Mini-Achievement: SDG 15 Life on Land trigger on Eco Filter or clean plant
      if (!this.sdg15Unlocked && buildCfg.type === 'air_filter') {
        this.sdg15Unlocked = true;
        this.addFloatingText('🌱 Easter Egg: ปลดล็อก SDG 15 Life on Land!', CONFIG.CANVAS_WIDTH / 2, 70, '#56ab2f');
        if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
      }

      if (global.POWATER.soundManager) global.POWATER.soundManager.playPlace();
      this.addFloatingText(`-$${actualCost}`, x, y - 20, '#ffd166');
      return true;
    }

    connectNodes(type, nodeA, nodeB) {
      if (!nodeA || !nodeB || nodeA.id === nodeB.id) return false;

      if ((nodeA.config && nodeA.config.type === 'air_filter') || (nodeB.config && nodeB.config.type === 'air_filter')) {
        this.addFloatingText('เครื่องกรองมลภาวะทำงานอัตโนมัติ ไม่ต้องต่อสาย!', (nodeA.getCenter().x + nodeB.getCenter().x) / 2, (nodeA.getCenter().y + nodeB.getCenter().y) / 2 - 20, '#2ec4b6');
        return false;
      }

      // --- Cross-type building guard ---
      // Map each building type to the utility it belongs to
      const BUILDING_UTILITY = {
        generator: 'power',
        water_pump: 'water',
        waste_filter: 'sewage'
      };
      const utilA = nodeA.config ? BUILDING_UTILITY[nodeA.config.type] : null;
      const utilB = nodeB.config ? BUILDING_UTILITY[nodeB.config.type] : null;

      // If both endpoints are buildings, they must belong to the same utility
      if (utilA && utilB && utilA !== utilB) {
        this.addFloatingText(
          `❌ ไม่สามารถเชื่อม${utilA === 'power' ? 'สายไฟ' : utilA === 'water' ? 'ท่อน้ำ' : 'ท่อน้ำเสีย'}กับ${utilB === 'power' ? 'โรงปั่นไฟ' : utilB === 'water' ? 'ปั๊มน้ำ' : 'ถังบำบัด'}ได้!`,
          (nodeA.getCenter().x + nodeB.getCenter().x) / 2,
          (nodeA.getCenter().y + nodeB.getCenter().y) / 2 - 20,
          '#e63946'
        );
        return false;
      }

      // If one endpoint is a building and the other is a house,
      // the active tool type MUST match the building's utility — otherwise block.
      if (utilA && nodeB.isHouse && type !== utilA) {
        this.addFloatingText(
          `❌ กดปุ่ม ${utilA === 'power' ? 'POWER [1]' : utilA === 'water' ? 'WATER [2]' : 'DRAIN [3]'} ก่อนลากสาย!`,
          (nodeA.getCenter().x + nodeB.getCenter().x) / 2,
          (nodeA.getCenter().y + nodeB.getCenter().y) / 2 - 20,
          '#ffd166'
        );
        return false;
      }
      if (utilB && nodeA.isHouse && type !== utilB) {
        this.addFloatingText(
          `❌ กดปุ่ม ${utilB === 'power' ? 'POWER [1]' : utilB === 'water' ? 'WATER [2]' : 'DRAIN [3]'} ก่อนลากสาย!`,
          (nodeA.getCenter().x + nodeB.getCenter().x) / 2,
          (nodeA.getCenter().y + nodeB.getCenter().y) / 2 - 20,
          '#ffd166'
        );
        return false;
      }

      let actualType = type;
      if ((nodeA.config && nodeA.config.type === 'generator') || (nodeB.config && nodeB.config.type === 'generator')) {
        actualType = 'power';
      } else if ((nodeA.config && nodeA.config.type === 'water_pump') || (nodeB.config && nodeB.config.type === 'water_pump')) {
        actualType = 'water';
      } else if ((nodeA.config && nodeA.config.type === 'waste_filter') || (nodeB.config && nodeB.config.type === 'waste_filter')) {
        actualType = 'sewage';
      } else if (nodeA.isHouse && nodeB.isHouse) {
        const hasConn = (t) => this.connections.some(c =>
          c.type === t &&
          ((c.fromNode.id === nodeA.id && c.toNode.id === nodeB.id) || (c.fromNode.id === nodeB.id && c.toNode.id === nodeA.id))
        );

        if (hasConn(actualType)) {
          const types = ['power', 'water', 'sewage'];
          const missing = types.find(t => !hasConn(t));
          if (missing) actualType = missing;
          else {
            this.addFloatingText('เชื่อมครบทั้ง 3 ระบบแล้ว!', (nodeA.getCenter().x + nodeB.getCenter().x) / 2, (nodeA.getCenter().y + nodeB.getCenter().y) / 2 - 20, '#06d6a0');
            return false;
          }
        }
      }

      const exists = this.connections.some(c =>
        c.type === actualType &&
        ((c.fromNode.id === nodeA.id && c.toNode.id === nodeB.id) || (c.fromNode.id === nodeB.id && c.toNode.id === nodeA.id))
      );
      if (exists) return false;

      const p1 = nodeA.getCenter();
      const p2 = nodeB.getCenter();
      const crossesRiver = this.map.checkLineIntersectsRiver(p1, p2);
      const connCost = this.getConnectionCost(actualType, crossesRiver);
      if (connCost > 0 && this.money < connCost) {
        this.addFloatingText(`งบไม่พอเชื่อมต่อสาย/ท่อ! (ต้องการ $${connCost})`, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 20, '#e63946');
        return false;
      }
      if (connCost > 0) this.money -= connCost;

      const conn = new global.POWATER.ConnectionEntity(`c_${this.nextEntityId++}`, actualType, nodeA, nodeB);
      conn.crossesRiver = crossesRiver;
      this.connections.push(conn);

      const typeLabels = { power: '⚡ เชื่อมสายไฟ', water: '💧 เชื่อมท่อน้ำดี', sewage: '🧪 เชื่อมท่อระบายน้ำ' };
      const typeColors = { power: '#ffd166', water: '#00b4d8', sewage: '#c77dff' };
      const costSuffix = connCost > 0 ? ` (-$${connCost})` : '';
      this.addFloatingText((typeLabels[actualType] || 'เชื่อมต่อสำเร็จ') + costSuffix, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 20, typeColors[actualType] || '#06d6a0');

      if (global.POWATER.soundManager) {
        if (actualType === 'power') global.POWATER.soundManager.playWireConnect();
        else if (actualType === 'water') global.POWATER.soundManager.playWaterConnect();
        else global.POWATER.soundManager.playSewageConnect();
      }

      return true;
    }

    deleteAt(x, y) {
      for (let i = this.connections.length - 1; i >= 0; i--) {
        const c = this.connections[i];
        const pts = c.getEndpoints();
        if (!pts) continue;

        let minDist = Infinity;
        if (pts.points && pts.points.length >= 2) {
          for (let s = 0; s < pts.points.length - 1; s++) {
            const d = this.distToSegment(x, y, pts.points[s].x, pts.points[s].y, pts.points[s + 1].x, pts.points[s + 1].y);
            if (d < minDist) minDist = d;
          }
        } else {
          minDist = this.distToSegment(x, y, pts.x1, pts.y1, pts.x2, pts.y2);
        }

        if (minDist < 15) {
          const typeLabel = c.type === 'power' ? 'สายไฟ' : (c.type === 'water' ? 'ท่อน้ำดี' : 'ท่อระบายน้ำ');
          this.connections.splice(i, 1);
          if (global.POWATER.soundManager) global.POWATER.soundManager.playClick();
          this.addFloatingText(`ลบ${typeLabel}แล้ว`, x, y, '#90e0ef');
          return true;
        }
      }

      const bIdx = this.buildings.findIndex(b => {
        const c = b.getCenter();
        return Math.hypot(c.x - x, c.y - y) <= 40;
      });
      if (bIdx !== -1) {
        const b = this.buildings[bIdx];
        const refundRatio = (typeof CONFIG.DEMOLISH_REFUND_RATIO === 'number') ? CONFIG.DEMOLISH_REFUND_RATIO : 0.5;
        const refund = Math.round(this.getBuildingCost(b.config) * refundRatio);
        this.money += refund;

        this.connections = this.connections.filter(c => c.fromNode.id !== b.id && c.toNode.id !== b.id);
        if (b.destroy) b.destroy();
        if (b.runtimeObject && this.runtimeScene) {
          try {
            b.runtimeObject.deleteFromScene(this.runtimeScene);
          } catch (e) {}
        }
        this.buildings.splice(bIdx, 1);

        if (global.POWATER.soundManager) global.POWATER.soundManager.playClick();
        this.addFloatingText(`รื้อถอน (คืนเงิน +$${refund})`, x, y, '#ffd166');
        return true;
      }

      return false;
    }

    distToSegment(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    getNodeAt(x, y) {
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        const c = b.getCenter();
        if (Math.hypot(c.x - x, c.y - y) <= 44) return b;
      }
      for (let i = 0; i < this.houses.length; i++) {
        const h = this.houses[i];
        const c = h.getCenter();
        if (Math.hypot(c.x - x, c.y - y) <= 50) return h;
      }
      return null;
    }

    getUpgradeConfig(upgradeKey) {
      const u = CONFIG.UPGRADES || {};
      if (upgradeKey === 'elec_cap' && u.ELECTRICITY_CAPACITY) return u.ELECTRICITY_CAPACITY;
      if (upgradeKey === 'poll_red' && u.POLLUTION_REDUCTION) return u.POLLUTION_REDUCTION;
      if (upgradeKey === 'water_cap' && u.WATER_PUMP_CAPACITY) return u.WATER_PUMP_CAPACITY;
      if (upgradeKey === 'waste_cap' && u.WASTE_FILTER_CAPACITY) return u.WASTE_FILTER_CAPACITY;
      return null;
    }

    buyUpgrade(upgradeKey) {
      const upCfg = this.getUpgradeConfig(upgradeKey);
      const baseCost = (upCfg && typeof upCfg.baseCost === 'number') ? upCfg.baseCost : 10;
      const mult = (upCfg && typeof upCfg.costMult === 'number') ? upCfg.costMult : 1.8;
      const maxLvl = (upCfg && typeof upCfg.maxLevel === 'number') ? upCfg.maxLevel : 5;

      const curLvl = this.upgradeLevels[upgradeKey] || 0;
      if (curLvl >= maxLvl) {
        this.addFloatingText('อัปเกรดถึงระดับสูงสุดแล้ว (MAX)!', CONFIG.CANVAS_WIDTH / 2, 100, '#ffd166');
        return false;
      }

      const cost = Math.round(baseCost * Math.pow(mult, Math.max(0, curLvl - (upgradeKey === 'poll_red' ? 0 : 1))));

      if (this.money < cost) {
        this.addFloatingText('งบประมาณไม่พออัปเกรด!', CONFIG.CANVAS_WIDTH / 2, 100, '#e63946');
        return false;
      }

      this.money -= cost;
      this.upgradeLevels[upgradeKey] = curLvl + 1;

      if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
      this.addFloatingText(`อัปเกรดสำเร็จ! (Lv.${this.upgradeLevels[upgradeKey]})`, CONFIG.CANVAS_WIDTH / 2, 100, '#06d6a0');
      return true;
    }

    addFloatingText(text, x, y, color = '#ffd166') {
      this.floatingTexts.push(new global.POWATER.FloatingTextEntity(text, x, y, color));
    }
  }

  global.POWATER.GameEngine = GameEngine;

})(typeof window !== 'undefined' ? window : globalThis);
