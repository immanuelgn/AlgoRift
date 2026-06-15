import { CameraController } from "@/game/camera";
import {
  forEachOverlappingTile,
  moveWithTileCollisions,
  overlaps,
  type PhysicsBody,
} from "@/game/collision";
import {
  FIXED_TIME_STEP,
  TILE_SIZE,
  physicsParams,
  setPhysicsParameter,
  timeScale,
  toggleHackerMode,
} from "@/game/config";
import { InputController } from "@/game/input";
import { LevelProgressionManager } from "@/game/level-manager";
import { Player } from "@/game/player";
import { GameSound } from "@/game/sound";
import {
  TileType,
  type AlgorithmBrief,
  type CompletionPayload,
  type GameUiState,
  type InputAction,
  type TraceDirection,
  type TracePrompt,
  type TunablePhysicsKey,
} from "@/game/types";

type GameEngineOptions = {
  soundOn: boolean;
  onUiState: (state: GameUiState) => void;
  onComplete: (payload: CompletionPayload) => void;
};

type Enemy = PhysicsBody & {
  kind: "bug" | "boss";
  direction: -1 | 1;
  dead: boolean;
  health: number;
  phase: number;
};

type Particle = {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  life: number;
  color: string;
  size: number;
};

const TRACE_VALUES = [3, 8, 12, 17, 23, 31, 42];
const TRACE_TARGET = 42;
const BINARY_SEARCH_BRIEF: AlgorithmBrief = {
  title: "Binary Search",
  rule: "Compare the middle value, then keep only the half where the target can still exist.",
  detail: "Target 42 lives in a sorted signal. Every terminal asks you to shrink the search window.",
};

export class PlatformGameEngine {
  readonly input: InputController;

