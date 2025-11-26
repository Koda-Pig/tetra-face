import { Server as SocketIOServer } from "socket.io";
import type { Server as HttpServer } from "http";
import type { GameRoom } from "~/types";

const gameRooms = new Map<string, GameRoom>();

interface GameActionData {
  roomId: string;
  [key: string]: unknown;
}

const getAvailableRooms = (): GameRoom[] =>
  Array.from(gameRooms.values()).filter(
    (room) => room.players.length < 2 && !room.gameState?.isActive,
  );

function broadcastRoomUpdate(io: SocketIOServer) {
  io.emit("rooms-updated", getAvailableRooms());
}

function roomIdCheck(data: GameActionData) {
  if (typeof data?.roomId !== "string") {
    console.error('Error, "roomId" is not a string');
    return;
  }
}

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
      methods: ["GET", "POST"], // for initial handshake
    },
  });

  io.on("connection", (socket) => {
    console.log("client connected: ", socket.id);

    // send list of rooms when client connects
    socket.emit("rooms-list", getAvailableRooms());

    socket.on("get-rooms", () => {
      socket.emit("rooms-list", getAvailableRooms());
    });

    socket.on("create-room", (userId: string) => {
      const roomId = `room_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      // const roomId = `room_${Math.random().toString(6).slice(0, 1)}`;

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
      broadcastRoomUpdate(io);
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
      broadcastRoomUpdate(io);
    });

    socket.on("toggle-ready", (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      const room = gameRooms.get(roomId);

      if (!room) {
        socket.emit("error", { message: "Room not found" });
        return;
      }

      // Find and toggle the player's ready state
      const player = room.players.find((p) => p.userId === userId);
      if (!player) return;

      player.ready = !player.ready;
      // Emit the updated room to all players
      io.to(roomId).emit("player-ready-changed", { roomId, room });

      // if both players ready, mark game as active
      if (room.players.length === 2 && room.players.every((p) => p.ready)) {
        room.gameState.isActive = true;
        broadcastRoomUpdate(io);
      }
    });

    socket.on("game-action", (data: GameActionData) => {
      roomIdCheck(data);
      socket.to(data.roomId).emit("opponent-action", data);
    });

    socket.on("game-over-event", (data: GameActionData) => {
      roomIdCheck(data);
      // send game over event to ALL players in room (incl. sender)
      io.to(data.roomId).emit("game-over-event", data);
    });

    socket.on("game-pause-event", (data: GameActionData) => {
      roomIdCheck(data);
      // send game pause event to ALL players in room (incl. sender)
      io.to(data.roomId).emit("game-pause-event", data);
    });

    socket.on("disconnect", () => {
      for (const [roomId, room] of gameRooms.entries()) {
        const playerIndex = room.players.findIndex(
          (p) => p.socketId === socket.id,
        );
        if (playerIndex === -1) continue;

        const disconnectedPlayer = room.players[playerIndex];
        const userId = disconnectedPlayer!.userId;

        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) gameRooms.delete(roomId);
        else socket.to(roomId).emit("player-disconnected", { roomId, userId });

        broadcastRoomUpdate(io);
      }
    });
  });

  return io;
}

export { gameRooms };
