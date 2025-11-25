import type {
  GameState,
  Piece,
  TetrominoType,
  UIState,
  Tetromino,
  GameLoop,
  TetrisEvent,
} from "~/types";
import {
  TETRAMINOS,
  WALL_KICK_DATA_I,
  WALL_KICK_DATA_JLSTZ,
  COLS,
  TOTAL_ROWS,
  HIDDEN_ROWS,
  SPAWN_ROW_I,
  SPAWN_ROW_OTHER,
  PIECE_SIZE,
  FILLED_CELL,
  LINES_PER_LEVEL,
  GAME_INPUT_KEYS,
  LINE_CLEAR_SCORES,
  VISIBLE_ROWS,
  INITIAL_GAME_STATE,
} from "~/constants";

export function canPieceMove({
  piece,
  board,
  deltaX = 0,
  deltaY = 0,
  newRotation,
}: {
  piece: GameState["currentPiece"];
  board: GameState["board"];
  deltaX?: number;
  deltaY?: number;
  newRotation?: number;
}): boolean {
  const newX = piece.x + deltaX;
  const newY = piece.y + deltaY;
  const rotation = newRotation ?? piece.rotation;
  const cells = piece.tetromino.rotations[rotation];

  for (let row = 0; row < PIECE_SIZE; row++) {
    for (let col = 0; col < PIECE_SIZE; col++) {
      if (cells![row]![col] !== FILLED_CELL) continue;

      const boardX = newX + col;
      const boardY = newY + row;

      // Boundary checks
      if (boardX < 0 || boardX >= COLS || boardY >= TOTAL_ROWS) return false;

      // Collision checks
      if (boardY >= 0 && board[boardY]![boardX]!.occupied) return false;
    }
  }

  return true;
}

export function calcDropSpeed(level: number): number {
  let frames;
  if (level === 0) frames = 48;
  else if (level === 1) frames = 43;
  else if (level === 2) frames = 38;
  else if (level === 3) frames = 33;
  else if (level === 4) frames = 28;
  else if (level === 5) frames = 23;
  else if (level === 6) frames = 18;
  else if (level === 7) frames = 13;
  else if (level === 8) frames = 8;
  else if (level === 9) frames = 6;
  else if (level >= 10 && level <= 12) frames = 5;
  else if (level >= 13 && level <= 15) frames = 4;
  else if (level >= 16 && level <= 18) frames = 3;
  else if (level >= 19 && level <= 28) frames = 2;
  else frames = 1; // level 29+ (killscreen)
  return frames / 60; // convert to seconds
}

export function spawnPiece(getNext: () => TetrominoType): Piece {
  const tetrominoType = getNext();
  const spawnYPos = tetrominoType === "I" ? SPAWN_ROW_I : SPAWN_ROW_OTHER;

  return {
    tetrominoType,
    tetromino: TETRAMINOS[tetrominoType],
    x: Math.floor((COLS - PIECE_SIZE) / 2), // centered
    y: spawnYPos,
    rotation: 0,
  };
}

