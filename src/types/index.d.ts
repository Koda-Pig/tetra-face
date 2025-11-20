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
};

export type GameLoop = {
  now: number;
  animationId: number | null;
  lastTime: number;
  deltaTime: number;
  step: number;
};
