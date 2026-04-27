// import jwt from "jsonwebtoken";

// export const authenticate = (req, res, next) => {
//   const token =
//     req.cookies.accessToken || req.headers.authorization?.split(" ")[1];

//   if (!token) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.status(401).json({ error: "Invalid token" });
//   }
// };

// export const authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({ error: "Forbidden" });
//     }
//     next();
//   };
// };

import { verifyAccessToken } from "../utils/tokens.js";
import { User } from "../models/user.model.js";

// ── authenticate ──────────────────────────────────────────────────────────────
// Checks JWT from Authorization header (CLI) or cookie (web)
export async function authenticate(req, res, next) {
  try {
    // Support both CLI (Bearer token) and web (cookie)
    let token = req.cookies?.access_token;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ status: "error", message: "Authentication required" });
    }

    // Verify and decode the JWT
    const decoded = verifyAccessToken(token);

    // Fetch fresh user from DB (catches deactivated accounts)
    const user = await User.findById(decoded.sub);
    if (!user) {
      return res
        .status(401)
        .json({ status: "error", message: "User not found" });
    }

    if (!user.is_active) {
      return res
        .status(403)
        .json({ status: "error", message: "Account disabled" });
    }

    // Attach user to request for downstream handlers
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ status: "error", message: "Token expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid token" });
    }
    next(err);
  }
}

// ── requireRole ───────────────────────────────────────────────────────────────
// Use after authenticate — checks role permission
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: "error",
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }
    next();
  };
}

// ── requireApiVersion ─────────────────────────────────────────────────────────
// All /api/* routes must send X-API-Version: 1
export function requireApiVersion(req, res, next) {
  const version = req.headers["x-api-version"];
  if (!version || version !== "1") {
    return res.status(400).json({
      status: "error",
      message: "API version header required",
    });
  }
  next();
}
