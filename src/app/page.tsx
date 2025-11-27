import Link from "next/link";
import Image from "next/image";
import { Button } from "~/components/ui/button";
import GameSection from "~/app/_components/gameSection";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="nice-bg-bro text-[var(--eigengrau)]">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-center text-4xl font-bold tracking-wide">
          TETRA FACE
        </h1>
        <p className="text-center text-lg">
          Multiplayer online tetris.
          <br />
          {!session && "Sign in to start a versus match."}
        </p>
        {session?.user && <GameSection session={session} />}

        <p className="text-center text-2xl text-white">
          {session && (
            <span className="flex items-center gap-2">
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
            </span>
          )}
        </p>

        <Button asChild size="lg" className="text-xl">
          <Link href={session ? "/api/auth/signout" : "/api/auth/signin"}>
            {session ? "SIGN OUT" : "SIGN IN"}
          </Link>
        </Button>
      </div>
    </main>
  );
}
