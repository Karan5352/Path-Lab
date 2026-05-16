import type { BotDefinition, Direction, Coord, CellKind } from "../types";
import { DIRECTIONS, OPPOSITE, coordKey } from "../types";
import {
  astarPath,
  bfsPath,
  bfsPickBest,
  dfsPath,
  greedyPath,
  manhattan,
  bfsInKnown,
  openDirsFrom,
  step,
} from "./helpers";

// Memory shape shared by the planner-style bots.
interface PlanMemory {
  plan: Direction[]; // remaining moves
  planIndex: number;
}

// Compute an initial plan for a "search-then-walk" bot. In fog mode we have
// no plan up-front. The chooseMove function does incremental exploration.
function plannerInit(
  searcher: typeof bfsPath,
): NonNullable<BotDefinition["init"]> {
  return (maze, start, goal, mode) => {
    if (mode === "omniscient") {
      const res = searcher(maze, start, goal);
      return { plan: res.path, planIndex: 0, exploredAtPlan: res.explored };
    }
    return { plan: [] as Direction[], planIndex: 0, exploredAtPlan: 0 };
  };
}

/**
 * Generic chooseMove for fog-of-war "explorer" bots that incrementally build
 * a known map. `pickFrontier` returns the next direction; if it returns null,
 * the bot is exhausted (stuck).
 */
function fogExploreChoose(
  pickFrontier: (
    ctx: Parameters<BotDefinition["chooseMove"]>[0],
    knownGraph: Map<string, CellKind>,
  ) => Direction[],
): BotDefinition["chooseMove"] {
  return (ctx) => {
    const mem = ctx.memory as PlanMemory & { lastPlanFor?: string };
    const here = coordKey(ctx.current);

    // If we already have a plan and the next step is still walkable in our
    // known graph, keep walking.
    if (mem.plan && mem.plan.length > mem.planIndex) {
      return mem.plan[mem.planIndex++];
    }

    // Otherwise compute a new plan.
    const newPath = pickFrontier(ctx, ctx.discovered);
    mem.plan = newPath;
    mem.planIndex = 0;
    mem.lastPlanFor = here;
    if (newPath.length === 0) {
      // Nothing reachable. Pick any open direction as a last resort.
      const opens = openDirsFrom(ctx.current, (x, y) =>
        ctx.discovered.get(`${x},${y}`),
      );
      if (opens.length === 0) return null;
      return opens[0];
    }
    return mem.plan[mem.planIndex++];
  };
}

// ---------------------------------------------------------------------------
// BFS
// ---------------------------------------------------------------------------

export const bfsBot: BotDefinition = {
  id: "bfs",
  name: "BFS",
  emoji: "🟦",
  color: "#3B82F6",
  category: "planner",
  description:
    "Breadth-first search expands cells in concentric rings, guaranteeing the shortest path on an unweighted grid.",
  tagline: "Guaranteed shortest path on an unweighted grid.",
  worksWithFog: true,
  init: plannerInit(bfsPath),
  chooseMove(ctx) {
    if (ctx.mode === "omniscient") {
      const mem = ctx.memory as PlanMemory;
      if (mem.plan && mem.planIndex < mem.plan.length) {
        return mem.plan[mem.planIndex++];
      }
      return null;
    }
    return fogExploreChoose((ctx, known) => {
      // Try to plan to the goal through known cells first.
      const goalKey = coordKey(ctx.goal);
      if (known.has(goalKey)) {
        const toGoal = bfsInKnown(ctx.current, known, (c) =>
          c.x === ctx.goal.x && c.y === ctx.goal.y);
        if (toGoal.length) return toGoal;
      }
      // Otherwise, head to nearest frontier (a known cell with an unknown neighbor).
      return bfsInKnown(ctx.current, known, (c) => hasUnknownNeighbor(c, known));
    })(ctx);
  },
};

// ---------------------------------------------------------------------------
// DFS
// ---------------------------------------------------------------------------

export const dfsBot: BotDefinition = {
  id: "dfs",
  name: "DFS",
  emoji: "🔺",
  color: "#F97316",
  category: "planner",
  description:
    "Depth-first search explores as deep as possible before backtracking. Low memory, but rarely optimal.",
  tagline: "Explores deep before backtracking.",
  worksWithFog: true,
  init: plannerInit(dfsPath),
  chooseMove(ctx) {
    if (ctx.mode === "omniscient") {
      const mem = ctx.memory as PlanMemory;
      if (mem.plan && mem.planIndex < mem.plan.length) {
        return mem.plan[mem.planIndex++];
      }
      return null;
    }
    // Fog-of-war: prefer unvisited open neighbors; otherwise backtrack via stack.
    const mem = ctx.memory as { stack?: Direction[] };
    if (!mem.stack) mem.stack = [];
    const open = openDirsFrom(ctx.current, (x, y) =>
      ctx.discovered.get(`${x},${y}`),
    );
    // Pick a neighbor we haven't visited yet.
    const fresh = open.find((d) => {
      const n = step(ctx.current, d);
      return !ctx.visited.has(coordKey(n));
    });
    if (fresh) {
      mem.stack.push(fresh);
      return fresh;
    }
    // Backtrack.
    const back = mem.stack.pop();
    if (back) return OPPOSITE[back];
    // No backtrack available, give up.
    return null;
  },
};

