"use client";

import { useEffect, useRef } from "react";
import { createArkanoidEngine } from "@/lib/games/arkanoid/engine";
import type { GameEngine } from "@/lib/games/types";
import type { RealGameProps } from "@/components/games/types";

export default function ArkanoidGame({
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

  // Ref con los callbacks más recientes: el efecto de abajo solo debe recrear
  // el motor cuando cambia resetKey, no en cada render por callbacks nuevos.
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

    const engine = createArkanoidEngine(
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

  return <canvas ref={canvasRef} width={480} height={640} />;
}
