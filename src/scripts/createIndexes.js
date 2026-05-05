import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const profiles = db.collection("profiles");

console.log("Creating indexes...");

await profiles.createIndexes([
  // Most common filter combination
  {
    key: { gender: 1, country_id: 1, age_group: 1 },
    name: "gender_country_agegroup",
  },
  // Age range queries
  { key: { age: 1, gender: 1 }, name: "age_gender" },
  // Sorting by created_at (default sort)
  { key: { created_at: -1 }, name: "created_at_desc" },
  // Sorting by age
  { key: { age: 1 }, name: "age_asc" },
  // Natural language search fields
  { key: { country_id: 1, age: 1, gender: 1 }, name: "country_age_gender" },
  // Idempotency check on name
  { key: { name: 1 }, name: "name_unique", unique: true },
]);

console.log("✅ Indexes created");
await mongoose.disconnect();
process.exit(0);