// ---------------------------------------------------------------------------
// A*
// ---------------------------------------------------------------------------

export const astarBot: BotDefinition = {
  id: "astar",
  name: "A*",
  emoji: "✨",
  color: "#10B981",
  category: "planner",
  description:
    "A* combines BFS's optimality with a Manhattan-distance heuristic, exploring fewer cells than BFS on open mazes.",
  tagline: "Goal-directed search with a Manhattan heuristic.",
  worksWithFog: true,
  init: plannerInit(astarPath),
  chooseMove(ctx) {
    if (ctx.mode === "omniscient") {
      const mem = ctx.memory as PlanMemory;
      if (mem.plan && mem.planIndex < mem.plan.length) {
        return mem.plan[mem.planIndex++];
      }
      return null;
    }
    return fogExploreChoose((ctx, known) => {
      const goalKey = coordKey(ctx.goal);
      if (known.has(goalKey)) {
        const toGoal = bfsInKnown(ctx.current, known, (c) =>
          c.x === ctx.goal.x && c.y === ctx.goal.y);
        if (toGoal.length) return toGoal;
      }
      // Pick the frontier with the lowest A* f-score:
      // f(cell) = pathLen(current -> cell through known graph) + manhattan(cell -> goal).
      // This balances "near me" with "toward goal", instead of just "toward goal".
      return bfsPickBest(
        ctx.current,
        known,
        (c) => hasUnknownNeighbor(c, known),
        (c, pathLen) => pathLen + manhattan(c, ctx.goal),
      );
    })(ctx);
  },
};

// ---------------------------------------------------------------------------
// Greedy Best-First
// ---------------------------------------------------------------------------

export const greedyBot: BotDefinition = {
  id: "greedy",
  name: "Greedy Best-First",
  emoji: "💎",
  color: "#0EA5E9",
  category: "planner",
  description:
    "Always expands the node that looks closest to the goal. Fast on open maps, often suboptimal when the maze forces detours.",
  tagline: "Always expands the node closest to the goal.",
  worksWithFog: true,
  init: plannerInit(greedyPath),
  chooseMove(ctx) {
    if (ctx.mode === "omniscient") {
      const mem = ctx.memory as PlanMemory;
      if (mem.plan && mem.planIndex < mem.plan.length) {
        return mem.plan[mem.planIndex++];
      }
      return null;
    }
    // Fog: pick the local move with the lowest Manhattan distance to goal,
    // preferring unvisited neighbors first. This prevents oscillation at
    // local minima where two adjacent cells have similar heuristic values.
    const open = openDirsFrom(ctx.current, (x, y) =>
      ctx.discovered.get(`${x},${y}`),
    );
    if (open.length === 0) return null;
    const byGoal = (a: Direction, b: Direction) => {
      const na = step(ctx.current, a);
      const nb = step(ctx.current, b);
      return manhattan(na, ctx.goal) - manhattan(nb, ctx.goal);
    };
    const unvisited = open.filter((d) => !ctx.visited.has(coordKey(step(ctx.current, d))));
    if (unvisited.length > 0) {
      unvisited.sort(byGoal);
      return unvisited[0];
    }
    // All neighbors visited. Fall back to the least-visited one (escape loops).
    const sorted = [...open].sort((a, b) => {
      const na = step(ctx.current, a);
      const nb = step(ctx.current, b);
      const ca = ctx.visitCount.get(coordKey(na)) ?? 0;
      const cb = ctx.visitCount.get(coordKey(nb)) ?? 0;
      if (ca !== cb) return ca - cb;
      return manhattan(na, ctx.goal) - manhattan(nb, ctx.goal);
    });
    return sorted[0];
  },
};

// ---------------------------------------------------------------------------
// Wall Follower (right-hand rule)
// ---------------------------------------------------------------------------

interface WallFollowerMemory {
  facing: Direction;
}

const RIGHT_TURN: Record<Direction, Direction> = {
  up: "right",
  right: "down",
  down: "left",
  left: "up",
};
const LEFT_TURN: Record<Direction, Direction> = {
  up: "left",
  left: "down",
  down: "right",
  right: "up",
};

