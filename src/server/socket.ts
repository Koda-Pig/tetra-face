import { Server as SocketIOServer } from "socket.io";
import type { Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import type {
  GameRoom,
  GameActionData,
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types";
import { TETRIS_WORDS } from "../constants";

const gameRooms = new Map<string, GameRoom>();
const pendingJoinRequests = new Map<string, string>();

// random enough
const randomTetrisWord = () =>
  TETRIS_WORDS[Math.floor(Math.random() * TETRIS_WORDS.length)];

const getAvailableRooms = (): GameRoom[] =>
  Array.from(gameRooms.values()).filter(
    (room) => room.players.length < 2 && !room.gameState?.isActive,
  );

function broadcastRoomUpdate(
  io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>,
) {
  io.emit("rooms-updated", getAvailableRooms());
}

function roomIdCheck(data: GameActionData) {
  if (typeof data?.roomId !== "string") {
    console.error('Error, "roomId" is not a string');
    return;
  }
}

function validate(
  room: GameRoom | undefined,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
): room is GameRoom {
  if (!room) {
    socket.emit("error", { message: "room not found" });
    return false;
  }

  if (room.players.length >= 2) {
    socket.emit("error", { message: "room is full" });
    return false;
  }

  return true;
}

export function initializeSocket(httpServer: HttpServer) {
  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      cors: {
        origin: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
        methods: ["GET", "POST"], // for initial handshake
      },
    },
  );

  io.on("connection", (socket) => {
    console.log("client connected: ", socket.id);

    // send list of rooms when client connects
    socket.emit("rooms-list", getAvailableRooms());

    socket.on("get-rooms", () => {
      socket.emit("rooms-list", getAvailableRooms());
    });

    socket.on("create-room", (userId: string, username: string) => {
      const roomId = `${randomTetrisWord()}-${randomTetrisWord()}-${randomTetrisWord()}-${randomTetrisWord()}`;

      const newRoom: GameRoom = {
        id: roomId,
        players: [
          {
            userId,
            username,
            socketId: socket.id,
            ready: false,
          },
        ],
        gameState: { isActive: false },
        createdAt: new Date(),
      };

      gameRooms.set(roomId, newRoom);
      void socket.join(roomId); // void for floating promise
      socket.emit("room-created", { room: newRoom });
      broadcastRoomUpdate(io);
    });

    socket.on(
      "join-room-request",
      (data: { roomId: string; userId: string; username: string }) => {
        console.log("join room request received from socket.ts");
        const { roomId, userId, username } = data;
        const room = gameRooms.get(roomId);

        if (!validate(room, socket)) return;

        pendingJoinRequests.set(userId, socket.id); // store requesting socket's ID

        // this may actually only need to send the userid and username who wants to join
        io.to(roomId).emit("join-room-request", {
          room,
          userId,
          username,
        });
      },
    );

    socket.on(
      "accept-join-room-request",
      (data: { roomId: string; userId: string; username: string }) => {
        const { roomId, userId, username } = data;
        const room = gameRooms.get(roomId);
        if (!validate(room, socket)) return;

        const requestingSocketId = pendingJoinRequests.get(userId);
        if (!requestingSocketId) {
          console.error("ID of requesting socket not found");
          return;
        }
        const requestingSocket = io.sockets.sockets.get(requestingSocketId);
        void requestingSocket?.join(roomId);

        room.players.push({
          userId,
          username,
          socketId: socket.id,
          ready: false,
        });
        io.to(roomId).emit("player-joined", { roomId, room, username });
        broadcastRoomUpdate(io);
      },
    );

    socket.on(
      "decline-join-request",
      (data: { roomId: string; userId: string }) => {
        const { roomId, userId } = data;
        const room = gameRooms.get(roomId);
        if (!validate(room, socket)) return;

        const requestingSocketId = pendingJoinRequests.get(userId);
        if (!requestingSocketId) {
          console.error("ID of requesting socket not found");
          return;
        }
        const requestingSocket = io.sockets.sockets.get(requestingSocketId);
        void requestingSocket?.emit("request-declined");
        broadcastRoomUpdate(io);
      },
    );

    socket.on(
      "send-message",
      (data: {
        roomId: string;
        message: string;
        username: string;
        timestamp: number;
      }) => {
        const { roomId, message, username, timestamp } = data;
        const room = gameRooms.get(roomId);

        if (!room) {
          socket.emit("error", { message: "room not found" });
          return;
        }

        io.to(roomId).emit("message-sent", {
          roomId,
          message,
          username,
          timestamp,
        });
      },
    );

    socket.on("leave-room", (data: { roomId: string; userId: string }) => {
      const { roomId, userId } = data;
      const room = gameRooms.get(roomId);

      if (!room) {
        socket.emit("error", { message: "room not found" });
        return;
      }

      const playerIndex = room.players.findIndex((p) => p.userId === userId);
      if (playerIndex === -1) {
        socket.emit("error", { message: "player not found" });
        return;
      }

      room.players.splice(playerIndex, 1);
      void socket.leave(roomId);

      if (room.players.length === 0) gameRooms.delete(roomId);
      else socket.to(roomId).emit("player-disconnected", { roomId, userId });

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
        if (!disconnectedPlayer) continue;
        const userId = disconnectedPlayer.userId;

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
