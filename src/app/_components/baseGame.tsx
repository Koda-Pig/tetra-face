"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { useBag } from "~/hooks/useBag";
import GameStat from "./gameStat";
import type { Socket } from "socket.io-client";
import {
  canPieceMove,
  calcDropSpeed,
  spawnPiece,
  lockPieceAndSpawnNext,
  tryRotatePiece,
  placePiece,
  hardDrop,
  getTimestamp,
  createEmptyBoard,
} from "./gameUtils";
import type {
  GameState,
  GameLoop,
  Tetromino,
  UIState,
  TetrominoType,
} from "~/types";
import {
  COLS,
  VISIBLE_ROWS,
  HIDDEN_ROWS,
  FILLED_CELL,
  GAME_INPUT_KEYS,
  FLASH_TRANSITION_DURATION_MS,
  INITIAL_GAME_STATE,
} from "~/constants";

function drawBoard({
  ctx,
  board,
  cellWidth,
  cellHeight,
}: {
  ctx: CanvasRenderingContext2D;
  board: GameState["board"];
  cellWidth: number;
  cellHeight: number;
}) {
  for (let row = 0; row < VISIBLE_ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const actualRow = row + HIDDEN_ROWS;
      const cell = board[actualRow]![col]!;
      if (cell.occupied) {
        ctx.fillStyle = cell.color ?? "transparent";
        ctx.fillRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
      }

      // draw grid
      ctx.strokeStyle = "#292933";
      ctx.strokeRect(col * cellWidth, row * cellHeight, cellWidth, cellHeight);
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
  const cellHeight = ctx.canvas.height / VISIBLE_ROWS;
  const cells = rotations[rotation];

  for (let i = 0; i < cells!.length; i++) {
    const row = cells![i];

    if (!row) {
      console.error("Row is undefined, something went wrong");
      continue;
    }

    for (let j = 0; j < row.length; j++) {
      if (row[j] === FILLED_CELL) {
        const canvasY = (y + i - HIDDEN_ROWS) * cellHeight; // adjust for hidden rows
        const canvasX = (x + j) * cellWidth;

        const isWithinVisibleArea = y + i >= HIDDEN_ROWS;

        if (isWithinVisibleArea) {
          ctx.fillStyle = color;
          ctx.fillRect(canvasX, canvasY, cellWidth, cellHeight);
        }
      }
    }
  }
}

function update({
  gameState,
  step,
  getNextPiece,
  onStateChange,
}: {
  gameState: GameState;
  step: number;
  getNextPiece: () => TetrominoType;
  onStateChange?: (gameState: GameState) => void;
}) {
  gameState.dropTimer += step;

  if (gameState.dropTimer < gameState.dropIntervalSeconds) {
    return;
  }

  gameState.dropTimer = 0; // reset drop timer

  if (
    canPieceMove({
      piece: gameState.currentPiece,
      board: gameState.board,
      deltaY: 1,
    })
  ) {
    gameState.currentPiece.y++;
  } else {
    placePiece({ piece: gameState.currentPiece, board: gameState.board });
    lockPieceAndSpawnNext({
      gameState,
      getNextPiece,
      onStateChange,
    });
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
  ctx.fillStyle = "#16161d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawTetromino({
    ctx,
    rotation: gameState.currentPiece.rotation,
    tetromino: gameState.currentPiece.tetromino,
    x: gameState.currentPiece.x,
    y: gameState.currentPiece.y,
  });

  drawBoard({ ctx, board: gameState.board, cellWidth, cellHeight });
}

function handleKeyDown({
  currentKey,
  gameState,
  getNextPiece,
  onStateChange,
  pauseMultiplierRef,
  setUiState,
}: {
  currentKey: string;
  gameState: GameState;
  getNextPiece: () => TetrominoType;
  onStateChange?: (gameState: GameState) => void;
  pauseMultiplierRef: React.RefObject<number>;
  setUiState: React.Dispatch<React.SetStateAction<UIState>>;
}) {
  if (!GAME_INPUT_KEYS.includes(currentKey)) return;

  const isPaused = pauseMultiplierRef.current === 0;

  if (currentKey === "Escape") {
    pauseMultiplierRef.current = isPaused ? 1 : 0;
    setUiState((prev) => ({ ...prev, isPaused: !isPaused }));
    return;
  }

  // no key pressing when paused
  if (isPaused) return;

  switch (currentKey) {
    case "ArrowUp":
      hardDrop({
        piece: gameState.currentPiece,
        board: gameState.board,
      });
      // place piece immediately
      placePiece({ piece: gameState.currentPiece, board: gameState.board });
      lockPieceAndSpawnNext({
        gameState,
        getNextPiece,
        onStateChange,
      });
      break;
    case "ArrowDown":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaY: 1,
        })
      ) {
        gameState.currentPiece.y++;
      } else {
        placePiece({ piece: gameState.currentPiece, board: gameState.board });
        lockPieceAndSpawnNext({
          gameState,
          getNextPiece,
          onStateChange,
        });
      }
      break;
    case "ArrowLeft":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaX: -1,
        })
      ) {
        gameState.currentPiece.x--;
      }
      break;
    case "ArrowRight":
      if (
        canPieceMove({
          piece: gameState.currentPiece,
          board: gameState.board,
          deltaX: 1,
        })
      ) {
        gameState.currentPiece.x++;
      }
      break;
    case "Space":
      tryRotatePiece({
        piece: gameState.currentPiece,
        board: gameState.board,
        direction: 1, // clockwise rotation
      });
      break;
    case "KeyZ":
      tryRotatePiece({
        piece: gameState.currentPiece,
        board: gameState.board,
        direction: -1, // counter-clockwise rotation
      });
      break;
    default:
      break;
  }
}

