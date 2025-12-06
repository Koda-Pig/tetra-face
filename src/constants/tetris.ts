import type { GameState, Tetromino, TetrominoType, UIState } from "~/types";

export const COLS = 10;
export const TOTAL_ROWS = 40;
// The main playfield players see and play on
export const VISIBLE_ROWS = 20;
// Buffer zone above the visible area for piece spawning (rows 21-22) and garbage protection
// prevents immediate game over when receiving up to 20 garbage lines in multiplayer.
// see: https://tetris.wiki/Playfield
export const HIDDEN_ROWS = TOTAL_ROWS - VISIBLE_ROWS;
export const SPAWN_ROW_I = 19; // I piece spawns at row 20 (board array index 19, tetris row 20)
export const SPAWN_ROW_OTHER = 18; // all others spawn at 21
export const PIECE_SIZE = 4;
export const FILLED_CELL = 1;
export const GAME_INPUT_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "KeyZ",
  "ShiftLeft",
  "ShiftRight",
  "Escape",
];
// use values same as GAME_INPUT_KEYS so that the function can be reused for the existing
// keydown handler
export const GAMEPAD_KEY_MAP = {
  // Face buttons (right cluster)
  0: "Space", // Bottom button (Xbox: A, PlayStation: Cross, Nintendo: B)
  1: "KeyZ", // Right button (Xbox: B, PlayStation: Circle, Nintendo: A)
  // 2: "", // Left button (Xbox: X, PlayStation: Square, Nintendo: Y)
  3: "ShiftLeft", // Top button (Xbox: Y, PlayStation: Triangle, Nintendo: X)

  // Shoulder buttons
  4: "KeyZ", // Top left front button (L1/LB)
  5: "Space", // Top right front button (R1/RB)
  // 6: "", // Bottom left front button (L2/LT)
  // 7: "", // Bottom right front button (R2/RT)

  // Center cluster buttons
  // 8: "", // Left button in center cluster (Back/Select/Share)
  9: "Escape", // Right button in center cluster (Start/Menu/Options)
  // 10: "", // Left stick pressed button (L3/LS)
  // 11: "", // Right stick pressed button (R3/RS)

  // D-pad (left cluster)
  12: "ArrowUp", // Top button in left cluster (D-pad up)
  13: "ArrowDown", // Bottom button in left cluster (D-pad down)
  14: "ArrowLeft", // Left button in left cluster (D-pad left)
  15: "ArrowRight", // Right button in left cluster (D-pad right)

  // Center button (if present)
  // 16: "", // Center button in center cluster (Home/Guide/PS)
} as const;

// prettier-ignore
export const TETRAMINO_BAG: TetrominoType[] = ["I", "J", "L", "O", "S", "Z", "T"];

export const TETRAMINOS: Record<TetrominoType, Tetromino> = {
  I: {
    rotations: [
      // 0° (spawn state)
      [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 90° (R state)
      [
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 1, 0],
      ],
      // 180° (2 state)
      [
        [0, 0, 0, 0],
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
      ],
      // 270° (L state)
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
      ],
    ],
    color: "#8CE4FF",
  },
  J: {
    rotations: [
      // 0°
      [
        [1, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 90°
      [
        [0, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      // 180°
      [
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 0],
      ],
      // 270°
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    color: "#0F4C75",
  },
  L: {
    rotations: [
      // 0°
      [
        [0, 0, 1, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 90°
      [
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
      ],
      // 180°
      [
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 270°
      [
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    color: "#FF6C0C",
  },
  O: {
    rotations: [
      // 0° (all rotations are the same for O piece)
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 90° (same)
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 180° (same)
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 270° (same)
      [
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    color: "yellow",
  },
  S: {
    rotations: [
      // 0°
      [
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 90°
      [
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 0],
      ],
      // 180°
      [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [1, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      // 270°
      [
        [1, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    color: "green",
  },
  Z: {
    rotations: [
      // 0°
      [
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 90°
      [
        [0, 0, 1, 0],
        [0, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      // 180°
      [
        [0, 0, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
      ],
      // 270°
      [
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [1, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    color: "#FF5656",
  },
  T: {
    rotations: [
      // 0°
      [
        [0, 1, 0, 0],
        [1, 1, 1, 0],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
      // 90°
      [
        [0, 1, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      // 180°
      [
        [0, 0, 0, 0],
        [1, 1, 1, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
      // 270°
      [
        [0, 1, 0, 0],
        [1, 1, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 0, 0],
      ],
    ],
    color: "#8C00FF",
  },
};

// Wall kick data
// Note that there are two sets of wall kick data:
// one set is for the I piece, and the other set is for all the other pieces.
// reason for this is that the I piece has a unique rotation behavior that requires a different set of wall kick data.
// more info here: https://tetris.wiki/Wall_kick

// Wall kick data for most pieces (JLSTZ) source: https://tetris.wiki/Super_Rotation_System
export const WALL_KICK_DATA_JLSTZ: Record<
  number,
  Record<number, [number, number][]>
> = {
  // prettier-ignore
  0: {
    1: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]], // 0→R
    3: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]]     // 0→L
  },
  // prettier-ignore
  1: {
    0: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],     // R→0
    2: [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]]      // R→2
  },
  // prettier-ignore
  2: {
    1: [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],    // 2→R
    3: [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]]  // 2→L
  },
  // prettier-ignore
  3: {
    2: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],  // L→2
    0: [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]]   // L→0
  },
};

// Wall kick data for I piece
export const WALL_KICK_DATA_I: Record<
  number,
  Record<number, [number, number][]>
> = {
  // prettier-ignore
  0: {
    1: [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],   // 0→R
    3: [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]    // 0→L
  },
  // prettier-ignore
  1: {
    0: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]],   // R→0
    2: [[0, 0], [-1, 0], [2, 0], [-1, 2], [2, -1]]    // R→2
  },
  // prettier-ignore
  2: {
    1: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]],   // 2→R
    3: [[0, 0], [2, 0], [-1, 0], [2, 1], [-1, -2]]    // 2→L
  },
  // prettier-ignore
  3: {
    2: [[0, 0], [-2, 0], [1, 0], [-2, -1], [1, 2]],   // L→2
    0: [[0, 0], [1, 0], [-2, 0], [1, -2], [-2, 1]]    // L→0
  },
};

export const FLASH_TRANSITION_DURATION_MS = 300;
export const CANVAS_ANIMATION_DURATION_MS = 600;

export const INITIAL_GAME_STATE: Omit<
  GameState,
  "currentPiece" | "previewPiece" | "dropIntervalSeconds" | "board" | "userId"
> = {
  dropTimer: 0,
  linesCleared: 0,
  score: 0,
  isGameOver: false,
  level: 0,
  holdPiece: null,
  canHold: true,
  pendingGarbage: null,
};

export const LINE_CLEAR_SCORES = {
  0: 0,
  1: 100,
  2: 300,
  3: 500,
  4: 800,
};
export const GARBAGE_LINES = {
  1: 0,
  2: 1,
  3: 2,
  4: 4,
};

export const LINES_PER_LEVEL = 10;

export const INITIAL_UI_STATE: UIState = {
  isGameOver: false,
  score: 0,
  scoreFlash: false,
  levelFlash: false,
  canvasFlash: false,
  level: 0,
  isPaused: false,
  holdPiece: null,
  previewPiece: null,
  scoreMultiplier: 0,
  prevLinesCleared: 0,
};

export const INITIAL_ANIMATION_LOOP = {
  now: 0,
  animationId: null,
  lastTime: 0,
  deltaTime: 0,
  step: 1 / 60,
};

export const GARBAGE_COLOR = "#808080";
