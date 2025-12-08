---
name: Horizontal Slide Line Clear Animation
overview: Add horizontal slide-out animation for cleared lines. Rows are removed from board immediately (as before), but snapshots are stored before removal to render the animation effect.
todos:
  - id: add-animation-types
    content: Add LineClearAnimation type with rowSnapshots array in tetris.d.ts
    status: completed
  - id: add-animation-constant
    content: Add LINE_CLEAR_ANIMATION_DURATION constant to tetris.ts
    status: completed
  - id: create-component
    content: Create LineClearAnimation React component in lineClearAnimation.tsx
    status: completed
  - id: add-css-animations
    content: Add CSS keyframes and classes for slide-out-left and slide-out-right animations
    status: completed
  - id: add-gamestate-property
    content: Add lineClearAnimation property to GameState type definition in tetris.d.ts
    status: pending
  - id: initialize-gamestate
    content: Initialize lineClearAnimation: null in INITIAL_GAME_STATE constant
    status: pending
  - id: modify-clear-lines
    content: Modify clearLines to store snapshots of rows before removing them, return snapshots with original row indices (change return type from number to Array)
    status: pending
  - id: add-animation-update
    content: Create updateLineClearAnimation function to track progress and clear animation state when complete
    status: pending
  - id: update-lock-piece
    content: Modify lockPieceAndSpawnNext to initialize lineClearAnimation with row snapshots when lines are cleared
    status: pending
  - id: integrate-render-loop
    content: Call updateLineClearAnimation in render/animate functions before drawing
    status: pending
  - id: wire-gameboard-props
    content: Add lineClearAnimation prop to GameBoard component and pass it to LineClearAnimation component
    status: pending
  - id: wire-game-components
    content: Pass lineClearAnimation from gameStateRef.current to GameBoard in singlePlayerGame.tsx and hostGame.tsx
    status: pending
  - id: fix-hardcoded-widths
    content: Replace hard-coded w-[150px] and left-[150px] in lineClearAnimation.tsx (lines 46, 61) with dynamic values using cellWidth constant
    status: pending
  - id: fix-positioning-bug
    content: Fix row positioning issue mentioned in lineClearAnimation.tsx line 39 comment - verify visualRowPosition calculation is correct
    status: pending
  - id: verify-build
    content: Run TypeScript build to ensure no type errors and all exports/imports are valid
    status: pending
  - id: audit-unused-code
    content: Verify all new properties, functions, and constants are used and not duplicated
    status: pending
---

# Horizontal Slide-Out Line Clear Animation

## Current Implementation Status

### ✅ Completed

1. **Type Definition**: `LineClearAnimation` type exists in `src/types/tetris.d.ts` (lines 134-141) with all required fields
2. **Constant**: `LINE_CLEAR_ANIMATION_DURATION = 0.3` exists in `src/constants/tetris.ts` (line 358)
3. **React Component**: `LineClearAnimation` component exists in `src/components/lineClearAnimation.tsx` with correct structure
4. **CSS Animations**: All CSS keyframes and classes exist in `src/styles/globals.css`:
   - `@keyframes slide-out-left` (lines 342-351)
   - `@keyframes slide-out-right` (lines 353-362)
   - `.line-clear-row-left` class (lines 364-367)
   - `.line-clear-row-right` class (lines 369-372)
5. **Component Integration**: `LineClearAnimation` is imported and rendered in `GameBoard` component (line 35)

### ❌ Not Yet Implemented

1. **GameState Property**: `lineClearAnimation` property is NOT added to `GameState` type (still missing from lines 32-46 in tetris.d.ts)
2. **Initial State**: `lineClearAnimation: null` is NOT initialized in `INITIAL_GAME_STATE`
3. **clearLines Function**: Still returns `number` instead of row snapshots (lines 324-343 in gameUtils.ts)
4. **updateLineClearAnimation Function**: Does NOT exist in gameUtils.ts
5. **lockPieceAndSpawnNext**: Does NOT initialize `lineClearAnimation` when lines are cleared (line 213 still calls `clearLines` which returns number)
6. **Render Loop Integration**: `updateLineClearAnimation` is NOT called in render/animate functions
7. **GameBoard Props**: `GameBoard` does NOT accept or pass `animation` prop to `LineClearAnimation` component
8. **Game Component Wiring**: `singlePlayerGame.tsx` and `hostGame.tsx` do NOT pass `lineClearAnimation` from `gameStateRef.current` to `GameBoard`

