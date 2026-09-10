"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/games";
import { saveScore } from "@/lib/leaderboard-client";
import { useAuth } from "@/app/providers";
import { REAL_GAMES } from "@/components/games/registry";
import { DEFAULT_SKIN, SKINS, type Skin } from "@/lib/games/types";

const SKIN_KEY = "av_skin";
const SKIN_LABELS: Record<Skin, string> = {
  clasico: "CLÁSICO",
  neon: "NEÓN",
  retro: "RETRO",
};

function readStoredSkin(): Skin {
  if (typeof window === "undefined") return DEFAULT_SKIN;
  try {
    const raw = window.localStorage.getItem(SKIN_KEY);
    return SKINS.includes(raw as Skin) ? (raw as Skin) : DEFAULT_SKIN;
  } catch {
    return DEFAULT_SKIN;
  }
}

export default function GamePlayerClient({ game }: { game: Game }) {
  const router = useRouter();
  const { user } = useAuth();
  const realGame = REAL_GAMES[game.id];

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [realLevel, setRealLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(() => (user ? user.name : "INVITADO"));
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Skin del motor: se inicializa leyendo localStorage["av_skin"] (un valor
  // inválido cae a DEFAULT_SKIN), así el motor arranca directo en la skin
  // guardada sin parpadeo. El servidor no ve localStorage, por lo que el estado
  // activo del selector se marca con suppressHydrationWarning.
  const [skin, setSkin] = useState<Skin>(readStoredSkin);

  const changeSkin = (next: Skin) => {
    setSkin(next);
    try {
      window.localStorage.setItem(SKIN_KEY, next);
    } catch {
      // localStorage no disponible (navegación privada, etc.): no persiste.
    }
  };

  // Nivel derivado del puntaje para los juegos simulados; los juegos reales reportan su nivel real.
  const level = realGame ? realLevel : 1 + Math.floor(score / 2500);

  // "over" más reciente, legible desde el callback onGameOver del motor real
  // sin que ese callback dependa de recrearse en cada cambio de "over".
  const overRef = useRef(over);
  useEffect(() => {
    overRef.current = over;
  }, [over]);

  useEffect(() => {
    if (realGame) return; // los juegos reales reportan su propio score real vía callbacks
    if (over || paused) return;
    const t = setInterval(
      () => setScore((s) => s + Math.floor(10 + Math.random() * 90)),
      220,
    );
    return () => clearInterval(t);
  }, [over, paused, realGame]);

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLives(3);
    setRealLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setSaveError(false);
    setResetKey((k) => k + 1);
  };

  const handleRealGameOver = (finalScore: number) => {
    if (overRef.current) return; // ya se cerró manualmente con el botón FIN
    setScore(finalScore);
    setOver(true);
  };

  const handleSaveScore = async () => {
    setSaving(true);
    setSaveError(false);
    try {
      await saveScore({ game: game.id, score, name });
      setSaved(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          {(!realGame || realGame.capabilities.hasLives) && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
            </div>
          )}
          {(!realGame || realGame.capabilities.hasLevel) && (
            <div className="hud-stat level">
              <div className="l">Nivel</div>
              <div className="v">{String(level).padStart(2, "0")}</div>
            </div>
          )}
          {realGame && (
            <div className="hud-stat">
              <div className="l">Skin</div>
              <div className="v" style={{ display: "flex", gap: 6 }}>
                {SKINS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    suppressHydrationWarning
                    className={`btn${s === skin ? "" : " ghost"}`}
                    style={{
                      padding: "6px 10px",
                      fontSize: 9,
                      letterSpacing: "0.1em",
                    }}
                    aria-pressed={s === skin}
                    onClick={() => changeSkin(s)}
                  >
                    {SKIN_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <Link href={`/games/${game.id}`} className="btn ghost">
            SALIR
          </Link>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {realGame ? (
            <div className="game-arena">
              <realGame.Component
                paused={paused}
                onScoreChange={setScore}
                onLivesChange={setLives}
                onLevelChange={setRealLevel}
                onGameOver={handleRealGameOver}
                resetKey={resetKey}
                skin={skin}
              />
            </div>
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div
              className="crt-content"
              style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}
            >
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value.toUpperCase().slice(0, 10))
                  }
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={handleSaveScore}
                  disabled={saving}
                >
                  {saving ? "GUARDANDO…" : "GUARDAR PUNTUACIÓN"}
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            {saveError && (
              <div
                className="mono"
                style={{ color: "var(--magenta)", fontSize: 11, marginTop: 8 }}
              >
                NO SE PUDO GUARDAR. INTENTA DE NUEVO.
              </div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
