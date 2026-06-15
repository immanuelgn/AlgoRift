import type {
  PhysicsParameters,
  TunablePhysicsKey,
} from "@/game/types";

export const TILE_SIZE = 48;
export const FIXED_TIME_STEP = 1 / 120;

export const defaultPhysicsParams: PhysicsParameters = {
  maxRunSpeed: 330,
  groundAcceleration: 2_250,
  airAcceleration: 1_420,
  friction: 2_650,
  jumpForce: 610,
  jumpHoldForce: 1_450,
  maxJumpHoldTime: 0.17,
  gravity: 1_720,
  lowJumpGravity: 2_300,
  fallGravity: 2_760,
  maxFallSpeed: 920,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,
};

// This object is intentionally mutable. The player reads it every simulation
// step, so tuning controls take effect without rebuilding the engine.
export const physicsParams: PhysicsParameters = {
  ...defaultPhysicsParams,
};

export let timeScale = 1;

const hackerModeListeners = new Set<(active: boolean) => void>();

export function toggleHackerMode(active: boolean) {
  timeScale = active ? 0.2 : 1;
  hackerModeListeners.forEach((listener) => listener(active));
}

export function subscribeToHackerMode(
  listener: (active: boolean) => void,
) {
  hackerModeListeners.add(listener);
  return () => hackerModeListeners.delete(listener);
}

export function setPhysicsParameter(
  key: TunablePhysicsKey,
  value: number,
) {
  physicsParams[key] = value;
}

export function resetPhysicsParameters() {
  Object.assign(physicsParams, defaultPhysicsParams);
}
