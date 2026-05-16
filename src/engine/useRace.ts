import { useEffect, useMemo, useRef, useState } from "react";
import { RaceController } from "./race";
import type { RaceConfig, RaceSnapshot } from "../types";

export interface UseRace {
  snapshot: RaceSnapshot;
  start: () => void;
  pause: () => void;
  resume: () => void;
  step: () => void;
  reset: () => void;
  forceFinish: () => void;
  setSpeed: (stepsPerSec: number) => void;
}

export function useRace(config: RaceConfig, speed: number): UseRace {
  const controllerRef = useRef<RaceController | null>(null);
  const [snapshot, setSnapshot] = useState<RaceSnapshot>(() => {
    const c = new RaceController(config);
    c.setSpeed(speed);
    controllerRef.current = c;
    // Seed initial snapshot. The subscriber will be added in useEffect.
    return {
      config,
      phase: "idle",
      tick: 0,
      competitors: [],
      rankings: null,
    } as RaceSnapshot;
  });

  // Recreate controller when config (maze, bots, vision, moveLimit) changes.
  useEffect(() => {
    const c = new RaceController(config);
    c.setSpeed(speed);
    controllerRef.current = c;
    const unsub = c.subscribe((s) => setSnapshot(s));
    return () => {
      unsub();
      c.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  useEffect(() => {
    controllerRef.current?.setSpeed(speed);
  }, [speed]);

  return useMemo<UseRace>(
    () => ({
      snapshot,
      start: () => controllerRef.current?.start(),
      pause: () => controllerRef.current?.pause(),
      resume: () => controllerRef.current?.resume(),
      step: () => controllerRef.current?.step(),
      reset: () => controllerRef.current?.reset(),
      forceFinish: () => controllerRef.current?.forceFinish(),
      setSpeed: (s: number) => controllerRef.current?.setSpeed(s),
    }),
    [snapshot],
  );
}
