import { forwardRef } from "react";
import { cn } from "~/lib/utils";
import type { UIState } from "~/types";
import GameStats from "./gameStats";
import GameUi from "./gameUi";
import { CANVAS_ANIMATION_DURATION_MS } from "~/constants";

type GameBoardProps = {
  uiState: UIState;
  children?: React.ReactNode;
};

const GameBoard = forwardRef<HTMLCanvasElement, GameBoardProps>(
  ({ uiState, children }, ref) => (
    <div className="relative mx-auto h-[600px] w-[300px]">
      <canvas
        ref={ref}
        width={300}
        height={600}
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
    </div>
  ),
);

GameBoard.displayName = "GameBoard";

export default GameBoard;
