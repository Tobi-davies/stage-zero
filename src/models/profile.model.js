import mongoose, { Schema } from "mongoose";
import { v7 as uuidv7 } from "uuid";

const profileSchema = new Schema(
  {
    id: {
      type: String,
      // required: true,
      unique: true,
      default: () => uuidv7(),
    },

    name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      // unique: true,
    },

    gender: {
      type: String,
      enum: ["male", "female"],
      default: null,
    },

    gender_probability: {
      type: Number,
      min: 0,
      max: 1,
    },

    // sample_size: {
    //   type: Number,
    //   min: 0,
    // },

    age: {
      type: Number,
      min: 0,
    },

    age_group: {
      type: String,
      enum: ["child", "teenager", "adult", "senior"],
    },

    country_id: {
      type: String,
      uppercase: true,
      trim: true,
    },

    country_name: {
      type: String,
      required: true,
      trim: true,
    },

    country_probability: {
      type: Number,
      min: 0,
      max: 1,
    },

    created_at: {
      type: Date,
      // required: true,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

export const Profile = mongoose.model("Profile", profileSchema);
