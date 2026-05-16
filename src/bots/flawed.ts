import type { BotDefinition, CellKind, Direction } from "../types";
import { DIRECTIONS, OPPOSITE, coordKey } from "../types";
import { manhattan, openDirsFrom, step } from "./helpers";

// Tiny seeded PRNG so races are reproducible-ish. Each run reseeds at init.
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function reveal(ctx: Parameters<BotDefinition["chooseMove"]>[0]) {
  return (x: number, y: number): CellKind | undefined => {
    if (ctx.mode === "omniscient" && ctx.maze) {
      if (
        x < 0 ||
        y < 0 ||
        x >= ctx.maze.width ||
        y >= ctx.maze.height
      )
        return undefined;
      return ctx.maze.cells[y][x];
    }
    return ctx.discovered.get(`${x},${y}`);
  };
}

const TURN_LEFT: Record<Direction, Direction> = {
  up: "left",
  left: "down",
  down: "right",
  right: "up",
};

// ---------------------------------------------------------------------------

export const randomWalkerBot: BotDefinition = {
  id: "random",
  name: "Random Walker",
  emoji: "🎲",
  color: "#EC4899",
  category: "flawed",
  description:
    "Picks a direction uniformly at random every step. Occasionally succeeds on small mazes.",
  tagline: "Uniformly random direction every step.",
  worksWithFog: true,
  init: () => ({ rng: mulberry32(Date.now() + Math.floor(Math.random() * 1e6)) }),
  chooseMove(ctx) {
    const mem = ctx.memory as { rng: () => number };
    const opens = openDirsFrom(ctx.current, reveal(ctx));
    if (opens.length === 0) return null;
    return opens[Math.floor(mem.rng() * opens.length)];
  },
};

export const panicBot: BotDefinition = {
  id: "panic",
  name: "Panic Bot",
  emoji: "😱",
  color: "#F43F5E",
  category: "flawed",
  description:
    "Picks the move that increases Manhattan distance to the goal the most. An inverted greedy.",
  tagline: "Always moves to maximize distance from the goal.",
  worksWithFog: true,
  chooseMove(ctx) {
    const opens = openDirsFrom(ctx.current, reveal(ctx));
    if (opens.length === 0) return null;
    opens.sort((a, b) => {
      const na = step(ctx.current, a);
      const nb = step(ctx.current, b);
      return manhattan(nb, ctx.goal) - manhattan(na, ctx.goal);
    });
    return opens[0];
  },
};

export const leftTurnLarryBot: BotDefinition = {
  id: "larry",
  name: "Left Turner",
  emoji: "↩️",
  color: "#84CC16",
  category: "local",
  description:
    "Left-hand rule variant of the wall-follower. Subject to the same loop pathologies on cyclic mazes.",
  tagline: "Left-hand rule. Always tries left first.",
  worksWithFog: true,
  init: () => ({ facing: "right" as Direction }),
  chooseMove(ctx) {
    const mem = ctx.memory as { facing: Direction };
    const order: Direction[] = [
      TURN_LEFT[mem.facing],
      mem.facing,
      TURN_LEFT[TURN_LEFT[TURN_LEFT[mem.facing]]], // right turn
      OPPOSITE[mem.facing],
    ];
    const r = reveal(ctx);
    for (const d of order) {
      const n = step(ctx.current, d);
      const k = r(n.x, n.y);
      if (k && k !== "wall") {
        mem.facing = d;
        return d;
      }
    }
    return null;
  },
};

export const greedyGoblinBot: BotDefinition = {
  id: "goblin",
  name: "Beeline Bot",
  emoji: "🐝",
  color: "#D946EF",
  category: "flawed",
  description:
    "Heads in a straight line toward the goal and refuses to revisit any cell. Gets terminated by the first dead-end on its chosen path.",
  tagline: "Beelines toward the goal, no revisits.",
  worksWithFog: true,
  chooseMove(ctx) {
    const opens = openDirsFrom(ctx.current, reveal(ctx)).filter((d) => {
      const n = step(ctx.current, d);
      return !ctx.visited.has(coordKey(n));
    });
    if (opens.length === 0) return null;
    opens.sort((a, b) => {
      const na = step(ctx.current, a);
      const nb = step(ctx.current, b);
      return manhattan(na, ctx.goal) - manhattan(nb, ctx.goal);
    });
    return opens[0];
  },
};

