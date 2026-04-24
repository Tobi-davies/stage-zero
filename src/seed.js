import connectDB from "./config/database.js";
import { Profile } from "./models/profile.model.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({
  path: "./.env",
});

const seedDatabase = async () => {
  try {
    await connectDB();

    const data = JSON.parse(fs.readFileSync("src/seed_profiles.json", "utf-8"));

    await Profile.deleteMany({});
    await Profile.insertMany(data.profiles);

    console.log("Database seeded successfully! 🌱");
    process.exit();
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
