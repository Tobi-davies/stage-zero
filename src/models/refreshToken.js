import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    token_hash: {
      type: String,
      required: true,
      unique: true,
    },
    expires_at: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);

// Auto-delete expired tokens (MongoDB TTL index)
refreshTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
refreshTokenSchema.index({ user_id: 1 });

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);
