// import jwt from "jsonwebtoken";

// export const generateAccessToken = (user) => {
//   return jwt.sign(
//     { userId: user.id, role: user.role },
//     process.env.JWT_ACCESS_SECRET,
//     { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
//   );
// };

// export const generateRefreshToken = (user) => {
//   return jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, {
//     expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
//   });
// };

import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    ACCESS_SECRET,
    { expiresIn: "3m" },
  );
}

export function signRefreshToken(user) {
  return jwt.sign({ sub: user._id.toString() }, REFRESH_SECRET, {
    expiresIn: "5m",
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET); // throws if invalid/expired
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
