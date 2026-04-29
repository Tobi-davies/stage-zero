// src/scripts/fixIndexes.js
import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGODB_URI);

const db = mongoose.connection.db;
const collection = db.collection("users");

try {
  await collection.dropIndex("id_1");
  console.log("✅ Dropped id_1 index");
} catch (err) {
  console.log("Index not found or already dropped:", err.message);
}

await mongoose.disconnect();
process.exit(0);
