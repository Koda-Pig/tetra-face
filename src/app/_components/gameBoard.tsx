import { forwardRef } from "react";
import { cn } from "~/lib/utils";
import type { UIState } from "~/types";
import GameStats from "./gameStats";
import GameUi from "./gameUi";

interface GameBoardProps {
  uiState: UIState;
  children?: React.ReactNode;
}

const GameBoard = forwardRef<HTMLCanvasElement, GameBoardProps>(
  ({ uiState, children }, ref) => (
    <div className="relative mx-auto h-[600px] w-[300px]">
      <canvas
        ref={ref}
        width={300}
        height={600}
        className={cn(
          "game-canvas rounded-md border-2 border-[var(--retro-green)] shadow shadow-[var(--retro-green)]",
          (uiState.isGameOver || uiState.isPaused) && "opacity-30",
          (uiState.scoreFlash || uiState.levelFlash) && "game-canvas-flash",
        )}
      />
      <GameStats uiState={uiState} />
      <GameUi uiState={uiState}>{children}</GameUi>
    </div>
  ),
);

GameBoard.displayName = "GameBoard";

export default GameBoard;
