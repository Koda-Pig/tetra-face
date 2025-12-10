"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "~/types";

export function useSocket() {
  const [socket, setSocket] = useState<Socket<
    ServerToClientEvents,
    ClientToServerEvents
  > | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance: Socket<ServerToClientEvents, ClientToServerEvents> =
      io();
    socketInstance.on("connect", () => setIsConnected(true));
    socketInstance.on("disconnect", () => setIsConnected(false));
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  return { socket, isConnected };
}
