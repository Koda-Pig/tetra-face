import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import type { UIState } from "~/types";

export default function GameUi({
  uiState,
  restartGame,
}: {
  uiState: UIState;
  restartGame: () => void;
}) {
  return (
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
  );
}