interface BaseGameProps {
  userId: string;
  // Input handling props - only one should be provided
  socket?: Socket;
  roomId?: string;
  singlePlayer?: boolean;
}

interface BaseGameRef {
  handleKeyPress: (keyCode: string) => void;
}

const BaseGame = forwardRef<BaseGameRef, BaseGameProps>(
  ({ userId, socket, roomId, singlePlayer = false }, ref) => {
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

    const getNextPiece = useBag();

    function restartGame() {
      if (!gameStateRef.current) return;

      // 1. Reset game state (reuse existing object to maintain references)
      Object.assign(gameStateRef.current, {
        ...INITIAL_GAME_STATE,
        currentPiece: spawnPiece(getNextPiece),
        dropIntervalSeconds: calcDropSpeed(0),
        userId,
        board: createEmptyBoard(),
      });

      // 2. Reset pause state
      pauseMultiplierRef.current = 1;

      // 3. Reset UI state completely
      setUiState({
        isGameOver: false,
        score: 0,
        scoreFlash: false,
        levelFlash: false,
        level: 0,
        isPaused: false,
      });

      // 4. Reset game loop timing
      const gameLoop = gameLoopRef.current;
      gameLoop.deltaTime = 0;
      gameLoop.lastTime = getTimestamp();
      setRestartTrigger((prev) => prev + 1);
    }

    // Determine if this is a host game (has socket/roomId) or opponent game (has currentKey)
    const isHostGame = Boolean(socket && roomId) || singlePlayer;

    const handleKeyPressRef = useCallback(
      (keyCode: string) => {
        if (!gameStateRef.current) return;

        handleKeyDown({
          currentKey: keyCode,
          gameState: gameStateRef.current,
          getNextPiece,
          onStateChange: syncUIState,
          pauseMultiplierRef,
          setUiState,
        });
      },
      [getNextPiece, syncUIState],
    );

    // Expose the handleKeyPress function via useImperativeHandle
    useImperativeHandle(
      ref,
      () => ({
        handleKeyPress: handleKeyPressRef,
      }),
      [handleKeyPressRef],
    );

    // initialize the game state
    useEffect(() => {
      // nullish coalescing assignment https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment
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
    }, [canvasRef, getNextPiece, syncUIState, restartTrigger]);

    // Host game event listeners (keyboard events)
    useEffect(() => {
      if (!isHostGame || !gameStateRef.current) return;

      function handleKeyDownWrapper(event: KeyboardEvent) {
        // Emit keystroke to opponent BEFORE processing locally
        if (!GAME_INPUT_KEYS.includes(event.code)) return;

        event.preventDefault();
        // FIRST try to send the keystroke to the opponent
        // not sure if this is the best way to do it but lets see.
        if (socket && roomId) {
          const gameAction = {
            roomId,
            action: {
              type: "keystroke",
              keyCode: event.code,
              timestamp: getTimestamp(),
            },
          };
          socket.emit("game-action", gameAction);
        }
        handleKeyDown({
          currentKey: event.code,
          gameState: gameStateRef.current!,
          getNextPiece,
          onStateChange: syncUIState,
          pauseMultiplierRef,
          setUiState,
        });
      }

      window.addEventListener("keydown", handleKeyDownWrapper);
      return () => window.removeEventListener("keydown", handleKeyDownWrapper);
    }, [isHostGame, socket, roomId, getNextPiece, syncUIState]);

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
          <GameStat
            label="score"
            value={uiState.score}
            flashTrigger={uiState.scoreFlash}
            alignment="right"
            transitionDuration={FLASH_TRANSITION_DURATION_MS}
          />
          <GameStat
            label="level"
            value={uiState.level}
            flashTrigger={uiState.levelFlash}
            alignment="left"
            transitionDuration={FLASH_TRANSITION_DURATION_MS}
          />
        </div>

        <div
          className={cn(
            "absolute inset-0 grid place-items-center",
            uiState.isGameOver || uiState.isPaused
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          <div className="text-center">
            <p className="text-shadow mb-8 text-5xl leading-14 text-shadow-[0_0_4px_black,0_0_8px_black]">
              {uiState.isPaused ? (
                <span>PAUSED</span>
              ) : (
                <span>
                  GAME
                  <br />
                  OVER
                  <br />
                  BITCH
                </span>
              )}
            </p>
            {(uiState.isGameOver || uiState.isPaused) && (
              <Button onClick={restartGame} size="lg" className="text-lg">
                Restart
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

BaseGame.displayName = "BaseGame";

export default BaseGame;
