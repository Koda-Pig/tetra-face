"use client";

import { useEffect, useRef } from "react";
import type { GameState, GameLoop, Tetromino } from "~/types";
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

function drawGrid({
  ctx,
  cellWidth,
  cellHeight,
}: {
  ctx: CanvasRenderingContext2D;
  cellWidth: number;
  cellHeight: number;
}) {
  for (let i = 0; i < COLS; i++) {
    for (let j = 0; j < ROWS; j++) {
      ctx.strokeStyle = "gray";
      ctx.strokeRect(i * cellWidth, j * cellHeight, cellWidth, cellHeight);
    }
  }
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

function update({ gameState, step }: { gameState: GameState; step: number }) {
  gameState.dropTimer += step;

  if (gameState.dropTimer >= gameState.dropIntervalSeconds) {
    gameState.dropTimer = 0;

    if (canPieceMoveDown(gameState.currentPiece)) {
      gameState.currentPiece.y++;
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

  drawGrid({ ctx, cellWidth, cellHeight });

  drawTetromino({
    ctx,
    rotation: gameState.currentPiece.rotation,
    tetromino: gameState.currentPiece.tetromino,
    x: gameState.currentPiece.x * cellWidth,
    y: gameState.currentPiece.y * cellHeight,
  });
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

function rotatePiece(piece: GameState["currentPiece"]) {
  const newRotation = (piece.rotation + 1) % 4;
  piece.rotation = newRotation;
}

function handleKeyDown({
  event,
  gameState,
}: {
  event: KeyboardEvent;
  gameState: GameState;
}) {
  if (!GAME_INPUT_KEYS.includes(event.code)) return;

  event.preventDefault();

  switch (event.code) {
    case "ArrowUp":
      break;
    case "ArrowDown":
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
    lastTime: getTimestamp(),
    deltaTime: 0,
    step: 1 / 60,
  });
  const gameStateRef = useRef<GameState>({
    currentPiece: {
      tetromino: TETRAMINOS.I,
      x: 0,
      y: 0,
      rotation: 0,
    },
    dropTimer: 0,
    dropIntervalSeconds: 1,
  });

  // game loop
  useEffect(() => {
    if (!canvasRef.current || !gameStateRef.current) return;

    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas.getContext("2d")) {
      console.error("Failed to get canvas context");
      return;
    }
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

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
        update({ gameState, step: gameLoop.step }); // logic
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
      if (!gameLoopRef.current.animationId) return;
      cancelAnimationFrame(gameLoopRef.current.animationId);
    };
  }, [canvasRef]);

  // event listeners
  useEffect(() => {
    function handleKeyDownWrapper(event: KeyboardEvent) {
      handleKeyDown({ event, gameState: gameStateRef.current });
    }

    window.addEventListener("keydown", handleKeyDownWrapper);
    return () => {
      window.removeEventListener("keydown", handleKeyDownWrapper);
    };
  }, []);

  return (
    <div>
      <canvas ref={canvasRef} width={300} height={600}></canvas>
    </div>
  );
}
