import { useState, useCallback, useRef } from "react";
import type { GameState, UIState } from "~/types";
import {
  FLASH_TRANSITION_DURATION_MS,
  CANVAS_ANIMATION_DURATION_MS,
  INITIAL_UI_STATE,
  LINE_CLEAR_ANIMATION_DURATION_MS,
} from "~/constants";
import { getTimestamp } from "~/lib/utils";

export function useUIState() {
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE);
  const animationIdRef = useRef(0);

  const syncUIState = useCallback((gameState: GameState) => {
    setUiState((prev) => {
      const scoreChanged = prev.score !== gameState.score;
      const levelChanged = prev.level !== gameState.level;
      const performCanvasFlash = scoreChanged || levelChanged;
      const linesCleared = gameState.linesCleared - prev.prevLinesCleared;

      const newState = {
        isGameOver: gameState.isGameOver,
        score: gameState.score,
        level: gameState.level,
        scoreFlash: prev.score !== gameState.score,
        levelFlash: prev.level !== gameState.level,
        canvasFlash: scoreChanged || levelChanged,
        scoreMultiplier: linesCleared,
        prevLinesCleared: gameState.linesCleared,
        previewPiece: gameState.previewPiece,
      };

      // remove flash after animation
      if (scoreChanged || levelChanged) {
        setTimeout(
          () =>
            setUiState((prev) => ({
              ...prev,
              scoreFlash: false,
              levelFlash: false,
            })),
          FLASH_TRANSITION_DURATION_MS,
        );
      }

      if (performCanvasFlash) {
        setTimeout(
          () => setUiState((prev) => ({ ...prev, canvasFlash: false })),
          CANVAS_ANIMATION_DURATION_MS,
        );
      }

      if (linesCleared && gameState.lineClearSnapshots) {
        const animationId = animationIdRef.current++;
        const startTime = getTimestamp();

        // schedule animation instance to be removed
        setTimeout(() => {
          setUiState((prev) => ({
            ...prev,
            lineClearSnapshots: prev.lineClearSnapshots.filter(
              (animation) => animation.id !== animationId,
            ),
          }));
        }, LINE_CLEAR_ANIMATION_DURATION_MS);

        return {
          ...prev,
          ...newState,
          lineClearSnapshots: [
            ...prev.lineClearSnapshots,
            {
              id: animationId,
              snapshots: gameState.lineClearSnapshots,
              startTime,
            },
          ],
        };
      }

      return {
        ...prev,
        ...newState,
      };
    });
  }, []);

  return { uiState, setUiState, syncUIState };
}
