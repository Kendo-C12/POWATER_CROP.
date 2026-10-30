// POWATER CORP. - Core Game Simulation Engine
// Manages utility propagation (BFS), economy, calendar clock, pollution dynamics, complaints & win/lose conditions

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};
  if (global.POWATER.GameEngine) {
    return; // Prevent prototype invalidation on repeated frame execution
  }

  const CONFIG = global.POWATER.CONFIG || {};

  class GameEngine {
    constructor() {
      this.levelIndex = 0;
      this.currentLevel = CONFIG.LEVELS ? CONFIG.LEVELS[0] : {};
      this.map = new global.POWATER.CityMap(this.currentLevel);

      // Simulation State
      this.money = this.currentLevel.startingBudget || 120;
      this.pollution = 0.0;
      this.currentPollutionRate = 0.0;
      this.complaints = 0; // 3 strikes = Game Over
      this.complaintLog = [];
      this.isGameOver = false;
      this.isGameWon = false;
      this.isPaused = false;
      this.gameSpeed = 1.0;

      // Calendar & Clock (18 seconds per game day)
      this.dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      this.dayIndex = 0;
      this.dayTime = 0.0;
      this.dayDuration = 18.0;
      this.totalDaysPassed = 0;
      this.levelElapsedTime = 0.0;
      this.gracePeriodActive = true;
      this.gracePeriodWarningShown = false;
      this.pollutionStartedNotified = false;

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
        water_cap: 1
      };

      // Spawner
      this.spawnTimer = 0;
      this.housesServedPeak = 0;

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
    }

    startLevel(levelIndex) {
      this.levelIndex = levelIndex;
      this.currentLevel = (CONFIG.LEVELS && CONFIG.LEVELS[levelIndex]) || CONFIG.LEVELS[0];
      this.map = new global.POWATER.CityMap(this.currentLevel);

      this.money = this.currentLevel.startingBudget || 120;
      this.pollution = 0.0;
      this.currentPollutionRate = 0.0;
      this.complaints = 0;
      this.complaintLog = [];
      this.isGameOver = false;
      this.isGameWon = false;
      this.isPaused = false;
      this.gameSpeed = 1.0;

      this.dayIndex = 0;
      this.dayTime = 0.0;
      this.totalDaysPassed = 0;
      this.levelElapsedTime = 0.0;
      this.gracePeriodActive = true;
      this.gracePeriodWarningShown = false;
      this.pollutionStartedNotified = false;

      // Clean existing runtime objects if any
      if (this.runtimeScene) {
        this.buildings.forEach(b => {
          if (b.runtimeObject) {
            try { b.runtimeObject.deleteFromScene(this.runtimeScene); } catch (e) {}
          }
        });
        this.houses.forEach(h => {
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

      this.setupStartingCity();

      if (global.POWATER.soundManager) {
        global.POWATER.soundManager.resume();
      }
    }

    setupStartingCity() {
      // 1. Initial Water Pump along river
      this.createBuilding('water_pump', 680, 270);

      // 2. Initial Wastewater Outlet along river (200px below Water Pump)
      this.createBuilding('waste_filter', 740, 470);

      // 3. Initial Electricity Generator (Power Tower) on Bangkok side
      this.createBuilding('generator_coal', 860, 270);

      // 4. Initial 3 Houses (Spacious, zero overlaps)
      this.spawnHouse('right', 860, 110); // Bangkok North
      this.spawnHouse('right', 920, 460); // Bangkok South
      this.spawnHouse('left', 350, 320);  // Thonburi West across river
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
      let x = forceX;
      let y = forceY;

      if (x === null || y === null) {
        const sideChoice = side || (Math.random() < 0.5 ? 'left' : 'right');
        let valid = false;
        let attempts = 0;
        const minDist = CONFIG.MIN_HOUSE_DISTANCE || 160;

        while (!valid && attempts < 100) {
          attempts++;
          y = 90 + Math.random() * (CONFIG.CANVAS_HEIGHT - 180);
          const riverCenterX = this.map.getRiverCenterAtY(y);

          if (sideChoice === 'left') {
            x = 80 + Math.random() * (riverCenterX - 80 - this.map.riverWidth / 2 - 40);
          } else {
            const startX = riverCenterX + this.map.riverWidth / 2 + 50;
            x = startX + Math.random() * (CONFIG.CANVAS_WIDTH - startX - 90);
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

      const w = 84;
      const h = 56;
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
      this.houses.push(house);

      if (global.POWATER.soundManager) {
        global.POWATER.soundManager.playPlace();
      }
      return house;
    }

    update(rawDt) {
      if (this.isPaused || this.isGameOver || this.isGameWon) return;
      const dt = rawDt * this.gameSpeed;

      // 1. Time & Calendar
      this.updateTime(dt);

      // 2. Grace Period Management (2 minutes)
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

      // 3. Synchronize any houses created by GDevelop Event Sheet
      if (this.runtimeScene && this.runtimeScene.getObjects) {
        const sceneHouses = this.runtimeScene.getObjects('house');
        for (let i = 0; i < sceneHouses.length; i++) {
          const obj = sceneHouses[i];
          const alreadyTracked = this.houses.some(h => h.runtimeObject === obj);
          if (!alreadyTracked) {
            const w = 84, h = 56;
            if (obj.setSize) obj.setSize(w, h);
            const cx = obj.getX() + w / 2;
            const cy = obj.getY() + h / 2;
            const riverCenterX = this.map ? this.map.getRiverCenterAtY(cy) : 550;
            const side = cx < riverCenterX ? 'left' : 'right';
            const house = new global.POWATER.HouseEntity(`h_${this.nextEntityId++}`, obj, cx, cy, side);
            this.houses.push(house);
          }
        }
      }

      // 4. Utility Network Flow Propagation (Power, Water, Sewage)
      this.simulateNetwork();

      // 5. Update Houses & Generate Revenue
      let fullySatisfiedCount = 0;
      let revenueEarned = 0;
      this.houses.forEach(h => {
        h.update(dt, (house, reason) => this.handleComplaint(house, reason), this.gracePeriodActive);
        if (h.hasPower && h.hasWater && h.hasDrainage) {
          fullySatisfiedCount++;
          revenueEarned += CONFIG.REVENUE_PER_HAPPY_HOUSE_SEC * dt;
        } else if (h.hasPower && h.hasWater) {
          revenueEarned += (CONFIG.REVENUE_PER_HAPPY_HOUSE_SEC * 0.5) * dt;
        }
      });
      this.housesServedPeak = Math.max(this.housesServedPeak, fullySatisfiedCount);

      if (revenueEarned > 0) {
        this.money += revenueEarned;
      }

      // 6. Pollution Simulation
      this.updatePollution(dt);

      // 7. Update Map & Entities
      this.map.update(dt, this.pollution, this.currentLevel.maxPollution);
      this.buildings.forEach(b => b.update(dt));
      this.connections.forEach(c => c.update(dt));
      this.floatingTexts = this.floatingTexts.filter(ft => ft.update(dt));

      // 8. Win / Lose Checks
      this.checkGameConditions();
    }

    updateTime(dt) {
      this.dayTime += dt / this.dayDuration;
      if (this.dayTime >= 1.0) {
        this.dayTime -= 1.0;
        this.dayIndex = (this.dayIndex + 1) % this.dayNames.length;
        this.totalDaysPassed++;

        // Daily government grant
        const grant = 25 + (this.upgradeLevels.elec_cap - 1) * 5;
        this.money += grant;
        this.addFloatingText(`+$${grant} วันใหม่ (${this.dayNames[this.dayIndex]})`, CONFIG.CANVAS_WIDTH / 2, 80, '#ffd166');
        if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
      }
    }

    simulateNetwork() {
      // Reset supply and drainage states
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
        sourceBuildings = this.buildings.filter(b => b.config.type === 'generator' && b.active);
      } else if (type === 'water') {
        sourceBuildings = this.buildings.filter(b => b.config.type === 'water_pump' && b.active);
      }

      sourceBuildings.forEach(b => {
        if (b.config.type === 'generator') {
          b.capacity = Infinity;
        } else if (b.config.type === 'water_pump') {
          const capMult = 1.0 + (this.upgradeLevels.water_cap - 1) * CONFIG.UPGRADES.WATER_PUMP_CAPACITY.bonusPerLevel;
          b.capacity = Math.round(b.config.capacity * capMult);
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

              // Explicit boolean check: avoids ES6 prototype mismatch
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
      const wasteFilters = this.buildings.filter(b => b.config.type === 'waste_filter' && b.active);
      const sewageConns = this.connections.filter(c => c.type === 'sewage');

      wasteFilters.forEach(filter => {
        const capMult = 1.0 + (this.upgradeLevels.poll_red || 0) * 0.15;
        filter.capacity = Math.round(filter.config.capacity * capMult);
        let remainingCap = filter.capacity;

        const visited = new Set();
        const queue = [filter];
        visited.add(filter.id);

        while (queue.length > 0 && remainingCap > 0) {
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
                  remainingCap--;
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
      if (this.levelElapsedTime < delay) {
        this.currentPollutionRate = 0.0;
        this.pollution = 0.0;
        return;
      }

      if (!this.pollutionStartedNotified) {
        this.pollutionStartedNotified = true;
        this.addFloatingText('⚠️ ครบ 3 นาที: ระบบมลภาวะเริ่มทำงานแล้ว!', CONFIG.CANVAS_WIDTH / 2, 80, '#ffd166');
        if (global.POWATER.soundManager) global.POWATER.soundManager.playPollutionWarn();
      }

      let delta = 0.0;
      const rates = CONFIG.POLLUTION_RATES;
      const reductionFactor = Math.max(0.4, 1.0 - (this.upgradeLevels.poll_red * CONFIG.UPGRADES.POLLUTION_REDUCTION.bonusPerLevel));

      // 1. Coal Generators (+0.3/s)
      const activeCoalGens = this.buildings.filter(b => b.config.type === 'generator' && !b.config.clean && b.active);
      delta += activeCoalGens.length * rates.ELECTRIC_GENERATOR * reductionFactor * dt;

      // 2. Wastewater Outlet Discharge & Untreated Sewage
      const activeOutlets = this.buildings.filter(b => b.config.type === 'waste_filter' && b.active && b.usedCapacity > 0);
      const housesDrained = this.houses.filter(h => h.hasWater && h.hasDrainage).length;
      const housesUndrained = this.houses.filter(h => h.hasWater && !h.hasDrainage).length;

      if (activeOutlets.length > 0 || housesDrained > 0) {
        const discharge = activeOutlets.length * rates.WASTEWATER_OUTLET_BASE + housesDrained * rates.WASTEWATER_DISCHARGE_PER_HOUSE;
        delta += discharge * reductionFactor * dt;
      }

      if (housesUndrained > 0) {
        delta += housesUndrained * rates.UNTREATED_SEWAGE_PER_HOUSE * reductionFactor * dt;
      }

      // 3. Air Filters (-0.2/s)
      const activeAirFilters = this.buildings.filter(b => b.config.type === 'air_filter' && b.active);
      delta -= activeAirFilters.length * rates.AIR_FILTER_REDUCTION * dt;

      // 4. Natural River Dilution
      delta -= rates.NATURAL_DILUTION * dt;

      this.currentPollutionRate = dt > 0 ? (delta / dt) : 0;
      this.pollution = Math.max(0.0, this.pollution + delta);

      // Sync with GDevelop Scene Variable
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
      this.complaintLog.push({
        id: this.complaints,
        houseId: house.id,
        reason: reason,
        time: `${this.dayNames[this.dayIndex]} Day ${this.totalDaysPassed + 1}`
      });

      this.addFloatingText(`⚠️ ร้องเรียน: ${reason} (${this.complaints}/${CONFIG.MAX_COMPLAINTS})`, house.centerX, house.centerY - 25, '#e63946');
      if (global.POWATER.soundManager) global.POWATER.soundManager.playComplaint();

      if (this.complaints >= CONFIG.MAX_COMPLAINTS) {
        this.triggerGameOver('ประชาชนยื่นเรื่องร้องเรียนครบ 3 รอบ! (ขาดแคลนสาธารณูปโภคต่อเนื่อง)');
      }
    }

    checkGameConditions() {
      // Lose Condition: Pollution limit
      if (this.pollution >= this.currentLevel.maxPollution) {
        this.triggerGameOver(`ค่ามลภาวะสูงเกินขีดจำกัด (${this.pollution.toFixed(1)} / ${this.currentLevel.maxPollution.toFixed(1)}) จนเมืองเป็นพิษ!`);
        return;
      }

      // Win Condition: Goal days & quota
      if (this.currentLevel.id !== 'endless') {
        if (this.totalDaysPassed >= this.currentLevel.goalDays && this.housesServedPeak >= this.currentLevel.targetHousesServed) {
          this.triggerGameWon();
        }
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

      if (this.money < buildCfg.cost) {
        this.addFloatingText('งบประมาณไม่พอ!', x, y - 20, '#e63946');
        return false;
      }

      if (buildCfg.mustBeNearWater && !this.map.isNearRiver(x, y, 65)) {
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
        return Math.hypot(c.x - x, c.y - y) < 65;
      });
      if (collided) {
        this.addFloatingText('พื้นที่ถูกใช้งานแล้ว!', x, y - 20, '#e63946');
        return false;
      }

      this.money -= buildCfg.cost;
      const building = this.createBuilding(typeKey, x, y);

      if (global.POWATER.soundManager) global.POWATER.soundManager.playPlace();
      this.addFloatingText(`-$${buildCfg.cost}`, x, y - 20, '#ffd166');
      return true;
    }

    connectNodes(type, nodeA, nodeB) {
      if (!nodeA || !nodeB || nodeA.id === nodeB.id) return false;

      if ((nodeA.config && nodeA.config.type === 'air_filter') || (nodeB.config && nodeB.config.type === 'air_filter')) {
        this.addFloatingText('เครื่องฟอกอากาศทำงานอัตโนมัติ ไม่ต้องต่อสาย!', (nodeA.getCenter().x + nodeB.getCenter().x) / 2, (nodeA.getCenter().y + nodeB.getCenter().y) / 2 - 20, '#2ec4b6');
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

      const conn = new global.POWATER.ConnectionEntity(`c_${this.nextEntityId++}`, actualType, nodeA, nodeB);
      conn.crossesRiver = crossesRiver;
      this.connections.push(conn);

      const typeLabels = { power: '⚡ เชื่อมสายไฟ', water: '💧 เชื่อมท่อน้ำดี', sewage: '🧪 เชื่อมท่อระบายน้ำ' };
      const typeColors = { power: '#ffd166', water: '#00b4d8', sewage: '#c77dff' };
      this.addFloatingText(typeLabels[actualType] || 'เชื่อมต่อสำเร็จ', (p1.x + p2.x) / 2, (p1.y + p2.y) / 2 - 20, typeColors[actualType] || '#06d6a0');

      if (global.POWATER.soundManager) {
        if (actualType === 'power') global.POWATER.soundManager.playWireConnect();
        else if (actualType === 'water') global.POWATER.soundManager.playWaterConnect();
        else global.POWATER.soundManager.playSewageConnect();
      }

      return true;
    }

    deleteAt(x, y) {
      // 1. Delete connection near clicked point
      for (let i = this.connections.length - 1; i >= 0; i--) {
        const c = this.connections[i];
        const pts = c.getEndpoints();
        if (!pts) continue;

        const dist = this.distToSegment(x, y, pts.x1, pts.y1, pts.x2, pts.y2);
        if (dist < 15) {
          const typeLabel = c.type === 'power' ? 'สายไฟ' : (c.type === 'water' ? 'ท่อน้ำดี' : 'ท่อระบายน้ำ');
          this.connections.splice(i, 1);
          if (global.POWATER.soundManager) global.POWATER.soundManager.playClick();
          this.addFloatingText(`ลบ${typeLabel}แล้ว`, x, y, '#90e0ef');
          return true;
        }
      }

      // 2. Delete building near clicked point (refund 50%)
      const bIdx = this.buildings.findIndex(b => {
        const c = b.getCenter();
        return Math.hypot(c.x - x, c.y - y) <= 40;
      });
      if (bIdx !== -1) {
        const b = this.buildings[bIdx];
        const refund = Math.round(b.config.cost * 0.5);
        this.money += refund;

        this.connections = this.connections.filter(c => c.fromNode.id !== b.id && c.toNode.id !== b.id);
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
      const dx = x2 - x1;
      const dy = y2 - y1;
      const l2 = dx * dx + dy * dy;
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * dx + (py - y1) * dy) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
    }

    getNodeAt(x, y) {
      // 1. Check buildings (radius 42px generously covers 56x56 footprint)
      for (let i = 0; i < this.buildings.length; i++) {
        const b = this.buildings[i];
        const c = b.getCenter();
        if (Math.hypot(c.x - x, c.y - y) <= 42) {
          return b;
        }
      }

      // 2. Check houses (radius 56px covers 84x56 sprite + pins at 52px)
      for (let i = 0; i < this.houses.length; i++) {
        const h = this.houses[i];
        const c = h.getCenter();
        if (Math.hypot(c.x - x, c.y - y) <= 56) {
          return h;
        }
      }

      return null;
    }

    buyUpgrade(upgradeId) {
      const upg = CONFIG.UPGRADES[upgradeId.toUpperCase()];
      if (!upg) return false;

      const curLv = this.upgradeLevels[upg.id] || 0;
      if (curLv >= upg.maxLevel) return false;

      const cost = Math.round(upg.baseCost * Math.pow(upg.costMult, curLv));
      if (this.money < cost) {
        this.addFloatingText('งบประมาณไม่พอ!', CONFIG.CANVAS_WIDTH / 2, 90, '#ff4d6d');
        return false;
      }

      this.money -= cost;
      this.upgradeLevels[upg.id] = curLv + 1;

      if (global.POWATER.soundManager) global.POWATER.soundManager.playUpgrade();
      this.addFloatingText(`อัปเกรดสำเร็จ: ${upg.name}!`, CONFIG.CANVAS_WIDTH / 2, 90, '#06d6a0');
      return true;
    }

    addFloatingText(text, x, y, color = '#ffd166') {
      this.floatingTexts.push(new global.POWATER.FloatingTextEntity(text, x, y, color));
    }
  }

  global.POWATER.GameEngine = GameEngine;

})(typeof window !== 'undefined' ? window : globalThis);
