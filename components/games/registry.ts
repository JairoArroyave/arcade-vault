import type { ComponentType } from "react";
import type { RealGameProps, GameCapabilities } from "@/components/games/types";
import AsteroidsGame from "@/components/games/AsteroidsGame";
import TetrisGame from "@/components/games/TetrisGame";

type RealGameEntry = {
  Component: ComponentType<RealGameProps>;
  capabilities: GameCapabilities;
};

export const REAL_GAMES: Record<string, RealGameEntry> = {
  rocas: { Component: AsteroidsGame, capabilities: { hasLives: true, hasLevel: true } },
  caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } },
};
