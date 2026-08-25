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
