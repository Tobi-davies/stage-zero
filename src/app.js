import express from "express";

import cors from "cors";

const app = express(); //create an express app

// app.use(cors());
app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json());

import classifyRoutes from "./routes/classify.route.js";

//routes declaration
app.use("/api", classifyRoutes);

export default app;
