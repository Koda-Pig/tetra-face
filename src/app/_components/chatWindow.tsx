"use client";

import { useSocket } from "~/hooks/useSocket";
import type { GameRoom } from "~/types";
import type { Session } from "next-auth";
import { MessageCircleIcon } from "lucide-react";
import {
  Drawer,
  DrawerHeader,
  DrawerTitle,
  DrawerContent,
  DrawerTrigger,
  DrawerDescription,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";

export default function ChatWindow({
  currentRoom,
  messages,
  session,
}: {
  currentRoom: GameRoom | null;
  messages: string[];
  session: Session;
}) {
  const { isConnected } = useSocket();

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="absolute top-38 left-4">
          <p>Chat</p>
          <MessageCircleIcon />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            <p className="mb-3 text-center text-lg font-semibold">Chat</p>
          </DrawerTitle>
          <DrawerDescription>
            Use this to test the socket connection and room creation.
          </DrawerDescription>
        </DrawerHeader>
        <div className="mx-auto w-full rounded bg-gray-500 p-4 sm:max-w-xl">
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

          {/* Message Log */}
          <div>
            <h4 className="mb-2 font-semibold">Event Log</h4>
            <p className="bg-background h-40 overflow-y-auto rounded border p-2 text-xs">
              {messages.map((msg, idx) => (
                <span key={idx}>
                  {msg}
                  <br />
                </span>
              ))}
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
