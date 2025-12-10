"use client";

import type {
  BoardCell,
  GameRoom,
  Winner,
  ServerToClientEvents,
  ClientToServerEvents,
} from "~/types";
import type { Session } from "next-auth";
import type { Socket } from "socket.io-client";
import { cn } from "~/lib/utils";
import HostGame from "./hostGame";
import OpponentGame, { type OpponentGameRef } from "./opponentGame";

export default function GameInProgress({
  isRoomHost,
  isGameOver,
  winner,
  opponentPlayer,
  currentRoom,
  socket,
  session,
  gamePaused,
  opponentGameRef,
  hostGameReceiveGarbageRef,
}: {
  isRoomHost: boolean;
  isGameOver: boolean;
  winner: Winner;
  opponentPlayer: GameRoom["players"][number];
  currentRoom: GameRoom;
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  session: Session;
  gamePaused: boolean;
  opponentGameRef: React.RefObject<OpponentGameRef | null>;
  hostGameReceiveGarbageRef: React.RefObject<
    ((garbageLines: BoardCell[][]) => void) | null
  >;
}) {
  return (
    <div
      className={cn(
        "relative flex justify-center gap-36",
        isRoomHost ? "flex-row" : "flex-row-reverse",
      )}
    >
      <div
        className={cn(
          "gameover-bg absolute -inset-2 z-10 grid place-items-center rounded p-8 text-center text-8xl transition-opacity",
          isGameOver ? "opacity-100" : "pointer-events-none opacity-0",
          winner === null && "hidden",
        )}
      >
        <p>YOU {winner === "you" ? "WON" : "LOST"}!</p>
        {/* <Button className="p-8 text-5xl">rematch?</Button> */}
      </div>
      <div
        className={cn(
          "transition-opacity duration-300",
          isGameOver ? "opacity-50" : "opacity-100",
        )}
      >
        <h2 className="text-center text-xl font-bold">
          {session.user.name} (YOU)
        </h2>
        <HostGame
          userId={session.user.id}
          socket={socket}
          roomId={currentRoom.id}
          externalPause={gamePaused}
          externalGameOver={isGameOver}
          onReceiveGarbageCallback={(callback) =>
            (hostGameReceiveGarbageRef.current = callback)
          }
        />
      </div>
      <div
        className={cn(
          "transition-opacity duration-300",
          isGameOver ? "opacity-50" : "opacity-100",
        )}
      >
        <h2 className="text-center text-xl font-bold">
          {opponentPlayer.username}
        </h2>
        <OpponentGame
          ref={opponentGameRef}
          userId={opponentPlayer.userId}
          externalPause={gamePaused}
          externalGameOver={isGameOver}
        />
      </div>
    </div>
  );
}
