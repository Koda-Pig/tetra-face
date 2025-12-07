export type GameRoom = {
  id: string;
  players: Player[];
  gameState: {
    isActive: boolean;
    startedAt?: Date;
    winnerId?: string;
  };
  createdAt: Date;
};

export type Player = {
  userId: string;
  username: string;
  socketId: string;
  ready: boolean;
};

export type Winner = "opponent" | "you" | null;

export type Message = {
  timestamp: number;
  content: string;
  username: string;
};

export type SocketEvent =
  | "rooms-updated"
  | "connection"
  | "get-rooms"
  | "rooms-list"
  | "create-room"
  | "room-created"
  | "join-room-request"
  | "accept-join-room-request"
  | "player-joined"
  | "decline-join-request"
  | "request-declined"
  | "send-message"
  | "message-sent"
  | "leave-room"
  | "toggle-ready"
  | "player-ready-changed"
  | "game-action"
  | "game-over-event"
  | "game-pause-event"
  | "disconnect"
  | "player-disconnected";
