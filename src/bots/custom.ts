import type { BotDefinition, Direction } from "../types";

export const DEFAULT_CUSTOM_BOT_CODE = `// Write a strategy that picks ONE move per step.
//
// The 'context' argument has:
//   context.current       -> { x, y } your current cell
//   context.goal          -> { x, y } the goal cell
//   context.neighbors     -> { up?, down?, left?, right? }
//                            each value is 'open' | 'wall' | 'start' | 'goal'
//                            | undefined (unknown in fog mode)
//   context.visited       -> Set of "x,y" strings you've already stepped on
//   context.visitCount    -> Map of "x,y" -> times visited
//   context.trail         -> array of { x, y } positions you've walked
//   context.maze          -> the full maze in omniscient mode, null in fog
//   context.discovered    -> Map "x,y" -> cell kind that you've seen so far
//   context.mode          -> 'omniscient' | 'explorer'
//   context.memory        -> a JS object you can write to between calls
//   context.steps         -> how many moves you've made
//   context.lastDirection -> the last direction you returned (or null)
//
// Return one of: 'up', 'down', 'left', 'right' (or null to give up).
//
// Tip: use context.memory to remember things between steps.

function chooseMove(context) {
  // Try to head toward the goal; fall back to any open neighbor.
  const { current, goal, neighbors } = context;
  const dx = goal.x - current.x;
  const dy = goal.y - current.y;

  const order = [];
  if (Math.abs(dx) > Math.abs(dy)) {
    order.push(dx > 0 ? 'right' : 'left');
    order.push(dy > 0 ? 'down' : 'up');
  } else {
    order.push(dy > 0 ? 'down' : 'up');
    order.push(dx > 0 ? 'right' : 'left');
  }
  order.push('up', 'down', 'left', 'right');

  for (const d of order) {
    if (neighbors[d] && neighbors[d] !== 'wall') return d;
  }
  return null;
}
`;

export const STARTER_TEMPLATES: { name: string; description: string; code: string }[] = [
  {
    name: "Goal-Seeker",
    description: "Heads toward the goal Manhattan-wise; falls back to any open dir.",
    code: DEFAULT_CUSTOM_BOT_CODE,
  },
  {
    name: "Right-Hand Wall Follower",
    description: "Classic right-hand rule. Solves any simply-connected maze.",
    code: `// Keep your right hand on the wall.
function chooseMove(context) {
  const facing = context.memory.facing || 'right';
  const right = { up: 'right', right: 'down', down: 'left', left: 'up' }[facing];
  const left  = { up: 'left',  left: 'down', down: 'right', right: 'up' }[facing];
  const back  = { up: 'down',  down: 'up',   left: 'right', right: 'left' }[facing];
  for (const d of [right, facing, left, back]) {
    if (context.neighbors[d] && context.neighbors[d] !== 'wall') {
      context.memory.facing = d;
      return d;
    }
  }
  return null;
}`,
  },
  {
    name: "Avoid-Revisits",
    description: "Greedy toward the goal, but refuses to revisit any cell.",
    code: `function chooseMove(context) {
  const dirs = ['up', 'down', 'left', 'right'];
  const opens = dirs.filter(d => context.neighbors[d] && context.neighbors[d] !== 'wall');
  const fresh = opens.filter(d => {
    const nx = context.current.x + (d === 'right' ? 1 : d === 'left' ? -1 : 0);
    const ny = context.current.y + (d === 'down' ? 1 : d === 'up'   ? -1 : 0);
    return !context.visited.has(nx + ',' + ny);
  });
  const pool = fresh.length ? fresh : opens;
  pool.sort((a, b) => {
    const ax = context.current.x + (a === 'right' ? 1 : a === 'left' ? -1 : 0);
    const ay = context.current.y + (a === 'down' ? 1 : a === 'up'   ? -1 : 0);
    const bx = context.current.x + (b === 'right' ? 1 : b === 'left' ? -1 : 0);
    const by = context.current.y + (b === 'down' ? 1 : b === 'up'   ? -1 : 0);
    return Math.abs(ax - context.goal.x) + Math.abs(ay - context.goal.y) -
           Math.abs(bx - context.goal.x) - Math.abs(by - context.goal.y);
  });
  return pool[0] || null;
}`,
  },
];

const VALID: Direction[] = ["up", "down", "left", "right"];

export interface CompiledBot {
  ok: boolean;
  bot?: BotDefinition;
  error?: string;
}

export function compileCustomBot(code: string, opts: {
  id?: string;
  name?: string;
  color?: string;
  emoji?: string;
}): CompiledBot {
  const id = opts.id ?? "custom";
  const name = (opts.name ?? "Custom Bot").trim() || "Custom Bot";
  const color = opts.color ?? "#6E45FF";
  const emoji = opts.emoji ?? "🛠️";

  let chooseMoveFn: (ctx: unknown) => unknown;
  try {
    // Wrap user code so it can be `function chooseMove(...) { ... }` OR a bare
    // function expression / arrow.
    const wrapper = `
      ${code}
      ;return typeof chooseMove === 'function' ? chooseMove : null;
    `;
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const factory = new Function(wrapper);
    const result = factory();
    if (typeof result !== "function") {
      return {
        ok: false,
        error:
          "Could not find a `chooseMove` function. Define one with: function chooseMove(context) { ... }",
      };
    }
    chooseMoveFn = result as (ctx: unknown) => unknown;
  } catch (err) {
    return { ok: false, error: `Syntax error: ${(err as Error).message}` };
  }

  // Wrap chooseMove with validation + timing guard.
  const bot: BotDefinition = {
    id,
    name,
    emoji,
    color,
    category: "custom",
    description: "Your custom strategy. Edit the code in the bot editor.",
    tagline: "Built by you.",
    worksWithFog: true,
    init: () => ({}),
    chooseMove(ctx) {
      const t0 = performance.now();
      let result: unknown;
      try {
        result = chooseMoveFn(ctx);
      } catch (err) {
        throw new Error(`Runtime error: ${(err as Error).message}`);
      }
      const dt = performance.now() - t0;
      if (dt > 250) {
        // Slow move. We can't actually interrupt synchronous JS, but we can
        // disqualify a bot that takes too long.
        throw new Error(`chooseMove() took ${dt.toFixed(0)}ms; aborting.`);
      }
      if (result === null || result === undefined) return null;
      if (typeof result !== "string" || !VALID.includes(result as Direction)) {
        throw new Error(
          `chooseMove() returned ${JSON.stringify(result)}. Must be 'up', 'down', 'left', 'right', or null.`,
        );
      }
      return result as Direction;
    },
  };
  return { ok: true, bot };
}
