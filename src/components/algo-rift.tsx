"use client";

import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Cloud,
  CloudOff,
  Compass,
  Eye,
  EyeOff,
  Github,
  Home,
  KeyRound,
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
  Terminal,
  UserRound,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  supabaseConfigurationError,
} from "@/lib/supabase";

type View = "home" | "game" | "world";

type PlayerProgress = {
  completedLevel: number;
  xp: number;
  redlineVisionUnlocked: boolean;
};

const STORAGE_KEY = "algorift-progress-v2";
const DEFAULT_PROGRESS: PlayerProgress = {
  completedLevel: 0,
  xp: 0,
  redlineVisionUnlocked: false,
};
const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

type MiniGameKind =
  | "binary"
  | "sort"
  | "stack"
  | "tree"
  | "graph"
  | "dijkstra"
  | "greedy"
  | "dp";

const worlds: Array<{
  level: number;
  title: string;
  realm: string;
  topics: string;
  color: string;
  difficulty: "Starter" | "Easy" | "Medium" | "Hard" | "Boss";
  kind: MiniGameKind;
  gameType: string;
  description: string;
  lesson: string;
}> = [
  {
    level: 1,
    title: "Signal Scanner",
    realm: "Search Lab",
    topics: "Binary Search",
    color: "sun",
    difficulty: "Starter",
    kind: "binary",
    gameType: "Number Scanner",
    description:
      "Find the hidden target by repeatedly cutting a sorted list in half.",
    lesson:
      "Binary search compares the middle value, then discards the half that cannot contain the target.",
  },
  {
    level: 2,
    title: "Packet Conveyor",
    realm: "Sorting Bay",
    topics: "Bubble Sort",
    color: "sky",
    difficulty: "Easy",
    kind: "sort",
    gameType: "Conveyor Swap",
    description: "Swap adjacent packets until every value is in ascending order.",
    lesson:
      "Bubble sort repeatedly compares neighbors and swaps only when the left item is larger.",
  },
  {
    level: 3,
    title: "Memory Elevator",
    realm: "Memory Vault",
    topics: "Stacks",
    color: "mint",
    difficulty: "Easy",
    kind: "stack",
    gameType: "LIFO Cargo",
    description: "Unload memory crates in the only order a stack allows.",
    lesson:
      "A stack is last-in, first-out: the newest item is always removed first.",
  },
  {
    level: 4,
    title: "Branch Finder",
    realm: "Branch Network",
    topics: "Binary Search Trees",
    color: "leaf",
    difficulty: "Medium",
    kind: "tree",
    gameType: "Decision Tree",
    description: "Navigate left and right branches to locate a target value.",
    lesson:
      "A binary search tree sends smaller values left and larger values right at every node.",
  },
  {
    level: 5,
    title: "Queue Rescue",
    realm: "Graph Station",
    topics: "Breadth-First Search",
    color: "violet",
    difficulty: "Medium",
    kind: "graph",
    gameType: "Queue Route",
    description: "Rescue nodes in BFS order by always serving the front of the queue.",
    lesson:
      "BFS explores a graph level by level using a queue, so earlier discovered nodes act first.",
  },
  {
    level: 6,
    title: "Shortest Route",
    realm: "Weighted Grid",
    topics: "Dijkstra's Algorithm",
    color: "gold",
    difficulty: "Hard",
    kind: "dijkstra",
    gameType: "Path Dispatcher",
    description: "Pick the cheapest frontier route until the destination is confirmed.",
    lesson:
      "Dijkstra's algorithm repeatedly locks the unvisited node with the lowest known distance.",
  },
  {
    level: 7,
    title: "Interval Planner",
    realm: "Schedule Arcade",
    topics: "Greedy Algorithms",
    color: "gold",
    difficulty: "Hard",
    kind: "greedy",
    gameType: "Schedule Builder",
    description: "Choose compatible events by taking the earliest finish time.",
    lesson:
      "A greedy interval strategy keeps the choice that ends earliest to leave more room for the future.",
  },
  {
    level: 8,
    title: "Memo Forge",
    realm: "Dynamic Core",
    topics: "Dynamic Programming",
    color: "rose",
    difficulty: "Boss",
    kind: "dp",
    gameType: "Cache Builder",
    description: "Fill a memo table by reusing previous answers instead of recomputing them.",
    lesson:
      "Dynamic programming stores subproblem answers and builds larger answers from cached smaller ones.",
  },
];

type WorldDefinition = (typeof worlds)[number];

function normalizeProgress(value: Partial<PlayerProgress> | null | undefined) {
  return {
    completedLevel: Math.max(
      0,
      Math.min(worlds.length, Number(value?.completedLevel) || 0),
    ),
    xp: Math.max(0, Math.min(1_000_000, Number(value?.xp) || 0)),
    redlineVisionUnlocked: Boolean(value?.redlineVisionUnlocked),
  };
}

