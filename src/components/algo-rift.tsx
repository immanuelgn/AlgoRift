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
const SORTLAB_STATIONS = [
  {
    algorithm: "Insertion Sort",
    prompt: "The sorted prefix is [1, 3, 6, 8]. Where should key 4 be inserted?",
    options: ["After 1", "After 3", "After 6"],
    correct: "After 3",
    scene: ["1", "3", "4", "6", "8"],
  },
  {
    algorithm: "Selection Sort",
    prompt: "Which value is the minimum of the unsorted region [7, 2, 9, 4]?",
    options: ["7", "2", "4"],
    correct: "2",
    scene: ["7", "2", "9", "4"],
  },
  {
    algorithm: "Exchange Sort",
    prompt: "Which exchange moves [8, 5, 3, 9] closer to ascending order?",
    options: ["8 ↔ 3", "5 ↔ 9", "3 ↔ 9"],
    correct: "8 ↔ 3",
    scene: ["8", "5", "3", "9"],
  },
  {
    algorithm: "Merge Sort",
    prompt: "Merge heads [2, 7, 9] and [3, 4, 8]. Which value leaves first?",
    options: ["2", "3", "4"],
    correct: "2",
    scene: ["2", "7", "9", "|", "3", "4", "8"],
  },
  {
    algorithm: "Merge Sort",
    prompt: "After 2 leaves, which head is next: 7 or 3?",
    options: ["7", "3", "9"],
    correct: "3",
    scene: ["7", "9", "|", "3", "4", "8"],
  },
  {
    algorithm: "Quick Sort",
    prompt: "Pivot is 6. Which value belongs in the left partition?",
    options: ["9", "4", "8"],
    correct: "4",
    scene: ["9", "4", "6", "8", "2"],
  },
  {
    algorithm: "Quick Sort",
    prompt: "Pivot is 6. Which value belongs in the right partition?",
    options: ["2", "5", "9"],
    correct: "9",
    scene: ["2", "5", "6", "9", "7"],
  },
  {
    algorithm: "Heap Sort",
    prompt: "A max-heap removes its root next. Which value should be extracted?",
    options: ["12", "7", "4"],
    correct: "12",
    scene: ["12", "7", "9", "2", "4"],
  },
] as const;
const DFS_ORDER = ["A", "B", "D", "H", "E", "C", "F", "I", "G"];
const MST_EDGES = [
  { from: "A", to: "B", weight: 2 },
  { from: "B", to: "D", weight: 3 },
  { from: "A", to: "C", weight: 4 },
  { from: "C", to: "E", weight: 5 },
  { from: "D", to: "E", weight: 6 },
  { from: "B", to: "C", weight: 7 },
] as const;
const MST_ORDER = ["A-B", "B-D", "A-C", "C-E"];
const MST_POSITIONS: Record<string, { x: number; y: number }> = {
  A: { x: 15, y: 28 },
  B: { x: 42, y: 14 },
  C: { x: 48, y: 70 },
  D: { x: 76, y: 24 },
  E: { x: 82, y: 72 },
};
const HUFFMAN_START = [
  { id: "A", label: "A", weight: 2 },
  { id: "B", label: "B", weight: 3 },
  { id: "C", label: "C", weight: 5 },
  { id: "D", label: "D", weight: 7 },
  { id: "E", label: "E", weight: 11 },
] as const;

