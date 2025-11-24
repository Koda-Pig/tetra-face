export type GameRoom = {
  id: string;
  players: Array<{
    userId: string;
    socketId: string;
    ready: boolean;
  }>;
  gameState: {
    isActive: boolean;
    startedAt?: Date;
    winnerId?: string;
  };
  createdAt: Date;
};
