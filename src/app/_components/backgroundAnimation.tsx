"use client";

import { useRef, useEffect } from "react";
import { INITIAL_ANIMATION_LOOP, TETRAMINO_BAG } from "~/constants";
import { getTimestamp } from "~/lib/utils";
import type { AnimationLoop, TetrominoType } from "~/types";
import { useGameInPlay } from "~/contexts/gameInPlayContext";

// Define the shapes (relative block positions)
const TETROMINO_SHAPES: Record<TetrominoType, number[][]> = {
  // prettier-ignore
  I: [ [0, 1], [1, 1], [2, 1], [3, 1], ],
  // prettier-ignore
  O: [ [0, 0], [1, 0], [0, 1], [1, 1], ],
  //prettier-ignore
  T: [ [1, 0], [0, 1], [1, 1], [2, 1], ],
  //prettier-ignore
  S: [ [1, 0], [2, 0], [0, 1], [1, 1], ],
  //prettier-ignore
  Z: [ [0, 0], [1, 0], [1, 1], [2, 1], ],
  //prettier-ignore
  J: [ [0, 0], [0, 1], [1, 1], [2, 1], ],
  //prettier-ignore
  L: [ [2, 0], [0, 1], [1, 1], [2, 1], ],
};

class TetrominoShape {
  shape: TetrominoType;
  x: number;
  y: number;
  size: number;
  canvasHeight: number;
  constructor(
    x: number,
    y: number,
    shape: TetrominoType,
    size: number,
    canvasHeight: number,
  ) {
    this.shape = shape;
    this.x = x;
    this.y = y;
    this.size = size;
    this.canvasHeight = canvasHeight;
  }
  update() {
    const shouldReset =
      this.y * this.size > this.canvasHeight && Math.random() > 0.96;
    if (shouldReset) this.y = 0;
    else this.y += 3;
  }
  draw(ctx: CanvasRenderingContext2D) {
    const blockSize = this.size;
    const x = this.x * blockSize;
    const y = this.y * blockSize;

    const blocks = TETROMINO_SHAPES[this.shape];

    blocks.forEach(([bx, by]) => {
      const blockX = x + bx! * blockSize;
      const blockY = y + by! * blockSize;

      ctx.strokeStyle = "rgba(0, 255, 0, 0.05)";
      ctx.lineWidth = 1;
      ctx.strokeRect(blockX, blockY, blockSize - 1, blockSize - 1);
    });
  }
}

class Effect {
  canvasWidth: number;
  canvasHeight: number;
  size: number;
  columns: number;
  tetrominoShapes: TetrominoShape[];
  accumulatedTime: number;
  updateIntervalSeconds: number;
  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.size = 25;
    this.columns = this.canvasWidth / this.size;
    this.accumulatedTime = 0;
    this.updateIntervalSeconds = 1 / 2; // 2 updates per second
    this.tetrominoShapes = [];
    this.#initialize();
  }
  #initialize() {
    const SPACING = 1;
    for (let i = 0; i < this.columns; i += SPACING) {
      this.tetrominoShapes[i] = new TetrominoShape(
        i,
        Math.random() * this.canvasHeight,
        TETRAMINO_BAG[i % TETRAMINO_BAG.length]!,
        this.size,
        this.canvasHeight,
      );
    }
  }
  update(deltaTime: number) {
    this.accumulatedTime += deltaTime;

    // Fixed timestep updates
    while (this.accumulatedTime >= this.updateIntervalSeconds) {
      this.tetrominoShapes.forEach((tetrominoShape) => tetrominoShape.update());
      this.accumulatedTime -= this.updateIntervalSeconds;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    this.tetrominoShapes.forEach((tetrominoShape) => tetrominoShape.draw(ctx));
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.columns = this.canvasWidth / this.size;
    this.tetrominoShapes = [];
    this.#initialize();
  }
}

function render({
  ctx,
  canvas,
  effect,
}: {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  effect: Effect;
}) {
  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    500,
    canvas.width / 2,
    canvas.height / 4,
    100,
  );
  gradient.addColorStop(0, "#0f0");
  gradient.addColorStop(0.2, "#0f0");
  gradient.addColorStop(0.4, "#0f0");
  gradient.addColorStop(0.6, "#0f0");
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = gradient;
  effect.tetrominoShapes.forEach((tetrominoShape) => tetrominoShape.draw(ctx));
}

export default function BackgroundAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationLoopRef = useRef<AnimationLoop>(INITIAL_ANIMATION_LOOP);
  const effectRef = useRef<Effect | null>(null);
  const { isGameInPlay } = useGameInPlay();

  useEffect(() => {
    if (!canvasRef.current || isGameInPlay) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    effectRef.current = new Effect(canvas.width, canvas.height);

    function animate() {
      const animationLoop = animationLoopRef.current;
      if (!animationLoop || !effectRef.current) return;
      animationLoop.now = getTimestamp();
      animationLoop.deltaTime = Math.min(
        1,
        (animationLoop.now - animationLoop.lastTime) / 1000,
      );
      effectRef.current.update(animationLoop.deltaTime);
      render({ ctx: ctx!, canvas, effect: effectRef.current });

      animationLoop.lastTime = animationLoop.now;
      animationLoop.animationId = requestAnimationFrame(animate);
    }

    const animationLoop = animationLoopRef.current;
    animationLoop.animationId = requestAnimationFrame(animate);
    return () => {
      if (animationLoop.animationId) {
        cancelAnimationFrame(animationLoop.animationId);
        animationLoop.animationId = null;
      }
    };
  }, [canvasRef, isGameInPlay]);

  return <canvas ref={canvasRef} className="fixed inset-0 -z-10 opacity-100" />;
}
