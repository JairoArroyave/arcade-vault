"use client";

import { useEffect, useRef } from "react";
import { createTetrisEngine } from "@/lib/games/tetris/engine";
import type { GameEngine } from "@/lib/games/types";
import type { RealGameProps } from "@/components/games/types";

export default function TetrisGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
  resetKey,
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

    const engine = createTetrisEngine(canvas, {
      onScoreChange: (score) => callbacksRef.current.onScoreChange(score),
      onLivesChange: (lives) => callbacksRef.current.onLivesChange?.(lives),
      onLevelChange: (level) => callbacksRef.current.onLevelChange?.(level),
      onGameOver: (finalScore) => callbacksRef.current.onGameOver(finalScore),
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [resetKey]);

  useEffect(() => {
    engineRef.current?.setPaused(paused);
  }, [paused]);

  return <canvas ref={canvasRef} width={450} height={600} />;
}
