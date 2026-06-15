export type Vector2 = {
  x: number;
  y: number;
};

export const TileType = {
  Empty: 0,
  Solid: 1,
  Hazard: 2,
  EndFlag: 3,
  DataChip: 4,
  Secret: 5,
  EnemySpawn: 6,
  HackTerminal: 7,
  RedlineCore: 8,
  Firewall: 9,
  PlayerSpawn: 10,
  BossSpawn: 11,
} as const;

export type TileTypeValue = (typeof TileType)[keyof typeof TileType];

export type LevelTheme = {
  skyTop: string;
  skyBottom: string;
  skyline: string;
  tile: string;
  tileEdge: string;
  accent: string;
};

export type LevelDefinition = {
  id: string;
  name: string;
  sector: string;
  tiles: number[][];
  theme: LevelTheme;
};

export type PhysicsParameters = {
  maxRunSpeed: number;
  groundAcceleration: number;
  airAcceleration: number;
  friction: number;
  jumpForce: number;
  jumpHoldForce: number;
  maxJumpHoldTime: number;
  gravity: number;
  lowJumpGravity: number;
  fallGravity: number;
  maxFallSpeed: number;
  coyoteTime: number;
  jumpBufferTime: number;
};

export type TunablePhysicsKey =
  | "maxRunSpeed"
  | "jumpForce"
  | "gravity"
  | "friction";

export type InputAction =
  | "left"
  | "right"
  | "jump"
  | "fire"
  | "hack";

export type TraceDirection = "lower" | "lock" | "higher";

export type TracePrompt = {
  values: number[];
  target: number;
  pivot: number;
  expected: TraceDirection;
  rejected: TraceDirection | null;
};

export type AlgorithmBrief = {
  title: string;
  rule: string;
  detail: string;
};

export type GameUiState = {
  levelIndex: number;
  levelCount: number;
  sector: string;
  levelName: string;
  health: number;
  chips: number;
  redlineUnlocked: boolean;
  laserReady: boolean;
  hackerMode: boolean;
  transitionAlpha: number;
  tracePrompt: TracePrompt | null;
  algorithmBrief: AlgorithmBrief;
  status: "playing" | "complete";
  statusLine: string;
  physics: Pick<
    PhysicsParameters,
    "maxRunSpeed" | "jumpForce" | "gravity" | "friction"
  >;
};

export type CompletionPayload = {
  completedLevel: number;
  xp: number;
  redlineVisionUnlocked: boolean;
};
