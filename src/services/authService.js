import crypto from "crypto";
import { RefreshToken } from "../models/refreshToken.js";
import { User } from "../models/user.model.js";

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export const AuthService = {
  async upsertUser({ github_id, username, email, avatar_url }) {
    return User.findOneAndUpdate(
      { github_id },
      {
        $set: { username, email, avatar_url },
        $currentDate: { last_login_at: true },
        $setOnInsert: { role: "analyst", is_active: true },
      },
      { upsert: true, returnDocument: "after" },
    );
  },

  async saveRefreshToken(userId, rawToken, expiresAt) {
    await RefreshToken.create({
      user_id: userId,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt,
    });
  },

  // Returns the token doc (with user_id) or null if invalid/expired
  async consumeRefreshToken(rawToken) {
    return RefreshToken.findOneAndDelete({
      token_hash: hashToken(rawToken),
      expires_at: { $gt: new Date() },
    });
  },

  async revokeAllTokens(userId) {
    await RefreshToken.deleteMany({ user_id: userId });
  },

  async findUserById(id) {
    return User.findById(id);
  },
};
