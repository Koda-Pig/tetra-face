"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "~/lib/utils";
import { useBag } from "~/hooks/useBag";
import GameStats from "./gameStats";
import GameUi from "./gameUi";
import type { Socket } from "socket.io-client";
import {
  calcDropSpeed,
  spawnPiece,
  update,
  getTimestamp,
  handleKeyDown,
  createEmptyBoard,
  render,
  restartGame,
} from "./gameUtils";
import type { GameState, GameLoop, UIState } from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  GAME_INPUT_KEYS,
  FLASH_TRANSITION_DURATION_MS,
  INITIAL_GAME_STATE,
} from "~/constants";

export default function HostGame({
  userId,
  socket,
  roomId,
}: {
  userId: string;
  socket: Socket;
  roomId: string;
}) {
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
  const [restartTrigger, setRestartTrigger] = useState(0);
  const getNextPiece = useBag();

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

  const handleRestart = useCallback(() => {
    restartGame({
      gameStateRef,
      pauseMultiplierRef,
      gameLoopRef,
      setUiState,
      setRestartTrigger,
      getNextPiece,
      userId,
    });
  }, [getNextPiece, userId]);

  // initialize the game state
  useEffect(() => {
    if (gameStateRef.current) return;
    const newPiece = spawnPiece(getNextPiece);

    gameStateRef.current = {
      ...INITIAL_GAME_STATE,
      board: createEmptyBoard(),
      currentPiece: newPiece,
      dropIntervalSeconds: calcDropSpeed(0),
      userId,
    };

    gameLoopRef.current.lastTime = getTimestamp();
  }, [getNextPiece, userId, roomId]);

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
        const action = update({
          gameState,
          step: gameLoop.step * pauseMultiplier,
          getNextPiece,
          onStateChange: syncUIState,
        });
        if (action) socket.emit("game-action", { roomId, action });
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
  }, [canvasRef, getNextPiece, syncUIState, restartTrigger]);

  // Event listeners (keyboard events)
  useEffect(() => {
    if (!gameStateRef.current) return;

    function handleKeyDownWrapper(event: KeyboardEvent) {
      if (!GAME_INPUT_KEYS.includes(event.code)) return;

      event.preventDefault();
      const action = handleKeyDown({
        currentKey: event.code,
        gameState: gameStateRef.current!,
        getNextPiece,
        onStateChange: syncUIState,
        pauseMultiplierRef,
        setUiState,
      });
      if (action) socket.emit("game-action", { roomId, action });
    }

    window.addEventListener("keydown", handleKeyDownWrapper);
    return () => window.removeEventListener("keydown", handleKeyDownWrapper);
  }, [socket, roomId, getNextPiece, syncUIState]);

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
        />
        <GameStats uiState={uiState} />
      </div>
      <GameUi uiState={uiState} restartGame={handleRestart} />
    </div>
  );
}
