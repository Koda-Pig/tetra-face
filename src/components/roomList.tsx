"use client";

import type { GameRoom, JoinRoomRequest } from "~/types";
import type { Session } from "next-auth";
import { Button } from "~/components/ui/button";

export default function RoomList({
  availableRooms,
  currentRoom,
  isConnected,
  session,
  outgoingJoinRequest,
  onJoinRoomRequest,
  onLeaveRoom,
  onCreateRoom,
}: {
  availableRooms: GameRoom[];
  currentRoom: GameRoom | null;
  isConnected: boolean;
  session: Session;
  outgoingJoinRequest: JoinRoomRequest | null;
  onJoinRoomRequest: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}) {
  if (availableRooms.length === 0 && !currentRoom) {
    return (
      <div className="mb-4">
        {/* <h4 className="mb-2 text-center text-xl font-semibold">
          Available Rooms
        </h4> */}
        <div className="space-y-2 rounded border p-2">
          <p className="mt-2 text-center">No available rooms.</p>
          <Button
            variant="ghost"
            className="mx-auto block"
            onClick={onCreateRoom}
            disabled={!isConnected || !session?.user}
          >
            make one!
          </Button>
        </div>
      </div>
    );
  }

  if (availableRooms.length === 0) return null;

  return (
    <div className="mb-4">
      <h4 className="mb-2 text-center text-xl font-semibold">
        Available Rooms
      </h4>
      <div className="space-y-2 rounded border p-2">
        {availableRooms.map((room) => (
          <div
            key={room.id}
            className="bg-background/20 flex items-center justify-between rounded p-2 text-sm backdrop-blur-sm"
          >
            <div>
              <p className="text-lg font-medium">Room ID: {room.id}</p>
              <p className="text-lg text-gray-600">
                {room.players.length}/2 players
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                if (currentRoom?.id === room.id) onLeaveRoom(room.id);
                else onJoinRoomRequest(room.id);
              }}
            >
              {currentRoom?.id === room.id
                ? "leave"
                : outgoingJoinRequest === room.id
                  ? "waiting for response... "
                  : "join"}
            </Button>
          </div>
        ))}
      </div>

      <Button
        onClick={onCreateRoom}
        disabled={!isConnected || !session?.user}
        className="mx-auto my-8 flex"
      >
        create room
      </Button>
    </div>
  );
}
