import type { BotDefinition } from "../types";
import { STRONG_BOTS } from "./strong";
import { FLAWED_BOTS as RAW_FLAWED_BOTS } from "./flawed";

export { compileCustomBot, DEFAULT_CUSTOM_BOT_CODE, STARTER_TEMPLATES } from "./custom";

// Combined list of every prebuilt bot, in display order.
export const ALL_BOTS: BotDefinition[] = [...STRONG_BOTS, ...RAW_FLAWED_BOTS];

// The three real-world categories. Driven by each bot's `category` field so
// definitions stay the single source of truth.
export const PLANNER_BOTS: BotDefinition[] = ALL_BOTS.filter(
  (b) => b.category === "planner",
);
export const LOCAL_BOTS: BotDefinition[] = ALL_BOTS.filter(
  (b) => b.category === "local",
);
export const FLAWED_BOTS: BotDefinition[] = ALL_BOTS.filter(
  (b) => b.category === "flawed",
);

export const BOTS_BY_ID: Record<string, BotDefinition> = Object.fromEntries(
  ALL_BOTS.map((b) => [b.id, b]),
);
