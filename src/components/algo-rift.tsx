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
  Flame,
  Github,
  Home,
  KeyRound,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Map,
  Play,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  Terminal,
  UserRound,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CanvasPlatformer } from "@/components/canvas-platformer";
import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
  supabaseConfigurationError,
} from "@/lib/supabase";

type View = "home" | "battle" | "world";

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

const worlds = [
  {
    level: 1,
    title: "Binary Override",
    realm: "Kernel Frontier",
    topics: "Binary Trace · Physics Tuning · Momentum",
    color: "sun",
    description:
      "Breach three platforming sectors and narrow a live signal window.",
  },
  {
    level: 2,
    title: "Sort Circuit",
    realm: "Packet Foundry",
    topics: "Bubble · Merge · Quick Sort",
    color: "sky",
    description: "Reorder hostile packets while the factory keeps moving.",
  },
  {
    level: 3,
    title: "Stack Breach",
    realm: "Memory Vault",
    topics: "Stacks · Queues · Hash Maps",
    color: "mint",
    description: "Route processes through a layered security tower.",
  },
  {
    level: 4,
    title: "Tree Runner",
    realm: "Branch Network",
    topics: "Trees · BST · Traversal",
    color: "leaf",
    description: "Climb a branching world without losing the active route.",
  },
  {
    level: 5,
    title: "Weighted Warden",
    realm: "Graph Citadel",
    topics: "BFS · DFS · Dijkstra",
    color: "violet",
    description: "Race a network boss through weighted paths.",
  },
  {
    level: 6,
    title: "Greedy Run",
    realm: "Bandwidth Dunes",
    topics: "Greedy · Intervals",
    color: "gold",
    description: "Commit to local openings while the route collapses.",
  },
  {
    level: 7,
    title: "Echo Kernel",
    realm: "Dynamic Core",
    topics: "Dynamic Programming",
    color: "rose",
    description: "Cache past states and rebuild a damaged system.",
  },
];

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

function PlayerSprite({ powered = false }: { powered?: boolean }) {
  return (
    <div
      className={`player-sprite ${powered ? "sprite-powered" : ""}`}
      aria-hidden="true"
    >
      <div className="runner-scarf"><span /></div>
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
      <div className="runner-arm runner-arm-left"><span className="runner-hand" /></div>
      <div className="runner-arm runner-arm-right"><span className="runner-hand" /></div>
      <div className="runner-leg runner-leg-left"><span className="runner-boot" /></div>
      <div className="runner-leg runner-leg-right"><span className="runner-boot" /></div>
    </div>
  );
}

