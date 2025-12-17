"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBag } from "~/hooks/useBag";
import { Button } from "~/components/ui/button";
import {
  calcDropSpeed,
  spawnPiece,
  update,
  handleKeyDown,
  createEmptyBoard,
  render,
  restartGame,
  pollGamepadInput,
} from "./gameUtils";
import { getTimestamp } from "~/lib/utils";
import type { GameState, AnimationLoop } from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  INITIAL_GAME_STATE,
  INITIAL_ANIMATION_LOOP,
} from "~/constants";
import type { GAME_INPUT_KEYS } from "~/constants";
import { Pause, Play, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import { useUIState } from "~/hooks/useUIState";
import { useGamepad } from "~/hooks/useGamepad";
import GameBoard from "./gameBoard";

export default function SinglePlayerGame({ userId }: { userId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<AnimationLoop>(INITIAL_ANIMATION_LOOP);
  const pauseMultiplierRef = useRef(1); //  0 = paused
  // we're not using useState for this because we don't want to trigger re-renders while the game is playing
  const gameStateRef = useRef<GameState | null>(null);
  const { uiState, setUiState, syncUIState } = useUIState();
  const [restartTrigger, setRestartTrigger] = useState(0);
  const { gamepadConnected, gamepadStateRef } = useGamepad();
  const getNextPiece = useBag();

  function handleResume() {
    if (!gameStateRef.current || pauseMultiplierRef.current === null) return;

    pauseMultiplierRef.current = 1;
    setUiState((prev) => ({ ...prev, isPaused: false }));
  }

  function handleBtnClick(currentKey: (typeof GAME_INPUT_KEYS)[number]) {
    if (!gameStateRef.current) return;

    handleKeyDown({
      currentKey: currentKey,
      gameState: gameStateRef.current,
      getNextPiece,
      onStateChange: syncUIState,
      pauseMultiplierRef,
      setUiState,
      playerId: userId,
    });
  }

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
  }, [getNextPiece, userId, setUiState]);

  // initialize the game state
  useEffect(() => {
    if (gameStateRef.current) return;
    const { piece, preview } = getNextPiece();
    gameStateRef.current = {
      ...INITIAL_GAME_STATE,
      board: createEmptyBoard(),
      currentPiece: spawnPiece(piece),
      previewPiece: preview,
      dropIntervalSeconds: calcDropSpeed(0),
      userId,
    };

    setUiState((prev) => ({ ...prev, previewPiece: preview }));

    gameLoopRef.current.lastTime = getTimestamp();
  }, [getNextPiece, userId]);

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

      if (gamepadConnected) {
        const gamepadKey = pollGamepadInput({ gamepadStateRef });
        if (gamepadKey) {
          handleKeyDown({
            currentKey: gamepadKey,
            gameState: gameStateRef.current!,
            getNextPiece,
            onStateChange: syncUIState,
            pauseMultiplierRef,
            setUiState,
            playerId: userId,
          });
        }
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
          playerId: userId,
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
  }, [
    userId,
    canvasRef,
    getNextPiece,
    syncUIState,
    setUiState,
    restartTrigger,
    gamepadConnected,
  ]);

  // Event listeners (keyboard + swipe events)
  useEffect(() => {
    if (!gameStateRef.current || !canvasRef.current) {
      return;
    }
    const canvas = canvasRef.current;

    function handleKeyDownWrapper(event: KeyboardEvent) {
      handleKeyDown({
        event,
        currentKey: event.code,
        gameState: gameStateRef.current!,
        getNextPiece,
        onStateChange: syncUIState,
        pauseMultiplierRef,
        setUiState,
        playerId: userId,
      });
    }

    // Swipe detection
    let touchStartX = 0;
    let touchStartY = 0;
    const MIN_SWIPE_DISTANCE = 30;

    function handleTouchStart(event: TouchEvent) {
      event.preventDefault();
      if (event.touches.length > 0) {
        touchStartX = event.touches[0]!.clientX;
        touchStartY = event.touches[0]!.clientY;
      }
    }

    function handleTouchEnd(event: TouchEvent) {
      if (event.changedTouches.length > 0) {
        const touch = event.changedTouches[0]!;
        const deltaX = touch.clientX - touchStartX;
        const deltaY = touch.clientY - touchStartY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        if (distance >= MIN_SWIPE_DISTANCE) {
          // It's a swipe
          let activeKey = null;
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            activeKey = deltaX > 0 ? "ArrowRight" : "ArrowLeft";
          } else {
            activeKey = deltaY > 0 ? "ArrowDown" : "ArrowUp";
          }
          handleKeyDown({
            currentKey: activeKey,
            gameState: gameStateRef.current!,
            getNextPiece,
            onStateChange: syncUIState,
            pauseMultiplierRef,
            setUiState,
            playerId: userId,
          });
        } else {
          // It's a tap - trigger rotation
          handleKeyDown({
            currentKey: "Space",
            gameState: gameStateRef.current!,
            getNextPiece,
            onStateChange: syncUIState,
            pauseMultiplierRef,
            setUiState,
            playerId: userId,
          });
        }
      }
    }

    window.addEventListener("keydown", handleKeyDownWrapper);
    canvas.addEventListener("touchstart", handleTouchStart);
    canvas.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("keydown", handleKeyDownWrapper);
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [userId, getNextPiece, syncUIState, setUiState]);

  return (
    <div className="relative mx-auto w-min">
      <GameBoard uiState={uiState} ref={canvasRef}>
        <div className="grid gap-4">
          {(uiState.isGameOver || uiState.isPaused) && (
            <Button onClick={handleRestart} size="lg" className="text-lg">
              Restart
            </Button>
          )}
          {uiState.isPaused && !uiState.isGameOver && (
            <Button onClick={handleResume} size="lg" className="text-lg">
              Resume
            </Button>
          )}
        </div>
      </GameBoard>

      <button
        onClick={() => handleBtnClick("ShiftLeft")}
        className="absolute top-4 left-0 z-20 h-16 w-16 -translate-x-full"
        title="hold/ swap trigger"
      />
      <button
        onClick={() => handleBtnClick("Escape")}
        className="absolute top-3 right-0 z-20 grid h-15 w-15 translate-x-full place-items-center rounded-lg rounded-tl-none rounded-bl-none border-2 border-l-0 border-(--retro-green) bg-black"
        title="play/ pause"
      >
        {uiState.isPaused ? <Play /> : <Pause />}
      </button>
      <button
        onClick={() => handleBtnClick("ArrowLeft")}
        className="absolute bottom-0 left-2 z-20 grid h-15 w-15 translate-y-full place-items-center rounded-lg rounded-tl-none rounded-tr-none border-2 border-t-0 border-(--retro-green) bg-black"
        title="move left"
      >
        <ArrowLeft />
      </button>
      <button
        onClick={() => handleBtnClick("Space")}
        className="absolute bottom-0 left-1/2 z-20 grid h-15 w-15 -translate-x-1/2 translate-y-full place-items-center rounded-lg rounded-tl-none rounded-tr-none border-2 border-t-0 border-(--retro-green) bg-black"
        title="rotate clockwise"
      >
        <RotateCw />
      </button>
      <button
        onClick={() => handleBtnClick("ArrowRight")}
        className="absolute right-2 bottom-0 z-20 grid h-15 w-15 translate-y-full place-items-center rounded-lg rounded-tl-none rounded-tr-none border-2 border-t-0 border-(--retro-green) bg-black"
        title="move right"
      >
        <ArrowRight />
      </button>
    </div>
  );
}
