import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authenticate, requireApiVersion } from "./middleware/auth.js";
import classifyRoutes from "./routes/classify.route.js";
import profileRoutes from "./routes/profile.route.js";
import AuthRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";

const app = express();

app.set("trust proxy", 1);

// ── Logging ───────────────────────────────────────────────────────────────────
app.use(morgan(":method :url :status :response-time ms"));

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Version"],
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.options("(.*)", cors());

// ── Body + Cookies ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(cookieParser());

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const forwarded = req.headers["x-forwarded-for"]?.split(",")[0]?.trim();
    return forwarded || ipKeyGenerator(req);
  },
  handler: (req, res) => {
    res
      .status(429)
      .json({
        status: "error",
        message: "Too many requests, please try again later",
      });
  },
  skip: (req) => req.method === "OPTIONS",
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || ipKeyGenerator(req),
  handler: (req, res) => {
    res
      .status(429)
      .json({
        status: "error",
        message: "Too many requests, please try again later",
      });
  },
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/auth", authLimiter, AuthRoutes);
app.use("/api", authenticate, apiLimiter, requireApiVersion, classifyRoutes);
app.use("/api", authenticate, apiLimiter, requireApiVersion, profileRoutes);
app.use("/api", authenticate, apiLimiter, requireApiVersion, userRoutes);

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ status: "error", message: "Internal server error" });
});

export default app;
