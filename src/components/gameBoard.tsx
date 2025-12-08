import { forwardRef } from "react";
import { cn } from "~/lib/utils";
import type {
  UIState,
  LineClearAnimation as LineClearAnimationType,
} from "~/types";
import GameStats from "./gameStats";
import GameUi from "./gameUi";
import {
  CANVAS_ANIMATION_DURATION_MS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from "~/constants";
import LineClearAnimation from "./lineClearAnimation";

type GameBoardProps = {
  uiState: UIState;
  lineClearAnimation?: LineClearAnimationType | null;
  children?: React.ReactNode;
};

const GameBoard = forwardRef<HTMLCanvasElement, GameBoardProps>(
  ({ uiState, lineClearAnimation = null, children }, ref) => (
    <div className="relative mx-auto w-min">
      <canvas
        ref={ref}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{ animationDuration: `${CANVAS_ANIMATION_DURATION_MS}ms` }}
        className={cn(
          "game-canvas rounded-md border-2 border-(--retro-green) shadow-(--retro-green)",
          (uiState.isGameOver || uiState.isPaused) && "opacity-30",
          uiState.canvasFlash && "game-canvas-flash",
          `game-canvas-score-multiplier-${uiState.scoreMultiplier}`,
        )}
      />
      <GameStats uiState={uiState} />
      <GameUi uiState={uiState}>{children}</GameUi>
      <LineClearAnimation animation={lineClearAnimation} uiState={uiState} />
    </div>
  ),
);

GameBoard.displayName = "GameBoard";

export default GameBoard;
