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

export type JoinRoomRequestData = {
  room: string;
  userId: string;
  username: string;
};

export type JoinRoomRequest = null | "pending" | "rejected" | "accepted";
