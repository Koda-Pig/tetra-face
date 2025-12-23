import { useState, useCallback, useRef, useEffect } from "react";
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
  const canvasFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scoreLevelFlashTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const syncUIState = useCallback((gameState: GameState) => {
    setUiState((prev) => {
      const scoreChanged = prev.score !== gameState.score;
      const levelChanged = prev.level !== gameState.level;
      const linesCleared = gameState.linesCleared - prev.prevLinesCleared;

      const newState = {
        isGameOver: gameState.isGameOver,
        score: gameState.score,
        level: gameState.level,
        scoreFlash: scoreChanged,
        levelFlash: levelChanged,
        // score or level change will trigger canvas flash (and a level change always includes a score change)
        canvasFlash: scoreChanged,
        scoreMultiplier: linesCleared,
        prevLinesCleared: gameState.linesCleared,
        previewPiece: gameState.previewPiece,
      };

      // remove flash after animation
      if (scoreChanged || levelChanged) {
        if (scoreLevelFlashTimeoutRef.current) {
          clearTimeout(scoreLevelFlashTimeoutRef.current);
          scoreLevelFlashTimeoutRef.current = null;
        }
        scoreLevelFlashTimeoutRef.current = setTimeout(() => {
          setUiState((prev) => ({
            ...prev,
            scoreFlash: false,
            levelFlash: false,
          }));
          scoreLevelFlashTimeoutRef.current = null;
        }, FLASH_TRANSITION_DURATION_MS);
      }

      if (scoreChanged) {
        if (canvasFlashTimeoutRef.current) {
          clearTimeout(canvasFlashTimeoutRef.current);
          canvasFlashTimeoutRef.current = null;
        }
        canvasFlashTimeoutRef.current = setTimeout(() => {
          setUiState((prev) => ({
            ...prev,
            canvasFlash: false,
            scoreMultiplier: 0,
          }));
          canvasFlashTimeoutRef.current = null;
        }, CANVAS_ANIMATION_DURATION_MS);
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

  useEffect(() => {
    return () => {
      if (scoreLevelFlashTimeoutRef.current) {
        clearTimeout(scoreLevelFlashTimeoutRef.current);
        scoreLevelFlashTimeoutRef.current = null;
      }
      if (canvasFlashTimeoutRef.current) {
        clearTimeout(canvasFlashTimeoutRef.current);
        canvasFlashTimeoutRef.current = null;
      }
    };
  }, []);

  return { uiState, setUiState, syncUIState };
}
