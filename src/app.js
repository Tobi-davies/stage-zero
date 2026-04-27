import express from "express";
import cors from "cors";

import cookieParser from "cookie-parser";
import { authenticate, requireApiVersion } from "./middleware/auth.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true, // required for cookies to work cross-origin
  }),
);
app.use(express.json());
app.use(cookieParser()); // required to read req.cookies

// // app.use(cors());
// app.use(
//   cors({
//     origin: "*",
//   }),
// );

// app.use(express.json());

import classifyRoutes from "./routes/classify.route.js";
import profileRoutes from "./routes/profile.route.js";
import AuthRoutes from "./routes/auth.route.js";

//routes declaration
app.use("/api", classifyRoutes);
app.use("/api", authenticate, requireApiVersion, profileRoutes);
app.use("/auth", AuthRoutes);

export default app;
