"use client";

import {
  ArrowRight,
  Binary,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Compass,
  Crown,
  Flame,
  Gamepad2,
  Github,
  Lightbulb,
  ListTree,
  LockKeyhole,
  Map,
  Menu,
  Network,
  Play,
  RotateCcw,
  Route,
  Shield,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Waypoints,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NodeId = "S" | "A" | "B" | "C" | "D" | "E" | "F" | "CORE";
type Distances = Record<NodeId, number>;
type Predecessors = Partial<Record<NodeId, NodeId>>;

const nodes: Record<NodeId, { x: number; y: number; label: string }> = {
  S: { x: 68, y: 218, label: "START" },
  A: { x: 220, y: 92, label: "A" },
  B: { x: 205, y: 330, label: "B" },
  C: { x: 420, y: 70, label: "C" },
  D: { x: 362, y: 225, label: "D" },
  E: { x: 400, y: 365, label: "E" },
  F: { x: 565, y: 205, label: "F" },
  CORE: { x: 670, y: 320, label: "CORE" },
};

const edges: Array<{ from: NodeId; to: NodeId; weight: number }> = [
  { from: "S", to: "A", weight: 4 },
  { from: "S", to: "B", weight: 2 },
  { from: "B", to: "A", weight: 1 },
  { from: "B", to: "D", weight: 4 },
  { from: "B", to: "E", weight: 7 },
  { from: "A", to: "C", weight: 5 },
  { from: "A", to: "D", weight: 2 },
  { from: "D", to: "C", weight: 1 },
  { from: "D", to: "E", weight: 3 },
  { from: "D", to: "F", weight: 6 },
  { from: "C", to: "F", weight: 3 },
  { from: "E", to: "F", weight: 1 },
  { from: "E", to: "CORE", weight: 5 },
  { from: "F", to: "CORE", weight: 2 },
];

const initialDistances: Distances = {
  S: 0,
  A: Infinity,
  B: Infinity,
  C: Infinity,
  D: Infinity,
  E: Infinity,
  F: Infinity,
  CORE: Infinity,
};

const adjacency = (() => {
  const map = {} as Record<
    NodeId,
    Array<{ node: NodeId; weight: number }>
  >;
  (Object.keys(nodes) as NodeId[]).forEach((node) => {
    map[node] = [];
  });
  edges.forEach(({ from, to, weight }) => {
    map[from].push({ node: to, weight });
    map[to].push({ node: from, weight });
  });
  return map;
})();

const realms = [
  {
    eyebrow: "Realm 01",
    title: "Memory Marsh",
    topic: "Arrays · Lists · Hash Maps",
    copy: "Master storage, lookup, and the cost of moving data.",
    icon: Binary,
    status: "cleared",
    color: "mint",
    progress: "3 / 3",
  },
  {
    eyebrow: "Realm 02",
    title: "Order Outpost",
    topic: "Stacks · Queues · Heaps",
    copy: "Control what enters first, leaves last, and rises to the top.",
    icon: ListTree,
    status: "cleared",
    color: "blue",
    progress: "4 / 4",
  },
  {
    eyebrow: "Realm 03",
    title: "Sortworks",
    topic: "Sorting · Searching",
    copy: "Race pivots, merges, and binary probes against the clock.",
    icon: Target,
    status: "cleared",
    color: "orange",
    progress: "5 / 5",
  },
  {
    eyebrow: "Realm 04",
    title: "Recursion Ruins",
    topic: "Recursion · Backtracking",
    copy: "Escape looping chambers by trusting the call stack.",
    icon: RotateCcw,
    status: "cleared",
    color: "violet",
    progress: "4 / 4",
  },
  {
    eyebrow: "Realm 05",
    title: "Graph Citadel",
    topic: "BFS · DFS · Shortest Path",
    copy: "Navigate weighted worlds and sever impossible routes.",
    icon: Network,
    status: "current",
    color: "lime",
    progress: "2 / 5",
  },
  {
    eyebrow: "Realm 06",
    title: "Treewilds",
    topic: "Trees · Tries · BST",
    copy: "Restore balance to a forest that grows by strict rules.",
    icon: Waypoints,
    status: "locked",
    color: "teal",
    progress: "0 / 5",
  },
  {
    eyebrow: "Realm 07",
    title: "Greedy Dunes",
    topic: "Greedy · Intervals",
    copy: "Make locally brilliant choices without losing the whole map.",
    icon: Compass,
    status: "locked",
    color: "gold",
    progress: "0 / 4",
  },
  {
    eyebrow: "Realm 08",
    title: "Dynamic Forge",
    topic: "Dynamic Programming",
    copy: "Cache old victories and craft answers from overlapping battles.",
    icon: Brain,
    status: "locked",
    color: "rose",
    progress: "0 / 6",
  },
];

const codex = [
  ["Binary Search", "O(log n)", "Search", "Probe the sorted signal"],
  ["Merge Sort", "O(n log n)", "Sort", "Rebuild order from halves"],
  ["Quick Sort", "O(n log n)*", "Sort", "Rule the pivot chamber"],
  ["Breadth-First", "O(V + E)", "Graph", "Sweep the nearest frontier"],
  ["Depth-First", "O(V + E)", "Graph", "Descend before returning"],
  ["Dijkstra", "O((V+E) log V)", "Graph", "Break the weighted maze"],
  ["A* Search", "O(E)", "Graph", "Hunt with a heuristic"],
  ["Topological Sort", "O(V + E)", "Graph", "Untangle dependencies"],
  ["Kruskal", "O(E log E)", "Greedy", "Connect without cycles"],
  ["Knapsack", "O(nW)", "Dynamic", "Spend capacity wisely"],
  ["Longest Common Subsequence", "O(mn)", "Dynamic", "Find the hidden echo"],
  ["KMP Search", "O(n + m)", "String", "Never re-read a mismatch"],
];

function formatDistance(value: number) {
  return Number.isFinite(value) ? value : "∞";
}

function edgeId(a: NodeId, b: NodeId) {
  return [a, b].sort().join("-");
}

export function AlgoRift() {
  const [visited, setVisited] = useState<NodeId[]>([]);
  const [distances, setDistances] = useState<Distances>(initialDistances);
  const [predecessors, setPredecessors] = useState<Predecessors>({});
  const [focus, setFocus] = useState(100);
  const [message, setMessage] = useState(
    "Dijkstra begins at the source. Select START to lock its distance.",
  );
  const [logs, setLogs] = useState<string[]>([
    "Rift initialized. The source distance is 0.",
  ]);
  const [wrongNode, setWrongNode] = useState<NodeId | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [won, setWon] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hasPriorWin, setHasPriorWin] = useState(false);
  const arenaRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setHasPriorWin(window.localStorage.getItem("algorift-dijkstra-win") === "1");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const expectedNode = (Object.keys(distances) as NodeId[])
    .filter((node) => !visited.includes(node) && Number.isFinite(distances[node]))
    .sort((a, b) => distances[a] - distances[b])[0];

  const shortestPath = (() => {
    if (!won) return [] as NodeId[];
    const path: NodeId[] = ["CORE"];
    let cursor: NodeId | undefined = "CORE";
    while (cursor !== "S") {
      cursor = predecessors[cursor];
      if (!cursor) return [];
      path.unshift(cursor);
    }
    return path;
  })();

  const pathEdges = new Set(
    shortestPath.slice(1).map((node, index) => edgeId(shortestPath[index], node)),
  );

  const bossHealth = Math.max(
    0,
    Math.round(100 - (visited.length / Object.keys(nodes).length) * 100),
  );

  function handleNodeClick(node: NodeId) {
    if (won || visited.includes(node)) return;

    if (node !== expectedNode) {
      setWrongNode(node);
      setFocus((current) => Math.max(0, current - 8));
      setMessage(
        `${nodes[node].label} is not the cheapest unsettled node. Dijkstra must choose the smallest known distance first.`,
      );
      setLogs((current) =>
        [`Blocked: ${nodes[node].label} costs ${formatDistance(distances[node])}.`, ...current].slice(
          0,
          5,
        ),
      );
      window.setTimeout(() => setWrongNode(null), 500);
      return;
    }

    const nextDistances = { ...distances };
    const nextPredecessors = { ...predecessors };
    const relaxations: string[] = [];

    adjacency[node].forEach(({ node: neighbor, weight }) => {
      if (visited.includes(neighbor)) return;
      const candidate = distances[node] + weight;
      if (candidate < nextDistances[neighbor]) {
        const before = formatDistance(nextDistances[neighbor]);
        nextDistances[neighbor] = candidate;
        nextPredecessors[neighbor] = node;
        relaxations.push(
          `${nodes[neighbor].label}: ${before} → ${candidate} via ${nodes[node].label}`,
        );
      }
    });

    const nextVisited = [...visited, node];
    setVisited(nextVisited);
    setDistances(nextDistances);
    setPredecessors(nextPredecessors);
    setWrongNode(null);

    if (node === "CORE") {
      setWon(true);
      setMessage(
        "Core breached. You proved the shortest route costs 11 and never needed to explore a worse path twice.",
      );
      setLogs((current) =>
        ["VICTORY: shortest route secured at cost 11.", ...current].slice(0, 5),
      );
      window.localStorage.setItem("algorift-dijkstra-win", "1");
      setHasPriorWin(true);
      return;
    }

    const update =
      relaxations.length > 0
        ? `Locked ${nodes[node].label} at ${distances[node]}. Relaxed ${relaxations.length} neighboring route${relaxations.length === 1 ? "" : "s"}.`
        : `Locked ${nodes[node].label} at ${distances[node]}. No shorter neighboring routes found.`;
    setMessage(update);
    setLogs((current) => [...relaxations.reverse(), update, ...current].slice(0, 5));
  }

  function useHint() {
    if (!expectedNode || won) return;
    setHintsUsed((current) => current + 1);
    setMessage(
      `Scanner hint: choose ${nodes[expectedNode].label}. Its tentative distance ${distances[expectedNode]} is the smallest on the frontier.`,
    );
  }

  function resetBattle() {
    setVisited([]);
    setDistances(initialDistances);
    setPredecessors({});
    setFocus(100);
    setMessage(
      "Dijkstra begins at the source. Select START to lock its distance.",
    );
    setLogs(["Rift initialized. The source distance is 0."]);
    setWrongNode(null);
    setHintsUsed(0);
    setWon(false);
  }

  function scrollToArena() {
    arenaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="AlgoRift home">
          <span className="brand-mark">
            <span />
            <span />
          </span>
          <span>ALGO<span>RIFT</span></span>
        </a>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#realms">World Map</a>
          <a href="#arena">Boss Arena</a>
          <a href="#codex">Codex</a>
        </nav>

        <div className="player-chip">
          <span className="player-level">07</span>
          <span>
            <small>Pathfinder</small>
            <strong>1,240 XP</strong>
          </span>
        </div>

        <button
          className="mobile-menu"
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={21} /> : <Menu size={21} />}
        </button>

        {mobileOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            <a href="#realms" onClick={() => setMobileOpen(false)}>World Map</a>
            <a href="#arena" onClick={() => setMobileOpen(false)}>Boss Arena</a>
            <a href="#codex" onClick={() => setMobileOpen(false)}>Codex</a>
          </nav>
        )}
      </header>

      <section className="hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="live-dot" />
            Season 01 · The Graph Awakens
          </div>
          <h1>
            Learn the logic.
            <span>Defeat the impossible.</span>
          </h1>
          <p>
            A hands-on algorithm adventure where every concept is a world,
            every bug is a clue, and the hardest problems fight back.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={scrollToArena}>
              <Play size={17} fill="currentColor" />
              Enter the arena
            </button>
            <a className="text-link" href="#realms">
              Explore the curriculum <ArrowRight size={16} />
            </a>
          </div>
          <div className="hero-stats">
            <div>
              <strong>32</strong>
              <span>algorithm missions</span>
            </div>
            <div>
              <strong>8</strong>
              <span>learning realms</span>
            </div>
            <div>
              <strong>100%</strong>
              <span>playable concepts</span>
            </div>
          </div>
        </div>

        <div className="hero-stage">
          <div className="stage-orbit orbit-one" />
          <div className="stage-orbit orbit-two" />
          <div className="boss-sigil">
            <div className="boss-eye">
              <span />
            </div>
            <div className="sigil-shard shard-one" />
            <div className="sigil-shard shard-two" />
            <div className="sigil-shard shard-three" />
          </div>
          <div className="mission-card">
            <span className="mission-kicker">LIVE ENCOUNTER</span>
            <strong>The Shortest Path</strong>
            <small>Dijkstra · Threat level 05</small>
            <div className="mission-progress">
              <span style={{ width: hasPriorWin ? "100%" : "40%" }} />
            </div>
            <button type="button" onClick={scrollToArena}>
              {hasPriorWin ? "Replay encounter" : "Continue mission"}
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="floating-tag tag-complexity">
            <Clock3 size={14} />
            O((V + E) log V)
          </div>
          <div className="floating-tag tag-xp">
            <Sparkles size={14} />
            +450 XP
          </div>
        </div>
      </section>

      <section className="section realms-section" id="realms">
        <div className="section-heading">
          <div>
            <span className="section-kicker"><Map size={14} /> Your campaign</span>
            <h2>Eight realms. One complete toolkit.</h2>
          </div>
          <p>
            The path follows a real data structures and algorithms curriculum,
            but every lesson earns its place through interaction.
          </p>
        </div>

        <div className="realm-path">
          {realms.map((realm, index) => {
            const Icon = realm.icon;
            return (
              <article
                className={`realm-card ${realm.status} realm-${realm.color}`}
                key={realm.title}
              >
                <div className="realm-number">{String(index + 1).padStart(2, "0")}</div>
                <div className="realm-icon">
                  <Icon size={22} />
                </div>
                <span className="realm-eyebrow">{realm.eyebrow}</span>
                <h3>{realm.title}</h3>
                <strong>{realm.topic}</strong>
                <p>{realm.copy}</p>
                <div className="realm-footer">
                  {realm.status === "cleared" && (
                    <span className="status-cleared"><Check size={13} /> Cleared</span>
                  )}
                  {realm.status === "current" && (
                    <span className="status-current"><Flame size={13} /> In progress</span>
                  )}
                  {realm.status === "locked" && (
                    <span className="status-locked"><LockKeyhole size={13} /> Locked</span>
                  )}
                  <span>{realm.progress}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="arena-section" id="arena" ref={arenaRef}>
        <div className="arena-intro">
          <div>
            <span className="section-kicker"><Swords size={14} /> Boss encounter</span>
            <h2>The Weighted Warden</h2>
          </div>
          <p>
            Objective: reach the Core with the lowest total cost. You are the
            priority queue. Choose the unvisited node with the smallest known distance.
          </p>
        </div>

        <div className="battle-hud">
          <div className="combatant player">
            <div className="combatant-avatar"><Shield size={20} /></div>
            <div>
              <span>PATHFINDER</span>
              <strong>Your focus</strong>
            </div>
            <div className="health-wrap">
              <span>{focus} / 100</span>
              <div className="health-track player-health">
                <i style={{ width: `${focus}%` }} />
              </div>
            </div>
          </div>

          <div className="versus">VS</div>

          <div className="combatant boss">
            <div className="health-wrap">
              <span>{bossHealth} / 100</span>
              <div className="health-track boss-health">
                <i style={{ width: `${bossHealth}%` }} />
              </div>
            </div>
            <div>
              <span>GRAPH TYRANT</span>
              <strong>Weighted Warden</strong>
            </div>
            <div className="combatant-avatar"><Crown size={20} /></div>
          </div>
        </div>

        <div className="arena-grid">
          <div className="graph-panel">
            <div className="panel-topline">
              <div>
                <span>LIVE GRAPH</span>
                <strong>Select the next node</strong>
              </div>
              <div className="legend">
                <span><i className="legend-known" /> frontier</span>
                <span><i className="legend-locked" /> visited</span>
              </div>
            </div>

            <div className={`graph-stage ${won ? "victory" : ""}`}>
              <svg
                viewBox="0 0 740 440"
                role="img"
                aria-label="Interactive weighted graph for the Dijkstra boss battle"
              >
                <defs>
                  <filter id="nodeGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="7" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {edges.map((edge) => {
                  const from = nodes[edge.from];
                  const to = nodes[edge.to];
                  const x = (from.x + to.x) / 2;
                  const y = (from.y + to.y) / 2;
                  const isPath = pathEdges.has(edgeId(edge.from, edge.to));
                  return (
                    <g key={`${edge.from}-${edge.to}`}>
                      <line
                        className={`graph-edge ${isPath ? "path-edge" : ""}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                      />
                      <circle className="weight-back" cx={x} cy={y} r="12" />
                      <text className="edge-weight" x={x} y={y + 4}>
                        {edge.weight}
                      </text>
                    </g>
                  );
                })}

                {(Object.keys(nodes) as NodeId[]).map((node) => {
                  const position = nodes[node];
                  const isVisited = visited.includes(node);
                  const isExpected = node === expectedNode && !won;
                  const isKnown = Number.isFinite(distances[node]);
                  const isWrong = wrongNode === node;
                  const isPath = shortestPath.includes(node);
                  return (
                    <g
                      className={[
                        "graph-node",
                        isVisited ? "node-visited" : "",
                        isExpected ? "node-expected" : "",
                        isKnown ? "node-known" : "",
                        isWrong ? "node-wrong" : "",
                        isPath ? "node-path" : "",
                      ].join(" ")}
                      key={node}
                      role="button"
                      tabIndex={0}
                      aria-label={`${position.label}, distance ${formatDistance(distances[node])}`}
                      onClick={() => handleNodeClick(node)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          handleNodeClick(node);
                        }
                      }}
                    >
                      <circle
                        className="node-pulse"
                        cx={position.x}
                        cy={position.y}
                        r="31"
                      />
                      <circle
                        className="node-circle"
                        cx={position.x}
                        cy={position.y}
                        r={node === "CORE" ? 29 : 25}
                        filter={isExpected ? "url(#nodeGlow)" : undefined}
                      />
                      <text
                        className="node-label"
                        x={position.x}
                        y={position.y + 4}
                      >
                        {node === "CORE" ? "◆" : position.label}
                      </text>
                      <g className="distance-badge">
                        <rect
                          x={position.x - 17}
                          y={position.y + 31}
                          width="34"
                          height="19"
                          rx="4"
                        />
                        <text x={position.x} y={position.y + 45}>
                          {formatDistance(distances[node])}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
              <div className="graph-grid-overlay" />
              {won && (
                <div className="victory-banner">
                  <Trophy size={23} />
                  <div>
                    <span>ENCOUNTER CLEARED</span>
                    <strong>S → B → A → D → C → F → CORE = 11</strong>
                  </div>
                  <span className="xp-reward">+450 XP</span>
                </div>
              )}
            </div>

            <div className="battle-message">
              <div className={won ? "message-icon won" : "message-icon"}>
                {won ? <Trophy size={18} /> : <Zap size={18} />}
              </div>
              <p>{message}</p>
              <button type="button" onClick={useHint} disabled={won}>
                <Lightbulb size={15} />
                Hint {hintsUsed > 0 && `(${hintsUsed})`}
              </button>
            </div>
          </div>

          <aside className="lesson-panel">
            <div className="lesson-tabs">
              <span className="active">Battle intel</span>
              <span>Concept</span>
            </div>

            <div className="objective-card">
              <span className="mini-label">CURRENT RULE</span>
              <h3>Choose the cheapest frontier.</h3>
              <p>
                Once the smallest tentative distance is chosen, it becomes
                final. Then test whether traveling through it improves each neighbor.
              </p>
              <div className="rule-formula">
                <span>new distance</span>
                <code>min(old, current + edge)</code>
              </div>
            </div>

            <div className="distance-table">
              <div className="table-head">
                <span>NODE</span>
                <span>DISTANCE</span>
                <span>STATE</span>
              </div>
              {(Object.keys(nodes) as NodeId[]).map((node) => (
                <div className="table-row" key={node}>
                  <strong>{nodes[node].label}</strong>
                  <code>{formatDistance(distances[node])}</code>
                  <span
                    className={
                      visited.includes(node)
                        ? "state-locked"
                        : Number.isFinite(distances[node])
                          ? "state-frontier"
                          : "state-hidden"
                    }
                  >
                    {visited.includes(node)
                      ? "locked"
                      : Number.isFinite(distances[node])
                        ? "frontier"
                        : "unknown"}
                  </span>
                </div>
              ))}
            </div>

            <div className="combat-log">
              <span className="mini-label">COMBAT LOG</span>
              {logs.map((log, index) => (
                <p key={`${log}-${index}`}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {log}
                </p>
              ))}
            </div>

            <button className="reset-button" type="button" onClick={resetBattle}>
              <RotateCcw size={15} />
              Reset encounter
            </button>
          </aside>
        </div>

        <div className="debrief-grid">
          <article>
            <div className="debrief-icon"><Route size={19} /></div>
            <span>WHY IT WORKS</span>
            <h3>Greedy, but guaranteed</h3>
            <p>
              With non-negative edge weights, no later route can improve a node
              after the cheapest frontier node has been locked.
            </p>
          </article>
          <article>
            <div className="debrief-icon"><Clock3 size={19} /></div>
            <span>COMPLEXITY</span>
            <h3>O((V + E) log V)</h3>
            <p>
              An adjacency list plus a min-heap keeps frontier selection and
              distance updates efficient on sparse graphs.
            </p>
          </article>
          <article>
            <div className="debrief-icon"><CircleHelp size={19} /></div>
            <span>WATCH OUT</span>
            <h3>No negative edges</h3>
            <p>
              A negative edge can invalidate a distance already declared final.
              Bellman-Ford is the safer spell for those graphs.
            </p>
          </article>
        </div>
      </section>

      <section className="section codex-section" id="codex">
        <div className="section-heading">
          <div>
            <span className="section-kicker"><BookOpen size={14} /> Algorithm codex</span>
            <h2>Your field guide to the rift.</h2>
          </div>
          <p>
            Every entry connects an idea, its complexity, a memorable metaphor,
            and eventually a playable challenge.
          </p>
        </div>

        <div className="codex-table">
          <div className="codex-head">
            <span>Algorithm</span>
            <span>Class</span>
            <span>Signature</span>
            <span>Mission</span>
          </div>
          {codex.map(([name, complexity, category, mission], index) => (
            <div className="codex-row" key={name}>
              <span className="codex-index">{String(index + 1).padStart(2, "0")}</span>
              <strong>{name}</strong>
              <span className={`category category-${category.toLowerCase()}`}>
                {category}
              </span>
              <code>{complexity}</code>
              <span className="codex-mission">{mission}</span>
              <button type="button" aria-label={`Open ${name} mission`}>
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div className="cta-sigil"><Gamepad2 size={30} /></div>
        <span className="section-kicker">Built for curious minds</span>
        <h2>Stop memorizing. Start making decisions.</h2>
        <p>
          Algorithms become intuitive when you can see the state change, make
          the next move, and understand the consequence.
        </p>
        <button className="primary-button" type="button" onClick={scrollToArena}>
          Challenge the Warden
          <Swords size={17} />
        </button>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark"><span /><span /></span>
          <span>ALGO<span>RIFT</span></span>
        </a>
        <p>Designed and engineered as an interactive computer science playground.</p>
        <div>
          <a href="#codex"><Code2 size={16} /> View codex</a>
          <a
            href="https://github.com/immanuelgn/AlgoRift"
            target="_blank"
            rel="noreferrer"
          >
            <Github size={16} /> GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
