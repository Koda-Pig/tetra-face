import { redirect } from "next/navigation";
import GameSection from "~/app/_components/gameSection";
import { auth } from "~/server/auth";
import { HydrateClient } from "~/trpc/server";

export default async function Play() {
  const session = await auth();

  if (!session?.user) {
    if (!session) return redirect("/");
  }

  return (
    <HydrateClient>
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
        <GameSection session={session} />
      </main>
    </HydrateClient>
  );
}
