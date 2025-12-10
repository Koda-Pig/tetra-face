"use client";

import { Play, HourglassIcon } from "lucide-react";
import type { GameRoom } from "~/types";
import { Button } from "~/components/ui/button";

export default function CurrentRoomInfo({
  currentRoom,
  onLeaveRoom,
}: {
  currentRoom: GameRoom;
  onLeaveRoom: (roomId: string) => void;
}) {
  return (
    <div className="relative mb-4 rounded bg-gray-800/50 p-2">
      <h4 className="text-xl font-semibold">Current Room</h4>
      <p className="text-sm">
        Room ID: <span className="text-white">{currentRoom.id}</span>
      </p>
      <p className="text-sm">
        Players:{" "}
        <span className="text-white">{currentRoom.players.length}/2</span>
      </p>
      <ul className="text-lg">
        {currentRoom.players.map((player, idx) => (
          <li key={idx}>
            {player.username}
            {player.ready ? (
              <Play className="inline-block" />
            ) : (
              <HourglassIcon className="hourglass-icon inline-block" />
            )}
          </li>
        ))}
      </ul>
      <Button
        onClick={() => onLeaveRoom(currentRoom.id)}
        className="absolute top-2 right-2 mt-2"
        variant="outline"
      >
        leave room
      </Button>
    </div>
  );
}
