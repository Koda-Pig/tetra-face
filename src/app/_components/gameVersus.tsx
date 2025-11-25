"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "~/hooks/useSocket";
import type { GameRoom, TetrisEvent } from "~/types";
import type { Session } from "next-auth";
import CopyButton from "./copyButton";
import { Play } from "lucide-react";
import HostGame from "./hostGame";
import OpponentGame, { type OpponentGameRef } from "./opponentGame";
import SocketDebugUi from "./socketDebugUi";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export default function GameVersus({ session }: { session: Session | null }) {
  const { socket, isConnected } = useSocket();
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [isRoomHost, setIsRoomHost] = useState<boolean>(false);
  const [gamesPaused, setGamesPaused] = useState(false); // in versus mode, pause state must be synced
  const opponentGameRef = useRef<OpponentGameRef>(null);
  const bothPlayersReady =
    currentRoom?.players.length === 2 &&
    currentRoom?.players?.every((player) => player.ready);
  const currentPlayer = currentRoom?.players.find(
    (p) => p.userId === session?.user?.id,
  );
  const isCurrentPlayerReady = currentPlayer?.ready ?? false;

  function addMessage(message: string) {
    setMessages((prev) => [
      `${new Date().toLocaleDateString()}: ${message}`,
      ...prev,
    ]);
  }

  function createRoom() {
    if (!socket || !session?.user?.id) return;
    addMessage("Creating room...");
    setIsRoomHost(true);
    socket.emit("create-room", session.user.id);
  }

  function joinRoomById() {
    if (!socket || !session?.user?.id || !roomIdToJoin.trim()) return;
    addMessage(`Attempting to join room: ${roomIdToJoin}`);
    setIsRoomHost(false);
    socket.emit("join-room", {
      roomId: roomIdToJoin,
      userId: session.user.id,
    });
  }

  function joinListedRoom(roomId: string) {
    if (!socket || !session?.user?.id) return;

    addMessage(`Attempting to join room: ${roomId}`);
    setIsRoomHost(false);
    socket.emit("join-room", {
      roomId,
      userId: session.user.id,
    });
  }

  function toggleReady() {
    if (!socket || !currentRoom || !session?.user?.id) return;

    socket.emit("toggle-ready", {
      roomId: currentRoom.id,
      userId: session.user.id,
    });
  }

  // socket logic
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    socket.on("rooms-list", (rooms: GameRoom[]) => setAvailableRooms(rooms));
    socket.on("rooms-updated", (rooms: GameRoom[]) => setAvailableRooms(rooms));
    socket.on("room-created", (data: { roomId: string; room: GameRoom }) => {
      addMessage(`room created: ${data.roomId}`);
      setCurrentRoom(data.room);
    });
    socket.on("player-joined", (data: { roomId: string; room: GameRoom }) => {
      addMessage(`Player joined room: ${data.roomId}`);
      setCurrentRoom(data.room);
    });
    socket.on(
      "player-ready-changed",
      (data: { roomId: string; room: GameRoom }) => {
        addMessage(`Player ready state changed in room: ${data.roomId}`);
        setCurrentRoom(data.room);
      },
    );
    socket.on("error", (data: { message: string }) => {
      addMessage(`Error: ${data.message}`);
    });
    socket.on("player-disconnected", (data: { roomId: string }) => {
      addMessage(`Player disconnected from room: ${data.roomId}`);
    });
    socket.on("opponent-action", (data: { action: TetrisEvent }) => {
      addMessage(`Received opponent action: ${JSON.stringify(data?.action)}`);

      switch (data.action.type) {
        case "game-over":
          console.log("player so and so lost, do something now");
          break;
        default:
          opponentGameRef.current?.triggerAction(data.action);
          break;
      }
    });
    socket.on("game-pause-event", (data: { action: TetrisEvent }) => {
      addMessage(`game pause event global ${data.action.type}`);
      setGamesPaused(data.action.type === "game-pause" ? true : false);
    });

    // Cleanup listeners
    return () => {
      socket.off("rooms-list");
      socket.off("rooms-updated");
      socket.off("room-created");
      socket.off("player-joined");
      socket.off("player-ready-changed");
      socket.off("error");
      socket.off("player-disconnected");
      socket.off("opponent-action");
      socket.off("game-pause-event");
    };
  }, [socket, session?.user?.id]);

  if (!session?.user.id) return <div>loading...</div>;

  return (
    <div>
      {/* games */}
      {bothPlayersReady ? (
        <div
          className={cn(
            "flex gap-8",
            isRoomHost ? "flex-row" : "flex-row-reverse",
          )}
        >
          <div>
            <h2 className="text-center text-xl font-bold">
              {isRoomHost ? "Player 1" : "Player 2"} (YOU)
            </h2>
            {/* host */}
            {currentRoom && socket && (
              <HostGame
                userId={session?.user.id}
                socket={socket}
                roomId={currentRoom.id}
                externalPause={gamesPaused}
              />
            )}
          </div>
          <div>
            <h2 className="text-center text-xl font-bold">
              {isRoomHost ? "Player 2" : "Player 1"}
            </h2>
            {/* opponent */}
            <OpponentGame
              ref={opponentGameRef}
              userId={`${session?.user.id}-opponent`}
              externalPause={gamesPaused}
            />
          </div>
        </div>
      ) : (
        <div>
          {currentRoom?.players.length === 2 ? (
            <div className="flex flex-col items-center gap-4">
              {/* ready to play button */}
              <Button
                size="lg"
                onClick={toggleReady}
                className="m-12 mx-auto flex"
              >
                {isCurrentPlayerReady ? "Ready ✅" : "Not Ready ⏳"}
                <Play />
              </Button>
            </div>
          ) : (
            <p className="m-12 text-center text-lg">
              {currentRoom
                ? "Waiting for second player to join..."
                : "Create or join a room to start"}
            </p>
          )}

          {availableRooms.length > 0 && (
            <div className="mb-4">
              <h4 className="mb-2 font-semibold">Available Rooms</h4>
              <div className="space-y-2 overflow-y-auto rounded border p-2">
                {availableRooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-background flex items-center justify-between rounded p-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">
                        Room {room.id.slice(5, 13)}
                      </span>
                      <span className="text-xs text-gray-600">
                        {room.players.length}/2 players
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => joinListedRoom(room.id)}
                      disabled={
                        room.players.length >= 2 || currentRoom !== null
                      }
                    >
                      Join
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mb-4 space-y-2">
            <Button
              onClick={createRoom}
              className="w-full"
              disabled={!isConnected || !session?.user}
            >
              Create Room
            </Button>

            <div className="flex gap-2">
              <input
                type="text"
                value={roomIdToJoin}
                onChange={(e) => setRoomIdToJoin(e.target.value)}
                placeholder="Room ID"
                className="w-full rounded border"
              />
              <Button
                onClick={joinRoomById}
                disabled={
                  !isConnected || !session?.user || !roomIdToJoin.trim()
                }
              >
                Join
              </Button>
            </div>
          </div>
          {/* Current Room Info */}

          {currentRoom && (
            <div className="mb-4 rounded bg-gray-500 p-2">
              <h4 className="font-semibold">Current Room</h4>
              <p className="text-sm">
                ID: {currentRoom.id}
                <CopyButton content={currentRoom.id} />
              </p>
              <p className="text-sm">Players: {currentRoom.players.length}/2</p>
              <ul className="text-xs">
                {currentRoom.players.map((player, idx) => (
                  <li key={idx}>
                    {player.userId} {player.ready ? "✅" : "⏳"}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Message Log */}
          <div>
            <h4 className="mb-2 font-semibold">Event Log</h4>
            <div className="bg-background h-40 overflow-y-auto rounded border p-2 text-xs">
              {messages.map((msg, idx) => (
                <div key={idx} className="mb-1">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* socket testing */}
      <SocketDebugUi
        messages={messages}
        currentRoom={currentRoom}
        session={session}
      />
    </div>
  );
}
