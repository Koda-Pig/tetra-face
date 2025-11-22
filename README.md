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
- [ ] Implement the game reset
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

- [ ] set up multiplayer
  - [ ] use socket.io
  - [ ] set up `room` for game sessions?
  - [ ] Host creates room, invite single player to join.
- [ ] fireship sockets: https://youtu.be/1BfCnjr_Vjg
- [ ] wds sockets: https://youtu.be/ZKEqqIO7n-k
- [ ]https://youtu.be/d80sB_zYuOs - wilth next js

Should send as little as possible data over the socket. Don't want to do the whole game. Offload that to the frontend. So the 'host' of the game essentially runs 2 game frames, one with the input of the player, and the other the inputs from the versus.

**What MUST be sent, and can't be rendered/ updated from the hosts side:**

- new pieces (type, rotation (or is that always the same?))

```ts
{
  type: "piece-spawned",
  piece: "T" | "L" | "J" | "S" | "Z" | "I" | "O",
  timestamp: Date.now()
}
```

- piece is locked in (piece type + position + rotation)

```ts
{
  type: "piece-locked",
  finalPosition: { x: 3, y: 18, rotation: 1 },
  boardChanges: [
    { row: 18, col: 3, color: "#ff0000" },
    { row: 18, col: 4, color: "#ff0000" },
    // etc...
  ],
  timestamp: Date.now()
}
```

- cleared line(s)

You know what, f all that. Just send the players raw inputs for now, that will get it working.

need a way for other player to confirm game ready.

### Auth

Only discord auth set up for now.

- [ ] attach user id to game session
- [ ] discord auth: https://discord.com/developers/applications
- [ ] add google auth using next auth. https://next-auth.js.org/providers/google

### Deployment

- [ ] Deploy web app

### Other
