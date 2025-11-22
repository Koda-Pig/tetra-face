"use client";

import { useCallback, useEffect, useRef } from "react";
import { TETRAMINO_BAG } from "~/constants";
import { shuffleArray } from "~/lib/utils";
import type { TetrominoType } from "~/types";

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

  useEffect(() => {
    generatorRef.current ??= randomTetrominoGenerator(); // initialize the generator if it's not already initialized
  }, []);

  const getNextPiece = useCallback((): TetrominoType => {
    if (!generatorRef.current) {
      throw new Error("Piece generator is not initialized");
    }

    const result = generatorRef.current.next();
    return result.value as TetrominoType;
  }, []);

  return getNextPiece;
}
