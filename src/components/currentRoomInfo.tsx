"use client";

import { Play, HourglassIcon } from "lucide-react";
import type { GameRoom } from "~/types";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

export default function CurrentRoomInfo({
  currentRoom,
  onLeaveRoom,
}: Readonly<{
  currentRoom: GameRoom;
  onLeaveRoom: (roomId: string) => void;
}>) {
  return (
    <div>
      <h4 className="mb-4 text-center text-2xl font-semibold">Current Room</h4>
      <div className="relative mb-4 rounded border p-2">
        <div className="bg-background/20 space-y-2 p-2 text-lg backdrop-blur-sm">
          <p>Room ID</p>
          <p className="text-white">{currentRoom.id}</p>
          <p>Players ({currentRoom.players.length}/2)</p>
          <ul className="text-white">
            {currentRoom.players.map((player) => (
              <li key={player.userId} className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger>
                    {player.username}
                    {player.ready ? (
                      <Play className="inline-block" />
                    ) : (
                      <HourglassIcon className="hourglass-icon inline-block" />
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    {player.ready ? "player is ready" : "player not ready"}
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
          <Button
            onClick={() => onLeaveRoom(currentRoom.id)}
            className="absolute top-2 right-2 mt-2"
          >
            leave room
          </Button>
        </div>
      </div>
    </div>
  );
}
