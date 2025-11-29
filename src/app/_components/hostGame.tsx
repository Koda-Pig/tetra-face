"use client";

import { useEffect, useRef, useState } from "react";
import { useBag } from "~/hooks/useBag";
import type { Socket } from "socket.io-client";
import { Button } from "~/components/ui/button";
import {
  calcDropSpeed,
  spawnPiece,
  update,
  handleKeyDown,
  createEmptyBoard,
  render,
  pollGamepadInput,
} from "./gameUtils";
import { getTimestamp } from "~/lib/utils";
import type { GameState, GameLoop, Winner, GamepadState } from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  GAME_INPUT_KEYS,
  INITIAL_GAME_STATE,
  INITIAL_GAMELOOP,
} from "~/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useUIState } from "~/hooks/useUIState";
import GameBoard from "./gameBoard";

export default function HostGame({
  userId,
  socket,
  roomId,
  externalPause,
  externalGameOver,
  winner,
}: {
  userId: string;
  socket: Socket;
  roomId: string;
  externalPause: boolean;
  externalGameOver: boolean;
  winner: Winner;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop>(INITIAL_GAMELOOP);
  const pauseMultiplierRef = useRef(1); //  0 = paused
  // we're not using `useState` for this because we don't want to trigger re-renders while the game is playing
  const gameStateRef = useRef<GameState | null>(null);
  const gamepadStateRef = useRef<GamepadState>({
    previousBtnStates: Array.from({ length: 17 }, () => false), // gamepads have 17 buttons
  });
  const { uiState, setUiState, syncUIState } = useUIState();
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const getNextPiece = useBag();

  function handleResume() {
    socket.emit("game-pause-event", {
      roomId,
      action: {
        type: "game-resume",
        timestamp: getTimestamp(),
      },
    });
  }

  function handleSurrender() {
    // submit a loss
    socket.emit("game-over-event", {
      roomId,
      action: {
        type: "game-over",
        playerId: userId,
        timestamp: getTimestamp(),
      },
    });
  }

  // initialize the game state
  useEffect(() => {
    if (gameStateRef.current) return;
    const newPiece = spawnPiece(getNextPiece);

    socket.emit("game-action", {
      roomId,
      action: {
        type: "initial-piece-spawn",
        piece: newPiece,
        timestamp: getTimestamp(),
      },
    });

    gameStateRef.current = {
      ...INITIAL_GAME_STATE,
      board: createEmptyBoard(),
      currentPiece: newPiece,
      dropIntervalSeconds: calcDropSpeed(0),
      userId,
    };

    gameLoopRef.current.lastTime = getTimestamp();
  }, [socket, getNextPiece, userId, roomId]);

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
          const action = handleKeyDown({
            currentKey: gamepadKey,
            gameState: gameStateRef.current!,
            getNextPiece,
            onStateChange: syncUIState,
            pauseMultiplierRef,
            setUiState,
            playerId: userId,
          });
          if (action?.type === "game-pause" || action?.type === "game-resume") {
            socket.emit("game-pause-event", { roomId, action });
          } else if (action?.type === "game-over") {
            socket.emit("game-over-event", { roomId, action });
          } else if (action) {
            socket.emit("game-action", { roomId, action });
          }
        }
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
          playerId: userId,
        });
        if (action?.type === "game-over") {
          socket.emit("game-over-event", { roomId, action });
        } else if (action) {
          socket.emit("game-action", { roomId, action });
        }
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
    roomId,
    socket,
    canvasRef,
    getNextPiece,
    syncUIState,
    gamepadConnected,
  ]);

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
        playerId: userId,
      });

      if (action?.type === "game-pause" || action?.type === "game-resume") {
        socket.emit("game-pause-event", { roomId, action });
      } else if (action?.type === "game-over") {
        socket.emit("game-over-event", { roomId, action });
      } else if (action) {
        socket.emit("game-action", { roomId, action });
      }
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
  }, [socket, roomId, userId, getNextPiece, syncUIState, setUiState]);

  // sync external game
  useEffect(() => {
    if (!gameStateRef.current) return;
    if (externalGameOver) {
      gameStateRef.current.isGameOver = true;
      setUiState((prev) => ({ ...prev, isGameOver: true }));
    }

    if (externalPause) pauseMultiplierRef.current = 0;
    else pauseMultiplierRef.current = 1;

    setUiState((prev) => ({ ...prev, isPaused: externalPause }));
  }, [externalPause, externalGameOver, setUiState]);

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
      {uiState.isPaused && !uiState.isGameOver && (
        <div className="grid gap-4">
          <Button onClick={handleResume} size="lg" className="text-lg">
            Resume
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="lg" className="text-lg" onClick={handleSurrender}>
                Surrender
              </Button>
            </TooltipTrigger>
            <TooltipContent>You a quitter?</TooltipContent>
          </Tooltip>
        </div>
      )}
      {winner && <p>YOU {winner === "you" ? "WON" : "LOST"}!</p>}
    </GameBoard>
  );
}
