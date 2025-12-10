import Link from "next/link";
import { Button } from "~/components/ui/button";
import GameSection from "~/components/gameSection";
import { auth } from "~/server/auth";
import Image from "~/components/image";
import BackgroundAnimation from "~/components/backgroundAnimation";

export default async function Home() {
  const session = await auth();

  return (
    <main className="text-(--retro-green)" style={{ contain: "paint" }}>
      <BackgroundAnimation />
      <div className="container mx-auto flex h-full min-h-svh flex-col justify-center px-4">
        <h1 className="text-center text-6xl font-bold tracking-wide">
          TETR<span className="text-white">US</span>
        </h1>
        <p className="subtitle mt-6 mb-8 text-center text-xl">
          Multiplayer online Tetris.
        </p>
        {session?.user && <GameSection session={session} />}

        {session ? (
          <p className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center justify-center gap-2 text-lg text-white">
            Logged in as
            <span className="font-bold">{session.user?.name}</span>
            {session.user?.image && (
              <Image
                src={session.user.image}
                alt={`${session.user.name}'s avatar`}
                className="aspect-square rounded-full"
                width={32}
                height={32}
              />
            )}
          </p>
        ) : (
          <Button asChild size="lg" className="mx-auto mt-4 text-xl leading-0">
            <Link href="/api/auth/signin">sign in</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
