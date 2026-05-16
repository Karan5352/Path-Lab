# PathLab

> A live maze-exploration arena where search algorithms and custom bots race to the goal.

<p align="center">
  <strong>BFS · DFS · A* · Greedy Best-First · Wall Follower · Panic Bot · Beeline Bot · Left Turner · Drifter · …and your custom bot.</strong>
</p>

PathLab is an algorithm-battle simulator, not a generic pathfinding visualizer. Pick a maze, pick competitors, pick whether they get to see the whole maze or only fog-of-war, and watch them race step-by-step on the same scoreboard.

## Overview

- **Frontend-only.** Vite + React + TypeScript + Tailwind CSS. No backend required.
- **Two vision modes.** *Omniscient*: bots see the full maze. *Explorer*: fog of war; bots only know what they've stepped near.
- **Step-by-step movement.** Every competitor takes one move per tick on a shared timeline. Live scoreboard updates as the race unfolds.
- **A real custom-bot editor.** Write a JavaScript `chooseMove(context)` function, save it to local storage, and pit it against the rest of the league.

## Features

- Landing page · Main arena · Bot guide · Custom-bot editor
- 6 prebuilt mazes ranging from beginner to a procedurally-generated boss
- 13 prebuilt competitors split into three real categories: 4 whole-maze planners, 2 local-rule strategies, and 7 intentionally flawed bots
- A click-to-paint **maze editor** that saves a custom maze to local storage and exposes it in the arena
- Start, Pause, Resume, Step, Reset, Force-finish, and a 1–60 moves/sec speed slider
- Collapsible setup panel so the arena can take the full width
- Live maze visualization with per-bot trails, status badges, and finish glow
- Scoreboard: status, steps, cells explored, dead-ends, backtracks, loops, runtime, final rank, efficiency
- Final results panel with ranking, winner spotlight, and a "race again" CTA
- Sandboxed custom-bot compiler with starter templates, error messages, and a 250 ms per-move guard
- Custom-bot editor with a multi-page emoji picker and color palette

## Competitors

Bots fall into three buckets by how much information they use.

### Whole-maze planners

These take the entire maze on race start, run a graph search over it, and walk the resulting path. They use the full omniscient view in omniscient mode and switch to incremental exploration in fog of war.

| Bot | What it does |
|---|---|
| **BFS** | Shortest path on an unweighted grid. Optimal step count, baseline against everything else. |
| **DFS** | Depth-first dive-and-backtrack. Often longer paths, lower memory. |
| **A\*** | BFS with a Manhattan-distance heuristic. Fewer cells expanded than BFS on open maps. |
| **Greedy Best-First** | Always expands the node that looks closest to the goal. Fast on open maps, fragile in mazes. |

### Local-rule strategies

These only look at the four cells immediately next to the bot. They behave identically in omniscient and fog modes because they never use the full-maze view either way. Solve any simply-connected maze; can loop on mazes with internal cycles.

| Bot | What it does |
|---|---|
| **Wall Follower 🧱** | Classic right-hand rule. |
| **Left Turner ↩️** | Mirror image: left-hand rule. |

### Intentionally flawed bots

| Bot | Strategy |
|---|---|
| **Random Walker 🎲** | Uniformly random open direction. |
| **Panic Bot 😱** | Picks the move that *increases* distance to the goal. |
| **Beeline Bot 🐝** | Heads straight toward the goal and refuses to revisit cells; terminated by the first dead-end. |
| **Wall Hugger 🫂** | Prefers cells adjacent to walls; slow through open rooms. |
| **Stubborn Bot 🐂** | Commits to a direction until something blocks it. |
| **Coward Bot 🐔** | Refuses to step into any cell that looks like a dead-end (one walkable neighbor). |
| **Drifter 🌀** | Mostly random, biased toward continuing in the last direction. |

## Custom bot

Open the **Custom bot** page and edit a JavaScript `chooseMove(context)` function. The `context` argument exposes:

