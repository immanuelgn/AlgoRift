"use client";

import type { User } from "@supabase/supabase-js";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Cloud,
  CloudOff,
  Compass,
  Eye,
  EyeOff,
  Github,
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
  Trophy,
  UserRound,
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

function GamePreview({ kind }: { kind: MiniGameKind }) {
  if (kind === "binary") {
    return (
      <div className="preview-binary preview-scene">
        <i className="scope-ring" />
        <span>LOW</span><span className="hot">MID</span><span>HIGH</span>
      </div>
    );
  }
  if (kind === "sort") {
    return (
      <div className="preview-sort-bars preview-scene">
        <span>6</span><span className="swap">3</span><span>8</span><span>1</span>
        <i />
      </div>
    );
  }
  if (kind === "stack") {
    return <div className="preview-stack preview-scene"><i>A</i><i>B</i><i>C</i><small>TOP</small></div>;
  }
  if (kind === "tree") {
    return <div className="preview-tree preview-scene"><i>50</i><i>25</i><i className="hot">75</i><b /><b /></div>;
  }
  if (kind === "graph") {
    return <div className="preview-nodes preview-scene"><i>A</i><i className="hot">B</i><i>C</i><b /><b /></div>;
  }
  if (kind === "dijkstra") {
    return <div className="preview-city preview-scene"><i>0</i><i>2</i><i>4</i><b /><b /><small>cost</small></div>;
  }
  if (kind === "greedy") {
    return <div className="preview-intervals preview-scene"><i /><i className="hot" /><i /><small>finish first</small></div>;
  }
  return <div className="preview-memo preview-scene"><i>1</i><i>2</i><i className="hot">?</i><i>5</i><b>cache</b></div>;
}

