import { type RefObject } from "react";
import type {
  GameState,
  Piece,
  TetrominoType,
  UIState,
  GameLoop,
  GamepadState,
  TetrisEvent,
  BoardCell,
  NextPiece,
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
  GAMEPAD_KEY_MAP,
  GARBAGE_COLOR,
  GARBAGE_LINES,
  INITIAL_UI_STATE,
} from "~/constants";
import { getTimestamp } from "~/lib/utils";

function canPieceMove({
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

function calcDropSpeed(level: number): number {
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

function spawnPiece(tetrominoType: TetrominoType): Piece {
  const spawnYPos = tetrominoType === "I" ? SPAWN_ROW_I : SPAWN_ROW_OTHER;
  return {
    tetrominoType,
    tetromino: TETRAMINOS[tetrominoType],
    x: Math.floor((COLS - PIECE_SIZE) / 2), // centered
    y: spawnYPos,
    rotation: 0,
  };
}

function tryRotatePiece({
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
function isGameOver(gameState: GameState) {
  // check the 3 conditions for game over

  const piece = gameState.currentPiece;

  // 1. Block Out - check if newly spawned piece overlaps existing blocks
  if (!canPieceMove({ piece, board: gameState.board })) return true;

  // 2. Lock out: check if any blocks exist above the visible area
  for (let row = 0; row < HIDDEN_ROWS - 2; row++) {
    // minus two because we're targeting rows 0 - 17, leaving the last 2 hidden rows as the spawn area
    for (let col = 0; col < COLS; col++) {
      if (gameState.board[row]![col]!.occupied) return true;
    }
  }

  // 3. Top out: check if any blocks exist above the total board
  // This can happen if blocks are pushed above the TOTAL_ROWS
  // in practice, this will only happen in multiplayer mode when
  // garbage blocks are added to a players board
  for (let row = 0; row < gameState.board.length; row++) {
    if (row >= TOTAL_ROWS) {
      for (let col = 0; col < COLS; col++) {
        if (gameState.board[row]![col]!.occupied) return true; // blocks pushed above buffer zone
      }
    }
  }

  return false;
}
function generateGarbageLines({
  numLines,
}: {
  numLines: number;
}): BoardCell[][] {
  const garbageLines = [];
  for (let i = 0; i < numLines; i++) {
    const garbageLine = Array(COLS)
      .fill(null)
      .map(() => ({ occupied: true, color: GARBAGE_COLOR }));
    const holePos = Math.floor(Math.random() * COLS); // random hole per line
    garbageLine[holePos] = { occupied: false, color: "transparent" };
    garbageLines.push(garbageLine);
  }
  return garbageLines;
}
function addGarbageLines({
  board,
  garbage,
}: {
  board: GameState["board"];
  garbage: BoardCell[][];
}) {
  board.splice(0, garbage.length); // remove top lines
  board.push(...garbage);
}
// returns the garbage to be added if any
function lockPieceAndSpawnNext({
  gameState,
  getNextPiece,
  onStateChange,
  onReceiveGarbage,
}: {
  gameState: GameState;
  getNextPiece: () => NextPiece;
  onStateChange?: (gameState: GameState) => void;
  onReceiveGarbage?: (garbageLines: BoardCell[][]) => void;
}): BoardCell[][] | null {
  let garbage = null;
  const linesCleared = clearLines(gameState.board);
  gameState.linesCleared += linesCleared;
  if (linesCleared > 0) {
    const numLines = GARBAGE_LINES[linesCleared as keyof typeof GARBAGE_LINES];
    garbage = generateGarbageLines({ numLines });
  }
  // process incoming garbage
  if (linesCleared === 0 && gameState.pendingGarbage) {
    const garbageToProcess = gameState.pendingGarbage;
    addGarbageLines({
      garbage: garbageToProcess,
      board: gameState.board,
    });
    gameState.pendingGarbage = null;
    onReceiveGarbage?.(garbageToProcess);
  }

  const { piece, preview } = getNextPiece();
  gameState.currentPiece = spawnPiece(piece);
  gameState.previewPiece = preview;
  const oldLevel = gameState.level;
  const newLevel = Math.floor(gameState.linesCleared / LINES_PER_LEVEL);

  if (newLevel > oldLevel) {
    gameState.level = newLevel;
    gameState.dropIntervalSeconds = calcDropSpeed(newLevel);
  }

  if (isGameOver(gameState)) gameState.isGameOver = true;
  else {
    const lineClearScore =
      LINE_CLEAR_SCORES[linesCleared as keyof typeof LINE_CLEAR_SCORES];

    gameState.score += lineClearScore * (gameState.level + 1); // +1 for zero index;
  }

  // reset 'canHold' after a new piece is spawned
  gameState.canHold = true;
  onStateChange?.(gameState);
  return garbage;
}
function placePiece({
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
}
function handleHoldPiece({
  gameState,
  getNextPiece,
}: {
  gameState: GameState;
  getNextPiece: () => NextPiece;
}): TetrominoType | null {
  if (!gameState.canHold) return null;
  const oldHold = gameState.holdPiece;
  const currentPiece = gameState.currentPiece;

  // this'll only  happen the first hold event
  if (!oldHold) {
    const { piece, preview } = getNextPiece();
    gameState.holdPiece = gameState.currentPiece.tetrominoType;
    gameState.currentPiece = spawnPiece(piece);
    gameState.previewPiece = preview;
  } else {
    gameState.holdPiece = gameState.currentPiece.tetrominoType;
    gameState.currentPiece = spawnPiece(oldHold);
  }

  gameState.canHold = false;
  return currentPiece.tetrominoType;
}
function hardDrop({
  piece,
  board,
}: {
  piece: GameState["currentPiece"];
  board: GameState["board"];
}): number {
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
  return dropDistance;
}
function clearLines(board: GameState["board"]): number {
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
const createEmptyBoard = () =>
  Array(TOTAL_ROWS)
    .fill(null)
    .map(() =>
      Array(COLS)
        .fill(null)
        .map(() => ({ occupied: false })),
    );

function handleKeyDown({
  currentKey,
  gameState,
  getNextPiece,
  onStateChange,
  pauseMultiplierRef,
  setUiState,
  playerId,
  onReceiveGarbage,
}: {
  currentKey: string;
  gameState: GameState;
  getNextPiece: () => NextPiece;
  onStateChange?: (gameState: GameState) => void;
  pauseMultiplierRef: React.RefObject<number>;
  setUiState: React.Dispatch<React.SetStateAction<UIState>>;
  playerId: string;
  onReceiveGarbage?: (garbageLines: BoardCell[][]) => void;
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
      const dropDistance = hardDrop({
        piece: gameState.currentPiece,
        board: gameState.board,
      });
      // apply new position
      gameState.currentPiece.y += dropDistance;
      // place piece immediately
      placePiece({ piece: gameState.currentPiece, board: gameState.board });
      const garbageToSend = lockPieceAndSpawnNext({
        gameState,
        getNextPiece,
        onStateChange,
        onReceiveGarbage,
      });
      if (gameState.isGameOver) {
        return { type: "game-over", playerId, timestamp: getTimestamp() };
      }
      const nextPiece = gameState.currentPiece;
      const linesCleared = gameState.linesCleared;
      const newScore = gameState.score;
      const newLevel = gameState.level;
      const nextPreviewPiece = gameState.previewPiece;
      return {
        type: "player-hard-drop-lock",
        lockedPiece,
        nextPiece,
        nextPreviewPiece,
        linesCleared,
        newScore,
        newLevel,
        garbageToSend,
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
          type: "player-soft-drop",
          newY: gameState.currentPiece.y,
          timestamp: getTimestamp(),
        };
      } else {
        const lockedPiece = gameState.currentPiece;
        placePiece({ piece: gameState.currentPiece, board: gameState.board });
        const garbageToSend = lockPieceAndSpawnNext({
          gameState,
          getNextPiece,
          onStateChange,
          onReceiveGarbage,
        });
        if (gameState.isGameOver) {
          return { type: "game-over", playerId, timestamp: getTimestamp() };
        }
        const nextPiece = gameState.currentPiece;
        const linesCleared = gameState.linesCleared;
        const newScore = gameState.score;
        const newLevel = gameState.level;
        const nextPreviewPiece = gameState.previewPiece;
        return {
          type: "player-soft-drop-lock",
          lockedPiece,
          nextPiece,
          nextPreviewPiece,
          linesCleared,
          newScore,
          newLevel,
          garbageToSend,
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
          type: "player-move",
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
          type: "player-move",
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
          type: "player-rotate",
          newRotation: gameState.currentPiece.rotation,
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
          type: "player-rotate",
          newRotation: gameState.currentPiece.rotation,
          timestamp: getTimestamp(),
        };
      } else {
        return null;
      }
    case "KeyC":
      const newHoldPiece = handleHoldPiece({ gameState, getNextPiece });
      if (newHoldPiece) {
        setUiState((prev) => ({ ...prev, holdPiece: newHoldPiece }));
        return {
          type: "player-hold-piece",
          pieceType: gameState.currentPiece.tetrominoType,
          nextPreviewPiece: gameState.previewPiece,
          timestamp: getTimestamp(),
          newPieceToHold: newHoldPiece,
        };
      } else {
        return null;
      }
    default:
      return null;
  }
}

function drawBoard({
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
      ctx.strokeStyle = "#151d15";
      ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
    }
  }
}

function drawTetromino({
  ctx,
  piece,
}: {
  ctx: CanvasRenderingContext2D;
  piece: GameState["currentPiece"];
}) {
  const { tetromino, x, y, rotation } = piece;
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
      if (row[j] !== FILLED_CELL) continue;
      const canvasY = (y + i - HIDDEN_ROWS) * cellHeight; // adjust for hidden rows
      const canvasX = (x + j) * cellWidth;

      const isWithinVisibleArea = y + i >= HIDDEN_ROWS;

      if (!isWithinVisibleArea) continue;
      ctx.fillStyle = color;
      ctx.fillRect(canvasX + 0.5, canvasY + 0.5, cellWidth - 1, cellHeight - 1);
    }
  }
}

function drawGhost({
  ctx,
  piece,
  board,
}: {
  ctx: CanvasRenderingContext2D;
  piece: GameState["currentPiece"];
  board: GameState["board"];
}) {
  const { tetromino, x, y, rotation } = piece;
  const { rotations, color } = tetromino;
  const cellWidth = ctx.canvas.width / COLS;
  const cellHeight = ctx.canvas.height / VISIBLE_ROWS;
  const cells = rotations[rotation];
  const dropDistance = hardDrop({ piece, board });
  const ghostY = y + dropDistance;

  ctx.save();

  for (let i = 0; i < cells!.length; i++) {
    const row = cells![i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      if (row[j] !== FILLED_CELL) continue;
      const canvasY = (ghostY + i - HIDDEN_ROWS) * cellHeight;
      const canvasX = (x + j) * cellWidth;

      const isWithinVisibleArea = ghostY + i >= HIDDEN_ROWS;

      if (!isWithinVisibleArea) continue;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.strokeRect(canvasX, canvasY, cellWidth, cellHeight);
    }
  }
  ctx.restore();
}

function update({
  gameState,
  step,
  getNextPiece,
  onStateChange,
  playerId,
  onReceiveGarbage,
}: {
  gameState: GameState;
  step: number;
  getNextPiece: () => NextPiece;
  onStateChange?: (gameState: GameState) => void;
  playerId: string;
  onReceiveGarbage?: (garbageLines: BoardCell[][]) => void;
}): TetrisEvent | null {
  gameState.dropTimer += step;
  if (gameState.dropTimer < gameState.dropIntervalSeconds) return null;
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
      type: "gravity-drop",
      newY: gameState.currentPiece.y,
      timestamp: getTimestamp(),
    };
  } else {
    const lockedPiece = gameState.currentPiece;
    placePiece({ piece: gameState.currentPiece, board: gameState.board });
    const garbageToSend = lockPieceAndSpawnNext({
      gameState,
      getNextPiece,
      onStateChange,
      onReceiveGarbage,
    });
    // need to check here for gameover, as the above function is the only place
    // gameOver state is changed
    if (gameState.isGameOver) {
      return { type: "game-over", playerId, timestamp: getTimestamp() };
    }
    return {
      type: "gravity-lock",
      newY: gameState.currentPiece.y,
      lockedPiece,
      nextPiece: gameState.currentPiece,
      nextPreviewPiece: gameState.previewPiece,
      linesCleared: gameState.linesCleared,
      newScore: gameState.score,
      newLevel: gameState.level,
      timestamp: getTimestamp(),
      garbageToSend,
    };
  }
}

function render({
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
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBoard({ ctx, board: gameState.board, cellWidth, cellHeight });
  drawGhost({
    ctx,
    piece: gameState.currentPiece,
    board: gameState.board,
  });
  drawTetromino({
    ctx,
    piece: gameState.currentPiece,
  });
}

function restartGame({
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
  getNextPiece: () => NextPiece;
  userId: string;
}) {
  if (!gameStateRef.current) return;

  const { piece, preview } = getNextPiece();
  // 1. Reset game state (reuse existing object to maintain references)
  Object.assign(gameStateRef.current, {
    ...INITIAL_GAME_STATE,
    currentPiece: spawnPiece(piece),
    previewPiece: preview,
    dropIntervalSeconds: calcDropSpeed(0),
    userId,
    board: createEmptyBoard(),
  });

  // 2. Reset pause state
  pauseMultiplierRef.current = 1;

  // 3. Reset UI state completely
  setUiState(INITIAL_UI_STATE);

  // 4. Reset game loop timing
  const gameLoop = gameLoopRef.current;
  gameLoop.deltaTime = 0;
  gameLoop.lastTime = getTimestamp();
  setRestartTrigger((prev) => prev + 1);
}

function pollGamepadInput({
  gamepadStateRef,
}: {
  gamepadStateRef: RefObject<GamepadState>;
}): string | null {
  const gamepads = navigator.getGamepads();
  const activeGamepad = gamepads.find((gamepad) => gamepad);

  if (!activeGamepad || !gamepadStateRef.current) return null;
  const gamepadState = gamepadStateRef.current;

  for (const [index, button] of activeGamepad.buttons.entries()) {
    const keyCode = GAMEPAD_KEY_MAP[index as keyof typeof GAMEPAD_KEY_MAP];
    if (!keyCode) continue; // skip if no mapping for this button

    const isPressed = button.pressed;
    const wasPressed = gamepadState.previousBtnStates[index];

    // trigger on press (NOT hold)
    if (isPressed && !wasPressed) {
      gamepadState.previousBtnStates[index] = isPressed;
      return keyCode;
    }

    gamepadState.previousBtnStates[index] = isPressed;
  }

  return null;
}

export {
  createEmptyBoard,
  calcDropSpeed,
  spawnPiece,
  isGameOver,
  addGarbageLines,
  placePiece,
  clearLines,
  handleKeyDown,
  update,
  render,
  restartGame,
  pollGamepadInput,
};