function getFriendlyAuthError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : "Authentication failed. Please try again.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror")
  ) {
    return "AlgoRift could not reach the cloud service. Refresh once and try again.";
  }
  if (normalized.includes("invalid api key")) {
    return "The cloud save key is incorrect. Use NEXT_PUBLIC_SUPABASE_ANON_KEY from the Supabase API settings.";
  }
  if (normalized.includes("email address not authorized")) {
    return "Public confirmation email is not available yet. Guest saves still work on this device.";
  }
  if (
    normalized.includes("user already registered") ||
    normalized.includes("already been registered")
  ) {
    return "That email already has an account. Use Sign in or reset the password.";
  }
  if (
    normalized.includes("duplicate key") ||
    normalized.includes("database error saving new user")
  ) {
    return "That username is already taken. Choose another username.";
  }
  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "Too many account requests were made recently. Wait a few minutes, then try again.";
  }

  return message;
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

export function AlgoRift() {
  const [view, setView] = useState<View>("home");
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [ready, setReady] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
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
  const [selectedWorldLevel, setSelectedWorldLevel] = useState(1);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<
    "local" | "loading" | "saving" | "saved" | "error"
  >(isSupabaseConfigured ? "loading" : "local");
  const pageTop = useRef<HTMLDivElement>(null);
  const learningGuide = useRef<HTMLElement>(null);
  const progressRef = useRef(progress);

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
    const maybeClient = getSupabaseBrowserClient();
    if (!maybeClient) return;
    const client = maybeClient;
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
        setAuthError("Cloud save tables are unavailable. Check the Supabase setup.");
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
            redline_vision_unlocked: mergedProgress.redlineVisionUnlocked,
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
      window.setTimeout(() => void hydrateAccount(session?.user ?? null), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [ready]);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    if (!client || !user || !cloudHydrated) return;

    const timer = window.setTimeout(() => {
      setCloudStatus("saving");
      void client
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

  const displayLevel = Math.max(1, Math.min(worlds.length, progress.completedLevel + 1));
  const nextPlayableWorld = Math.min(worlds.length, progress.completedLevel + 1);
  const nextWorld = worlds[nextPlayableWorld - 1] ?? worlds[0];
  const selectedWorld =
    worlds.find((world) => world.level === selectedWorldLevel) ?? worlds[0];
  const nextMission = {
    label: `${nextWorld.level}-1`,
    title: nextWorld.title,
    topics: nextWorld.topics,
    reward: `+${220 + nextWorld.level * 60} XP`,
  };

  function changeView(nextView: View) {
    setView(nextView);
    window.requestAnimationFrame(() => {
      pageTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function showLearningGuide() {
    setView("home");
    window.requestAnimationFrame(() => {
      learningGuide.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function startWorld(level: number) {
    if (level > progress.completedLevel + 1) return;
    setSelectedWorldLevel(level);
    changeView("game");
  }

  const handleGameComplete = useCallback(
    ({
      completedLevel,
      xp,
      redlineVisionUnlocked,
    }: {
      completedLevel: number;
      xp: number;
      redlineVisionUnlocked: boolean;
    }) => {
      setProgress((current) => ({
        completedLevel: Math.max(current.completedLevel, completedLevel),
        xp: Math.max(current.xp, xp),
        redlineVisionUnlocked:
          current.redlineVisionUnlocked || redlineVisionUnlocked,
      }));
    },
    [],
  );

  function resetProgress() {
    const freshProgress = { ...DEFAULT_PROGRESS };
    setProgress(freshProgress);
    progressRef.current = freshProgress;
    window.localStorage.removeItem(STORAGE_KEY);
    setShowResetConfirm(false);
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
    const client = getSupabaseBrowserClient();
    if (!client) {
      setAuthError(
        supabaseConfigurationError ||
          "Cloud accounts are not configured yet.",
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
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setAuthMessage("Password reset email sent.");
        return;
      }

      if (authMode === "recovery") {
        if (!PASSWORD_PATTERN.test(authForm.password)) {
          throw new Error(
            "Use at least 10 characters with at least one letter and number.",
          );
        }
        const { error } = await client.auth.updateUser({
          password: authForm.password,
        });
        if (error) throw error;
        setAuthMessage("Password updated.");
        setAuthMode("signIn");
        return;
      }

      if (!email) throw new Error("Enter a valid email address.");
      if (!PASSWORD_PATTERN.test(authForm.password)) {
        throw new Error(
          "Use at least 10 characters with at least one letter and number.",
        );
      }

      if (authMode === "signUp") {
        if (!USERNAME_PATTERN.test(usernameValue)) {
          throw new Error(
            "Username must be 3-20 lowercase letters, numbers, or underscores.",
          );
        }
        const { data, error } = await client.auth.signUp({
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
            ? "Account created. Cloud sync is active."
            : "Account created. Check your email to confirm it.",
        );
      } else {
        const { error } = await client.auth.signInWithPassword({
          email,
          password: authForm.password,
        });
        if (error) throw error;
        setAuthMessage("Signed in. Cloud progress is syncing.");
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
    const client = getSupabaseBrowserClient();
    if (!client) return;
    setAuthBusy(true);
    const { error } = await client.auth.signOut();
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
            <Home size={16} /> Home
          </button>
          <button
            className={view === "world" ? "active" : ""}
            type="button"
            onClick={() => changeView("world")}
          >
            <Map size={16} /> World
          </button>
          <button type="button" onClick={showLearningGuide}>
            <Terminal size={16} /> Learn
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
            aria-label={
              user ? `Open account for ${username}` : "Sign in or create account"
            }
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
        <AccountDialog
          authBusy={authBusy}
          authError={authError}
          authForm={authForm}
          authMessage={authMessage}
          authMode={authMode}
          cloudStatus={cloudStatus}
          displayLevel={displayLevel}
          progress={progress}
          showPassword={showPassword}
          user={user}
          username={username}
          onClose={() => setAccountOpen(false)}
          onModeChange={setAuthMode}
          onPasswordVisibility={() => setShowPassword((shown) => !shown)}
          onSignOut={() => void signOut()}
          onSubmit={handleAuthSubmit}
          onUpdateField={updateAuthField}
        />
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
                <Terminal size={15} /> MINI-GAME ACADEMY ONLINE
              </span>
              <h1>
                Learn algorithms.
                <span>Play the idea.</span>
              </h1>
              <p>
                A collection of focused algorithm mini-games, ordered from
                beginner-friendly search puzzles to dynamic programming boss
                challenges.
              </p>
              <div className="hero-buttons">
                <button
                  className="game-primary"
                  type="button"
                  onClick={() => startWorld(nextPlayableWorld)}
                >
                  <Play size={18} fill="currentColor" />
                  {progress.completedLevel >= worlds.length
                    ? `Replay World ${worlds.length}`
                    : `Enter World ${nextPlayableWorld}`}
                </button>
                <button
                  className="game-secondary"
                  type="button"
                  onClick={showLearningGuide}
                >
                  Learn algorithms <ArrowRight size={17} />
                </button>
              </div>
              <div className="first-mission">
                <span className="mission-number">{nextMission.label}</span>
                <div>
                  <small>NEXT SECTOR</small>
                  <strong>{nextMission.title}</strong>
                  <span>{nextMission.topics}</span>
                </div>
                <span className="mission-reward">{nextMission.reward}</span>
              </div>
            </div>

            <div className="hero-scene mini-game-preview" aria-label="AlgoRift game preview">
              <div className="mini-preview-card preview-search">
                <small>BINARY SEARCH</small>
                <strong>LOW MID HIGH</strong>
                <span>Cut the range</span>
              </div>
              <div className="mini-preview-card preview-sort">
                <small>SORTING</small>
                <strong>6 3 8 1</strong>
                <span>Swap neighbors</span>
              </div>
              <div className="mini-preview-card preview-graph">
                <small>GRAPHS</small>
                <strong>A → C → F</strong>
                <span>Pick the route</span>
              </div>
            </div>
          </section>

          <section className="how-it-works">
            <div className="simple-heading">
              <span>CORE GAME LOOP</span>
              <h2>One concept. One small game. One clear win condition.</h2>
            </div>
            <div className="steps-row">
              <article>
                <span className="step-icon"><Sparkles size={22} /></span>
                <div>
                  <small>PLAY</small>
                  <h3>Interact with the rule</h3>
                  <p>Every algorithm becomes a specific move you control.</p>
                </div>
              </article>
              <ArrowRight className="step-arrow" />
              <article>
                <span className="step-icon"><Terminal size={22} /></span>
                <div>
                  <small>UNDERSTAND</small>
                  <h3>Get feedback instantly</h3>
                  <p>Wrong moves explain the concept without stopping the flow.</p>
                </div>
              </article>
              <ArrowRight className="step-arrow" />
              <article>
                <span className="step-icon"><Check size={22} /></span>
                <div>
                  <small>MASTER</small>
                  <h3>Clear the next concept</h3>
                  <p>Progress from easier patterns toward harder algorithm design.</p>
                </div>
              </article>
            </div>
          </section>

          <section className="learning-strip" ref={learningGuide}>
            <div className="simple-heading">
              <span>WHAT YOU LEARN</span>
              <h2>Algorithms become different mini-games.</h2>
              <p>
                Search feels like scanning. Sorting feels like fixing a
                conveyor. Stacks feel like cargo rules. Graphs feel like route
                planning. DP feels like building a cache.
              </p>
            </div>
            <div className="learning-cards">
              <article>
                <small>WORLD 1</small>
                <h3>Signal Scanner</h3>
                <p>
                  Narrow a sorted signal by choosing left, right, or found.
                </p>
              </article>
              <article>
                <small>WORLD 2</small>
                <h3>Packet Conveyor</h3>
                <p>
                  Compare neighboring cards and swap only when needed.
                </p>
              </article>
              <article>
                <small>WORLDS 3-8</small>
                <h3>Stacks, Trees, Graphs, Greedy, DP</h3>
                <p>
                  Each later concept gets its own board, choices, and feedback.
                </p>
              </article>
            </div>
          </section>

          <section className="home-progress">
            <div>
              <span className="section-label">
                <Compass size={15} /> Campaign progress
              </span>
              <h2>
                {progress.completedLevel === 0
                  ? "World 1 is ready."
                  : progress.completedLevel >= worlds.length
                    ? "All current worlds are cleared."
                    : `World ${progress.completedLevel + 1} is unlocked.`}
              </h2>
              <p>
                {user
                  ? `Signed in as ${username || "Pathfinder"}. Progress syncs to your private cloud row.`
                  : "Play immediately as a guest or create an account for cloud saves."}
              </p>
            </div>
            <div className="progress-card">
              <div className="progress-card-top">
                <span>CAMPAIGN</span>
                <strong>{progress.completedLevel} / {worlds.length}</strong>
              </div>
              <div className="campaign-track">
                <span style={{ width: `${(progress.completedLevel / worlds.length) * 100}%` }} />
              </div>
              <button type="button" onClick={() => changeView("world")}>
                Open world map <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </main>
      )}

      {view === "game" && (
        <MiniGameWorld
          world={selectedWorld}
          onComplete={handleGameComplete}
          onExit={() => changeView("world")}
        />
      )}

      {view === "world" && (
        <main className="world-view">
          <div className="world-heading">
            <div>
              <span className="section-label"><Map size={15} /> World map</span>
              <h1>AlgoRift campaign</h1>
              <p>
                Pick the next unlocked algorithm mini-game. Each one has its
                own board, rule, and way to win.
              </p>
            </div>
            <div className="world-summary">
              <strong>{progress.completedLevel} / {worlds.length}</strong>
              <span>worlds cleared</span>
            </div>
          </div>

          <section className="world-path">
            <div className="path-line" />
            {worlds.map((world) => {
              const complete = progress.completedLevel >= world.level;
              const playable = world.level <= progress.completedLevel + 1;
              return (
                <article
                  className={[
                    "world-level",
                    `world-${world.color}`,
                    complete ? "complete" : "",
                    playable ? "available" : "locked",
                  ].join(" ")}
                  key={world.level}
                >
                  <div className="level-node">
                    {complete ? (
                      <Check size={20} />
                    ) : playable ? (
                      world.level
                    ) : (
                      <LockKeyhole size={18} />
                    )}
                  </div>
                  <div className="level-card">
                    <div className="level-card-top">
                      <span>WORLD {world.level}</span>
                      <span>
                        {complete
                          ? "CLEARED"
                          : playable
                            ? "PLAYABLE"
                            : "LOCKED"}
                      </span>
                    </div>
                    <small>{world.realm}</small>
                    <h2>{world.title}</h2>
                    <strong>{world.topics}</strong>
                    <span className="mini-game-type">
                      {world.difficulty} · {world.gameType}
                    </span>
                    <p>{world.description}</p>
                    {playable ? (
                      <button type="button" onClick={() => startWorld(world.level)}>
                        {complete ? "Replay world" : "Enter world"}
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <span className="unlock-note">
                        <LockKeyhole size={14} />
                        Clear the prior world
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          <div className="world-footer-actions">
            <button
              className="game-secondary"
              type="button"
              onClick={() => changeView("home")}
            >
              <ArrowLeft size={17} /> Back home
            </button>
            <button
              className="reset-progress"
              type="button"
              onClick={() => setShowResetConfirm(true)}
            >
              Reset my progress
            </button>
          </div>

          {showResetConfirm && (
            <div
              className="result-overlay"
              role="dialog"
              aria-modal="true"
              aria-label="Reset progress"
            >
              <div className="result-card reset-card">
                <span>RESET SAVE DATA?</span>
                <h2>Return to World 1</h2>
                <p>
                  This removes earned XP and completed worlds
                  {user ? " from this account and device" : " from this device"}.
                </p>
                <div className="result-actions">
                  <button
                    className="game-secondary"
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="danger-button"
                    type="button"
                    onClick={resetProgress}
                  >
                    Reset progress
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      )}

      {view !== "game" && (
        <footer className="game-footer">
          <div className="footer-brand">
            <BrandMark />
            <div>
              <strong>AlgoRift</strong>
              <span>Algorithms taught through focused mini-games.</span>
            </div>
          </div>
          <p className="creator-mark">
            Designed and developed by <strong>Immanuel Gnanaseelan</strong>
          </p>
          <div className="footer-links">
            <span className="footer-security">
              <Shield size={15} /> Secure cloud saves
            </span>
            <a
              href="https://github.com/immanuelgn/AlgoRift"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={16} /> GitHub
            </a>
            <a href="https://algorift.vercel.app" target="_blank" rel="noreferrer">
              Live project <ArrowRight size={15} />
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}

type MiniGameWorldProps = {
  world: WorldDefinition;
  onExit: () => void;
  onComplete: (payload: PlayerProgress) => void;
};

const BINARY_VALUES = [3, 8, 12, 17, 23, 31, 42];
const SORT_START = [6, 3, 8, 1, 5];
const TREE_PATH = [
  { node: 50, correct: "right", hint: "68 is larger than 50, so move right." },
  { node: 75, correct: "left", hint: "68 is smaller than 75, so move left." },
  { node: 60, correct: "right", hint: "68 is larger than 60, so move right." },
] as const;
const BFS_ORDER = ["A", "B", "C", "D", "E", "F"];
const DIJKSTRA_STEPS = [
  { frontier: ["B:4", "C:2", "D:8"], correct: "C" },
  { frontier: ["B:4", "E:5", "D:8"], correct: "B" },
  { frontier: ["E:5", "D:7", "F:11"], correct: "E" },
  { frontier: ["D:7", "F:9"], correct: "D" },
] as const;
const GREEDY_INTERVALS = [
  { id: "B", label: "B 1-3", finish: 3 },
  { id: "A", label: "A 0-5", finish: 5 },
  { id: "D", label: "D 3-5", finish: 5 },
  { id: "C", label: "C 4-7", finish: 7 },
  { id: "E", label: "E 5-8", finish: 8 },
] as const;
const GREEDY_ORDER = ["B", "D", "E"];
const DP_VALUES = [0, 1, 1, 2, 3, 5];

function isSorted(values: number[]) {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}

function MiniGameWorld({
  world,
  onExit,
  onComplete,
}: MiniGameWorldProps) {
  const [binaryLow, setBinaryLow] = useState(0);
  const [binaryHigh, setBinaryHigh] = useState(BINARY_VALUES.length - 1);
  const [packets, setPackets] = useState(SORT_START);
  const [stack, setStack] = useState(["A", "B", "C"]);
  const [treeStep, setTreeStep] = useState(0);
  const [graphStep, setGraphStep] = useState(0);
  const [dijkstraStep, setDijkstraStep] = useState(0);
  const [greedyStep, setGreedyStep] = useState(0);
  const [greedySelected, setGreedySelected] = useState<string[]>([]);
  const [dpIndex, setDpIndex] = useState(2);
  const [message, setMessage] = useState(world.lesson);
  const [mistakes, setMistakes] = useState(0);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    resetMiniGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.level]);

  function completeMiniGame(detail: string) {
    if (complete) return;
    setMessage(detail);
    setComplete(true);
    onComplete({
      completedLevel: world.level,
      xp: 220 + world.level * 60,
      redlineVisionUnlocked: true,
    });
  }

  function miss(hint: string) {
    setMistakes((current) => current + 1);
    setMessage(hint);
  }

  function resetMiniGame() {
    setBinaryLow(0);
    setBinaryHigh(BINARY_VALUES.length - 1);
    setPackets(SORT_START);
    setStack(["A", "B", "C"]);
    setTreeStep(0);
    setGraphStep(0);
    setDijkstraStep(0);
    setGreedyStep(0);
    setGreedySelected([]);
    setDpIndex(2);
    setMessage(world.lesson);
    setMistakes(0);
    setComplete(false);
  }

  function chooseBinary(action: "left" | "right" | "found") {
    const pivotIndex = Math.floor((binaryLow + binaryHigh) / 2);
    const pivot = BINARY_VALUES[pivotIndex];
    if (action === "found" && pivot === 42) {
      completeMiniGame("Target found. Binary search ended after cutting the range down to one value.");
      return;
    }
    if (pivot < 42 && action === "right") {
      setBinaryLow(pivotIndex + 1);
      setMessage(`${pivot} is too small, so the left half is impossible. Keep the right half.`);
      return;
    }
    if (pivot > 42 && action === "left") {
      setBinaryHigh(pivotIndex - 1);
      setMessage(`${pivot} is too large, so the right half is impossible. Keep the left half.`);
      return;
    }
    miss("Check the middle value first, then keep only the half where 42 can still exist.");
  }

  function swapAt(index: number) {
    const left = packets[index];
    const right = packets[index + 1];
    if (left <= right) {
      miss(`${left} is already before ${right}. Bubble sort swaps only when left is larger.`);
      return;
    }
    const next = [...packets];
    next[index] = right;
    next[index + 1] = left;
    setPackets(next);
    if (isSorted(next)) {
      completeMiniGame("Sorted. Every neighboring pair is now in ascending order.");
      return;
    }
    setMessage(`${left} and ${right} swapped. Keep comparing neighbors until the row is sorted.`);
  }

  function popStack(value: string) {
    const top = stack[stack.length - 1];
    if (value !== top) {
      miss(`Stacks only remove the newest item. The current top is ${top}.`);
      return;
    }
    const next = stack.slice(0, -1);
    setStack(next);
    if (next.length === 0) {
      completeMiniGame("Stack cleared in C, B, A order. That is last-in, first-out.");
      return;
    }
    setMessage(`${value} popped from the top. The next removable crate is ${next[next.length - 1]}.`);
  }

  function chooseTree(direction: "left" | "right") {
    const step = TREE_PATH[treeStep];
    if (direction !== step.correct) {
      miss(step.hint);
      return;
    }
    const nextStep = treeStep + 1;
    setTreeStep(nextStep);
    if (nextStep >= TREE_PATH.length) {
      completeMiniGame("Route found: 50 → 75 → 60 → 68. BST comparisons guided every branch.");
      return;
    }
    setMessage(`Correct branch. Now compare 68 with ${TREE_PATH[nextStep].node}.`);
  }

  function chooseGraph(node: string) {
    const expected = BFS_ORDER[graphStep];
    if (node !== expected) {
      miss(`BFS uses a queue. Serve ${expected} before later discovered nodes.`);
      return;
    }
    const nextStep = graphStep + 1;
    setGraphStep(nextStep);
    if (nextStep >= BFS_ORDER.length) {
      completeMiniGame("All nodes rescued in BFS order. Queue discipline kept the search level by level.");
      return;
    }
    setMessage(`${node} processed. The next queue front is ${BFS_ORDER[nextStep]}.`);
  }

  function chooseDijkstra(node: string) {
    const step = DIJKSTRA_STEPS[dijkstraStep];
    if (node !== step.correct) {
      miss("Dijkstra locks the unvisited node with the smallest known distance.");
      return;
    }
    const nextStep = dijkstraStep + 1;
    setDijkstraStep(nextStep);
    if (nextStep >= DIJKSTRA_STEPS.length) {
      completeMiniGame("Shortest route confirmed. The lowest-distance frontier won every round.");
      return;
    }
    setMessage(`${node} locked. Re-check the frontier and choose the next cheapest distance.`);
  }

  function chooseGreedy(intervalId: string) {
    const expected = GREEDY_ORDER[greedyStep];
    if (intervalId !== expected) {
      miss("For this interval strategy, choose the compatible event that finishes earliest.");
      return;
    }
    const nextSelected = [...greedySelected, intervalId];
    const nextStep = greedyStep + 1;
    setGreedySelected(nextSelected);
    setGreedyStep(nextStep);
    if (nextStep >= GREEDY_ORDER.length) {
      completeMiniGame("Schedule complete. Earliest finishing choices left room for the most events.");
      return;
    }
    setMessage(`${intervalId} selected. Now pick the next compatible interval with the earliest finish.`);
  }

  function chooseDp(value: number) {
    const expected = DP_VALUES[dpIndex];
    if (value !== expected) {
      miss(`Use the cached cells: fib(${dpIndex}) = fib(${dpIndex - 1}) + fib(${dpIndex - 2}).`);
      return;
    }
    const nextIndex = dpIndex + 1;
    setDpIndex(nextIndex);
    if (nextIndex >= DP_VALUES.length) {
      completeMiniGame("Memo table complete. Each new value reused the two cached answers before it.");
      return;
    }
    setMessage(`fib(${dpIndex}) cached as ${value}. Build the next cell from the cache.`);
  }

  const pivotIndex = Math.floor((binaryLow + binaryHigh) / 2);
  const pivotValue = BINARY_VALUES[pivotIndex];
  const visibleBinary = BINARY_VALUES.map((value, index) => ({
    value,
    active: index >= binaryLow && index <= binaryHigh,
    pivot: index === pivotIndex,
  }));
  const currentTreeNode = TREE_PATH[treeStep]?.node ?? 68;
  const graphVisible = BFS_ORDER.map((node, index) => ({
    node,
    done: index < graphStep,
    active: index === graphStep,
  }));
  const currentDijkstra = DIJKSTRA_STEPS[dijkstraStep] ?? DIJKSTRA_STEPS[DIJKSTRA_STEPS.length - 1];
  const dpVisible = DP_VALUES.map((value, index) => ({
    value,
    visible: index < dpIndex,
    active: index === dpIndex,
  }));

  return (
    <main className="mini-game-view">
      <header className="mini-game-toolbar">
        <button type="button" onClick={onExit}>
          <ArrowLeft size={17} /> Exit
        </button>
        <div>
          <span>WORLD {world.level}</span>
          <strong>{world.title}</strong>
        </div>
        <button type="button" onClick={resetMiniGame}>
          <RotateCcw size={16} /> Restart
        </button>
      </header>

      <section className={`mini-game-shell world-${world.color}`}>
        <aside className="mini-game-brief">
          <span>{world.difficulty} · {world.gameType}</span>
          <h1>{world.title}</h1>
          <strong>{world.topics}</strong>
          <p>{world.description}</p>
          <div className="mini-lesson-card">
            <small>WHAT THIS TEACHES</small>
            <p>{world.lesson}</p>
          </div>
          <div className={mistakes > 0 ? "mini-feedback warn" : "mini-feedback"}>
            <small>{complete ? "CLEARED" : "LIVE FEEDBACK"}</small>
            <p>{message}</p>
          </div>
        </aside>

        <div className="mini-game-board">
          {world.kind === "binary" && (
            <section className="binary-game" aria-label="Binary search scanner">
              <div className="binary-strip">
                {visibleBinary.map(({ value, active, pivot }) => (
                  <span
                    className={[active ? "active" : "", pivot ? "pivot" : ""].join(" ")}
                    key={value}
                  >
                    <small>{pivot ? "MID" : active ? "OPEN" : "CUT"}</small>
                    {value}
                  </span>
                ))}
              </div>
              <div className="mini-rule-line">
                <strong>Target 42</strong>
                <span>Current middle is {pivotValue}</span>
              </div>
              <div className="mini-actions three">
                <button type="button" disabled={complete} onClick={() => chooseBinary("left")}>
                  Search left half
                </button>
                <button type="button" disabled={complete} onClick={() => chooseBinary("found")}>
                  Found target
                </button>
                <button type="button" disabled={complete} onClick={() => chooseBinary("right")}>
                  Search right half
                </button>
              </div>
            </section>
          )}

          {world.kind === "sort" && (
            <section className="sort-mini-game" aria-label="Bubble sort conveyor">
              <div className="packet-row">
                {packets.map((packet) => (
                  <span className="mini-packet" key={`${packet}-${packets.indexOf(packet)}`}>
                    {packet}
                  </span>
                ))}
              </div>
              <div className="mini-actions">
                {packets.slice(0, -1).map((packet, index) => (
                  <button type="button" disabled={complete} key={`${packet}-${index}`} onClick={() => swapAt(index)}>
                    Compare {packet} / {packets[index + 1]}
                  </button>
                ))}
              </div>
            </section>
          )}

          {world.kind === "stack" && (
            <section className="stack-mini-game" aria-label="Stack cargo elevator">
              <div className="stack-tower">
                {stack.map((crate, index) => (
                  <button
                    className={index === stack.length - 1 ? "top" : ""}
                    disabled={complete}
                    key={crate}
                    onClick={() => popStack(crate)}
                    type="button"
                  >
                    {crate}
                  </button>
                ))}
              </div>
              <p>Click the crate that can legally leave the stack.</p>
            </section>
          )}

          {world.kind === "tree" && (
            <section className="tree-mini-game" aria-label="Binary search tree branch finder">
              <div className="tree-node-map">
                <span>50</span>
                <span>25</span>
                <span>75</span>
                <span>60</span>
                <span className="target">68</span>
              </div>
              <div className="mini-rule-line">
                <strong>Target 68</strong>
                <span>Currently comparing at {currentTreeNode}</span>
              </div>
              <div className="mini-actions two">
                <button type="button" disabled={complete} onClick={() => chooseTree("left")}>Go left</button>
                <button type="button" disabled={complete} onClick={() => chooseTree("right")}>Go right</button>
              </div>
            </section>
          )}

          {world.kind === "graph" && (
            <section className="graph-mini-game" aria-label="BFS queue rescue">
              <div className="graph-node-row">
                {graphVisible.map(({ node, done, active }) => (
                  <button
                    className={[done ? "done" : "", active ? "active" : ""].join(" ")}
                    disabled={complete || done}
                    key={node}
                    onClick={() => chooseGraph(node)}
                    type="button"
                  >
                    {node}
                  </button>
                ))}
              </div>
              <div className="queue-strip">
                Queue front: {BFS_ORDER.slice(graphStep, graphStep + 3).join(" → ") || "empty"}
              </div>
            </section>
          )}

          {world.kind === "dijkstra" && (
            <section className="dijkstra-mini-game" aria-label="Dijkstra route dispatcher">
              <div className="weighted-map">
                {currentDijkstra.frontier.map((route) => (
                  <button
                    disabled={complete}
                    key={route}
                    onClick={() => chooseDijkstra(route.split(":")[0])}
                    type="button"
                  >
                    <small>FRONTIER</small>
                    {route}
                  </button>
                ))}
              </div>
              <p>Lock the node with the lowest known distance.</p>
            </section>
          )}

          {world.kind === "greedy" && (
            <section className="greedy-mini-game" aria-label="Greedy interval planner">
              <div className="interval-row">
                {GREEDY_INTERVALS.map((interval) => (
                  <button
                    className={greedySelected.includes(interval.id) ? "selected" : ""}
                    disabled={complete || greedySelected.includes(interval.id)}
                    key={interval.id}
                    onClick={() => chooseGreedy(interval.id)}
                    type="button"
                  >
                    <span>{interval.label}</span>
                    <small>finishes {interval.finish}</small>
                  </button>
                ))}
              </div>
              <p>Goal: select the most compatible events by earliest finish time.</p>
            </section>
          )}

          {world.kind === "dp" && (
            <section className="dp-mini-game" aria-label="Dynamic programming memo forge">
              <div className="memo-row">
                {dpVisible.map(({ value, visible, active }, index) => (
                  <span className={active ? "active" : ""} key={index}>
                    <small>fib({index})</small>
                    {visible ? value : active ? "?" : "locked"}
                  </span>
                ))}
              </div>
              <div className="mini-actions">
                {[1, 2, 3, 5].map((value) => (
                  <button type="button" disabled={complete} key={value} onClick={() => chooseDp(value)}>
                    Fill {value}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {complete && (
          <div className="canvas-complete" role="dialog" aria-label={`${world.title} complete`}>
            <div>
              <span>WORLD {world.level} CLEAR</span>
              <h2>Next world unlocked.</h2>
              <p>
                You cleared {world.topics} by playing its core rule, not by
                memorizing a definition.
              </p>
              <div className="canvas-complete-stats">
                <strong>WORLD {world.level}</strong>
                <strong>{world.gameType}</strong>
                <strong>UNLOCKED</strong>
              </div>
              <button type="button" onClick={onExit}>
                Return to world map <ArrowRight size={17} />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

type AccountDialogProps = {
  authBusy: boolean;
  authError: string;
  authForm: { username: string; email: string; password: string };
  authMessage: string;
  authMode: "signIn" | "signUp" | "forgot" | "recovery";
  cloudStatus: "local" | "loading" | "saving" | "saved" | "error";
  displayLevel: number;
  progress: PlayerProgress;
  showPassword: boolean;
  user: User | null;
  username: string;
  onClose: () => void;
  onModeChange: (mode: AccountDialogProps["authMode"]) => void;
  onPasswordVisibility: () => void;
  onSignOut: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUpdateField: (
    field: "username" | "email" | "password",
    value: string,
  ) => void;
};

function AccountDialog({
  authBusy,
  authError,
  authForm,
  authMessage,
  authMode,
  cloudStatus,
  displayLevel,
  progress,
  showPassword,
  user,
  username,
  onClose,
  onModeChange,
  onPasswordVisibility,
  onSignOut,
  onSubmit,
  onUpdateField,
}: AccountDialogProps) {
  return (
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
          onClick={onClose}
          aria-label="Close account"
        >
          x
        </button>

        {user ? (
          <>
            <div className="account-identity">
              <span className="account-avatar"><UserRound size={25} /></span>
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
                    ? "Saving progress..."
                    : cloudStatus === "loading"
                      ? "Loading cloud save..."
                      : cloudStatus === "error"
                        ? "Cloud sync needs attention"
                        : "Progress saved"}
                </strong>
                <span>
                  Level {displayLevel} - {progress.xp} XP - private to this account
                </span>
              </div>
            </div>

            <div className="account-security-note">
              <Shield size={18} />
              Passwords are handled by Supabase Auth and are never stored by AlgoRift.
            </div>
            <button
              className="game-secondary account-signout"
              type="button"
              onClick={onSignOut}
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
                {supabaseConfigurationError ||
                  "Cloud accounts are not configured. Guest saves still work."}
              </div>
            )}

            <form className="auth-form" onSubmit={onSubmit}>
              {authMode === "signUp" && (
                <label>
                  <span>Username</span>
                  <div className="auth-input">
                    <UserRound size={17} />
                    <input
                      type="text"
                      value={authForm.username}
                      onChange={(event) =>
                        onUpdateField("username", event.target.value)
                      }
                      placeholder="pathfinder_01"
                      autoComplete="username"
                      minLength={3}
                      maxLength={20}
                      pattern="[a-z0-9_]{3,20}"
                      required
                    />
                  </div>
                  <small>3-20 lowercase letters, numbers, or underscores.</small>
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
                        onUpdateField("email", event.target.value)
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
                        onUpdateField("password", event.target.value)
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
                      onClick={onPasswordVisibility}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  <small>Use 10+ characters with at least one letter and number.</small>
                </label>
              )}

              {authError && <div className="auth-message auth-error">{authError}</div>}
              {authMessage && (
                <div className="auth-message auth-success">{authMessage}</div>
              )}

              <button
                className="game-primary auth-submit"
                type="submit"
                disabled={authBusy || !isSupabaseConfigured}
              >
                {authBusy ? (
                  "Working..."
                ) : authMode === "signUp" ? (
                  <><Sparkles size={17} /> Create account</>
                ) : authMode === "forgot" ? (
                  <><Mail size={17} /> Send reset email</>
                ) : authMode === "recovery" ? (
                  <><Shield size={17} /> Update password</>
                ) : (
                  <><LogIn size={17} /> Sign in</>
                )}
              </button>
            </form>

            <div className="auth-switches">
              {authMode === "signIn" && (
                <>
                  <button type="button" onClick={() => onModeChange("signUp")}>
                    Create an account
                  </button>
                  <button type="button" onClick={() => onModeChange("forgot")}>
                    Forgot password?
                  </button>
                </>
              )}
              {(authMode === "signUp" || authMode === "forgot") && (
                <button type="button" onClick={() => onModeChange("signIn")}>
                  Back to sign in
                </button>
              )}
            </div>
            <p className="guest-note">
              Accounts are optional. Guest progress remains on this device.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