export function tryRotatePiece({
  piece,
  board,
  direction,
}: {
  piece: GameState["currentPiece"];
  board: GameState["board"];
  direction: 1 | -1; // 1 for clockwise, -1 for counterclockwise
}) {
  const currentRotation = piece.rotation;
  const newRotation = (piece.rotation + direction + 4) % 4; // +4 to ensure a positive value
  const pieceType = piece.tetrominoType;

  if (pieceType === "O") return true; // no effect on O / square pieces

  const wallKickData =
    pieceType === "I" ? WALL_KICK_DATA_I : WALL_KICK_DATA_JLSTZ;

  const kicks = wallKickData[currentRotation]?.[newRotation] ?? [];

  for (const [offsetX, offsetY] of kicks) {
    if (
      canPieceMove({
        piece,
        board,
        deltaX: offsetX,
        deltaY: offsetY,
        newRotation,
      })
    ) {
      // apply rotation
      piece.rotation = newRotation;
      piece.x += offsetX;
      piece.y += offsetY;

      return true;
    }
  }

  return false;
}
export function isGameOver(gameState: GameState) {
  // check the 3 conditions for game over

  const piece = gameState.currentPiece;

  // 1. Block Out - check if newly spawned piece overlaps existing blocks
  if (!canPieceMove({ piece, board: gameState.board })) {
    return true;
  }

  // 2. Lock out: check if any blocks exist above the visible area
  for (let row = 0; row < HIDDEN_ROWS - 2; row++) {
    // minus two because we're targeting rows 0 - 17, leaving the last 2 hidden rows as the spawn area
    for (let col = 0; col < COLS; col++) {
      if (gameState.board[row]![col]!.occupied) {
        return true;
      }
    }
  }

  // 3. Top out: check if any blocks exist above the total board
  // This can happen if blocks are pushed above the TOTAL_ROWS
  // in practice, this will only happen in multiplayer mode when
  // garbage blocks are added to a players board
  for (let row = 0; row < gameState.board.length; row++) {
    if (row >= TOTAL_ROWS) {
      for (let col = 0; col < COLS; col++) {
        if (gameState.board[row]![col]!.occupied) {
          return true; // blocks pushed above buffer zone
        }
      }
    }
  }

  return false;
}
export function lockPieceAndSpawnNext({
  gameState,
  getNextPiece,
  onStateChange,
}: {
  gameState: GameState;
  getNextPiece: () => TetrominoType;
  onStateChange?: (gameState: GameState) => void;
}) {
  const linesCleared = clearLines(gameState.board);
  gameState.linesCleared += linesCleared;
  gameState.currentPiece = spawnPiece(getNextPiece);
  const oldLevel = gameState.level;
  const newLevel = Math.floor(gameState.linesCleared / LINES_PER_LEVEL);

  if (newLevel > oldLevel) {
    gameState.level = newLevel;
    gameState.dropIntervalSeconds = calcDropSpeed(newLevel);
  }

  if (isGameOver(gameState)) {
    gameState.isGameOver = true;
  } else {
    const lineClearScore =
      LINE_CLEAR_SCORES[linesCleared as keyof typeof LINE_CLEAR_SCORES];

    gameState.score += lineClearScore * (gameState.level + 1); // +1 for zero index;
  }

  onStateChange?.(gameState);
}
export function getTimestamp() {
  if (!window) return new Date().getTime();
  return window?.performance?.now();
}
export function placePiece({
  piece,
  board,
}: {
  piece: GameState["currentPiece"];
  board: GameState["board"];
}) {
  for (let row = 0; row < PIECE_SIZE; row++) {
    for (let col = 0; col < PIECE_SIZE; col++) {
      const cells = piece.tetromino.rotations[piece.rotation];

      if (cells![row]![col] !== FILLED_CELL) continue;

      const boardY = piece.y + row;
      const boardX = piece.x + col;

      if (boardY >= 0 && boardY < TOTAL_ROWS && boardX >= 0 && boardX < COLS) {
        board[boardY]![boardX] = {
          occupied: true,
          color: piece.tetromino.color,
        };
      }
    }
  }

  return true;
}
export function hardDrop({
  piece,
  board,
}: {
  piece: GameState["currentPiece"];
  board: GameState["board"];
}) {
  let dropDistance = 0;

  // keep moving down until you can't
  while (
    canPieceMove({
      piece,
      board,
      deltaY: dropDistance + 1,
    })
  ) {
    dropDistance++;
  }

  // apply new position
  piece.y += dropDistance;
}
export function clearLines(board: GameState["board"]): number {
  let linesCleared = 0;

  // check from bottom up
  for (let row = TOTAL_ROWS - 1; row >= 0; row--) {
    // check if row is full
    const isRowFull = board[row]!.every((cell) => cell.occupied);
    if (isRowFull) {
      board.splice(row, 1); // remove row
      board.unshift(
        Array(COLS)
          .fill(null)
          .map(() => ({ occupied: false })),
      ); // add empty row at top
      linesCleared++;
      row++; // check same row index again since a row was removed
    }
  }
  return linesCleared;
}

// make sure this is generated to avoid shared object references
export const createEmptyBoard = () =>
  Array(TOTAL_ROWS)
    .fill(null)
    .map(() =>
      Array(COLS)
        .fill(null)
        .map(() => ({ occupied: false })),
    );

