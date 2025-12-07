---
name: Horizontal Slide Line Clear Animation
overview: Add horizontal slide-out animation for cleared lines. Rows are removed from board immediately (as before), but snapshots are stored before removal to render the animation effect.
todos:
  - id: add-animation-types
    content: Add LineClearAnimation type with rowSnapshots array and update GameState type definition in tetris.d.ts
    status: completed
  - id: add-animation-constant
    content: Add LINE_CLEAR_ANIMATION_DURATION constant to tetris.ts
    status: completed
  - id: modify-clear-lines
    content: Modify clearLines to store snapshots of rows before removing them, return snapshots with original row indices
    status: completed
  - id: add-animation-update
    content: Create updateLineClearAnimation function to track progress and clear animation state when complete
    status: completed
  - id: update-lock-piece
    content: Modify lockPieceAndSpawnNext to initialize lineClearAnimation with row snapshots when lines are cleared
    status: completed
  - id: update-draw-board
    content: Modify drawBoard to render animating snapshot rows with horizontal slide offset after drawing normal board
    status: completed
  - id: integrate-render-loop
    content: Call updateLineClearAnimation in render/animate functions before drawing
    status: completed
  - id: fix-unused-import
    content: Remove unused LineClearAnimation type import from gameUtils.ts (causes TS6196 build error)
    status: pending
  - id: fix-hardcoded-widths
    content: Replace hard-coded w-[150px] and left-[150px] in lineClearAnimation.tsx with dynamic values using cellWidth prop
    status: pending
  - id: fix-react-rerender
    content: (RESOLVED) Re-renders already work via syncUIState/scoreMultiplier - no changes needed
    status: completed
  - id: verify-build
    content: Run TypeScript build to ensure no type errors and all exports/imports are valid
    status: pending
  - id: audit-unused-code
    content: Verify all new properties, functions, and constants are used and not duplicated
    status: pending
---

# Horizontal Slide-Out Line Clear Animation

## Current Implementation

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

```tsx
<LineClearAnimation
  animation={gameState.lineClearAnimation}
  cellWidth={30}
  cellHeight={30}
/>
```

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

## Code Review Findings (Post-Implementation)

### Issues Identified

#### 0. Unused Type Import 🔴 **BUILD ERROR**

**Location**: `src/components/gameUtils.ts` (line 12)

