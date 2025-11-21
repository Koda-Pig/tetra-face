"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useBag } from "~/hooks/useBag";
import GameStat from "./gameStat";
import type {
  GameState,
  GameLoop,
  Tetromino,
  Piece,
  UIState,
  TetrominoType,
} from "~/types";
import {
  TETRAMINOS,
  WALL_KICK_DATA_I,
  WALL_KICK_DATA_JLSTZ,
  COLS,
  TOTAL_ROWS,
  VISIBLE_ROWS,
  HIDDEN_ROWS,
  SPAWN_ROW_I,
  SPAWN_ROW_OTHER,
  PIECE_SIZE,
  FILLED_CELL,
  GAME_INPUT_KEYS,
  FLASH_TRANSITION_DURATION_MS,
  INITIAL_GAME_STATE,
  LINES_PER_LEVEL,
  LINE_CLEAR_SCORES,
} from "~/constants";

/* SCORING SYSTEM
 * Basic Line Clears:
 *
 * Single: 100 × level
 * Double: 300 × level
 * Triple: 500 × level
 * Tetris (4 lines): 800 × level
 *
 * T-Spins:
 *
 * T-Spin Single: 800 × level
 * T-Spin Double: 1200 × level
 * T-Spin Triple: 1600 × level
 * Mini T-Spin variations exist with lower scores
 */

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
      ctx.strokeStyle = "gray";
      ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
    }
  }
}

