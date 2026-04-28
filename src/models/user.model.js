// import mongoose, { Schema } from "mongoose";

// const userSchema = new Schema(
//   {
//     // id: {
//     //   type: String,
//     //   required: true,
//     //   unique: true,
//     // },

//     github_id: {
//       type: String,
//       required: true,
//       // trim: true,
//       unique: true,
//     },
//     username: {
//       type: String,
//       required: true,
//       // trim: true,
//     },
//     email: {
//       type: String,
//       // required: true,
//       // trim: true,
//     },
//     avatar_url: {
//       type: String,
//       // required: true,
//       // trim: true,
//     },

//     role: {
//       type: String,
//       enum: ["admin", "analyst"],
//       default: "analyst",
//     },

//     is_active: {
//       type: Boolean,
//       default: true,
//     },

//     last_login_at: {
//       type: Date,
//       required: true,
//       default: Date.now,
//     },
//     created_at: {
//       type: Date,
//       required: true,
//       default: Date.now,
//     },
//   },
//   {
//     versionKey: false,
//   },
// );

// export const User = mongoose.model("User", userSchema);

import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
  {
    github_id: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: String, // not required — GitHub may not return it
    avatar_url: String, // not required
    role: {
      type: String,
      enum: ["admin", "analyst"],
      default: "analyst",
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    last_login_at: Date,
  },
  {
    versionKey: false,
    timestamps: { createdAt: "created_at", updatedAt: false },
  },
);

export const User = mongoose.model("User", userSchema);
