# Tetra Face

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

The idea for this project is to create a multiplayer game where users can log in, chat, and play against each other. While Tetris is often recommended as a simple game to build, it is actually trickier than you would assume.

Refer to this for the Tetris rules:
https://tetris.wiki/Tetris_Guideline

## Tech stack docs

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## Running the project

```bash
pnpm install
```

```bash
docker-compose up -d
```

```bash
pnpm run dev
```

## TODO

### Gameplay

- [x] Implement the 7-bag randomizer method for selecting tetrominos
- [x] Implement collision detection for moving the tetrominos
- [x] Implement collision detection for rotating the tetrominos
- [x] Implement the wall kicks for rotating tetrominos
- [x] Implement the soft drop
- [x] Implement the hard drop
- [x] Implement the line clear
- [x] Implement the game over
- [x] Implement counter clockwise rotation (currently only clockwise with space key)
- [x] Implement scoring system
  - [x] line clear scoring
  - [ ] T-Spin scoring
- [x] Implement the game reset
- [x] Add leveling system
- [x] Implement the game pause / resume. Consider the way unity handles this with a time scale. Noted here: https://github.com/Koda-Pig/hadeez/blob/f2a531ec9eda007310b538d309b30b79327c4277/README.md?plain=1#L38
- [x] add visual effect when row is cleared
- [ ] ensure implementation matches guidelines: https://tetris.fandom.com/wiki/Tetris_Guideline

#### SCORING SYSTEM

- Basic Line Clears:
-
- Single: 100 × level
- Double: 300 × level
- Triple: 500 × level
- Tetris (4 lines): 800 × level
-
- T-Spins:
-
- T-Spin Single: 800 × level
- T-Spin Double: 1200 × level
- T-Spin Triple: 1600 × level
- Mini T-Spin variations exist with lower scores

### Multiplayer

This is set up in a rudimentary way. Just the very basics right now.

- [x] set up multiplayer
  - [x] use socket.io
  - [x] set up `room` for game sessions?
  - [x] Host creates room, invite single player to join.
  - [x] add game ready state for players
  - [x] fix bug where pieces dropped in either host or oopponent boards are placed in both boards (was caused by shared object reference to board)
  - [ ] send over other player data (current piece, etc. {atm just inputs being sent})
    - [x] host player emits when new piece is spawned, with Piece data.
    - [x] Opponent player reads that new piece that is spawned, and passes it to their own instance of the 'opponentGame' component.
    - [x] OpponentGame has a way to use the piece that is spawned to it, instead of generating its own.
    - [ ] Game over and
    - [ ] play/ pause state

Should send as little as possible data over the socket. Don't want to do the whole game. Offload that to the frontend. So the 'host' of the game essentially runs 2 game frames, one with the input of the player, and the other the inputs from the versus.

Running into an issue where the 'opponent' game is playing catch up with the opponent.
It has its own game to render for the opponent view, but it is delayed in waiting for the pieces.

Treating piece spawning and input processing as independent events when can be linked. The input that causes a piece to lock should be atomic with the new piece spawn.

The way I've set this up is that the oppoonent game basically becomes a delayed, desynchonized mirror.

My plan with this is to keep the physics/ gravity isolated to the individual games, and only share player inputs and the spawned pieces over the network.

The only 'events' so to speak that we care about transmitting are the player input events, and the piece that is generated.
Everything else can be calculated and rendered on the client.

ITS TIME TO IMPROVE THIS

OK so I've gotten this far, it's working, but has issues as expected. What I need to do is change my existing method of showing the opponent game.
Instead of sending keyboard inputs and the new pieces that are spawned (which comes with desync, race conditions, etc), send complete state transitions. Eg:

```ts
type TetrisEvent =
  | { type: "piece-move"; direction: "left" | "right"; timestamp: number }
  | { type: "piece-soft-drop"; timestamp: number }
  | { type: "piece-rotate"; direction: 1 | -1; timestamp: number }
  | {
      type: "piece-hard-drop-and-lock";
      lockedPiece: Piece;
      nextPiece: Piece;
      linesCleared: number[];
      newScore: number;
      newLevel: number;
      timestamp: number;
    };
```

**What MUST be sent, and can't be rendered/ updated from the hosts side:**

- new pieces (type only , rotation is always 0 for new pieces and position is predetermined)
- player inputs

### Auth

Only discord auth set up for now.

- [ ] attach user id to game session
- [x] discord auth: https://discord.com/developers/applications
- [ ] add google auth using next auth. https://next-auth.js.org/providers/google

### Deployment

- [ ] Deploy web app

### Other

```

```
