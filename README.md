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
- Charge Redline Vision by making two correct midpoint decisions.
- Fire the earned power during the final boss encounter.
- Earn XP and save progress locally or to a secure account.

The level checks `17`, then `31`, then `42`, visibly eliminating the impossible
half of the array after each comparison. Keyboard and touch controls are
supported. Redline Vision is an original audiovisual effect built with CSS and
the Web Audio API. It never highlights an answer, removes a learning step, or
replaces the player's calculation.

## Accounts and progress

Players can use guest mode without creating an account. Optional Supabase
accounts add:

- Email and password authentication
- A unique public username
- Email verification and password recovery
- Cloud-synced level, XP, and power-up progress
- Automatic reconciliation between local and cloud progress

Passwords are handled by Supabase Auth and are never stored in AlgoRift's
database. Row Level Security ensures that each signed-in player can access only
their own profile and progress.

Public confirmation and password-reset emails require a custom SMTP provider
in Supabase. The built-in Supabase sender is suitable only for project-team
testing. Guest saves remain available while email delivery is being configured.

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
- Supabase Auth, Postgres, and Row Level Security
- Local guest saves and authenticated cloud saves
- Lucide icons
- Vercel hosting

## Run locally

```bash
npm install
npm run dev
```

Guest mode works immediately. To test accounts and cloud saves, create
`.env.local` from `.env.example` and provide the browser-safe Supabase project
URL and publishable key:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Then run the database setup in the Supabase SQL Editor:

```text
supabase/algorift_setup.sql
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Do not expose a Supabase secret key, service-role key, or database password in
the browser or in a `NEXT_PUBLIC_*` variable. See [SECURITY.md](SECURITY.md)
for the complete security checklist.

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
- Shareable completion cards

Designed and developed by
[Immanuel Gnanaseelan](https://github.com/immanuelgn).

## License

Released under the [MIT License](LICENSE).
