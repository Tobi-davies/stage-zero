// // test.js (run with: node test.js)
// import "../config/database.js"; // your existing DB connection
// import { AuthService } from "../services/authService.js";

// const user = await AuthService.upsertUser({
//   github_id: "99999",
//   username: "testuser",
//   email: "test@example.com",
//   avatar_url: "https://github.com/testuser.png",
// });
// console.log("Created:", user);

// const same = await AuthService.upsertUser({
//   github_id: "99999",
//   username: "testuser-updated",
//   email: "test@example.com",
//   avatar_url: "https://github.com/testuser.png",
// });
// console.log("Updated username:", same.username); // should be 'testuser-updated'

// process.exit(0);

// src/test/test.js
import mongoose from "mongoose";
import { AuthService } from "../services/authService.js";
import dotenv from "dotenv";

dotenv.config({
  path: "./.env",
});

import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
} from "../utils/tokens.js";

// Connect first, THEN run queries
await mongoose.connect(process.env.MONGODB_URI);
console.log("DB connected");

const user = await AuthService.upsertUser({
  github_id: "99999",
  username: "testuser",
  email: "test@example.com",
  avatar_url: "https://github.com/testuser.png",
});
console.log("Created:", user);

const same = await AuthService.upsertUser({
  github_id: "99999",
  username: "testuser-updated",
  email: "test@example.com",
  avatar_url: "https://github.com/testuser.png",
});
console.log("Updated username:", same.username);

const fakeUser = { _id: "69ef40994357226574db0bdb", role: "analyst" };

const accessToken = signAccessToken(fakeUser);
const refreshToken = signRefreshToken(fakeUser);

console.log("Access token:", accessToken);
console.log("Refresh token:", refreshToken);

const decoded = verifyAccessToken(accessToken);
console.log("Decoded:", decoded); // should show { sub, role, iat, exp }

await mongoose.disconnect();
process.exit(0);