export function AlgoRift() {
  const [view, setView] = useState<View>("home");
  const [progress, setProgress] = useState(DEFAULT_PROGRESS);
  const [ready, setReady] = useState(false);
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
    label: `G${nextWorld.level}`,
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
    const freshProgress = { ...DEFAULT_PROGRESS };
    progressRef.current = freshProgress;
    setProgress(freshProgress);
    window.localStorage.removeItem(STORAGE_KEY);
    setSelectedWorldLevel(1);
    setView("home");
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
            className={view === "world" ? "active" : ""}
            type="button"
            onClick={() => changeView("world")}
          >
            <Map size={16} /> Games
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
          {user && (
            <button
              type="button"
              className="header-signout"
              onClick={() => void signOut()}
              disabled={authBusy}
              aria-label="Sign out and restart as a guest from Game 1"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          )}
          <div
            className="header-progress"
            aria-label={`${progress.completedLevel} of ${worlds.length} games mastered`}
          >
            <span>{progress.completedLevel}/{worlds.length}</span>
            <i>
              <b style={{ width: `${(progress.completedLevel / worlds.length) * 100}%` }} />
            </i>
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
        <>
        <main className="minimal-home">
          <section className="minimal-hero">
            <div className="minimal-hero-copy">
              <span className="eyebrow">INTERACTIVE ALGORITHM LAB</span>
              <h1>Understand algorithms by moving them.</h1>
              <p>
                Eight visual mini-games. Each teaches one idea through direct
                interaction, immediate feedback, and a clear goal.
              </p>
              <div className="hero-buttons">
                <button
                  className="game-primary"
                  type="button"
                  onClick={() => startWorld(nextPlayableWorld)}
                >
                  <Play size={18} fill="currentColor" />
                  {progress.completedLevel >= worlds.length
                    ? "Replay final game"
                    : `Continue: ${nextWorld.title}`}
                </button>
                <button
                  className="quiet-button"
                  type="button"
                  onClick={() => changeView("world")}
                >
                  View learning path <ArrowRight size={17} />
                </button>
              </div>
            </div>

            <div className="next-game-card">
              <div className={`next-game-visual visual-${nextWorld.kind}`} aria-hidden="true">
                <span>{nextWorld.level.toString().padStart(2, "0")}</span>
                <GamePreview kind={nextWorld.kind} />
              </div>
              <div className="next-game-copy">
                <small>
                  {progress.completedLevel >= worlds.length ? "REPLAY" : "UP NEXT"}
                  {" "}· {nextWorld.difficulty}
                </small>
                <h2>{nextWorld.title}</h2>
                <strong>{nextWorld.topics}</strong>
                <p>{nextWorld.description}</p>
                <div className="compact-progress">
                  <span>{progress.completedLevel} of {worlds.length} mastered</span>
                  <i>
                    <b style={{ width: `${(progress.completedLevel / worlds.length) * 100}%` }} />
                  </i>
                </div>
              </div>
            </div>
          </section>

          <section className="home-path-preview" aria-label="Algorithm learning path">
            {worlds.map((world) => {
              const mastered = progress.completedLevel >= world.level;
              const current = world.level === nextPlayableWorld;
              return (
                <button
                  type="button"
                  key={world.level}
                  className={[mastered ? "mastered" : "", current ? "current" : ""].join(" ")}
                  disabled={world.level > progress.completedLevel + 1}
                  onClick={() => startWorld(world.level)}
                  aria-label={`${world.title}: ${mastered ? "mastered" : current ? "play next" : "locked"}`}
                >
                  <span>{mastered ? <Check size={15} /> : world.level}</span>
                  <small>{world.topics}</small>
                </button>
              );
            })}
          </section>
        </main>

        <main className="home-view legacy-home" aria-hidden="true">
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
                    ? `Replay Game ${worlds.length}`
                    : `Start Game ${nextPlayableWorld}`}
                </button>
                <button
                  className="game-secondary"
                  type="button"
                  onClick={() => changeView("world")}
                >
                  Learn algorithms <ArrowRight size={17} />
                </button>
              </div>
              <div className="first-mission">
                <span className="mission-number">{nextMission.label}</span>
                <div>
                  <small>NEXT MINI-GAME</small>
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

          <section className="learning-strip">
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
                  ? "Game 1 is ready."
                  : progress.completedLevel >= worlds.length
                    ? "All current games are mastered."
                    : `Game ${progress.completedLevel + 1} is unlocked.`}
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
                Open game library <ArrowRight size={16} />
              </button>
            </div>
          </section>
        </main>
        </>
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
          <div className="world-heading curriculum-heading">
            <div>
              <span className="section-label"><Map size={15} /> Your progress</span>
              <h1>Pick your next algorithm game</h1>
              <p>
                Each card is a different toy box: scan, swap, route, schedule,
                or forge the rule until it clicks.
              </p>
            </div>
            <div className="world-summary">
              <strong>{progress.completedLevel} / {worlds.length}</strong>
              <span>games mastered</span>
            </div>
          </div>

          <section className="curriculum-guide" aria-label="How AlgoRift works">
            <article>
              <span>1</span>
              <div>
                <strong>Play the mechanic</strong>
                <p>The correct move is the algorithm rule, not a separate quiz.</p>
              </div>
            </article>
            <article>
              <span>2</span>
              <div>
                <strong>Watch the board react</strong>
                <p>Wrong moves explain why; right moves reshape the game state.</p>
              </div>
            </article>
            <article>
              <span>3</span>
              <div>
                <strong>Unlock harder ideas</strong>
                <p>Search and sorting lead toward graphs, greedy choices, and DP.</p>
              </div>
            </article>
          </section>

          <section className="path-status" aria-label="Progression summary">
            <div>
              <Trophy size={18} />
              <span><strong>{progress.completedLevel}</strong> mastered</span>
            </div>
            <div className="path-status-track">
              <span style={{ width: `${(progress.completedLevel / worlds.length) * 100}%` }} />
            </div>
            <span>Next: <strong>{nextWorld.title}</strong></span>
          </section>

          <section className="world-path mini-game-library">
            {worlds.map((world) => {
              const complete = progress.completedLevel >= world.level;
              const playable = world.level <= progress.completedLevel + 1;
              const recommended =
                !complete && world.level === progress.completedLevel + 1;
              return (
                <article
                  className={[
                    "world-level",
                    `world-${world.color}`,
                    complete ? "complete" : "",
                    playable ? "available" : "locked",
                    recommended ? "recommended" : "",
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
                  <div className="level-card path-card">
                    <div className={`path-card-visual visual-${world.kind}`} aria-hidden="true">
                      <span>{world.level.toString().padStart(2, "0")}</span>
                      <GamePreview kind={world.kind} />
                    </div>
                    <div className="level-card-top">
                      <span>GAME {world.level}</span>
                      <span>
                        {complete
                          ? "MASTERED"
                          : recommended
                            ? "PLAY NEXT"
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
                    <div className="card-learn-line">
                      <Terminal size={15} />
                      <span>{world.lesson}</span>
                    </div>
                    {playable ? (
                      <button type="button" onClick={() => startWorld(world.level)}>
                        {complete ? "Replay mini-game" : "Start mini-game"}
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <span className="unlock-note">
                        <LockKeyhole size={14} />
                        Master Game {world.level - 1} first
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
                <h2>Return to Game 1</h2>
                <p>
                  This removes earned XP and completed games
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
            <a
              href="https://www.linkedin.com/in/immanuelgnanaseelan/"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn <ArrowRight size={15} />
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
  { node: 50, choices: [25, 75], correct: 75, hint: "68 is larger than 50, so choose the right child: 75." },
  { node: 75, choices: [60, 90], correct: 60, hint: "68 is smaller than 75, so choose the left child: 60." },
  { node: 60, choices: [55, 68], correct: 68, hint: "68 is larger than 60, so choose the right child: 68." },
] as const;
const BFS_ORDER = ["A", "B", "C", "D", "E", "F"];
const DIJKSTRA_STEPS = [
  { frontier: ["B:4", "C:2", "D:8"], correct: "C" },
  { frontier: ["B:4", "E:5", "D:8"], correct: "B" },
  { frontier: ["E:5", "D:7", "F:11"], correct: "E" },
  { frontier: ["D:7", "F:9"], correct: "D" },
] as const;
const GREEDY_INTERVALS = [
  { id: "B", label: "B", start: 1, finish: 3 },
  { id: "A", label: "A", start: 0, finish: 5 },
  { id: "D", label: "D", start: 3, finish: 5 },
  { id: "C", label: "C", start: 4, finish: 7 },
  { id: "E", label: "E", start: 5, finish: 8 },
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
  const [sortCursor, setSortCursor] = useState(0);
  const [sortPass, setSortPass] = useState(1);
  const [stack, setStack] = useState<string[]>([]);
  const [stackDock, setStackDock] = useState(["A", "B", "C"]);
  const [stackPhase, setStackPhase] = useState<"load" | "dispatch">("load");
  const [treeStep, setTreeStep] = useState(0);
  const [graphStep, setGraphStep] = useState(0);
  const [dijkstraStep, setDijkstraStep] = useState(0);
  const [greedyStep, setGreedyStep] = useState(0);
  const [greedySelected, setGreedySelected] = useState<string[]>([]);
  const [dpIndex, setDpIndex] = useState(2);
  const [message, setMessage] = useState(world.lesson);
  const [mistakes, setMistakes] = useState(0);
  const [complete, setComplete] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

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
    setSortCursor(0);
    setSortPass(1);
    setStack([]);
    setStackDock(["A", "B", "C"]);
    setStackPhase("load");
    setTreeStep(0);
    setGraphStep(0);
    setDijkstraStep(0);
    setGreedyStep(0);
    setGreedySelected([]);
    setDpIndex(2);
    setMessage(world.lesson);
    setMistakes(0);
    setComplete(false);
    setShowGuide(false);
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

  function resolveSort(action: "keep" | "swap") {
    const left = packets[sortCursor];
    const right = packets[sortCursor + 1];
    const shouldSwap = left > right;
    if ((action === "swap") !== shouldSwap) {
      miss(
        shouldSwap
          ? `${left} is larger than ${right}. Swap this pair so the larger value moves right.`
          : `${left} is already smaller than ${right}. Keep this pair in place.`,
      );
      return;
    }

    const next = [...packets];
    if (shouldSwap) {
      next[sortCursor] = right;
      next[sortCursor + 1] = left;
    }
    setPackets(next);

    const atPassEnd = sortCursor >= next.length - 2;
    if (atPassEnd && isSorted(next)) {
      completeMiniGame("Sorted. Every neighboring pair is now in ascending order.");
      return;
    }

    if (atPassEnd) {
      setSortCursor(0);
      setSortPass((current) => current + 1);
      setMessage(`Pass ${sortPass} complete. Start again from the left; large values have moved right.`);
      return;
    }

    setSortCursor((current) => current + 1);
    setMessage(
      shouldSwap
        ? `${left} and ${right} swapped. Move the scanner one pair to the right.`
        : `${left} and ${right} stayed in order. Move the scanner one pair to the right.`,
    );
  }

  function loadStack(value: string) {
    const expected = stackDock[0];
    if (value !== expected) {
      miss(`The loading manifest is A, then B, then C. Load ${expected} next.`);
      return;
    }
    const nextDock = stackDock.slice(1);
    const nextStack = [...stack, value];
    setStack(nextStack);
    setStackDock(nextDock);
    if (nextDock.length === 0) {
      setStackPhase("dispatch");
      setMessage("Loading complete. Now dispatch every crate using stack rules.");
      return;
    }
    setMessage(`${value} pushed onto the stack. Load ${nextDock[0]} next.`);
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

  function chooseTree(value: number) {
    const step = TREE_PATH[treeStep];
    if (!(step.choices as readonly number[]).includes(value)) {
      miss(`Choose one of the two children connected to ${step.node}.`);
      return;
    }
    if (value !== step.correct) {
      miss(step.hint);
      return;
    }
    const nextStep = treeStep + 1;
    setTreeStep(nextStep);
    if (nextStep >= TREE_PATH.length) {
      completeMiniGame("Route found: 50 -> 75 -> 60 -> 68. BST comparisons guided every branch.");
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
  const treeChoices = (TREE_PATH[treeStep]?.choices ?? []) as readonly number[];
  const treeVisited = [50, 75, 60].slice(0, treeStep);
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
  const currentLeftPacket = packets[sortCursor] ?? packets[Math.max(0, packets.length - 2)];
  const currentRightPacket = packets[sortCursor + 1] ?? packets[packets.length - 1];
  const moveCoach =
    world.kind === "binary"
      ? `The middle value is ${pivotValue}. Compare it to 42, then cut the half that cannot win.`
      : world.kind === "sort"
        ? `Compare ${currentLeftPacket} and ${currentRightPacket}. Swap only when the left packet is larger.`
        : world.kind === "stack"
          ? stackPhase === "load"
            ? "Push crates into the lift. The newest crate becomes the only legal exit."
            : `Pop the top crate first: ${stack[stack.length - 1] ?? "nothing"} is blocking everything below it.`
          : world.kind === "tree"
            ? `${currentTreeNode} is your current branch. Smaller targets go left; larger targets go right.`
            : world.kind === "graph"
              ? "BFS is a rescue line. Serve the front of the queue before touching later discoveries."
              : world.kind === "dijkstra"
                ? "Frontier costs are tentative. Compare every visible cost and lock the smallest one."
                : world.kind === "greedy"
                  ? "Take the event that finishes earliest and still fits, so future slots stay open."
                  : `Use cached answers: fib(${dpIndex}) depends on fib(${Math.max(0, dpIndex - 1)}) and fib(${Math.max(0, dpIndex - 2)}).`;
  const progressPercent = Math.min(
    100,
    world.kind === "binary"
      ? ((BINARY_VALUES.length - (binaryHigh - binaryLow + 1)) / (BINARY_VALUES.length - 1)) * 100
      : world.kind === "sort"
        ? ((sortPass - 1) * (SORT_START.length - 1) + sortCursor) / 12 * 100
        : world.kind === "stack"
          ? stackPhase === "load"
            ? (stack.length / 6) * 100
            : ((3 + (3 - stack.length)) / 6) * 100
          : world.kind === "tree"
            ? (treeStep / TREE_PATH.length) * 100
            : world.kind === "graph"
              ? (graphStep / BFS_ORDER.length) * 100
              : world.kind === "dijkstra"
                ? (dijkstraStep / DIJKSTRA_STEPS.length) * 100
                : world.kind === "greedy"
                  ? (greedyStep / GREEDY_ORDER.length) * 100
                  : (dpIndex / DP_VALUES.length) * 100,
  );

  return (
    <main className="mini-game-view">
      <header className="mini-game-toolbar">
        <button type="button" onClick={onExit}>
          <ArrowLeft size={17} /> Exit
        </button>
        <div>
          <span>GAME {world.level}</span>
          <strong>{world.title}</strong>
        </div>
        <div className="mini-toolbar-actions">
          <button
            type="button"
            aria-expanded={showGuide}
            onClick={() => setShowGuide((shown) => !shown)}
          >
            <BookOpen size={16} /> {showGuide ? "Hide guide" : "How it works"}
          </button>
          <button type="button" onClick={resetMiniGame}>
            <RotateCcw size={16} /> Restart
          </button>
        </div>
      </header>

      <section className={`mini-game-shell game-theme-${world.kind} world-${world.color} ${showGuide ? "guide-open" : ""}`}>
        {showGuide && (
        <aside className="mini-game-brief">
          <span>{world.difficulty} · {world.gameType}</span>
          <h1>{world.title}</h1>
          <strong>{world.topics}</strong>
          <p>{world.description}</p>
          <div className="mini-lesson-card">
            <small>WHAT THIS TEACHES</small>
            <p>{world.lesson}</p>
          </div>
        </aside>
        )}

        <div className="mini-game-board">
          <div className="mini-game-hud">
            <div>
              <small>MISSION PROGRESS</small>
              <strong>{Math.round(progressPercent)}%</strong>
            </div>
            <div className="mini-progress-track">
              <span style={{ width: `${progressPercent}%` }} />
            </div>
            <div>
              <small>MISREADS</small>
              <strong>{mistakes}</strong>
            </div>
          </div>
          <div
            className={mistakes > 0 ? "board-feedback warn" : "board-feedback"}
            role="status"
            aria-live="polite"
          >
            <span>{complete ? <Check size={16} /> : <Sparkles size={16} />}</span>
            <p>{message}</p>
          </div>
          <div className="move-coach">
            <span>MAKE THE RULE MOVE</span>
            <p>{moveCoach}</p>
          </div>

          {world.kind === "binary" && (
            <section className="binary-game" aria-label="Binary search scanner">
              <div className="scanner-status">
                <span className="scanner-pulse" />
                SIGNAL RANGE {binaryLow + 1}-{binaryHigh + 1}
              </div>
              <div className="binary-radar">
                <i className="radar-ring ring-one" />
                <i className="radar-ring ring-two" />
                <i className="radar-sweep" />
                <div className="radar-target">
                  <small>LOCK TARGET</small>
                  <strong>42</strong>
                </div>
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
              <div className="conveyor-status">
                <span>PASS {sortPass}</span>
                <strong>
                  Compare positions {sortCursor + 1} and {sortCursor + 2}
                </strong>
              </div>
              <div className="packet-factory">
                <div className="factory-scanner">
                  <span>PAIR SCANNER</span>
                </div>
                <div className="packet-row">
                  {packets.map((packet, index) => (
                    <span
                      className={[
                        "mini-packet",
                        index === sortCursor || index === sortCursor + 1
                          ? "comparing"
                          : "",
                      ].join(" ")}
                      key={`${packet}-${index}`}
                    >
                      <small>PKT</small>
                      {packet}
                    </span>
                  ))}
                </div>
                <div className="conveyor-belt" aria-hidden="true">
                  {packets.map((_, index) => <i key={index} />)}
                </div>
              </div>
              <div className="sort-decision">
                <p>
                  Should {packets[sortCursor]} stay before {packets[sortCursor + 1]}?
                </p>
                <div className="mini-actions two">
                  <button type="button" disabled={complete} onClick={() => resolveSort("keep")}>
                    Keep order
                  </button>
                  <button type="button" disabled={complete} onClick={() => resolveSort("swap")}>
                    Swap pair
                  </button>
                </div>
              </div>
            </section>
          )}

          {world.kind === "stack" && (
            <section className="stack-mini-game" aria-label="Stack cargo elevator">
              <div className="stack-mission">
                <strong>{stackPhase === "load" ? "LOAD MANIFEST" : "DISPATCH MODE"}</strong>
                <span>
                  {stackPhase === "load"
                    ? "Push A, B, C into the lift."
                    : "Remove all cargo using LIFO."}
                </span>
              </div>
              {stackPhase === "load" && (
                <div className="stack-dock">
                  {stackDock.map((crate) => (
                    <button type="button" key={crate} onClick={() => loadStack(crate)}>
                      Load {crate}
                    </button>
                  ))}
                </div>
              )}
              <div className="elevator-shaft">
                <div className="elevator-cable" />
                <span className="floor-label">TOP EXITS FIRST</span>
                <div className="stack-tower">
                  {stack.map((crate, index) => (
                    <button
                      className={index === stack.length - 1 ? "top" : ""}
                      disabled={complete || stackPhase === "load"}
                      key={crate}
                      onClick={() => popStack(crate)}
                      type="button"
                    >
                      <small>MEMORY CRATE</small>
                      {crate}
                    </button>
                  ))}
                  {stack.length === 0 && (
                    <span className="empty-stack">EMPTY LIFT</span>
                  )}
                </div>
              </div>
              <p>
                {stackPhase === "load"
                  ? "Each loaded crate is pushed onto the top."
                  : "Only the top crate can leave the elevator."}
              </p>
            </section>
          )}

          {world.kind === "tree" && (
            <section className="tree-mini-game" aria-label="Binary search tree branch finder">
              <div className="path-chip-row">
                <span>START 50</span>
                {treeStep >= 1 && <span>RIGHT 75</span>}
                {treeStep >= 2 && <span>LEFT 60</span>}
                {treeStep >= 3 && <span>RIGHT 68</span>}
              </div>
              <div className="tree-node-map">
                <i className="tree-branch branch-root-left" />
                <i className="tree-branch branch-root-right" />
                <i className="tree-branch branch-inner-left" />
                <i className="tree-branch branch-inner-right" />
                <span className={treeStep === 0 ? "current" : "visited"}>50</span>
                {[25, 75, 55, 60, 68, 90].map((value) => {
                  const isChoice = treeChoices.includes(value);
                  const isVisited = treeVisited.includes(value);
                  const isCurrent = currentTreeNode === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      className={[
                        value === 68 ? "target" : "",
                        isChoice ? "choice" : "",
                        isVisited ? "visited" : "",
                        isCurrent ? "current" : "",
                      ].join(" ")}
                      disabled={complete || !isChoice}
                      onClick={() => chooseTree(value)}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              <div className="mini-rule-line">
                <strong>Target 68</strong>
                <span>Click a child of {currentTreeNode}</span>
              </div>
            </section>
          )}

          {world.kind === "graph" && (
            <section className="graph-mini-game" aria-label="BFS queue rescue">
              <div className="rescue-dispatch">
                <span>RESCUE DISPATCH</span>
                <strong>Visit the station waiting at the front of the queue.</strong>
              </div>
              <div className="graph-network">
                <i className="edge edge-ab" />
                <i className="edge edge-ac" />
                <i className="edge edge-bd" />
                <i className="edge edge-be" />
                <i className="edge edge-cf" />
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
              <p>Process the glowing queue-front node, then its neighbors join the back.</p>
            </section>
          )}

          {world.kind === "dijkstra" && (
            <section className="dijkstra-mini-game" aria-label="Dijkstra route dispatcher">
              <div className="route-control">
                <span className="route-origin">START 0</span>
                <div>
                  {DIJKSTRA_STEPS.slice(0, dijkstraStep).map((step) => (
                    <span key={step.correct}>LOCKED {step.correct}</span>
                  ))}
                </div>
              </div>
              <div className="weighted-map">
                <i className="city-road road-one" />
                <i className="city-road road-two" />
                <i className="city-road road-three" />
                <i className="city-road road-four" />
                <span className="city-origin">0</span>
                {currentDijkstra.frontier.map((route) => (
                  <button
                    className={`city-node city-${route.split(":")[0].toLowerCase()}`}
                    disabled={complete}
                    key={route}
                    onClick={() => chooseDijkstra(route.split(":")[0])}
                    type="button"
                  >
                    <small>FRONTIER</small>
                    <strong>{route.split(":")[0]}</strong>
                    <span>cost {route.split(":")[1]}</span>
                  </button>
                ))}
              </div>
              <p>Lock the node with the lowest known distance.</p>
            </section>
          )}

          {world.kind === "greedy" && (
            <section className="greedy-mini-game" aria-label="Greedy interval planner">
              <div className="schedule-wall">
                <div className="timeline-scale">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="interval-row">
                  {GREEDY_INTERVALS.map((interval, index) => (
                    <button
                      className={greedySelected.includes(interval.id) ? "selected" : ""}
                      disabled={complete || greedySelected.includes(interval.id)}
                      key={interval.id}
                      onClick={() => chooseGreedy(interval.id)}
                      style={{
                        gridColumn: `${interval.start + 1} / ${interval.finish + 1}`,
                        gridRow: index + 1,
                      }}
                      type="button"
                    >
                      <span>EVENT {interval.label}</span>
                      <small>{interval.start}:00-{interval.finish}:00</small>
                    </button>
                  ))}
                </div>
              </div>
              <p>Goal: select the most compatible events by earliest finish time.</p>
            </section>
          )}

          {world.kind === "dp" && (
            <section className="dp-mini-game" aria-label="Dynamic programming memo forge">
              <div className="memo-equation">
                <small>BUILD RULE</small>
                <strong>
                  fib({dpIndex}) = fib({Math.max(0, dpIndex - 1)}) + fib({Math.max(0, dpIndex - 2)})
                </strong>
              </div>
              <div className="memo-forge">
                <div className="forge-core"><span>CACHE</span></div>
                <div className="memo-row">
                  {dpVisible.map(({ value, visible, active }, index) => (
                    <span className={active ? "active" : ""} key={index}>
                      <small>fib({index})</small>
                      <strong>{visible ? value : active ? "?" : "locked"}</strong>
                    </span>
                  ))}
                </div>
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
              <span>GAME {world.level} CLEAR</span>
              <h2>Next game unlocked.</h2>
              <p>
                You cleared {world.topics} by playing its core rule, not by
                memorizing a definition.
              </p>
              <div className="canvas-complete-stats">
                <strong>GAME {world.level}</strong>
                <strong>{world.gameType}</strong>
                <strong>UNLOCKED</strong>
              </div>
              <button type="button" onClick={onExit}>
                Return to game library <ArrowRight size={17} />
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
