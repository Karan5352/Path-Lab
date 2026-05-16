import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Code2, Cpu, Eye, Map, Sparkles, X } from "lucide-react";
import { ALL_BOTS, FLAWED_BOTS, LOCAL_BOTS, PLANNER_BOTS } from "../bots";
import { MAZES_BY_ID } from "../mazes";
import { MazeCanvas } from "../components/MazeCanvas";
import { useRace } from "../engine/useRace";
import type { BotDefinition, RaceConfig } from "../types";

export function Landing() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-16">
      <section className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
        <div className="animate-fade-in">
          <span className="pill bg-brand-50 text-brand-700 border border-brand-100">
            <Sparkles size={12} /> Algorithm battle arena
          </span>
          <h1 className="mt-3 font-display text-4xl md:text-6xl font-bold tracking-tight text-ink-900 leading-[1.05]">
            Race search algorithms
            <br />
            <span className="text-brand-600">on the same maze.</span>
          </h1>
          <p className="mt-5 text-ink-500 text-lg max-w-xl leading-relaxed">
            PathLab is a live arena where classic search algorithms (BFS, DFS,
            A*, Greedy Best-First, and wall-followers) race step-by-step
            against a set of intentionally flawed bots. Pick a maze, pick
            competitors, watch them go.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Link to="/arena" className="btn-accent">
              <ArrowRight size={16} /> Open the arena
            </Link>
            <Link to="/editor" className="btn-ghost">
              <Code2 size={16} /> Build your own bot
            </Link>
            <Link to="/guide" className="btn-ghost">
              Strategy guide
            </Link>
          </div>
        </div>

        <LiveArenaPreview />
      </section>

      <section className="mt-20 grid md:grid-cols-3 gap-4">
        <Feature
          icon={<Cpu size={18} />}
          title="Algorithms vs. agents"
          body="BFS, DFS, A*, Greedy Best-First, and Wall-Follower implementations, each running step-by-step on the same maze and the same scoreboard."
        />
        <Feature
          icon={<Eye size={18} />}
          title="Two vision modes"
          body="Omniscient: bots see the full maze. Explorer: fog of war; bots only know what they've stepped near."
        />
        <Feature
          icon={<Code2 size={18} />}
          title="Bring your own bot"
          body="Write a JavaScript chooseMove() in the in-browser editor and run it against every prebuilt competitor."
        />
      </section>

      <CompetitorsSection />

      <BuildYourOwn />

      <MazesBlurb />
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="surface p-5">
      <span className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shadow-soft">
        {icon}
      </span>
      <h3 className="mt-3 font-display font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-500 leading-relaxed">{body}</p>
    </div>
  );
}

// The live preview runs a real race on the Boss maze using the same engine
// and canvas as the arena. BFS finds the shortest path; Greedy Best-First
// shows a goal-directed but suboptimal search; Left Turner demonstrates the
// loop pathology of a left-hand-rule wall-follower on a cyclic maze. The
// race loops continuously.
const DEMO_BOT_IDS = ["bfs", "greedy", "larry"] as const;
const DEMO_MAZE_ID = "boss";
const DEMO_SPEED = 9;
const DEMO_MOVE_LIMIT = 600;

