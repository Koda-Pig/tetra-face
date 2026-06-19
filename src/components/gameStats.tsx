import { TETRAMINOS, FLASH_TRANSITION_DURATION_MS } from "~/constants";
import type { PersonalHighScore, UIState } from "~/types";
import { cn } from "~/lib/utils";

const gameStatClasses =
  "game-stat font-xl z-10 grid aspect-square h-20 w-20 place-items-center rounded-lg rounded-tr-none rounded-br-none border-2 border-r-0 border-(--retro-green) bg-black px-2 py-1 text-center text-xl";

export default function GameStats({
  uiState,
  highScore,
}: Readonly<{ uiState: UIState; highScore?: PersonalHighScore | null }>) {
  const showHighScore = highScore !== undefined;

  return (
    <div className="absolute top-4 left-0 flex -translate-x-full flex-col gap-4">
      <div className={gameStatClasses}>
        <p className="font-heading text-sm">HOLD</p>
        <div className="relative grid h-10 w-10 place-items-center">
          <div
            className={cn(
              "ui-tetro absolute h-2.5 w-2.5 bg-[currentColor] duration-200",
              uiState.holdPiece,
            )}
            style={{
              color: uiState.holdPiece
                ? TETRAMINOS[uiState.holdPiece].color
                : "transparent",
            }}
          />
        </div>
      </div>
      <div className={cn(gameStatClasses)}>
        <p className="font-heading text-sm">NEXT</p>
        <div className="relative grid h-10 w-10 place-items-center">
          <div
            className={cn(
              "ui-tetro absolute h-2.5 w-2.5 bg-[currentColor] duration-200",
              uiState.previewPiece,
            )}
            style={{
              color: uiState.previewPiece
                ? TETRAMINOS[uiState.previewPiece].color
                : "transparent",
            }}
          />
        </div>
      </div>
      {showHighScore && (
        <div
          style={{
            transitionDuration: `${FLASH_TRANSITION_DURATION_MS}ms`,
          }}
          className={cn(gameStatClasses)}
        >
          <p className="font-heading text-sm">high score</p>
          <p className="value font-heading text-xl">
            {highScore?.score ?? "--"}
          </p>
        </div>
      )}
      <div
        style={{
          transitionDuration: `${FLASH_TRANSITION_DURATION_MS}ms`,
        }}
        className={cn(gameStatClasses, uiState.scoreFlash && "game-stat-flash")}
      >
        <p className="font-heading text-sm">score</p>
        <p className="value font-heading text-xl">{uiState.score}</p>
      </div>
      <div
        style={{
          transitionDuration: `${FLASH_TRANSITION_DURATION_MS}ms`,
        }}
        className={cn(gameStatClasses, uiState.levelFlash && "game-stat-flash")}
      >
        <p className="font-heading text-sm">level</p>
        <p className="value font-heading text-xl">{uiState.level + 1}</p>
      </div>
    </div>
  );
}
