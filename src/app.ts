import "dotenv/config";
import express from "express";
import cors from "cors";
import indexRouter from "./routes/index.routes.js";
import { notFoundHandler } from "./middlewares/not-found.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/", indexRouter);
app.use(notFoundHandler);

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`App running on port ${port}`);
})