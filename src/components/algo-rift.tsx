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
  | "dp"
  | "sortlab"
  | "dfs"
  | "mst"
  | "huffman";

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
  {
    level: 9,
    title: "Sorting Arsenal",
    realm: "Algorithm Workshop",
    topics: "Insertion · Selection · Exchange · Merge · Quick · Heap Sort",
    color: "orange",
    difficulty: "Hard",
    kind: "sortlab",
    gameType: "Six-Method Gauntlet",
    description:
      "Solve six sorting stations where every algorithm demands a different move.",
    lesson:
      "Sorting algorithms can reach the same order through very different strategies, costs, and data movement.",
  },
  {
    level: 10,
    title: "Depth Dive",
    realm: "Traversal Caverns",
    topics: "Depth-First Search",
    color: "violet",
    difficulty: "Hard",
    kind: "dfs",
    gameType: "Stack Expedition",
    description:
      "Explore one branch as deeply as possible before backtracking.",
    lesson:
      "DFS uses a stack, explicit or recursive, to follow a path deeply before returning to unfinished branches.",
  },
  {
    level: 11,
    title: "Grid Architect",
    realm: "Power Network",
    topics: "Minimum Spanning Trees",
    color: "gold",
    difficulty: "Hard",
    kind: "mst",
    gameType: "Kruskal Builder",
    description:
      "Connect every station with the cheapest safe edges and no cycles.",
    lesson:
      "Kruskal's algorithm builds an MST by accepting the lightest edge that connects two different components.",
  },
  {
    level: 12,
    title: "Code Compressor",
    realm: "Signal Archive",
    topics: "Huffman Compression",
    color: "rose",
    difficulty: "Boss",
    kind: "huffman",
    gameType: "Frequency Fusion",
    description:
      "Repeatedly merge the two least frequent symbols into a compact prefix tree.",
    lesson:
      "Huffman coding minimizes weighted path length by repeatedly combining the two smallest frequencies.",
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
  if (kind === "dp") {
    return <div className="preview-memo preview-scene"><i>1</i><i>2</i><i className="hot">?</i><i>5</i><b>cache</b></div>;
  }
  if (kind === "sortlab") {
    return <div className="preview-arsenal preview-scene"><i>INS</i><i>QCK</i><i>HEAP</i></div>;
  }
  if (kind === "dfs") {
    return <div className="preview-depth preview-scene"><i>A</i><i>B</i><i>C</i><b /></div>;
  }
  if (kind === "mst") {
    return <div className="preview-mst preview-scene"><i>2</i><i>4</i><i>7</i><b /><b /></div>;
  }
  return <div className="preview-huffman preview-scene"><i>A:2</i><i>B:3</i><strong>5</strong></div>;
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
                Twelve visual mini-games. Each teaches one idea through direct
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
            <span>
              {progress.completedLevel >= worlds.length ? (
                <strong>Campaign complete</strong>
              ) : (
                <>Next: <strong>{nextWorld.title}</strong></>
              )}
            </span>
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

const BINARY_CHALLENGES = [
  { values: [3, 8, 12, 17, 23, 31, 42], target: 42 },
  { values: [4, 9, 15, 22, 31, 47, 58, 63, 79], target: 47 },
  { values: [2, 7, 14, 19, 27, 35, 44, 52, 61, 73, 88], target: 27 },
] as const;
const SORT_CHALLENGES = [
  [6, 3, 8, 1, 5],
  [9, 4, 7, 2, 8, 1],
  [12, 5, 9, 3, 11, 2, 7],
] as const;
const STACK_CHALLENGES = [
  ["A", "B", "C"],
  ["K", "M", "R", "T"],
  ["1", "2", "3", "4", "5"],
] as const;
const TREE_CHALLENGES = [
  {
    target: 68,
    path: [
      { node: 50, choices: [25, 75], correct: 75, hint: "68 is larger than 50, so take the right branch." },
      { node: 75, choices: [60, 90], correct: 60, hint: "68 is smaller than 75, so take the left branch." },
      { node: 60, choices: [55, 68], correct: 68, hint: "68 is larger than 60, so take the right branch." },
    ],
  },
  {
    target: 55,
    path: [
      { node: 50, choices: [25, 75], correct: 75, hint: "55 is larger than 50." },
      { node: 75, choices: [60, 90], correct: 60, hint: "55 is smaller than 75." },
      { node: 60, choices: [55, 68], correct: 55, hint: "55 is smaller than 60." },
    ],
  },
  {
    target: 90,
    path: [
      { node: 50, choices: [25, 75], correct: 75, hint: "90 is larger than 50." },
      { node: 75, choices: [60, 90], correct: 90, hint: "90 is larger than 75." },
    ],
  },
] as const;
const BFS_ADJACENCY: Record<string, string[]> = {
  A: ["B", "C"],
  B: ["D", "E"],
  C: ["F", "G"],
  D: [],
  E: ["H"],
  F: ["I"],
  G: [],
  H: [],
  I: [],
  J: ["K", "L"],
  K: ["M"],
  L: ["N", "P"],
  M: ["R"],
  N: ["Q"],
  P: ["S"],
  Q: [],
  R: [],
  S: [],
};
const BFS_CHALLENGES = [
  {
    nodes: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    order: ["A", "B", "C", "D", "E", "F", "G", "H", "I"],
    edges: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 8]],
  },
  {
    nodes: ["J", "K", "L", "M", "N", "P", "Q", "R", "S"],
    order: ["J", "K", "L", "M", "N", "P", "R", "Q", "S"],
    edges: [[0, 1], [0, 2], [1, 3], [2, 4], [2, 5], [3, 7], [4, 6], [5, 8]],
  },
] as const;
const DIJKSTRA_STEPS = [
  { frontier: ["A:7", "B:3", "C:9"], correct: "B" },
  { frontier: ["A:5", "C:9", "D:7", "E:11"], correct: "A" },
  { frontier: ["C:8", "D:7", "E:11", "F:13"], correct: "D" },
  { frontier: ["C:8", "E:9", "F:12", "G:15"], correct: "C" },
  { frontier: ["E:9", "F:10", "G:14"], correct: "E" },
  { frontier: ["F:10", "G:12"], correct: "F" },
  { frontier: ["G:12"], correct: "G" },
] as const;
const GREEDY_INTERVALS = [
  { id: "B", label: "B", start: 1, finish: 3 },
  { id: "A", label: "A", start: 0, finish: 4 },
  { id: "C", label: "C", start: 3, finish: 5 },
  { id: "D", label: "D", start: 4, finish: 7 },
  { id: "E", label: "E", start: 5, finish: 7 },
  { id: "F", label: "F", start: 6, finish: 9 },
  { id: "G", label: "G", start: 7, finish: 9 },
  { id: "H", label: "H", start: 8, finish: 11 },
  { id: "I", label: "I", start: 9, finish: 12 },
  { id: "J", label: "J", start: 10, finish: 13 },
] as const;
const GREEDY_ORDER = ["B", "C", "E", "G", "I"];
const DP_VALUES = [0, 1, 1, 2, 3, 5, 8, 13, 21];
const GRAPH_POSITIONS = [
  { x: 50, y: 12 },
  { x: 25, y: 34 },
  { x: 75, y: 34 },
  { x: 12, y: 60 },
  { x: 38, y: 60 },
  { x: 62, y: 60 },
  { x: 88, y: 60 },
  { x: 35, y: 86 },
  { x: 65, y: 86 },
] as const;
const GRAPH_NODE_POSITIONS: Record<string, { x: number; y: number }> =
  Object.fromEntries(
    BFS_CHALLENGES[0].nodes.map((node, index) => [node, GRAPH_POSITIONS[index]]),
  );
