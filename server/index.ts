import express from "express";
import bodyParser from "body-parser";
import type { Application, Request, Response } from "express";
import { logger } from "./src/middleware/logger";
import { Board, Nodes } from "./src/game/board";

const app: Application = express();
const port = 3000;

app.use(bodyParser.json());
app.use(logger);

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/game_board", (req, res) => {
  let gameBoard = new Board();
  res.send(gameBoard.serialize());
});

app.get("/nodes", (req, res) => {
  let board = new Board();
  let nodes = new Nodes(board.board);
  let arr = Array.from(nodes.nodes.entries());
  let max = 0;
  // find max tiles
  for (let [key, node] of arr) {
    if (node.adjacentTiles.length > max) {
      max = node.adjacentTiles.length;
    }
  }
  console.log(`max adjacent tiles: ${max}`);

  let stringified = JSON.stringify(arr, null, 2);
  // send json
  res.send(stringified);
});
