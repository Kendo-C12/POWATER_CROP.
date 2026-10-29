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
