import axios from "axios";
// import { User } from "../models/user.model.js";
// import { generateAccessToken, generateRefreshToken } from "../utils/tokens.js";
// import { v7 as uuidv7 } from "uuid";

import crypto from "crypto";
import { AuthService } from "../services/authService.js";
import { signAccessToken, signRefreshToken } from "../utils/tokens.js";
// import dotenv from "dotenv";

// dotenv.config({
//   path: "./.env",
// });

function generatePKCE() {
  const code_verifier = crypto.randomBytes(32).toString("base64url");
  const code_challenge = crypto
    .createHash("sha256")
    .update(code_verifier)
    .digest("base64url");
  const state = crypto.randomBytes(16).toString("hex");
  return { code_verifier, code_challenge, state };
}

const pkceStore = new Map();

function issueTokens(user) {
  const access_token = signAccessToken(user);
  const refresh_token = signRefreshToken(user);

  const refreshExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
  return { access_token, refresh_token, refreshExpiresAt };
}

// const redirectToGithub = async (_req, res) => {
//   try {
//     const redirectUri = "http://localhost:4000/auth/github/callback";

//     const clientId = process.env.GITHUB_CLIENT_ID;
//     console.log(clientId);

//     const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;

//     res.redirect(url);
//   } catch (error) {}
// };

// Starts the OAuth flow — redirects browser to GitHub

//First approved update
// const redirectToGithub = async (req, res) => {
//   console.log("CLIENT_ID:", process.env.GITHUB_CLIENT_ID);
//   console.log("CALLBACK_URL:", process.env.GITHUB_CALLBACK_URL);
//   const { code_verifier, code_challenge, state } = generatePKCE();

//   // Store verifier temporarily so callback can retrieve it
//   pkceStore.set(state, { code_verifier, createdAt: Date.now() });

//   // Clean up stale entries older than 10 minutes
//   for (const [key, val] of pkceStore.entries()) {
//     if (Date.now() - val.createdAt > 10 * 60 * 1000) pkceStore.delete(key);
//   }

//   const params = new URLSearchParams({
//     client_id: process.env.GITHUB_CLIENT_ID,
//     redirect_uri: process.env.GITHUB_CALLBACK_URL,
//     scope: "user:email",
//     state,
//     code_challenge,
//     code_challenge_method: "S256",
//   });

//   res.redirect(`https://github.com/login/oauth/authorize?${params}`);
// };
const redirectToGithub = async (req, res) => {
  const { code_verifier, code_challenge, state } = generatePKCE();
  const isCli = req.query.cli === "true";
  const port = req.query.port || "9876";

  // Encode cli info into state so callback knows where to redirect
  const statePayload = JSON.stringify({ state, isCli, port });
  const encodedState = Buffer.from(statePayload).toString("base64url");

  pkceStore.set(encodedState, { code_verifier, createdAt: Date.now() });

  // Clean stale entries
  for (const [key, val] of pkceStore.entries()) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) pkceStore.delete(key);
  }

  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_CALLBACK_URL,
    scope: "user:email",
    state: encodedState,
    code_challenge,
    code_challenge_method: "S256",
  });

  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

// const AuthCallback = async (req, res) => {
//   try {
//     const { code } = req.query;
//     console.log("code", code);

//     const tokenRes = await axios.post(
//       "https://github.com/login/oauth/access_token",
//       {
//         client_id: process.env.GITHUB_CLIENT_ID,
//         client_secret: process.env.GITHUB_CLIENT_SECRET,
//         code,
//       },
//       {
//         headers: {
//           Accept: "application/json",
//         },
//       },
//     );

//     console.log("tokenRes", tokenRes.data);

//     const githubAccessToken = tokenRes.data.access_token;

//     console.log("githubAccessToken", githubAccessToken);

//     const userRes = await axios.get("https://api.github.com/user", {
//       headers: { Authorization: `Bearer ${githubAccessToken}` },
//     });

//     // const emailRes = await axios.get('https://api.github.com/user/emails', {
//     // 	headers: { Authorization: `Bearer ${accessToken}` },
//     // });

//     // const email = emailRes.data.find((e) => e.primary && e.verified)?.email;

//     // console.log('✅ GitHub user:', {
//     // 	name: userRes.data.name,
//     // 	email,
//     // });

//     // res.redirect('http://localhost:3001/success');

//     const githubUser = userRes.data;

//     console.log("githubUser", githubUser);

//     // Find or create user
//     let user = await User.findOne({ github_id: githubUser.id });

//     console.log("user", user);

//     if (!user) {
//       const user = await User.create({
//         id: uuidv7(),
//         github_id: githubUser.id,
//         username: githubUser.login,
//         email: githubUser.email,
//         avatar_url: githubUser.avatar_url,
//         role: "analyst",
//         is_active: false,
//         last_login_at: new Date().toISOString(),
//         created_at: new Date().toISOString(),
//       });

