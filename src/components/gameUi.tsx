import { cn } from "~/lib/utils";
import type { UIState } from "~/types";

export default function GameUi({
  uiState,
  children,
}: {
  uiState: UIState;
  children?: React.ReactNode;
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
        <h6 className="text-shadow mb-8 text-5xl leading-14 font-bold text-shadow-[0_0_4px_var(--background),0_0_8px_var(--background)]">
          {uiState.isGameOver ? (
            <span>
              GAME
              <br />
              OVER
            </span>
          ) : (
            <span>PAUSED</span>
          )}
        </h6>
        {children}
      </div>
    </div>
  );
}
