import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import type { Application } from "express";
import { logger } from "./src/middleware/logger";
import { Game } from "./src/game/game";
import { Server } from "socket.io";
import http from "http";

const app: Application = express();
const server = http.createServer(app);
const port = 3000;
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5500",
    methods: ["GET", "POST"],
  },
});

const openGames: Game[] = [];

function getGameById(gameId: string): Game | undefined {
  return openGames.find((game) => game.id === gameId);
}

app.use(bodyParser.json());
app.use(cors({ origin: "http://localhost:5500" })); // Apply CORS to the Express app
app.use(logger);

app.post("/game", (req, res) => {
  let game = new Game();
  openGames.push(game);
  res.send(
    JSON.stringify({
      gameId: game.id,
    })
  );
});

app.get("/game/:gameId", (req, res) => {
  let game = getGameById(req.params.gameId);
  if (game) {
    res.send(game.board.serialize());
  } else {
    res.status(404).send("Game not found");
  }
});

io.on("connection", (socket) => {
  console.log("a user connected");

  socket.on("join game", (gameId) => {
    socket.join(gameId);
    console.log(`User joined game: ${gameId}`);
  });

  socket.on("leave game", (gameId) => {
    socket.leave(gameId);
    console.log(`User left game: ${gameId}`);
  });

  socket.on("chat message", (msg, gameId) => {
    console.log(`message: ${msg} in game: ${gameId}`);
    io.to(gameId).emit("chat message", msg);
  });

  socket.on("game command", (command, gameId) => {
    console.log(`game command: ${JSON.stringify(command)} in game: ${gameId}`);
    io.to(gameId).emit("game command", command);

    if (command.type === "build") {
      let game = getGameById(gameId);
      if (game) {
        game.handleBuildCommand(command);
        io.to(gameId).emit("game update", game);
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

server.listen(port, () => {
  console.log(`Server and Socket.IO running at http://localhost:${port}`);
});