  private readonly context: CanvasRenderingContext2D;
  private readonly player = new Player();
  private readonly camera = new CameraController();
  private readonly levelManager = new LevelProgressionManager();
  private readonly sound: GameSound;
  private readonly options: GameEngineOptions;
  private enemies: Enemy[] = [];
  private particles: Particle[] = [];
  private animationFrame = 0;
  private lastFrameTime = 0;
  private accumulator = 0;
  private running = false;
  private canvasWidth = 960;
  private canvasHeight = 540;
  private health = 3;
  private chips = 0;
  private laserTimer = 0;
  private laserCooldown = 0;
  private laserEndX = 0;
  private screenShake = 0;
  private tracePrompt: TracePrompt | null = null;
  private traceSuccessTimer = 0;
  private hackerMode = false;
  private statusLine = "REACH THE EXIT FLAG";
  private uiTimer = 0;
  private campaignComplete = false;
  private jumpWasGrounded = false;
  private pulseActions = new Map<InputAction, number>();
  private heldVirtualActions = new Set<InputAction>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    options: GameEngineOptions,
  ) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable.");
    this.context = context;
    this.options = options;
    this.sound = new GameSound(options.soundOn);
    this.input = new InputController();
    this.loadCurrentLevel();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastFrameTime = 0;
    this.animationFrame = window.requestAnimationFrame(this.frame);
  }

  stop() {
    this.running = false;
    window.cancelAnimationFrame(this.animationFrame);
    this.input.destroy();
    toggleHackerMode(false);
  }

  setSoundEnabled(enabled: boolean) {
    this.sound.setEnabled(enabled);
  }

  setVirtualAction(action: InputAction, active: boolean) {
    if (active) {
      this.heldVirtualActions.add(action);
      this.input.setVirtualAction(action, true);
      return;
    }

    this.heldVirtualActions.delete(action);
    if (!this.pulseActions.has(action)) {
      this.input.setVirtualAction(action, false);
    }
  }

  pulseVirtualAction(action: InputAction, duration = 0.18) {
    this.pulseActions.set(
      action,
      Math.max(this.pulseActions.get(action) ?? 0, duration),
    );
    this.input.setVirtualAction(action, true);
  }

  toggleOverride() {
    if (this.campaignComplete) return;
    if (this.hackerMode) {
      this.closeHackerMode();
      return;
    }
    this.openHackerMode(this.getNearbyTerminal());
  }

  closeHackerMode() {
    this.hackerMode = false;
    this.tracePrompt = null;
    toggleHackerMode(false);
    this.emitUiState(true);
  }

  setPhysicsParameter(key: TunablePhysicsKey, value: number) {
    setPhysicsParameter(key, value);
    this.emitUiState(true);
  }

  submitTrace(direction: TraceDirection) {
    if (!this.tracePrompt) return;
    if (direction !== this.tracePrompt.expected) {
      this.tracePrompt = {
        ...this.tracePrompt,
        rejected: direction,
      };
      this.statusLine = "TRACE REJECTED // SIGNAL OUTSIDE WINDOW";
      this.sound.hit();
      this.emitUiState(true);
      return;
    }

    const state = this.levelManager.worldState;
    const pivotIndex = Math.floor((state.traceLow + state.traceHigh) / 2);
    if (direction === "higher") state.traceLow = pivotIndex + 1;
    if (direction === "lower") state.traceHigh = pivotIndex - 1;

    const levelIndex = state.currentLevelIndex;
    if (!state.solvedTerminals.includes(levelIndex)) {
      state.solvedTerminals.push(levelIndex);
    }
    this.levelManager.clearFirewalls();
    this.statusLine =
      direction === "lock"
        ? "ROOT SIGNATURE LOCKED"
        : `WINDOW PATCHED // ${direction.toUpperCase()} HALF`;
    this.traceSuccessTimer = 0.5;
    this.sound.terminal();
    this.emitBurst(
      this.player.x + this.player.width / 2,
      this.player.y,
      this.levelManager.level.theme.accent,
      22,
    );
    this.emitUiState(true);
  }

  restart() {
    this.health = 3;
    this.chips = 0;
    this.campaignComplete = false;
    this.closeHackerMode();
    this.levelManager.restartCampaign();
    this.loadCurrentLevel();
    this.statusLine = "REACH THE EXIT FLAG";
    this.emitUiState(true);
  }

  private readonly frame = (timestamp: number) => {
    if (!this.running) return;
    this.syncCanvasSize();

    if (this.lastFrameTime === 0) this.lastFrameTime = timestamp;
    const rawDelta = Math.min(0.05, (timestamp - this.lastFrameTime) / 1_000);
    this.lastFrameTime = timestamp;
    const scaledDelta = rawDelta * timeScale;
    this.accumulator = Math.min(0.12, this.accumulator + scaledDelta);

    while (this.accumulator >= FIXED_TIME_STEP) {
      this.update(FIXED_TIME_STEP);
      this.accumulator -= FIXED_TIME_STEP;
    }

    this.updateTransitions(rawDelta);
    this.render(timestamp / 1_000);
    this.animationFrame = window.requestAnimationFrame(this.frame);
  };

  private update(deltaTime: number) {
    if (this.campaignComplete || this.levelManager.worldState.transitioning) {
      this.updateParticles(deltaTime);
      return;
    }

    if (this.input.consumePressed("hack")) {
      this.toggleOverride();
    }

    if (this.traceSuccessTimer > 0) {
      this.traceSuccessTimer -= deltaTime / Math.max(timeScale, 0.01);
      if (this.traceSuccessTimer <= 0) this.closeHackerMode();
    }

    this.jumpWasGrounded = this.player.grounded;
    this.player.update(deltaTime, this.input, {
      isSolidAt: this.levelManager.isSolidAt,
    });
    if (this.jumpWasGrounded && !this.player.grounded && this.player.velocity.y < 0) {
      this.sound.jump();
    }

    this.laserTimer = Math.max(0, this.laserTimer - deltaTime);
    this.laserCooldown = Math.max(0, this.laserCooldown - deltaTime);
    this.screenShake = Math.max(0, this.screenShake - deltaTime * 5);

    if (this.input.consumePressed("fire")) this.fireLaser();

    this.updateEnemies(deltaTime);
    this.handleTileInteractions();
    this.handleEnemyInteractions();
    this.updateParticles(deltaTime);
    this.updatePulseActions(deltaTime);

    if (this.player.y > this.levelManager.height + 120) {
      this.damagePlayer();
    }

    this.camera.update(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      this.player.velocity.x,
      deltaTime,
      this.levelManager.width,
      this.levelManager.height,
    );

    this.uiTimer -= deltaTime;
    if (this.uiTimer <= 0) {
      this.emitUiState();
      this.uiTimer = 0.08;
    }
  }

  private updatePulseActions(deltaTime: number) {
    for (const [action, remaining] of this.pulseActions) {
      const nextRemaining = remaining - deltaTime;
      if (nextRemaining > 0) {
        this.pulseActions.set(action, nextRemaining);
        continue;
      }
      this.pulseActions.delete(action);
      if (!this.heldVirtualActions.has(action)) {
        this.input.setVirtualAction(action, false);
      }
    }
  }

  private updateTransitions(rawDelta: number) {
    const result = this.levelManager.updateTransition(rawDelta);
    if (result.loadedNextLevel) {
      this.loadCurrentLevel();
      this.sound.transition();
    }
    if (result.campaignComplete && !this.campaignComplete) {
      this.campaignComplete = true;
      this.statusLine = "WORLD 1 ROOT ACCESS COMPLETE";
      this.options.onComplete({
        completedLevel: 1,
        xp: 250,
        redlineVisionUnlocked: true,
      });
      this.emitUiState(true);
    }
    this.levelManager.finishTransition();
  }

  private loadCurrentLevel() {
    const spawns = this.levelManager.takeSpawns();
    const playerSpawn =
      spawns.find((spawn) => spawn.kind === "player") ??
      this.levelManager.getPlayerSpawn();
    this.player.spawn(playerSpawn.x, playerSpawn.y);
    this.enemies = spawns
      .filter((spawn) => spawn.kind !== "player")
      .map((spawn, index) => {
        const boss = spawn.kind === "boss";
        return {
          x: spawn.x,
          y: spawn.y + (boss ? -20 : 8),
          width: boss ? 76 : 38,
          height: boss ? 68 : 34,
          velocity: { x: boss ? -72 : index % 2 === 0 ? -58 : 58, y: 0 },
          kind: boss ? "boss" : "bug",
          direction: -1,
          dead: false,
          health: boss ? 4 : 1,
          phase: index * 0.73,
        };
      });
    this.particles = [];
    this.laserTimer = 0;
    this.laserCooldown = 0;
    this.camera.snapTo(
      this.player.x,
      this.player.y,
      this.levelManager.width,
      this.levelManager.height,
    );
    this.statusLine = `SECTOR ${this.levelManager.level.sector} // ${this.levelManager.level.name.toUpperCase()}`;
    this.emitUiState(true);
  }

  private updateEnemies(deltaTime: number) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      enemy.phase += deltaTime;
      enemy.velocity.x =
        enemy.direction * (enemy.kind === "boss" ? 82 : 58);
      enemy.velocity.y = Math.min(760, enemy.velocity.y + 1_900 * deltaTime);
      const collisions = moveWithTileCollisions(enemy, deltaTime, {
        isSolidAt: this.levelManager.isSolidAt,
      });

      const frontColumn = Math.floor(
        (enemy.x + (enemy.direction > 0 ? enemy.width + 5 : -5)) / TILE_SIZE,
      );
      const footRow = Math.floor((enemy.y + enemy.height + 6) / TILE_SIZE);
      if (
        collisions.hitLeft ||
        collisions.hitRight ||
        !this.levelManager.isSolidAt(frontColumn, footRow)
      ) {
        enemy.direction = enemy.direction === 1 ? -1 : 1;
      }
    }
  }

  private handleTileInteractions() {
    let touchedHazard = false;
    let reachedFlag = false;
    let collectedChip = false;
    let collectedCore = false;

    forEachOverlappingTile(this.player, (column, row) => {
      const tile = this.levelManager.getTile(column, row);
      if (tile === TileType.Hazard) touchedHazard = true;
      if (tile === TileType.EndFlag) reachedFlag = true;
      if (tile === TileType.DataChip) {
        this.levelManager.setTile(column, row, TileType.Empty);
        collectedChip = true;
      }
      if (tile === TileType.RedlineCore) {
        this.levelManager.setTile(column, row, TileType.Empty);
        collectedCore = true;
      }
    });

    if (touchedHazard) this.damagePlayer();
    if (collectedChip) {
      this.chips += 1;
      this.sound.chip();
      this.emitBurst(
        this.player.x + this.player.width / 2,
        this.player.y + 8,
        "#ffd84d",
        8,
      );
    }
    if (collectedCore) {
      this.levelManager.worldState.redlineUnlocked = true;
      this.statusLine = "REDLINE KERNEL INSTALLED // F TO FIRE";
      this.sound.terminal();
      this.emitBurst(
        this.player.x + this.player.width / 2,
        this.player.y,
        "#ff425f",
        30,
      );
    }
    if (reachedFlag && !this.hasLivingBoss()) {
      this.closeHackerMode();
      this.levelManager.beginTransition();
      this.sound.transition();
    } else if (reachedFlag && this.hasLivingBoss()) {
      this.statusLine = "EXIT LOCKED // TERMINATE ROOT GUARD";
    }

    const terminal = this.getNearbyTerminal();
    if (terminal && !this.hackerMode) {
      this.statusLine = "TERMINAL IN RANGE // E TO OVERRIDE";
    }
  }

  private handleEnemyInteractions() {
    for (const enemy of this.enemies) {
      if (enemy.dead || !overlaps(this.player, enemy)) continue;
      const stomped =
        this.player.velocity.y > 80 &&
        this.player.previousBottom <= enemy.y + 14;

      if (stomped) {
        enemy.health -= 1;
        this.player.velocity.y = -370;
        this.sound.stomp();
        this.emitBurst(
          enemy.x + enemy.width / 2,
          enemy.y,
          "#a7f35b",
          10,
        );
        if (enemy.health <= 0) enemy.dead = true;
      } else {
        this.damagePlayer();
      }
    }
  }

  private fireLaser() {
    if (
      !this.levelManager.worldState.redlineUnlocked ||
      this.laserCooldown > 0 ||
      this.hackerMode
    ) {
      return;
    }

    const direction = this.player.facing;
    const originX =
      this.player.x + (direction > 0 ? this.player.width : 0);
    const originY = this.player.y + 16;
    const maxDistance = 560;
    let farthestHit = originX + direction * maxDistance;
    let hitCount = 0;

    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const enemyCenterX = enemy.x + enemy.width / 2;
      const enemyCenterY = enemy.y + enemy.height / 2;
      const distance = (enemyCenterX - originX) * direction;
      if (
        distance <= 0 ||
        distance > maxDistance ||
        Math.abs(enemyCenterY - originY) > 105
      ) {
        continue;
      }

      enemy.health -= 1;
      hitCount += 1;
      farthestHit =
        direction > 0
          ? Math.max(farthestHit, enemyCenterX)
          : Math.min(farthestHit, enemyCenterX);
      if (enemy.health <= 0) enemy.dead = true;
      this.emitBurst(
        enemyCenterX,
        enemyCenterY,
        enemy.kind === "boss" ? "#ffd84d" : "#ff425f",
        enemy.kind === "boss" ? 26 : 14,
      );
    }

    this.laserTimer = 0.2;
    this.laserCooldown = 0.42;
    this.laserEndX =
      hitCount > 0 ? farthestHit + direction * 34 : farthestHit;
    this.screenShake = 1;
    this.statusLine =
      hitCount > 0
        ? `REDLINE PIERCE // ${hitCount} TARGET${hitCount === 1 ? "" : "S"}`
        : "REDLINE CLEAR";
    this.sound.laser();
    this.emitUiState(true);
  }

  private damagePlayer() {
    if (this.player.invincibleTimer > 0) return;
    this.health -= 1;
    this.sound.hit();
    this.screenShake = 1.4;
    this.emitBurst(
      this.player.x + this.player.width / 2,
      this.player.y + this.player.height / 2,
      "#ff425f",
      20,
    );

    if (this.health <= 0) {
      this.health = 3;
      this.levelManager.restartLevel();
      this.loadCurrentLevel();
      this.statusLine = "PROCESS RESTORED // CHECKPOINT RELOADED";
      return;
    }

    const spawn = this.levelManager.getPlayerSpawn();
    this.player.spawn(spawn.x, spawn.y);
    this.player.invincibleTimer = 1.2;
    this.camera.snapTo(
      this.player.x,
      this.player.y,
      this.levelManager.width,
      this.levelManager.height,
    );
    this.statusLine = "ROLLBACK COMPLETE";
  }

  private getNearbyTerminal() {
    const centerColumn = Math.floor(
      (this.player.x + this.player.width / 2) / TILE_SIZE,
    );
    const centerRow = Math.floor(
      (this.player.y + this.player.height / 2) / TILE_SIZE,
    );
    for (let row = centerRow - 2; row <= centerRow + 2; row += 1) {
      for (
        let column = centerColumn - 2;
        column <= centerColumn + 2;
        column += 1
      ) {
        if (
          this.levelManager.getTile(column, row) === TileType.HackTerminal
        ) {
          return { column, row };
        }
      }
    }
    return null;
  }

  private openHackerMode(
    terminal: { column: number; row: number } | null,
  ) {
    this.hackerMode = true;
    toggleHackerMode(true);

    const levelIndex = this.levelManager.worldState.currentLevelIndex;
    const terminalSolved =
      this.levelManager.worldState.solvedTerminals.includes(levelIndex);
    if (terminal && !terminalSolved) {
      const state = this.levelManager.worldState;
      const pivotIndex = Math.floor((state.traceLow + state.traceHigh) / 2);
      const pivot = TRACE_VALUES[pivotIndex];
      this.tracePrompt = {
        values: TRACE_VALUES.slice(state.traceLow, state.traceHigh + 1),
        target: TRACE_TARGET,
        pivot,
        expected:
          pivot < TRACE_TARGET
            ? "higher"
            : pivot > TRACE_TARGET
              ? "lower"
              : "lock",
        rejected: null,
      };
      this.statusLine = "BINARY TRACE ATTACHED";
      this.sound.terminal();
    } else {
      this.tracePrompt = null;
      this.statusLine = "PHYSICS BUS LIVE // TIME SCALE 20%";
    }
    this.emitUiState(true);
  }

  private hasLivingBoss() {
    return this.enemies.some(
      (enemy) => enemy.kind === "boss" && !enemy.dead,
    );
  }

  private emitBurst(
    x: number,
    y: number,
    color: string,
    count: number,
  ) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.4;
      const speed = 70 + Math.random() * 210;
      this.particles.push({
        x,
        y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed - 60,
        life: 0.45 + Math.random() * 0.45,
        color,
        size: 2 + Math.random() * 5,
      });
    }
  }

  private updateParticles(deltaTime: number) {
    for (const particle of this.particles) {
      particle.life -= deltaTime;
      particle.velocityY += 520 * deltaTime;
      particle.x += particle.velocityX * deltaTime;
      particle.y += particle.velocityY * deltaTime;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  private syncCanvasSize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.round(rect.width));
    const height = Math.max(360, Math.round(rect.height));
    const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
    const targetWidth = Math.round(width * pixelRatio);
    const targetHeight = Math.round(height * pixelRatio);

    if (
      this.canvas.width !== targetWidth ||
      this.canvas.height !== targetHeight
    ) {
      this.canvas.width = targetWidth;
      this.canvas.height = targetHeight;
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.camera.resize(width, height);
    }
    this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  private render(elapsed: number) {
    const context = this.context;
    const theme = this.levelManager.level.theme;
    const gradient = context.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, theme.skyTop);
    gradient.addColorStop(1, theme.skyBottom);
    context.fillStyle = gradient;
    context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    this.drawBackground(elapsed);

    context.save();
    const shakeX = this.screenShake > 0 ? (Math.random() - 0.5) * 8 : 0;
    const shakeY = this.screenShake > 0 ? (Math.random() - 0.5) * 5 : 0;
    context.translate(
      -Math.round(this.camera.x) + shakeX,
      -Math.round(this.camera.y) + shakeY,
    );

    this.drawTiles(elapsed);
    this.drawEnemies(elapsed);
    this.drawPlayer(elapsed);
    this.drawLaser();
    this.drawParticles();
    context.restore();

    if (this.hackerMode) {
      context.fillStyle = "rgba(8, 13, 26, 0.15)";
      context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }

    const alpha = this.levelManager.transitionAlpha;
    if (alpha > 0) {
      context.fillStyle = `rgba(7, 10, 24, ${alpha})`;
      context.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
    }
  }

  private drawBackground(elapsed: number) {
    const context = this.context;
    const theme = this.levelManager.level.theme;
    const parallaxX = this.camera.x * 0.18;

    context.save();
    context.globalAlpha = 0.14;
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1;
    const gridSize = 52;
    for (
      let x = -(parallaxX % gridSize);
      x < this.canvasWidth;
      x += gridSize
    ) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, this.canvasHeight);
      context.stroke();
    }
    for (let y = 0; y < this.canvasHeight; y += gridSize) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(this.canvasWidth, y);
      context.stroke();
    }
    context.restore();

    context.fillStyle = theme.skyline;
    context.globalAlpha = 0.32;
    const baseY = this.canvasHeight * 0.72;
    for (let index = -1; index < 18; index += 1) {
      const width = 54 + ((index * 17) % 38);
      const height = 80 + ((index * 37) % 150);
      const x =
        index * 88 - ((this.camera.x * 0.28) % 88) +
        Math.sin(elapsed + index) * 2;
      context.fillRect(x, baseY - height, width, height);
      context.fillStyle = theme.accent;
      context.globalAlpha = 0.22;
      for (let row = 0; row < 3; row += 1) {
        context.fillRect(x + 12, baseY - height + 18 + row * 22, 8, 8);
      }
      context.fillStyle = theme.skyline;
      context.globalAlpha = 0.32;
    }
    context.globalAlpha = 1;
  }

  private drawTiles(elapsed: number) {
    const context = this.context;
    const theme = this.levelManager.level.theme;
    const firstColumn = Math.max(
      0,
      Math.floor(this.camera.x / TILE_SIZE) - 1,
    );
    const lastColumn = Math.min(
      Math.ceil((this.camera.x + this.canvasWidth) / TILE_SIZE) + 1,
      Math.floor(this.levelManager.width / TILE_SIZE),
    );
    const firstRow = Math.max(0, Math.floor(this.camera.y / TILE_SIZE) - 1);
    const lastRow = Math.min(
      Math.ceil((this.camera.y + this.canvasHeight) / TILE_SIZE) + 1,
      Math.floor(this.levelManager.height / TILE_SIZE),
    );

    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let column = firstColumn; column <= lastColumn; column += 1) {
        const tile = this.levelManager.getTile(column, row);
        if (tile === TileType.Empty) continue;
        const x = column * TILE_SIZE;
        const y = row * TILE_SIZE;

        if (tile === TileType.Solid || tile === TileType.Secret) {
          context.fillStyle =
            tile === TileType.Secret ? "#25234a" : theme.tile;
          context.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          context.strokeStyle =
            tile === TileType.Secret ? "#7b70ad" : theme.tileEdge;
          context.lineWidth = 2;
          context.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          context.globalAlpha = 0.25;
          context.fillStyle = theme.tileEdge;
          context.fillRect(x + 7, y + 9, 5, 5);
          context.fillRect(x + 28, y + 29, 8, 4);
          context.globalAlpha = 1;
        }

        if (tile === TileType.Hazard) {
          context.fillStyle = "#ff425f";
          context.beginPath();
          context.moveTo(x, y + TILE_SIZE);
          context.lineTo(x + TILE_SIZE / 2, y + 5);
          context.lineTo(x + TILE_SIZE, y + TILE_SIZE);
          context.closePath();
          context.fill();
          context.strokeStyle = "#11162d";
          context.lineWidth = 3;
          context.stroke();
        }

        if (tile === TileType.Firewall) {
          const pulse = 0.55 + Math.sin(elapsed * 8) * 0.18;
          context.fillStyle = `rgba(255, 66, 95, ${pulse})`;
          context.fillRect(x + 8, y, TILE_SIZE - 16, TILE_SIZE);
          context.fillStyle = "#fff";
          context.globalAlpha = 0.8;
          for (let line = 0; line < 4; line += 1) {
            context.fillRect(x + 12, y + line * 13 + 5, TILE_SIZE - 24, 3);
          }
          context.globalAlpha = 1;
        }

        if (tile === TileType.DataChip) this.drawChip(x, y, elapsed);
        if (tile === TileType.RedlineCore) this.drawCore(x, y, elapsed);
        if (tile === TileType.HackTerminal) this.drawTerminal(x, y, elapsed);
        if (tile === TileType.EndFlag) this.drawFlag(x, y, elapsed);
      }
    }
  }

  private drawChip(x: number, y: number, elapsed: number) {
    const context = this.context;
    const bob = Math.sin(elapsed * 5 + x * 0.01) * 5;
    context.save();
    context.translate(x + 24, y + 22 + bob);
    context.rotate(elapsed * 1.8);
    context.fillStyle = "#ffd84d";
    context.strokeStyle = "#11162d";
    context.lineWidth = 3;
    context.fillRect(-10, -10, 20, 20);
    context.strokeRect(-10, -10, 20, 20);
    context.fillStyle = "#11162d";
    context.fillRect(-3, -3, 6, 6);
    context.restore();
  }

  private drawCore(x: number, y: number, elapsed: number) {
    const context = this.context;
    const pulse = 1 + Math.sin(elapsed * 8) * 0.12;
    context.save();
    context.translate(x + 24, y + 22);
    context.scale(pulse, pulse);
    context.shadowColor = "#ff284f";
    context.shadowBlur = 22;
    context.fillStyle = "#ff425f";
    context.beginPath();
    context.moveTo(0, -17);
    context.lineTo(15, -5);
    context.lineTo(10, 15);
    context.lineTo(-10, 15);
    context.lineTo(-15, -5);
    context.closePath();
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = "#fff";
    context.fillRect(-3, -9, 6, 18);
    context.restore();
  }

  private drawTerminal(x: number, y: number, elapsed: number) {
    const context = this.context;
    context.fillStyle = "#11162d";
    context.strokeStyle = "#67e8f9";
    context.lineWidth = 3;
    context.fillRect(x + 4, y + 5, 40, 42);
    context.strokeRect(x + 4, y + 5, 40, 42);
    context.fillStyle = "#071927";
    context.fillRect(x + 10, y + 11, 28, 18);
    context.fillStyle = "#a7f35b";
    context.globalAlpha = 0.65 + Math.sin(elapsed * 7) * 0.25;
    context.fillRect(x + 14, y + 16, 19, 3);
    context.fillRect(x + 14, y + 22, 12, 3);
    context.globalAlpha = 1;
    context.fillStyle = "#ffd84d";
    context.fillRect(x + 20, y + 35, 8, 6);
  }

  private drawFlag(x: number, y: number, elapsed: number) {
    const context = this.context;
    context.fillStyle = "#f6f5e9";
    context.fillRect(x + 21, y - 92, 5, 140);
    context.fillStyle = this.levelManager.level.theme.accent;
    context.beginPath();
    context.moveTo(x + 26, y - 88);
    context.lineTo(x + 72 + Math.sin(elapsed * 4) * 4, y - 70);
    context.lineTo(x + 26, y - 50);
    context.closePath();
    context.fill();
    context.strokeStyle = "#11162d";
    context.lineWidth = 3;
    context.stroke();
    context.fillStyle = "#11162d";
    context.font = "900 12px monospace";
    context.fillText("EXIT", x + 34, y - 67);
  }

  private drawEnemies(elapsed: number) {
    const context = this.context;
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      if (enemy.kind === "boss") {
        this.drawBoss(enemy, elapsed);
        continue;
      }

      const bounce = Math.sin(elapsed * 8 + enemy.phase) * 2;
      context.save();
      context.translate(enemy.x, enemy.y + bounce);
      context.fillStyle = "#ff5f72";
      context.strokeStyle = "#11162d";
      context.lineWidth = 3;
      context.beginPath();
      context.roundRect(0, 5, enemy.width, enemy.height - 5, 8);
      context.fill();
      context.stroke();
      context.fillStyle = "#fff";
      context.fillRect(8, 13, 7, 8);
      context.fillRect(23, 13, 7, 8);
      context.fillStyle = "#11162d";
      context.fillRect(10, 15, 3, 4);
      context.fillRect(25, 15, 3, 4);
      context.beginPath();
      context.moveTo(7, 5);
      context.lineTo(3, -2);
      context.moveTo(30, 5);
      context.lineTo(35, -2);
      context.stroke();
      context.restore();
    }
  }

  private drawBoss(enemy: Enemy, elapsed: number) {
    const context = this.context;
    const hover = Math.sin(elapsed * 3 + enemy.phase) * 7;
    context.save();
    context.translate(enemy.x, enemy.y + hover);
    context.shadowColor = "#ff425f";
    context.shadowBlur = 18;
    context.fillStyle = "#6f56e8";
    context.strokeStyle = "#11162d";
    context.lineWidth = 5;
    context.beginPath();
    context.roundRect(0, 10, enemy.width, enemy.height - 10, 20);
    context.fill();
    context.stroke();
    context.shadowBlur = 0;
    context.fillStyle = "#ffd84d";
    context.beginPath();
    context.moveTo(12, 11);
    context.lineTo(19, -8);
    context.lineTo(31, 10);
    context.lineTo(42, -12);
    context.lineTo(57, 10);
    context.lineTo(67, -6);
    context.lineTo(72, 13);
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = "#fff";
    context.fillRect(16, 29, 14, 12);
    context.fillRect(48, 29, 14, 12);
    context.fillStyle = "#ff425f";
    context.fillRect(20, 32, 7, 6);
    context.fillRect(52, 32, 7, 6);
    context.fillStyle = "#11162d";
    context.fillRect(24, 52, 29, 5);

    context.fillStyle = "rgba(17,22,45,0.72)";
    context.fillRect(4, -22, enemy.width - 8, 8);
    context.fillStyle = "#ff425f";
    context.fillRect(
      4,
      -22,
      (enemy.width - 8) * Math.max(0, enemy.health / 4),
      8,
    );
    context.restore();
  }

  private drawPlayer(elapsed: number) {
    const context = this.context;
    const player = this.player;
    const running = Math.abs(player.velocity.x) > 25 && player.grounded;
    const stride = running ? Math.sin(elapsed * 18) * 6 : 0;
    const flicker =
      player.invincibleTimer > 0 &&
      Math.floor(player.invincibleTimer * 14) % 2 === 0;
    if (flicker) return;

    context.save();
    context.translate(
      player.x + player.width / 2,
      player.y + player.height / 2,
    );
    context.scale(player.facing, 1);

    context.strokeStyle = "#11162d";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(-5, 13);
    context.lineTo(-8 + stride, 24);
    context.moveTo(5, 13);
    context.lineTo(8 - stride, 24);
    context.stroke();

    context.fillStyle = "#4d46bd";
    context.beginPath();
    context.roundRect(-14, -5, 28, 24, 7);
    context.fill();
    context.stroke();
    context.fillStyle = "#ff425f";
    context.fillRect(-13, 2, 26, 5);
    context.fillStyle = "#ffd84d";
    context.beginPath();
    context.arc(0, 7, 6, 0, Math.PI * 2);
    context.fill();
    context.stroke();

    context.fillStyle = "#9d5d47";
    context.beginPath();
    context.roundRect(-11, -21, 22, 19, 7);
    context.fill();
    context.stroke();
    context.fillStyle = "#17162f";
    context.beginPath();
    context.arc(-5, -22, 9, Math.PI, Math.PI * 2);
    context.arc(4, -22, 10, Math.PI, Math.PI * 2);
    context.fill();
    context.fillStyle = "#fff";
    context.fillRect(2, -15, 4, 3);
    context.fillStyle = "#11162d";
    context.fillRect(4, -15, 2, 3);

    context.strokeStyle = "#11162d";
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(-13, 1);
    context.lineTo(-20, 7 - stride * 0.4);
    context.moveTo(13, 1);
    context.lineTo(21, 4 + stride * 0.4);
    context.stroke();
    context.fillStyle = "#ff425f";
    context.fillRect(17, 0, 15, 6);

    if (this.levelManager.worldState.redlineUnlocked) {
      context.fillStyle = "#ff244e";
      context.shadowColor = "#ff244e";
      context.shadowBlur = 10;
      context.fillRect(7, -15, 5, 4);
      context.shadowBlur = 0;
    }
    context.restore();
  }

  private drawLaser() {
    if (this.laserTimer <= 0) return;
    const context = this.context;
    const originX =
      this.player.x +
      (this.player.facing > 0 ? this.player.width + 8 : -8);
    const originY = this.player.y + 15;
    const width = this.laserEndX - originX;
    context.save();
    context.globalCompositeOperation = "lighter";
    context.shadowColor = "#ff153d";
    context.shadowBlur = 26;
    context.strokeStyle = "rgba(255, 27, 66, 0.55)";
    context.lineWidth = 16;
    context.beginPath();
    context.moveTo(originX, originY);
    context.lineTo(originX + width, originY);
    context.stroke();
    context.strokeStyle = "#fff";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(originX, originY);
    context.lineTo(originX + width, originY);
    context.stroke();
    context.restore();
  }

  private drawParticles() {
    const context = this.context;
    for (const particle of this.particles) {
      context.globalAlpha = Math.max(0, Math.min(1, particle.life * 1.8));
      context.fillStyle = particle.color;
      context.fillRect(
        particle.x,
        particle.y,
        particle.size,
        particle.size,
      );
    }
    context.globalAlpha = 1;
  }

  private emitUiState(force = false) {
    if (!force && this.uiTimer > 0) return;
    const level = this.levelManager.level;
    this.options.onUiState({
      levelIndex: this.levelManager.worldState.currentLevelIndex,
      levelCount: this.levelManager.levels.length,
      sector: level.sector,
      levelName: level.name,
      health: this.health,
      chips: this.chips,
      redlineUnlocked: this.levelManager.worldState.redlineUnlocked,
      laserReady: this.laserCooldown <= 0,
      hackerMode: this.hackerMode,
      transitionAlpha: this.levelManager.transitionAlpha,
      tracePrompt: this.tracePrompt,
      algorithmBrief: this.getAlgorithmBrief(),
      status: this.campaignComplete ? "complete" : "playing",
      statusLine: this.statusLine,
      physics: {
        maxRunSpeed: physicsParams.maxRunSpeed,
        jumpForce: physicsParams.jumpForce,
        gravity: physicsParams.gravity,
        friction: physicsParams.friction,
      },
    });
  }

  private getAlgorithmBrief(): AlgorithmBrief {
    if (!this.tracePrompt) return BINARY_SEARCH_BRIEF;
    return {
      title: "Binary Search Terminal",
      rule: "Read the pivot. If the target is larger, keep the higher half. If it is smaller, keep the lower half.",
      detail: `Active window: [${this.tracePrompt.values.join(", ")}]. Pivot ${this.tracePrompt.pivot}, target ${this.tracePrompt.target}.`,
    };
  }
}
