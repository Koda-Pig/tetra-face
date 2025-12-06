"use client";

import { useState } from "react";
import SinglePlayerGame from "./singlePlayerGame";
import GameplayControls from "./gameplayControls";
import GameVersus from "./gameVersus";
import { Button } from "~/components/ui/button";
import {
  ArrowLeftFromLine,
  LogOut,
  BedSingle,
  BedDouble,
  Gamepad2,
} from "lucide-react";
import Link from "next/link";
import type { Session } from "next-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useGameInPlay } from "~/contexts/gameInPlayContext";
import { useGamepad } from "~/hooks/useGamepad";

export default function GameSection({ session }: { session: Session }) {
  const [gameMode, setGameMode] = useState<"single-player" | "versus" | null>(
    null,
  );
  const { setIsGameInPlay } = useGameInPlay();
  const { gamepadConnected } = useGamepad();

  return (
    <div className="my-8">
      <div className="fixed top-4 left-4 grid gap-2">
        {gameMode !== null && (
          <Button
            onClick={() => {
              setGameMode(null);
              setIsGameInPlay(false);
            }}
            className="border-background justify-between border"
          >
            <p>back</p>
            <ArrowLeftFromLine />
          </Button>
        )}
        <GameplayControls />
        <Button asChild className="border-background justify-between border">
          <Link href="/api/auth/signout">
            <p>sign out</p>
            <LogOut />
          </Link>
        </Button>
      </div>

      {gameMode === null && (
        <div className="mx-auto mt-6 grid h-full w-max grid-cols-2 items-center gap-4">
          <Button
            size="lg"
            className="text-md w-full px-4 py-8 text-xl"
            onClick={() => {
              setGameMode("single-player");
              setIsGameInPlay(true);
            }}
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

      {gamepadConnected && (
        <Tooltip>
          <TooltipTrigger className="fixed top-4 right-4 rounded-full bg-(--retro-green) p-1 text-black">
            <Gamepad2 className="size-8" />
          </TooltipTrigger>
          <TooltipContent className="text-base">
            controller connected
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
