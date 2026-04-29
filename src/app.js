import express from "express";
import cors from "cors";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import { authenticate, requireApiVersion } from "./middleware/auth.js";

const app = express();

// // app.use(cors());
// app.use(
//   cors({
//     origin: "*",
//   }),
// );

// app.use(express.json());

// Logs: method, endpoint, status code, response time
app.use(morgan(":method :url :status :response-time ms"));

// ── Rate limiting
const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || req.ip, // per user
  message: {
    status: "error",
    message: "Too many requests, please try again later",
  },
});

// app.use(
//   cors({
//     origin: ["http://localhost:3000", process.env.CLIENT_URL],
//     credentials: true, // required for cookies to work cross-origin
//   }),
// );

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Allow requests with no origin (curl, graders) and known origins
//       const allowed = ["http://localhost:3000", process.env.CLIENT_URL].filter(
//         Boolean,
//       );

//       if (!origin || allowed.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(null, true); // allow all origins for auth endpoints
//       }
//     },
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["Content-Type", "Authorization", "X-API-Version"],
//   }),
// );
app.use(
  cors({
    origin: true, // reflect request origin — allows any origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Version"],
    exposedHeaders: ["Content-Disposition"],
  }),
);
// app.options("*", cors()); // handle all preflight requests
// app.options('(.*)', cors())
app.use(express.json());
app.use(cookieParser()); // required to read req.cookies

import classifyRoutes from "./routes/classify.route.js";
import profileRoutes from "./routes/profile.route.js";
import AuthRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";

//routes declaration
app.use("/auth", authLimiter, AuthRoutes);
app.use("/api", classifyRoutes);
app.use("/api", authenticate, apiLimiter, requireApiVersion, profileRoutes);
app.use("/api", authenticate, apiLimiter, requireApiVersion, userRoutes);

// ── Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: "error", message: "Internal server error" });
});

export default app;
