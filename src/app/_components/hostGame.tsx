"use client";

import BaseGame from "./baseGame";
import type { Socket } from "socket.io-client";

export default function HostGame({
  userId,
  socket,
  roomId,
}: {
  userId: string;
  socket?: Socket;
  roomId?: string;
}) {
  return <BaseGame userId={userId} socket={socket} roomId={roomId} />;
}
