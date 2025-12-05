"use client";

import { useCallback, useRef } from "react";
import { TETRAMINO_BAG } from "~/constants";
import { shuffleArray } from "~/lib/utils";
import type { TetrominoType, NextPiece } from "~/types";

// generator function for the 7-bag randomizer method
// (I've been JS-ing for nearly 10 years and have literally never used a generator before)
function* randomTetrominoGenerator() {
  let bag: TetrominoType[] = [];

  while (true) {
    if (bag.length === 0) {
      bag = [...TETRAMINO_BAG];
      bag = shuffleArray(bag);
    }
    yield bag.pop()!;
  }
}

export function useBag() {
  const generatorRef = useRef<Generator<TetrominoType, void, unknown> | null>(
    null,
  );
  const previewRef = useRef<TetrominoType | null>(null);

  if (!generatorRef.current) {
    generatorRef.current = randomTetrominoGenerator();
    previewRef.current = generatorRef.current.next().value as TetrominoType;
  }

  const getNextPiece = useCallback((): NextPiece => {
    if (!generatorRef.current || !previewRef.current) {
      throw new Error("Piece generator is not initialized");
    }
    const currentPiece = previewRef.current;
    const nextPreview = generatorRef.current.next().value as TetrominoType;
    previewRef.current = nextPreview;

    return { piece: currentPiece, preview: nextPreview };
  }, []);

  return getNextPiece;
}
