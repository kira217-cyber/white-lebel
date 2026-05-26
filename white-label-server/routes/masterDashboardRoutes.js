import express from "express";
import WhiteLabelSite from "../models/WhiteLabelSite.js";

const router = express.Router();

const ok = (res, message, data = null, status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

const fail = (res, message, status = 500) => {
  return res.status(status).json({ success: false, message });
};

router.get("/summary", async (req, res) => {
  try {
    const [
      totalSites,
      activeSites,
      inactiveSites,
      tokenActiveSites,
      tokenInactiveSites,
      verifiedSites,
      recentSites,
    ] = await Promise.all([
      WhiteLabelSite.countDocuments(),
      WhiteLabelSite.countDocuments({ status: "active" }),
      WhiteLabelSite.countDocuments({ status: "inactive" }),
      WhiteLabelSite.countDocuments({ tokenActive: true }),
      WhiteLabelSite.countDocuments({ tokenActive: false }),
      WhiteLabelSite.countDocuments({ lastTokenVerifiedAt: { $ne: null } }),
      WhiteLabelSite.find()
        .select(
          "siteName clientUrl adminLoginUrl adminEmail logo status tokenActive apiTokenPreview lastTokenVerifiedAt lastLoginAt createdAt updatedAt",
        )
        .sort({ updatedAt: -1 })
        .limit(8)
        .lean(),
    ]);

    return ok(res, "Dashboard summary fetched successfully.", {
      stats: {
        totalSites,
        activeSites,
        inactiveSites,
        tokenActiveSites,
        tokenInactiveSites,
        verifiedSites,
      },
      recentSites,
      system: {
        masterApi: true,
        adminPanels: totalSites,
        activeTokens: tokenActiveSites,
        inactiveTokens: tokenInactiveSites,
      },
    });
  } catch (error) {
    return fail(res, error.message || "Server error");
  }
});

export default router;