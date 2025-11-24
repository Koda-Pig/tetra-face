"use client";

import { useState, useCallback, useRef } from "react";
import type { TetrominoType } from "~/types";

// instead of generating random pieces, game gets pieces generated from opponent
export function useOpponentPieces() {
  const pieceQueRef = useRef<TetrominoType[]>([]);
  const [hasPieces, setHasPieces] = useState(false);

  const getNextPiece = useCallback((): TetrominoType => {
    const nextPiece = pieceQueRef.current.shift();
    if (!nextPiece) {
      setHasPieces(false);
      throw new Error("no piece available - waiting for host");
    }

    return nextPiece;
  }, []);

  const addPiece = useCallback((pieceType: TetrominoType) => {
    pieceQueRef.current.push(pieceType);
    setHasPieces(true);
  }, []);

  return { getNextPiece, addPiece, hasPieces };
}
