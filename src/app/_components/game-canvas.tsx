"use client";

import { useEffect, useRef } from "react";
import type { GameState, Tetromino, TetrominoType } from "~/types";

const COLS = 10;
const ROWS = 20;

const TETRAMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    cells: [
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "lightblue",
  },
  J: {
    cells: [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "darkblue",
  },
  L: {
    cells: [
      [1, 0, 0, 0],
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "orange",
  },
  O: {
    cells: [
      [1, 1, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "yellow",
  },
  S: {
    cells: [
      [0, 1, 1, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "green",
  },
  Z: {
    cells: [
      [1, 1, 0, 0],
      [0, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "red",
  },
  T: {
    cells: [
      [0, 1, 0, 0],
      [1, 1, 1, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: "purple",
  },
};

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
  x,
  y,
}: {
  ctx: CanvasRenderingContext2D;
  tetromino: Tetromino;
  x: number;
  y: number;
}) {
  const { cells, color } = tetromino;
  const cellWidth = ctx.canvas.width / COLS;
  const cellHeight = ctx.canvas.height / ROWS;
  for (let i = 0; i < cells.length; i++) {
    const row = cells[i];

    if (!row) {
      console.error("Row is undefined, something went wrong");
      continue;
    }

    for (let j = 0; j < row.length; j++) {
      if (row[j] === 1) {
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
    gameState.currentPiece.y++;
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
    tetromino: gameState.currentPiece.tetromino,
    x: gameState.currentPiece.x * cellWidth,
    y: gameState.currentPiece.y * cellHeight,
  });
}

type GameLoop = {
  now: number;
  animationId: number | null;
  lastTime: number;
  deltaTime: number;
  step: number;
};

function getTimestamp() {
  if (!window) return new Date().getTime();
  return window?.performance?.now();
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
    dropIntervalSeconds: 0.75,
  });

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

  return (
    <div>
      <canvas ref={canvasRef} width={300} height={600}></canvas>
    </div>
  );
}
