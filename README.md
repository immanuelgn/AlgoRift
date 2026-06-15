# AlgoRift

**Learn the logic. Defeat the impossible.**

[Play AlgoRift](https://algorift.vercel.app) ·
[View the source](https://github.com/immanuelgn/AlgoRift)

AlgoRift is an interactive data structures and algorithms adventure. Instead
of presenting algorithms as static diagrams, it turns each concept into a
playable decision system with worlds, combat rules, progression, and immediate
visual feedback.

## The first boss fight

**The Weighted Warden** turns Dijkstra's shortest-path algorithm into a battle
where the player acts as the priority queue:

- Choose the cheapest unsettled node.
- Watch edge relaxation update the live distance table.
- Lose focus on invalid moves and learn why the choice was incorrect.
- Track visited nodes, frontier nodes, distance updates, and boss health.
- Reveal and verify the final shortest path after defeating the boss.

The encounter uses a real weighted graph and resolves the optimal route:

```text
START -> B -> A -> D -> C -> F -> CORE
Total cost: 11
```

## Campaign

The world map organizes a full algorithms curriculum into eight themed realms:

1. Memory Marsh: arrays, linked lists, and hash maps
2. Order Outpost: stacks, queues, and heaps
3. Sortworks: sorting and searching
4. Recursion Ruins: recursion and backtracking
5. Graph Citadel: BFS, DFS, and shortest paths
6. Treewilds: trees, tries, and binary search trees
7. Greedy Dunes: greedy algorithms and interval problems
8. Dynamic Forge: dynamic programming

## Tech stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4 foundation with a custom responsive design system
- SVG graph rendering and keyboard-accessible interactions
- Lucide icons
- Local storage for zero-setup progress persistence
- Vercel for production hosting

No database is required for the current release. This keeps the experience
fast, free to run, and deployable without environment variables.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npm run build
npm audit
```

## Product roadmap

- Playable sorting races and heap-defense missions
- BFS/DFS fog-of-war exploration
- Dynamic programming crafting system
- In-browser code challenge mode
- Supabase authentication, cloud saves, and seasonal leaderboards
- Shareable completion cards for LinkedIn

## License

Released under the [MIT License](LICENSE).