export function handleKeyDown({
  currentKey,
  gameState,
  getNextPiece,
  onStateChange,
  pauseMultiplierRef,
  setUiState,
}: {
  currentKey: string;
  gameState: GameState;
  getNextPiece: () => TetrominoType;
  onStateChange?: (gameState: GameState) => void;
  pauseMultiplierRef: React.RefObject<number>;
  setUiState: React.Dispatch<React.SetStateAction<UIState>>;
}): TetrisEvent | null {
  if (!GAME_INPUT_KEYS.includes(currentKey)) return null;

  const isPaused = pauseMultiplierRef.current === 0;

  if (currentKey === "Escape") {
    pauseMultiplierRef.current = isPaused ? 1 : 0;
    setUiState((prev) => ({ ...prev, isPaused: !isPaused }));
    return {
      type: isPaused ? "game-resume" : "game-pause",
      timestamp: getTimestamp(),
    };
  }

  // no key pressing when paused
  if (isPaused) return null;

  switch (currentKey) {
    case "ArrowUp":
      const lockedPiece = gameState.currentPiece;
      hardDrop({
        piece: gameState.currentPiece,
        board: gameState.board,
      });
      // place piece immediately
      placePiece({ piece: gameState.currentPiece, board: gameState.board });
      lockPieceAndSpawnNext({
        gameState,
        getNextPiece,
        onStateChange,
      });
      const nextPiece = gameState.currentPiece;
      const linesCleared = gameState.linesCleared;
      const newScore = gameState.score;
      const newLevel = gameState.level;
      return {
        type: "piece-hard-drop-lock",
        lockedPiece,
        nextPiece,
        linesCleared,
        newScore,
        newLevel,
        timestamp: getTimestamp(),
      };
    case "ArrowDown":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaY: 1,
        })
      ) {
        gameState.currentPiece.y++;
        return {
          type: "piece-soft-drop",
          newY: gameState.currentPiece.y,
          timestamp: getTimestamp(),
        };
      } else {
        const lockedPiece = gameState.currentPiece;
        placePiece({ piece: gameState.currentPiece, board: gameState.board });
        lockPieceAndSpawnNext({
          gameState,
          getNextPiece,
          onStateChange,
        });
        const nextPiece = gameState.currentPiece;
        const linesCleared = gameState.linesCleared;
        const newScore = gameState.score;
        const newLevel = gameState.level;
        return {
          type: "piece-soft-drop-lock",
          lockedPiece,
          nextPiece,
          linesCleared,
          newScore,
          newLevel,
          timestamp: getTimestamp(),
        };
      }
    case "ArrowLeft":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaX: -1,
        })
      ) {
        gameState.currentPiece.x--;
        return {
          type: "piece-player-move",
          deltaX: -1,
          timestamp: getTimestamp(),
        };
      }
      return null;
    case "ArrowRight":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaX: 1,
        })
      ) {
        gameState.currentPiece.x++;
        return {
          type: "piece-player-move",
          deltaX: 1,
          timestamp: getTimestamp(),
        };
      }
      return null;
    case "Space":
      const didRotateClockwise = tryRotatePiece({
        piece: gameState.currentPiece,
        board: gameState.board,
        direction: 1, // clockwise rotation
      });
      if (didRotateClockwise) {
        return {
          type: "piece-player-rotate",
          direction: 1,
          timestamp: getTimestamp(),
        };
      } else {
        return null;
      }
    case "KeyZ":
      const didRotateAntiClockwise = tryRotatePiece({
        piece: gameState.currentPiece,
        board: gameState.board,
        direction: -1, // counter-clockwise rotation
      });
      if (didRotateAntiClockwise) {
        return {
          type: "piece-player-rotate",
          direction: -1,
          timestamp: getTimestamp(),
        };
      } else {
        return null;
      }
    default:
      return null;
  }
}

export function drawBoard({
  ctx,
  board,
  cellWidth,
  cellHeight,
}: {
  ctx: CanvasRenderingContext2D;
  board: GameState["board"];
  cellWidth: number;
  cellHeight: number;
}) {
  for (let row = 0; row < VISIBLE_ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const actualRow = row + HIDDEN_ROWS;
      const cell = board[actualRow]![col]!;
      if (cell.occupied) {
        ctx.fillStyle = cell.color ?? "transparent";
        ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
      }

      // draw grid
      ctx.strokeStyle = "#292933";
      ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
    }
  }
}