function isSorted(values: number[]) {
  return values.every((value, index) => index === 0 || values[index - 1] <= value);
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
  const [dijkstraStep, setDijkstraStep] = useState(0);
  const [greedyStep, setGreedyStep] = useState(0);
  const [greedySelected, setGreedySelected] = useState<string[]>([]);
  const [dpIndex, setDpIndex] = useState(2);
  const [sortLabStep, setSortLabStep] = useState(0);
  const [dfsStep, setDfsStep] = useState(0);
  const [mstStep, setMstStep] = useState(0);
  const [huffmanNodes, setHuffmanNodes] = useState<
    Array<{ id: string; label: string; weight: number }>
  >([...HUFFMAN_START]);
  const [huffmanSelected, setHuffmanSelected] = useState<string[]>([]);
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
    setDijkstraStep(0);
    setGreedyStep(0);
    setGreedySelected([]);
    setDpIndex(2);
    setSortLabStep(0);
    setDfsStep(0);
    setMstStep(0);
    setHuffmanNodes([...HUFFMAN_START]);
    setHuffmanSelected([]);
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
    const expected = bfsChallenge.order[graphStep];
    if (node !== expected) {
      miss(`BFS uses a queue. Serve ${expected} before later discovered nodes.`);
      return;
    }
    const nextStep = graphStep + 1;
    reward("Queue served");
    setGraphStep(nextStep);
    if (nextStep >= bfsChallenge.order.length) {
      finishRound("Both rescue networks cleared. Queue discipline kept each traversal level by level.");
      return;
    }
    setMessage(`${node} processed. Use discovery order to identify the next queue front.`);
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
    const station = SORTLAB_STATIONS[sortLabStep];
    if (option !== station.correct) {
      miss(`${station.algorithm}: study the operation this algorithm performs, then try again.`);
      return;
    }
    const nextStep = sortLabStep + 1;
    reward(station.algorithm);
    setSortLabStep(nextStep);
    if (nextStep >= SORTLAB_STATIONS.length) {
      completeMiniGame("Sorting arsenal mastered. Six algorithms reached order through six different strategies.");
      return;
    }
    setMessage(`${station.algorithm} station cleared. Next: ${SORTLAB_STATIONS[nextStep].algorithm}.`);
  }

  function chooseDfs(node: string) {
    const expected = DFS_ORDER[dfsStep];
    if (node !== expected) {
      miss("DFS follows the deepest available unvisited neighbor before backtracking.");
      return;
    }
    const nextStep = dfsStep + 1;
    reward("Depth advanced");
    setDfsStep(nextStep);
    if (nextStep >= DFS_ORDER.length) {
      completeMiniGame("Cavern mapped with DFS. Deep branches finished before backtracking to alternatives.");
      return;
    }
    setMessage(`${node} visited. Continue deeper if possible; backtrack only at a dead end.`);
  }

  function chooseMst(edgeId: string) {
    const expected = MST_ORDER[mstStep];
    if (edgeId !== expected) {
      miss("Choose the lightest remaining edge that connects different components without forming a cycle.");
      return;
    }
    const nextStep = mstStep + 1;
    reward("Edge accepted");
    setMstStep(nextStep);
    if (nextStep >= MST_ORDER.length) {
      completeMiniGame("Minimum spanning tree complete. Five stations connected with four cheapest safe edges.");
      return;
    }
    setMessage(`${edgeId} accepted. Re-scan the remaining edges from lightest to heaviest.`);
  }

  function chooseHuffman(nodeId: string) {
    if (huffmanSelected.includes(nodeId)) {
      setHuffmanSelected((current) => current.filter((id) => id !== nodeId));
      return;
    }
    const nextSelected = [...huffmanSelected, nodeId];
    if (nextSelected.length < 2) {
      setHuffmanSelected(nextSelected);
      setMessage("One frequency selected. Choose the other smallest remaining frequency.");
      return;
    }

    const chosen = huffmanNodes
      .filter((node) => nextSelected.includes(node.id))
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
      miss("Huffman always merges the two smallest frequencies currently available.");
      return;
    }

    const merged = {
      id: `${chosen[0].id}${chosen[1].id}`,
      label: `${chosen[0].label}+${chosen[1].label}`,
      weight: chosen[0].weight + chosen[1].weight,
    };
    const nextNodes = huffmanNodes
      .filter((node) => !nextSelected.includes(node.id))
      .concat(merged)
      .sort((left, right) => left.weight - right.weight);
    reward("Frequencies merged");
    setHuffmanNodes(nextNodes);
    setHuffmanSelected([]);
    if (nextNodes.length === 1) {
      completeMiniGame("Huffman tree complete. Repeated minimum-frequency merges produced a prefix code.");
      return;
    }
    setMessage(`${chosen[0].weight} + ${chosen[1].weight} merged into ${merged.weight}. Find the next two minimums.`);
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
  const bfsOrder: readonly string[] = bfsChallenge.order;
  const graphVisible = bfsChallenge.nodes.map((node) => ({
    node,
    done: bfsOrder.indexOf(node) < graphStep,
    active:
      challengeRound === 0 &&
      bfsOrder.indexOf(node) === graphStep,
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
    SORTLAB_STATIONS[sortLabStep] ??
    SORTLAB_STATIONS[SORTLAB_STATIONS.length - 1];
  const dfsVisible = bfsChallenge.nodes.map((node) => ({
    node,
    done: DFS_ORDER.indexOf(node) < dfsStep,
    active: DFS_ORDER.indexOf(node) === dfsStep,
  }));
  const acceptedMstEdges = MST_ORDER.slice(0, mstStep);
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
              ? "BFS is a rescue line. Serve the front of the queue before touching later discoveries."
              : world.kind === "dijkstra"
                ? "Frontier costs are tentative. Compare every visible cost and lock the smallest one."
                : world.kind === "greedy"
                  ? "Take the event that finishes earliest and still fits, so future slots stay open."
                  : world.kind === "dp"
                    ? `Use cached answers: fib(${visibleDpIndex}) depends on fib(${Math.max(0, visibleDpIndex - 1)}) and fib(${Math.max(0, visibleDpIndex - 2)}).`
                    : world.kind === "sortlab"
                      ? `${currentSortStation.algorithm} station ${sortLabStep + 1} of ${SORTLAB_STATIONS.length}. Identify the algorithm's defining move.`
                      : world.kind === "dfs"
                        ? "Keep moving to an unvisited neighbor. Backtrack only when the current branch has no way forward."
                        : world.kind === "mst"
                          ? "Scan edges from cheapest upward. Accept one only when it joins separate components."
                          : "Select exactly the two smallest frequencies, merge them, and put their sum back into the pool.";
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
              ? graphStep / bfsChallenge.order.length
              : world.kind === "dijkstra"
                ? dijkstraStep / DIJKSTRA_STEPS.length
                : world.kind === "greedy"
                  ? greedyStep / GREEDY_ORDER.length
                  : world.kind === "dp"
                    ? dpIndex / DP_VALUES.length
                    : world.kind === "sortlab"
                      ? sortLabStep / SORTLAB_STATIONS.length
                      : world.kind === "dfs"
                        ? dfsStep / DFS_ORDER.length
                        : world.kind === "mst"
                          ? mstStep / MST_ORDER.length
                          : (HUFFMAN_START.length - huffmanNodes.length) /
                            (HUFFMAN_START.length - 1);
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
                      key={`${from}-${to}`}
                      x1={TREE_POSITIONS[from].x}
                      y1={TREE_POSITIONS[from].y}
                      x2={TREE_POSITIONS[to].x}
                      y2={TREE_POSITIONS[to].y}
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
                      ].join(" ")}
                      disabled={complete || !isChoice}
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
                <svg
                  className="graph-lines"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {bfsChallenge.edges.map(([from, to]) => (
                    <line
                      key={`${from}-${to}`}
                      x1={GRAPH_POSITIONS[from].x}
                      y1={GRAPH_POSITIONS[from].y}
                      x2={GRAPH_POSITIONS[to].x}
                      y2={GRAPH_POSITIONS[to].y}
                    />
                  ))}
                </svg>
                {graphVisible.map(({ node, done, active }, index) => (
                  <button
                    className={[done ? "done" : "", active ? "active" : ""].join(" ")}
                    disabled={complete || done}
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
                {challengeRound === 0
                  ? `Queue: ${bfsChallenge.order.slice(graphStep, graphStep + 4).join(" → ") || "empty"}`
                  : `${Math.max(0, bfsChallenge.order.length - graphStep)} stations waiting. Infer the oldest discovery.`}
              </div>
              <p>Read the connected network, then serve the queue in discovery order.</p>
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
                        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
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
              <div className="schedule-wall">
              <div className="timeline-scale">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((tick) => (
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
                {SORTLAB_STATIONS.map((station, index) => (
                  <span
                    className={index < sortLabStep ? "done" : index === sortLabStep ? "active" : ""}
                    key={`${station.algorithm}-${index}`}
                  >
                    {index + 1}
                  </span>
                ))}
              </div>
              <div className="sorting-workbench">
                <small>{currentSortStation.algorithm.toUpperCase()}</small>
                <div className="sorting-scene">
                  {currentSortStation.scene.map((value, index) => (
                    <span className={value === "|" ? "divider" : ""} key={`${value}-${index}`}>
                      {value}
                    </span>
                  ))}
                </div>
                <h2>{currentSortStation.prompt}</h2>
                <div className="mini-actions three">
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
              <div className="dfs-stack">
                <small>ACTIVE CALL STACK</small>
                <strong>{DFS_ORDER.slice(0, dfsStep).slice(-4).join(" → ") || "empty"}</strong>
              </div>
              <div className="graph-network dfs-network">
                <svg
                  className="graph-lines"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {BFS_CHALLENGES[0].edges.map(([from, to]) => (
                    <line
                      key={`${from}-${to}`}
                      x1={GRAPH_POSITIONS[from].x}
                      y1={GRAPH_POSITIONS[from].y}
                      x2={GRAPH_POSITIONS[to].x}
                      y2={GRAPH_POSITIONS[to].y}
                    />
                  ))}
                </svg>
                {dfsVisible.map(({ node, done, active }, index) => (
                  <button
                    className={[done ? "done" : "", active ? "active" : ""].join(" ")}
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
              <p>Go deep until the branch ends, then unwind to the nearest unfinished choice.</p>
            </section>
          )}

          {world.kind === "mst" && (
            <section className="mst-mini-game" aria-label="Minimum spanning tree builder">
              <div className="mst-budget">
                <small>TOTAL CABLE COST</small>
                <strong>
                  {MST_EDGES.filter((edge) =>
                    acceptedMstEdges.includes(`${edge.from}-${edge.to}`),
                  ).reduce((total, edge) => total + edge.weight, 0)}
                </strong>
              </div>
              <div className="mst-map">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {MST_EDGES.map((edge) => {
                    const id = `${edge.from}-${edge.to}`;
                    const start = MST_POSITIONS[edge.from];
                    const end = MST_POSITIONS[edge.to];
                    return (
                      <g className={acceptedMstEdges.includes(id) ? "accepted" : ""} key={id}>
                        <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
                        <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2}>
                          {edge.weight}
                        </text>
                      </g>
                    );
                  })}
                </svg>
                {Object.entries(MST_POSITIONS).map(([node, position]) => (
                  <span
                    className="mst-node"
                    key={node}
                    style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  >
                    {node}
                  </span>
                ))}
              </div>
              <div className="mst-edge-bank">
                {MST_EDGES.map((edge) => {
                  const id = `${edge.from}-${edge.to}`;
                  return (
                    <button
                      className={acceptedMstEdges.includes(id) ? "accepted" : ""}
                      disabled={complete || acceptedMstEdges.includes(id)}
                      key={id}
                      onClick={() => chooseMst(id)}
                      type="button"
                    >
                      {id} <strong>{edge.weight}</strong>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {world.kind === "huffman" && (
            <section className="huffman-mini-game" aria-label="Huffman compression tree builder">
              <div className="frequency-pool">
                {huffmanNodes.map((node) => (
                  <button
                    className={huffmanSelected.includes(node.id) ? "selected" : ""}
                    disabled={complete}
                    key={node.id}
                    onClick={() => chooseHuffman(node.id)}
                    type="button"
                  >
                    <small>{node.label}</small>
                    <strong>{node.weight}</strong>
                  </button>
                ))}
              </div>
              <div className="compression-meter">
                <span style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="huffman-rule">
                <strong>SELECT TWO</strong>
                <p>Merge the two least frequent nodes. Their sum returns to the pool.</p>
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
