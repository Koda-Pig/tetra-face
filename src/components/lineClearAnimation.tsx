import {
  CELL_SIZE,
  COLS,
  HIDDEN_ROWS,
  VISIBLE_ROWS,
  LINE_CLEAR_ANIMATION_DURATION_MS,
} from "~/constants";
import type { UIState } from "~/types";

function LineAnimation({
  colors,
  cellSize,
}: Readonly<{
  colors: string[];
  cellSize: number;
}>) {
  return (
    <div className="flex gap-px">
      {colors.map((color, index) => (
        <span
          key={`${color}-${index}`}
          style={{
            color: color,
            backgroundColor: color,
            width: `${cellSize}px`,
            height: `${cellSize - 1}px`, // minus 1 to create spacing between
          }}
        />
      ))}
    </div>
  );
}

export default function LineClearAnimation({
  uiState,
}: Readonly<{ uiState: UIState }>) {
  const actualSize = CELL_SIZE - 1; // minus border width

  const { lineClearSnapshots } = uiState;

  if (!lineClearSnapshots) return null;

  return (
    <>
      {lineClearSnapshots.map((animation) =>
        animation.snapshots.map((snapshot, snapshotIndex) => {
          const colors = snapshot.cells.map((cell) => cell.color!); // we know color is defined here because its a filled cell
          const canvasRow = snapshot.originalRowIndex - HIDDEN_ROWS;
          // Calculate rows from bottom (0 = bottom row, 19 = top row)
          const rowsFromBottom = VISIBLE_ROWS - canvasRow - 1;

          return (
            <div
              key={`${animation.id}-${snapshotIndex}`}
              style={{
                bottom: `${rowsFromBottom * actualSize + 2}px`,
                width: `${CELL_SIZE * COLS}px`,
                animationDuration: `${LINE_CLEAR_ANIMATION_DURATION_MS}ms`,
              }}
              className="line-clear-animation absolute right-0 left-[2.5px] flex flex-col gap-px"
            >
              <LineAnimation colors={colors} cellSize={actualSize} />
            </div>
          );
        }),
      )}
    </>
  );
}
