import { TILE_SIZE } from "@/game/config";
import { LEVELS } from "@/game/levels";
import {
  TileType,
  type LevelDefinition,
  type Vector2,
} from "@/game/types";

export type SpawnPoint = Vector2 & {
  kind: "player" | "enemy" | "boss";
};

export type WorldStateSnapshot = {
  currentLevelIndex: number;
  completedLevels: number[];
  solvedTerminals: number[];
  traceLow: number;
  traceHigh: number;
  redlineUnlocked: boolean;
  transitioning: boolean;
};

export const WorldState = {
  create(): WorldStateSnapshot {
    return {
      currentLevelIndex: 0,
      completedLevels: [],
      solvedTerminals: [],
      traceLow: 0,
      traceHigh: 6,
      redlineUnlocked: false,
      transitioning: false,
    };
  },
};

type TransitionResult = {
  loadedNextLevel: boolean;
  campaignComplete: boolean;
};

export class LevelProgressionManager {
  readonly worldState = WorldState.create();
  readonly levels: LevelDefinition[];
  private grid: number[][] = [];
  private transitionElapsed = 0;
  private transitionLoaded = false;
  private campaignComplete = false;
  private spawns: SpawnPoint[] = [];

  constructor(levels = LEVELS) {
    this.levels = levels;
    this.loadLevel(0);
  }

  get level() {
    return this.levels[this.worldState.currentLevelIndex];
  }

  get width() {
    return (this.grid[0]?.length ?? 0) * TILE_SIZE;
  }

  get height() {
    return this.grid.length * TILE_SIZE;
  }

  get transitionAlpha() {
    if (!this.worldState.transitioning) return 0;
    if (this.campaignComplete) return 1;
    if (this.transitionElapsed <= 0.42) {
      return Math.min(1, this.transitionElapsed / 0.42);
    }
    return Math.max(0, 1 - (this.transitionElapsed - 0.42) / 0.48);
  }

  getTile(column: number, row: number) {
    return this.grid[row]?.[column] ?? TileType.Empty;
  }

  setTile(column: number, row: number, tile: number) {
    if (this.grid[row]?.[column] !== undefined) {
      this.grid[row][column] = tile;
    }
  }

  isSolidAt = (column: number, row: number) => {
    if (column < 0 || column >= (this.grid[0]?.length ?? 0)) return true;
    if (row < 0 || row >= this.grid.length) return false;
    const tile = this.getTile(column, row);
    return (
      tile === TileType.Solid ||
      tile === TileType.Secret ||
      tile === TileType.Firewall
    );
  };

  takeSpawns() {
    const spawns = this.spawns;
    this.spawns = [];
    return spawns;
  }

  getPlayerSpawn() {
    const spawn = this.scanDefinitionForSpawn(this.level);
    return {
      x: spawn.x,
      y: spawn.y,
    };
  }

  clearFirewalls() {
    for (let row = 0; row < this.grid.length; row += 1) {
      for (let column = 0; column < this.grid[row].length; column += 1) {
        if (this.grid[row][column] === TileType.Firewall) {
          this.grid[row][column] = TileType.Empty;
        }
      }
    }
  }

  beginTransition() {
    if (this.worldState.transitioning) return;
    this.worldState.transitioning = true;
    this.transitionElapsed = 0;
    this.transitionLoaded = false;
    this.campaignComplete = false;
  }

  updateTransition(deltaTime: number): TransitionResult {
    const result = {
      loadedNextLevel: false,
      campaignComplete: false,
    };
    if (!this.worldState.transitioning) return result;

    this.transitionElapsed += deltaTime;
    if (this.transitionElapsed < 0.42 || this.transitionLoaded) {
      return result;
    }

    this.transitionLoaded = true;
    const current = this.worldState.currentLevelIndex;
    if (!this.worldState.completedLevels.includes(current)) {
      this.worldState.completedLevels.push(current);
    }

    const nextLevelIndex = current + 1;
    if (nextLevelIndex >= this.levels.length) {
      this.campaignComplete = true;
      result.campaignComplete = true;
      return result;
    }

    this.loadLevel(nextLevelIndex);
    result.loadedNextLevel = true;
    return result;
  }

  finishTransition() {
    if (
      !this.worldState.transitioning ||
      this.campaignComplete ||
      this.transitionElapsed < 0.9
    ) {
      return;
    }
    this.worldState.transitioning = false;
    this.transitionElapsed = 0;
    this.transitionLoaded = false;
  }

  restartCampaign() {
    const freshState = WorldState.create();
    Object.assign(this.worldState, freshState);
    this.transitionElapsed = 0;
    this.transitionLoaded = false;
    this.campaignComplete = false;
    this.loadLevel(0);
  }

  restartLevel() {
    this.worldState.transitioning = false;
    this.transitionElapsed = 0;
    this.transitionLoaded = false;
    this.loadLevel(this.worldState.currentLevelIndex);
  }

  private loadLevel(index: number) {
    this.worldState.currentLevelIndex = index;
    this.grid = this.levels[index].tiles.map((row) => [...row]);
    this.spawns = [];

    for (let row = 0; row < this.grid.length; row += 1) {
      for (let column = 0; column < this.grid[row].length; column += 1) {
        const tile = this.grid[row][column];
        if (tile === TileType.PlayerSpawn) {
          this.spawns.push({
            kind: "player",
            x: column * TILE_SIZE + 9,
            y: row * TILE_SIZE + 4,
          });
          this.grid[row][column] = TileType.Empty;
        }
        if (tile === TileType.EnemySpawn || tile === TileType.BossSpawn) {
          this.spawns.push({
            kind: tile === TileType.BossSpawn ? "boss" : "enemy",
            x: column * TILE_SIZE + 5,
            y: row * TILE_SIZE,
          });
          this.grid[row][column] = TileType.Empty;
        }
      }
    }

    if (this.worldState.solvedTerminals.includes(index)) {
      this.clearFirewalls();
    }
  }

  private scanDefinitionForSpawn(level: LevelDefinition) {
    for (let row = 0; row < level.tiles.length; row += 1) {
      for (let column = 0; column < level.tiles[row].length; column += 1) {
        if (level.tiles[row][column] === TileType.PlayerSpawn) {
          return {
            x: column * TILE_SIZE + 9,
            y: row * TILE_SIZE + 4,
          };
        }
      }
    }
    return { x: TILE_SIZE * 2, y: TILE_SIZE * 10 };
  }
}
