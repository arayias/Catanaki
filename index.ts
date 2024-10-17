import express from "express";
import bodyParser from "body-parser";
import type { Application } from "express";
import { logger } from "./src/middleware/logger";

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
