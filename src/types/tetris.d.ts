type TetrominoCell = 0 | 1;

export type TetrominoType = "I" | "J" | "L" | "O" | "S" | "Z" | "T";

type BoardCell = { occupied: boolean; color?: string };

type TetrominoGrid = [
  [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
  [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
  [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
  [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
];

export type Tetromino = {
  rotations: [TetrominoGrid, TetrominoGrid, TetrominoGrid, TetrominoGrid];
  color: string;
};

export type Piece = {
  tetromino: Tetromino;
  tetrominoType: TetrominoType;
  x: number; // grid position on the 10 x 20 board
  y: number; // grid position on the 10 x 20 board
  rotation: number; // 0, 1, 2, 3
};

export type GameState = {
  currentPiece: Piece;
  dropTimer: number; // accumulated time since last drop
  dropIntervalSeconds: number; // drop every 1 second (adjust for difficulty)
  board: BoardCell[][]; // 2D array representing placed pieces (ROWS x COLS)
  linesCleared: number;
  isGameOver: boolean;
  score: number;
  level: number;
  userId: string;
};

export type UIState = {
  isGameOver: boolean;
  score: number;
  scoreFlash: boolean;
  levelFlash: boolean;
  canvasFlash: boolean;
  level: number;
  isPaused: boolean;
};

export type GameLoop = {
  now: number;
  animationId: number | null;
  lastTime: number;
  deltaTime: number;
  step: number;
};

export type TetrisEvent =
  // Player-driven events
  | { type: "piece-player-move"; deltaX: number; timestamp: number }
  | { type: "piece-player-rotate"; newRotation: number; timestamp: number }
  | { type: "piece-soft-drop"; newY: number; timestamp: number }
  | {
      type: "piece-soft-drop-lock";
      lockedPiece: Piece;
      nextPiece: Piece;
      linesCleared: number;
      newScore: number;
      newLevel: number;
      timestamp: number;
    }
  | {
      type: "piece-hard-drop-lock";
      lockedPiece: Piece;
      nextPiece: Piece;
      linesCleared: number;
      newScore: number;
      newLevel: number;
      timestamp: number;
    }
  // Gravity-driven (game loop) events
  | { type: "piece-gravity-drop"; newY: number; timestamp: number }
  | {
      type: "piece-gravity-lock";
      newY: number;
      lockedPiece: Piece;
      nextPiece: Piece;
      linesCleared: number;
      newScore: number;
      newLevel: number;
      timestamp: number;
    }
  // Game state events
  | { type: "game-pause"; timestamp: number }
  | { type: "game-resume"; timestamp: number }
  | { type: "game-over"; playerId: string; timestamp: number }
  // other
  | { type: "initial-piece-spawn"; piece: Piece; timestamp: number };
