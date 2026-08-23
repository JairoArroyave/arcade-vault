import { notFound } from "next/navigation";
import { getGameById } from "@/lib/games";
import GamePlayerClient from "@/components/games/GamePlayerClient";

export default async function GamePlayerPage({
  params,
}: PageProps<"/games/[id]/play">) {
  const { id } = await params;
  const game = await getGameById(id);
  if (!game) notFound();

  return <GamePlayerClient game={game} />;
}
