"use client";

import BaseGame from "./baseGame";
import { forwardRef, useImperativeHandle, useRef } from "react";

interface OpponentGameRef {
  handleKeyPress: (keyCode: string) => void;
}

const OpponentGame = forwardRef<OpponentGameRef, { userId: string }>(
  ({ userId }, ref) => {
    const baseGameRef = useRef<{ handleKeyPress: (keyCode: string) => void }>(
      null,
    );

    useImperativeHandle(
      ref,
      () => ({
        handleKeyPress: (keyCode: string) => {
          baseGameRef.current?.handleKeyPress(keyCode);
        },
      }),
      [],
    );

    return (
      <div className="pointer-events-none">
        <BaseGame userId={userId} ref={baseGameRef} />
      </div>
    );
  },
);

OpponentGame.displayName = "OpponentGame";
export default OpponentGame;