const TREE_POSITIONS: Record<number, { x: number; y: number }> = {
  50: { x: 50, y: 12 },
  25: { x: 22, y: 38 },
  75: { x: 78, y: 38 },
  55: { x: 48, y: 86 },
  60: { x: 58, y: 62 },
  68: { x: 68, y: 86 },
  90: { x: 90, y: 62 },
};
const TREE_EDGES = [
  [50, 25],
  [50, 75],
  [75, 60],
  [75, 90],
  [60, 55],
  [60, 68],
] as const;
const DIJKSTRA_POSITIONS: Record<string, { x: number; y: number }> = {
  "0": { x: 9, y: 52 },
  A: { x: 30, y: 22 },
  B: { x: 30, y: 72 },
  C: { x: 51, y: 16 },
  D: { x: 51, y: 51 },
  E: { x: 52, y: 83 },
  F: { x: 76, y: 32 },
  G: { x: 84, y: 72 },
};
const DIJKSTRA_EDGES = [
  ["0", "A", 7],
  ["0", "B", 3],
  ["0", "C", 9],
  ["B", "A", 2],
  ["B", "D", 4],
  ["A", "D", 2],
  ["A", "C", 3],
  ["D", "C", 1],
  ["D", "E", 2],
  ["C", "F", 2],
  ["E", "F", 1],
  ["E", "G", 3],
  ["F", "G", 2],
] as const;
type SortLabMode =
  | "insert"
  | "select"
  | "exchange"
  | "merge"
  | "partition"
  | "heap";

const SORTLAB_MISSIONS: Array<{
  algorithm: string;
  mode: SortLabMode;
  prompt: string;
  rule: string;
  options: string[];
  correct: string;
  scene: string[];
  keyValue?: string;
  pivot?: string;
}> = [
  {
    algorithm: "Insertion Sort",
    mode: "insert",
    prompt: "The sorted shelf is [1, 3, 6, 8]. Where does key 4 slide in?",
    rule: "Shift larger values right until the key fits in the open gap.",
    options: ["Gap after 1", "Gap after 3", "Gap after 6"],
    correct: "Gap after 3",
    scene: ["1", "3", "6", "8"],
    keyValue: "4",
  },
  {
    algorithm: "Insertion Sort",
    mode: "insert",
    prompt: "The sorted shelf is [2, 5, 7, 10]. Where does key 6 slide in?",
    rule: "Everything left of the gap stays sorted after the key is inserted.",
    options: ["Gap after 2", "Gap after 5", "Gap after 7"],
    correct: "Gap after 5",
    scene: ["2", "5", "7", "10"],
    keyValue: "6",
  },
  {
    algorithm: "Selection Sort",
    mode: "select",
    prompt: "The first slot is empty. Spotlight the minimum value in the unsorted yard.",
    rule: "Selection sort scans the whole unsorted region, then moves its minimum forward.",
    options: ["7", "2", "9", "4"],
    correct: "2",
    scene: ["7", "2", "9", "4"],
  },
  {
    algorithm: "Selection Sort",
    mode: "select",
    prompt: "The prefix [1, 3] is locked. Which unsorted value should be selected next?",
    rule: "Ignore the sorted prefix and find the minimum only in the remaining region.",
    options: ["8", "6", "5", "9"],
    correct: "5",
    scene: ["1", "3", "|", "8", "6", "5", "9"],
  },
  {
    algorithm: "Exchange Sort",
    mode: "exchange",
    prompt: "Choose the inversion that moves the smallest value toward the front.",
    rule: "An inversion is a larger value appearing before a smaller value.",
    options: ["8 <-> 3", "5 <-> 9", "3 <-> 9"],
    correct: "8 <-> 3",
    scene: ["8", "5", "3", "9"],
  },
  {
    algorithm: "Exchange Sort",
    mode: "exchange",
    prompt: "Which exchange removes the widest inversion in this row?",
    rule: "Exchange sort may compare distant values and swap an out-of-order pair.",
    options: ["6 <-> 1", "2 <-> 5", "5 <-> 1"],
    correct: "6 <-> 1",
    scene: ["6", "2", "5", "1"],
  },
  {
    algorithm: "Merge Sort",
    mode: "merge",
    prompt: "Two sorted lanes are ready. Which front value enters the output first?",
    rule: "Compare only the two lane fronts; remove the smaller one.",
    options: ["2", "3"],
    correct: "2",
    scene: ["2", "7", "9", "|", "3", "4", "8"],
  },
  {
    algorithm: "Merge Sort",
    mode: "merge",
    prompt: "After 2 leaves, compare the new lane fronts. Which value enters next?",
    rule: "A merge never searches the full lanes; their fronts contain the next candidate.",
    options: ["7", "3"],
    correct: "3",
    scene: ["7", "9", "|", "3", "4", "8"],
  },
  {
    algorithm: "Quick Sort",
    mode: "partition",
    prompt: "Route candidate 4 around pivot 6.",
    rule: "Values smaller than the pivot go left; larger values go right.",
    options: ["LEFT < 6", "RIGHT > 6", "KEEP AS PIVOT"],
    correct: "LEFT < 6",
    scene: ["9", "4", "6", "8", "2"],
    keyValue: "4",
    pivot: "6",
  },
  {
    algorithm: "Quick Sort",
    mode: "partition",
    prompt: "Route candidate 9 around pivot 6.",
    rule: "Partitioning groups values; it does not fully sort either side yet.",
    options: ["LEFT < 6", "RIGHT > 6", "KEEP AS PIVOT"],
    correct: "RIGHT > 6",
    scene: ["2", "5", "6", "9", "7"],
    keyValue: "9",
    pivot: "6",
  },
  {
    algorithm: "Heap Sort",
    mode: "heap",
    prompt: "Extract the maximum from this max-heap.",
    rule: "A max-heap keeps its largest value at the root.",
    options: ["12", "9", "7"],
    correct: "12",
    scene: ["12", "7", "9", "2", "4"],
  },
  {
    algorithm: "Heap Sort",
    mode: "heap",
    prompt: "Root 5 breaks the heap rule. Which child should rise to repair it?",
    rule: "During sift-down, swap with the larger child.",
    options: ["11", "9", "5"],
    correct: "11",
    scene: ["5", "11", "9", "3", "7"],
  },
];

const DFS_GRAPH_EDGES = [
  ["A", "B"],
  ["A", "C"],
  ["B", "D"],
  ["B", "E"],
  ["D", "H"],
  ["E", "F"],
  ["C", "F"],
  ["C", "G"],
  ["F", "I"],
] as const;
const DFS_GRAPH_ADJACENCY = DFS_GRAPH_EDGES.reduce<Record<string, string[]>>(
  (graph, [from, to]) => {
    graph[from] = [...(graph[from] ?? []), to];
    graph[to] = [...(graph[to] ?? []), from];
    return graph;
  },
  {},
);

const KRUSKAL_EDGES = [
  { from: "A", to: "B", weight: 2 },
  { from: "B", to: "C", weight: 3 },
  { from: "A", to: "C", weight: 4 },
  { from: "C", to: "D", weight: 5 },
  { from: "B", to: "D", weight: 6 },
  { from: "C", to: "E", weight: 7 },
  { from: "D", to: "E", weight: 8 },
  { from: "D", to: "F", weight: 9 },
  { from: "E", to: "F", weight: 10 },
] as const;
const KRUSKAL_POSITIONS: Record<string, { x: number; y: number }> = {
  A: { x: 12, y: 28 },
  B: { x: 36, y: 12 },
  C: { x: 38, y: 62 },
  D: { x: 65, y: 30 },
  E: { x: 68, y: 76 },
  F: { x: 90, y: 50 },
};

type HuffmanNode = {
  id: string;
  label: string;
  weight: number;
  left?: string;
  right?: string;
};
const HUFFMAN_SIGNALS: HuffmanNode[] = [
  { id: "A", label: "A", weight: 2 },
  { id: "D", label: "D", weight: 7 },
  { id: "B", label: "B", weight: 3 },
  { id: "E", label: "E", weight: 11 },
  { id: "C", label: "C", weight: 5 },
];

