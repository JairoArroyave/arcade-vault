import { getGames } from "@/lib/games";
import { GameLibrary } from "@/components/GameLibrary";

export default async function Home() {
  const games = await getGames();
  return <GameLibrary games={games} />;
}
