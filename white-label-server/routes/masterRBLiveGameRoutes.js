import express from "express";
import MasterRBLiveGame from "../models/MasterRBLiveGame.js";

const router = express.Router();

const ok = (res, message, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const fail = (res, message, status = 500) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

/* GET GLOBAL LIVE GAME */
router.get("/", async (req, res) => {
  try {
    let config = await MasterRBLiveGame.findOne().lean();

    if (!config) {
      config = await MasterRBLiveGame.create({
        gameUID: "",
        isActive: true,
        openInNewTab: true,
      });

      config = config.toObject();
    }

    return ok(res, "Live game config fetched successfully.", config);
  } catch (error) {
    return fail(res, error.message || "Server error");
  }
});

/* UPDATE GLOBAL LIVE GAME */
router.put("/", async (req, res) => {
  try {
    const {
      gameUID = "",
      isActive = true,
      openInNewTab = true,
      note = "",
    } = req.body || {};

    const cleanUID = String(gameUID || "").trim();

    if (!cleanUID) {
      return fail(res, "Game UID is required.", 400);
    }

    let config = await MasterRBLiveGame.findOne();

    if (!config) {
      config = new MasterRBLiveGame();
    }

    config.gameUID = cleanUID;
    config.isActive = !!isActive;
    config.openInNewTab = !!openInNewTab;
    config.note = String(note || "").trim();

    await config.save();

    return ok(
      res,
      "Live game config updated successfully.",
      config,
    );
  } catch (error) {
    return fail(res, error.message || "Server error");
  }
});

export default router;