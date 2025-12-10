import type { GameRoom } from "~/types/multiplayer";
import type { TetrisEvent } from "~/types/tetris";

export interface GameActionData {
  roomId: string;
  action: TetrisEvent;
}

export interface ServerToClientEvents {
  "rooms-updated": (rooms: GameRoom[]) => void;
  "rooms-list": (rooms: GameRoom[]) => void;
  "room-created": (data: { room: GameRoom }) => void;
  "player-joined": (data: {
    roomId: string;
    room: GameRoom;
    username: string;
  }) => void;
  "join-room-request": (data: {
    room: GameRoom;
    userId: string;
    username: string;
  }) => void;
  "request-declined": () => void;
  "player-ready-changed": (data: { roomId: string; room: GameRoom }) => void;
  "message-sent": (data: {
    roomId: string;
    message: string;
    username: string;
    timestamp: number;
  }) => void;
  "player-disconnected": (data: { roomId: string; userId: string }) => void;
  "opponent-action": (data: GameActionData) => void;
  "game-over-event": (data: GameActionData) => void;
  "game-pause-event": (data: GameActionData) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  "get-rooms": () => void;
  "create-room": (userId: string, username: string) => void;
  "join-room-request": (data: {
    roomId: string;
    userId: string;
    username: string;
  }) => void;
  "accept-join-room-request": (data: {
    roomId: string;
    userId: string;
    username: string;
  }) => void;
  "decline-join-request": (data: { roomId: string; userId: string }) => void;
  "send-message": (data: {
    roomId: string;
    message: string;
    username: string;
    timestamp: number;
  }) => void;
  "leave-room": (data: { roomId: string; userId: string }) => void;
  "toggle-ready": (data: { roomId: string; userId: string }) => void;
  "game-action": (data: GameActionData) => void;
  "game-over-event": (data: GameActionData) => void;
  "game-pause-event": (data: GameActionData) => void;
}
