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
import { TETRAMINOS } from "~/constants";

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
    tetromino: TETRAMINOS[tetrominoType],
    x: Math.floor((COLS - PIECE_SIZE) / 2), // centered
    y: 0,
    rotation: 0,
  };
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

    if (canPieceMoveDown(gameState.currentPiece)) {
      gameState.currentPiece.y++;
    } else {
      placePiece({ piece: gameState.currentPiece, board: gameState.board });
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

function canPieceMoveDown(piece: GameState["currentPiece"]): boolean {
  const newY = piece.y + 1;

  for (let row = 0; row < PIECE_SIZE; row++) {
    for (let col = 0; col < PIECE_SIZE; col++) {
      // filled cell
      const cells = piece.tetromino.rotations[piece.rotation];
      if (cells![row]![col] === FILLED_CELL) {
        const boardY = newY + row;

        // check bottom boundary
        if (boardY >= ROWS) return false;
      }
    }
  }

  return true;
}

function canPieceMoveLeft(piece: GameState["currentPiece"]): boolean {
  const newX = piece.x - 1;

  for (let row = 0; row < PIECE_SIZE; row++) {
    for (let col = 0; col < PIECE_SIZE; col++) {
      // filled cell
      const cells = piece.tetromino.rotations[piece.rotation];
      if (cells![row]![col] === FILLED_CELL) {
        const boardX = newX + col;

        // check left boundary
        if (boardX < 0) return false;
      }
    }
  }

  return true;
}

function canPieceMoveRight(piece: GameState["currentPiece"]): boolean {
  const newX = piece.x + 1;

  for (let row = 0; row < PIECE_SIZE; row++) {
    for (let col = 0; col < PIECE_SIZE; col++) {
      // filled cell
      const cells = piece.tetromino.rotations[piece.rotation];
      if (cells![row]![col] === FILLED_CELL) {
        const boardX = newX + col;

        // check right boundary
        if (boardX >= COLS) return false;
      }
    }
  }

  return true;
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

function rotatePiece(piece: GameState["currentPiece"]) {
  // this is rudimentary. It needs a check to see if the piece can rotate without hitting the boundaries of the board or other pieces.
  // Also need to implement wall kicks. https://tetris.wiki/Wall_kick
  const newRotation = (piece.rotation + 1) % 4;
  piece.rotation = newRotation;
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
      break;
    case "ArrowDown":
      if (canPieceMoveDown(gameState.currentPiece)) {
        gameState.currentPiece.y++;
      } else {
        placePiece({ piece: gameState.currentPiece, board: gameState.board });
        gameState.currentPiece = spawnPiece(getNextPiece);
      }
      break;
    case "ArrowLeft":
      if (canPieceMoveLeft(gameState.currentPiece)) {
        gameState.currentPiece.x--;
      }
      break;
    case "ArrowRight":
      if (canPieceMoveRight(gameState.currentPiece)) {
        gameState.currentPiece.x++;
      }
      break;
    case "Space":
      rotatePiece(gameState.currentPiece);
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
        update({
          gameState,
          step: gameLoop.step,
          getNextPiece,
        }); // logic
      }
      render({
        ctx,
        canvas,
        cellWidth,
        cellHeight,
        gameState,
      }); // draw the game
      gameLoop.lastTime = gameLoop.now;
      gameLoop.animationId = requestAnimationFrame(animate);
    }

    gameLoopRef.current.animationId = requestAnimationFrame(animate);

    return () => {
      const animationId = gameLoopRef.current.animationId ?? 0;
      if (!animationId) return;
      cancelAnimationFrame(animationId);
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
    return () => {
      window.removeEventListener("keydown", handleKeyDownWrapper);
    };
  }, [getNextPiece]);

  return (
    <div>
      <canvas ref={canvasRef} width={300} height={600}></canvas>
    </div>
  );
}
