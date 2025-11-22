import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import type { GameRoom } from "~/types";

const gameRooms = new Map<string, GameRoom>();

interface GameActionData {
  roomId: string;
  [key: string]: unknown;
}

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"], // for initial handshake
    },
  });

  io.on("connection", (socket) => {
    console.log("client connected: ", socket.id);

    socket.on("create-room", (userId: string) => {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const newRoom: GameRoom = {
        id: roomId,
        players: [
          {
            userId,
            socketId: socket.id,
            ready: false,
          },
        ],
        gameState: { isActive: false },
        createdAt: new Date(),
      };

      gameRooms.set(roomId, newRoom);
      void socket.join(roomId); // void for floating promise
      socket.emit("room-created", { roomId, room: newRoom });
    });

    socket.on("join-room", (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      const room = gameRooms.get(roomId);

      if (!room) {
        socket.emit("error", { message: "room not found" });
        return;
      }

      if (room.players.length >= 2) {
        socket.emit("error", { message: "room is full" });
        return;
      }

      room.players.push({
        userId,
        socketId: socket.id,
        ready: false,
      });

      void socket.join(roomId); // void for floating promise

      io.to(roomId).emit("player-joined", { roomId, room });
    });

    socket.on("game-action", (data: GameActionData) => {
      if (typeof data?.roomId !== "string") {
        console.error('Error, "roomId" is not a string');
      }
      socket.to(data.roomId).emit("opponent-action", data);
    });

    socket.on("disconnect", () => {
      for (const [roomId, room] of gameRooms.entries()) {
        const playerIndex = room.players.findIndex(
          (p) => p.socketId === socket.id,
        );
        if (playerIndex === -1) continue;

        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          gameRooms.delete(roomId);
        } else {
          socket.to(roomId).emit("player-disconnected", { roomId });
        }
      }
    });
  });

  return io;
}

export { gameRooms };
