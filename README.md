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
- Guide Nova through a camera-following side-scrolling course.
- Move independently while jumping over bugs and pipes.
- Make two quick left, found, or right decisions at scanner gates.
- Return immediately to platforming after each algorithm decision.
- Collect Redline Vision and use its piercing beam against several bugs.
- Fire the earned power during the final boss encounter.
- Earn XP and save progress locally or to a secure account.

The level asks the player to compare `17`, then `31`, with the target `42`.
Each correct direction removes an impossible half of the sorted array until
only `42` remains. Keyboard and touch controls are supported. Redline Vision is
an original audiovisual effect built with CSS and the Web Audio API.

The lesson introduces plain-language terms first, then keeps most of the course
focused on movement and combat. The algorithm prompts are brief in-world actions
instead of detached calculation screens.

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
