// Catálogo de juegos real contra la tabla `games` de Supabase (spec 06).

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

export async function getGames(): Promise<Game[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("games")
    .select("id, title, short, long, cat, cover, color, plays");

  if (error) throw error;

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

  if (error) throw error;
  if (!data) return undefined;

  const [top] = await getScoresForGame(id, 1);
  return { ...(data as GameRecord), best: top?.score ?? 0 };
}
