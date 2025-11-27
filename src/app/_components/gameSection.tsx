"use client";

import { useState } from "react";
import SinglePlayerGame from "./singlePlayerGame";
import GameplayControls from "./gameplayControls";
import GameVersus from "./gameVersus";
import { Button } from "~/components/ui/button";
import {
  ArrowLeftFromLine,
  LogOut,
  // HomeIcon
  BedSingle,
  BedDouble,
} from "lucide-react";
import Link from "next/link";
import type { Session } from "next-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export default function GameSection({ session }: { session: Session | null }) {
  const [gameMode, setGameMode] = useState<"single-player" | "versus" | null>(
    null,
  );

  return (
    <div className="my-8">
      {gameMode !== null && <GameplayControls />}

      <div className="fixed top-4 left-4 grid gap-2">
        <Button
          onClick={() => setGameMode(null)}
          className="border-background border"
        >
          <ArrowLeftFromLine />
          <p>back</p>
        </Button>
        {/* <Button asChild className="border-background border">
          <Link href="/">
            <HomeIcon />
            <p>home page</p>
          </Link>
        </Button> */}
        <Button asChild className="border-background border">
          <Link href="/api/auth/signout">
            <LogOut />
            <p>sign out</p>
          </Link>
        </Button>
      </div>

      {gameMode === null && (
        <div className="grid h-full grid-cols-2 items-center gap-4">
          <Button
            size="lg"
            className="text-md w-full px-4 py-8 text-xl"
            onClick={() => setGameMode("single-player")}
          >
            SINGLE PLAYER
            <BedSingle className="size-8" />
          </Button>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                className="text-md w-full px-4 py-8 text-xl"
                onClick={() => {
                  if (!session) return;
                  setGameMode("versus");
                }}
              >
                VERSUS
                <BedDouble className="size-8" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {session ? "good luck!" : <p>sign in first</p>}
            </TooltipContent>
          </Tooltip>
        </div>
      )}
      {session?.user?.id && gameMode === "single-player" && (
        <SinglePlayerGame userId={session.user.id} />
      )}
      {gameMode === "versus" && <GameVersus session={session} />}
    </div>
  );
}
