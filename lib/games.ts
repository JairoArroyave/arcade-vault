// Catálogo de juegos real contra la tabla `games` de Supabase (spec 06).
//
// Sin catálogo no hay nada que renderizar, así que aquí sí se lanza — pero como
// un Error de verdad y con mensaje legible, no como el objeto crudo de Supabase
// ({ message, details, hint, code }), que el boundary de error no sabe formatear.
// De eso se encarga app/error.tsx.

import { createClient } from "@/lib/supabase/server";
import { getBestScores, getScoresForGame } from "@/lib/leaderboard";

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export type Game = {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: "cyan" | "magenta" | "yellow" | "green";
  plays: string;
  best: number;
};

type GameRecord = Omit<Game, "best">;

type SupabaseError = { message: string };

function catalogError(error: SupabaseError, what: string): Error {
  return new Error(`No se pudo cargar ${what}: ${error.message}`, {
    cause: error,
  });
}

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, short, long, cat, cover, color, plays");

  if (error) throw catalogError(error, "el catálogo de juegos");

  const best = await getBestScores();
  return (data as GameRecord[]).map((g) => ({ ...g, best: best[g.id] ?? 0 }));
}

export async function getGameById(id: string): Promise<Game | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, short, long, cat, cover, color, plays")
    .eq("id", id)
    .maybeSingle();

  if (error) throw catalogError(error, `el juego "${id}"`);
  if (!data) return undefined;

  const [top] = await getScoresForGame(id, 1);
  return { ...(data as GameRecord), best: top?.score ?? 0 };
}
