export type Skin = "clasico" | "neon" | "retro";
export const SKINS: readonly Skin[] = ["clasico", "neon", "retro"] as const;
export const DEFAULT_SKIN: Skin = "clasico";

export type GameCallbacks = {
  onScoreChange: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onLivesChange?: (lives: number) => void;
  onLevelChange?: (level: number) => void;
};

export type GameEngine = {
  setPaused(paused: boolean): void;
  reset(): void;
  destroy(): void;
};
