import { TETRAMINOS, FLASH_TRANSITION_DURATION_MS } from "~/constants";
import type { UIState } from "~/types";
import { cn } from "~/lib/utils";

const gameStatClasses =
  "game-stat font-xl absolute top-4 left-0 z-10 grid aspect-square h-20 w-20 -translate-x-full place-items-center rounded-lg rounded-tr-none rounded-br-none border-2 border-r-0 border-(--retro-green) bg-black px-2 py-1 text-center text-xl";

export default function GameStats({ uiState }: { uiState: UIState }) {
  return (
    <>
      <div className={gameStatClasses}>
        <p className="font-heading text-sm">HOLD</p>
        <div className="relative grid h-10 w-10 place-items-center">
          <div
            className={cn("hold-tetro", uiState.holdPiece)}
            style={{
              color: uiState.holdPiece
                ? TETRAMINOS[uiState.holdPiece].color
                : "transparent",
            }}
          />
        </div>
      </div>
      <div
        style={{
          transitionDuration: `${FLASH_TRANSITION_DURATION_MS}ms`,
        }}
        className={cn(
          gameStatClasses,
          "top-26",
          uiState.scoreFlash && "game-stat-flash",
        )}
      >
        <p className="font-heading text-sm">score</p>
        <p className="value font-heading text-xl">{uiState.score}</p>
      </div>
      <div
        style={{
          transitionDuration: `${FLASH_TRANSITION_DURATION_MS}ms`,
        }}
        className={cn(
          gameStatClasses,
          "top-48",
          uiState.levelFlash && "game-stat-flash",
        )}
      >
        <p className="font-heading text-sm">level</p>
        <p className="value font-heading text-xl">{uiState.level + 1}</p>
      </div>
    </>
  );
}
