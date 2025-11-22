"use client";

import { useState } from "react";
import GameCanvas from "./gameCanvas";
import GameplayControls from "./gameplayControls";
import GameVersus from "./gameVersus";
import { Button } from "~/components/ui/button";
import { ArrowLeftFromLine, LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
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

      <div className="fixed right-4 bottom-4 grid gap-2">
        <Button onClick={() => setGameMode(null)}>
          <ArrowLeftFromLine />
          <p>back home</p>
        </Button>
        <Button asChild>
          <Link href="/api/auth/signout" className="">
            <LogOut />
            <p>sign out</p>
          </Link>
        </Button>
      </div>

      {gameMode === null && (
        <div className="grid h-full grid-cols-2 items-center gap-4">
          <div>
            <Image
              src="/SB.png"
              alt="sPoNGeBOb"
              width={180}
              height={180}
              className="mb-4"
            />
            <Button
              size="lg"
              className="w-full"
              onClick={() => setGameMode("single-player")}
            >
              Single player
            </Button>
          </div>

          <div className="flex h-full flex-col">
            <div className="mb-4 grid grid-cols-2">
              <Image
                src="/SB.png"
                alt="sPoNGeBOb"
                width={90}
                height={90}
                className="scale-[-1_1]"
              />
              <Image
                src="/SB.png"
                alt="sPoNGeBOb"
                width={90}
                height={90}
                className=""
              />
              <Image
                src="/SB.png"
                alt="sPoNGeBOb"
                width={90}
                height={90}
                className="scale-[-1]"
              />
              <Image
                src="/SB.png"
                alt="sPoNGeBOb"
                width={90}
                height={90}
                className="scale-[1-1]"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="lg"
                  onClick={() => {
                    if (!session) return;
                    setGameMode("versus");
                  }}
                >
                  Versus
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {session ? "good luck!" : <p>sign in first</p>}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
      {session?.user?.id && gameMode === "single-player" && (
        <GameCanvas userId={session.user.id} />
      )}
      {gameMode === "versus" && <GameVersus session={session} />}
    </div>
  );
}