export const wallFollowerBot: BotDefinition = {
  id: "wall-follower",
  name: "Wall Follower",
  emoji: "🧱",
  color: "#8B5CF6",
  category: "local",
  description:
    "Keeps its right hand on the wall. Solves any simply-connected maze; can loop indefinitely on cyclic ones.",
  tagline: "Right-hand rule. Local-only, no global view.",
  worksWithFog: true,
  init: () => ({ facing: "right" as Direction }),
  chooseMove(ctx) {
    const mem = ctx.memory as WallFollowerMemory;
    const reveal = (x: number, y: number): CellKind | undefined => {
      if (ctx.mode === "omniscient" && ctx.maze) {
        if (
          x < 0 || y < 0 ||
          x >= ctx.maze.width || y >= ctx.maze.height
        )
          return undefined;
        return ctx.maze.cells[y][x];
      }
      return ctx.discovered.get(`${x},${y}`);
    };
    // Try: right, forward, left, back (right-hand rule).
    const order: Direction[] = [
      RIGHT_TURN[mem.facing],
      mem.facing,
      LEFT_TURN[mem.facing],
      OPPOSITE[mem.facing],
    ];
    for (const d of order) {
      const n = step(ctx.current, d);
      const k = reveal(n.x, n.y);
      // In fog, unknown cells are treated as walls (we can't see past them).
      if (k && k !== "wall") {
        mem.facing = d;
        return d;
      }
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Pledge algorithm
// ---------------------------------------------------------------------------

interface PledgeMemory {
  preferred: Direction;
  facing: Direction;
  angle: number;
  following: boolean;
  followSteps: number;
  followCap: number;
  initialized: boolean;
}

function directionTowardGoal(from: Coord, goal: Coord): Direction {
  const dx = goal.x - from.x;
  const dy = goal.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) return "right";
    if (dx < 0) return "left";
    return dy > 0 ? "down" : "up";
  }
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  return dx > 0 ? "right" : "left";
}

export const pledgeBot: BotDefinition = {
  id: "pledge",
  name: "Pledge",
  emoji: "🧭",
  color: "#6366F1",
  category: "local",
  description:
    "Walks a fixed preferred direction. When blocked, wall-follows while counting turns, then peels off when the angle counter returns to zero. Escapes obstacles that trap Wall Follower, but is not guaranteed on mazes whose walls lead away from the goal.",
  tagline: "Heading plus angle-tracked wall follow.",
  worksWithFog: true,
  init: (maze, start, goal) => ({
    preferred: directionTowardGoal(start, goal),
    facing: directionTowardGoal(start, goal),
    angle: 0,
    following: false,
    followSteps: 0,
    followCap: maze ? maze.width * maze.height * 2 : 2000,
    initialized: true,
  }),
  chooseMove(ctx) {
    const mem = ctx.memory as PledgeMemory;
    const reveal = (x: number, y: number): CellKind | undefined => {
      if (ctx.mode === "omniscient" && ctx.maze) {
        if (
          x < 0 || y < 0 ||
          x >= ctx.maze.width || y >= ctx.maze.height
        )
          return undefined;
        return ctx.maze.cells[y][x];
      }
      return ctx.discovered.get(`${x},${y}`);
    };
    const walkable = (d: Direction): boolean => {
      const n = step(ctx.current, d);
      const k = reveal(n.x, n.y);
      return !!k && k !== "wall";
    };

    if (!mem.initialized) {
      mem.preferred = directionTowardGoal(ctx.current, ctx.goal);
      mem.facing = mem.preferred;
      mem.angle = 0;
      mem.following = false;
      mem.followSteps = 0;
      mem.followCap = 2000;
      mem.initialized = true;
    }

    if (!mem.following) {
      if (walkable(mem.preferred)) {
        mem.facing = mem.preferred;
        return mem.preferred;
      }
      mem.following = true;
      mem.followSteps = 0;
    }

    if (mem.followSteps >= mem.followCap) return null;
    mem.followSteps++;

    // Right-hand wall-follow. Priority: right, forward, left, back.
    const order: { dir: Direction; turn: number }[] = [
      { dir: RIGHT_TURN[mem.facing], turn: -90 },
      { dir: mem.facing, turn: 0 },
      { dir: LEFT_TURN[mem.facing], turn: 90 },
      { dir: OPPOSITE[mem.facing], turn: 180 },
    ];
    for (const { dir, turn } of order) {
      if (!walkable(dir)) continue;
      mem.facing = dir;
      mem.angle += turn;
      if (mem.angle === 0) {
        mem.following = false;
      }
      return dir;
    }
    return null;
  },
};

// ---------------------------------------------------------------------------
// Local helpers
// ---------------------------------------------------------------------------

function hasUnknownNeighbor(c: Coord, known: Map<string, CellKind>): boolean {
  for (const d of DIRECTIONS) {
    const n = step(c, d);
    if (!known.has(coordKey(n))) return true;
  }
  return false;
}

export const STRONG_BOTS: BotDefinition[] = [
  bfsBot,
  astarBot,
  dfsBot,
  greedyBot,
  wallFollowerBot,
  pledgeBot,
];
