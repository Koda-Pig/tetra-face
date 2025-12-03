"use client";

import { useState, useEffect, useRef } from "react";
import { useSocket } from "~/hooks/useSocket";
import type { BoardCell, GameRoom, TetrisEvent, Winner } from "~/types";
import type { Session } from "next-auth";
import { Play } from "lucide-react";
import HostGame from "./hostGame";
import { getTimestamp } from "~/lib/utils";
import OpponentGame, { type OpponentGameRef } from "./opponentGame";
import SocketDebugUi from "./socketDebugUi";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export default function GameVersus({ session }: { session: Session | null }) {
  const { socket, isConnected } = useSocket();
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [isRoomHost, setIsRoomHost] = useState<boolean>(false);
  const [gamePaused, setGamePaused] = useState(false); // in versus mode, pause state must be synced
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<Winner>(null);
  const opponentGameRef = useRef<OpponentGameRef>(null);
  const bothPlayersReady =
    currentRoom?.players.length === 2 &&
    currentRoom?.players?.every((player) => player.ready);
  const currentPlayer = currentRoom?.players.find(
    (p) => p.userId === session?.user?.id,
  );
  const isCurrentPlayerReady = currentPlayer?.ready ?? false;
  const hostGameReceiveGarbageRef = useRef<
    ((garbageLines: BoardCell[][]) => void) | null
  >(null);

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

  function joinRoom(roomId: string) {
    if (!socket || !session?.user?.id) return;
    addMessage(`Attempting to join room: ${roomId}`);
    setIsRoomHost(false);
    socket.emit("join-room", {
      roomId,
      userId: session.user.id,
    });
  }

  function leaveRoom(roomId: string) {
    if (!socket || !session?.user?.id) return;
    addMessage(`Attempting to leave room: ${roomId}`);
    setIsRoomHost(false);
    setCurrentRoom(null);
    socket.emit("leave-room", {
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
    socket.on(
      "player-disconnected",
      (data: { roomId: string; userId: string }) => {
        addMessage(`Player disconnected from room: ${data.roomId}`);
        const { roomId, userId } = data;
        socket.emit("game-over-event", {
          roomId,
          action: {
            type: "game-over",
            playerId: userId,
            timestamp: getTimestamp(),
          },
        });
      },
    );
    socket.on("opponent-action", (data: { action: TetrisEvent }) => {
      addMessage(`Received opponent action: ${JSON.stringify(data?.action)}`);
      if (data.action.type === "send-garbage") {
        // 'send-garbage' is the one event that needs to be handled by the host game, as it affects the host game's state
        hostGameReceiveGarbageRef.current?.(data?.action?.garbageLines);
      } else {
        opponentGameRef.current?.triggerAction(data.action);
      }
    });
    socket.on("game-pause-event", (data: { action: TetrisEvent }) => {
      addMessage(`game pause event global ${data.action.type}`);
      setGamePaused(data.action.type === "game-pause" ? true : false);
    });
    socket.on("game-over-event", (data: { action: TetrisEvent }) => {
      addMessage(`game over event global ${data.action.type}`);
      setIsGameOver(true);
      if (data.action.type !== "game-over") return;
      // there is a potential for error here, as the winner is set based on whoever sends the gameover event first
      // so in a case where player 1's game ended first, they send a game over event. Meanwhile player 2's game also ended
      // and they send the game over event second. The should win the game, but if the event they sent arrives before player 1's,
      // due to network speed, then the incorrect player will be set as the winner.
      // this is pretty unlikely, but good to note.
      setWinner(
        data.action.playerId === session?.user?.id ? "opponent" : "you",
      );
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
      socket.off("game-over-event");
    };
  }, [socket, session?.user?.id]);

  if (!session?.user.id) return <div>loading...</div>;

  return (
    <div>
      {/* games */}
      {bothPlayersReady ? (
        <div
          className={cn(
            "relative flex justify-center gap-36",
            isRoomHost ? "flex-row" : "flex-row-reverse",
          )}
        >
          <p
            className={cn(
              "absolute inset-0 z-10 grid place-items-center p-8 text-center text-9xl transition-opacity",
              isGameOver ? "opacity-100" : "pointer-events-none opacity-0",
              winner === null && "hidden",
            )}
          >
            YOU {winner === "you" ? "WON" : "LOST"}!
          </p>
          <div
            className={cn(
              "transition-opacity duration-300",
              isGameOver ? "opacity-50" : "opacity-100",
            )}
          >
            <h2 className="text-center text-xl font-bold">
              {isRoomHost ? "Player 1" : "Player 2"} (YOU)
            </h2>
            {/* host */}
            {currentRoom && socket && (
              <HostGame
                userId={session?.user.id}
                socket={socket}
                roomId={currentRoom.id}
                externalPause={gamePaused}
                externalGameOver={isGameOver}
                onReceiveGarbageCallback={(callback) =>
                  (hostGameReceiveGarbageRef.current = callback)
                }
              />
            )}
          </div>
          <div
            className={cn(
              "transition-opacity duration-300",
              isGameOver ? "opacity-50" : "opacity-100",
            )}
          >
            <h2 className="text-center text-xl font-bold">
              {isRoomHost ? "Player 2" : "Player 1"}
            </h2>
            {/* opponent */}
            <OpponentGame
              ref={opponentGameRef}
              userId={`${session?.user.id}-opponent`}
              externalPause={gamePaused}
              externalGameOver={isGameOver}
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
              <h4 className="mb-2 text-xl font-semibold">Available Rooms</h4>
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
                      onClick={() => {
                        if (currentRoom?.id === room.id) leaveRoom(room.id);
                        else joinRoom(room.id);
                      }}
                      // disabled={
                      //   room.players.length >= 2 || currentRoom !== null
                      // }
                    >
                      {currentRoom?.id === room.id ? "Leave" : "Join"}
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
          </div>
          {/* Current Room Info */}

          {currentRoom && (
            <div className="mb-4 rounded bg-gray-500 p-2">
              <h4 className="font-semibold">Current Room</h4>
              <p className="text-sm">ID: {currentRoom.id}</p>
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
