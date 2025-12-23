import { useState, useEffect, useRef } from "react";
import type { GamepadState } from "~/types";

export function useGamepad() {
  const gamepadStateRef = useRef<GamepadState>({
    previousBtnStates: Array.from({ length: 17 }, () => false), // gamepads have 17 buttons
  });
  const [gamepadConnected, setGamepadConnected] = useState(false);

  // Check for already-connected gamepads on mount
  useEffect(() => {
    const gamepads = navigator.getGamepads();
    const hasConnectedGamepad = Array.from(gamepads).some(
      (gamepad) => gamepad?.connected,
    );
    if (hasConnectedGamepad) setGamepadConnected(true);
  }, []);

  // Event listeners for gamepad connection/disconnection
  useEffect(() => {
    const handleGamepadConnected = () => setGamepadConnected(true);
    const handleGamepadDisconnected = () => {
      setGamepadConnected(false);
      gamepadStateRef.current.previousBtnStates.fill(false);
    };

    globalThis.addEventListener("gamepadconnected", handleGamepadConnected);
    globalThis.addEventListener(
      "gamepaddisconnected",
      handleGamepadDisconnected,
    );

    return () => {
      globalThis.removeEventListener(
        "gamepadconnected",
        handleGamepadConnected,
      );
      globalThis.removeEventListener(
        "gamepaddisconnected",
        handleGamepadDisconnected,
      );
    };
  }, []);

  return {
    gamepadConnected,
    gamepadStateRef,
  };
}
