import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import siteRoutes from "./routes/siteRoutes.js";
import masterRBGameCategoryRoutes from "./routes/masterRBGameCategoryRoutes.js";
import masterRBGameProviderRoutes from "./routes/masterRBGameProviderRoutes.js";
import masterRBGameRoutes from "./routes/masterRBGameRoutes.js";
import whiteLabelGamePublicRoutes from "./routes/whiteLabelGamePublicRoutes.js";
import masterRBLiveGameRoutes from "./routes/masterRBLiveGameRoutes.js";
import masterDashboardRoutes from "./routes/masterDashboardRoutes.js";


dotenv.config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "White Label Master Server is running.",
  });
});

app.use("/api/master/auth", authRoutes);
app.use("/api/master/sites", siteRoutes);
app.use("/api/master/rb-game-categories", masterRBGameCategoryRoutes);
app.use("/api/master/rb-game-providers", masterRBGameProviderRoutes);
app.use("/api/master/rb-games", masterRBGameRoutes);
app.use("/api/white-label", whiteLabelGamePublicRoutes);
app.use("/api/master-rb-live-game", masterRBLiveGameRoutes);
app.use("/api/master-dashboard", masterDashboardRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5008;

app.listen(PORT, () => {
  console.log(`🚀 White Label Master Server running on port ${PORT}`);
});
