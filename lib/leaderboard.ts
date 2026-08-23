// Lecturas del leaderboard real contra la tabla `scores` de Supabase (spec 06).
// `saveScore` (escritura desde un Client Component) vive aparte en
// lib/leaderboard-client.ts para no arrastrar lib/supabase/server.ts
// (depende de next/headers) al bundle de cliente.

import { createClient } from "@/lib/supabase/server";

export type ScoreRow = {
  rank: number;
  name: string;
  score: number;
  date: string;
};

type ScoreRecord = {
  game: string;
  score: number;
  name: string;
  created_at: string;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getFullYear()}`;
}

export async function getScoresForGame(
  gameId: string,
  limit = 10,
): Promise<ScoreRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game, score, name, created_at")
    .eq("game", gameId)
    .order("score", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data as ScoreRecord[]).map((row, i) => ({
    rank: i + 1,
    name: row.name,
    score: row.score,
    date: formatDate(row.created_at),
  }));
}

export async function getBestScores(): Promise<Record<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("game, score")
    .order("score", { ascending: false });

  if (error) throw error;

  const best: Record<string, number> = {};
  for (const row of data as Pick<ScoreRecord, "game" | "score">[]) {
    if (!(row.game in best)) best[row.game] = row.score;
  }
  return best;
}
