import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Eraser,
  Flag,
  Map as MapIcon,
  PaintBucket,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { customMazeStore, useCustomMaze } from "../state/customMazeStore";
import type { CellKind, Maze } from "../types";

type Tool = "wall" | "open" | "start" | "goal";
type Difficulty = Maze["difficulty"];

const DIFFICULTIES: { id: Difficulty; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "Short, simple paths" },
  { id: "medium", label: "Medium", hint: "Branches, some dead-ends" },
  { id: "hard", label: "Hard", hint: "Loops and complex topology" },
  { id: "boss", label: "Boss", hint: "Large or hostile layouts" },
];

const DIFFICULTY_STYLES: Record<Difficulty, string> = {
  easy: "border-emerald-300 bg-emerald-50 text-emerald-700",
  medium: "border-amber-300 bg-amber-50 text-amber-700",
  hard: "border-rose-300 bg-rose-50 text-rose-700",
  boss: "border-violet-400 bg-violet-50 text-violet-700",
};

const DEFAULT_W = 17;
const DEFAULT_H = 11;

function emptyAscii(w: number, h: number): string {
  // Border walls, interior open, S at (1,1) and G at (w-2, h-2).
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) row += "#";
      else if (x === 1 && y === 1) row += "S";
      else if (x === w - 2 && y === h - 2) row += "G";
      else row += ".";
    }
    rows.push(row);
  }
  return rows.join("\n");
}

function asciiToGrid(ascii: string): { cells: CellKind[][]; width: number; height: number } {
  const rows = ascii.split("\n").filter((r) => r.length > 0);
  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  const cells: CellKind[][] = [];
  for (let y = 0; y < height; y++) {
    const row: CellKind[] = [];
    const line = rows[y].padEnd(width, "#");
    for (let x = 0; x < width; x++) {
      const ch = line[x];
      if (ch === "#") row.push("wall");
      else if (ch === "S") row.push("start");
      else if (ch === "G") row.push("goal");
      else row.push("open");
    }
    cells.push(row);
  }
  return { cells, width, height };
}

function gridToAscii(cells: CellKind[][]): string {
  return cells
    .map((row) =>
      row
        .map((k) => {
          if (k === "wall") return "#";
          if (k === "start") return "S";
          if (k === "goal") return "G";
          return ".";
        })
        .join(""),
    )
    .join("\n");
}

