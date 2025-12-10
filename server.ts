import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { initializeSocket } from "./src/server/socket.ts";

const isDev = process.env.NODE_ENV !== "production";
const hostname = isDev ? "localhost" : "0.0.0.0"; // "0.0.0.0" essentially means "bind to all available network interfaces" on the server
const port = parseInt(process.env.PORT || "3000");

const app = next({ dev: isDev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // TypeScript knows req.url can be undefined, so we handle it
      const parsedUrl = parse(req.url || "/", true);
      await handle(req, res, parsedUrl);
    } catch (error) {
      console.error("Error occurred during handling", req.url, error);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize Socket.IO directly
  void initializeSocket(server);

  server
    .once("error", (error) => {
      console.error(error);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});
