import { Flag, Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import type { RacePhase } from "../types";

interface Props {
  phase: RacePhase;
  speed: number;
  onSpeedChange: (s: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStep: () => void;
  onReset: () => void;
  onForceFinish: () => void;
}

export function Controls({
  phase,
  speed,
  onSpeedChange,
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
  onForceFinish,
}: Props) {
  const playing = phase === "running";
  const finished = phase === "finished";
  const canForceFinish = phase === "running" || phase === "paused";
  return (
    <div className="surface p-3 md:p-4 flex flex-wrap items-center gap-2 md:gap-3">
      {phase === "idle" && (
        <button className="btn-accent" onClick={onStart}>
          <Play size={16} /> Start race
        </button>
      )}
      {phase === "running" && (
        <button className="btn-primary" onClick={onPause}>
          <Pause size={16} /> Pause
        </button>
      )}
      {phase === "paused" && (
        <button className="btn-accent" onClick={onResume}>
          <Play size={16} /> Resume
        </button>
      )}
      {finished && (
        <button className="btn-primary" onClick={onReset}>
          <RotateCcw size={16} /> New race
        </button>
      )}
      <button
        className="btn-ghost"
        onClick={onStep}
        disabled={finished}
        title="Advance one tick"
      >
        <SkipForward size={16} /> Step
      </button>
      <button className="btn-ghost" onClick={onReset} disabled={phase === "idle"}>
        <RotateCcw size={16} /> Reset
      </button>
      <button
        className="btn-ghost"
        onClick={onForceFinish}
        disabled={!canForceFinish}
        title="Mark any remaining racing bots as failed and finalize the race"
      >
        <Flag size={16} /> Force finish
      </button>
      <div className="ml-auto flex items-center gap-3 text-sm text-ink-500">
        <span className="font-medium text-ink-700">Speed</span>
        <input
          type="range"
          min={1}
          max={60}
          step={1}
          value={speed}
          onChange={(e) => onSpeedChange(Number(e.target.value))}
          className="w-32 md:w-44 accent-brand-500"
        />
        <span className="chip min-w-[3.5rem] justify-center">
          {speed}/s
        </span>
      </div>
      {playing && (
        <span className="pill bg-emerald-50 text-emerald-700 border border-emerald-100">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
          running
        </span>
      )}
    </div>
  );
}
