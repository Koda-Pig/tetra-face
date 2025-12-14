"use client";

import { useState } from "react";
import SinglePlayerGame from "./singlePlayerGame";
import GameplayControls from "./gameplayControls";
import GameVersus from "./gameVersus";
import { Button } from "~/components/ui/button";
import { ArrowLeftFromLine, LogOut, Gamepad2, User, Users } from "lucide-react";
import Link from "next/link";
import type { Session } from "next-auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useGameInPlay } from "~/contexts/gameInPlayContext";
import { useGamepad } from "~/hooks/useGamepad";
import { cn } from "~/lib/utils";

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
          >
            <ArrowLeftFromLine />
            back
          </Button>
        )}
        <Button asChild>
          <Link href="/api/auth/signout">
            <LogOut />
            sign out
          </Link>
        </Button>
      </div>
      <div className="fixed top-4 right-4 grid gap-2">
        <GameplayControls />
      </div>

      <div
        className={cn(
          "mx-auto mt-6 grid h-full w-max grid-cols-2 items-center gap-4 transition-[margin]",
          gameMode === null
            ? ""
            : "pointer-events-none -my-5 [&_button]:-translate-x-full [&_button]:opacity-0 [&_button:last-child]:translate-x-full",
        )}
      >
        <Button
          size="lg"
          className="text-md relative w-full px-4 py-8 text-xl"
          onClick={() => {
            setGameMode("single-player");
            setIsGameInPlay(true);
          }}
        >
          <User className="size-8" />
          SINGLE PLAYER
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="lg"
              className="text-md relative w-full px-4 py-8 text-xl"
              onClick={() => {
                if (!session) return;
                setGameMode("versus");
              }}
            >
              <Users className="size-8" />
              VERSUS
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {session ? "good luck!" : <p>sign in first</p>}
          </TooltipContent>
        </Tooltip>
      </div>

      {session?.user?.id && gameMode === "single-player" && (
        <SinglePlayerGame userId={session.user.id} />
      )}
      {gameMode === "versus" && <GameVersus session={session} />}

      {gamepadConnected && (
        <Tooltip>
          <TooltipTrigger className="fixed right-4 bottom-4 rounded-full bg-(--retro-green-dullest) p-1 text-white">
            <Gamepad2 className="size-8" />
          </TooltipTrigger>
          <TooltipContent>controller connected</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
