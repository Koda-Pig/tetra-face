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

export type NextPiece = {
  piece: TetrominoType;
  preview: TetrominoType;
};

export type GameState = {
  currentPiece: Piece;
  previewPiece: TetrominoType;
  dropTimer: number; // accumulated time since last drop
  dropIntervalSeconds: number; // drop every 1 second (adjust for difficulty)
  board: BoardCell[][]; // 2D array representing placed pieces (ROWS x COLS)
  linesCleared: number;
  isGameOver: boolean;
  score: number;
  level: number;
  userId: string;
  holdPiece: TetrominoType | null;
  canHold: boolean;
  pendingGarbage: BoardCell[][] | null; // lines of garbage queued to be added
};

export type UIState = {
  isGameOver: boolean;
  score: number;
  scoreFlash: boolean;
  scoreMultiplier: number;
  prevLinesCleared: number;
  levelFlash: boolean;
  canvasFlash: boolean;
  level: number;
  isPaused: boolean;
  holdPiece: TetrominoType | null;
  previewPiece: TetrominoType | null;
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
  | { type: "player-move"; deltaX: number; timestamp: number }
  | { type: "player-rotate"; newRotation: number; timestamp: number }
  | { type: "player-soft-drop"; newY: number; timestamp: number }
  | {
      type: "player-soft-drop-lock";
      lockedPiece: Piece;
      nextPiece: Piece;
      nextPreviewPiece: TetrominoType;
      linesCleared: number;
      newScore: number;
      newLevel: number;
      timestamp: number;
      garbageToSend: BoardCell[][] | null;
    }
  | {
      type: "player-hard-drop-lock";
      lockedPiece: Piece;
      nextPiece: Piece;
      nextPreviewPiece: TetrominoType;
      linesCleared: number;
      newScore: number;
      newLevel: number;
      timestamp: number;
      garbageToSend: BoardCell[][] | null;
    }
  | {
      type: "player-hold-piece";
      pieceType: TetrominoType;
      nextPreviewPiece: TetrominoType;
      timestamp: number;
      newPieceToHold: TetrominoType | null;
    }
  // Gravity-driven (game loop) events
  | { type: "gravity-drop"; newY: number; timestamp: number }
  | {
      type: "gravity-lock";
      newY: number;
      lockedPiece: Piece;
      nextPiece: Piece;
      nextPreviewPiece: TetrominoType;
      linesCleared: number;
      newScore: number;
      newLevel: number;
      timestamp: number;
      garbageToSend: BoardCell[][] | null;
    }
  // Game state events
  | { type: "game-pause"; timestamp: number }
  | { type: "game-resume"; timestamp: number }
  | { type: "game-over"; playerId: string; timestamp: number }
  // other
  | {
      type: "initial-piece-spawn";
      piece: Piece;
      previewPiece: TetrominoType;
      timestamp: number;
    }
  | { type: "send-garbage"; garbageLines: BoardCell[][]; timestamp: number }
  | { type: "receive-garbage"; garbageLines: BoardCell[][]; timestamp: number }; // this should happen when the garbage is processed (ie: when piece is locked), not immediately when it's generated

export type GamepadState = { previousBtnStates: boolean[] };
