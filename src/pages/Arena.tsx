import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, EyeOff, Layers, Trophy } from "lucide-react";
import clsx from "clsx";
import { Controls } from "../components/Controls";
import { MazeCanvas } from "../components/MazeCanvas";
import { MazeSelector } from "../components/MazeSelector";
import { BotSelector } from "../components/BotSelector";
import { Scoreboard } from "../components/Scoreboard";
import { Results } from "../components/Results";
import { FLAWED_BOTS, LOCAL_BOTS, PLANNER_BOTS } from "../bots";
import { MAZES, MAZES_BY_ID } from "../mazes";
import { useRace } from "../engine/useRace";
import { useCustomBot } from "../state/customBotStore";
import { useCustomMaze } from "../state/customMazeStore";
import type { BotDefinition, Maze, RaceConfig, VisionMode } from "../types";

const DEFAULT_BOT_IDS = ["bfs", "astar", "wall-follower", "larry", "goblin"];

export function Arena() {
  const [mazeId, setMazeId] = useState<string>(MAZES[0].id);
  const [selectedBots, setSelectedBots] = useState<Set<string>>(
    new Set(DEFAULT_BOT_IDS),
  );
  const [vision, setVision] = useState<VisionMode>("omniscient");
  const [speed, setSpeed] = useState<number>(12);
  const [showResults, setShowResults] = useState(false);
  const [moveLimit, setMoveLimit] = useState<number>(2500);
  const [showSetup, setShowSetup] = useState<boolean>(true);

  const customBot = useCustomBot();
  const customMaze = useCustomMaze();

  const availableMazes: Maze[] = useMemo(() => {
    if (customMaze.maze) return [...MAZES, customMaze.maze];
    return MAZES;
  }, [customMaze.maze]);

  const availableBots: BotDefinition[] = useMemo(() => {
    const list = [...PLANNER_BOTS, ...LOCAL_BOTS, ...FLAWED_BOTS];
    if (customBot.bot) list.push(customBot.bot);
    return list;
  }, [customBot.bot]);

  const bots: BotDefinition[] = useMemo(() => {
    return availableBots.filter((b) => selectedBots.has(b.id));
  }, [availableBots, selectedBots]);

  const resolveMaze = (id: string): Maze =>
    id === "custom" && customMaze.maze ? customMaze.maze : MAZES_BY_ID[id] ?? MAZES[0];

  const config: RaceConfig = useMemo(
    () => ({
      maze: resolveMaze(mazeId),
      bots,
      vision,
      moveLimit,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mazeId, bots, vision, moveLimit, customMaze.maze],
  );

  const race = useRace(config, speed);

  // Auto-open results when race finishes.
  useEffect(() => {
    if (race.snapshot.phase === "finished" && race.snapshot.rankings) {
      const t = setTimeout(() => setShowResults(true), 250);
      return () => clearTimeout(t);
    }
    setShowResults(false);
  }, [race.snapshot.phase, race.snapshot.rankings]);

  const toggleBot = (id: string) => {
    setSelectedBots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const maze = resolveMaze(mazeId);

  return (
    <div
      className={clsx(
        "max-w-7xl mx-auto px-4 sm:px-6 py-6 md:py-8 grid gap-5",
        showSetup ? "xl:grid-cols-[340px_1fr]" : "grid-cols-1",
      )}
    >
      {/* Left side: setup panel */}
      {showSetup && (
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-sm font-semibold text-ink-700 uppercase tracking-wider">
            Setup
          </h2>
          <button
            className="btn-ghost !px-2 !py-1 text-xs"
            onClick={() => setShowSetup(false)}
            title="Hide setup panel"
          >
            <ChevronLeft size={14} /> Hide
          </button>
        </div>
        <Panel
          title="Maze"
          subtitle={`${maze.name}. ${maze.description}`}
        >
          <MazeSelector
            mazes={availableMazes}
            selectedId={mazeId}
            onSelect={setMazeId}
          />
        </Panel>

        <Panel title="Vision mode">
          <div className="grid grid-cols-2 gap-2">
            <VisionToggle
              label="Omniscient"
              hint="Bots see the whole maze."
              active={vision === "omniscient"}
              icon={<Eye size={14} />}
              onClick={() => setVision("omniscient")}
            />
            <VisionToggle
              label="Explorer (fog)"
              hint="Bots only see what they've stepped near."
              active={vision === "explorer"}
              icon={<EyeOff size={14} />}
              onClick={() => setVision("explorer")}
            />
          </div>
        </Panel>

        <Panel title="Competitors" subtitle={`${bots.length} selected`}>
          <div className="space-y-4">
            <BotSelector
              bots={PLANNER_BOTS}
              selected={selectedBots}
              onToggle={toggleBot}
              title="Whole-maze planners"
            />
            <BotSelector
              bots={LOCAL_BOTS}
              selected={selectedBots}
              onToggle={toggleBot}
              title="Local-rule strategies"
            />
            <BotSelector
              bots={FLAWED_BOTS}
              selected={selectedBots}
              onToggle={toggleBot}
              title="Intentionally flawed"
            />
            {customBot.bot && (
              <BotSelector
                bots={[customBot.bot]}
                selected={selectedBots}
                onToggle={toggleBot}
                title="Your custom bot"
              />
            )}
          </div>
        </Panel>

        <Panel title="Race options">
          <label className="flex items-center justify-between text-sm">
            <span className="text-ink-700">Move limit</span>
            <input
              type="number"
              className="w-24 rounded-lg border border-ink-100 bg-white px-2 py-1 text-right font-mono text-sm"
              value={moveLimit}
              min={100}
              max={20000}
              step={100}
              onChange={(e) => setMoveLimit(Number(e.target.value))}
            />
          </label>
        </Panel>
      </aside>
      )}

      {/* Right side: arena */}
      <section className="space-y-4 min-w-0">
        {!showSetup && (
          <button
            className="btn-ghost"
            onClick={() => setShowSetup(true)}
            title="Show setup panel"
          >
            <ChevronRight size={14} /> Show setup
          </button>
        )}
        <Controls
          phase={race.snapshot.phase}
          speed={speed}
          onSpeedChange={setSpeed}
          onStart={race.start}
          onPause={race.pause}
          onResume={race.resume}
          onStep={race.step}
          onReset={race.reset}
          onForceFinish={race.forceFinish}
        />

        {bots.length === 0 ? (
          <div className="surface p-10 text-center">
            <Layers
              size={28}
              className="text-ink-300 mx-auto mb-2"
              strokeWidth={1.5}
            />
            <h3 className="font-display font-semibold text-ink-900">
              Pick at least one competitor
            </h3>
            <p className="text-sm text-ink-500 mt-1">
              Select strong algorithms, flawed bots, or your custom bot from
              the left.
            </p>
          </div>
        ) : (
          <MazeCanvas
            maze={maze}
            competitors={race.snapshot.competitors}
            phase={race.snapshot.phase}
          />
        )}

        <div className="surface px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="pill bg-canvas-sunken text-ink-700 border border-ink-100">
              tick · {race.snapshot.tick}
            </span>
            <span className="pill bg-canvas-sunken text-ink-700 border border-ink-100">
              mode · {vision}
            </span>
            <span className="pill bg-canvas-sunken text-ink-700 border border-ink-100">
              limit · {moveLimit}
            </span>
          </div>
          {race.snapshot.rankings && (
            <button
              className="btn-ghost"
              onClick={() => setShowResults(true)}
            >
              <Trophy size={14} /> Show results
            </button>
          )}
        </div>

        {bots.length > 0 && (
          <Scoreboard
            competitors={race.snapshot.competitors}
            rankings={race.snapshot.rankings}
          />
        )}
      </section>

      {showResults && race.snapshot.rankings && (
        <Results
          competitors={race.snapshot.competitors}
          rankings={race.snapshot.rankings}
          onClose={() => setShowResults(false)}
          onReset={() => {
            setShowResults(false);
            race.reset();
          }}
        />
      )}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface p-3.5">
      <div className="mb-2.5">
        <h2 className="font-display font-semibold text-ink-900 text-sm">
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-ink-500 mt-0.5 leading-snug">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function VisionToggle({
  label,
  hint,
  active,
  icon,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "rounded-xl border px-3 py-2 text-left transition-all",
        active
          ? "border-brand-500 bg-brand-50 shadow-ring"
          : "border-ink-100 bg-white hover:border-brand-300",
      )}
    >
      <div className="flex items-center gap-1.5 font-semibold text-ink-900 text-sm">
        {icon}
        {label}
      </div>
      <p className="text-[11px] text-ink-500 mt-0.5 leading-snug">{hint}</p>
    </button>
  );
}
