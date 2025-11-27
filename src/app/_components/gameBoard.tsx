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
    <div className="relative mx-auto h-[600px] w-[300px] overflow-clip rounded-md border-2 shadow">
      <div className="relative">
        <canvas
          ref={ref}
          width={300}
          height={600}
          className={cn(
            (uiState.isGameOver || uiState.isPaused) && "opacity-30",
          )}
        />
        <GameStats uiState={uiState} />
      </div>
      <GameUi uiState={uiState}>{children}</GameUi>
    </div>
  ),
);

export default GameBoard;
