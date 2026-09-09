import { getGames } from "@/lib/games";
import { GameLibrary } from "@/components/GameLibrary";
import { FaultScreen } from "@/components/FaultScreen";
import type { Game } from "@/lib/games";

export default async function Home() {
  let games: Game[];
  try {
    games = await getGames();
  } catch (e) {
    return <FaultScreen message={(e as Error).message} />;
  }
  return <GameLibrary games={games} />;
}
