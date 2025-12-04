"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSocket } from "~/hooks/useSocket";
import type { BoardCell, GameRoom, TetrisEvent, Winner } from "~/types";
import type { Session } from "next-auth";
import { Play, HourglassIcon } from "lucide-react";
import HostGame from "./hostGame";
import { getTimestamp } from "~/lib/utils";
import OpponentGame, { type OpponentGameRef } from "./opponentGame";
import ChatWindow from "./chatWindow";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { Socket } from "socket.io-client";

function GameInProgress({
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
  socket: Socket;
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
          {isRoomHost ? session.user.name + " (YOU)" : opponentPlayer.username}
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
          {isRoomHost ? opponentPlayer.username : session.user.name}
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

function WaitingForReady({
  isCurrentPlayerReady,
  onToggleReady,
}: {
  isCurrentPlayerReady: boolean;
  onToggleReady: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Button size="lg" onClick={onToggleReady} className="m-12 mx-auto flex">
        {isCurrentPlayerReady ? (
          <>
            Ready <Play className="inline-block" />
          </>
        ) : (
          <>
            Not Ready <HourglassIcon className="hourglass-icon inline-block" />
          </>
        )}
      </Button>
    </div>
  );
}

function RoomList({
  availableRooms,
  currentRoom,
  isConnected,
  session,
  onJoinRoom,
  onLeaveRoom,
  onCreateRoom,
}: {
  availableRooms: GameRoom[];
  currentRoom: GameRoom | null;
  isConnected: boolean;
  session: Session;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onCreateRoom: () => void;
}) {
  if (availableRooms.length === 0 && !currentRoom) {
    return (
      <div className="mb-4">
        <h4 className="mb-2 text-center text-xl font-semibold">
          Available Rooms
        </h4>
        <div className="space-y-2 overflow-y-auto rounded border p-2">
          <p className="text-center text-sm">
            No available rooms.
            <Button
              variant="ghost"
              className="ml-2 inline-block"
              onClick={onCreateRoom}
              disabled={!isConnected || !session?.user}
            >
              make one!
            </Button>
          </p>
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
      <div className="space-y-2 overflow-y-auto rounded border p-2">
        {availableRooms.map((room) => (
          <div
            key={room.id}
            className="bg-background flex items-center justify-between rounded p-2 text-sm"
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
                else onJoinRoom(room.id);
              }}
            >
              {currentRoom?.id === room.id ? "Leave" : "Join"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentRoomInfo({
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
            {player.ready ? (
              <Play className="inline-block" />
            ) : (
              <HourglassIcon className="hourglass-icon inline-block" />
            )}{" "}
            {player.username}
          </li>
        ))}
      </ul>
      <Button
        onClick={() => onLeaveRoom(currentRoom.id)}
        className="absolute top-2 right-2 mt-2"
        variant="destructive"
      >
        Leave Room
      </Button>
    </div>
  );
}

function RoomLobby({
  currentRoom,
  availableRooms,
  isConnected,
  session,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}: {
  currentRoom: GameRoom | null;
  availableRooms: GameRoom[];
  isConnected: boolean;
  session: Session;
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      {!currentRoom && (
        <h6 className="my-16 text-center text-xl">
          Create or join a room to start
        </h6>
      )}

      {currentRoom && (
        <h6 className="my-16 text-center text-xl">
          Waiting for second player to join...
        </h6>
      )}

      <RoomList
        availableRooms={availableRooms}
        currentRoom={currentRoom}
        isConnected={isConnected}
        session={session}
        onJoinRoom={onJoinRoom}
        onLeaveRoom={onLeaveRoom}
        onCreateRoom={onCreateRoom}
      />

      {currentRoom && (
        <CurrentRoomInfo currentRoom={currentRoom} onLeaveRoom={onLeaveRoom} />
      )}

      {!currentRoom && (
        <Button
          onClick={onCreateRoom}
          disabled={!isConnected || !session?.user}
          className="mx-auto my-8 flex"
        >
          create room
        </Button>
      )}
    </div>
  );
}

// type UserMessage = {
//   content: string;
//   username: string;
// };

export default function GameVersus({ session }: { session: Session }) {
  const { socket, isConnected } = useSocket();
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [availableRooms, setAvailableRooms] = useState<GameRoom[]>([]);
  const [messages, setMessages] = useState<string[]>([]);
  const [isRoomHost, setIsRoomHost] = useState<boolean>(false);
  const [gamePaused, setGamePaused] = useState(false); // in versus mode, pause state must be synced
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<Winner>(null);
  const opponentGameRef = useRef<OpponentGameRef>(null);
  const hostGameReceiveGarbageRef = useRef<
    ((garbageLines: BoardCell[][]) => void) | null
  >(null);
  const bothPlayersReady =
    currentRoom?.players.length === 2 &&
    currentRoom?.players?.every((player) => player.ready);
  const currentPlayer = currentRoom?.players.find(
    (p) => p.userId === session?.user?.id,
  );
  const opponentPlayer = useMemo(() => {
    return currentRoom?.players.find((p) => p.userId !== session?.user?.id);
  }, [currentRoom?.players, session?.user?.id]);
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
    socket.emit("create-room", session.user.id, session.user.name);
  }

  function joinRoom(roomId: string) {
    if (!socket || !session?.user?.id) return;
    addMessage(`Attempting to join room: ${roomId}`);
    setIsRoomHost(false);
    socket.emit("join-room", {
      roomId,
      userId: session.user.id,
      username: session.user.name,
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

  if (!socket) return null;

  return (
    <div>
      {bothPlayersReady && currentRoom && opponentPlayer?.username ? (
        <GameInProgress
          isRoomHost={isRoomHost}
          isGameOver={isGameOver}
          winner={winner}
          opponentPlayer={opponentPlayer}
          currentRoom={currentRoom}
          socket={socket}
          session={session}
          gamePaused={gamePaused}
          opponentGameRef={opponentGameRef}
          hostGameReceiveGarbageRef={hostGameReceiveGarbageRef}
        />
      ) : currentRoom?.players.length === 2 ? (
        <div className="mx-auto max-w-2xl">
          <WaitingForReady
            isCurrentPlayerReady={isCurrentPlayerReady}
            onToggleReady={toggleReady}
          />
          <CurrentRoomInfo currentRoom={currentRoom} onLeaveRoom={leaveRoom} />
        </div>
      ) : (
        <RoomLobby
          currentRoom={currentRoom}
          availableRooms={availableRooms}
          isConnected={isConnected}
          session={session}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onLeaveRoom={leaveRoom}
        />
      )}

      <ChatWindow
        messages={messages}
        currentRoom={currentRoom}
        session={session}
      />
    </div>
  );
}
