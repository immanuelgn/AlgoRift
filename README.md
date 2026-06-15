# AlgoRift

**Learn algorithms by playing the decisions.**

[Play AlgoRift](https://algorift.vercel.app) | [View the source](https://github.com/immanuelgn/AlgoRift)

![AlgoRift side-scrolling algorithm game](public/algorift-preview.png)

AlgoRift is an original 2D learning game that turns data structures and
algorithms into platforming levels, interactive decisions, and boss battles.
The goal is to make difficult concepts approachable without reducing them to
answer-clicking exercises.

## Playable release

Level 1, **Binary Blaster**, teaches binary search through a complete game loop:

- Learn the sorted-array requirement, midpoint formula, and search-space rule.
- Move left and right, jump over obstacles, and reach scanner gates.
- Calculate each midpoint without a highlighted answer.
- Receive precise teaching feedback after an incorrect choice.
- Turn correct decisions into attacks against the Glitch King.
- Earn XP and save real progress locally after defeating the boss.

The level checks `17`, then `31`, then `42`, visibly eliminating the impossible
half of the array after each comparison. Keyboard and touch controls are
supported.

## Campaign roadmap

The world map previews seven algorithm chapters:

1. Binary search
2. Sorting algorithms
3. Stacks, queues, and hash maps
4. Trees and traversal
5. Graph search and Dijkstra's algorithm
6. Greedy algorithms and intervals
7. Dynamic programming

Future chapters are clearly marked as coming soon rather than appearing
pre-completed.

## Tech stack

- Next.js 16 App Router
- React 19 and TypeScript
- Custom responsive CSS artwork and animation
- Web Audio API sound effects
- Keyboard and touch controls
- Local storage progress persistence
- Lucide icons
- Vercel hosting

The current release is fully client-side and does not require a database,
account, or environment variables.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```bash
npm run lint
npx tsc --noEmit
npm run build
npm audit
```

## Planned additions

- Sorting race level
- Stack and queue tower-defense level
- Tree traversal climbing level
- Dijkstra shortest-path boss fight
- Dynamic programming crafting level
- Optional Supabase accounts and cloud saves
- Shareable completion cards

Designed and developed by
[Immanuel Gnanaseelan](https://github.com/immanuelgn).

## License

Released under the [MIT License](LICENSE).
