import { notFound } from "next/navigation";
import { getGameById, type Game } from "@/lib/games";
import GamePlayerClient from "@/components/games/GamePlayerClient";
import { FaultScreen } from "@/components/FaultScreen";

export default async function GamePlayerPage({
  params,
}: PageProps<"/games/[id]/play">) {
  const { id } = await params;

  let game: Game | undefined;
  try {
    game = await getGameById(id);
  } catch (e) {
    return <FaultScreen message={(e as Error).message} />;
  }
  if (!game) notFound();

  return <GamePlayerClient game={game} />;
}
