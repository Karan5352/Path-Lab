import type { CellKind, Coord, Maze } from "./types";

// Map of single ASCII char -> CellKind for the maze grammar.
const CHAR_MAP: Record<string, CellKind> = {
  "#": "wall",
  ".": "open",
  " ": "open",
  S: "start",
  G: "goal",
};

interface MazeTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: Maze["difficulty"];
  ascii: string;
}

function parseMaze(t: MazeTemplate): Maze {
  const rows = t.ascii
    .split("\n")
    .map((r) => r.replace(/\r$/, ""))
    .filter((r) => r.length > 0);
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const cells: CellKind[][] = [];
  let start: Coord | null = null;
  let goal: Coord | null = null;

  for (let y = 0; y < height; y++) {
    const row: CellKind[] = [];
    const line = rows[y].padEnd(width, "#");
    for (let x = 0; x < width; x++) {
      const ch = line[x];
      const kind = CHAR_MAP[ch];
      if (!kind) {
        throw new Error(
          `Maze ${t.id}: unknown char '${ch}' at (${x},${y}). Allowed: # . space S G T`,
        );
      }
      row.push(kind);
      if (kind === "start") start = { x, y };
      if (kind === "goal") goal = { x, y };
    }
    cells.push(row);
  }

  if (!start) throw new Error(`Maze ${t.id} is missing a start cell (S).`);
  if (!goal) throw new Error(`Maze ${t.id} is missing a goal cell (G).`);

  return {
    id: t.id,
    name: t.name,
    description: t.description,
    difficulty: t.difficulty,
    width,
    height,
    start,
    goal,
    cells,
  };
}

// Each maze is hand-authored. Borders are walls (#), one S, one G.

const TEMPLATES: MazeTemplate[] = [
  {
    id: "beginner",
    name: "Beginner Maze",
    description: "A short maze with one main path and a few branching corridors.",
    difficulty: "easy",
    ascii: `
###############
#S....#.......#
#.###.#.#####.#
#.#...#.....#.#
#.#.#######.#.#
#.#.#.....#.#.#
#.#.#.###.#.#.#
#.#.#.#.#.#.#.#
#.#...#.#...#.#
#.#####.#####.#
#............G#
###############
`,
  },
  {
    id: "deadend",
    name: "Dead-End Maze",
    description: "Lots of small pockets and stub corridors. Stresses depth-first and no-revisit strategies.",
    difficulty: "medium",
    ascii: `
#################
#S.....#.......G#
#.###.#.#######.#
#...#.#.#.....#.#
###.#.#.#.###.#.#
#...#.#.#.#.#.#.#
#.###.#.#.#.#.#.#
#.....#.#...#.#.#
#####.#.#####.#.#
#.....#.......#.#
#.#####.#######.#
#...............#
#################
`,
  },
  {
    id: "spiral",
    name: "Spiral Maze",
    description: "A long serpentine corridor with one continuous path. Useful for comparing pure step counts at scale.",
    difficulty: "medium",
    ascii: `
###############
#S............#
#############.#
#.............#
#.#############
#.............#
#############.#
#.............#
#.#############
#.............#
#############.#
#.............#
#.#############
#............G#
###############
`,
  },
  {
    id: "branching",
    name: "Branching Maze",
    description: "A medium maze with multiple branching forks and dead-ends. BFS and A* find the shortest path; greedy and DFS commit to wrong forks.",
    difficulty: "medium",
    ascii: `
#####################
#S....#.............#
#.###.#.#####.#####.#
#.#...#.#...#.#...#.#
#.#.###.#.#.#.#.#.#.#
#.#...#.#.#.#.#.#.#.#
#.###.#.#.#.#.#.#.#.#
#...#.#.#.#.#.#.#...#
###.#.#.#.#.#.#.###.#
#...#.#.#.#.#.#.#...#
#.###.#.#.#.#.#.###.#
#.....#.#.#.#.#.#...#
#####.#.#.#.#.#.###.#
#.......#.......#..G#
#####################
`,
  },
  {
    id: "loop",
    name: "Loop Maze",
    description: "Multiple cycles between rooms. Naive wall-followers can circle indefinitely.",
    difficulty: "hard",
    ascii: `
#################
#S..............#
#.#.###.###.###.#
#.#...#.#.#...#.#
#.###.#.#.#####.#
#.....#.#.....#.#
#####.#.#####.#.#
#.....#.....#.#.#
#.#########.#.#.#
#.#.........#.#.#
#.#.#######.#.#.#
#.#.#.....#.#.#.#
#.#.#.###.#.#.#.#
#...#.#.#.#...#.#
#####.#.#.#####G#
#...............#
#################
`,
  },
];