```ts
context.current        // { x, y } your position this tick
context.goal           // { x, y } the goal cell
context.neighbors      // { up?, down?, left?, right? } cell kinds
context.visited        // Set<string>  "x,y" of every visited cell
context.visitCount     // Map<string, number>
context.trail          // ordered array of positions
context.maze           // full maze in omniscient mode, null in fog
context.discovered     // Map<string, CellKind> of cells you've seen
context.mode           // 'omniscient' | 'explorer'
context.memory         // your own state object, persistent across calls
context.steps          // moves made so far
context.lastDirection  // 'up' | 'down' | 'left' | 'right' | null
```

Return `'up' | 'down' | 'left' | 'right'` (or `null` to give up). The compiler:

- Runs your code via a sandboxed `new Function`. Code is **browser-only**, nothing is uploaded.
- Validates the return value and disqualifies the bot on invalid output or runtime errors.
- Aborts any `chooseMove` call that exceeds 250 ms to keep the UI responsive.
- Lets you pick a name, color, and emoji, and saves it to `localStorage`.

Three starter templates are included: a goal-seeker, a wall-follower, and a no-revisit greedy bot.

## Mazes

| Maze | Size | Flavor |
|---|---|---|
| Beginner | 15×12 | Gentle warm-up with a few harmless branches |
| Dead-End | 17×13 | Pockets and stubs to trap depth-first explorers |
| Spiral | 15×15 | A long serpentine corridor; useful for comparing step counts at scale |
| Branching | 21×15 | Multiple branching forks; greedy and DFS commit to wrong forks |
| Loop Maze | 17×17 | Multiple cycles. Naive wall-followers can circle indefinitely. |
| Boss | 25×21 | A procedurally-generated labyrinth (fixed seed) with chambers, loops, and dead-ends |

## Ranking

After every race, bots are ranked by:

1. Reached the goal (finishers above non-finishers)
2. Efficiency score (100 for optimal, minus waste/traps/loops/backtracks)
3. Fewest steps
4. Fewest unique cells explored
5. Fewest penalties
6. Lowest runtime

## Setup

Requires Node 18+ (Node 22 recommended).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
npm run preview  # serve the built bundle locally
npm run typecheck
```

## Architecture

```
src/
├── App.tsx                  router shell
├── types.ts                 shared types (Maze, Bot, RaceConfig, etc.)
├── mazes.ts                 ASCII templates + procedural boss + solvability assertions
├── bots/
│   ├── helpers.ts           BFS/DFS/A* helpers, neighbor utilities
│   ├── strong.ts            Planners (BFS, DFS, A*, Greedy) + Wall Follower
│   ├── flawed.ts            Left Turner (local) + 7 intentionally flawed bots
│   ├── custom.ts            sandboxed compiler for user bots
│   └── index.ts             registry
├── engine/
│   ├── race.ts              RaceController state machine + scoring
│   └── useRace.ts           React hook around the controller
├── state/customBotStore.ts  localStorage-backed store for the custom bot
├── components/              MazeCanvas, Controls, Scoreboard, Results, Selectors, Layout
└── pages/                   Landing, Arena, Editor, Guide
```

Adding a new bot is a single file: implement `BotDefinition` and add it to the registry in `src/bots/index.ts`. Adding a maze is one ASCII template in `src/mazes.ts`.

## Future improvements

- Weighted terrain (grass / mud / stone) + Dijkstra-style bots
- A Q-Learning bot trained in-browser across multiple races
- Tournament mode: round-robin across all mazes, aggregate leaderboard
- Saved bots (name + revisions)
- Replay scrubber with timeline of every move
- User-created mazes via a paint tool
- Multiplayer / shareable race links

## Resume bullet

> Built **PathLab**, a browser-based maze-racing arena (React + Vite + TypeScript + Tailwind) where classic search algorithms (BFS, DFS, A*, Greedy Best-First, Wall Follower) compete head-to-head against intentionally flawed agents, with a sandboxed JavaScript editor for user-authored bots, two visibility modes (omniscient and fog-of-war), and a real-time scoreboard ranking competitors on efficiency, exploration cost, and penalties.

## License

MIT.