//       console.log("user2", user);
//     }

//     // Generate tokens
//     const accessToken = generateAccessToken(user);
//     const refreshToken = generateRefreshToken(user);

//     console.log("accessToken", accessToken);
//     console.log("refreshToken", refreshToken);

//     // Store refresh token (DB)
//     user.refreshToken = refreshToken;
//     await user.save();

//     // 🌐 Web → use cookies
//     res.cookie("accessToken", accessToken, {
//       httpOnly: true,
//       secure: true,
//     });

//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: true,
//     });

//     console.log("done");

//     return res.redirect("/");
//   } catch (error) {
//     console.log(error);

//     res.status(500).json({
//       status: "error",
//       message: "Something went wrong",
//       error: error.message,
//     });
//   }
// };

// GitHub redirects here after user authenticates (Web flow)
//first approved
// const handleGithubCallback = async (req, res) => {
//   const { code, state } = req.query;

//   // Validate state
//   const pkceEntry = pkceStore.get(state);
//   if (!pkceEntry) {
//     return res
//       .status(400)
//       .json({ status: "error", message: "Invalid or expired state" });
//   }
//   const { code_verifier } = pkceEntry;
//   pkceStore.delete(state);

//   try {
//     const user = await exchangeCodeForUser(code, code_verifier);

//     if (!user.is_active) {
//       return res
//         .status(403)
//         .json({ status: "error", message: "Account disabled" });
//     }

//     const { access_token, refresh_token, refreshExpiresAt } = issueTokens(user);
//     console.log("ACCESS TOKEN:", access_token);

//     await AuthService.saveRefreshToken(
//       user._id,
//       refresh_token,
//       refreshExpiresAt,
//     );

//     // Web flow — set HTTP-only cookies, redirect to dashboard
//     res
//       .cookie("access_token", access_token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         maxAge: 3 * 60 * 1000, // 3 minutes
//       })
//       .cookie("refresh_token", refresh_token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         maxAge: 5 * 60 * 1000, // 5 minutes
//       })
//       .redirect(`${process.env.CLIENT_URL}/`);
//     //   .redirect(`${process.env.CLIENT_URL}/dashboard`);
//   } catch (err) {
//     console.error("OAuth callback error:", err.message);
//     res.status(500).json({ status: "error", message: "Authentication failed" });
//   }
// };

const isProduction = process.env.NODE_ENV === "production";

const handleGithubCallback = async (req, res) => {
  const { code, state: encodedState } = req.query;

  const pkceEntry = pkceStore.get(encodedState);
  if (!pkceEntry) {
    return res
      .status(400)
      .json({ status: "error", message: "Invalid or expired state" });
  }
  const { code_verifier } = pkceEntry;
  pkceStore.delete(encodedState);

  // Decode state to check if this is a CLI request
  let isCli = false;
  let port = "9876";
  try {
    const decoded = JSON.parse(
      Buffer.from(encodedState, "base64url").toString(),
    );
    isCli = decoded.isCli;
    port = decoded.port || "9876";
  } catch {}

  try {
    const user = await exchangeCodeForUser(code, code_verifier);

    if (!user.is_active) {
      return res
        .status(403)
        .json({ status: "error", message: "Account disabled" });
    }

    const { access_token, refresh_token, refreshExpiresAt } = issueTokens(user);
    await AuthService.saveRefreshToken(
      user._id,
      refresh_token,
      refreshExpiresAt,
    );

    if (isCli) {
      // Redirect tokens to CLI local server
      const params = new URLSearchParams({ access_token, refresh_token });
      return res.redirect(`http://localhost:${port}/callback?${params}`);
    }

    // Web flow — set cookies
    res
      .cookie("access_token", access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 3 * 60 * 1000,
      })
      .cookie("refresh_token", refresh_token, {
        httpOnly: true,
        // secure: process.env.NODE_ENV === "production",
        // sameSite: "lax",
        secure: isProduction, // true in prod (HTTPS required for SameSite=none)
        sameSite: isProduction ? "none" : "lax",
        maxAge: 5 * 60 * 1000,
      })
      .redirect(`${process.env.CLIENT_URL}/`);
  } catch (err) {
    console.error("OAuth callback error:", err.message);
    res.status(500).json({ status: "error", message: "Authentication failed" });
  }
};

// ── POST /auth/github/callback ────────────────────────────────────────────────
// CLI sends code + code_verifier here, gets tokens back as JSON
const handleCliCallback = async (req, res) => {
  const { code, code_verifier } = req.body;

  if (!code || !code_verifier) {
    return res.status(400).json({
      status: "error",
      message: "code and code_verifier are required",
    });
  }

  try {
    const user = await exchangeCodeForUser(code, code_verifier);

    if (!user.is_active) {
      return res
        .status(403)
        .json({ status: "error", message: "Account disabled" });
    }

    const { access_token, refresh_token, refreshExpiresAt } = issueTokens(user);
    await AuthService.saveRefreshToken(
      user._id,
      refresh_token,
      refreshExpiresAt,
    );

    res.json({ status: "success", access_token, refresh_token });
  } catch (err) {
    console.error("CLI callback error:", err.message);
    res.status(500).json({ status: "error", message: "Authentication failed" });
  }
};

