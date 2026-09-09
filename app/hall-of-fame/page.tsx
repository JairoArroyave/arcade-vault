import { getGames, type Game } from "@/lib/games";
import { getScoresForGame, type ScoreRow } from "@/lib/leaderboard";
import { HallOfFameClient } from "@/components/HallOfFameClient";
import { FaultScreen } from "@/components/FaultScreen";

export default async function HallOfFamePage() {
  let games: Game[];
  try {
    games = await getGames();
  } catch (e) {
    return <FaultScreen message={(e as Error).message} />;
  }

  const scoresByGame: Record<string, ScoreRow[]> = {};
  await Promise.all(
    games.map(async (g) => {
      scoresByGame[g.id] = await getScoresForGame(g.id, 12);
    }),
  );

  return <HallOfFameClient games={games} scoresByGame={scoresByGame} />;
}
