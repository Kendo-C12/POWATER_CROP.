/**
 * POWATER CORP. - Entity Spawner Subsystem
 * Spawns initial houses and manages layout placement
 */

(function (global) {
  'use strict';

  class HouseSpawner {
    constructor() {
      this.hasSpawnedInitial = false;
    }

    spawnHouse(runtimeScene, x, y) {
      const house = runtimeScene.createObject("house");
      if (!house) return null;

      house.setPosition(x, y);

      // Link Water text if available
      try {
        const waterObj = runtimeScene.createObject("Water");
        if (waterObj) {
          const ptX = house.getPointX ? house.getPointX("Point") : (x + 75);
          const ptY = house.getPointY ? house.getPointY("Point") : (y - 10);
          waterObj.setPosition(ptX, ptY - 20);

          if (typeof gdjs !== 'undefined' && gdjs.LinksManager && gdjs.LinksManager.getManager) {
            gdjs.LinksManager.getManager(runtimeScene).linkObjects(house, waterObj);
          }
        }
      } catch (err) {
        // Safe link catch
      }

      // Link Electricity text if available
      try {
        const elecObj = runtimeScene.createObject("Electricity");
        if (elecObj) {
          const ptX = house.getPointX ? house.getPointX("Point") : (x + 75);
          const ptY = house.getPointY ? house.getPointY("Point") : (y - 10);
          elecObj.setPosition(ptX, ptY);

          if (typeof gdjs !== 'undefined' && gdjs.LinksManager && gdjs.LinksManager.getManager) {
            gdjs.LinksManager.getManager(runtimeScene).linkObjects(house, elecObj);
          }
        }
      } catch (err) {
        // Safe link catch
      }

      return house;
    }

    spawnInitialHouses(runtimeScene) {
      if (this.hasSpawnedInitial) return;
      this.hasSpawnedInitial = true;

      // Check if houses already exist in the scene
      const existingHouses = runtimeScene.getObjects("house");
      if (existingHouses && existingHouses.length >= 3) {
        return;
      }

      // 3 Initial houses spread across the 1280x720 canvas
      const positions = [
        { x: 240, y: 260 },
        { x: 880, y: 220 },
        { x: 560, y: 480 }
      ];

      for (let i = 0; i < positions.length; i++) {
        this.spawnHouse(runtimeScene, positions[i].x, positions[i].y);
      }
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.HouseSpawner = HouseSpawner;

})(
  typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
    ? globalThis
    : this
);
