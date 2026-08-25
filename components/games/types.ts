import type { GameCallbacks } from "@/lib/games/types";

export type RealGameProps = GameCallbacks & {
  paused: boolean;
  resetKey: number;
};

export type GameCapabilities = { hasLives: boolean; hasLevel: boolean };
