import express from "express";

import cors from "cors";

const app = express();

// app.use(cors());
app.use(
  cors({
    origin: "*",
  }),
);

app.use(express.json());

import classifyRoutes from "./routes/classify.route.js";
import profileRoutes from "./routes/profile.route.js";

//routes declaration
app.use("/api", classifyRoutes);
app.use("/api", profileRoutes);

export default app;
