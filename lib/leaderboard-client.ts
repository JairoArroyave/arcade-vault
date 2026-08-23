// Escritura del leaderboard desde Client Components (spec 06).
// Aparte de lib/leaderboard.ts para no arrastrar lib/supabase/server.ts
// (depende de next/headers) al bundle de cliente.

import { createClient } from "@/lib/supabase/client";

export async function saveScore(entry: {
  game: string;
  score: number;
  name: string;
}): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("scores").insert({
    game: entry.game,
    score: entry.score,
    name: entry.name,
  });

  if (error) throw error;
}