function spawnPiece(getNext: () => TetrominoType): Piece {
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

function drawTetromino({
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

function update({
  gameState,
  step,
  getNextPiece,
  onStateChange,
}: {
  gameState: GameState;
  step: number;
  getNextPiece: () => TetrominoType;
  onStateChange?: (gameState: GameState) => void;
}) {
  gameState.dropTimer += step;

  if (gameState.dropTimer < gameState.dropIntervalSeconds) {
    return;
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
  } else {
    placePiece({ piece: gameState.currentPiece, board: gameState.board });
    lockPieceAndSpawnNext({
      gameState,
      getNextPiece,
      onStateChange,
    });
  }
}

function lockPieceAndSpawnNext({
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
  ctx.fillStyle = "black";
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

function getTimestamp() {
  if (!window) return new Date().getTime();
  return window?.performance?.now();
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

  return true;
}

function hardDrop({
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

function restartGame() {
  // quick and dirty. needs improvement
  window.location.reload();
}

function handleKeyDown({
  event,
  gameState,
  getNextPiece,
  onStateChange,
  pauseMultiplierRef,
  setUiState,
}: {
  event: KeyboardEvent;
  gameState: GameState;
  getNextPiece: () => TetrominoType;
  onStateChange?: (gameState: GameState) => void;
  pauseMultiplierRef: React.RefObject<number>;
  setUiState: React.Dispatch<React.SetStateAction<UIState>>;
}) {
  if (!GAME_INPUT_KEYS.includes(event.code)) return;

  event.preventDefault();

  const isPaused = pauseMultiplierRef.current === 0;

  if (event.code === "Escape") {
    pauseMultiplierRef.current = isPaused ? 1 : 0;
    setUiState((prev) => ({ ...prev, isPaused: !isPaused }));
    return;
  }

  // no key pressing when paused
  if (isPaused) return;

  switch (event.code) {
    case "ArrowUp":
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
      break;
    case "ArrowDown":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaY: 1,
        })
      ) {
        gameState.currentPiece.y++;
      } else {
        placePiece({ piece: gameState.currentPiece, board: gameState.board });
        lockPieceAndSpawnNext({
          gameState,
          getNextPiece,
          onStateChange,
        });
      }
      break;
    case "ArrowLeft":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaX: -1,
        })
      ) {
        gameState.currentPiece.x--;
      }
      break;
    case "ArrowRight":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaX: 1,
        })
      ) {
        gameState.currentPiece.x++;
      }
      break;
    case "Space":
      tryRotatePiece({
        piece: gameState.currentPiece,
        board: gameState.board,
        direction: 1, // clockwise rotation
      });
      break;
    case "KeyZ":
      tryRotatePiece({
        piece: gameState.currentPiece,
        board: gameState.board,
        direction: -1, // counter-clockwise rotation
      });
      break;
    default:
      break;
  }
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop>({
    now: 0,
    animationId: null,
    lastTime: 0,
    deltaTime: 0,
    step: 1 / 60,
  });
  const pauseMultiplierRef = useRef(1); //  0 = paused
  // we're not using useState for this because we don't want to trigger re-renders while the game is playing
  const gameStateRef = useRef<GameState | null>(null);
  const [uiState, setUiState] = useState<UIState>({
    isGameOver: false,
    score: 0,
    scoreFlash: false,
    levelFlash: false,
    level: 0,
    isPaused: false,
  });
  const syncUIState = useCallback((gameState: GameState) => {
    setUiState((prev) => ({
      ...prev,
      isGameOver: gameState.isGameOver,
      score: gameState.score,
      level: gameState.level,
      scoreFlash: prev.score !== gameState.score, // flash when score changes
      levelFlash: prev.level !== gameState.level,
    }));

    // remove flash after animation
    if (gameState.score > 0) {
      setTimeout(
        () => setUiState((prev) => ({ ...prev, scoreFlash: false })),
        FLASH_TRANSITION_DURATION_MS,
      );
    }
  }, []);
  const getNextPiece = useBag();

  // initialize the game state
  useEffect(() => {
    // nullish coalescing assignment https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment
    gameStateRef.current ??= {
      ...INITIAL_GAME_STATE,
      currentPiece: spawnPiece(getNextPiece),
      dropIntervalSeconds: calcDropSpeed(0),
    };
    gameLoopRef.current.lastTime = getTimestamp();
  }, [getNextPiece]);

  // game loop
  useEffect(() => {
    if (!canvasRef.current || !gameStateRef.current) return;

    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas.getContext("2d")) {
      console.error("Failed to get canvas context");
      return;
    }
    const ctx = canvas.getContext("2d")!;
    const cellWidth = canvas.width / COLS;
    const cellHeight = canvas.height / VISIBLE_ROWS;

    function animate() {
      const gameLoop = gameLoopRef.current;
      const pauseMultiplier = pauseMultiplierRef.current;

      if (!gameLoop || pauseMultiplier === undefined) {
        const problemVar = !gameLoop ? gameLoop : pauseMultiplier;
        console.error(`${problemVar} is not initialized`);
        return;
      }

      if (gameState.isGameOver) {
        // one more render for the bois
        render({
          ctx,
          canvas,
          cellWidth,
          cellHeight,
          gameState,
        });
        return;
      }

      gameLoop.now = getTimestamp();
      gameLoop.deltaTime =
        gameLoop.deltaTime +
        Math.min(1, (gameLoop.now - gameLoop.lastTime) / 1000);
      while (gameLoop.deltaTime > gameLoop.step) {
        gameLoop.deltaTime = gameLoop.deltaTime - gameLoop.step;
        // logic update
        update({
          gameState,
          step: gameLoop.step * pauseMultiplier,
          getNextPiece,
          onStateChange: syncUIState,
        });
      }
      // draw the game
      render({
        ctx,
        canvas,
        cellWidth,
        cellHeight,
        gameState,
      });
      gameLoop.lastTime = gameLoop.now;
      gameLoop.animationId = requestAnimationFrame(animate);
    }

    const gameLoop = gameLoopRef.current;
    gameLoop.animationId = requestAnimationFrame(animate);

    return () => {
      if (gameLoop.animationId) {
        cancelAnimationFrame(gameLoop.animationId);
        gameLoop.animationId = null;
      }
    };
  }, [canvasRef, getNextPiece, syncUIState]);

  // event listeners
  useEffect(() => {
    if (!gameStateRef.current) return;
    // use a wrapper so we can remove the event listener
    function handleKeyDownWrapper(event: KeyboardEvent) {
      handleKeyDown({
        event,
        gameState: gameStateRef.current!,
        getNextPiece,
        onStateChange: syncUIState,
        pauseMultiplierRef,
        setUiState,
      });
    }

    window.addEventListener("keydown", handleKeyDownWrapper);
    return () => window.removeEventListener("keydown", handleKeyDownWrapper);
  }, [getNextPiece, syncUIState]);

  return (
    <div className="relative h-[600px] w-[300px]">
      <div className={cn("relative")}>
        <canvas
          ref={canvasRef}
          width={300}
          height={600}
          className={cn(
            (uiState.isGameOver || uiState.isPaused) && "opacity-30",
          )}
        ></canvas>
        <GameStat
          label="score"
          value={uiState.score}
          flashTrigger={uiState.scoreFlash}
          alignment="right"
          transitionDuration={FLASH_TRANSITION_DURATION_MS}
        />
        <GameStat
          label="level"
          value={uiState.level}
          flashTrigger={uiState.levelFlash}
          alignment="left"
          transitionDuration={FLASH_TRANSITION_DURATION_MS}
        />
      </div>

      <div
        className={cn(
          "absolute inset-0 grid place-items-center",
          uiState.isGameOver || uiState.isPaused
            ? "opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        <div className="text-center">
          <p className="text-shadow mb-8 text-5xl leading-14 text-shadow-[0_0_4px_black,0_0_8px_black]">
            {uiState.isPaused ? (
              <span>PAUSED</span>
            ) : (
              <span>
                GAME
                <br />
                OVER
                <br />
                BITCH
              </span>
            )}
          </p>
          {uiState.isGameOver && (
            <Button onClick={restartGame} size="lg" className="text-lg">
              Restart
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
