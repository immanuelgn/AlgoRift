"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Code2,
  Compass,
  Crosshair,
  Cloud,
  CloudOff,
  Eye,
  EyeOff,
  Flame,
  Github,
  Heart,
  Home,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Map,
  Play,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase";

type View = "home" | "lesson" | "battle" | "world";

type PlayerProgress = {
  completedLevel: number;
  xp: number;
  redlineVisionUnlocked: boolean;
};

type BattleState = {
  low: number;
  high: number;
  hearts: number;
  correctShots: number;
  status: "playing" | "won" | "lost";
};

const STORAGE_KEY = "algorift-progress-v2";
const VALUES = [3, 8, 12, 17, 23, 31, 42];
const TARGET = 42;
const GATE_POSITIONS = [36, 88, 88];
const COURSE_OBSTACLES = [
  { position: 14, type: "bug" },
  { position: 23, type: "bug" },
  { position: 29, type: "pipe" },
  { position: 46, type: "bug" },
  { position: 54, type: "pipe" },
  { position: 62, type: "bug" },
  { position: 70, type: "bug" },
  { position: 78, type: "pipe" },
] as const;
const DATA_COIN_POSITIONS = [9, 17.5, 21, 27, 32.5, 43, 49, 57, 65, 73, 80.5, 84];
const POWER_UP_POSITION = 67;
const DEFAULT_PROGRESS: PlayerProgress = {
  completedLevel: 0,
  xp: 0,
  redlineVisionUnlocked: false,
};
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

function getFriendlyAuthError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Authentication failed. Please try again.";
  const normalized = message.toLowerCase();

  if (normalized.includes("email address not authorized")) {
    return "Cloud signup is temporarily unavailable while secure public email delivery is being connected. Guest saves still work on this device.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many requests")) {
    return "Too many account requests were made recently. Wait a few minutes, then try again.";
  }

  return message;
}

const lessonSlides = [
  {
    number: "01",
    eyebrow: "Rule 1: sort first",
    title: "Put values in order.",
    copy:
      "Binary search works only when values go from smallest to largest. Order tells us which direction to search next.",
    visual: "sorted",
    note: "Simple idea: sorted values give us a useful left and right.",
    plain: "Array = a list of values. Position = where a value sits in that list.",
  },
  {
    number: "02",
    eyebrow: "Rule 2: check the middle",
    title: "Start in the center.",
    copy:
      "Look at the middle position first. This single check tells us which half can still contain the target.",
    visual: "midpoint",
    note: "Middle position = floor((first position + last position) / 2).",
    plain: "floor means round down. For positions 0 to 6, the middle is position 3.",
  },
  {
    number: "03",
    eyebrow: "Rule 3: choose a side",
    title: "Keep only the possible half.",
    copy:
      "Middle value too small? Search right. Too large? Search left. Repeat with the smaller group.",
    visual: "discard",
    note: "Every correct choice removes about half of the remaining values.",
    plain: "Discard means ignore values that can no longer be the answer.",
  },
];

const worlds = [
  {
    level: 1,
    title: "Binary Blaster",
    realm: "Search Plains",
    topics: "Arrays · Indexes · Binary Search",
    color: "sun",
    description: "Aim at the midpoint and cut the search space in half.",
  },
  {
    level: 2,
    title: "Sort Sprint",
    realm: "Sort Summit",
    topics: "Bubble · Merge · Quick Sort",
    color: "sky",
    description: "Race disorder by swapping, splitting, and merging.",
  },
  {
    level: 3,
    title: "Stack Tower",
    realm: "Memory Mines",
    topics: "Stacks · Queues · Hash Maps",
    color: "mint",
    description: "Build with LIFO, defend with FIFO, and unlock instant lookup.",
  },
  {
    level: 4,
    title: "Tree Climber",
    realm: "Tree Canopy",
    topics: "Trees · BST · Traversal",
    color: "leaf",
    description: "Climb branches using structure, order, and recursion.",
  },
  {
    level: 5,
    title: "Weighted Warden",
    realm: "Graph Citadel",
    topics: "BFS · DFS · Dijkstra",
    color: "violet",
    description: "Navigate networks and defeat the shortest-path boss.",
  },
  {
    level: 6,
    title: "Choice Bandit",
    realm: "Greedy Dunes",
    topics: "Greedy · Intervals",
    color: "gold",
    description: "Make the strongest local move without losing the mission.",
  },
  {
    level: 7,
    title: "Echo Forge",
    realm: "Dynamic Forge",
    topics: "Dynamic Programming",
    color: "rose",
    description: "Store past answers and craft solutions from smaller wins.",
  },
];

function getInitialBattle(): BattleState {
  return {
    low: 0,
    high: VALUES.length - 1,
    hearts: 3,
    correctShots: 0,
    status: "playing",
  };
}

function normalizeProgress(value: Partial<PlayerProgress> | null | undefined) {
  return {
    completedLevel: Math.max(
      0,
      Math.min(7, Number(value?.completedLevel) || 0),
    ),
    xp: Math.max(0, Math.min(1_000_000, Number(value?.xp) || 0)),
    redlineVisionUnlocked: Boolean(value?.redlineVisionUnlocked),
  };
}

function playTone(enabled: boolean, frequency: number, duration = 0.12) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "square";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.05, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    context.currentTime + duration,
  );
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  oscillator.addEventListener("ended", () => void context.close());
}

function playHeatVisionSound(enabled: boolean) {
  if (!enabled || typeof window === "undefined") return;
  const AudioContextClass =
    window.AudioContext ||
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const now = context.currentTime;
  const master = context.createGain();
  const compressor = context.createDynamicsCompressor();
  const filter = context.createBiquadFilter();
  const rumble = context.createOscillator();
  const beam = context.createOscillator();
  const harmonic = context.createOscillator();

  master.gain.setValueAtTime(0.0001, now);
  master.gain.exponentialRampToValueAtTime(0.15, now + 0.08);
  master.gain.setValueAtTime(0.15, now + 0.72);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 1.05);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(4300, now + 0.28);
  filter.Q.value = 7;

  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;

  rumble.type = "sawtooth";
  rumble.frequency.setValueAtTime(48, now);
  rumble.frequency.exponentialRampToValueAtTime(72, now + 0.4);

  beam.type = "sawtooth";
  beam.frequency.setValueAtTime(150, now);
  beam.frequency.exponentialRampToValueAtTime(720, now + 0.24);
  beam.frequency.setValueAtTime(690, now + 0.75);

  harmonic.type = "triangle";
  harmonic.frequency.setValueAtTime(310, now);
  harmonic.frequency.exponentialRampToValueAtTime(1380, now + 0.26);

  const noiseBuffer = context.createBuffer(
    1,
    Math.floor(context.sampleRate * 1.05),
    context.sampleRate,
  );
  const noiseData = noiseBuffer.getChannelData(0);
  for (let index = 0; index < noiseData.length; index += 1) {
    noiseData[index] = (Math.random() * 2 - 1) * (1 - index / noiseData.length);
  }
  const noise = context.createBufferSource();
  const noiseGain = context.createGain();
  const noiseFilter = context.createBiquadFilter();
  noise.buffer = noiseBuffer;
  noiseGain.gain.setValueAtTime(0.035, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.02);
  noiseFilter.type = "bandpass";
  noiseFilter.frequency.value = 2200;
  noiseFilter.Q.value = 1.8;

  rumble.connect(filter);
  beam.connect(filter);
  harmonic.connect(filter);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(compressor);
  filter.connect(compressor);
  compressor.connect(master);
  master.connect(context.destination);

  rumble.start(now);
  beam.start(now);
  harmonic.start(now);
  noise.start(now);
  rumble.stop(now + 1.05);
  beam.stop(now + 1.05);
  harmonic.stop(now + 1.05);
  noise.stop(now + 1.05);
  beam.addEventListener("ended", () => void context.close());
}

