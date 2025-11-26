"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "~/lib/utils";
import { useBag } from "~/hooks/useBag";
import GameStats from "./gameStats";
import GameUi from "./gameUi";
import { Button } from "~/components/ui/button";
import {
  calcDropSpeed,
  spawnPiece,
  update,
  handleKeyDown,
  createEmptyBoard,
  render,
  restartGame,
} from "./gameUtils";
import { getTimestamp } from "~/lib/utils";
import type { GameState, GameLoop, UIState } from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  GAME_INPUT_KEYS,
  FLASH_TRANSITION_DURATION_MS,
  INITIAL_GAME_STATE,
  INITIAL_UI_STATE,
  INITIAL_GAMELOOP,
} from "~/constants";

export default function SinglePlayerGame({ userId }: { userId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop>(INITIAL_GAMELOOP);
  const pauseMultiplierRef = useRef(1); //  0 = paused
  // we're not using useState for this because we don't want to trigger re-renders while the game is playing
  const gameStateRef = useRef<GameState | null>(null);
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE);
  const [restartTrigger, setRestartTrigger] = useState(0);
  const getNextPiece = useBag();

  const syncUIState = useCallback((gameState: GameState) => {
    setUiState((prev) => {
      const scoreChanged = prev.score !== gameState.score;
      const levelChanged = prev.level !== gameState.level;

      // remove flash after animation
      if (scoreChanged || levelChanged) {
        setTimeout(
          () =>
            setUiState((prev) => ({
              ...prev,
              scoreFlash: false,
              levelFlash: false,
            })),
          FLASH_TRANSITION_DURATION_MS,
        );
      }

      return {
        ...prev,
        isGameOver: gameState.isGameOver,
        score: gameState.score,
        level: gameState.level,
        scoreFlash: prev.score !== gameState.score, // flash when score changes
        levelFlash: prev.level !== gameState.level,
      };
    });
  }, []);

  function handleResume() {
    if (!gameStateRef.current || pauseMultiplierRef.current === null) return;

    pauseMultiplierRef.current = 1;
    setUiState((prev) => ({ ...prev, isPaused: false }));
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
  }, [getNextPiece, userId]);

  // initialize the game state
  useEffect(() => {
    gameStateRef.current ??= {
      ...INITIAL_GAME_STATE,
      board: createEmptyBoard(),
      currentPiece: spawnPiece(getNextPiece),
      dropIntervalSeconds: calcDropSpeed(0),
      userId,
    };

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
  }, [userId, canvasRef, getNextPiece, syncUIState, restartTrigger]);

  // Event listeners (keyboard events)
  useEffect(() => {
    if (!gameStateRef.current) return;

    function handleKeyDownWrapper(event: KeyboardEvent) {
      if (!GAME_INPUT_KEYS.includes(event.code)) return;

      event.preventDefault();
      handleKeyDown({
        currentKey: event.code,
        gameState: gameStateRef.current!,
        getNextPiece,
        onStateChange: syncUIState,
        pauseMultiplierRef,
        setUiState,
        playerId: userId,
      });
    }

    window.addEventListener("keydown", handleKeyDownWrapper);
    return () => window.removeEventListener("keydown", handleKeyDownWrapper);
  }, [userId, getNextPiece, syncUIState]);

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
      <GameUi uiState={uiState}>
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
      </GameUi>
    </div>
  );
}
