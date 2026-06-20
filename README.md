# AlgoRift

**Learn the rule. Play the idea.**

[Play AlgoRift](https://algorift.vercel.app) | [LinkedIn](https://www.linkedin.com/in/immanuelgnanaseelan/)

AlgoRift is an interactive algorithm mini-game academy. Each concept has its
own game board and interaction model, with immediate feedback and a guided
progression from beginner search techniques to dynamic programming.

## Mini-Games

1. **Signal Scanner - Binary Search:** repeatedly cut a sorted search range.
2. **Packet Conveyor - Bubble Sort:** keep or swap the active neighboring pair.
3. **Memory Elevator - Stacks:** load cargo, then dispatch it using LIFO order.
4. **Branch Finder - Binary Search Trees:** navigate comparisons toward a target.
5. **Queue Rescue - BFS:** process graph nodes from the front of a live queue.
6. **Shortest Route - Dijkstra:** lock the cheapest node on the current frontier.
7. **Interval Planner - Greedy:** build a compatible schedule by earliest finish.
8. **Memo Forge - Dynamic Programming:** construct Fibonacci values from cached cells.

Every incorrect move explains the relevant rule without revealing the entire
solution. Completing a game unlocks the next concept, while mastered games
remain replayable.

## Accounts and Security

Guest progress is stored only on the current device. Optional Supabase accounts
provide cloud-synced progress with email/password authentication.

- Passwords are handled by Supabase Auth and never stored by AlgoRift.
- Row Level Security restricts profile and progress rows to `auth.uid()`.
- The frontend uses only the browser-safe Supabase URL and publishable key.
- Signing out resets the device to a fresh guest campaign starting at Game 1.

## Tech Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Supabase Auth, Postgres, and Row Level Security
- Vercel

## Local Development

```bash
npm install
npm run dev
```

Guest mode works without environment variables. Cloud accounts require:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_BROWSER_SAFE_PUBLISHABLE_KEY
```

## Quality Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Designed and developed by
[Immanuel Gnanaseelan](https://www.linkedin.com/in/immanuelgnanaseelan/).

## License

Released under the [MIT License](LICENSE).