function BossSprite() {
  return (
    <div className="boss-sprite" aria-hidden="true">
      <div className="boss-crown"><span /><span /><span /></div>
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

  const displayLevel = Math.max(1, progress.completedLevel + 1);

  function changeView(nextView: View) {
    setView(nextView);
    window.requestAnimationFrame(() => {
      pageTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
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
                <Terminal size={15} /> WORLD 1 SYSTEM ONLINE
              </span>
              <h1>
                Run the world.
                <span>Rewrite the system.</span>
              </h1>
              <p>
                A momentum platformer where algorithm traces and live physics
                overrides are part of the level, not a quiz beside it.
              </p>
              <div className="hero-buttons">
                <button
                  className="game-primary"
                  type="button"
                  onClick={() => changeView("battle")}
                >
                  <Play size={18} fill="currentColor" />
                  {progress.completedLevel > 0 ? "Replay World 1" : "Enter World 1"}
                </button>
                <button
                  className="game-secondary"
                  type="button"
                  onClick={() => changeView("world")}
                >
                  View world map <ArrowRight size={17} />
                </button>
              </div>
              <div className="first-mission">
                <span className="mission-number">1-1</span>
                <div>
                  <small>NEXT SECTOR</small>
                  <strong>Boot Sequence</strong>
                  <span>Momentum · Binary Trace · System Override</span>
                </div>
                <span className="mission-reward">+250 XP</span>
              </div>
            </div>

            <div className="hero-scene" aria-label="AlgoRift game preview">
              <div className="speech-bubble">
                <strong>ROOT GUARD</strong>
                <span>ACCESS DENIED</span>
              </div>
              <div className="hero-player"><PlayerSprite powered /></div>
              <div className="hero-power-core" aria-hidden="true">
                <span /><Flame size={20} />
              </div>
              <div className="hero-boss"><BossSprite /></div>
              <div className="floating-coin coin-one">0.20×</div>
              <div className="floating-coin coin-two">O(log n)</div>
              <div className="ground-platform">
                <span /><span /><span /><span /><span />
              </div>
            </div>
          </section>

          <section className="how-it-works">
            <div className="simple-heading">
              <span>CORE GAME LOOP</span>
              <h2>Platforming first. Systems underneath.</h2>
            </div>
            <div className="steps-row">
              <article>
                <span className="step-icon"><Zap size={22} /></span>
                <div>
                  <small>MOVE</small>
                  <h3>Build momentum</h3>
                  <p>Acceleration, friction, variable jumps, and faster falls.</p>
                </div>
              </article>
              <ArrowRight className="step-arrow" />
              <article>
                <span className="step-icon"><SlidersHorizontal size={22} /></span>
                <div>
                  <small>OVERRIDE</small>
                  <h3>Tune the engine</h3>
                  <p>Drop time to 20% and patch live physics parameters.</p>
                </div>
              </article>
              <ArrowRight className="step-arrow" />
              <article>
                <span className="step-icon"><Target size={22} /></span>
                <div>
                  <small>BREACH</small>
                  <h3>Resolve the trace</h3>
                  <p>Narrow the signal window and unlock the route forward.</p>
                </div>
              </article>
            </div>
          </section>

          <section className="power-feature">
            <div className="power-feature-art" aria-hidden="true">
              <div className="power-orbit orbit-one" />
              <div className="power-orbit orbit-two" />
              <div className="power-core-large"><span /><Flame size={34} /></div>
              <div className="power-preview-player"><PlayerSprite powered /></div>
              <div className="power-preview-beam"><i /><i /></div>
            </div>
            <div className="power-feature-copy">
              <span className="section-label">
                <Flame size={15} /> Redline kernel
              </span>
              <h2>One beam. Every target in the lane.</h2>
              <p>
                Install Redline inside the first sector, then pierce groups of
                bugs and break the final Root Guard.
              </p>
              <div className="power-rule">
                <Shield size={18} />
                <span>Original procedural visuals and audio. No borrowed game assets.</span>
              </div>
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
                  : "World 1 root access secured."}
              </h2>
              <p>
                {user
                  ? `Signed in as ${username || "Pathfinder"}. Progress syncs to your private cloud row.`
                  : "Play immediately as a guest or create an account for cloud saves."}
              </p>
            </div>
            <div className="progress-card">
              <div className="progress-card-top">
                <span>WORLD 1</span>
                <strong>{progress.completedLevel > 0 ? "1 / 7" : "0 / 7"}</strong>
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

      {view === "battle" && (
        <CanvasPlatformer
          playerName={username || "NOVA"}
          soundOn={soundOn}
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
              <p>Each world turns one algorithm family into a different game system.</p>
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
                    {complete ? (
                      <Check size={20} />
                    ) : available ? (
                      world.level
                    ) : (
                      <LockKeyhole size={18} />
                    )}
                  </div>
                  <div className="level-card">
                    <div className="level-card-top">
                      <span>WORLD {world.level}</span>
                      <span>
                        {complete ? "CLEARED" : available ? "AVAILABLE" : "IN DEVELOPMENT"}
                      </span>
                    </div>
                    <small>{world.realm}</small>
                    <h2>{world.title}</h2>
                    <strong>{world.topics}</strong>
                    <p>{world.description}</p>
                    {available ? (
                      <button type="button" onClick={() => changeView("battle")}>
                        {complete ? "Replay world" : "Enter world"}
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <span className="unlock-note">
                        <LockKeyhole size={14} /> Planned playable world
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

      {view !== "battle" && (
        <footer className="game-footer">
          <div className="footer-brand">
            <BrandMark />
            <div>
              <strong>AlgoRift</strong>
              <span>Algorithms built into the game system.</span>
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
          ×
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
                  Level {displayLevel} · {progress.xp} XP · private to this account
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
