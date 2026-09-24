import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import siteRoutes from "./routes/siteRoutes.js";

// RB Game Related Routes
import masterRBGameCategoryRoutes from "./routes/masterRBGameCategoryRoutes.js";
import masterRBGameProviderRoutes from "./routes/masterRBGameProviderRoutes.js";
import masterRBGameRoutes from "./routes/masterRBGameRoutes.js";
import whiteLabelGamePublicRoutes from "./routes/whiteLabelGamePublicRoutes.js";
import masterRBLiveGameRoutes from "./routes/masterRBLiveGameRoutes.js";
import masterDashboardRoutes from "./routes/masterDashboardRoutes.js";

// MyGp Game Related Routes
import myGpCategoryRoutes from "./routes/myGpCategoryRoutes.js";
import masterMyGpGameProviderRoutes from "./routes/masterMyGpGameProviderRoutes.js";
import masterMyGpGameRoutes from "./routes/masterMyGpGameRoutes.js";
import masterMyGpSportRoutes from "./routes/masterMyGpSportRoutes.js";
import myGpWhiteLabelAccessRoutes from "./routes/myGpWhiteLabelAccessRoutes.js";

// Cx Game Related Routes
import cxGameCategoryRoutes from "./routes/cxGameCategoryRoutes.js";
import cxGameProviderRoutes from "./routes/cxGameProviderRoutes.js";
import cxGameRoutes from "./routes/cxGameRoutes.js";
import cxPopularGameRoutes from "./routes/cxPopularGameRoutes.js";
import cxSportRoutes from "./routes/cxSportRoutes.js";
import cxHotGameRoutes from "./routes/cxHotGameRoutes.js";
import cxGlobalGameRoutes from "./routes/cxGlobalGameRoutes.js";

// BetChokkor (Bc) — নিজস্ব ক্যাটালগ, Cx এর সাথে কোনো মেশামেশি নেই
import bcGameCategoryRoutes from "./routes/bcGameCategoryRoutes.js";
import bcGameProviderRoutes from "./routes/bcGameProviderRoutes.js";
import bcGameRoutes from "./routes/bcGameRoutes.js";
import bcSportRoutes from "./routes/bcSportRoutes.js";
import bcFeaturedGameRoutes from "./routes/bcFeaturedGameRoutes.js";
import bcGlobalGameRoutes from "./routes/bcGlobalGameRoutes.js";

// TBAJEE38 (Tb) — নিজস্ব ক্যাটালগ; প্রোভাইডার ও গেম শুধু Oracle থেকে
import tbGameCategoryRoutes from "./routes/tbGameCategoryRoutes.js";
import tbGameProviderRoutes from "./routes/tbGameProviderRoutes.js";
import tbGameRoutes from "./routes/tbGameRoutes.js";
import tbGlobalGameRoutes from "./routes/tbGlobalGameRoutes.js";


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

// RB Game Related Routes
app.use("/api/master/rb-game-categories", masterRBGameCategoryRoutes);
app.use("/api/master/rb-game-providers", masterRBGameProviderRoutes);
app.use("/api/master/rb-games", masterRBGameRoutes);
app.use("/api/white-label", whiteLabelGamePublicRoutes);
app.use("/api/master-rb-live-game", masterRBLiveGameRoutes);
app.use("/api/master-dashboard", masterDashboardRoutes);

// MyGp Game Related Routes
app.use("/api/mygp-categories", myGpCategoryRoutes);
app.use("/api/master/mygp-game-providers", masterMyGpGameProviderRoutes);
app.use("/api/master/mygp-games", masterMyGpGameRoutes);
app.use("/api/master/mygp-sports", masterMyGpSportRoutes);
app.use("/api/public/mygp", myGpWhiteLabelAccessRoutes);

// Cx Game Related Routes
app.use("/api/master/cx-game-categories", cxGameCategoryRoutes);
app.use("/api/master/cx-game-providers", cxGameProviderRoutes);
app.use("/api/master/cx-games", cxGameRoutes);
app.use("/api/master/cx-popular-games", cxPopularGameRoutes);
app.use("/api/master/cx-sports", cxSportRoutes);
app.use("/api/master/cx-hot-games", cxHotGameRoutes);
app.use("/api/master/cx-global/client", cxGlobalGameRoutes);

// BetChokkor Game Related Routes
app.use("/api/master/bc-game-categories", bcGameCategoryRoutes);
app.use("/api/master/bc-game-providers", bcGameProviderRoutes);
app.use("/api/master/bc-games", bcGameRoutes);
app.use("/api/master/bc-sports", bcSportRoutes);
app.use("/api/master/bc-featured-games", bcFeaturedGameRoutes);
app.use("/api/master/bc-global/client", bcGlobalGameRoutes);

// TBAJEE38 Game Related Routes
app.use("/api/master/tb-game-categories", tbGameCategoryRoutes);
app.use("/api/master/tb-game-providers", tbGameProviderRoutes);
app.use("/api/master/tb-games", tbGameRoutes);
app.use("/api/master/tb-global/client", tbGlobalGameRoutes);


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
