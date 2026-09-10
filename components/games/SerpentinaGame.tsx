"use client";

import { useEffect, useRef } from "react";
import { createSerpentinaEngine } from "@/lib/games/serpentina/engine";
import type { GameEngine } from "@/lib/games/types";
import type { RealGameProps } from "@/components/games/types";

export default function SerpentinaGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  resetKey,
  skin,
}: RealGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const callbacksRef = useRef({
    onScoreChange,
    onLivesChange,
    onLevelChange,
    onGameOver,
  });
  useEffect(() => {
    callbacksRef.current = {
      onScoreChange,
      onLivesChange,
      onLevelChange,
      onGameOver,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createSerpentinaEngine(
      canvas,
      {
        onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
        onLivesChange: (lives) => callbacksRef.current.onLivesChange?.(lives),
        onLevelChange: (level) => callbacksRef.current.onLevelChange?.(level),
        onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
      },
      skin,
    );
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Cambiar de skin reinstancia el motor (reset completo), igual que "JUGAR DE NUEVO".
  }, [resetKey, skin]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  return <canvas ref={canvasRef} width={600} height={450} />;
}