**Problem**: `LineClearAnimation` type is imported but not directly used (it's only used indirectly through `GameState`).

**Build Error**:

```
src/components/gameUtils.ts(12,3): error TS6196: 'LineClearAnimation' is declared but never used.
```

**Fix**: Remove the unused import from line 12.

```typescript
// Current (problematic):
import type {
  // ...
  LineClearAnimation, // ← Remove this
} from "~/types";
```

---

#### 1. Hard-coded Width Values 🔴 **HIGH PRIORITY**

**Location**: `src/components/lineClearAnimation.tsx` (lines 35, 48)

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

#### 2. React Re-render Issue 🟢 **RESOLVED - Not an issue!**

**Locations** (all game components):

- `src/components/singlePlayerGame.tsx` (line 200)
- `src/components/hostGame.tsx` (line 331)
- `src/components/opponentGame.tsx` (line 272)

**Original Concern**: The `lineClearAnimation` is read from `gameStateRef.current`, which is a ref. Changes to refs don't trigger React re-renders.

**Why It Actually Works**: The existing `syncUIState` flow already triggers re-renders at the right time!

```
Flow when lines are cleared:
1. lockPieceAndSpawnNext() sets gameState.lineClearAnimation (line 221-225)
2. lockPieceAndSpawnNext() calls onStateChange(gameState) (line 261)
3. onStateChange → syncUIState → updates UIState.scoreMultiplier
4. scoreMultiplier change triggers React re-render
5. During re-render, gameStateRef.current.lineClearAnimation is read (now populated!)
6. LineClearAnimation component renders with the animation data ✅
```

**The `scoreMultiplier` in UIState already serves as the re-render trigger!** When lines are cleared:

- `scoreMultiplier` gets set to 1, 2, 3, or 4 (number of lines cleared)
- This triggers a re-render
- At that moment, `lineClearAnimation` has the row snapshot data

**Animation Cleanup**: When `updateLineClearAnimation` clears the animation after 300ms, it doesn't trigger a re-render, but:

- CSS animation uses `forwards` fill mode, so divs stay off-screen
- Component unmounts on next re-render (next line clear, score change, etc.)
- This is acceptable behavior - no visual glitch

**Conclusion**: No changes needed for re-render triggering. The existing `syncUIState` pattern works correctly because it's called AFTER `lineClearAnimation` is set

---

#### 3. CSS Animation Duration Sync 🟡 **MEDIUM PRIORITY**

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

#### 4. CSS Animation Slide Distance 🟡 **MEDIUM PRIORITY**

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

### What Works Well ✅

1. **Clean separation** - Animation state stored in game state, rendered by dedicated component
2. **Row snapshot pattern** - Capturing cells before removal allows proper rendering during animation
3. **Position calculation** - Correctly accounts for `HIDDEN_ROWS` offset for visual placement
4. **CSS-only animation** - Uses `animation: ... forwards` pattern which is performant
5. **Canvas overlay approach** - Allows canvas to continue updating while animation plays
6. **Type safety** - `LineClearAnimation` type properly defined with all necessary fields

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

| Type                          | File                          | Used In                                                | Status                 |
| ----------------------------- | ----------------------------- | ------------------------------------------------------ | ---------------------- |
| `LineClearAnimation`          | `src/types/tetris.d.ts`       | `GameState`, `lineClearAnimation.tsx`, `gameBoard.tsx` | ✅ Used                |
| `LineClearAnimation` (import) | `src/components/gameUtils.ts` | Not directly used (only through GameState)             | ❌ **Unused - Remove** |

### New Constants Added

| Constant                        | File                      | Used In                            | Status  |
| ------------------------------- | ------------------------- | ---------------------------------- | ------- |
| `LINE_CLEAR_ANIMATION_DURATION` | `src/constants/tetris.ts` | `gameUtils.ts`, `opponentGame.tsx` | ✅ Used |

### New Functions Added

| Function                   | File                          | Used In                    | Status  |
| -------------------------- | ----------------------------- | -------------------------- | ------- |
| `updateLineClearAnimation` | `src/components/gameUtils.ts` | `render()` in gameUtils.ts | ✅ Used |

### New Components Added

| Component            | File                                    | Used In         | Status  |
| -------------------- | --------------------------------------- | --------------- | ------- |
| `LineClearAnimation` | `src/components/lineClearAnimation.tsx` | `gameBoard.tsx` | ✅ Used |

### New Props Added

| Prop                 | Component   | Used                                               | Status  |
| -------------------- | ----------- | -------------------------------------------------- | ------- |
| `lineClearAnimation` | `GameBoard` | Passed from `singlePlayerGame.tsx`, `hostGame.tsx` | ✅ Used |

### New GameState Properties

| Property             | Type                         | Initialized                 | Updated                                             | Read                                        | Status  |
| -------------------- | ---------------------------- | --------------------------- | --------------------------------------------------- | ------------------------------------------- | ------- |
| `lineClearAnimation` | `LineClearAnimation \| null` | `INITIAL_GAME_STATE` (null) | `lockPieceAndSpawnNext`, `updateLineClearAnimation` | `GameBoard`, `LineClearAnimation` component | ✅ Used |

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
  updateLineClearAnimation, // ✅ Exported
};
```

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

## Summary of Required Fixes

| Priority             | Issue                                                | Fix Required                                 |
| -------------------- | ---------------------------------------------------- | -------------------------------------------- |
| 🔴 **Build Blocker** | Unused `LineClearAnimation` import in `gameUtils.ts` | Remove import from line 12                   |
| 🔴 High              | Hard-coded widths in `lineClearAnimation.tsx`        | Use `cellWidth * 5` for dynamic sizing       |
| ✅ Resolved          | React re-render issue                                | Already works via `syncUIState`/`scoreMultiplier` |
| 🟡 Medium            | CSS duration not synced with JS constant             | Use CSS variable (optional)                  |
| 🟡 Medium            | CSS slide distance hard-coded                        | Document or use CSS variable (optional)      |

---

## Next Steps

1. **Fix build error first** - Remove unused `LineClearAnimation` import from `gameUtils.ts`
2. **Fix hard-coded widths** - Update `lineClearAnimation.tsx` to use dynamic cell sizes
4. **Run build verification** - `pnpm tsc --noEmit` should pass with no errors
5. **Test visually** - Ensure animation appears reliably when clearing lines
