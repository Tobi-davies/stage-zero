// import mongoose, { connect } from "mongoose";

// const connectDB = async () => {
//   try {
//     const connectionInstance = await mongoose.connect(
//       `${process.env.MONGODB_URI}`,
//     );
//     console.log(
//       `\n MongoDB connected !!! ${connectionInstance.connection.host}`,
//     );
//   } catch (error) {
//     console.log(`MongoDB connected failed`, error);

//     process.exit(1);
//   }
// };

// export default connectDB;

import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 20, // max concurrent connections (default 5)
      minPoolSize: 5, // keep 5 warm connections ready
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`MongoDB connected: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.log("MongoDB connection failed", error);
    process.exit(1);
  }
};

export default connectDB;
