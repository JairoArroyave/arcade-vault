import { getGames } from "@/lib/games";
import { getScoresForGame, type ScoreRow } from "@/lib/leaderboard";
import { HallOfFameClient } from "@/components/HallOfFameClient";

export default async function HallOfFamePage() {
  const games = await getGames();

  const scoresByGame: Record<string, ScoreRow[]> = {};
  await Promise.all(
    games.map(async (g) => {
      scoresByGame[g.id] = await getScoresForGame(g.id, 12);
    }),
  );

  return <HallOfFameClient games={games} scoresByGame={scoresByGame} />;
}