function insetLine(
  start: { x: number; y: number },
  end: { x: number; y: number },
  inset = 6,
) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const distance = Math.hypot(deltaX, deltaY) || 1;
  const unitX = deltaX / distance;
  const unitY = deltaY / distance;
  return {
    x1: start.x + unitX * inset,
    y1: start.y + unitY * inset,
    x2: end.x - unitX * inset,
    y2: end.y - unitY * inset,
  };
}

function isSorted(values: number[]) {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
}

function graphEdgeKey(from: string, to: string) {
  return [from, to].sort().join("-");
}

function createsKruskalCycle(
  accepted: string[],
  candidate: { from: string; to: string },
) {
  const graph: Record<string, string[]> = {};
  for (const edgeId of accepted) {
    const edge = KRUSKAL_EDGES.find(
      ({ from, to }) => graphEdgeKey(from, to) === edgeId,
    );
    if (!edge) continue;
    graph[edge.from] = [...(graph[edge.from] ?? []), edge.to];
    graph[edge.to] = [...(graph[edge.to] ?? []), edge.from];
  }

  const pending = [candidate.from];
  const seen = new Set<string>();
  while (pending.length > 0) {
    const node = pending.pop();
    if (!node || seen.has(node)) continue;
    if (node === candidate.to) return true;
    seen.add(node);
    pending.push(...(graph[node] ?? []));
  }
  return false;
}

