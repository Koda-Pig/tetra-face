"use client";

import type { GameRoom } from "~/types";
import type { Session } from "next-auth";
import RoomList from "./roomList";
import CurrentRoomInfo from "./currentRoomInfo";

export default function RoomLobby({
  currentRoom,
  availableRooms,
  isConnected,
  session,
  waitingForJoinRoomResponse,
  onCreateRoom,
  onJoinRoomRequest,
  onLeaveRoom,
}: {
  currentRoom: GameRoom | null;
  availableRooms: GameRoom[];
  isConnected: boolean;
  session: Session;
  waitingForJoinRoomResponse: boolean;
  onCreateRoom: () => void;
  onJoinRoomRequest: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
}) {
  return (
    <div className="mx-auto my-18 max-w-2xl">
      {currentRoom && (
        <h6 className="my-16 text-center text-xl">
          Waiting for second player to join...
        </h6>
      )}

      {!currentRoom && (
        <RoomList
          availableRooms={availableRooms}
          currentRoom={currentRoom}
          isConnected={isConnected}
          session={session}
          waitingForJoinRoomResponse={waitingForJoinRoomResponse}
          onJoinRoomRequest={onJoinRoomRequest}
          onLeaveRoom={onLeaveRoom}
          onCreateRoom={onCreateRoom}
        />
      )}

      {currentRoom && (
        <CurrentRoomInfo currentRoom={currentRoom} onLeaveRoom={onLeaveRoom} />
      )}
    </div>
  );
}