export const wallHuggerBot: BotDefinition = {
  id: "hugger",
  name: "Wall Hugger",
  emoji: "🫂",
  color: "#14B8A6",
  category: "flawed",
  description:
    "Prefers cells with the most wall neighbors. Slow through open rooms, decent through tight corridors.",
  tagline: "Prefers cells adjacent to walls.",
  worksWithFog: true,
  chooseMove(ctx) {
    const r = reveal(ctx);
    const opens = openDirsFrom(ctx.current, r);
    if (opens.length === 0) return null;
    const scored = opens.map((d) => {
      const n = step(ctx.current, d);
      let wallTouches = 0;
      for (const nd of DIRECTIONS) {
        const nn = step(n, nd);
        const k = r(nn.x, nn.y);
        if (k === "wall" || k === undefined) wallTouches++;
      }
      const distance = manhattan(n, ctx.goal);
      // Prefer wall-touching cells; tie-break by distance to goal.
      return { d, score: -wallTouches * 100 + distance };
    });
    scored.sort((a, b) => a.score - b.score);
    return scored[0].d;
  },
};

export const stubbornBot: BotDefinition = {
  id: "stubborn",
  name: "Stubborn Bot",
  emoji: "🐂",
  color: "#F59E0B",
  category: "flawed",
  description:
    "Commits to one direction until something blocks it, then picks a new direction and commits to that.",
  tagline: "Holds a direction until forced to change.",
  worksWithFog: true,
  init: () => ({ facing: null as Direction | null }),
  chooseMove(ctx) {
    const mem = ctx.memory as { facing: Direction | null };
    const r = reveal(ctx);
    const opens = openDirsFrom(ctx.current, r);
    if (opens.length === 0) return null;
    if (mem.facing && opens.includes(mem.facing)) return mem.facing;
    // Pick a new direction, preferring one toward the goal.
    opens.sort((a, b) => {
      const na = step(ctx.current, a);
      const nb = step(ctx.current, b);
      return manhattan(na, ctx.goal) - manhattan(nb, ctx.goal);
    });
    mem.facing = opens[0];
    return opens[0];
  },
};

export const cowardBot: BotDefinition = {
  id: "coward",
  name: "Coward Bot",
  emoji: "🐔",
  color: "#06B6D4",
  category: "flawed",
  description:
    "Refuses to step into a cell that looks like a dead-end (a cell with only one walkable neighbor). Reroutes around them, sometimes endlessly.",
  tagline: "Avoids cells that look like dead-ends.",
  worksWithFog: true,
  chooseMove(ctx) {
    const r = reveal(ctx);
    const opens = openDirsFrom(ctx.current, r);
    if (opens.length === 0) return null;
    const looksLikeDeadEnd = (x: number, y: number) => {
      // The goal is never scary, even if it's tucked in a corner.
      if (x === ctx.goal.x && y === ctx.goal.y) return false;
      let walkableNeighbors = 0;
      for (const d of DIRECTIONS) {
        const n = step({ x, y }, d);
        const k = r(n.x, n.y);
        if (k && k !== "wall") walkableNeighbors++;
      }
      return walkableNeighbors <= 1;
    };
    const safe = opens.filter((d) => {
      const n = step(ctx.current, d);
      return !looksLikeDeadEnd(n.x, n.y);
    });
    const pool = safe.length ? safe : opens;
    pool.sort((a, b) => {
      const na = step(ctx.current, a);
      const nb = step(ctx.current, b);
      return manhattan(na, ctx.goal) - manhattan(nb, ctx.goal);
    });
    return pool[0];
  },
};

export const drifterBot: BotDefinition = {
  id: "drifter",
  name: "Drifter",
  emoji: "🌀",
  color: "#EF4444",
  category: "flawed",
  description:
    "Mostly random, but biased toward continuing in its last direction. A random walker with momentum.",
  tagline: "Random with directional momentum.",
  worksWithFog: true,
  init: () => ({
    rng: mulberry32(Date.now() + Math.floor(Math.random() * 1e6)),
    last: null as Direction | null,
  }),
  chooseMove(ctx) {
    const mem = ctx.memory as { rng: () => number; last: Direction | null };
    const opens = openDirsFrom(ctx.current, reveal(ctx));
    if (opens.length === 0) return null;
    // 55% chance to continue in same direction if possible.
    if (mem.last && opens.includes(mem.last) && mem.rng() < 0.55) {
      return mem.last;
    }
    const pick = opens[Math.floor(mem.rng() * opens.length)];
    mem.last = pick;
    return pick;
  },
};

export const FLAWED_BOTS: BotDefinition[] = [
  randomWalkerBot,
  panicBot,
  leftTurnLarryBot,
  greedyGoblinBot,
  wallHuggerBot,
  stubbornBot,
  cowardBot,
  drifterBot,
];
