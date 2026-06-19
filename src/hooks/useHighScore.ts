"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  HighScoreResponse,
  PersonalHighScore,
  SubmitHighScoreResponse,
} from "~/types";
import {
  highScoreResponseSchema,
  submitHighScoreResponseSchema,
} from "~/lib/highScoreSchemas";

async function fetchHighScore(
  signal?: AbortSignal,
): Promise<HighScoreResponse> {
  const response = await fetch("/api/high-score", { signal });

  if (!response.ok) {
    throw new Error("Failed to load high score");
  }

  const json: unknown = await response.json();

  return highScoreResponseSchema.parse(json);
}

async function postHighScore(score: number): Promise<SubmitHighScoreResponse> {
  const response = await fetch("/api/high-score", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ score }),
  });

  if (!response.ok) {
    throw new Error("Failed to save high score");
  }

  const json: unknown = await response.json();

  return submitHighScoreResponseSchema.parse(json);
}

type ProcessState = {
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
};

export function useHighScore() {
  const [highScore, setHighScore] = useState<PersonalHighScore | null>(null);
  const [achievedNewHighScore, setAchievedNewHighScore] = useState(false);
  const [processState, setProcessState] = useState<ProcessState>({
    isLoading: true,
    isSubmitting: false,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadHighScore() {
      try {
        const data = await fetchHighScore(controller.signal);
        setHighScore(data.highScore);
      } catch {
        if (controller.signal.aborted) return;

        setProcessState((prev) => ({
          ...prev,
          error: "Couldn't load high score",
        }));
      } finally {
        if (!controller.signal.aborted)
          setProcessState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    void loadHighScore();

    return () => controller.abort();
  }, []);

  const submitScore = useCallback(async (score: number) => {
    setProcessState((prev) => ({ ...prev, isSubmitting: true, error: null }));

    try {
      const data = await postHighScore(score);
      setHighScore(data.highScore);
      setAchievedNewHighScore(data.achievedNewHighScore);
      return data;
    } catch {
      setProcessState((prev) => ({
        ...prev,
        error: "Couldn't save high score",
      }));
      return null;
    } finally {
      setProcessState((prev) => ({ ...prev, isSubmitting: false }));
    }
  }, []);

  const resetHighScoreStatus = useCallback(() => {
    setAchievedNewHighScore(false);
    setProcessState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    highScore,
    processState,
    submitScore,
    achievedNewHighScore,
    resetHighScoreStatus,
  };
}