function BrandMark() {
  return (
    <span className="brand-symbol" aria-hidden="true">
      <span className="brand-pixel pixel-a" />
      <span className="brand-pixel pixel-b" />
      <span className="brand-pixel pixel-c" />
      <span className="brand-pixel pixel-d" />
      <span className="brand-core" />
    </span>
  );
}

function PlayerSprite({
  hit = false,
  powered = false,
  firing = false,
}: {
  hit?: boolean;
  powered?: boolean;
  firing?: boolean;
}) {
  return (
    <div
      className={[
        "player-sprite",
        hit ? "sprite-hit" : "",
        powered ? "sprite-powered" : "",
        firing ? "sprite-heat-firing" : "",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="runner-scarf">
        <span />
      </div>
      <div className="runner-hair" />
      <div className="runner-head">
        <span className="runner-ear" />
        <span className="runner-eye runner-eye-left" />
        <span className="runner-eye runner-eye-right" />
        <span className="runner-nose" />
        <span className="runner-smile" />
      </div>
      <div className="runner-torso">
        <span className="runner-emblem">A</span>
      </div>
      <div className="runner-arm runner-arm-left">
        <span className="runner-hand" />
      </div>
      <div className="runner-arm runner-arm-right">
        <span className="runner-hand" />
      </div>
      <div className="runner-leg runner-leg-left">
        <span className="runner-boot" />
      </div>
      <div className="runner-leg runner-leg-right">
        <span className="runner-boot" />
      </div>
    </div>
  );
}

function BossSprite({
  health,
  hit,
  attacking,
}: {
  health: number;
  hit: boolean;
  attacking: boolean;
}) {
  return (
    <div
      className={[
        "boss-sprite",
        hit ? "boss-hit" : "",
        attacking ? "boss-attacking" : "",
        health <= 0 ? "boss-defeated" : "",
      ].join(" ")}
      aria-hidden="true"
    >
      <div className="boss-crown">
        <span />
        <span />
        <span />
      </div>
      <div className="boss-horn boss-horn-left" />
      <div className="boss-horn boss-horn-right" />
      <div className="boss-face">
        <span className="boss-eye boss-eye-left" />
        <span className="boss-eye boss-eye-right" />
        <span className="boss-mouth" />
      </div>
      <div className="boss-hand boss-hand-left" />
      <div className="boss-hand boss-hand-right" />
      <div className="boss-glitch glitch-one" />
      <div className="boss-glitch glitch-two" />
    </div>
  );
}

function HeartMeter({ hearts }: { hearts: number }) {
  return (
    <div className="heart-meter" aria-label={`${hearts} focus points remaining`}>
      {[0, 1, 2].map((heart) => (
        <Heart
          key={heart}
          size={18}
          fill={heart < hearts ? "currentColor" : "none"}
          className={heart < hearts ? "heart-active" : "heart-empty"}
        />
      ))}
    </div>
  );
}

export function AlgoRift() {
  const [view, setView] = useState<View>("home");
  const [lessonStep, setLessonStep] = useState(0);
  const [progress, setProgress] = useState<PlayerProgress>(DEFAULT_PROGRESS);
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [battle, setBattle] = useState<BattleState>(getInitialBattle);
  const [feedback, setFeedback] = useState(
    "Your mission: find 42. Calculate the midpoint, then choose that value.",
  );
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);
  const [isShooting, setIsShooting] = useState(false);
  const [bossHit, setBossHit] = useState(false);
  const [bossAttacking, setBossAttacking] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [runnerX, setRunnerX] = useState(5);
  const [jumping, setJumping] = useState(false);
  const [runnerMoving, setRunnerMoving] = useState(false);
  const [collectedCoins, setCollectedCoins] = useState<number[]>([]);
  const [clearedObstacles, setClearedObstacles] = useState<number[]>([]);
  const [obstacleBump, setObstacleBump] = useState(false);
  const [atGate, setAtGate] = useState(false);
  const [powerUpCollected, setPowerUpCollected] = useState(false);
  const [powerUpBurst, setPowerUpBurst] = useState(false);
  const [isHeatVisionFiring, setIsHeatVisionFiring] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [authMode, setAuthMode] = useState<
    "signIn" | "signUp" | "forgot" | "recovery"
  >("signIn");
  const [authForm, setAuthForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<
    "local" | "loading" | "saving" | "saved" | "error"
  >(isSupabaseConfigured ? "loading" : "local");
  const pageTop = useRef<HTMLDivElement>(null);
  const progressRef = useRef(progress);
  const jumpingRef = useRef(false);
  const movementTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setProgress(
            normalizeProgress(JSON.parse(saved) as Partial<PlayerProgress>),
          );
        } catch {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;
    progressRef.current = progress;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, ready]);

  useEffect(() => {
    if (!ready) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const client = supabase;

    let active = true;

    async function hydrateAccount(nextUser: User | null) {
      if (!active) return;
      setUser(nextUser);
      setCloudHydrated(false);

      if (!nextUser) {
        setUsername("");
        setCloudStatus("local");
        return;
      }

      setCloudStatus("loading");
      const [profileResult, progressResult] = await Promise.all([
        client
          .from("profiles")
          .select("username")
          .eq("id", nextUser.id)
          .maybeSingle(),
        client
          .from("game_progress")
          .select("completed_level, xp, redline_vision_unlocked")
          .eq("user_id", nextUser.id)
          .maybeSingle(),
      ]);

      if (!active) return;
      if (profileResult.error || progressResult.error) {
        setCloudStatus("error");
        setAuthError(
          "Cloud save is not ready yet. Run the provided Supabase SQL, then try again.",
        );
        return;
      }

      const fallbackUsername =
        typeof nextUser.user_metadata?.username === "string"
          ? nextUser.user_metadata.username
          : nextUser.email?.split("@")[0] || "pathfinder";
      setUsername(profileResult.data?.username || fallbackUsername);

      const localProgress = progressRef.current;
      const cloudProgress = normalizeProgress(
        progressResult.data
          ? {
              completedLevel: progressResult.data.completed_level,
              xp: progressResult.data.xp,
              redlineVisionUnlocked:
                progressResult.data.redline_vision_unlocked,
            }
          : null,
      );
      const mergedProgress = {
        completedLevel: Math.max(
          localProgress.completedLevel,
          cloudProgress.completedLevel,
        ),
        xp: Math.max(localProgress.xp, cloudProgress.xp),
        redlineVisionUnlocked:
          localProgress.redlineVisionUnlocked ||
          cloudProgress.redlineVisionUnlocked,
      };

      const { error: saveError } = await client
        .from("game_progress")
        .upsert(
          {
            user_id: nextUser.id,
            completed_level: mergedProgress.completedLevel,
            xp: mergedProgress.xp,
            redline_vision_unlocked:
              mergedProgress.redlineVisionUnlocked,
          },
          { onConflict: "user_id" },
        );

      if (!active) return;
      if (saveError) {
        setCloudStatus("error");
        return;
      }

      progressRef.current = mergedProgress;
      setProgress(mergedProgress);
      setCloudHydrated(true);
      setCloudStatus("saved");
    }

    void client.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setCloudStatus("error");
        return;
      }
      void hydrateAccount(data.user);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("recovery");
        setAccountOpen(true);
        setAuthMessage("Choose a new password for your account.");
      }
      window.setTimeout(() => {
        void hydrateAccount(session?.user ?? null);
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [ready]);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user || !cloudHydrated) return;

    const timer = window.setTimeout(() => {
      setCloudStatus("saving");
      void supabase
        .from("game_progress")
        .upsert(
          {
            user_id: user.id,
            completed_level: progress.completedLevel,
            xp: progress.xp,
            redline_vision_unlocked: progress.redlineVisionUnlocked,
          },
          { onConflict: "user_id" },
        )
        .then(({ error }) => setCloudStatus(error ? "error" : "saved"));
    }, 500);

    return () => window.clearTimeout(timer);
  }, [cloudHydrated, progress, user]);

  useEffect(() => {
    if (view !== "battle") return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") {
        event.preventDefault();
        moveRunner(1);
      }
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") {
        event.preventDefault();
        moveRunner(-1);
      }
      if (event.key === " " || event.key === "ArrowUp" || event.key.toLowerCase() === "w") {
        event.preventDefault();
        jumpRunner();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const midpoint = Math.floor((battle.low + battle.high) / 2);
  const midpointValue = VALUES[midpoint];
  const bossHealth = Math.max(0, 100 - battle.correctShots * 34);
  const displayLevel = Math.max(1, progress.completedLevel + 1);
  const currentSlide = lessonSlides[lessonStep];
  const currentRound = Math.min(battle.correctShots + 1, 3);
  const midpointEquation = `floor((${battle.low} + ${battle.high}) / 2)`;
  const cameraOffset = Math.max(0, Math.min(64, (runnerX - 18) * 0.9));
  const levelProgress = Math.round(Math.min(100, (runnerX / 88) * 100));
  const coachTitle = !atGate
    ? battle.correctShots === 0
      ? "Run right. The first checkpoint is ahead."
      : "Long run to the boss. Keep your momentum."
    : currentRound === 1
      ? "Let us solve the first one together."
      : currentRound === 2
        ? "Boss phase 1: find the new middle."
        : "Only one possible value remains.";

  const eliminated = useMemo(
    () =>
      VALUES.map((_, index) => index < battle.low || index > battle.high),
    [battle.high, battle.low],
  );

  function changeView(nextView: View) {
    setView(nextView);
    setHintOpen(false);
    window.requestAnimationFrame(() => {
      pageTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function startLesson() {
    setLessonStep(0);
    changeView("lesson");
  }

  function startBattle() {
    setBattle(getInitialBattle());
    setFeedback(
      "Goal: find 42. Run to each checkpoint, check the middle position, and choose its value.",
    );
    setSelectedIndex(null);
    setWrongIndex(null);
    setHintOpen(false);
    setRunnerX(5);
    jumpingRef.current = false;
    setJumping(false);
    setRunnerMoving(false);
    setCollectedCoins([]);
    setClearedObstacles([]);
    setObstacleBump(false);
    setAtGate(false);
    setPowerUpCollected(false);
    setPowerUpBurst(false);
    setIsHeatVisionFiring(false);
    changeView("battle");
  }

  function markRunnerMoving() {
    setRunnerMoving(true);
    if (movementTimerRef.current) {
      window.clearTimeout(movementTimerRef.current);
    }
    movementTimerRef.current = window.setTimeout(() => {
      setRunnerMoving(false);
    }, 180);
  }

  function collectCoinsBetween(current: number, next: number) {
    DATA_COIN_POSITIONS.forEach((position, index) => {
      if (current < position && next >= position - 1) {
        setCollectedCoins((coins) =>
          coins.includes(index) ? coins : [...coins, index],
        );
      }
    });
  }

  function collectPowerUpBetween(current: number, next: number) {
    if (
      battle.correctShots >= 1 &&
      !powerUpCollected &&
      current < POWER_UP_POSITION &&
      next >= POWER_UP_POSITION - 1.5
    ) {
      setPowerUpCollected(true);
      setPowerUpBurst(true);
      setFeedback(
        "Redline Core collected. Your first correct middle choice unlocked it. One more boss decision will fully charge it.",
      );
      playTone(soundOn, 420, 0.08);
      window.setTimeout(() => playTone(soundOn, 680, 0.12), 90);
      window.setTimeout(() => setPowerUpBurst(false), 700);
    }
  }

  function moveRunner(direction: -1 | 1) {
    if (
      battle.status !== "playing" ||
      isShooting ||
      isHeatVisionFiring ||
      bossAttacking ||
      atGate
    ) {
      return;
    }

    markRunnerMoving();
    setRunnerX((current) => {
      if (direction === -1) {
        return Math.max(3, current - 3.5);
      }

      const stage = Math.min(battle.correctShots, GATE_POSITIONS.length - 1);
      const gate = GATE_POSITIONS[stage];
      const next = Math.min(gate, current + 2.8);
      const nextObstacleIndex = COURSE_OBSTACLES.findIndex(
        (obstacle, index) =>
          !clearedObstacles.includes(index) &&
          current < obstacle.position &&
          next >= obstacle.position - 1.2,
      );

      if (nextObstacleIndex >= 0 && !jumpingRef.current) {
        setObstacleBump(true);
        setFeedback(
          "Obstacle ahead. Jump over it or stomp the bug, then keep running right.",
        );
        playTone(soundOn, 135, 0.12);
        window.setTimeout(() => setObstacleBump(false), 320);
        return current;
      }

      collectCoinsBetween(current, next);
      collectPowerUpBetween(current, next);
      if (next >= gate - 0.5) {
        setAtGate(true);
        setFeedback(
          currentRound === 1
            ? `Checkpoint reached. The active positions are ${battle.low} to ${battle.high}. Their middle is position ${midpoint}.`
            : `Checkpoint reached. Find the middle position between ${battle.low} and ${battle.high}.`,
        );
      }
      return next;
    });
  }

  function jumpRunner() {
    if (jumpingRef.current || battle.status !== "playing" || atGate) return;
    jumpingRef.current = true;
    setJumping(true);
    markRunnerMoving();
    playTone(soundOn, 350, 0.1);

    setRunnerX((current) => {
      const stage = Math.min(battle.correctShots, GATE_POSITIONS.length - 1);
      const gate = GATE_POSITIONS[stage];
      const obstacleIndex = COURSE_OBSTACLES.findIndex(
        (obstacle, index) =>
          !clearedObstacles.includes(index) &&
          obstacle.position >= current - 2 &&
          obstacle.position <= current + 13,
      );
      const obstacle =
        obstacleIndex >= 0 ? COURSE_OBSTACLES[obstacleIndex] : null;
      const next = obstacle
        ? Math.min(gate, obstacle.position + 3.8)
        : Math.min(gate, current + 4.2);

      collectCoinsBetween(current, next);
      collectPowerUpBetween(current, next);
      if (obstacle && obstacleIndex >= 0) {
        setClearedObstacles((items) =>
          items.includes(obstacleIndex) ? items : [...items, obstacleIndex],
        );
        setFeedback(
          obstacle.type === "bug"
            ? "Bug stomped. Nice jump. Keep heading right."
            : "Pipe cleared. The boss arena is farther to the right.",
        );
        playTone(soundOn, obstacle.type === "bug" ? 230 : 390, 0.1);
      }
      if (next >= gate - 0.5) {
        setAtGate(true);
        setFeedback(
          currentRound === 1
            ? `Checkpoint reached. Positions ${battle.low} to ${battle.high} have middle position ${midpoint}.`
            : `Checkpoint reached. Find the middle position between ${battle.low} and ${battle.high}.`,
        );
      }
      return next;
    });

    window.setTimeout(() => {
      jumpingRef.current = false;
      setJumping(false);
    }, 720);
  }

  function chooseValue(index: number) {
    if (
      battle.status !== "playing" ||
      isShooting ||
      isHeatVisionFiring ||
      bossAttacking ||
      eliminated[index]
    ) {
      return;
    }

    if (!atGate) {
      setFeedback(
        "Reach the scanner gate first. Move right and jump over the bug block.",
      );
      return;
    }

    setSelectedIndex(index);
    setHintOpen(false);

    if (index !== midpoint) {
      const nextHearts = battle.hearts - 1;
      setWrongIndex(index);
      setBossAttacking(true);
      setPlayerHit(true);
      playTone(soundOn, 110, 0.2);
      setFeedback(
        `Try again: the current positions are ${battle.low} to ${battle.high}. The middle position is ${midpoint}, so choose the value sitting above position ${midpoint}.`,
      );

      window.setTimeout(() => {
        setWrongIndex(null);
        setBossAttacking(false);
        setPlayerHit(false);
      }, 650);

      setBattle((current) => ({
        ...current,
        hearts: nextHearts,
        status: nextHearts === 0 ? "lost" : "playing",
      }));
      return;
    }

    const usesHeatVision = midpointValue === TARGET && powerUpCollected;
    setWrongIndex(null);
    setIsShooting(!usesHeatVision);
    setIsHeatVisionFiring(usesHeatVision);
    if (usesHeatVision) {
      playHeatVisionSound(soundOn);
    } else {
      playTone(soundOn, 620, 0.14);
    }

    window.setTimeout(() => {
      setBossHit(true);
      if (!usesHeatVision) {
        playTone(soundOn, 180, 0.18);
      }

      const nextShots = battle.correctShots + 1;
      if (midpointValue === TARGET) {
        setBattle((current) => ({
          ...current,
          correctShots: nextShots,
          status: "won",
        }));
        setFeedback(
          "Found it. Binary search reached 42 after only three middle checks.",
        );
        setProgress((current) => ({
          completedLevel: Math.max(current.completedLevel, 1),
          xp: Math.max(current.xp, 100),
          redlineVisionUnlocked:
            current.redlineVisionUnlocked || powerUpCollected,
        }));
      } else if (midpointValue < TARGET) {
        const nextLow = midpoint + 1;
        setBattle((current) => ({
          ...current,
          low: nextLow,
          correctShots: nextShots,
        }));
        setFeedback(
          nextShots === 2
            ? `${midpointValue} is too small, so only the value to its right remains. Redline Vision is fully charged. Make the final choice.`
            : `${midpointValue} is too small, so 42 must be to the right. The left side disappears. Checkpoint cleared. Enjoy the long run to the boss.`,
        );
        setAtGate(nextShots >= 2);
      } else {
        const nextHigh = midpoint - 1;
        setBattle((current) => ({
          ...current,
          high: nextHigh,
          correctShots: nextShots,
        }));
        setFeedback(
          `${midpointValue} is too large, so the target must be to the left. The right side disappears. Keep running.`,
        );
        setAtGate(false);
      }

      setSelectedIndex(null);
      setIsShooting(false);
      setIsHeatVisionFiring(false);
      window.setTimeout(() => setBossHit(false), 350);
    }, usesHeatVision ? 920 : 430);
  }

  function resetProgress() {
    const freshProgress = { ...DEFAULT_PROGRESS };
    setProgress(freshProgress);
    progressRef.current = freshProgress;
    window.localStorage.removeItem(STORAGE_KEY);
    setShowResetConfirm(false);
    setBattle(getInitialBattle());
    setView("home");
  }

  function updateAuthField(
    field: "username" | "email" | "password",
    value: string,
  ) {
    setAuthForm((current) => ({ ...current, [field]: value }));
    setAuthError("");
    setAuthMessage("");
  }

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setAuthError(
        "Cloud accounts are not configured yet. Add the Supabase environment variables first.",
      );
      return;
    }

    const email = authForm.email.trim().toLowerCase();
    const usernameValue = authForm.username.trim().toLowerCase();
    setAuthBusy(true);
    setAuthError("");
    setAuthMessage("");

    try {
      if (authMode === "forgot") {
        if (!email) throw new Error("Enter the email address for your account.");
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setAuthMessage(
          "Password reset email sent. Open the secure link in that email.",
        );
        return;
      }

      if (authMode === "recovery") {
        if (!PASSWORD_PATTERN.test(authForm.password)) {
          throw new Error(
            "Use at least 10 characters with at least one letter and one number.",
          );
        }
        const { error } = await supabase.auth.updateUser({
          password: authForm.password,
        });
        if (error) throw error;
        setAuthMessage("Password updated. Your account is secure and ready.");
        setAuthMode("signIn");
        setAuthForm((current) => ({ ...current, password: "" }));
        return;
      }

      if (!email) throw new Error("Enter a valid email address.");
      if (!PASSWORD_PATTERN.test(authForm.password)) {
        throw new Error(
          "Use at least 10 characters with at least one letter and one number.",
        );
      }

      if (authMode === "signUp") {
        if (!USERNAME_PATTERN.test(usernameValue)) {
          throw new Error(
            "Username must be 3–20 lowercase letters, numbers, or underscores.",
          );
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password: authForm.password,
          options: {
            data: { username: usernameValue },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setAuthMessage(
          data.session
            ? "Account created. Your progress is now syncing."
            : "Account created. Check your email to confirm it before signing in.",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: authForm.password,
        });
        if (error) throw error;
        setAuthMessage("Signed in. Cloud progress is syncing now.");
        window.setTimeout(() => setAccountOpen(false), 650);
      }
      setAuthForm((current) => ({ ...current, password: "" }));
    } catch (error) {
      setAuthError(getFriendlyAuthError(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setAuthBusy(true);
    const { error } = await supabase.auth.signOut();
    setAuthBusy(false);
    if (error) {
      setAuthError(error.message);
      return;
    }
    setAccountOpen(false);
    setCloudHydrated(false);
    setCloudStatus("local");
  }

  return (
    <div className="game-app" ref={pageTop}>
      <header className="game-header">
        <button
          type="button"
          className="brand-button"
          onClick={() => changeView("home")}
          aria-label="AlgoRift home"
        >
          <BrandMark />
          <span className="brand-word">ALGO<span>RIFT</span></span>
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={view === "home" ? "active" : ""}
            type="button"
            onClick={() => changeView("home")}
          >
            <Home size={16} />
            Home
          </button>
          <button
            className={view === "world" ? "active" : ""}
            type="button"
            onClick={() => changeView("world")}
          >
            <Map size={16} />
            World
          </button>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className={`account-button ${user ? "signed-in" : ""}`}
            onClick={() => {
              setAccountOpen(true);
              setAuthError("");
              setAuthMessage("");
            }}
            aria-label={user ? `Open account for ${username}` : "Sign in or create account"}
          >
            {user ? <Cloud size={17} /> : <UserRound size={17} />}
            <span>{user ? username || "Account" : "Account"}</span>
          </button>
          <button
            type="button"
            className="sound-button"
            onClick={() => setSoundOn((current) => !current)}
            aria-label={soundOn ? "Mute game sounds" : "Enable game sounds"}
          >
            {soundOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="player-badge">
            <span className="player-level">LV {displayLevel}</span>
            <span className="player-xp">{progress.xp} XP</span>
          </div>
        </div>
      </header>

      {accountOpen && (
        <div
          className="result-overlay account-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="AlgoRift account"
        >
          <section className="account-card">
            <button
              type="button"
              className="account-close"
              onClick={() => setAccountOpen(false)}
              aria-label="Close account"
            >
              ×
            </button>

            {user ? (
              <>
                <div className="account-identity">
                  <span className="account-avatar">
                    <UserRound size={25} />
                  </span>
                  <div>
                    <small>CLOUD PATHFINDER</small>
                    <h2>{username || "Pathfinder"}</h2>
                    <p>{user.email}</p>
                  </div>
                </div>

                <div className={`cloud-save-state state-${cloudStatus}`}>
                  {cloudStatus === "error" ? (
                    <CloudOff size={18} />
                  ) : cloudStatus === "saving" || cloudStatus === "loading" ? (
                    <Cloud size={18} />
                  ) : (
                    <Save size={18} />
                  )}
                  <div>
                    <strong>
                      {cloudStatus === "saving"
                        ? "Saving progress…"
                        : cloudStatus === "loading"
                          ? "Loading cloud save…"
                          : cloudStatus === "error"
                            ? "Cloud sync needs attention"
                            : "Progress saved"}
                    </strong>
                    <span>
                      Level {displayLevel} · {progress.xp} XP · private to this account
                    </span>
                  </div>
                </div>

                <div className="account-security-note">
                  <Shield size={18} />
                  Passwords are handled by Supabase Auth. AlgoRift never stores
                  or displays your password.
                </div>

                <button
                  className="game-secondary account-signout"
                  type="button"
                  onClick={() => void signOut()}
                  disabled={authBusy}
                >
                  <LogOut size={17} /> Sign out
                </button>
              </>
            ) : (
              <>
                <div className="account-heading">
                  <span className="account-avatar">
                    {authMode === "signUp" ? (
                      <Sparkles size={25} />
                    ) : (
                      <KeyRound size={25} />
                    )}
                  </span>
                  <div>
                    <small>OPTIONAL CLOUD SAVE</small>
                    <h2>
                      {authMode === "signUp"
                        ? "Create your Pathfinder"
                        : authMode === "forgot"
                          ? "Reset your password"
                          : authMode === "recovery"
                            ? "Choose a new password"
                            : "Welcome back"}
                    </h2>
                  </div>
                </div>

                {!isSupabaseConfigured && (
                  <div className="auth-message auth-warning">
                    Cloud accounts need the Supabase project variables. Guest
                    progress still works on this device.
                  </div>
                )}

                <form className="auth-form" onSubmit={handleAuthSubmit}>
                  {authMode === "signUp" && (
                    <label>
                      <span>Username</span>
                      <div className="auth-input">
                        <UserRound size={17} />
                        <input
                          type="text"
                          value={authForm.username}
                          onChange={(event) =>
                            updateAuthField("username", event.target.value)
                          }
                          placeholder="pathfinder_01"
                          autoComplete="username"
                          minLength={3}
                          maxLength={20}
                          pattern="[a-z0-9_]{3,20}"
                          required
                        />
                      </div>
                      <small>3–20 lowercase letters, numbers, or underscores.</small>
                    </label>
                  )}

                  {authMode !== "recovery" && (
                    <label>
                      <span>Email</span>
                      <div className="auth-input">
                        <Mail size={17} />
                        <input
                          type="email"
                          value={authForm.email}
                          onChange={(event) =>
                            updateAuthField("email", event.target.value)
                          }
                          placeholder="you@example.com"
                          autoComplete="email"
                          required
                        />
                      </div>
                      {authMode === "signUp" && (
                        <small>A confirmation email is required before sign in.</small>
                      )}
                    </label>
                  )}

                  {authMode !== "forgot" && (
                    <label>
                      <span>
                        {authMode === "recovery" ? "New password" : "Password"}
                      </span>
                      <div className="auth-input">
                        <KeyRound size={17} />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={authForm.password}
                          onChange={(event) =>
                            updateAuthField("password", event.target.value)
                          }
                          placeholder="10+ characters"
                          autoComplete={
                            authMode === "signUp" || authMode === "recovery"
                              ? "new-password"
                              : "current-password"
                          }
                          minLength={10}
                          pattern="(?=.*[A-Za-z])(?=.*\d).{10,}"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((shown) => !shown)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                      <small>Use 10+ characters with at least one letter and number.</small>
                    </label>
                  )}

                  {authError && (
                    <div className="auth-message auth-error">{authError}</div>
                  )}
                  {authMessage && (
                    <div className="auth-message auth-success">{authMessage}</div>
                  )}

                  <button
                    className="game-primary auth-submit"
                    type="submit"
                    disabled={authBusy || !isSupabaseConfigured}
                  >
                    {authBusy ? (
                      "Working…"
                    ) : authMode === "signUp" ? (
                      <>
                        <Sparkles size={17} /> Create account
                      </>
                    ) : authMode === "forgot" ? (
                      <>
                        <Mail size={17} /> Send reset email
                      </>
                    ) : authMode === "recovery" ? (
                      <>
                        <Shield size={17} /> Update password
                      </>
                    ) : (
                      <>
                        <LogIn size={17} /> Sign in
                      </>
                    )}
                  </button>
                </form>

                <div className="auth-switches">
                  {authMode === "signIn" && (
                    <>
                      <button type="button" onClick={() => setAuthMode("signUp")}>
                        Create an account
                      </button>
                      <button type="button" onClick={() => setAuthMode("forgot")}>
                        Forgot password?
                      </button>
                    </>
                  )}
                  {(authMode === "signUp" || authMode === "forgot") && (
                    <button type="button" onClick={() => setAuthMode("signIn")}>
                      Back to sign in
                    </button>
                  )}
                </div>

                <p className="guest-note">
                  Accounts are optional. You can keep playing as a guest with
                  progress saved only on this device.
                </p>
              </>
            )}
          </section>
        </div>
      )}

      {view === "home" && (
        <main className="home-view">
          <section className="home-hero">
            <div className="hero-sky">
              <div className="cloud cloud-one" />
              <div className="cloud cloud-two" />
              <div className="pixel-sun" />
              <div className="far-hill hill-one" />
              <div className="far-hill hill-two" />
            </div>

            <div className="hero-content">
              <span className="quest-label">
                <Sparkles size={15} />
                Your first quest begins here
              </span>
              <h1>
                Learn algorithms.
                <span>Play the decisions.</span>
              </h1>
              <p>
                A beginner-friendly side-scrolling adventure where every level
                teaches one idea, lets you use it, and turns it into a boss battle.
              </p>

              <div className="hero-buttons">
                <button className="game-primary" type="button" onClick={startLesson}>
                  <Play size={18} fill="currentColor" />
                  {progress.completedLevel > 0 ? "Replay Level 1" : "Start Level 1"}
                </button>
                <button
                  className="game-secondary"
                  type="button"
                  onClick={() => changeView("world")}
                >
                  View world map
                  <ArrowRight size={17} />
                </button>
              </div>

              <div className="first-mission">
                <span className="mission-number">1-1</span>
                <div>
                  <small>NEXT MISSION</small>
                  <strong>Binary Blaster</strong>
                  <span>Learn binary search · charge Redline Vision</span>
                </div>
                <span className="mission-reward">+100 XP</span>
              </div>
            </div>

            <div className="hero-scene" aria-label="Preview of the Binary Blaster boss">
              <div className="speech-bubble">
                <strong>GLITCH KING</strong>
                <span>You will never find 42!</span>
              </div>
              <div className="hero-player"><PlayerSprite /></div>
              <div className="hero-power-core" aria-hidden="true">
                <span />
                <Flame size={20} />
              </div>
              <div className="hero-boss">
                <BossSprite health={100} hit={false} attacking={false} />
              </div>
              <div className="floating-coin coin-one">O(log n)</div>
              <div className="floating-coin coin-two">MID</div>
              <div className="ground-platform">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          </section>

          <section className="how-it-works">
            <div className="simple-heading">
              <span>HOW EACH LEVEL WORKS</span>
              <h2>Three steps. No guessing what to do next.</h2>
            </div>
            <div className="steps-row">
              <article>
                <span className="step-icon"><BookOpen size={22} /></span>
                <div>
                  <small>STEP 1</small>
                  <h3>Learn</h3>
                  <p>See one rule at a time with a visual example.</p>
                </div>
              </article>
              <ChevronRight className="step-arrow" />
              <article>
                <span className="step-icon"><Target size={22} /></span>
                <div>
                  <small>STEP 2</small>
                  <h3>Decide</h3>
                    <p>Run, jump, and choose the next move. The answer is never highlighted.</p>
                </div>
              </article>
              <ChevronRight className="step-arrow" />
              <article>
                <span className="step-icon"><Zap size={22} /></span>
                <div>
                  <small>STEP 3</small>
                  <h3>Battle</h3>
                  <p>Correct reasoning powers your attack. Mistakes teach, not punish.</p>
                </div>
              </article>
            </div>
          </section>

          <section className="power-feature">
            <div className="power-feature-art" aria-hidden="true">
              <div className="power-orbit orbit-one" />
              <div className="power-orbit orbit-two" />
              <div className="power-core-large">
                <span />
                <Flame size={34} />
              </div>
              <div className="power-preview-player">
                <PlayerSprite powered firing />
              </div>
              <div className="power-preview-beam">
                <i />
                <i />
              </div>
            </div>
            <div className="power-feature-copy">
              <span className="section-label">
                <Flame size={15} /> New power-up
              </span>
              <h2>Redline Vision rewards correct reasoning.</h2>
              <p>
                Clear the first search checkpoint to reveal the core, collect it
                during the long run, then finish charging it in the boss fight
                to release a cinematic heat beam.
              </p>
              <div className="power-rule">
                <Shield size={18} />
                <span>
                  The power changes the attack, never the algorithm. It cannot
                  reveal an answer or skip a midpoint decision.
                </span>
              </div>
            </div>
          </section>

          <section className="home-progress">
            <div>
              <span className="section-label"><Compass size={15} /> Campaign progress</span>
              <h2>{progress.completedLevel === 0 ? "Your journey starts at Level 1." : "Level 1 cleared. Nice work."}</h2>
              <p>
                {user
                  ? `Signed in as ${username || "Pathfinder"}. Progress is encrypted in transit and saved to your private cloud row.`
                  : "Progress is earned by completing playable lessons. Play as a guest on this device or create an account for cloud saves."}
              </p>
            </div>
            <div className="progress-card">
              <div className="progress-card-top">
                <span>WORLD 1</span>
                <strong>{progress.completedLevel > 0 ? "1 / 7 levels" : "0 / 7 levels"}</strong>
              </div>
              <div className="campaign-track">
                <span style={{ width: `${(progress.completedLevel / 7) * 100}%` }} />
              </div>
              <button type="button" onClick={() => changeView("world")}>
                Open world map <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </main>
      )}

      {view === "lesson" && (
        <main className="lesson-view">
          <div className="view-toolbar">
            <button type="button" onClick={() => changeView("home")}>
              <ArrowLeft size={17} /> Exit lesson
            </button>
            <span>LEVEL 1 · BINARY BLASTER</span>
            <div className="lesson-dots" aria-label={`Lesson step ${lessonStep + 1} of 3`}>
              {lessonSlides.map((slide, index) => (
                <span key={slide.number} className={index <= lessonStep ? "filled" : ""} />
              ))}
            </div>
          </div>

          <section className="lesson-stage">
            <div className="teacher-panel">
              <div className="guide-avatar">
                <PlayerSprite />
              </div>
              <div className="guide-copy">
                <span className="quest-label">NOVA&apos;S FIELD GUIDE · LESSON {currentSlide.number}</span>
                <small>{currentSlide.eyebrow}</small>
                <h1>{currentSlide.title}</h1>
                <p>{currentSlide.copy}</p>
                <div className="lesson-note">
                  <Lightbulb size={18} />
                  <span>{currentSlide.note}</span>
                </div>
                <div className="lesson-plain">
                  <strong>Plain English</strong>
                  <span>{currentSlide.plain}</span>
                </div>
              </div>
            </div>

            <div className={`lesson-visual visual-${currentSlide.visual}`}>
              <div className="visual-target">
                <Crosshair size={18} />
                TARGET: 42
              </div>
              <div className="teaching-array">
                {VALUES.map((value, index) => (
                  <div
                    key={value}
                    className={[
                      currentSlide.visual === "midpoint" && index === 3
                        ? "teaching-mid"
                        : "",
                      currentSlide.visual === "discard" && index <= 3
                        ? "teaching-discarded"
                        : "",
                    ].join(" ")}
                  >
                    <span>{value}</span>
                    <small>position {index}</small>
                  </div>
                ))}
              </div>
              {currentSlide.visual === "midpoint" && (
                <div className="midpoint-pointer">
                  <span>mid = 3</span>
                  <ArrowRight size={18} />
                </div>
              )}
              {currentSlide.visual === "discard" && (
                <div className="discard-message">
                  <span>17 &lt; 42</span>
                  <strong>Remove positions 0–3</strong>
                  <span>Keep positions 4–6</span>
                </div>
              )}
            </div>
          </section>

          <div className="lesson-controls">
            <button
              className="game-secondary"
              type="button"
              disabled={lessonStep === 0}
              onClick={() => setLessonStep((step) => Math.max(0, step - 1))}
            >
              <ArrowLeft size={17} /> Previous
            </button>
            {lessonStep < lessonSlides.length - 1 ? (
              <button
                className="game-primary"
                type="button"
                onClick={() => setLessonStep((step) => step + 1)}
              >
                Next idea <ArrowRight size={17} />
              </button>
            ) : (
              <button className="game-primary" type="button" onClick={startBattle}>
                <Crosshair size={18} /> Start practice battle
              </button>
            )}
          </div>
        </main>
      )}

      {view === "battle" && (
        <main className="battle-view">
          <div className="view-toolbar battle-toolbar">
            <button type="button" onClick={() => changeView("home")}>
              <ArrowLeft size={17} /> Leave battle
            </button>
            <span>LEVEL 1-1 · BINARY BLASTER</span>
            <button type="button" onClick={startBattle}>
              <RotateCcw size={16} /> Restart
            </button>
          </div>

          <section className="battle-scene">
            <div className="battle-sky">
              <div className="cloud battle-cloud-one" />
              <div className="cloud battle-cloud-two" />
            </div>

            <div className="battle-hud">
              <div className="hud-player">
                <span>PATHFINDER</span>
                <HeartMeter hearts={battle.hearts} />
              </div>
              <div className="mission-target">
                <Crosshair size={17} />
                FIND <strong>{TARGET}</strong>
              </div>
              <div className="hud-boss">
                <span>GLITCH KING</span>
                <div className="boss-health-track">
                  <i style={{ width: `${bossHealth}%` }} />
                </div>
              </div>
            </div>

            <div
              className={[
                "power-status",
                powerUpCollected ? "power-ready" : "",
                isHeatVisionFiring ? "power-firing" : "",
              ].join(" ")}
            >
              <Flame size={16} />
              <span>REDLINE VISION</span>
              <strong>
                {isHeatVisionFiring
                  ? "FIRING"
                  : powerUpCollected && battle.correctShots >= 2
                    ? "READY"
                    : powerUpCollected
                      ? "CORE COLLECTED"
                      : battle.correctShots >= 1
                      ? "CORE AHEAD"
                      : "LOCKED"}
              </strong>
            </div>

            <div className="stage-coach" aria-live="polite">
              <span>
                {atGate
                  ? currentRound === 1
                    ? "LEARNING CHECKPOINT"
                    : `BOSS PHASE ${currentRound - 1} OF 2`
                  : "COURSE PROGRESS"}
              </span>
              <strong>{coachTitle}</strong>
              <small>
                {atGate
                  ? "Choose from the learning panel directly below."
                  : "Use D or Right Arrow to run. Space jumps over obstacles."}
              </small>
              <div className="level-progress" aria-label={`${levelProgress}% through the course`}>
                <i style={{ width: `${levelProgress}%` }} />
                <b>{levelProgress}%</b>
              </div>
            </div>

            <div className="stage-controls" aria-label="Platform controls">
              <button type="button" onClick={() => moveRunner(-1)} aria-label="Move left">
                <ArrowLeft size={19} />
                <span>LEFT</span>
              </button>
              <button
                type="button"
                className="jump-control"
                onClick={jumpRunner}
                aria-label="Jump forward"
              >
                <span className="jump-control-arrow">↑</span>
                <span>JUMP FORWARD</span>
              </button>
              <button type="button" onClick={() => moveRunner(1)} aria-label="Run right">
                <ArrowRight size={19} />
                <span>RUN</span>
              </button>
            </div>

            <div
              className="scrolling-track"
              style={{ transform: `translateX(-${cameraOffset}%)` }}
            >
              <div className="city-silhouette" />

              {DATA_COIN_POSITIONS.map((position, index) => (
                <div
                  className={`data-coin ${collectedCoins.includes(index) ? "coin-collected" : ""}`}
                  key={position}
                  style={{ left: `${position}%` }}
                  aria-hidden="true"
                >
                  <span>{index % 2}</span>
                </div>
              ))}

            <div
              className={[
                "runner-player",
                jumping ? "runner-jumping" : "",
                runnerMoving ? "runner-moving" : "",
                obstacleBump ? "runner-bump" : "",
                powerUpBurst ? "runner-power-burst" : "",
              ].join(" ")}
              style={{ left: `${runnerX}%` }}
            >
              <PlayerSprite
                hit={playerHit}
                powered={powerUpCollected}
                firing={isHeatVisionFiring}
              />
              <span className="character-name">{username || "NOVA"}</span>
            </div>

            {battle.correctShots >= 1 && !powerUpCollected && (
              <div
                className="redline-pickup"
                style={{ left: `${POWER_UP_POSITION}%` }}
                role="img"
                aria-label="Redline Vision power-up"
              >
                <span className="pickup-rays" />
                <span className="pickup-core">
                  <Flame size={20} />
                </span>
                <small>REDLINE</small>
              </div>
            )}

            {COURSE_OBSTACLES.map((obstacle, index) => (
              <div
                className={[
                  "course-obstacle",
                  obstacle.type === "bug" ? "bug-obstacle" : "pipe-obstacle",
                  clearedObstacles.includes(index) ? "obstacle-cleared" : "",
                ].join(" ")}
                key={`${obstacle.type}-${obstacle.position}`}
                style={{ left: `${obstacle.position}%` }}
                aria-hidden="true"
              >
                {obstacle.type === "bug" ? (
                  <>
                    <span className="bug-eye" />
                    <span className="bug-eye" />
                    <small>BUG</small>
                  </>
                ) : (
                  <>
                    <span className="pipe-rim" />
                    <small>PIPE</small>
                  </>
                )}
              </div>
            ))}

            {battle.status === "playing" && (
              <div
                className={`scanner-gate ${atGate ? "gate-active" : ""}`}
                style={{
                  left: `${GATE_POSITIONS[Math.min(battle.correctShots, GATE_POSITIONS.length - 1)]}%`,
                }}
                aria-hidden="true"
              >
                <span />
                <strong>{battle.correctShots + 1}</strong>
              </div>
            )}

            <div className="side-scroll-shot-lane">
              {isShooting && (
                <span
                  className="energy-shot"
                  style={{ left: `${Math.min(runnerX + 5, 92)}%` }}
                />
              )}
              {isHeatVisionFiring && (
                <span
                  className="heat-vision-beam"
                  style={{
                    left: `${Math.min(runnerX + 4, 90)}%`,
                    width: `${Math.max(8, 98 - (runnerX + 4))}%`,
                  }}
                >
                  <i className="beam-core" />
                  <i className="beam-flare" />
                </span>
              )}
              {bossAttacking && <span className="enemy-shot" />}
            </div>

            <div className="battle-characters">
              <div className="battle-boss-wrap">
                <BossSprite
                  health={bossHealth}
                  hit={bossHit}
                  attacking={bossAttacking}
                />
                <span className="character-name">BOSS</span>
              </div>
            </div>

            <div className="battle-ground">
              <span /><span /><span /><span /><span /><span /><span /><span />
            </div>
            </div>
          </section>

          <section className="decision-panel">
            <div className="decision-header">
              <div>
                <span className="section-label">
                  <Target size={14} />{" "}
                  {atGate
                    ? currentRound === 1
                      ? "Learning checkpoint"
                      : `Boss phase ${currentRound - 1}`
                    : "Keep moving"}
                </span>
                <h2>
                  {atGate
                    ? coachTitle
                    : battle.correctShots === 0
                      ? "Run to the learning checkpoint."
                      : "Run to the boss arena."}
                </h2>
                <p>
                  {atGate ? (
                    <>
                      We only need positions <strong>{battle.low}</strong> through{" "}
                      <strong>{battle.high}</strong>. Crossed-out values cannot
                      contain 42.
                    </>
                  ) : (
                    <>
                      Run, collect data coins, and jump over bugs or pipes. Only
                      the checkpoint and boss pause the action for a search
                      decision.
                    </>
                  )}
                </p>
              </div>
              {atGate && (
                <button
                  className="hint-button"
                  type="button"
                  onClick={() => setHintOpen((open) => !open)}
                >
                  <Lightbulb size={16} />
                  {hintOpen ? "Hide hint" : "Show me the calculation"}
                </button>
              )}
            </div>

            {hintOpen && (
              <div className="hint-box">
                <CircleHelp size={18} />
                <span>
                  {currentRound === 1
                    ? `The middle position is ${midpoint}. The value at that position is ${midpointValue}.`
                    : `Work it out: ${midpointEquation} = ${midpoint}. Choose the value at position ${midpoint}.`}
                </span>
              </div>
            )}

            {atGate && (
              <div className="learning-path">
                <div>
                  <span>1</span>
                  <p>
                    <strong>Keep the possible range</strong>
                    Positions {battle.low} to {battle.high}
                  </p>
                </div>
                <div className="learning-path-active">
                  <span>2</span>
                  <p>
                    <strong>Find its middle position</strong>
                    {currentRound === 1
                      ? `${midpointEquation} = ${midpoint}`
                      : midpointEquation}
                  </p>
                </div>
                <div>
                  <span>3</span>
                  <p>
                    <strong>Choose the value there</strong>
                    Then decide left, right, or found
                  </p>
                </div>
              </div>
            )}

            {atGate ? (
              <div className="battle-array" role="group" aria-label="Sorted array choices">
                {VALUES.map((value, index) => (
                  <button
                    type="button"
                    key={value}
                    disabled={eliminated[index] || battle.status !== "playing"}
                    className={[
                      eliminated[index] ? "eliminated" : "",
                      selectedIndex === index ? "selected" : "",
                      wrongIndex === index ? "wrong-choice" : "",
                    ].join(" ")}
                    onClick={() => chooseValue(index)}
                    aria-label={`Value ${value} at position ${index}${eliminated[index] ? ", eliminated" : ""}`}
                  >
                    <span>{value}</span>
                    <small>POSITION {index}</small>
                  </button>
                ))}
              </div>
            ) : (
              <div className="run-mission">
                <Play size={20} />
                <div>
                  <strong>Movement goal</strong>
                  <span>
                    Run right and jump over obstacles. Reach the checkpoint, then
                    keep your momentum all the way to the boss.
                  </span>
                </div>
                <kbd>D / →</kbd>
                <kbd>SPACE</kbd>
              </div>
            )}

            <div className="feedback-bar">
              <span className={battle.status === "won" ? "feedback-icon won" : "feedback-icon"}>
                {battle.status === "won" ? <Trophy size={19} /> : <BookOpen size={19} />}
              </span>
              <p aria-live="polite">{feedback}</p>
              <div className="complexity-chip">
                <Code2 size={14} />
                FAST · O(log n)
              </div>
            </div>
          </section>

          {battle.status === "won" && (
            <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Level complete">
              <div className="result-card victory-card">
                <div className="result-trophy"><Trophy size={34} /></div>
                <span>LEVEL 1 COMPLETE</span>
                <h2>Glitch King defeated!</h2>
                <p>
                  You found 42 with three middle checks instead of testing every
                  value. That is binary search: check the middle, choose a side,
                  and repeat.
                </p>
                <div className="result-stats">
                  <div><strong>+100</strong><span>XP earned</span></div>
                  <div><strong>3</strong><span>middle checks</span></div>
                  <div><strong>REDLINE</strong><span>power found</span></div>
                </div>
                <div className="result-actions">
                  <button className="game-secondary" type="button" onClick={startBattle}>
                    <RotateCcw size={16} /> Play again
                  </button>
                  <button className="game-primary" type="button" onClick={() => changeView("world")}>
                    View next level <ArrowRight size={17} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {battle.status === "lost" && (
            <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Try again">
              <div className="result-card retry-card">
                <div className="result-trophy"><Shield size={34} /></div>
                <span>FOCUS DEPLETED</span>
                <h2>Checkpoint reached.</h2>
                <p>
                  Mistakes are part of learning. Remember: calculate the middle
                  index first, then choose its value.
                </p>
                <div className="result-actions">
                  <button className="game-secondary" type="button" onClick={startLesson}>
                    <BookOpen size={16} /> Review lesson
                  </button>
                  <button className="game-primary" type="button" onClick={startBattle}>
                    <RotateCcw size={16} /> Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {view === "world" && (
        <main className="world-view">
          <div className="world-heading">
            <div>
              <span className="section-label"><Map size={15} /> World map</span>
              <h1>Your algorithm adventure</h1>
              <p>Play the first chapter and preview the campaign roadmap.</p>
            </div>
            <div className="world-summary">
              <strong>{progress.completedLevel} / {worlds.length}</strong>
              <span>levels cleared</span>
            </div>
          </div>

          <section className="world-path">
            <div className="path-line" />
            {worlds.map((world) => {
              const complete = progress.completedLevel >= world.level;
              const available = world.level === 1;
              return (
                <article
                  className={[
                    "world-level",
                    `world-${world.color}`,
                    complete ? "complete" : "",
                    available ? "available" : "locked",
                  ].join(" ")}
                  key={world.level}
                >
                  <div className="level-node">
                    {complete ? <Check size={20} /> : available ? world.level : <LockKeyhole size={18} />}
                  </div>
                  <div className="level-card">
                    <div className="level-card-top">
                      <span>LEVEL {world.level}</span>
                      <span>{complete ? "CLEARED" : available ? "AVAILABLE" : "COMING SOON"}</span>
                    </div>
                    <small>{world.realm}</small>
                    <h2>{world.title}</h2>
                    <strong>{world.topics}</strong>
                    <p>{world.description}</p>
                    {available ? (
                      <button type="button" onClick={startLesson}>
                        {complete ? "Replay level" : "Start level"}
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <span className="unlock-note">
                        <LockKeyhole size={14} />
                        Planned chapter · playable level in development
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <div className="world-footer-actions">
            <button className="game-secondary" type="button" onClick={() => changeView("home")}>
              <ArrowLeft size={17} /> Back home
            </button>
            <button className="reset-progress" type="button" onClick={() => setShowResetConfirm(true)}>
              Reset my progress
            </button>
          </div>

          {showResetConfirm && (
            <div className="result-overlay" role="dialog" aria-modal="true" aria-label="Reset progress">
              <div className="result-card reset-card">
                <span>RESET SAVE DATA?</span>
                <h2>Return to Level 1</h2>
                <p>
                  This removes earned XP, the Redline unlock, and completed
                  levels {user ? "from this account and device" : "from this device"}.
                </p>
                <div className="result-actions">
                  <button className="game-secondary" type="button" onClick={() => setShowResetConfirm(false)}>
                    Cancel
                  </button>
                  <button className="danger-button" type="button" onClick={resetProgress}>
                    Reset progress
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      <footer className="game-footer">
        <div className="footer-brand">
          <BrandMark />
          <div>
            <strong>AlgoRift</strong>
            <span>Learn by playing the decisions.</span>
          </div>
        </div>
        <p className="creator-mark">
          Designed and developed by <strong>Immanuel Gnanaseelan</strong>
        </p>
        <div className="footer-links">
          <span className="footer-security">
            <Shield size={15} /> Secure cloud saves
          </span>
          <a href="https://github.com/immanuelgn/AlgoRift" target="_blank" rel="noreferrer">
            <Github size={16} /> GitHub
          </a>
          <a href="https://algorift.vercel.app" target="_blank" rel="noreferrer">
            Live project <ArrowRight size={15} />
          </a>
        </div>
      </footer>
    </div>
  );
}
