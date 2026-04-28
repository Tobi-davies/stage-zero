import dotenv from "dotenv";
import connectDB from "./config/database.js";
import app from "./app.js";

dotenv.config({
  path: "./.env",
});

// const PORT = process.env.PORT || 8000;

// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

const startServer = async () => {
  try {
    await connectDB();

    app.on("error", (error) => {
      console.log("ERROR", error);
      throw error;
    });

    const PORT = process.env.PORT || 8000;

    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  } catch (err) {
    console.log("MongoDB connection failed!!!", err);
  }
};

startServer();

// https://stage-zero-production.up.railway.app
// https://github.com/Tobi-davies/stage-zero
