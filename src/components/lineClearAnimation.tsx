import type {
  LineClearAnimation as LineClearAnimationType,
  UIState,
} from "~/types";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  HIDDEN_ROWS,
  COLS,
  VISIBLE_ROWS,
} from "~/constants";

type LineClearAnimationProps = {
  animation: LineClearAnimationType | null;
  uiState: UIState;
};

const cellWidth = CANVAS_WIDTH / COLS;
const cellHeight = CANVAS_HEIGHT / VISIBLE_ROWS;

// make use of the scoreMultiplier to determine how many rows to animate
export default function LineClearAnimation({
  animation,
  uiState,
}: LineClearAnimationProps) {
  if (!animation) return null;

  return (
    <div className="pointer-events-none absolute top-0 left-0 z-10">
      {animation.rowSnapshots.map((snapshot, index) => {
        const visualRowPosition =
          (snapshot.originalRowIndex - HIDDEN_ROWS) * cellHeight;

        return (
          <div
            key={`${snapshot.originalRowIndex}-${index}`}
            className="absolute"
            style={{
              top: `${visualRowPosition}px`, // this still sets them all to the same position. something is wrong here.
              left: 0,
              width: `${cellWidth * COLS}px`,
              height: `${cellHeight}px`,
            }}
          >
            {/* Left half (cols 0-4) */}
            <div
              className="line-clear-row-left absolute left-0 flex h-full"
              style={{ width: `${cellWidth * 5}px` }}
            >
              {snapshot.cells.slice(0, 5).map((cell, col) => (
                <div
                  key={col}
                  className="box-border h-full border border-[#151d15]"
                  style={{
                    width: `${cellWidth}px`,
                    backgroundColor: cell.occupied
                      ? (cell.color ?? "transparent")
                      : "transparent",
                  }}
                />
              ))}
            </div>
            {/* Right half (cols 5-9) */}
            <div
              className="line-clear-row-right absolute flex h-full"
              style={{
                left: `${cellWidth * 5}px`,
                width: `${cellWidth * 5}px`,
              }}
            >
              {snapshot.cells.slice(5, 10).map((cell, col) => (
                <div
                  key={col + 5}
                  className="box-border h-full border border-[#151d15]"
                  style={{
                    width: `${cellWidth}px`,
                    backgroundColor: cell.occupied
                      ? (cell.color ?? "transparent")
                      : "transparent",
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
