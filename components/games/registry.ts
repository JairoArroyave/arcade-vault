import type { ComponentType } from "react";
import type { RealGameProps, GameCapabilities } from "@/components/games/types";
import AsteroidsGame from "@/components/games/AsteroidsGame";
import TetrisGame from "@/components/games/TetrisGame";
import ArkanoidGame from "@/components/games/ArkanoidGame";
import SerpentinaGame from "@/components/games/SerpentinaGame";
import RanariaGame from "@/components/games/RanariaGame";

type RealGameEntry = {
  Component: ComponentType<RealGameProps>;
  capabilities: GameCapabilities;
};

export const REAL_GAMES: Record<string, RealGameEntry> = {
  rocas: { Component: AsteroidsGame, capabilities: { hasLives: true, hasLevel: true } },
  caida: { Component: TetrisGame, capabilities: { hasLives: false, hasLevel: true } },
  "bloque-buster": { Component: ArkanoidGame, capabilities: { hasLives: true, hasLevel: false } },
  serpentina: { Component: SerpentinaGame, capabilities: { hasLives: false, hasLevel: true } },
  ranaria: { Component: RanariaGame, capabilities: { hasLives: true, hasLevel: true } },
};
