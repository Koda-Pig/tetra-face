import { useState, useCallback } from "react";
import type { GameState, UIState } from "~/types";
import {
  FLASH_TRANSITION_DURATION_MS,
  CANVAS_ANIMATION_DURATION_MS,
  INITIAL_UI_STATE,
} from "~/constants";

export function useUIState() {
  const [uiState, setUiState] = useState<UIState>(INITIAL_UI_STATE);

  const syncUIState = useCallback((gameState: GameState) => {
    setUiState((prev) => {
      const scoreChanged = prev.score !== gameState.score;
      const levelChanged = prev.level !== gameState.level;
      const performCanvasFlash = scoreChanged || levelChanged;
      const linesCleared = gameState.linesCleared - prev.prevLinesCleared;

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
          () =>
            setUiState((prev) => ({
              ...prev,
              canvasFlash: false,
            })),
          CANVAS_ANIMATION_DURATION_MS,
        );
      }

      return {
        ...prev,
        isGameOver: gameState.isGameOver,
        score: gameState.score,
        level: gameState.level,
        scoreFlash: prev.score !== gameState.score,
        levelFlash: prev.level !== gameState.level,
        canvasFlash: scoreChanged || levelChanged,
        scoreMultiplier: linesCleared,
        prevLinesCleared: gameState.linesCleared,
      };
    });
  }, []);

  return { uiState, setUiState, syncUIState };
}