export function MazeEditor() {
  const stored = useCustomMaze();
  const [name, setName] = useState(stored.data?.name ?? "My Maze");
  const [width, setWidth] = useState(stored.data?.width ?? DEFAULT_W);
  const [height, setHeight] = useState(stored.data?.height ?? DEFAULT_H);
  const [difficulty, setDifficulty] = useState<Difficulty>(
    stored.data?.difficulty ?? "medium",
  );
  const [grid, setGrid] = useState<CellKind[][]>(() => {
    if (stored.data) return asciiToGrid(stored.data.ascii).cells;
    return asciiToGrid(emptyAscii(DEFAULT_W, DEFAULT_H)).cells;
  });
  const [tool, setTool] = useState<Tool>("wall");
  const [isPainting, setIsPainting] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string }>({
    ok: !!stored.maze,
    msg: stored.maze ? "Maze is valid and saved." : stored.error ?? "Draw your maze, then save.",
  });

  // Live validation as the grid changes.
  useEffect(() => {
    const ascii = gridToAscii(grid);
    let start = 0;
    let goal = 0;
    for (const row of grid) for (const k of row) {
      if (k === "start") start++;
      if (k === "goal") goal++;
    }
    if (start !== 1) {
      setStatus({ ok: false, msg: `Need exactly one start cell (found ${start}).` });
      return;
    }
    if (goal !== 1) {
      setStatus({ ok: false, msg: `Need exactly one goal cell (found ${goal}).` });
      return;
    }
    // Solvability check via BFS.
    const sx = grid.findIndex((row) => row.includes("start"));
    const sRow = grid[sx];
    const sCol = sRow.indexOf("start");
    const gx = grid.findIndex((row) => row.includes("goal"));
    const gRow = grid[gx];
    const gCol = gRow.indexOf("goal");
    if (!bfsReaches(grid, sCol, sx, gCol, gx)) {
      setStatus({ ok: false, msg: "Start cannot reach goal." });
      return;
    }
    setStatus({ ok: true, msg: `Maze is valid (${ascii.split("\n")[0].length}×${grid.length}). Click Save to use it in the arena.` });
  }, [grid]);

  const paint = (x: number, y: number) => {
    setGrid((prev) => {
      const next = prev.map((row) => row.slice());
      const current = next[y][x];
      if (tool === "wall") next[y][x] = current === "wall" ? "open" : "wall";
      else if (tool === "open") next[y][x] = "open";
      else if (tool === "start") {
        // Remove existing start; place new.
        for (let yy = 0; yy < next.length; yy++) {
          for (let xx = 0; xx < next[yy].length; xx++) {
            if (next[yy][xx] === "start") next[yy][xx] = "open";
          }
        }
        next[y][x] = "start";
      } else if (tool === "goal") {
        for (let yy = 0; yy < next.length; yy++) {
          for (let xx = 0; xx < next[yy].length; xx++) {
            if (next[yy][xx] === "goal") next[yy][xx] = "open";
          }
        }
        next[y][x] = "goal";
      }
      return next;
    });
  };

  const resize = (w: number, h: number) => {
    const clampW = Math.max(7, Math.min(31, w));
    const clampH = Math.max(7, Math.min(25, h));
    setWidth(clampW);
    setHeight(clampH);
    setGrid(asciiToGrid(emptyAscii(clampW, clampH)).cells);
  };

  const clearInterior = () => {
    setGrid((prev) =>
      prev.map((row, y) =>
        row.map((k, x) => {
          if (x === 0 || y === 0 || x === row.length - 1 || y === prev.length - 1) return "wall";
          if (k === "start" || k === "goal") return k;
          return "open";
        }),
      ),
    );
  };

  const fillWalls = () => {
    setGrid((prev) =>
      prev.map((row, y) =>
        row.map((k, x) => {
          if (k === "start" || k === "goal") return k;
          if (x === 0 || y === 0 || x === row.length - 1 || y === prev.length - 1) return "wall";
          return "wall";
        }),
      ),
    );
  };

  const save = () => {
    const ascii = gridToAscii(grid);
    const result = customMazeStore.save({
      name: name.trim() || "Custom Maze",
      width: grid[0].length,
      height: grid.length,
      difficulty,
      ascii,
    });
    if (result.ok) {
      setStatus({ ok: true, msg: "Saved. Open the arena to race on it." });
    } else {
      setStatus({ ok: false, msg: result.error ?? "Save failed." });
    }
  };

  const reset = () => {
    setGrid(asciiToGrid(emptyAscii(width, height)).cells);
  };

  const deleteSaved = () => {
    customMazeStore.clear();
    setStatus({ ok: false, msg: "Saved maze removed." });
  };

  // Cell size for the SVG editor canvas. Scale so the whole thing fits ~720px.
  const cs = useMemo(() => Math.max(18, Math.min(36, Math.floor(720 / width))), [width]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 grid lg:grid-cols-[320px_1fr] gap-5">
      <aside className="space-y-4">
        <div className="surface p-4">
          <div className="flex items-center gap-2">
            <MapIcon size={16} className="text-brand-600" />
            <h2 className="font-display font-semibold text-ink-900">Maze details</h2>
          </div>
          <div className="mt-3 space-y-3">
            <label className="block text-xs font-semibold text-ink-500">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-medium text-ink-900"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs font-semibold text-ink-500">
                Width
                <input
                  type="number"
                  min={7}
                  max={31}
                  value={width}
                  onChange={(e) => resize(Number(e.target.value), height)}
                  className="mt-1 block w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-mono text-ink-900"
                />
              </label>
              <label className="block text-xs font-semibold text-ink-500">
                Height
                <input
                  type="number"
                  min={7}
                  max={25}
                  value={height}
                  onChange={(e) => resize(width, Number(e.target.value))}
                  className="mt-1 block w-full rounded-lg border border-ink-100 bg-white px-3 py-2 text-sm font-mono text-ink-900"
                />
              </label>
            </div>
            <p className="text-[11px] text-ink-500">
              Resizing the maze resets the grid.
            </p>
            <div>
              <span className="block text-xs font-semibold text-ink-500 mb-1.5">
                Difficulty
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulty(d.id)}
                    title={d.hint}
                    className={clsx(
                      "rounded-lg border px-2.5 py-1.5 text-xs font-medium text-left transition-colors",
                      difficulty === d.id
                        ? DIFFICULTY_STYLES[d.id]
                        : "border-ink-100 bg-white text-ink-700 hover:border-brand-300",
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-ink-500 mt-1.5 leading-snug">
                Shown as a pill on the maze card in the arena. Cosmetic only.
              </p>
            </div>
          </div>
        </div>

        <div className="surface p-4">
          <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-2">
            Tool
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <ToolButton label="Wall" icon={<PaintBucket size={14} />} active={tool === "wall"} onClick={() => setTool("wall")} />
            <ToolButton label="Open" icon={<Eraser size={14} />} active={tool === "open"} onClick={() => setTool("open")} />
            <ToolButton label="Start" icon={<Play size={14} />} active={tool === "start"} onClick={() => setTool("start")} />
            <ToolButton label="Goal" icon={<Flag size={14} />} active={tool === "goal"} onClick={() => setTool("goal")} />
          </div>
          <p className="text-[11px] text-ink-500 mt-2 leading-snug">
            Click to paint. Drag to paint multiple cells. Wall toggles between wall and open.
          </p>
        </div>

        <div className="surface p-4 space-y-2">
          <button className="btn-ghost w-full justify-start" onClick={reset}>
            <RotateCcw size={14} /> Reset to empty
          </button>
          <button className="btn-ghost w-full justify-start" onClick={fillWalls}>
            <PaintBucket size={14} /> Fill with walls
          </button>
          <button className="btn-ghost w-full justify-start" onClick={clearInterior}>
            <Eraser size={14} /> Clear interior
          </button>
          {stored.data && (
            <button className="btn-danger w-full justify-start" onClick={deleteSaved}>
              <Trash2 size={14} /> Delete saved maze
            </button>
          )}
        </div>
      </aside>

      <section className="space-y-3 min-w-0">
        <div className="surface p-4 flex flex-wrap items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <MapIcon size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-display font-semibold text-ink-900 truncate">
              {name || "My Maze"}
            </div>
            <div
              className={clsx(
                "text-xs mt-0.5 flex items-center gap-1.5",
                status.ok ? "text-emerald-600" : "text-rose-600",
              )}
            >
              {status.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
              {status.msg}
            </div>
          </div>
          <button className="btn-primary" onClick={save} disabled={!status.ok}>
            Save maze
          </button>
          <Link
            to="/arena"
            className={clsx("btn-accent", !stored.maze && "pointer-events-none opacity-50")}
          >
            Test in arena
          </Link>
        </div>

        <div
          className="surface p-3 md:p-4 arena-bg"
          onMouseUp={() => setIsPainting(false)}
          onMouseLeave={() => setIsPainting(false)}
        >
          <svg
            viewBox={`0 0 ${width * cs} ${height * cs}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full h-auto select-none"
            style={{ maxHeight: "min(75vh, 720px)" }}
          >
            {grid.flatMap((row, y) =>
              row.map((kind, x) => {
                const px = x * cs;
                const py = y * cs;
                const fill =
                  kind === "wall"
                    ? "#5A33E0"
                    : kind === "goal"
                    ? "#FFF6E0"
                    : kind === "start"
                    ? "#D1FAE5"
                    : "#FFFFFF";
                return (
                  <g key={`${x}-${y}`}>
                    <rect
                      x={px}
                      y={py}
                      width={cs}
                      height={cs}
                      fill={fill}
                      stroke="#E6E9F2"
                      strokeWidth={0.5}
                      onMouseDown={() => {
                        setIsPainting(true);
                        paint(x, y);
                      }}
                      onMouseEnter={() => {
                        if (isPainting) paint(x, y);
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    {kind === "start" && (
                      <circle cx={px + cs / 2} cy={py + cs / 2} r={cs / 3} fill="#10B981" pointerEvents="none" />
                    )}
                    {kind === "goal" && (
                      <text
                        x={px + cs / 2}
                        y={py + cs / 2 + cs * 0.18}
                        textAnchor="middle"
                        fontSize={cs * 0.7}
                        pointerEvents="none"
                      >
                        🏁
                      </text>
                    )}
                  </g>
                );
              }),
            )}
          </svg>
        </div>
      </section>
    </div>
  );
}

function ToolButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-lg border px-3 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors",
        active
          ? "border-brand-500 bg-brand-50 text-brand-700 shadow-ring"
          : "border-ink-100 bg-white text-ink-700 hover:border-brand-300",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function bfsReaches(
  cells: CellKind[][],
  sx: number,
  sy: number,
  gx: number,
  gy: number,
): boolean {
  const seen = new Set<string>();
  const q: [number, number][] = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift()!;
    const k = `${x},${y}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (x === gx && y === gy) return true;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (ny < 0 || ny >= cells.length) continue;
      if (nx < 0 || nx >= cells[ny].length) continue;
      if (cells[ny][nx] === "wall") continue;
      q.push([nx, ny]);
    }
  }
  return false;
}
