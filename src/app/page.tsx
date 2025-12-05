import Link from "next/link";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import GameSection from "~/app/_components/gameSection";
import { auth } from "~/server/auth";
import BackgroundAnimation from "./_components/backgroundAnimation";

export default async function Home() {
  const session = await auth();

  return (
    <main className="text-(--retro-green)">
      <BackgroundAnimation />
      <div className="container mx-auto flex h-full min-h-svh flex-col px-4 py-8">
        <h1 className="text-center text-5xl font-bold tracking-wide">
          TETRA FACE
        </h1>
        <p className="mt-6 text-center text-lg">
          Multiplayer online tetris.
          <br />
          {!session && "Sign in to start a versus match."}
        </p>
        {session?.user && <GameSection session={session} />}

        {session ? (
          <p className="mt-auto flex items-center justify-center gap-2 text-xl text-white">
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
            <Link href="/api/auth/signin">SIGN IN</Link>
          </Button>
        )}
      </div>
    </main>
  );
}