export function drawTetromino({
  ctx,
  tetromino,
  rotation,
  x,
  y,
}: {
  ctx: CanvasRenderingContext2D;
  tetromino: Tetromino;
  x: number;
  y: number;
  rotation: number;
}) {
  const { rotations, color } = tetromino;
  const cellWidth = ctx.canvas.width / COLS;
  const cellHeight = ctx.canvas.height / VISIBLE_ROWS;
  const cells = rotations[rotation];

  for (let i = 0; i < cells!.length; i++) {
    const row = cells![i];

    if (!row) {
      console.error("Row is undefined, something went wrong");
      continue;
    }

    for (let j = 0; j < row.length; j++) {
      if (row[j] === FILLED_CELL) {
        const canvasY = (y + i - HIDDEN_ROWS) * cellHeight; // adjust for hidden rows
        const canvasX = (x + j) * cellWidth;

        const isWithinVisibleArea = y + i >= HIDDEN_ROWS;

        if (isWithinVisibleArea) {
          ctx.fillStyle = color;
          ctx.fillRect(canvasX, canvasY, cellWidth, cellHeight);
        }
      }
    }
  }
}

export function update({
  gameState,
  step,
  getNextPiece,
  onStateChange,
}: {
  gameState: GameState;
  step: number;
  getNextPiece: () => TetrominoType;
  onStateChange?: (gameState: GameState) => void;
}): TetrisEvent | null {
  gameState.dropTimer += step;

  if (gameState.dropTimer < gameState.dropIntervalSeconds) {
    return null;
  }

  gameState.dropTimer = 0; // reset drop timer

  if (
    canPieceMove({
      piece: gameState.currentPiece,
      board: gameState.board,
      deltaY: 1,
    })
  ) {
    gameState.currentPiece.y++;
    return {
      type: "piece-gravity-drop",
      newY: gameState.currentPiece.y,
      timestamp: getTimestamp(),
    };
  } else {
    const lockedPiece = gameState.currentPiece;

    placePiece({ piece: gameState.currentPiece, board: gameState.board });
    lockPieceAndSpawnNext({
      gameState,
      getNextPiece,
      onStateChange,
    });
    const nextPiece = gameState.currentPiece;
    const linesCleared = gameState.linesCleared;
    const newScore = gameState.score;
    const newLevel = gameState.level;
    return {
      type: "piece-gravity-lock",
      newY: gameState.currentPiece.y,
      lockedPiece,
      nextPiece,
      linesCleared,
      newScore,
      newLevel,
      timestamp: getTimestamp(),
    };
  }
}

export function render({
  ctx,
  canvas,
  cellWidth,
  cellHeight,
  gameState,
}: {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  cellWidth: number;
  cellHeight: number;
  gameState: GameState;
}) {
  ctx.fillStyle = "#16161d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTetromino({
    ctx,
    rotation: gameState.currentPiece.rotation,
    tetromino: gameState.currentPiece.tetromino,
    x: gameState.currentPiece.x,
    y: gameState.currentPiece.y,
  });

  drawBoard({ ctx, board: gameState.board, cellWidth, cellHeight });
}

export function restartGame({
  gameStateRef,
  pauseMultiplierRef,
  gameLoopRef,
  setUiState,
  setRestartTrigger,
  getNextPiece,
  userId,
}: {
  gameStateRef: React.RefObject<GameState | null>;
  pauseMultiplierRef: React.RefObject<number>;
  gameLoopRef: React.RefObject<GameLoop>;
  setUiState: React.Dispatch<React.SetStateAction<UIState>>;
  setRestartTrigger: React.Dispatch<React.SetStateAction<number>>;
  getNextPiece: () => TetrominoType;
  userId: string;
}) {
  if (!gameStateRef.current) return;

  // 1. Reset game state (reuse existing object to maintain references)
  Object.assign(gameStateRef.current, {
    ...INITIAL_GAME_STATE,
    currentPiece: spawnPiece(getNextPiece),
    dropIntervalSeconds: calcDropSpeed(0),
    userId,
    board: createEmptyBoard(),
  });

  // 2. Reset pause state
  pauseMultiplierRef.current = 1;

  // 3. Reset UI state completely
  setUiState({
    isGameOver: false,
    score: 0,
    scoreFlash: false,
    levelFlash: false,
    level: 0,
    isPaused: false,
  });

  // 4. Reset game loop timing
  const gameLoop = gameLoopRef.current;
  gameLoop.deltaTime = 0;
  gameLoop.lastTime = getTimestamp();
  setRestartTrigger((prev) => prev + 1);
}