### 🐛 Known Issues

1. **Hard-coded Widths**: Lines 46 and 61 in `lineClearAnimation.tsx` use hard-coded `w-[150px]` and `left-[150px]` instead of dynamic `cellWidth * 5`
2. **Positioning Bug**: Line 39 comment indicates a suspected bug: "this still sets them all to the same position. something is wrong here."
3. **Missing Animation Prop**: `LineClearAnimation` component expects `animation` prop but `GameBoard` only passes `uiState` (line 35 of gameBoard.tsx)

### Original Implementation

The `clearLines` function in [`src/components/gameUtils.ts`](src/components/gameUtils.ts) (lines 324-343) immediately removes full rows using `splice` and `unshift`. The `render` function draws the board directly from `gameState.board`.

## Animation Approach: Non-Blocking Horizontal Slide

The animation runs **in parallel with gameplay** - pieces continue falling and spawning while lines slide out visually. Key design:

1. **Immediate Row Removal**: Lines are removed from the board array immediately (as current implementation)
2. **Row Snapshot Storage**: Before removing rows, store a snapshot of the row data (cells with colors) for rendering
3. **Visual Animation State**: Track which rows are cleared and store the snapshot data for rendering
4. **Continuous Gameplay**: No pausing - game logic proceeds normally while animation renders
5. **HTML/CSS Overlay Animation**: Use positioned div elements (not canvas) to allow blocks to slide off-screen

## Horizontal Slide-Out Details

### Animation Behavior

- Lines slide horizontally off screen over 300ms duration
- **Split direction**: Left half of each line (cols 0-4) slides left, right half (cols 5-9) slides right (creates a "burst" effect)
- Animation uses CSS transforms for smooth, GPU-accelerated movement
- Blocks slide completely off-screen (300px in each direction) to ensure clean exit

### Visual Implementation: HTML Div Overlays

**Component Structure** (`src/components/lineClearAnimation.tsx`):

**Current Implementation** (line 22-25):

```tsx
<LineClearAnimation
  animation={animation} // ← Currently receives null (prop not passed from GameBoard)
  uiState={uiState}
/>
```

**Note**: Component calculates `cellWidth` and `cellHeight` from constants internally (lines 18-19), so these don't need to be passed as props. However, the `animation` prop is required but not currently being passed from `GameBoard`.

**For each cleared row in `animation.rowSnapshots`:**

