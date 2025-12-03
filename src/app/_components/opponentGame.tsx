"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  calcDropSpeed,
  createEmptyBoard,
  render,
  placePiece,
  clearLines,
  spawnPiece,
  addGarbageLines,
} from "./gameUtils";
import { getTimestamp } from "~/lib/utils";
import type { GameState, GameLoop, TetrisEvent, Piece } from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  INITIAL_GAME_STATE,
  INITIAL_GAMELOOP,
} from "~/constants";
import GameBoard from "./gameBoard";
import { useUIState } from "~/hooks/useUIState";

export interface OpponentGameRef {
  triggerAction: (action: TetrisEvent) => void;
}

const OpponentGame = forwardRef<
  OpponentGameRef,
  { userId: string; externalPause: boolean; externalGameOver: boolean }
>(({ userId, externalPause, externalGameOver }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<GameLoop>(INITIAL_GAMELOOP);
  const pauseMultiplierRef = useRef(1); //  0 = paused
  // we're not using useState for this because we don't want to trigger re-renders while the game is playing
  const gameStateRef = useRef<GameState | null>(null);
  const { uiState, setUiState, syncUIState } = useUIState();
  const [initialPiece, setInitialPiece] = useState<Piece | null>(null);

  const triggerActionRef = useCallback(
    (action: TetrisEvent) => {
      const { type } = action;

      if (type === "initial-piece-spawn") {
        setInitialPiece(action.piece);
        return;
      }

      if (!gameStateRef.current) {
        console.error("gamestateRef not initialized");
        return;
      }

      switch (type) {
        case "player-move":
          gameStateRef.current.currentPiece.x += action.deltaX;
          break;
        case "player-rotate":
          gameStateRef.current.currentPiece.rotation = action.newRotation;
          break;
        case "player-soft-drop":
          gameStateRef.current.currentPiece.y = action.newY;
          break;
        // my types for these are the same, need to test if the result is
        // the same in practice.
        case "player-soft-drop-lock":
        case "player-hard-drop-lock":
          placePiece({
            piece: action.lockedPiece,
            board: gameStateRef.current.board,
          });
          gameStateRef.current.currentPiece = action.nextPiece;
          gameStateRef.current.linesCleared = action.linesCleared;
          gameStateRef.current.score = action.newScore;
          gameStateRef.current.level = action.newLevel;
          clearLines(gameStateRef.current.board);
          syncUIState(gameStateRef.current);
          if (gameStateRef.current.pendingGarbage) {
            addGarbageLines({
              garbage: gameStateRef.current.pendingGarbage,
              board: gameStateRef.current.board,
            });
            gameStateRef.current.pendingGarbage = null;
          }
          break;
        case "gravity-drop":
          gameStateRef.current.currentPiece.y = action.newY;
          break;
        case "gravity-lock":
          gameStateRef.current.currentPiece.y = action.newY;
          placePiece({
            piece: action.lockedPiece,
            board: gameStateRef.current.board,
          });
          gameStateRef.current.currentPiece = action.nextPiece;
          gameStateRef.current.linesCleared = action.linesCleared;
          gameStateRef.current.score = action.newScore;
          gameStateRef.current.level = action.newLevel;
          clearLines(gameStateRef.current.board);
          syncUIState(gameStateRef.current);
          if (gameStateRef.current.pendingGarbage) {
            addGarbageLines({
              garbage: gameStateRef.current.pendingGarbage,
              board: gameStateRef.current.board,
            });
            gameStateRef.current.pendingGarbage = null;
          }
          break;
        case "game-pause":
          pauseMultiplierRef.current = 0;
          setUiState((prev) => ({ ...prev, isPaused: true }));
          break;
        case "game-resume":
          pauseMultiplierRef.current = 1;
          setUiState((prev) => ({ ...prev, isPaused: false }));
          break;
        case "player-hold-piece":
          const { pieceType, newPieceToHold } = action;
          gameStateRef.current.currentPiece = spawnPiece(undefined, pieceType);
          setUiState((prev) => ({ ...prev, holdPiece: newPieceToHold }));
          break;
        case "receive-garbage":
          gameStateRef.current.pendingGarbage = action.garbageLines;
          break;
      }
    },
    [syncUIState, setUiState],
  );

  useImperativeHandle(
    ref,
    () => ({
      triggerAction: triggerActionRef,
    }),
    [triggerActionRef],
  );

  // initialize the game state
  useEffect(() => {
    // don't initialize if already initialized or there's no piece
    if (gameStateRef.current || !initialPiece) return;
    gameStateRef.current = {
      ...INITIAL_GAME_STATE,
      board: createEmptyBoard(),
      currentPiece: initialPiece,
      dropIntervalSeconds: calcDropSpeed(0),
      userId,
    };

    gameLoopRef.current.lastTime = getTimestamp();
  }, [userId, initialPiece]);

  // game loop
  useEffect(() => {
    if (!canvasRef.current || !gameStateRef.current) return;
    const gameState = gameStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas.getContext("2d")) return;
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
  }, [canvasRef, syncUIState, initialPiece]);

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

  return <GameBoard ref={canvasRef} uiState={uiState} />;
});

OpponentGame.displayName = "OpponentGame";

export default OpponentGame;
