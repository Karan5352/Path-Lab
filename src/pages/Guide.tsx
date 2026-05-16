import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { FLAWED_BOTS, LOCAL_BOTS, PLANNER_BOTS } from "../bots";
import { MAZES } from "../mazes";
import type { BotDefinition } from "../types";

interface BotGroup {
  id: string;
  title: string;
  blurb: string;
  bots: BotDefinition[];
}

const BOT_GROUPS: BotGroup[] = [
  {
    id: "planner",
    title: "Whole-maze planners",
    blurb:
      "Algorithms that take the full maze as input, run a graph search over it, and walk the resulting path. Their step counts are near-optimal in omniscient mode and degrade gracefully in fog of war.",
    bots: PLANNER_BOTS,
  },
  {
    id: "local",
    title: "Local-rule strategies",
    blurb:
      "Bots that decide every move from the four cells immediately around them and never use the full maze. Solve any simply-connected maze; can loop indefinitely on cyclic ones. Behave identically in omniscient and fog modes.",
    bots: LOCAL_BOTS,
  },
  {
    id: "flawed",
    title: "Intentionally flawed bots",
    blurb:
      "Bots whose strategy has a deliberate weakness. Each one highlights a specific failure mode that the planners and local-rule bots are designed to avoid.",
    bots: FLAWED_BOTS,
  },
];

export function Guide() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-12">
      <header className="max-w-3xl">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-ink-900">
          How each bot thinks
        </h1>
        <p className="mt-3 text-ink-500 leading-relaxed">
          Bots in PathLab fall into three buckets by how much information they
          use. Whole-maze planners run a real graph search over the entire
          maze. Local-rule strategies only ever see the four cells next to
          them. Intentionally flawed bots have deliberate weaknesses you can
          watch fail in real time.
        </p>
        <div className="mt-4 flex gap-2">
          <Link to="/arena" className="btn-accent">
            <ArrowRight size={14} /> Take it to the arena
          </Link>
          <Link to="/editor" className="btn-ghost">
            Write your own bot
          </Link>
        </div>
      </header>

      {BOT_GROUPS.map((group) => {
        if (group.bots.length === 0) return null;
        return (
          <section key={group.id}>
            <h2 className="font-display text-2xl font-semibold text-ink-900 mb-1">
              {group.title}
            </h2>
            <p className="text-sm text-ink-500 mb-4 max-w-3xl">{group.blurb}</p>
            <div className="grid md:grid-cols-2 gap-3">
              {group.bots.map((b) => (
                <BotCard key={b.id} bot={b} />
              ))}
            </div>
          </section>
        );
      })}

      <section>
        <h2 className="font-display text-2xl font-semibold text-ink-900 mb-1">
          Mazes
        </h2>
        <p className="text-sm text-ink-500 mb-4">
          Each maze is designed to stress a different category of strategy.
          Run the same lineup on each one and watch the rankings shift.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MAZES.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-ink-100 bg-canvas-raised p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display font-semibold text-ink-900">
                  {m.name}
                </h3>
                <span className="text-[11px] text-ink-500 uppercase tracking-wider font-semibold">
                  {m.difficulty}
                </span>
              </div>
              <p className="text-sm text-ink-500 mt-1.5 leading-snug">
                {m.description}
              </p>
              <div className="text-[11px] text-ink-300 mt-2 font-mono">
                {m.width}×{m.height} cells
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold text-ink-900 mb-1">
          Scoring &amp; rankings
        </h2>
        <p className="text-sm text-ink-500 mb-4">
          Rankings sort bots in this order:
        </p>
        <ol className="space-y-1.5 text-sm text-ink-700 list-decimal pl-5">
          <li>
            <strong>Reached the goal?</strong> Finishers always rank above
            non-finishers.
          </li>
          <li>
            <strong>Efficiency score</strong>. 100 for an optimal run, minus
            penalties for wasted cells, dead-ends, loops, and backtracks.
          </li>
          <li>
            <strong>Fewest steps taken.</strong>
          </li>
          <li>
            <strong>Fewest unique cells explored.</strong>
          </li>
          <li>
            <strong>Fewest penalties.</strong>
          </li>
          <li>
            <strong>Lowest runtime</strong>. Wall-clock time the bot spent
            thinking.
          </li>
        </ol>
      </section>
    </div>
  );
}

function BotCard({ bot }: { bot: BotDefinition }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-4">
      <div className="flex items-start gap-3">
        <span
          className="w-11 h-11 rounded-xl bg-white border-2 flex items-center justify-center text-xl shrink-0"
          style={{ borderColor: bot.color }}
        >
          {bot.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-ink-900">
              {bot.name}
            </h3>
            <span
              className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: bot.color }}
            >
              {bot.category}
            </span>
          </div>
          <p className="text-sm text-ink-700 mt-1 leading-relaxed">
            {bot.description}
          </p>
          <p className="text-xs text-ink-500 mt-1.5 italic">"{bot.tagline}"</p>
        </div>
      </div>
    </div>
  );
}
