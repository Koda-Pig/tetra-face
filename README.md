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

### Other

- [ ] Deploy web app
- [ ] set up multiplayer
  - [ ] sockets or webrpc? (better for browser to browser which may be ideal for this )
  - [ ] if sockets, then https://www.npmjs.com/package/ws or socket.io
  - [ ] use socket.io `room`?
- [ ] fireship sockets: https://youtu.be/1BfCnjr_Vjg
- [ ] wds sockets: https://youtu.be/ZKEqqIO7n-k
- [ ]
