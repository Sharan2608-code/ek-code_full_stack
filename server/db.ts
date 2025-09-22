import mongoose from "mongoose";

let isConnected = false;

export async function connectDB(uri?: string) {
  const mongoUri = uri || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/ekcode";
  if (isConnected) return mongoose.connection;
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri, {
    dbName: process.env.MONGODB_DB || undefined,
  });
  isConnected = true;
  mongoose.connection.on("connected", () => console.log("[DB] connected"));
  mongoose.connection.on("error", (err) => console.error("[DB] error", err));
  mongoose.connection.on("disconnected", () => console.warn("[DB] disconnected"));
  return mongoose.connection;
}
