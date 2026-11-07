// POWATER CORP. v1.0.0.0 - Game Entities System
// Houses (with Candle & Completion state), Utility Buildings (with Breakdown/Repair state & PNG Badges), and Conduits

(function (global) {
  'use strict';

  global.POWATER = global.POWATER || {};
  if (global.POWATER.HouseEntity && global.POWATER.BuildingEntity) {
    return;
  }

  const CONFIG = global.POWATER.CONFIG || {};

  class HouseEntity {
    constructor(id, runtimeObject, centerX, centerY, side) {
      this.id = id;
      this.isHouse = true;
      this.entityType = 'house';
      this.runtimeObject = runtimeObject;
      this.baseWidth = 84;
      this.baseHeight = 56;
      this.width = 84;
      this.height = 56;
      this.centerX = centerX;
      this.centerY = centerY;
      this.side = side || 'right';

      // Needs & Supply State
      this.needsPower = true;
      this.needsWater = true;
      this.hasPower = false;
      this.hasWater = false;
      this.hasDrainage = false;
      this.producesWaste = false;
      this.usingCandle = false; // Rome Blackout Candle protection
      this.completedBonusPaid = false; // +50 instant reward on first completion
      this.isComplete = false;

      // Satisfaction & Strike Timer
      this.unhappyTimer = 0;
      this.maxUnhappyTime = CONFIG.STRIKE_TIMER_SECONDS || 27;
      this.isCritical = false;
      this.pulseAngle = Math.random() * Math.PI * 2;
    }

    getCenter() {
      if (this.runtimeObject) {
        return {
          x: this.runtimeObject.getX() + this.runtimeObject.getWidth() / 2,
          y: this.runtimeObject.getY() + this.runtimeObject.getHeight() / 2
        };
      }
      return { x: this.centerX, y: this.centerY };
    }

    applyUpsizeScale(scale) {
      const w = Math.round(this.baseWidth * scale);
      const h = Math.round(this.baseHeight * scale);
      this.width = w;
      this.height = h;
      if (this.runtimeObject && this.runtimeObject.setSize) {
        this.runtimeObject.setSize(w, h);
        this.runtimeObject.setPosition(this.centerX - w / 2, this.centerY - h / 2);
      }
    }

    update(dt, onComplaint, gracePeriodActive = false) {
      this.pulseAngle += dt * 3.5;
      if (this.runtimeObject) {
        this.width = this.runtimeObject.getWidth();
        this.height = this.runtimeObject.getHeight();
        this.centerX = this.runtimeObject.getX() + this.width / 2;
        this.centerY = this.runtimeObject.getY() + this.height / 2;
      }

      const isFullySatisfied = this.hasPower && this.hasWater && this.hasDrainage;
      this.isComplete = (this.hasPower && this.hasWater);

      if (gracePeriodActive) {
        this.unhappyTimer = 0;
        this.isCritical = false;
        return;
      }

      if (!isFullySatisfied) {
        let mult = 1.0;
        if (!this.hasPower && !this.hasWater) mult = 1.35;
        else if (this.hasPower && this.hasWater && !this.hasDrainage) mult = 0.70;
        else if (this.hasPower || this.hasWater) mult = 0.45;

        this.unhappyTimer += dt * mult;
        this.isCritical = this.unhappyTimer > (this.maxUnhappyTime * 0.6);

        if (this.unhappyTimer >= this.maxUnhappyTime) {
          this.unhappyTimer = 0;
          let reason = 'ขาดแคลนสาธารณูปโภค';
          if (!this.hasPower && !this.hasWater) reason = 'ขาดทั้งน้ำและไฟฟ้า!';
          else if (!this.hasPower) reason = 'ไม่มีไฟฟ้าใช้ (ไฟดับ)!';
          else if (!this.hasWater) reason = 'น้ำประปาไม่ไหล!';
          else if (!this.hasDrainage) reason = 'น้ำเสียเอ่อล้น! ขาดท่อระบายน้ำ';

          if (onComplaint) onComplaint(this, reason);
        }
      } else {
        if (this.unhappyTimer > 0) {
          this.unhappyTimer = Math.max(0, this.unhappyTimer - dt * 2.5);
        }
        this.isCritical = false;
      }
    }

    render(pixiGfx, badgeContainer = null) {
      if (!pixiGfx) return;
      const c = this.getCenter();
      const radius = Math.max(34, Math.round(this.width * 0.54));

      // 1. Status Ring
      let ringColor = 0x6c757d;
      let alpha = 0.75;
      if (this.hasPower && this.hasWater && this.hasDrainage) {
        ringColor = 0x06d6a0; // Perfect Green
        alpha = 0.95;
      } else if (this.isCritical) {
        const flash = Math.sin(this.pulseAngle * 5) > 0;
        ringColor = flash ? 0xe63946 : 0xffb703;
        alpha = 1.0;
      } else if (this.hasWater && !this.hasDrainage) {
        ringColor = 0xc77dff; // Purple (Needs sewage drainage)
        alpha = 0.9;
      } else if (this.hasPower || this.hasWater) {
        ringColor = 0xffd166; // Yellow (Partially supplied)
        alpha = 0.85;
      }

      pixiGfx.lineStyle(2.5, ringColor, alpha);
      pixiGfx.drawCircle(c.x, c.y, radius);

      // 2. Connection Pins around the House (4 directions)
      const pinDist = radius + 6;
      const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
      angles.forEach(ang => {
        const px = c.x + Math.cos(ang) * pinDist;
        const py = c.y + Math.sin(ang) * pinDist;

        pixiGfx.lineStyle(2, ringColor, 0.85);
        pixiGfx.moveTo(c.x + Math.cos(ang) * (radius - 2), c.y + Math.sin(ang) * (radius - 2));
        pixiGfx.lineTo(px, py);

        pixiGfx.beginFill(ringColor, 1.0);
        pixiGfx.drawCircle(px, py, 3.2);
        pixiGfx.endFill();
      });

      // 3. Needs & Candle Indicator Badges (above house) using real PNG sprites
      const activeBadges = [];
      if (!this.hasPower) activeBadges.push('power');
      if (!this.hasWater) activeBadges.push('water');
      if (this.hasWater && !this.hasDrainage) activeBadges.push('drain');
      if (this.usingCandle) activeBadges.push('candle');

      const container = badgeContainer || pixiGfx.parent;
      if (!this.badgeSprites && container && typeof PIXI !== 'undefined') {
        const createBadgeSprite = (imgName) => {
          const tex = PIXI.Texture.from(imgName);
          const sp = new PIXI.Sprite(tex);
          sp.anchor.set(0.5);
          sp.scale.set(22 / 48);
          container.addChild(sp);
          return sp;
        };
        this.badgeSprites = {
          power: createBadgeSprite('badge_power.png'),
          water: createBadgeSprite('badge_water.png'),
          drain: createBadgeSprite('badge_drain.png'),
          candle: createBadgeSprite('badge_candle.png')
        };
      }

      if (this.badgeSprites) {
        const badgeY = c.y - radius - 10;
        const spacing = 22;
        const startX = c.x - ((activeBadges.length - 1) * spacing) / 2;

        ['power', 'water', 'drain', 'candle'].forEach(type => {
          const sp = this.badgeSprites[type];
          if (!sp) return;
          const idx = activeBadges.indexOf(type);
          if (idx !== -1) {
            sp.visible = true;
            sp.x = startX + idx * spacing;
            sp.y = badgeY;
            if (sp.texture && sp.texture.baseTexture && sp.texture.baseTexture.valid) {
              sp.width = 20;
              sp.height = 20;
            } else {
              sp.scale.set(20 / 48);
            }
          } else {
            sp.visible = false;
          }
        });
      }

      // 4. Unhappy Timer Bar (beneath house)
      if (this.unhappyTimer > 0) {
        const barW = 32;
        const barH = 4;
        const barX = c.x - barW / 2;
        const barY = c.y + radius + 6;
        const prog = Math.min(1.0, this.unhappyTimer / this.maxUnhappyTime);

        pixiGfx.lineStyle(1, 0x000000, 0.6);
        pixiGfx.beginFill(0x1a1334, 0.85);
        pixiGfx.drawRect(barX, barY, barW, barH);
        pixiGfx.endFill();

        const barColor = prog > 0.6 ? 0xe63946 : 0xffd166;
        pixiGfx.beginFill(barColor, 1.0);
        pixiGfx.drawRect(barX, barY, barW * (1.0 - prog), barH);
        pixiGfx.endFill();
      }
    }

    destroy() {
      if (this.badgeSprites) {
        Object.values(this.badgeSprites).forEach(sp => {
          if (sp && sp.parent) sp.parent.removeChild(sp);
          try { if (sp) sp.destroy(); } catch (e) {}
        });
        this.badgeSprites = null;
      }
    }
  }

  class BuildingEntity {
    constructor(id, config, runtimeObject, centerX, centerY) {
      this.id = id;
      this.isBuilding = true;
      this.entityType = 'building';
      this.config = config;
      this.runtimeObject = runtimeObject;
      this.baseWidth = config.width || 56;
      this.baseHeight = config.height || 56;
      this.width = this.baseWidth;
      this.height = this.baseHeight;
      this.centerX = centerX;
      this.centerY = centerY;
      this.capacity = config.capacity;
      this.usedCapacity = 0;
      this.isBroken = false; // POWATER CORP.pdf Repair system
      this.active = true;
      this.pulse = 0;
      this.repairBadgeSprite = null;
    }

    getCenter() {
      if (this.runtimeObject) {
        return {
          x: this.runtimeObject.getX() + this.runtimeObject.getWidth() / 2,
          y: this.runtimeObject.getY() + this.runtimeObject.getHeight() / 2
        };
      }
      return { x: this.centerX, y: this.centerY };
    }

    breakDown() {
      if (this.config && this.config.canBreakDown === false) return false;
      this.isBroken = true;
      this.active = false;
      if (this.runtimeObject && typeof this.runtimeObject.setColor === 'function') {
        this.runtimeObject.setColor('255;120;120');
      }
      return true;
    }

    repair() {
      if (!this.isBroken) return false;
      this.isBroken = false;
      this.active = true;
      if (this.runtimeObject && typeof this.runtimeObject.setColor === 'function') {
        this.runtimeObject.setColor('255;255;255');
      }
      return true;
    }

    update(dt) {
      this.pulse += dt * 3.5;
      this.active = !this.isBroken;
      if (this.runtimeObject) {
        this.width = this.runtimeObject.getWidth();
        this.height = this.runtimeObject.getHeight();
        this.centerX = this.runtimeObject.getX() + this.width / 2;
        this.centerY = this.runtimeObject.getY() + this.height / 2;
      }
    }

    render(pixiGfx, badgeContainer = null) {
      if (!pixiGfx) return;
      const c = this.getCenter();
      const r = 34;

      // Base footprint ring
      let baseColor = 0xffb703;
      if (this.isBroken) {
        baseColor = Math.sin(this.pulse * 4) > 0 ? 0xe63946 : 0xffb703;
      } else if (this.config.type === 'water_pump') {
        baseColor = 0x00b4d8;
      } else if (this.config.type === 'waste_filter') {
        baseColor = 0x9d4edd;
      } else if (this.config.type === 'air_filter') {
        baseColor = 0x2ec4b6;
      }

      pixiGfx.lineStyle(this.isBroken ? 3.5 : 2, baseColor, this.isBroken ? 1.0 : 0.7);
      pixiGfx.drawCircle(c.x, c.y, r);

      if (this.isBroken) {
        const warnR = r + 6 + Math.sin(this.pulse * 4) * 3;
        pixiGfx.lineStyle(2, 0xe63946, 0.85);
        pixiGfx.drawCircle(c.x, c.y, warnR);
      }

      // Air filter wind aura pulse
      if (this.config.type === 'air_filter' && !this.isBroken) {
        const auraR = r + 6 + Math.sin(this.pulse * 3) * 4;
        pixiGfx.lineStyle(1.5, 0x2ec4b6, 0.35);
        pixiGfx.drawCircle(c.x, c.y, auraR);
      }

      // Repair Badge Sprite above broken building
      const container = badgeContainer || pixiGfx.parent;
      if (!this.repairBadgeSprite && container && typeof PIXI !== 'undefined') {
        const tex = PIXI.Texture.from('badge_repair.png');
        const sp = new PIXI.Sprite(tex);
        sp.anchor.set(0.5);
        sp.scale.set(26 / 48);
        sp.visible = false;
        container.addChild(sp);
        this.repairBadgeSprite = sp;
      }

      if (this.repairBadgeSprite) {
        if (this.isBroken) {
          this.repairBadgeSprite.visible = true;
          this.repairBadgeSprite.x = c.x;
          this.repairBadgeSprite.y = c.y - r - 12 + Math.sin(this.pulse * 5) * 2;
          if (this.repairBadgeSprite.texture && this.repairBadgeSprite.texture.baseTexture && this.repairBadgeSprite.texture.baseTexture.valid) {
            this.repairBadgeSprite.width = 26;
            this.repairBadgeSprite.height = 26;
          }
        } else {
          this.repairBadgeSprite.visible = false;
        }
      }
    }

    destroy() {
      if (this.repairBadgeSprite) {
        if (this.repairBadgeSprite.parent) this.repairBadgeSprite.parent.removeChild(this.repairBadgeSprite);
        try { this.repairBadgeSprite.destroy(); } catch (e) {}
        this.repairBadgeSprite = null;
      }
    }
  }

  class ConnectionEntity {
    constructor(id, type, fromNode, toNode) {
      this.id = id;
      this.type = type; // 'power', 'water', 'sewage'
      this.fromNode = fromNode;
      this.toNode = toNode;
      this.active = false;
      this.pulsePhase = Math.random() * 10;
      this.crossesRiver = false;
    }

    update(dt) {
      this.pulsePhase += dt * 4.0;
    }

    getEndpoints() {
      const p1 = this.fromNode ? this.fromNode.getCenter() : null;
      const p2 = this.toNode ? this.toNode.getCenter() : null;
      if (!p1 || !p2) return null;

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy) || 1;
      const nx = -dy / dist;
      const ny = dx / dist;

      let offset = 0;
      if (this.type === 'power') offset = -6;
      else if (this.type === 'sewage') offset = 6;

      return {
        x1: p1.x + nx * offset,
        y1: p1.y + ny * offset,
        x2: p2.x + nx * offset,
        y2: p2.y + ny * offset,
        dist: dist
      };
    }

    render(pixiGfx) {
      if (!pixiGfx) return;
      const pts = this.getEndpoints();
      if (!pts) return;

      const pipeCfg = (CONFIG.PIPES && CONFIG.PIPES[this.type.toUpperCase()]) || {
        color: '#ffb703',
        glowColor: '#ffd166',
        lineWidth: 3
      };

      const colorInt = parseInt(pipeCfg.color.replace('#', '0x'), 16);
      const glowInt = parseInt(pipeCfg.glowColor.replace('#', '0x'), 16);

      if (this.crossesRiver) {
        pixiGfx.lineStyle(pipeCfg.lineWidth + 4, 0x0077b6, 0.35);
        pixiGfx.moveTo(pts.x1, pts.y1);
        pixiGfx.lineTo(pts.x2, pts.y2);
      }

      pixiGfx.lineStyle(pipeCfg.lineWidth + 2, this.active ? glowInt : 0x4a4e69, this.active ? 0.6 : 0.25);
      pixiGfx.moveTo(pts.x1, pts.y1);
      pixiGfx.lineTo(pts.x2, pts.y2);

      pixiGfx.lineStyle(pipeCfg.lineWidth, this.active ? colorInt : 0x3d3a50, 0.95);
      pixiGfx.moveTo(pts.x1, pts.y1);
      pixiGfx.lineTo(pts.x2, pts.y2);

      pixiGfx.lineStyle(1.5, 0xffffff, 0.85);
      pixiGfx.beginFill(colorInt, 1.0);
      pixiGfx.drawCircle(pts.x1, pts.y1, 4.0);
      pixiGfx.drawCircle(pts.x2, pts.y2, 4.0);
      pixiGfx.endFill();

      if (this.active) {
        const numPulses = Math.max(1, Math.floor(pts.dist / 45));
        for (let i = 0; i < numPulses; i++) {
          const prog = (this.pulsePhase / 8.0 + i / numPulses) % 1.0;
          const px = pts.x1 + (pts.x2 - pts.x1) * prog;
          const py = pts.y1 + (pts.y2 - pts.y1) * prog;

          pixiGfx.lineStyle(1, 0xffffff, 0.9);
          pixiGfx.beginFill(glowInt, 0.9);
          pixiGfx.drawCircle(px, py, 2.5);
          pixiGfx.endFill();
        }
      }
    }
  }

  class FloatingTextEntity {
    constructor(text, x, y, color = '#ffd166') {
      this.text = text;
      this.x = x;
      this.y = y;
      this.color = color;
      this.life = 1.0;
      this.vy = -35;
    }

    update(dt) {
      this.y += this.vy * dt;
      this.life -= dt * 0.8;
      return this.life > 0;
    }
  }

  global.POWATER.HouseEntity = HouseEntity;
  global.POWATER.BuildingEntity = BuildingEntity;
  global.POWATER.ConnectionEntity = ConnectionEntity;
  global.POWATER.FloatingTextEntity = FloatingTextEntity;

})(typeof window !== 'undefined' ? window : globalThis);