function LiveArenaPreview() {
  const config: RaceConfig = useMemo(() => {
    const maze = MAZES_BY_ID[DEMO_MAZE_ID];
    const bots = DEMO_BOT_IDS
      .map((id) => ALL_BOTS.find((b) => b.id === id))
      .filter((b): b is NonNullable<typeof b> => Boolean(b));
    return { maze, bots, vision: "omniscient", moveLimit: DEMO_MOVE_LIMIT };
  }, []);

  const race = useRace(config, DEMO_SPEED);

  // Auto-start when competitors are populated. When the race finishes, pause
  // for a moment so the viewer can see the final state, then reset and run
  // it again with the same lineup.
  useEffect(() => {
    if (race.snapshot.competitors.length === 0) return;
    if (race.snapshot.phase === "idle") {
      race.start();
    }
    if (race.snapshot.phase === "finished") {
      const t = setTimeout(() => race.reset(), 2800);
      return () => clearTimeout(t);
    }
  }, [
    race.snapshot.phase,
    race.snapshot.competitors.length,
    race,
  ]);

  return (
    <div className="surface p-3 md:p-4 arena-bg animate-pop-in">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="pill bg-emerald-50 text-emerald-700 border border-emerald-100">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
            live arena
          </span>
          <span className="text-xs text-ink-500 truncate">
            {config.maze.name}
          </span>
        </div>
        <span className="text-[11px] text-ink-500 font-mono">
          tick {race.snapshot.tick}
        </span>
      </div>

      <MazeCanvas
        maze={config.maze}
        competitors={race.snapshot.competitors}
        phase={race.snapshot.phase}
        cellSize={18}
      />

      <div className="mt-3 flex flex-wrap gap-1.5">
        {race.snapshot.competitors.map((c) => {
          const finished = c.state.status === "finished";
          return (
            <span
              key={c.def.id}
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink-100 bg-white px-2.5 py-1 text-xs font-medium"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: c.def.color }}
              />
              <span className="text-sm leading-none">{c.def.emoji}</span>
              <span className="text-ink-900 font-semibold">{c.def.name}</span>
              <span className="text-ink-500 font-mono">
                {c.state.metrics.steps}
              </span>
              {finished && (
                <span className="text-emerald-600 font-bold">✓</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

// "Build your own" section showcasing the custom-bot editor.
function BuildYourOwn() {
  return (
    <section className="mt-20">
      <div className="grid lg:grid-cols-[1fr_1.1fr] gap-6 items-center">
        <div>
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-ink-900">
            Build your own competitor
          </h2>
          <p className="mt-2 text-ink-500 leading-relaxed">
            Write a JavaScript <code className="font-mono text-ink-900">chooseMove</code> function
            in the in-browser editor. Test your strategy against every prebuilt
            bot on every prebuilt maze. No build step, no upload: your code
            runs entirely in your browser.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
            <li className="flex gap-2"><span className="text-brand-600">•</span> Full maze access in omniscient mode, fog of war in explorer mode.</li>
            <li className="flex gap-2"><span className="text-brand-600">•</span> Persistent per-bot memory between ticks.</li>
            <li className="flex gap-2"><span className="text-brand-600">•</span> Starter templates: goal-seeker, wall-follower, no-revisit greedy.</li>
            <li className="flex gap-2"><span className="text-brand-600">•</span> 250&nbsp;ms move guard, error reporting, autosave to local storage.</li>
          </ul>
          <div className="mt-5">
            <Link to="/editor" className="btn-accent">
              <Code2 size={16} /> Open the editor
            </Link>
          </div>
        </div>
        <CodePreview />
      </div>
    </section>
  );
}

function CodePreview() {
  // Static snippet with light syntax-style coloring (no real highlighter to
  // keep deps small). Read-only marketing surface.
  return (
    <div className="surface p-0 overflow-hidden">
      <div className="px-4 py-2 border-b border-ink-100 bg-canvas-sunken/60 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-ink-500 font-semibold">
          chooseMove.js
        </span>
        <span className="flex gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-300"></span>
          <span className="w-2 h-2 rounded-full bg-amber-300"></span>
          <span className="w-2 h-2 rounded-full bg-emerald-300"></span>
        </span>
      </div>
      <pre className="font-mono text-[12.5px] leading-[1.6] p-4 bg-white text-ink-900 overflow-x-auto">
        <code>
          <span className="text-ink-500">{`// Pick one move per step.`}</span>{"\n"}
          <span className="text-violet-600">function</span>{" "}
          <span className="text-brand-700">chooseMove</span>(context){" {"}{"\n"}
          {"  "}<span className="text-violet-600">const</span>{" {"} current, goal, neighbors {"}"} = context;{"\n"}
          {"  "}<span className="text-violet-600">const</span> dx = goal.x - current.x;{"\n"}
          {"  "}<span className="text-violet-600">const</span> dy = goal.y - current.y;{"\n"}
          {"\n"}
          {"  "}<span className="text-ink-500">{`// Try cardinal directions toward the goal first.`}</span>{"\n"}
          {"  "}<span className="text-violet-600">const</span> order = Math.abs(dx) {">"} Math.abs(dy){"\n"}
          {"    "}? [dx {">"} 0 ? <span className="text-emerald-600">'right'</span> : <span className="text-emerald-600">'left'</span>, dy {">"} 0 ? <span className="text-emerald-600">'down'</span> : <span className="text-emerald-600">'up'</span>]{"\n"}
          {"    "}: [dy {">"} 0 ? <span className="text-emerald-600">'down'</span> : <span className="text-emerald-600">'up'</span>, dx {">"} 0 ? <span className="text-emerald-600">'right'</span> : <span className="text-emerald-600">'left'</span>];{"\n"}
          {"\n"}
          {"  "}<span className="text-violet-600">for</span> (<span className="text-violet-600">const</span> d <span className="text-violet-600">of</span> order){" {"}{"\n"}
          {"    "}<span className="text-violet-600">if</span> (neighbors[d] && neighbors[d] !== <span className="text-emerald-600">'wall'</span>) <span className="text-violet-600">return</span> d;{"\n"}
          {"  "}{"}"}{"\n"}
          {"  "}<span className="text-violet-600">return</span> <span className="text-emerald-600">null</span>;{"\n"}
          {"}"}
        </code>
      </pre>
    </div>
  );
}

// "Prebuilt mazes" section with one card per maze and a small SVG thumbnail.
// Short, generalized blurb advertising prebuilt + custom mazes.
function MazesBlurb() {
  return (
    <section className="mt-20">
      <div className="surface p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-soft">
          <Map size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-xl md:text-2xl font-semibold text-ink-900">
            Curated mazes, or design your own
          </h2>
          <p className="mt-1 text-ink-500 leading-relaxed">
            A handful of curated mazes cover the common pathfinding edge cases:
            dead-ends, long corridors, loops, branching forks, and a
            procedurally-generated labyrinth. Or open the maze editor and paint
            your own.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Link to="/arena" className="btn-ghost">
            <ArrowRight size={16} /> Open the arena
          </Link>
          <Link to="/maze-editor" className="btn-accent">
            <Map size={16} /> Maze editor
          </Link>
        </div>
      </div>
    </section>
  );
}

function CompetitorsSection() {
  const [selected, setSelected] = useState<BotDefinition | null>(null);

  return (
    <section className="mt-20">
      <h2 className="font-display text-2xl font-semibold text-ink-900 mb-1">
        Competitors
      </h2>
      <p className="text-ink-500 mb-5">
        {PLANNER_BOTS.length} whole-maze planners, {LOCAL_BOTS.length}{" "}
        local-rule strategies, and {FLAWED_BOTS.length} intentionally flawed
        bots. Click any card for the full description.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {ALL_BOTS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelected(b)}
            className="rounded-xl border border-ink-100 bg-white px-3 py-3 text-left flex flex-col gap-1.5 hover:border-brand-300 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-9 h-9 rounded-lg bg-white border-2 flex items-center justify-center text-base shrink-0"
                style={{ borderColor: b.color }}
              >
                {b.emoji}
              </span>
              <span className="font-semibold text-ink-900 text-sm truncate">
                {b.name}
              </span>
            </div>
            <p className="text-[11px] text-ink-500 leading-snug line-clamp-2">
              {b.description}
            </p>
          </button>
        ))}
      </div>
      {selected && (
        <BotDetailsModal bot={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

function BotDetailsModal({
  bot,
  onClose,
}: {
  bot: BotDefinition;
  onClose: () => void;
}) {
  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="surface w-full max-w-md animate-pop-in"
      >
        <div className="px-5 py-4 flex items-start justify-between gap-3 border-b border-ink-100">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="w-10 h-10 rounded-xl bg-white border-2 flex items-center justify-center text-xl shrink-0"
              style={{ borderColor: bot.color }}
            >
              {bot.emoji}
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg font-semibold text-ink-900 truncate">
                {bot.name}
              </h3>
              <span
                className="text-[10px] uppercase tracking-wider font-semibold mt-0.5"
                style={{ color: bot.color }}
              >
                {bot.category}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2.5">
          <p className="text-sm text-ink-700 leading-relaxed">
            {bot.description}
          </p>
          <p className="text-xs text-ink-500 italic">"{bot.tagline}"</p>
        </div>
      </div>
    </div>
  );
}
