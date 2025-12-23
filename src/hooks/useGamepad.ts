import { useState, useEffect, useRef } from "react";
import { GAMEPAD_KEY_MAP } from "~/constants";
import type { GamepadState } from "~/types";
import { getTimestamp } from "~/lib/utils";

// Constants for repeat behavior (similar to keyboard)
const INITIAL_REPEAT_DELAY = 700; // ms before first repeat
const REPEAT_INTERVAL = 50; // ms between repeats

export function useGamepad() {
  const gamepadStateRef = useRef<GamepadState>({
    previousBtnStates: Array.from({ length: 17 }, () => false),
  });
  // Track timers for each button to implement repeat
  const buttonTimersRef = useRef<
    Array<{ firstPress: number; lastRepeat: number } | null>
  >(Array.from({ length: 17 }, () => null));
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
      buttonTimersRef.current = Array.from({ length: 17 }, () => null);
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

  // poll gamepad and dispatch keyboard events with repeat
  useEffect(() => {
    if (!gamepadConnected) return;

    let animationFrameId: number;

    // prettier-ignore
    function pollAndDispatch() { // NOSONAR
      const gamepads = navigator.getGamepads();
      const activeGamepad = gamepads.find(Boolean);
      if (!activeGamepad || !gamepadStateRef.current) {
        animationFrameId = requestAnimationFrame(pollAndDispatch);
        return;
      }

      const gamepadState = gamepadStateRef.current;
      const currentTime = getTimestamp();

      for (const [index, button] of activeGamepad.buttons.entries()) {
        const keyCode = GAMEPAD_KEY_MAP[index as keyof typeof GAMEPAD_KEY_MAP];
        if (!keyCode) continue;

        const isPressed = button.pressed;
        const wasPressed = gamepadState.previousBtnStates[index];

        // Button just pressed - dispatch initial keydown and start timer
        if (isPressed && !wasPressed) {
          buttonTimersRef.current[index] = {
            firstPress: currentTime,
            lastRepeat: currentTime,
          };
          const event = new KeyboardEvent("keydown", {
            code: keyCode,
            key: keyCode,
            bubbles: true,
            cancelable: true,
          });
          globalThis.dispatchEvent(event);
        }

        // Button is being held - dispatch repeated keydown events
        if (isPressed && wasPressed && buttonTimersRef.current[index]) {
          const timer = buttonTimersRef.current[index];
          const holdDuration = currentTime - timer.firstPress;
          const timeSinceLastRepeat = currentTime - timer.lastRepeat;

          // After initial delay, dispatch repeats at regular intervals
          if (
            holdDuration >= INITIAL_REPEAT_DELAY &&
            timeSinceLastRepeat >= REPEAT_INTERVAL
          ) {
            timer.lastRepeat = currentTime;
            const event = new KeyboardEvent("keydown", {
              code: keyCode,
              key: keyCode,
              bubbles: true,
              cancelable: true,
            });
            globalThis.dispatchEvent(event);
          }
        }

        // Button just released - dispatch keyup and clear timer
        if (!isPressed && wasPressed) {
          buttonTimersRef.current[index] = null;
          const event = new KeyboardEvent("keyup", {
            code: keyCode,
            key: keyCode,
            bubbles: true,
            cancelable: true,
          });
          globalThis.dispatchEvent(event);
        }

        gamepadState.previousBtnStates[index] = isPressed;
      }
      animationFrameId = requestAnimationFrame(pollAndDispatch);
    }
    animationFrameId = requestAnimationFrame(pollAndDispatch);

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [gamepadConnected]);

  return {
    gamepadConnected,
  };
}
