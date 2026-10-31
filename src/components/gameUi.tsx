import { cn } from "~/lib/utils";
import type { UIState } from "~/types";

export default function GameUi({
  uiState,
  children,
  statusMessage,
}: Readonly<{
  uiState: UIState;
  children?: React.ReactNode;
  statusMessage?: string;
}>) {
  return (
    <div
      className={cn(
        "absolute inset-4 grid place-items-center",
        uiState.isGameOver || uiState.isPaused
          ? "opacity-100"
          : "pointer-events-none opacity-0",
      )}
    >
      <div className="text-center">
        <p
          className={cn(
            children ? "mb-8" : "mb-32",
            "text-shadow text-5xl leading-14 font-bold text-shadow-[0_0_4px_var(--background),0_0_8px_var(--background)]",
          )}
        >
          {uiState.isGameOver ? <span>GAME OVER</span> : <span>PAUSED</span>}
        </p>
        {statusMessage && <p className="my-8">{statusMessage}</p>}
        {children}
      </div>
    </div>
  );
}
