"use client";

import { useCallback, useEffect, useRef } from "react";
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
import type { GameState, AnimationLoop, TetrisEvent, BoardCell } from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  INITIAL_GAME_STATE,
  INITIAL_ANIMATION_LOOP,
} from "~/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useUIState } from "~/hooks/useUIState";
import { useGamepad } from "~/hooks/useGamepad";
import GameBoard from "./gameBoard";

function handleReceiveGarbage(
  garbageLines: BoardCell[][],
  socket: Socket,
  roomId: string,
) {
  socket.emit("game-action", {
    roomId,
    action: {
      type: "receive-garbage",
      garbageLines,
      timestamp: getTimestamp(),
    } as TetrisEvent,
  });
}

function handleSendGarbage(
  garbageLines: BoardCell[][],
  socket: Socket,
  roomId: string,
) {
  socket.emit("game-action", {
    roomId,
    action: {
      type: "send-garbage",
      garbageLines,
      timestamp: getTimestamp(),
    } as TetrisEvent,
  });
}

function handleResume(socket: Socket, roomId: string) {
  socket.emit("game-pause-event", {
    roomId,
    action: {
      type: "game-resume",
      timestamp: getTimestamp(),
    },
  });
}

function handleSurrender(socket: Socket, roomId: string, userId: string) {
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

function handleAction(
  action: TetrisEvent | null,
  socket: Socket,
  roomId: string,
) {
  if (action?.type === "game-pause" || action?.type === "game-resume") {
    socket.emit("game-pause-event", { roomId, action });
  } else if (action?.type === "game-over") {
    socket.emit("game-over-event", { roomId, action });
  } else if (action) {
    if ("garbageToSend" in action) {
      // extract garbage (don't send that data unnecessarily)
      const { garbageToSend, ...cleanAction } = action;
      socket.emit("game-action", { roomId, action: cleanAction });
      if (garbageToSend) handleSendGarbage(garbageToSend, socket, roomId);
    } else {
      socket.emit("game-action", { roomId, action });
    }
  }
}

type HostGameProps = {
  userId: string;
  socket: Socket;
  roomId: string;
  externalPause: boolean;
  externalGameOver: boolean;
  onReceiveGarbageCallback: (
    callback: (garbageLines: BoardCell[][]) => void,
  ) => void;
};

export default function HostGame({
  userId,
  socket,
  roomId,
  externalPause,
  externalGameOver,
  onReceiveGarbageCallback,
}: HostGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<AnimationLoop>(INITIAL_ANIMATION_LOOP);
  const pauseMultiplierRef = useRef(1); //  0 = paused
  // we're not using `useState` for this because we don't want to trigger re-renders while the game is playing
  const gameStateRef = useRef<GameState | null>(null);
  const { uiState, setUiState, syncUIState } = useUIState();
  const { gamepadConnected, gamepadStateRef } = useGamepad();
  const getNextPiece = useBag();

  const receiveGarbage = useCallback((garbageLines: BoardCell[][]) => {
    if (!gameStateRef.current) return;
    gameStateRef.current.pendingGarbage = garbageLines;
  }, []);

  useEffect(() => {
    onReceiveGarbageCallback?.(receiveGarbage);
  }, [onReceiveGarbageCallback, receiveGarbage]);

  // initialize the game state
  useEffect(() => {
    if (gameStateRef.current) return;
    const { piece, preview } = getNextPiece();
    const newPiece = spawnPiece(piece);

    socket.emit("game-action", {
      roomId,
      action: {
        type: "initial-piece-spawn",
        piece: newPiece,
        previewPiece: preview,
        timestamp: getTimestamp(),
      } as TetrisEvent,
    });

    gameStateRef.current = {
      ...INITIAL_GAME_STATE,
      board: createEmptyBoard(),
      currentPiece: newPiece,
      previewPiece: preview,
      dropIntervalSeconds: calcDropSpeed(0),
      userId,
    };

    setUiState((prev) => ({ ...prev, previewPiece: preview }));

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
            onReceiveGarbage: (garbageLines) =>
              handleReceiveGarbage(garbageLines, socket, roomId),
            pauseMultiplierRef,
            setUiState,
            playerId: userId,
          });
          handleAction(action, socket, roomId);
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
          onReceiveGarbage: (garbageLines) =>
            handleReceiveGarbage(garbageLines, socket, roomId),
          playerId: userId,
        });
        handleAction(action, socket, roomId);
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
      const action = handleKeyDown({
        currentKey: event.code,
        gameState: gameStateRef.current!,
        getNextPiece,
        onStateChange: syncUIState,
        onReceiveGarbage: (garbageLines) =>
          handleReceiveGarbage(garbageLines, socket, roomId),
        pauseMultiplierRef,
        setUiState,
        playerId: userId,
      });
      handleAction(action, socket, roomId);
    }

    function handlePause() {
      socket.emit("game-pause-event", {
        roomId,
        action: { type: "game-pause", timestamp: getTimestamp() },
      });
    }

    window.addEventListener("keydown", handleKeyDownWrapper);
    window.addEventListener("blur", handlePause);

    return () => {
      window.removeEventListener("keydown", handleKeyDownWrapper);
      window.removeEventListener("blur", handlePause);
    };
  }, [socket, roomId, setUiState, userId, getNextPiece, syncUIState]);

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

  return (
    <GameBoard uiState={uiState} ref={canvasRef}>
      {uiState.isPaused && !uiState.isGameOver && (
        <div className="grid gap-4">
          <Button
            onClick={() => handleResume(socket, roomId)}
            size="lg"
            className="text-lg"
          >
            Resume
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="lg"
                className="text-lg"
                onClick={() => handleSurrender(socket, roomId, userId)}
              >
                Surrender
              </Button>
            </TooltipTrigger>
            <TooltipContent>You a quitter?</TooltipContent>
          </Tooltip>
        </div>
      )}
    </GameBoard>
  );
}
