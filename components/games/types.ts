import type { GameCallbacks, Skin } from "@/lib/games/types";

export type RealGameProps = GameCallbacks & {
  paused: boolean;
  resetKey: number;
  skin: Skin;
};

export type GameCapabilities = { hasLives: boolean; hasLevel: boolean };
