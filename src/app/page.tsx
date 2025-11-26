import Link from "next/link";
import GameSection from "~/app/_components/gameSection";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="nice-bg-bro text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center gap-8">
          <h1 className="text-center text-4xl font-bold tracking-wide">
            TETRA FACE
          </h1>
          <p className="text-center">
            Multiplayer online tetris.
            <br />
            {!session && "Sign in to start a versus match."}
          </p>
          {session?.user && <GameSection session={session} />}

          <p className="text-center text-2xl text-white">
            {session && (
              <span>
                Logged in as {session.user?.name}, email: {session.user?.email}
              </span>
            )}
          </p>
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            {session ? "Sign out" : "Sign in"}
          </Link>
        </div>
      </div>
    </main>
  );
}
