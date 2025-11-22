"use client";

import { useState, useEffect } from "react";
import { useSocket } from "~/hooks/useSocket";
import type { GameRoom } from "~/types";
import type { Session } from "next-auth";
import { Copy, Play, Terminal } from "lucide-react";
import HostGame from "./hostGame";
import OpponentGame from "./opponentGame";
import { Drawer, DrawerContent, DrawerTrigger } from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";

// host perspective
export default function GameVersus({ session }: { session: Session | null }) {
  const { socket, isConnected } = useSocket();
  const [currentRoom, setCurrentRoom] = useState<GameRoom | null>(null);
  const [matchHasBegun, beginMatch] = useState(false);
  const [roomIdToJoin, setRoomIdToJoin] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [opponentKeyPress, setOpponentKeyPress] = useState<string | null>(null);

  const addMessage = (message: string) => {
    setMessages((prev) => [
      ...prev,
      `${new Date().toLocaleDateString()}: ${message}`,
    ]);
  };

  const createRoom = () => {
    if (socket && session?.user?.id) {
      addMessage("Creating room...");
      socket.emit("create-room", session.user.id);
    }
  };

  const joinRoom = () => {
    if (socket && session?.user?.id && roomIdToJoin.trim()) {
      addMessage(`Attempting to join room: ${roomIdToJoin}`);
      socket.emit("join-room", {
        roomId: roomIdToJoin,
        userId: session.user.id,
      });
    }
  };

  const sendTestGameAction = () => {
    if (socket && currentRoom) {
      const testAction = {
        roomId: currentRoom.id,
        action: {
          type: "move" as const,
          payload: { direction: "left", timestamp: Date.now() },
          timestamp: Date.now(),
        },
      };
      socket.emit("game-action", testAction);
      addMessage(`Sent test game action: ${JSON.stringify(testAction.action)}`);
    }
  };

  // socket logic
  useEffect(() => {
    if (!socket || !session?.user?.id) return;

    socket.on("room-created", (data: { roomId: string; room: GameRoom }) => {
      addMessage(`room created: ${data.roomId}`);
      setCurrentRoom(data.room);
    });
    socket.on("player-joined", (data: { roomId: string; room: GameRoom }) => {
      addMessage(`Player joined room: ${data.roomId}`);
      setCurrentRoom(data.room);
    });

    socket.on("error", (data: { message: string }) => {
      addMessage(`Error: ${data.message}`);
    });

    socket.on("player-disconnected", (data: { roomId: string }) => {
      addMessage(`Player disconnected from room: ${data.roomId}`);
    });

    // socket.io types are not fully typed yet
    socket.on(
      "opponent-action",
      (data: {
        action: {
          type: string;
          keyCode?: string;
          timestamp: number;
        };
      }) => {
        addMessage(`Received opponent action: ${JSON.stringify(data?.action)}`);

        // If it's a keystroke action, update the opponent's current key
        if (data.action.type === "keystroke" && data.action.keyCode) {
          setOpponentKeyPress(data.action.keyCode);

          // Clear the key press after a short delay, hopefully stops too many key presses from being sent
          setTimeout(() => setOpponentKeyPress(null), 100);
        }
      },
    );

    // Cleanup listeners
    return () => {
      socket.off("room-created");
      socket.off("player-joined");
      socket.off("error");
      socket.off("player-disconnected");
      socket.off("opponent-action");
    };
  }, [socket, session?.user?.id]);

  if (!session?.user.id) return <div>loading...</div>;

  return (
    <div>
      {/* games */}
      {matchHasBegun ? (
        <div className="flex gap-8">
          <div>
            <h2 className="text-center text-xl font-bold">Player 1</h2>
            {/* host */}
            {currentRoom && socket && (
              <HostGame
                userId={session?.user.id}
                socket={socket}
                roomId={currentRoom.id}
              />
            )}
          </div>
          <div>
            <h2 className="text-center text-xl font-bold">Player 2</h2>
            {/* opponent */}
            <OpponentGame
              userId={session?.user.id}
              currentKey={opponentKeyPress}
            />
          </div>
        </div>
      ) : (
        <div>
          <Button
            size="lg"
            onClick={() => beginMatch(true)}
            className="m-12 mx-auto flex"
          >
            <p>begin match</p>
            <Play />
          </Button>
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
              />
              <Button
                onClick={joinRoom}
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
                <Button
                  onClick={() =>
                    void navigator.clipboard.writeText(currentRoom.id)
                  }
                  title="copy"
                  size="icon-sm"
                  className="ml-2"
                >
                  <Copy />
                </Button>
              </p>
              <p className="text-sm">Players: {currentRoom.players.length}/2</p>
              <ul className="text-xs">
                {currentRoom.players.map((player, idx) => (
                  <li key={idx}>
                    {player.userId} {player.ready ? "✅" : "⏳"}
                  </li>
                ))}
              </ul>
              <button
                onClick={sendTestGameAction}
                className="mt-2 rounded bg-purple-500 px-2 py-1 text-sm"
              >
                Send Test Action
              </button>
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
      <Drawer>
        <DrawerTrigger asChild>
          <Button className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <Terminal />
            <p>Socket Testing</p>
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="flex-1">
            <div className="w-80 rounded bg-gray-500 p-4">
              <h3 className="mb-4 font-bold">Socket Testing</h3>

              {/* Connection Status */}
              <div className="mb-4">
                <p
                  className={`font-semibold ${isConnected ? "text-green-600" : "text-red-600"}`}
                >
                  {isConnected ? "✅ Connected" : "❌ Disconnected"}
                </p>
                {session?.user && (
                  <p className="text-sm">User: {session.user.name}</p>
                )}
              </div>

              {/* Room Controls */}
              <div className="mb-4 space-y-2">
                <button
                  onClick={createRoom}
                  disabled={!isConnected || !session?.user}
                  className="w-full rounded bg-green-500 px-4 py-2 disabled:bg-gray-300"
                >
                  Create Room
                </button>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={roomIdToJoin}
                    onChange={(e) => setRoomIdToJoin(e.target.value)}
                    placeholder="Room ID"
                    className="flex-1 rounded border px-2 py-1"
                  />
                  <button
                    onClick={joinRoom}
                    disabled={
                      !isConnected || !session?.user || !roomIdToJoin.trim()
                    }
                    className="rounded bg-green-500 px-4 py-2 disabled:bg-gray-500"
                  >
                    Join
                  </button>
                </div>
              </div>

              {/* Current Room Info */}
              {currentRoom && (
                <div className="mb-4 rounded bg-gray-500 p-2">
                  <h4 className="font-semibold">Current Room</h4>
                  <p className="text-sm">ID: {currentRoom.id}</p>
                  <p className="text-sm">
                    Players: {currentRoom.players.length}/2
                  </p>
                  <ul className="text-xs">
                    {currentRoom.players.map((player, idx) => (
                      <li key={idx}>
                        {player.userId} {player.ready ? "✅" : "⏳"}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={sendTestGameAction}
                    className="mt-2 rounded bg-purple-500 px-2 py-1 text-sm"
                  >
                    Send Test Action
                  </button>
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
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