// const AuthRefresh = async (req, res) => {
//   const { refreshToken } = req.cookies;

//   if (!refreshToken) {
//     return res.status(401).json({ error: "No refresh token" });
//   }

//   try {
//     const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

//     const user = await User.findById(decoded.userId);

//     if (!user || user.refreshToken !== refreshToken) {
//       return res.status(403).json({ error: "Invalid refresh token" });
//     }

//     const newAccessToken = generateAccessToken(user);

//     res.cookie("accessToken", newAccessToken, {
//       httpOnly: true,
//       secure: true,
//     });

//     return res.json({ message: "Token refreshed" });
//   } catch (err) {
//     return res.status(403).json({ error: "Expired refresh token" });
//   }
// };

// ── POST /auth/refresh ────────────────────────────────────────────────────────

const refreshTokens = async (req, res) => {
  const rawRefreshToken = req.body?.refresh_token || req.cookies?.refresh_token;

  if (!rawRefreshToken) {
    return res
      .status(401)
      .json({ status: "error", message: "Refresh token required" });
  }

  // Consume (delete) old token — returns null if expired or not found
  const tokenDoc = await AuthService.consumeRefreshToken(rawRefreshToken);
  if (!tokenDoc) {
    return res
      .status(401)
      .json({ status: "error", message: "Invalid or expired refresh token" });
  }

  const user = await AuthService.findUserById(tokenDoc.user_id);
  if (!user || !user.is_active) {
    return res
      .status(403)
      .json({ status: "error", message: "Account disabled" });
  }

  // Issue fresh pair
  const { access_token, refresh_token, refreshExpiresAt } = issueTokens(user);
  await AuthService.saveRefreshToken(user._id, refresh_token, refreshExpiresAt);

  // Web: update cookies. CLI: return JSON
  if (req.cookies?.refresh_token) {
    res
      .cookie("access_token", access_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 3 * 60 * 1000,
      })
      .cookie("refresh_token", refresh_token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 5 * 60 * 1000,
      })
      .json({ status: "success", access_token, refresh_token });
  } else {
    res.json({ status: "success", access_token, refresh_token });
  }
};

// const AuthLogout = async (req, res) => {
//   try {
//     const { refreshToken } = req.cookies;

//     if (refreshToken) {
//       const user = await User.findOne({ refreshToken });
//       if (user) {
//         user.refreshToken = null;
//         await user.save();
//       }
//     }

//     res.clearCookie("accessToken");
//     res.clearCookie("refreshToken");

//     res.json({ message: "Logged out" });
//   } catch (error) {}
// };

// ── POST /auth/logout ─────────────────────────────────────────────────────────
const logout = async (req, res) => {
  const rawRefreshToken = req.body.refresh_token || req.cookies?.refresh_token;

  if (rawRefreshToken) {
    await AuthService.consumeRefreshToken(rawRefreshToken);
  }

  //   res
  //     .clearCookie("access_token")
  //     .clearCookie("refresh_token")
  //     .json({ status: "success", message: "Logged out" });
  res
    .clearCookie("access_token", {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    })
    .clearCookie("refresh_token", {
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    })
    .json({ status: "success", message: "Logged out" });
};

// ── GET /auth/me ──────────────────────────────────────────────────────────────
export async function getMe(req, res) {
  // req.user is set by auth middleware (next step)
  const { _id, username, email, avatar_url, role, created_at } = req.user;
  res.json({
    status: "success",
    data: { id: _id, username, email, avatar_url, role, created_at },
  });
}

// ── shared helper ─────────────────────────────────────────────────────────────
async function exchangeCodeForUser(code, code_verifier) {
  // Exchange code for GitHub access token
  const tokenRes = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      code_verifier,
    },
    { headers: { Accept: "application/json" } },
  );

  const ghToken = tokenRes.data.access_token;
  if (!ghToken) throw new Error("GitHub did not return an access token");

  // Fetch GitHub user profile
  const userRes = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${ghToken}` },
  });
  const ghUser = userRes.data;

  // Fetch email separately if GitHub didn't return it
  let email = ghUser.email;
  if (!email) {
    const emailRes = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${ghToken}` },
    });
    const primary = emailRes.data.find((e) => e.primary && e.verified);
    email = primary?.email || null;
  }

  // Upsert user in DB
  return AuthService.upsertUser({
    github_id: String(ghUser.id),
    username: ghUser.login,
    email,
    avatar_url: ghUser.avatar_url,
  });
}

export {
  redirectToGithub,
  handleGithubCallback,
  handleCliCallback,
  refreshTokens,
  logout,
};
