type TetrominoCell = 0 | 1;

export type TetrominoType = "I" | "J" | "L" | "O" | "S" | "Z" | "T";

export type Tetromino = {
  cells: [
    [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
    [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
    [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
    [TetrominoCell, TetrominoCell, TetrominoCell, TetrominoCell],
  ];
  color: string;
};

export type GameState = {
  currentPiece: {
    tetromino: Tetromino;
    x: number; // grid position on the 10 x 20 board
    y: number; // grid position on the 10 x 20 board
    rotation: number; // 0, 90, 180, 270
  };
  dropTimer: number; // accumulated time since last drop
  dropIntervalSeconds: number; // drop every 1 second (adjust for difficulty)
};
