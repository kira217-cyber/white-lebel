import mongoose from "mongoose";

/**
 * MongoDB সংযোগ — নেটওয়ার্ক ক্ষণিক ভাঙলে server যেন পড়ে না যায়।
 *
 * আগে প্রথমবার সংযোগ না হলে process বন্ধ হয়ে যেত, আর কোনো timeout না
 * থাকায় সংযোগ ভাঙলে অনুরোধগুলো অনেকক্ষণ ঝুলে থাকত। এখন:
 *   - প্রথম সংযোগ না হলে ৫ সেকেন্ড পরপর আবার চেষ্টা (process বন্ধ নয়)
 *   - ভাঙলে driver নিজেই আবার জোড়ে; লগে শুধু এক লাইন
 *   - server খুঁজতে ১০ সেকেন্ড, socket ৪৫ সেকেন্ড — তারপর পরিষ্কার error
 *   - IPv4 সরাসরি (IPv6 চেষ্টার দেরি নয়), pool সীমিত
 */
const OPTIONS = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  heartbeatFrequencyMS: 10000,
  maxPoolSize: 30,
  minPoolSize: 2,
  maxIdleTimeMS: 60000,
  family: 4,
  retryWrites: true,
  retryReads: true,
};

const RETRY_MS = 5000;
let listenersAdded = false;

const addListeners = () => {
  if (listenersAdded) return;
  listenersAdded = true;
  const conn = mongoose.connection;
  // 'error' এর listener না থাকলে Node পুরো process ফেলে দিতে পারে
  conn.on("error", (error) => console.error("⚠️ MongoDB error:", error?.message || error));
  conn.on("disconnected", () => console.warn("⚠️ MongoDB disconnected — waiting for it to come back"));
  conn.on("reconnected", () => console.log("✅ MongoDB reconnected"));
};

const connectDB = async () => {
  addListeners();
  try {
    await mongoose.connect(process.env.MONGO_URI, OPTIONS);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error(`❌ MongoDB Connection Failed: ${error.message} — retrying in ${RETRY_MS / 1000}s`);
    setTimeout(connectDB, RETRY_MS);
  }
};

export default connectDB;
