# AlgoRift

**Learn the rule. Play the idea.**

[Play AlgoRift](https://algorift.vercel.app) | [LinkedIn](https://www.linkedin.com/in/immanuelgnanaseelan/)

AlgoRift is an interactive algorithm mini-game academy. Each concept has its
own game board and interaction model, with immediate feedback and a guided
learning path from beginner search techniques to dynamic programming. Every
mini-game is playable immediately, so students can follow the suggested order
or jump straight to the topic they want to practice.

## Mini-Games

1. **Signal Scanner - Binary Search:** repeatedly cut a sorted search range.
2. **Packet Conveyor - Bubble Sort:** keep or swap the active neighboring pair.
3. **Memory Elevator - Stacks:** load cargo, then dispatch it using LIFO order.
4. **Branch Finder - Binary Search Trees:** navigate comparisons toward a target.
5. **Queue Rescue - BFS:** process graph nodes from the front of a live queue.
6. **Shortest Route - Dijkstra:** lock the cheapest node on the current frontier.
7. **Interval Planner - Greedy:** build a compatible schedule by earliest finish.
8. **Memo Forge - Dynamic Programming:** construct Fibonacci values from cached cells.
9. **Sorting Arsenal:** practice insertion, selection, exchange, merge, quick, and heap sort.
10. **Depth Dive - DFS:** explore deeply and backtrack with an explicit stack.
11. **Grid Architect - MST:** build a minimum spanning tree with Kruskal's rule.
12. **Code Compressor - Huffman:** merge minimum frequencies into a prefix tree.

Every incorrect move explains the relevant rule without revealing the entire
solution. All games remain available at all times.

## Course Topic Coverage

AlgoRift includes interactive coverage of the COE428 topics shown in the
course resources: insertion, merge, heap, selection, exchange, quick, and
bubble sort; breadth-first search; depth-first search; Dijkstra's algorithm;
minimum spanning trees; and Huffman compression.

## Tech Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Static client-side gameplay
- Vercel

## Local Development

```bash
npm install
npm run dev
```

No database or environment variables are required.

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
