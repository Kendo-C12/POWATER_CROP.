/**
 * POWATER CORP. - Main Application Controller
 * Reference: C:\Users\user\Downloads\Pre18-10 & POWATER IDEA PITCH.pdf
 * 
 * Orchestrates entity spawning and interactive wire connections
 */

(function (global) {
  'use strict';

  class GameManager {
    constructor() {
      this.wiring = new global.POWATER.WiringManager();
      this.spawner = new global.POWATER.HouseSpawner();
    }

    init(runtimeScene) {
      this.spawner.spawnInitialHouses(runtimeScene);
    }

    update(runtimeScene) {
      if (!this.spawner.hasSpawnedInitial) {
        this.spawner.spawnInitialHouses(runtimeScene);
      }
      this.wiring.update(runtimeScene);
    }
  }

  global.POWATER = global.POWATER || {};
  global.POWATER.GameManager = GameManager;

  global.POWATER.getGame = function (runtimeScene) {
    if (!runtimeScene._powaterGame) {
      runtimeScene._powaterGame = new GameManager();
      runtimeScene._powaterGame.init(runtimeScene);
    }
    return runtimeScene._powaterGame;
  };

  global.POWATER.update = function (runtimeScene) {
    const game = global.POWATER.getGame(runtimeScene);
    game.update(runtimeScene);
  };

})(
  typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
    ? globalThis
    : this
);