1. **Row Container Div**:
   - `position: absolute`
   - `top: (originalRowIndex - HIDDEN_ROWS) * cellHeight` (e.g., if row 20, top = (20-20)\*30 = 0px)
   - `left: 0`
   - `width: 300px` (matches canvas width)
   - `height: 30px` (matches cellHeight)
   - `pointer-events: none` (don't interfere with game interactions)
   - `z-index: 10` (above canvas, below UI overlays)

2. **Left Half Container** (cols 0-4):
   - `position: absolute`
   - `left: 0`
   - `width: 150px` (5 cells × 30px)
   - `height: 30px`
   - `display: flex` (horizontal layout for cells)
   - CSS class: `line-clear-row-left` (triggers slide animation)

3. **Right Half Container** (cols 5-9):
   - `position: absolute`
   - `left: 150px` (halfway point)
   - `width: 150px` (5 cells × 30px)
   - `height: 30px`
   - `display: flex` (horizontal layout for cells)
   - CSS class: `line-clear-row-right` (triggers slide animation)

4. **Cell Divs** (5 per half):
   - `width: 30px`
   - `height: 30px`
   - `background-color: snapshot.cells[col].color`
   - `border: 1px solid #151d15` (matches canvas grid color)
   - `box-sizing: border-box`

**Styling Details**:

- Match canvas cell appearance exactly: same colors, borders, and dimensions
- Use `flexbox` for cell layout within each half
- Cells should have no gaps between them (match canvas rendering)
- Border color matches canvas grid: `#151d15`

**Animation Timing**:

- Animation starts immediately when component mounts (CSS animation)
- Duration: 300ms (matches `LINE_CLEAR_ANIMATION_DURATION`)
- Easing: `ease-out` for natural deceleration
- `forwards` fill mode keeps final state (blocks remain off-screen)
- Animation completes before React cleanup removes the divs

## Implementation Details

### Required Changes

1. **Type Definitions** (`src/types/tetris.d.ts`):

   ```typescript
   type LineClearAnimation = {
     rowSnapshots: Array<{
       originalRowIndex: number; // Original row index before removal
       cells: BoardCell[]; // Snapshot of cells in that row
     }>;
     startTime: number; // Timestamp when animation started
     duration: number; // Animation duration in seconds (e.g., 0.3)
   };
   ```

   - Add `lineClearAnimation: LineClearAnimation | null` to `GameState`

2. **Game Utils** (`src/components/gameUtils.ts`):

**Modify `clearLines` function** (lines 324-343):

- Before removing each row, store a snapshot: `[...board[row]]` (copy of cells array)
- Remove rows immediately as before (splice/unshift)
- Return array of cleared row snapshots with their original row indices
- Change return type from `number` to `Array<{originalRowIndex: number, cells: BoardCell[]}>`

**Add `updateLineClearAnimation` function**:

- Called each frame in render loop
- Calculate animation progress: `(currentTime - startTime) / duration`
- When progress >= 1, clear animation state (rows already removed from board)

**Modify `lockPieceAndSpawnNext`** (lines 201-253):

- After `clearLines` returns row snapshots, initialize `lineClearAnimation` if rows were cleared
- Set `startTime` to current timestamp
- Game logic continues normally (spawn next piece, etc.)

**Create `LineClearAnimation` component** (`src/components/lineClearAnimation.tsx`):

- New React component that renders animated row divs
- Props:
  - `animation: LineClearAnimation | null` - animation state from gameState
  - `cellWidth: number` - width of each cell (30px)
  - `cellHeight: number` - height of each cell (30px)
- Component logic:
  - If `animation` is null, return null (no animation active)
  - If `animation` exists, map over `animation.rowSnapshots` to render each row
  - For each snapshot:
    - Calculate visual row position: `(snapshot.originalRowIndex - HIDDEN_ROWS) * cellHeight`
    - Render row container div with calculated `top` position
    - Render left half div (cols 0-4) with `line-clear-row-left` class
    - Render right half div (cols 5-9) with `line-clear-row-right` class
    - Map over cells in each half to render individual cell divs with colors
  - Use `useEffect` to clean up when animation completes (check if duration elapsed)
  - Key each row by `originalRowIndex` for proper React reconciliation

**Modify `GameBoard` component** (`src/components/gameBoard.tsx`):

- Add `lineClearAnimation` prop: `lineClearAnimation: LineClearAnimation | null`
- Render `<LineClearAnimation>` component inside the relative container div
- Position: Component renders as absolute overlay (handled internally by LineClearAnimation)
- Pass props: `animation={lineClearAnimation}`, `cellWidth={30}`, `cellHeight={30}`

**Update game components** (`src/components/singlePlayerGame.tsx`, `src/components/hostGame.tsx`):

- Pass `lineClearAnimation={gameState.lineClearAnimation}` to `<GameBoard>` component
- This allows GameBoard to access animation state without modifying UIState
- Animation state is read directly from gameState ref

3. **Render Loop** (`src/components/singlePlayerGame.tsx`, `src/components/hostGame.tsx`):
   - Call `updateLineClearAnimation` in the render/animate function
   - Sync animation state to UIState (if using Option A)
   - No changes needed to game logic loop - it continues normally

### Animation State Flow

1. Piece locks → `lockPieceAndSpawnNext` called
2. `clearLines` detects full rows, stores snapshots, removes rows immediately, returns snapshots
3. If rows cleared, initialize `lineClearAnimation` with row snapshots and start time
4. Next piece spawns immediately (game continues, rows already removed)
5. Each render frame:
   - `updateLineClearAnimation` checks if animation complete, clears state if done
   - `drawBoard` renders normal board (no animation code needed)
   - `LineClearAnimation` component renders/removes div overlays based on animation state

6. After ~300ms, CSS animation completes, `updateLineClearAnimation` clears state, React removes divs

### Edge Cases

- Multiple line clears in quick succession: New animation replaces old one, previous animation stops
- Animation still running when new piece locks: New animation replaces old one
- Piece falling through animating lines: Already handled - rows removed immediately, animation is visual only

## Constants

Add to `src/constants/tetris.ts`:

- `LINE_CLEAR_ANIMATION_DURATION = 0.3` (300ms)

## CSS Styles

Add to `src/styles/globals.css`:

```css
@keyframes slide-out-left {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-300px);
  }
}

@keyframes slide-out-right {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(300px);
  }
}

.line-clear-row-left {
  animation: slide-out-left 0.3s ease-out forwards;
}

.line-clear-row-right {
  animation: slide-out-right 0.3s ease-out forwards;
}
```

## Component Structure

```
GameBoard (relative container, 300x600)
├── Canvas (300x600, z-index: 1)
├── GameStats (absolute overlay, z-index: 20)
├── GameUi (absolute overlay, z-index: 20)
└── LineClearAnimation (absolute overlay, z-index: 10)
    └── For each row in animation.rowSnapshots:
        └── Row container div (absolute, 300x30, top: calculatedY)
            ├── Left half div (absolute, 150x30, left: 0, class: line-clear-row-left)
            │   └── Flex container with 5 cell divs (30x30 each)
            │       ├── Cell 0 (background: snapshot.cells[0].color)
            │       ├── Cell 1 (background: snapshot.cells[1].color)
            │       ├── Cell 2 (background: snapshot.cells[2].color)
            │       ├── Cell 3 (background: snapshot.cells[3].color)
            │       └── Cell 4 (background: snapshot.cells[4].color)
            └── Right half div (absolute, 150x30, left: 150px, class: line-clear-row-right)
                └── Flex container with 5 cell divs (30x30 each)
                    ├── Cell 5 (background: snapshot.cells[5].color)
                    ├── Cell 6 (background: snapshot.cells[6].color)
                    ├── Cell 7 (background: snapshot.cells[7].color)
                    ├── Cell 8 (background: snapshot.cells[8].color)
                    └── Cell 9 (background: snapshot.cells[9].color)
```

## Implementation Notes

- **Z-index layering**: Canvas (1) < LineClearAnimation (10) < UI overlays (20)
- **Positioning**: All divs use `position: absolute` within GameBoard's relative container
- **Cell styling**: Each cell div must match canvas cell appearance:
  - Background color from snapshot
  - Border: `1px solid #151d15` (matches canvas grid)
  - No margin or padding
  - `box-sizing: border-box` to include border in dimensions
- **Animation trigger**: CSS classes applied on mount automatically start animation
- **Cleanup**: React removes divs when `animation` becomes null (after duration completes)

---

## Code Review Findings (Current State)

### Issues Identified

#### 0. Missing Animation Prop 🔴 **HIGH PRIORITY**

**Location**: `src/components/gameBoard.tsx` (line 35)

**Problem**: `LineClearAnimation` component expects `animation` prop but `GameBoard` only passes `uiState`.

**Current code**:

```tsx
<LineClearAnimation uiState={uiState} />
```

**Required fix**: Component needs `animation` prop from gameState:

```tsx
<LineClearAnimation animation={animation} uiState={uiState} />
```

**Impact**: Animation component receives `null` for animation prop, so no animation will ever render.

---

#### 1. Component Not Wired to GameState 🔴 **HIGH PRIORITY**

**Location**: `src/components/singlePlayerGame.tsx` (line 198), `src/components/hostGame.tsx` (line 329)

**Problem**: `GameBoard` is not receiving `lineClearAnimation` prop from game components, and `GameBoard` doesn't accept it as a prop.

**Required changes**:

1. Add `lineClearAnimation` prop to `GameBoardProps` type
2. Pass `gameStateRef.current.lineClearAnimation` from game components to `GameBoard`
3. Pass `animation` prop from `GameBoard` to `LineClearAnimation` component

**Impact**: Animation state exists in gameState but is never passed to the component.

---

#### 2. Hard-coded Width Values 🔴 **HIGH PRIORITY**

**Location**: `src/components/lineClearAnimation.tsx` (lines 46, 61)

**Problem**: The half-row container widths are hard-coded to `w-[150px]` and `left-[150px]` instead of using the `cellWidth` prop that's already passed in.

```tsx
// Current (problematic):
<div className="line-clear-row-left absolute left-0 flex h-full w-[150px]">
<div className="line-clear-row-right absolute left-[150px] flex h-full w-[150px]">

// Should be:
<div
  className="line-clear-row-left absolute left-0 flex h-full"
  style={{ width: `${cellWidth * 5}px` }}
>
<div
  className="line-clear-row-right absolute flex h-full"
  style={{
    left: `${cellWidth * 5}px`,
    width: `${cellWidth * 5}px`
  }}
>
```

**Impact**: Animation will break if board dimensions change from 300×600.

---

#### 3. Positioning Bug Comment 🟡 **NEEDS INVESTIGATION**

**Location**: `src/components/lineClearAnimation.tsx` (line 39)

**Problem**: Comment on line 39 says "this still sets them all to the same position. something is wrong here."

**Current code**:

```tsx
top: `${visualRowPosition}px`, // this still sets them all to the same position. something is wrong here.
```

**Analysis**: The `visualRowPosition` calculation uses `snapshot.originalRowIndex - HIDDEN_ROWS`, which should be correct if `originalRowIndex` values differ. This may be a false alarm, or there could be an issue with how snapshots are created (if they're not yet implemented).

**Status**: Cannot verify until `clearLines` is modified to return snapshots with correct `originalRowIndex` values.

**Action**: Investigate once core functionality is implemented.

---

#### 4. CSS Animation Duration Sync 🟡 **LOW PRIORITY** (Optional)

**Problem**: The CSS animation duration (`0.3s`) is hard-coded separately from the JavaScript constant (`LINE_CLEAR_ANIMATION_DURATION = 0.3`).

**Locations**:

- `src/constants/tetris.ts` line 356: `LINE_CLEAR_ANIMATION_DURATION = 0.3`
- `src/styles/globals.css` lines 361, 365: `animation: slide-out-left 0.3s ...`

**Recommendation**: Use CSS custom property for sync:

```css
:root {
  --line-clear-duration: 300ms;
}
.line-clear-row-left {
  animation: slide-out-left var(--line-clear-duration) ease-out forwards;
}
```

---

#### 5. CSS Animation Slide Distance 🟡 **LOW PRIORITY** (Optional)

**Problem**: The slide distance (`300px`) is hard-coded in CSS and matches the board width.

**Location**: `src/styles/globals.css` lines 342-358

```css
@keyframes slide-out-left {
  to {
    transform: translateX(-300px);
  }
}
@keyframes slide-out-right {
  to {
    transform: translateX(300px);
  }
}
```

**Recommendation**: Use CSS custom property or ensure board width is documented as fixed.

---

### What's Implemented Well ✅

1. **Type Definition** - `LineClearAnimation` type is properly defined with all necessary fields
2. **Component Structure** - `LineClearAnimation` component has correct structure and layout
3. **CSS Animations** - CSS keyframes and classes are correctly implemented with smooth animations
4. **Position Calculation** - Code correctly accounts for `HIDDEN_ROWS` offset for visual placement (calculation looks correct)
5. **CSS-only Animation** - Uses `animation: ... forwards` pattern which is performant
6. **Canvas Overlay Approach** - Component is positioned as absolute overlay, allowing canvas to continue updating

### What Still Needs Implementation ⚠️

1. **GameState Integration** - `lineClearAnimation` property not yet added to `GameState` type
2. **Core Logic** - `clearLines`, `updateLineClearAnimation`, and `lockPieceAndSpawnNext` modifications not implemented
3. **Prop Wiring** - Components not wired together to pass animation state
4. **Render Loop** - Animation update logic not called in game loop

---

## Build Verification Instructions

### Run TypeScript Build

```bash
# From project root
pnpm build
```

This will:

- Run TypeScript compiler to check for type errors
- Build Next.js application
- Report any unused imports or type mismatches

### Expected Build Checks

The build should verify:

- [ ] No TypeScript errors
- [ ] All imports resolve correctly
- [ ] No circular dependencies
- [ ] ESLint passes (if configured in build)

---

## Code Audit Checklist

### New Types Added

| Type                 | File                    | Used In                  | Status                              |
| -------------------- | ----------------------- | ------------------------ | ----------------------------------- |
| `LineClearAnimation` | `src/types/tetris.d.ts` | `lineClearAnimation.tsx` | ✅ **Exists, but NOT in GameState** |

### New Constants Added

| Constant                        | File                      | Used In | Status                    |
| ------------------------------- | ------------------------- | ------- | ------------------------- |
| `LINE_CLEAR_ANIMATION_DURATION` | `src/constants/tetris.ts` | None    | ✅ **Exists, but unused** |

### New Functions Added

| Function                   | File                          | Used In | Status                    |
| -------------------------- | ----------------------------- | ------- | ------------------------- |
| `updateLineClearAnimation` | `src/components/gameUtils.ts` | None    | ❌ **Does NOT exist yet** |

### New Components Added

| Component            | File                                    | Used In         | Status                                               |
| -------------------- | --------------------------------------- | --------------- | ---------------------------------------------------- |
| `LineClearAnimation` | `src/components/lineClearAnimation.tsx` | `gameBoard.tsx` | ✅ **Exists, but missing required `animation` prop** |

### New Props Added

| Prop                 | Component   | Used In | Status                                             |
| -------------------- | ----------- | ------- | -------------------------------------------------- |
| `lineClearAnimation` | `GameBoard` | None    | ❌ **Does NOT exist yet - not in GameBoard props** |

### New GameState Properties

| Property             | Type                         | Initialized | Updated | Read | Status                             |
| -------------------- | ---------------------------- | ----------- | ------- | ---- | ---------------------------------- |
| `lineClearAnimation` | `LineClearAnimation \| null` | None        | None    | None | ❌ **Does NOT exist in GameState** |

### CSS Classes Added

| Class                  | File                     | Used In                  | Status  |
| ---------------------- | ------------------------ | ------------------------ | ------- |
| `line-clear-row-left`  | `src/styles/globals.css` | `lineClearAnimation.tsx` | ✅ Used |
| `line-clear-row-right` | `src/styles/globals.css` | `lineClearAnimation.tsx` | ✅ Used |

### Exports Verification

Check `gameUtils.ts` exports include:

```typescript
export {
  // ... existing exports ...
  updateLineClearAnimation, // ❌ NOT exported (function doesn't exist yet)
};
```

**Note**: `updateLineClearAnimation` function does not exist in gameUtils.ts yet.

---

## Verification Commands

```bash
# 1. Run TypeScript check without emitting
pnpm tsc --noEmit

# 2. Run ESLint
pnpm lint

# 3. Run full build
pnpm build

# 4. Search for unused exports (manual check)
grep -r "updateLineClearAnimation" src/
grep -r "LINE_CLEAR_ANIMATION_DURATION" src/
grep -r "LineClearAnimation" src/

# 5. Check for duplicate definitions
grep -rn "type LineClearAnimation" src/
grep -rn "LINE_CLEAR_ANIMATION_DURATION" src/
```

---

## Summary of Implementation Status

### ✅ What's Done

- Type definition for `LineClearAnimation` exists
- Constant `LINE_CLEAR_ANIMATION_DURATION` exists
- React component `LineClearAnimation` exists and is structured correctly
- CSS animations are implemented and working
- Component is imported and rendered in `GameBoard` (but not wired up)

### ❌ What's Missing (Core Functionality)

1. **GameState Integration**: `lineClearAnimation` property not added to `GameState` type
2. **Initial State**: Not initialized in `INITIAL_GAME_STATE`
3. **clearLines Modification**: Still returns `number` instead of snapshots
4. **updateLineClearAnimation Function**: Does not exist
5. **lockPieceAndSpawnNext**: Does not initialize animation state
6. **Render Loop**: Animation update not called in render loop
7. **Prop Wiring**: `GameBoard` doesn't accept or pass `animation` prop
8. **Game Components**: Don't pass `lineClearAnimation` from gameState to `GameBoard`

### 🐛 Bugs to Fix

1. **Hard-coded widths** - Lines 46, 61 in `lineClearAnimation.tsx` use `w-[150px]` instead of `cellWidth * 5`
2. **Missing animation prop** - `GameBoard` line 35 passes only `uiState`, missing `animation` prop
3. **Positioning issue** - Line 39 comment suggests rows may all render at same position

### 🟡 Optional Improvements

- CSS duration sync with JS constant (using CSS variable)
- CSS slide distance made dynamic (using CSS variable)

---

## Next Steps (Priority Order)

1. **Add `lineClearAnimation` to GameState type** - Add property to `GameState` in `tetris.d.ts`
2. **Initialize in INITIAL_GAME_STATE** - Add `lineClearAnimation: null` to initial state
3. **Modify `clearLines` function** - Return snapshots instead of just count
4. **Create `updateLineClearAnimation` function** - Track animation progress and cleanup
5. **Modify `lockPieceAndSpawnNext`** - Initialize animation state when lines cleared
6. **Wire up GameBoard props** - Accept and pass `animation` prop to `LineClearAnimation`
7. **Wire up game components** - Pass `gameStateRef.current.lineClearAnimation` to `GameBoard`
8. **Integrate render loop** - Call `updateLineClearAnimation` in render/animate functions
9. **Fix hard-coded widths** - Use dynamic `cellWidth * 5` in `lineClearAnimation.tsx`
10. **Fix positioning bug** - Investigate and fix row positioning issue
11. **Run build verification** - `pnpm tsc --noEmit` to check for type errors
12. **Test visually** - Verify animation appears when clearing lines
