"use client";

import { useEffect, useRef } from "react";
import { useBag } from "~/hooks/useBag";
import type {
  GameState,
  GameLoop,
  Tetromino,
  Piece,
  TetrominoType,
} from "~/types";
import {
  TETRAMINOS,
  WALL_KICK_DATA_I,
  WALL_KICK_DATA_JLSTZ,
} from "~/constants";

const COLS = 10;
const ROWS = 20;
const PIECE_SIZE = 4;
const FILLED_CELL = 1;
const GAME_INPUT_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyZ",
];

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
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = board[row]![col]!;
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
  return {
    tetrominoType,
    tetromino: TETRAMINOS[tetrominoType],
    x: Math.floor((COLS - PIECE_SIZE) / 2), // centered
    y: 0,
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
      if (boardX < 0 || boardX >= COLS || boardY >= ROWS) return false;

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
  const cellHeight = ctx.canvas.height / ROWS;
  const cells = rotations[rotation];
  for (let i = 0; i < cells!.length; i++) {
    const row = cells![i];

    if (!row) {
      console.error("Row is undefined, something went wrong");
      continue;
    }

    for (let j = 0; j < row.length; j++) {
      if (row[j] === FILLED_CELL) {
        ctx.fillStyle = color;
        ctx.fillRect(
          x + j * cellWidth,
          y + i * cellHeight,
          cellWidth,
          cellHeight,
        );
      }
    }
  }
}

function update({
  gameState,
  step,
  getNextPiece,
}: {
  gameState: GameState;
  step: number;
  getNextPiece: () => TetrominoType;
}) {
  gameState.dropTimer += step;

  if (gameState.dropTimer >= gameState.dropIntervalSeconds) {
    gameState.dropTimer = 0;

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
      const linesCleared = clearLines(gameState.board);
      gameState.linesCleared += linesCleared;
      gameState.currentPiece = spawnPiece(getNextPiece);
    }
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
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTetromino({
    ctx,
    rotation: gameState.currentPiece.rotation,
    tetromino: gameState.currentPiece.tetromino,
    x: gameState.currentPiece.x * cellWidth,
    y: gameState.currentPiece.y * cellHeight,
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

      if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
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
  for (let row = ROWS - 1; row >= 0; row--) {
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

function handleKeyDown({
  event,
  gameState,
  getNextPiece,
}: {
  event: KeyboardEvent;
  gameState: GameState;
  getNextPiece: () => TetrominoType;
}) {
  if (!GAME_INPUT_KEYS.includes(event.code)) return;

  event.preventDefault();

  switch (event.code) {
    case "ArrowUp":
      hardDrop({
        piece: gameState.currentPiece,
        board: gameState.board,
      });
      // place piece immediately
      placePiece({ piece: gameState.currentPiece, board: gameState.board });
      const linesCleared = clearLines(gameState.board);
      gameState.linesCleared += linesCleared;
      gameState.currentPiece = spawnPiece(getNextPiece);
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
        const linesCleared = clearLines(gameState.board);
        gameState.linesCleared += linesCleared;
        gameState.currentPiece = spawnPiece(getNextPiece);
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
  const gameStateRef = useRef<GameState | null>(null);
  const getNextPiece = useBag();

  // initialize the game state
  useEffect(() => {
    // nullish coalescing assignment https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment
    gameStateRef.current ??= {
      currentPiece: spawnPiece(getNextPiece),
      dropTimer: 0,
      dropIntervalSeconds: 1,
      linesCleared: 0,
      board: Array(ROWS)
        .fill(null)
        .map(() =>
          Array(COLS)
            .fill(null)
            .map(() => ({ occupied: false })),
        ),
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
    const cellHeight = canvas.height / ROWS;

    function animate() {
      const gameLoop = gameLoopRef.current;

      if (!gameLoop) {
        console.error("Game loop is not initialized");
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
          step: gameLoop.step,
          getNextPiece,
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
  }, [canvasRef, getNextPiece]);

  // event listeners
  useEffect(() => {
    if (!gameStateRef.current) return;
    function handleKeyDownWrapper(event: KeyboardEvent) {
      handleKeyDown({
        event,
        gameState: gameStateRef.current!,
        getNextPiece,
      });
    }

    window.addEventListener("keydown", handleKeyDownWrapper);
    return () => window.removeEventListener("keydown", handleKeyDownWrapper);
  }, [getNextPiece]);

  return (
    <div>
      <canvas ref={canvasRef} width={300} height={600}></canvas>
    </div>
  );
}