function MiniGameWorld({
  world,
  onExit,
  onComplete,
}: MiniGameWorldProps) {
  const [challengeRound, setChallengeRound] = useState(0);
  const [binaryLow, setBinaryLow] = useState(0);
  const [binaryHigh, setBinaryHigh] = useState(BINARY_CHALLENGES[0].values.length - 1);
  const [packets, setPackets] = useState<number[]>([...SORT_CHALLENGES[0]]);
  const [sortCursor, setSortCursor] = useState(0);
  const [sortPass, setSortPass] = useState(1);
  const [stack, setStack] = useState<string[]>([]);
  const [stackDock, setStackDock] = useState<string[]>([...STACK_CHALLENGES[0]]);
  const [stackPhase, setStackPhase] = useState<"load" | "dispatch">("load");
  const [treeStep, setTreeStep] = useState(0);
  const [graphStep, setGraphStep] = useState(0);
  const [bfsQueue, setBfsQueue] = useState<string[]>(["A"]);
  const [bfsDiscovered, setBfsDiscovered] = useState<string[]>(["A"]);
  const [dijkstraStep, setDijkstraStep] = useState(0);
  const [greedyStep, setGreedyStep] = useState(0);
  const [greedySelected, setGreedySelected] = useState<string[]>([]);
  const [dpIndex, setDpIndex] = useState(2);
  const [sortLabStep, setSortLabStep] = useState(0);
  const [dfsStack, setDfsStack] = useState<string[]>(["A"]);
  const [dfsVisited, setDfsVisited] = useState<string[]>(["A"]);
  const [dfsTraversedEdges, setDfsTraversedEdges] = useState<string[]>([]);
  const [dfsBacktracks, setDfsBacktracks] = useState(0);
  const [mstCursor, setMstCursor] = useState(0);
  const [mstAccepted, setMstAccepted] = useState<string[]>([]);
  const [mstRejected, setMstRejected] = useState<string[]>([]);
  const [huffmanNodes, setHuffmanNodes] = useState<HuffmanNode[]>([
    ...HUFFMAN_SIGNALS,
  ]);
  const [huffmanSelected, setHuffmanSelected] = useState<string[]>([]);
  const [huffmanHistory, setHuffmanHistory] = useState<HuffmanNode[]>([]);
  const [message, setMessage] = useState(world.lesson);
  const [mistakes, setMistakes] = useState(0);
  const [complete, setComplete] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "reward" | "miss" | "clear">("idle");
  const [streak, setStreak] = useState(0);
  const [rewardText, setRewardText] = useState("");
  const [rewardKey, setRewardKey] = useState(0);
  const feedbackTimer = useRef<number | null>(null);
  const binaryChallenge =
    BINARY_CHALLENGES[challengeRound % BINARY_CHALLENGES.length];
  const treeChallenge =
    TREE_CHALLENGES[challengeRound % TREE_CHALLENGES.length];
  const bfsChallenge =
    BFS_CHALLENGES[challengeRound % BFS_CHALLENGES.length];
  const roundCount =
    world.kind === "binary"
      ? BINARY_CHALLENGES.length
      : world.kind === "sort"
        ? SORT_CHALLENGES.length
        : world.kind === "stack"
          ? STACK_CHALLENGES.length
          : world.kind === "tree"
            ? TREE_CHALLENGES.length
            : world.kind === "graph"
              ? BFS_CHALLENGES.length
              : 1;

  useEffect(() => {
    resetMiniGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.level]);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        window.clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  function flashFeedback(
    tone: "reward" | "miss" | "clear",
    label: string,
    hold = 520,
  ) {
    if (feedbackTimer.current) {
      window.clearTimeout(feedbackTimer.current);
    }
    setFeedbackTone(tone);
    setRewardText(label);
    setRewardKey((current) => current + 1);
    feedbackTimer.current = window.setTimeout(() => {
      setFeedbackTone("idle");
    }, hold);
  }

  function reward(label = "Nice move") {
    setStreak((current) => current + 1);
    flashFeedback("reward", label);
  }

  function prepareRound(nextRound: number) {
    setChallengeRound(nextRound);
    setStreak(0);
    if (world.kind === "binary") {
      setBinaryLow(0);
      setBinaryHigh(BINARY_CHALLENGES[nextRound].values.length - 1);
    } else if (world.kind === "sort") {
      setPackets([...SORT_CHALLENGES[nextRound]]);
      setSortCursor(0);
      setSortPass(1);
    } else if (world.kind === "stack") {
      setStack([]);
      setStackDock([...STACK_CHALLENGES[nextRound]]);
      setStackPhase("load");
    } else if (world.kind === "tree") {
      setTreeStep(0);
    } else if (world.kind === "graph") {
      setGraphStep(0);
      const start = BFS_CHALLENGES[nextRound].nodes[0];
      setBfsQueue([start]);
      setBfsDiscovered([start]);
    }
    setMessage(`Stage ${nextRound + 1} ready. The rule is the same, but the puzzle changed.`);
    flashFeedback("clear", "Stage clear", 850);
  }

  function finishRound(detail: string) {
    const nextRound = challengeRound + 1;
    if (nextRound < roundCount) {
      prepareRound(nextRound);
      return;
    }
    completeMiniGame(detail);
  }

  function completeMiniGame(detail: string) {
    if (complete) return;
    setStreak((current) => current + 1);
    flashFeedback("clear", "Game clear", 900);
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
    setStreak(0);
    flashFeedback("miss", "Re-check rule");
    setMessage(hint);
  }

  function resetMiniGame() {
    setChallengeRound(0);
    setBinaryLow(0);
    setBinaryHigh(BINARY_CHALLENGES[0].values.length - 1);
    setPackets([...SORT_CHALLENGES[0]]);
    setSortCursor(0);
    setSortPass(1);
    setStack([]);
    setStackDock([...STACK_CHALLENGES[0]]);
    setStackPhase("load");
    setTreeStep(0);
    setGraphStep(0);
    setBfsQueue(["A"]);
    setBfsDiscovered(["A"]);
    setDijkstraStep(0);
    setGreedyStep(0);
    setGreedySelected([]);
    setDpIndex(2);
    setSortLabStep(0);
    setDfsStack(["A"]);
    setDfsVisited(["A"]);
    setDfsTraversedEdges([]);
    setDfsBacktracks(0);
    setMstCursor(0);
    setMstAccepted([]);
    setMstRejected([]);
    setHuffmanNodes([...HUFFMAN_SIGNALS]);
    setHuffmanSelected([]);
    setHuffmanHistory([]);
    setMessage(world.lesson);
    setMistakes(0);
    setComplete(false);
    setShowGuide(false);
    setFeedbackTone("idle");
    setStreak(0);
    setRewardText("");
    setRewardKey(0);
  }

  function chooseBinary(action: "left" | "right" | "found") {
    const pivotIndex = Math.floor((binaryLow + binaryHigh) / 2);
    const pivot = binaryChallenge.values[pivotIndex];
    if (action === "found" && pivot === binaryChallenge.target) {
      finishRound("All scanner stages cleared. You repeatedly removed impossible halves.");
      return;
    }
    if (pivot < binaryChallenge.target && action === "right") {
      reward("Range cut");
      setBinaryLow(pivotIndex + 1);
      setMessage(`${pivot} is too small, so the left half is impossible. Keep the right half.`);
      return;
    }
    if (pivot > binaryChallenge.target && action === "left") {
      reward("Range cut");
      setBinaryHigh(pivotIndex - 1);
      setMessage(`${pivot} is too large, so the right half is impossible. Keep the left half.`);
      return;
    }
    miss(`Check the middle value first, then keep only the half where ${binaryChallenge.target} can still exist.`);
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
    reward(shouldSwap ? "Clean swap" : "Good keep");
    setPackets(next);

    const atPassEnd = sortCursor >= next.length - 2;
    if (atPassEnd && isSorted(next)) {
      finishRound("All conveyor stages sorted. Repeated local swaps produced global order.");
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
      miss(`Follow the manifest from left to right. Load ${expected} next.`);
      return;
    }
    const nextDock = stackDock.slice(1);
    const nextStack = [...stack, value];
    reward("Pushed");
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
    reward("Popped");
    setStack(next);
    if (next.length === 0) {
      finishRound("All cargo manifests cleared using last-in, first-out order.");
      return;
    }
    setMessage(`${value} popped from the top. The next removable crate is ${next[next.length - 1]}.`);
  }

  function chooseTree(value: number) {
    const step = treeChallenge.path[treeStep];
    if (!(step.choices as readonly number[]).includes(value)) {
      miss(`Choose one of the two children connected to ${step.node}.`);
      return;
    }
    if (value !== step.correct) {
      miss(step.hint);
      return;
    }
    const nextStep = treeStep + 1;
    reward("Branch read");
    setTreeStep(nextStep);
    if (nextStep >= treeChallenge.path.length) {
      finishRound("All targets located. Each comparison removed an entire subtree.");
      return;
    }
    setMessage(`Correct branch. Now compare ${treeChallenge.target} with ${treeChallenge.path[nextStep].node}.`);
  }

  function chooseGraph(node: string) {
    const expected = bfsQueue[0];
    if (node !== expected) {
      miss(`Serve the oldest waiting station first. ${expected} is currently at the front of the queue.`);
      return;
    }
    const newNeighbors = (BFS_ADJACENCY[node] ?? []).filter(
      (neighbor) => !bfsDiscovered.includes(neighbor),
    );
    const nextQueue = [...bfsQueue.slice(1), ...newNeighbors];
    const nextDiscovered = [...bfsDiscovered, ...newNeighbors];
    const nextStep = graphStep + 1;
    reward("Queue served");
    setGraphStep(nextStep);
    setBfsQueue(nextQueue);
    setBfsDiscovered(nextDiscovered);
    if (nextStep >= bfsChallenge.nodes.length) {
      finishRound("Both rescue networks cleared. Queue discipline kept each traversal level by level.");
      return;
    }
    setMessage(
      newNeighbors.length > 0
        ? `${node} rescued. New neighbors ${newNeighbors.join(", ")} joined the back of the queue.`
        : `${node} rescued. It had no new neighbors, so continue with the oldest waiting station.`,
    );
  }

  function chooseDijkstra(node: string) {
    const step = DIJKSTRA_STEPS[dijkstraStep];
    if (node !== step.correct) {
      miss("Dijkstra locks the unvisited node with the smallest known distance.");
      return;
    }
    const nextStep = dijkstraStep + 1;
    reward("Lowest locked");
    setDijkstraStep(nextStep);
    if (nextStep >= DIJKSTRA_STEPS.length) {
      completeMiniGame("Full city network solved. The lowest tentative distance won every round.");
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
    reward("Slot claimed");
    setGreedySelected(nextSelected);
    setGreedyStep(nextStep);
    if (nextStep >= GREEDY_ORDER.length) {
      completeMiniGame("Full-day schedule complete. Earliest finishing choices left room for five events.");
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
    reward("Cached");
    setDpIndex(nextIndex);
    if (nextIndex >= DP_VALUES.length) {
      completeMiniGame("Memo table extended through fib(8). Every answer reused cached subproblems.");
      return;
    }
    setMessage(`fib(${dpIndex}) cached as ${value}. Build the next cell from the cache.`);
  }

  function chooseSortLab(option: string) {
    const station = SORTLAB_MISSIONS[sortLabStep];
    if (option !== station.correct) {
      miss(`${station.algorithm}: ${station.rule}`);
      return;
    }
    const nextStep = sortLabStep + 1;
    reward(`${station.algorithm} move`);
    setSortLabStep(nextStep);
    if (nextStep >= SORTLAB_MISSIONS.length) {
      completeMiniGame(
        "Sorting arsenal mastered. You inserted, selected, exchanged, merged, partitioned, and repaired a heap.",
      );
      return;
    }
    const nextMission = SORTLAB_MISSIONS[nextStep];
    setMessage(
      nextMission.algorithm === station.algorithm
        ? `${station.algorithm} move cleared. One more challenge uses the same rule.`
        : `${station.algorithm} station cleared. Next workshop: ${nextMission.algorithm}.`,
    );
  }

  function chooseDfs(node: string) {
    const current = dfsStack[dfsStack.length - 1];
    if (dfsVisited.includes(node)) {
      miss(`${node} is already visited. DFS never opens the same cavern twice.`);
      return;
    }
    if (!(DFS_GRAPH_ADJACENCY[current] ?? []).includes(node)) {
      miss(`${node} is not connected to ${current}. Choose an unvisited neighbor of the active cavern.`);
      return;
    }
    const nextVisited = [...dfsVisited, node];
    reward("Depth advanced");
    setDfsStack((stack) => [...stack, node]);
    setDfsVisited(nextVisited);
    setDfsTraversedEdges((edges) => [
      ...edges,
      graphEdgeKey(current, node),
    ]);
    if (nextVisited.length >= Object.keys(DFS_GRAPH_ADJACENCY).length) {
      completeMiniGame(
        "Cavern mapped with DFS. You followed branches deeply, ignored visited loops, and backtracked when paths ended.",
      );
      return;
    }
    const openNeighbors = (DFS_GRAPH_ADJACENCY[node] ?? []).filter(
      (neighbor) => !nextVisited.includes(neighbor),
    );
    setMessage(
      openNeighbors.length > 0
        ? `${node} entered. Keep descending through any unvisited connected cavern.`
        : `${node} is a dead end. Backtrack to the previous cavern with unfinished paths.`,
    );
  }

  function backtrackDfs() {
    const current = dfsStack[dfsStack.length - 1];
    const openNeighbors = (DFS_GRAPH_ADJACENCY[current] ?? []).filter(
      (neighbor) => !dfsVisited.includes(neighbor),
    );
    if (openNeighbors.length > 0) {
      miss(`${current} still has an unvisited route. DFS goes deeper before it backtracks.`);
      return;
    }
    if (dfsStack.length <= 1) {
      miss("You are already at the entrance. Choose an unvisited connected cavern.");
      return;
    }
    const previous = dfsStack[dfsStack.length - 2];
    setDfsStack((stack) => stack.slice(0, -1));
    setDfsBacktracks((count) => count + 1);
    reward("Stack popped");
    setMessage(`Returned to ${previous}. Resume from its next unvisited route.`);
  }

  function inspectMstEdge(action: "accept" | "skip") {
    const edge = KRUSKAL_EDGES[mstCursor];
    if (!edge) return;
    const id = graphEdgeKey(edge.from, edge.to);
    const formsCycle = createsKruskalCycle(mstAccepted, edge);
    const shouldAccept = !formsCycle;
    if ((action === "accept") !== shouldAccept) {
      miss(
        formsCycle
          ? `${edge.from}-${edge.to} reconnects stations already linked. Accepting it would create a cycle.`
          : `${edge.from}-${edge.to} joins two separate components, so skipping it would waste the cheapest safe cable.`,
      );
      return;
    }

    const nextAccepted = shouldAccept ? [...mstAccepted, id] : mstAccepted;
    if (shouldAccept) {
      setMstAccepted(nextAccepted);
      reward("Cable accepted");
      setMessage(`${edge.from}-${edge.to} joined two components without a cycle.`);
    } else {
      setMstRejected((edges) => [...edges, id]);
      reward("Cycle blocked");
      setMessage(`${edge.from}-${edge.to} skipped because its endpoints were already connected.`);
    }

    if (nextAccepted.length >= Object.keys(KRUSKAL_POSITIONS).length - 1) {
      completeMiniGame(
        "Minimum spanning tree complete. Every station is connected with five safe cables and no cycle.",
      );
      return;
    }
    setMstCursor((cursor) => cursor + 1);
  }

  function selectHuffman(nodeId: string) {
    if (huffmanSelected.includes(nodeId)) {
      setHuffmanSelected((current) => current.filter((id) => id !== nodeId));
      return;
    }
    if (huffmanSelected.length >= 2) {
      miss("The fusion chamber holds exactly two signals. Deselect one before choosing another.");
      return;
    }
    const nextSelected = [...huffmanSelected, nodeId];
    setHuffmanSelected(nextSelected);
    setMessage(
      nextSelected.length === 1
        ? "First signal loaded. Scan every remaining frequency and choose the other minimum."
        : "Two signals loaded. Fuse them only if they are the two smallest frequencies.",
    );
  }

  function mergeHuffman() {
    if (huffmanSelected.length !== 2) {
      miss("Load exactly two signals before starting a fusion.");
      return;
    }
    const chosen = huffmanNodes
      .filter((node) => huffmanSelected.includes(node.id))
      .sort((left, right) => left.weight - right.weight);
    const twoSmallest = [...huffmanNodes]
      .sort((left, right) => left.weight - right.weight)
      .slice(0, 2);
    const correct =
      chosen.length === 2 &&
      chosen[0].id === twoSmallest[0].id &&
      chosen[1].id === twoSmallest[1].id;
    if (!correct) {
      setHuffmanSelected([]);
      miss(
        `Those are not both minimums. The two smallest visible weights are ${twoSmallest[0].weight} and ${twoSmallest[1].weight}.`,
      );
      return;
    }

    const merged: HuffmanNode = {
      id: `${chosen[0].id}${chosen[1].id}`,
      label: `${chosen[0].label}+${chosen[1].label}`,
      weight: chosen[0].weight + chosen[1].weight,
      left: chosen[0].id,
      right: chosen[1].id,
    };
    const nextNodes = huffmanNodes
      .filter((node) => !huffmanSelected.includes(node.id))
      .concat(merged);
    reward("Signals fused");
    setHuffmanNodes(nextNodes);
    setHuffmanSelected([]);
    setHuffmanHistory((history) => [...history, merged]);
    if (nextNodes.length === 1) {
      completeMiniGame(
        "Huffman tree complete. Rare symbols merged earlier and ended deeper, while frequent symbols stayed closer to the root with shorter codes.",
      );
      return;
    }
    setMessage(
      `${chosen[0].weight} + ${chosen[1].weight} fused into ${merged.weight}. Re-scan the unsorted signal pool for the next two minimums.`,
    );
  }

  const pivotIndex = Math.floor((binaryLow + binaryHigh) / 2);
  const pivotValue = binaryChallenge.values[pivotIndex];
  const visibleBinary = binaryChallenge.values.map((value, index) => ({
    value,
    active: index >= binaryLow && index <= binaryHigh,
    pivot: index === pivotIndex,
  }));
  const currentTreeNode =
    treeChallenge.path[treeStep]?.node ?? treeChallenge.target;
  const treeChoices = (treeChallenge.path[treeStep]?.choices ?? []) as readonly number[];
  const treeVisited: number[] = treeChallenge.path
    .slice(0, treeStep)
    .map((step) => step.node);
  const visibleTreeNodes = new Set<number>([
    50,
    ...treeVisited,
    currentTreeNode,
    ...treeChoices,
  ]);
  const graphVisible = bfsChallenge.nodes.map((node) => ({
    node,
    done: bfsDiscovered.includes(node) && !bfsQueue.includes(node),
    active: bfsQueue[0] === node,
    waiting: bfsQueue.includes(node) && bfsQueue[0] !== node,
    discovered: bfsDiscovered.includes(node),
  }));
  const currentDijkstra = DIJKSTRA_STEPS[dijkstraStep] ?? DIJKSTRA_STEPS[DIJKSTRA_STEPS.length - 1];
  const lockedDijkstraNodes = DIJKSTRA_STEPS.slice(0, dijkstraStep).map(
    (step) => step.correct,
  );
  const dijkstraFrontier = new globalThis.Map<string, string>(
    currentDijkstra.frontier.map((route) => {
      const [node, cost] = route.split(":");
      return [node, cost];
    }),
  );
  const dpVisible = DP_VALUES.map((value, index) => ({
    value,
    visible: index < dpIndex,
    active: index === dpIndex,
  }));
  const currentLeftPacket = packets[sortCursor] ?? packets[Math.max(0, packets.length - 2)];
  const currentRightPacket = packets[sortCursor + 1] ?? packets[packets.length - 1];
  const dpExpected = DP_VALUES[dpIndex] ?? DP_VALUES[DP_VALUES.length - 1];
  const visibleDpIndex = Math.min(dpIndex, DP_VALUES.length - 1);
  const dpChoices = Array.from(
    new Set([dpExpected, Math.max(1, dpExpected - 2), dpExpected + 1, dpExpected + 3]),
  ).sort((left, right) => left - right);
  const currentSortStation =
    SORTLAB_MISSIONS[sortLabStep] ??
    SORTLAB_MISSIONS[SORTLAB_MISSIONS.length - 1];
  const currentDfsNode = dfsStack[dfsStack.length - 1];
  const currentDfsNeighbors = DFS_GRAPH_ADJACENCY[currentDfsNode] ?? [];
  const dfsVisible = BFS_CHALLENGES[0].nodes.map((node) => ({
    node,
    done: dfsVisited.includes(node) && node !== currentDfsNode,
    active: node === currentDfsNode,
    available:
      !dfsVisited.includes(node) && currentDfsNeighbors.includes(node),
  }));
  const currentMstEdge =
    KRUSKAL_EDGES[mstCursor] ?? KRUSKAL_EDGES[KRUSKAL_EDGES.length - 1];
  const currentMstId = graphEdgeKey(currentMstEdge.from, currentMstEdge.to);
  const mstComponents = Object.keys(KRUSKAL_POSITIONS).length - mstAccepted.length;
  const lastGreedyFinish =
    greedySelected.length > 0
      ? GREEDY_INTERVALS.find(
          (interval) => interval.id === greedySelected[greedySelected.length - 1],
        )?.finish ?? 0
      : 0;
  const moveCoach =
    world.kind === "binary"
      ? `The middle value is ${pivotValue}. Compare it to ${binaryChallenge.target}, then cut the half that cannot win.`
      : world.kind === "sort"
        ? `Compare ${currentLeftPacket} and ${currentRightPacket}. Swap only when the left packet is larger.`
        : world.kind === "stack"
          ? stackPhase === "load"
            ? "Push crates into the lift. The newest crate becomes the only legal exit."
            : `Pop the top crate first: ${stack[stack.length - 1] ?? "nothing"} is blocking everything below it.`
          : world.kind === "tree"
            ? `${currentTreeNode} is your current branch. Compare it with ${treeChallenge.target}: smaller goes left, larger goes right.`
          : world.kind === "graph"
              ? "BFS is a waiting line: rescue the oldest station, then add its new neighbors to the back."
              : world.kind === "dijkstra"
                ? "Frontier costs are tentative. Compare every visible cost and lock the smallest one."
                : world.kind === "greedy"
                  ? "Take the event that finishes earliest and still fits, so future slots stay open."
                  : world.kind === "dp"
                    ? `Use cached answers: fib(${visibleDpIndex}) depends on fib(${Math.max(0, visibleDpIndex - 1)}) and fib(${Math.max(0, visibleDpIndex - 2)}).`
                    : world.kind === "sortlab"
                      ? `${currentSortStation.algorithm}: ${currentSortStation.rule}`
                      : world.kind === "dfs"
                        ? `You are at ${currentDfsNode}. Enter an unvisited connected cavern, or backtrack only when no route remains.`
                        : world.kind === "mst"
                          ? `Inspect cable ${currentMstEdge.from}-${currentMstEdge.to} with cost ${currentMstEdge.weight}. Accept it only if it joins separate components.`
                          : "Load the two smallest frequencies into the fusion chamber, then combine them into one signal.";
  const currentRoundProgress =
    world.kind === "binary"
      ? (binaryChallenge.values.length - (binaryHigh - binaryLow + 1)) /
        Math.max(1, binaryChallenge.values.length - 1)
      : world.kind === "sort"
        ? isSorted(packets)
          ? 1
          : Math.min(
              0.98,
              ((sortPass - 1) * (packets.length - 1) + sortCursor) /
                Math.max(1, packets.length * (packets.length - 1)),
            )
        : world.kind === "stack"
          ? stackPhase === "load"
            ? stack.length / (STACK_CHALLENGES[challengeRound].length * 2)
            : (STACK_CHALLENGES[challengeRound].length +
                (STACK_CHALLENGES[challengeRound].length - stack.length)) /
              (STACK_CHALLENGES[challengeRound].length * 2)
          : world.kind === "tree"
            ? treeStep / treeChallenge.path.length
            : world.kind === "graph"
              ? graphStep / bfsChallenge.nodes.length
              : world.kind === "dijkstra"
                ? dijkstraStep / DIJKSTRA_STEPS.length
                : world.kind === "greedy"
                  ? greedyStep / GREEDY_ORDER.length
                  : world.kind === "dp"
                    ? dpIndex / DP_VALUES.length
                    : world.kind === "sortlab"
                      ? sortLabStep / SORTLAB_MISSIONS.length
                      : world.kind === "dfs"
                        ? dfsVisited.length /
                          Object.keys(DFS_GRAPH_ADJACENCY).length
                        : world.kind === "mst"
                          ? mstAccepted.length /
                            (Object.keys(KRUSKAL_POSITIONS).length - 1)
                          : (HUFFMAN_SIGNALS.length - huffmanNodes.length) /
                            (HUFFMAN_SIGNALS.length - 1);
  const progressPercent = Math.min(
    100,
    ((challengeRound + currentRoundProgress) / roundCount) * 100,
  );

  return (
    <main className="mini-game-view">
      <header className="mini-game-toolbar">
        <button type="button" onClick={onExit}>
          <ArrowLeft size={17} /> Exit
        </button>
        <div>
          <span>
            GAME {world.level}
            {roundCount > 1 ? ` / STAGE ${challengeRound + 1} OF ${roundCount}` : ""}
          </span>
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

        <div className={`mini-game-board feedback-${feedbackTone}`}>
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
            <div className={streak > 1 ? "streak-meter live" : "streak-meter"}>
              <small>STREAK</small>
              <strong>{streak}x</strong>
            </div>
          </div>
          {rewardText && (
            <div
              className={`reward-pop reward-${feedbackTone}`}
              key={rewardKey}
              aria-hidden="true"
            >
              {rewardText}
            </div>
          )}
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
                  <strong>{binaryChallenge.target}</strong>
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
                <strong>Target {binaryChallenge.target}</strong>
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
                    ? `Push ${STACK_CHALLENGES[challengeRound].join(", ")} into the lift.`
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
                {treeChallenge.path.slice(1, treeStep + 1).map((step) => (
                  <span key={step.node}>VISIT {step.node}</span>
                ))}
              </div>
              <div className="tree-node-map">
                <svg
                  className="tree-lines"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {TREE_EDGES.map(([from, to]) => (
                    <line
                      className={
                        visibleTreeNodes.has(from) && visibleTreeNodes.has(to)
                          ? "revealed"
                          : "hidden"
                      }
                      key={`${from}-${to}`}
                      {...insetLine(TREE_POSITIONS[from], TREE_POSITIONS[to], 6)}
                    />
                  ))}
                </svg>
                <span
                  className={treeStep === 0 ? "current" : "visited"}
                  style={{
                    left: `${TREE_POSITIONS[50].x}%`,
                    top: `${TREE_POSITIONS[50].y}%`,
                  }}
                >
                  50
                </span>
                {[25, 75, 55, 60, 68, 90].map((value) => {
                  const isChoice = treeChoices.includes(value);
                  const isVisited = treeVisited.includes(value);
                  const isCurrent = currentTreeNode === value;
                  return (
                    <button
                      type="button"
                      key={value}
                      className={[
                        value === treeChallenge.target ? "target" : "",
                        isChoice ? "choice" : "",
                        isVisited ? "visited" : "",
                        isCurrent ? "current" : "",
                        visibleTreeNodes.has(value) ? "revealed" : "hidden-tree-node",
                      ].join(" ")}
                      disabled={complete || !isChoice || !visibleTreeNodes.has(value)}
                      onClick={() => chooseTree(value)}
                      style={{
                        left: `${TREE_POSITIONS[value].x}%`,
                        top: `${TREE_POSITIONS[value].y}%`,
                      }}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              <div className="mini-rule-line">
                <strong>Target {treeChallenge.target}</strong>
                <span>
                  Is the target smaller or larger than {currentTreeNode}? Choose
                  that child.
                </span>
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
                <svg
                  className="graph-lines"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {bfsChallenge.edges.map(([from, to]) => (
                    <line
                      key={`${from}-${to}`}
                      {...insetLine(
                        GRAPH_NODE_POSITIONS[from],
                        GRAPH_NODE_POSITIONS[to],
                        6,
                      )}
                    />
                  ))}
                </svg>
                {graphVisible.map(({ node, done, active, waiting, discovered }, index) => (
                  <button
                    className={[
                      done ? "done" : "",
                      active ? "active" : "",
                      waiting ? "waiting" : "",
                      discovered ? "discovered" : "hidden-node",
                    ].join(" ")}
                    disabled={complete || done || !active}
                    key={node}
                    onClick={() => chooseGraph(node)}
                    style={{
                      left: `${GRAPH_POSITIONS[index].x}%`,
                      top: `${GRAPH_POSITIONS[index].y}%`,
                    }}
                    type="button"
                  >
                    {node}
                  </button>
                ))}
              </div>
              <div className="queue-strip">
                Queue: {bfsQueue.join(" → ") || "empty"}
              </div>
              <p>
                Bright yellow is the front. Blue stations are waiting behind it.
                Rescue one station, then watch new neighbors enter the line.
              </p>
            </section>
          )}

          {world.kind === "dijkstra" && (
            <section className="dijkstra-mini-game" aria-label="Dijkstra route dispatcher">
              <div className="route-control">
                <span className="route-origin">START 0</span>
                <div>
                  <span>
                    {dijkstraStep} OF {DIJKSTRA_STEPS.length} LOCATIONS LOCKED
                  </span>
                </div>
              </div>
              <div className="plain-language-goal">
                <strong>Imagine these are delivery times.</strong>
                <span>
                  Compare only the white frontier circles. Lock the smallest
                  total cost; gray circles are not reachable yet.
                </span>
              </div>
              <div className="weighted-map">
                <svg
                  className="city-lines"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {DIJKSTRA_EDGES.map(([from, to, weight]) => {
                    const start = DIJKSTRA_POSITIONS[from];
                    const end = DIJKSTRA_POSITIONS[to];
                    return (
                      <g key={`${from}-${to}`}>
                        <line {...insetLine(start, end, 6.2)} />
                        <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2}>
                          {weight}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                <span className="city-origin">0</span>
                {Object.entries(DIJKSTRA_POSITIONS)
                  .filter(([node]) => node !== "0")
                  .map(([node, position]) => {
                    const cost = dijkstraFrontier.get(node);
                    const locked = lockedDijkstraNodes.includes(
                      node as (typeof lockedDijkstraNodes)[number],
                    );
                    return (
                      <button
                        className={`city-node ${locked ? "locked" : cost ? "frontier" : "unknown"}`}
                        disabled={complete || locked || !cost}
                        key={node}
                        onClick={() => chooseDijkstra(node)}
                        style={{ left: `${position.x}%`, top: `${position.y}%` }}
                        type="button"
                      >
                        <small>{locked ? "LOCKED" : cost ? "FRONTIER" : "UNKNOWN"}</small>
                        <strong>{node}</strong>
                        <span>{locked ? "done" : cost ? `cost ${cost}` : "∞"}</span>
                      </button>
                    );
                  })}
              </div>
              <p>Lock the node with the lowest known distance.</p>
            </section>
          )}

          {world.kind === "greedy" && (
            <section className="greedy-mini-game" aria-label="Greedy interval planner">
              <div className="plain-language-goal">
                <strong>Build the busiest possible day.</strong>
                <span>
                  Pick a meeting that does not overlap your schedule. Among
                  valid choices, the one ending earliest leaves the most room.
                </span>
              </div>
              <div className="schedule-wall">
              <div className="timeline-scale">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((tick) => (
                    <span key={tick}>{tick}</span>
                  ))}
                </div>
                <div className="interval-row">
                  {GREEDY_INTERVALS.map((interval, index) => (
                    <button
                      className={[
                        greedySelected.includes(interval.id) ? "selected" : "",
                        interval.start < lastGreedyFinish &&
                        !greedySelected.includes(interval.id)
                          ? "conflict"
                          : "",
                      ].join(" ")}
                      disabled={
                        complete ||
                        greedySelected.includes(interval.id) ||
                        interval.start < lastGreedyFinish
                      }
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
              <div className="plain-language-goal">
                <strong>Do not recalculate old answers.</strong>
                <span>
                  Read the two saved cells named in the formula, add them, and
                  store the result in the glowing empty cell.
                </span>
              </div>
              <div className="memo-equation">
                <small>BUILD RULE</small>
                <strong>
                  fib({dpIndex}) = fib({Math.max(0, dpIndex - 1)}) + fib({Math.max(0, dpIndex - 2)})
                </strong>
              </div>
              <div className="dp-helper">
                <span>
                  Saved fib({Math.max(0, dpIndex - 1)}) =
                  <strong>{DP_VALUES[Math.max(0, dpIndex - 1)]}</strong>
                </span>
                <span>+</span>
                <span>
                  Saved fib({Math.max(0, dpIndex - 2)}) =
                  <strong>{DP_VALUES[Math.max(0, dpIndex - 2)]}</strong>
                </span>
                <span>= ?</span>
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
                {dpChoices.map((value) => (
                  <button type="button" disabled={complete} key={value} onClick={() => chooseDp(value)}>
                    Fill {value}
                  </button>
                ))}
              </div>
            </section>
          )}

          {world.kind === "sortlab" && (
            <section className="sortlab-mini-game" aria-label="Advanced sorting algorithm gauntlet">
              <div className="station-progress">
                {SORTLAB_MISSIONS.map((station, index) => (
                  <span
                    className={index < sortLabStep ? "done" : index === sortLabStep ? "active" : ""}
                    key={`${station.algorithm}-${index}`}
                    title={station.algorithm}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <div className={`sorting-workbench sort-mode-${currentSortStation.mode}`}>
                <div className="sort-station-heading">
                  <small>{currentSortStation.algorithm.toUpperCase()}</small>
                  <span>MISSION {sortLabStep + 1} / {SORTLAB_MISSIONS.length}</span>
                </div>
                <div className="sort-rule-card">
                  <strong>THE MOVE</strong>
                  <p>{currentSortStation.rule}</p>
                </div>

                {currentSortStation.mode === "insert" && (
                  <div className="insertion-bench">
                    <div className="floating-key">
                      <small>KEY</small>
                      <strong>{currentSortStation.keyValue}</strong>
                    </div>
                    <div className="sorted-shelf">
                      {currentSortStation.scene.map((value) => (
                        <span key={value}>{value}</span>
                      ))}
                    </div>
                  </div>
                )}

                {currentSortStation.mode === "select" && (
                  <div className="selection-yard">
                    {currentSortStation.scene.map((value, index) => (
                      <span
                        className={
                          value === "|"
                            ? "divider"
                            : index < 2 && currentSortStation.scene.includes("|")
                              ? "locked"
                              : ""
                        }
                        key={`${value}-${index}`}
                      >
                        {value === "|" ? "UNSORTED" : value}
                      </span>
                    ))}
                  </div>
                )}

                {currentSortStation.mode === "exchange" && (
                  <div className="exchange-deck">
                    {currentSortStation.scene.map((value, index) => (
                      <span key={`${value}-${index}`}>{value}</span>
                    ))}
                  </div>
                )}

                {currentSortStation.mode === "merge" && (
                  <div className="merge-docks">
                    {currentSortStation.scene
                      .join(",")
                      .split(",|,")
                      .map((lane, laneIndex) => (
                        <div className="merge-lane" key={laneIndex}>
                          <small>LANE {laneIndex + 1}</small>
                          <div>
                            {lane.split(",").map((value, index) => (
                              <span className={index === 0 ? "front" : ""} key={`${laneIndex}-${value}-${index}`}>
                                {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    <div className="merge-output">OUTPUT</div>
                  </div>
                )}

                {currentSortStation.mode === "partition" && (
                  <div className="partition-gate">
                    <div className="partition-bin left">SMALLER</div>
                    <div className="pivot-tower">
                      <small>PIVOT</small>
                      <strong>{currentSortStation.pivot}</strong>
                    </div>
                    <div className="partition-bin right">LARGER</div>
                    <div className="partition-candidate">
                      ROUTE <strong>{currentSortStation.keyValue}</strong>
                    </div>
                  </div>
                )}

                {currentSortStation.mode === "heap" && (
                  <div className="heap-tree" aria-label="Max heap">
                    {currentSortStation.scene.map((value, index) => (
                      <span className={`heap-node heap-node-${index}`} key={`${value}-${index}`}>
                        {value}
                      </span>
                    ))}
                    <i className="heap-edge edge-a" />
                    <i className="heap-edge edge-b" />
                    <i className="heap-edge edge-c" />
                    <i className="heap-edge edge-d" />
                  </div>
                )}

                <h2>{currentSortStation.prompt}</h2>
                <div className={`sort-actions sort-actions-${currentSortStation.mode}`}>
                  {currentSortStation.options.map((option) => (
                    <button type="button" key={option} onClick={() => chooseSortLab(option)}>
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {world.kind === "dfs" && (
            <section className="dfs-mini-game" aria-label="Depth-first search expedition">
              <div className="plain-language-goal">
                <strong>Explore like a cave diver.</strong>
                <span>
                  Keep entering an unvisited connected cavern. At a dead end,
                  pop back to the previous cavern and try another route.
                </span>
              </div>
              <div className="dfs-dashboard">
              <div className="dfs-stack">
                  <small>LIVE CALL STACK</small>
                  <strong>{dfsStack.join(" -> ")}</strong>
                </div>
                <div className="dfs-stat">
                  <small>VISITED</small>
                  <strong>{dfsVisited.length} / {Object.keys(DFS_GRAPH_ADJACENCY).length}</strong>
                </div>
                <div className="dfs-stat">
                  <small>BACKTRACKS</small>
                  <strong>{dfsBacktracks}</strong>
                </div>
              </div>
              <div className="graph-network dfs-network">
                <svg
                  className="graph-lines"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {DFS_GRAPH_EDGES.map(([from, to]) => (
                    <line
                      className={
                        dfsTraversedEdges.includes(graphEdgeKey(from, to))
                          ? "traversed"
                          : ""
                      }
                      key={`${from}-${to}`}
                      {...insetLine(
                        GRAPH_NODE_POSITIONS[from],
                        GRAPH_NODE_POSITIONS[to],
                        6,
                      )}
                    />
                  ))}
                </svg>
                {dfsVisible.map(({ node, done, active, available }, index) => (
                  <button
                    className={[
                      done ? "done" : "",
                      active ? "active" : "",
                      available ? "available" : "",
                    ].join(" ")}
                    disabled={complete || done}
                    key={node}
                    onClick={() => chooseDfs(node)}
                    style={{
                      left: `${GRAPH_POSITIONS[index].x}%`,
                      top: `${GRAPH_POSITIONS[index].y}%`,
                    }}
                    type="button"
                  >
                    {node}
                  </button>
                ))}
              </div>
              <div className="dfs-controls">
                <div>
                  <small>CURRENT CAVERN</small>
                  <strong>{currentDfsNode}</strong>
                  <span>
                    {currentDfsNeighbors.filter((node) => !dfsVisited.includes(node)).length > 0
                      ? "An unvisited route is still available."
                      : "Dead end reached. Backtrack now."}
                  </span>
                </div>
                <button type="button" onClick={backtrackDfs}>
                  <ArrowLeft size={18} /> Backtrack one level
                </button>
              </div>
            </section>
          )}

          {world.kind === "mst" && (
            <section className="mst-mini-game" aria-label="Minimum spanning tree builder">
              <div className="plain-language-goal">
                <strong>Connect every station cheaply.</strong>
                <span>
                  Cables arrive from cheapest to most expensive. Accept a cable
                  when it joins separate groups; skip it when it closes a loop.
                </span>
              </div>
              <div className="mst-dashboard">
                <div className="mst-budget">
                  <small>TOTAL CABLE COST</small>
                  <strong>
                    {KRUSKAL_EDGES.filter((edge) =>
                      mstAccepted.includes(graphEdgeKey(edge.from, edge.to)),
                    ).reduce((total, edge) => total + edge.weight, 0)}
                  </strong>
                </div>
                <div className="mst-budget">
                  <small>NETWORK GROUPS</small>
                  <strong>{mstComponents}</strong>
                </div>
                <div className="mst-budget">
                  <small>SAFE CABLES</small>
                  <strong>{mstAccepted.length} / {Object.keys(KRUSKAL_POSITIONS).length - 1}</strong>
                </div>
              </div>
              <div className="mst-map">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {KRUSKAL_EDGES.map((edge) => {
                    const id = graphEdgeKey(edge.from, edge.to);
                    const start = KRUSKAL_POSITIONS[edge.from];
                    const end = KRUSKAL_POSITIONS[edge.to];
                    return (
                      <g
                        className={[
                          mstAccepted.includes(id) ? "accepted" : "",
                          mstRejected.includes(id) ? "rejected" : "",
                          currentMstId === id ? "candidate" : "",
                        ].join(" ")}
                        key={id}
                      >
                        <line {...insetLine(start, end, 6.2)} />
                        <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2}>
                          {edge.weight}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {Object.entries(KRUSKAL_POSITIONS).map(([node, position]) => (
                  <span
                    className="mst-node"
                    key={node}
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  >
                    {node}
                  </span>
                ))}
              </div>
              <div className="cable-inspector">
                <div className="candidate-cable">
                  <small>NEXT CHEAPEST CABLE</small>
                  <strong>{currentMstEdge.from} - {currentMstEdge.to}</strong>
                  <span>COST {currentMstEdge.weight}</span>
                </div>
                <div className="component-question">
                  <strong>Would this connect two groups or create a cycle?</strong>
                  <p>Trace the green cables before deciding.</p>
                </div>
                <div className="cable-actions">
                  <button type="button" onClick={() => inspectMstEdge("accept")}>
                    <Check size={18} /> Accept cable
                  </button>
                  <button type="button" onClick={() => inspectMstEdge("skip")}>
                    <RotateCcw size={18} /> Skip cycle
                  </button>
                </div>
              </div>
            </section>
          )}

          {world.kind === "huffman" && (
            <section className="huffman-mini-game" aria-label="Huffman compression tree builder">
              <div className="plain-language-goal">
                <strong>Give common symbols shorter routes.</strong>
                <span>
                  Fuse the two least frequent signals repeatedly. Rare signals
                  merge early and end deeper; frequent signals remain near the root.
                </span>
              </div>
              <div className="frequency-pool">
                {huffmanNodes.map((node) => (
                  <button
                    className={huffmanSelected.includes(node.id) ? "selected" : ""}
                    disabled={complete}
                    key={node.id}
                    onClick={() => selectHuffman(node.id)}
                    type="button"
                  >
                    <small>{node.label}</small>
                    <strong>{node.weight}</strong>
                    <span style={{ width: `${Math.min(100, node.weight * 7)}%` }} />
                  </button>
                ))}
              </div>
              <div className="fusion-chamber">
                <div className="fusion-slot">
                  <small>SIGNAL 1</small>
                  <strong>
                    {huffmanNodes.find((node) => node.id === huffmanSelected[0])?.label ?? "?"}
                  </strong>
                </div>
                <span>+</span>
                <div className="fusion-slot">
                  <small>SIGNAL 2</small>
                  <strong>
                    {huffmanNodes.find((node) => node.id === huffmanSelected[1])?.label ?? "?"}
                  </strong>
                </div>
                <button type="button" onClick={mergeHuffman}>
                  <Sparkles size={18} /> Fuse selected signals
                </button>
              </div>
              <div className="compression-meter" aria-label={`${Math.round(progressPercent)} percent compressed`}>
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="huffman-history">
                <div>
                  <strong>MERGE HISTORY</strong>
                  <span>{huffmanHistory.length} / {HUFFMAN_SIGNALS.length - 1} fusions</span>
                </div>
                <ol>
                  {huffmanHistory.length === 0 ? (
                    <li>Fusion results will build the compression tree here.</li>
                  ) : (
                    huffmanHistory.map((node) => (
                      <li key={node.id}>
                        <span>{node.left} + {node.right}</span>
                        <strong>{node.weight}</strong>
                      </li>
                    ))
                  )}
                </ol>
              </div>
            </section>
          )}
        </div>

        {complete && (
          <div className="canvas-complete" role="dialog" aria-label={`${world.title} complete`}>
            <div>
              <span>GAME {world.level} CLEAR</span>
              <h2>
                {world.level >= worlds.length
                  ? "Campaign mastered."
                  : "Next game unlocked."}
              </h2>
              <p>
                You cleared {world.topics} by playing its core rule, not by
                memorizing a definition.
              </p>
              <div className="canvas-complete-stats">
                <strong>GAME {world.level}</strong>
                <strong>{world.gameType}</strong>
                <strong>
                  {world.level >= worlds.length ? "MASTERED" : "UNLOCKED"}
                </strong>
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