// Procedurally generate the boss maze with randomized DFS so it's always
// solvable and feels suitably labyrinthine. A fixed seed keeps it stable
// across runs. Width and height must be odd.
function generatePerfectMaze(
  width: number,
  height: number,
  seed: number,
): { rows: string[]; start: Coord; goal: Coord } {
  let s = seed >>> 0 || 1;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  // grid[y][x] = true means wall.
  const grid: boolean[][] = Array.from({ length: height }, () =>
    Array(width).fill(true),
  );
  const carve = (x: number, y: number) => {
    grid[y][x] = false;
    const dirs: [number, number][] = [
      [0, -2],
      [0, 2],
      [-2, 0],
      [2, 0],
    ];
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dx, dy] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx <= 0 || nx >= width - 1 || ny <= 0 || ny >= height - 1) continue;
      if (!grid[ny][nx]) continue;
      grid[y + dy / 2][x + dx / 2] = false;
      carve(nx, ny);
    }
  };
  carve(1, 1);

  // Knock out a few extra walls to create loops (adds visual interest and
  // makes wall-followers occasionally loop).
  for (let i = 0; i < 14; i++) {
    const x = 1 + Math.floor(rand() * (width - 2));
    const y = 1 + Math.floor(rand() * (height - 2));
    if (grid[y][x] && grid[y - 1]?.[x] === false && grid[y + 1]?.[x] === false) {
      grid[y][x] = false;
    } else if (
      grid[y][x] &&
      grid[y]?.[x - 1] === false &&
      grid[y]?.[x + 1] === false
    ) {
      grid[y][x] = false;
    }
  }

  const start = { x: 1, y: 1 };
  const goal = { x: width - 2, y: height - 2 };
  const rows = grid.map((row, y) =>
    row
      .map((wall, x) => {
        if (x === start.x && y === start.y) return "S";
        if (x === goal.x && y === goal.y) return "G";
        return wall ? "#" : ".";
      })
      .join(""),
  );
  return { rows, start, goal };
}

const BOSS = generatePerfectMaze(25, 21, 42);
TEMPLATES.push({
  id: "boss",
  name: "Boss Maze",
  description:
    "A 25×21 procedurally-generated maze with chambers, loops, and dead-ends. Fixed seed.",
  difficulty: "boss",
  ascii: BOSS.rows.join("\n"),
});

export const MAZES: Maze[] = TEMPLATES.map(parseMaze);

export const MAZES_BY_ID: Record<string, Maze> = Object.fromEntries(
  MAZES.map((m) => [m.id, m]),
);

// Utility: check that every maze actually has a path from start to goal.
// Throws at module load if a maze is broken, which acts as a unit test.
export function assertSolvable(maze: Maze): void {
  const seen = new Set<string>();
  const queue: Coord[] = [maze.start];
  while (queue.length) {
    const c = queue.shift()!;
    const k = `${c.x},${c.y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (c.x === maze.goal.x && c.y === maze.goal.y) return;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = c.x + dx;
      const ny = c.y + dy;
      if (
        ny >= 0 &&
        ny < maze.height &&
        nx >= 0 &&
        nx < maze.width &&
        maze.cells[ny][nx] !== "wall"
      ) {
        queue.push({ x: nx, y: ny });
      }
    }
  }
  throw new Error(`Maze "${maze.id}" has no path from start to goal.`);
}

// Validate on load so a broken template throws at dev time, not later.
MAZES.forEach(assertSolvable);
