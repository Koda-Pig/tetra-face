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
import type { GameState, GameLoop, GamepadState } from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  GAME_INPUT_KEYS,
  INITIAL_GAME_STATE,
  INITIAL_GAMELOOP,
} from "~/constants";
import { useUIState } from "~/hooks/useUIState";
import GameBoard from "./gameBoard";

export default function SinglePlayerGame({ userId }: { userId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop>(INITIAL_GAMELOOP);
  const pauseMultiplierRef = useRef(1); //  0 = paused
  // we're not using useState for this because we don't want to trigger re-renders while the game is playing
  const gameStateRef = useRef<GameState | null>(null);
  const gamepadStateRef = useRef<GamepadState>({
    previousBtnStates: Array.from({ length: 17 }, () => false), // gamepads have 17 buttons
  });
  const { uiState, setUiState, syncUIState } = useUIState();
  const [restartTrigger, setRestartTrigger] = useState(0);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const getNextPiece = useBag();

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
  }, [getNextPiece, userId, setUiState]);

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

    const handleGamepadConnected = () => setGamepadConnected(true);
    const handleGamepadDisconnected = () => {
      setGamepadConnected(false);
      gamepadStateRef.current.previousBtnStates.fill(false);
    };

    window.addEventListener("keydown", handleKeyDownWrapper);
    window.addEventListener("gamepadconnected", handleGamepadConnected);
    window.addEventListener("gamepaddisconnected", handleGamepadDisconnected);

    return () => {
      window.removeEventListener("keydown", handleKeyDownWrapper);
      window.removeEventListener("gamepadconnected", handleGamepadConnected);
      window.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected,
      );
    };
  }, [userId, getNextPiece, syncUIState, setUiState]);

  // Check for already-connected gamepads on mount
  useEffect(() => {
    const gamepads = navigator.getGamepads();
    const hasConnectedGamepad = Array.from(gamepads).some(
      (gamepad) => gamepad?.connected,
    );
    if (hasConnectedGamepad) setGamepadConnected(true);
  }, []);

  return (
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
  );
}
