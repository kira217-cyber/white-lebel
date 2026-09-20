import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import BcFeaturedGame from "../models/BcFeaturedGame.js";
import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import {
  getHiddenGameIds,
  rejectHiddenEntries,
} from "../utils/bcGameVisibility.js";

import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanText = (value = "") => String(value || "").trim();

const normalizeOrder = (value) => {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : 0;
};

const filePath = (file) => {
  if (!file) return "";
  return `/uploads/${file.filename}`;
};

const buildFileUrl = (req, filePathValue = "") => {
  if (!filePathValue) return "";
  if (String(filePathValue).startsWith("http")) return filePathValue;

  return `${req.protocol}://${req.get("host")}${
    String(filePathValue).startsWith("/") ? filePathValue : `/${filePathValue}`
  }`;
};

const deleteLocalFile = (targetPath = "") => {
  try {
    if (!targetPath) return;
    if (String(targetPath).startsWith("http")) return;

    const cleanPath = String(targetPath).startsWith("/")
      ? String(targetPath).slice(1)
      : String(targetPath);

    const fullPath = path.resolve(cleanPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.log("BetChokkor HOT GAME FILE DELETE ERROR:", error.message);
  }
};

const formatFeaturedGame = (req, item) => {
  const obj = item?.toObject ? item.toObject() : item;

  return {
    ...obj,
    imageUrl: obj?.image ? buildFileUrl(req, obj.image) : "",
  };
};

/* CREATE */
router.post(
  "/",
  protectMasterAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const gameId = cleanText(req.body?.gameId);
      const titleBn = cleanText(req.body?.gameTitle_bn);
      const titleEn = cleanText(req.body?.gameTitle_en);
      const order = normalizeOrder(req.body?.order);
      const status = req.body?.status === "inactive" ? "inactive" : "active";

      if (!gameId) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Game ID is required.", 400);
      }

      if (!titleBn || !titleEn) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(
          res,
          "Game title in Bangla and English is required.",
          400,
        );
      }

      const exists = await BcFeaturedGame.findOne({ gameId });

      if (exists) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "This BetChokkor featured game already exists.", 400);
      }

      const featuredGame = await BcFeaturedGame.create({
        gameId,
        gameTitle: {
          bn: titleBn,
          en: titleEn,
        },
        image: req.file ? filePath(req.file) : "",
        order,
        status,
      });

      return successResponse(
        res,
        "BetChokkor featured game created successfully.",
        formatFeaturedGame(req, featuredGame),
        201,
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));

      if (error?.code === 11000) {
        return errorResponse(res, "This BetChokkor featured game already exists.", 400);
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ADMIN LIST */
router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const { search = "", status = "", page = 1, limit = 50 } = req.query || {};

    const query = {};

    if (status) query.status = status;

    if (search) {
      const term = String(search).trim();
      query.$or = [
        { gameId: { $regex: term, $options: "i" } },
        { "gameTitle.bn": { $regex: term, $options: "i" } },
        { "gameTitle.en": { $regex: term, $options: "i" } },
      ];
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 50, 1);
    const skip = (pageNum - 1) * limitNum;

    const [games, total] = await Promise.all([
      BcFeaturedGame.find(query)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      BcFeaturedGame.countDocuments(query),
    ]);

    return successResponse(res, "BetChokkor featured games fetched successfully.", {
      games: games.map((item) => formatFeaturedGame(req, item)),
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ACTIVE PUBLIC LIST */
router.get("/active/list", async (req, res) => {
  try {
    const [games, hiddenGameIds] = await Promise.all([
      BcFeaturedGame.find({ status: "active" }).sort({
        order: 1,
        createdAt: -1,
      }),

      getHiddenGameIds(),
    ]);

    return successResponse(
      res,
      "BetChokkor active featured games fetched successfully.",
      rejectHiddenEntries(games, hiddenGameIds).map((item) =>
        formatFeaturedGame(req, item),
      ),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* SINGLE */
router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid BetChokkor featured game id.", 400);
    }

    const featuredGame = await BcFeaturedGame.findById(req.params.id);

    if (!featuredGame) {
      return errorResponse(res, "BetChokkor featured game not found.", 404);
    }

    return successResponse(
      res,
      "BetChokkor featured game fetched successfully.",
      formatFeaturedGame(req, featuredGame),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* UPDATE */
router.put(
  "/:id",
  protectMasterAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Invalid BetChokkor featured game id.", 400);
      }

      const featuredGame = await BcFeaturedGame.findById(req.params.id);

      if (!featuredGame) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "BetChokkor featured game not found.", 404);
      }

      const gameId = cleanText(req.body?.gameId);
      const titleBn = cleanText(req.body?.gameTitle_bn);
      const titleEn = cleanText(req.body?.gameTitle_en);
      const order = normalizeOrder(req.body?.order);
      const status = req.body?.status === "inactive" ? "inactive" : "active";
      const removeOldImage = String(req.body?.removeOldImage) === "true";

      const oldImage = featuredGame.image;

      if (!gameId) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Game ID is required.", 400);
      }

      if (!titleBn || !titleEn) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(
          res,
          "Game title in Bangla and English is required.",
          400,
        );
      }

      const exists = await BcFeaturedGame.findOne({
        _id: { $ne: featuredGame._id },
        gameId,
      });

      if (exists) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "This BetChokkor featured game already exists.", 400);
      }

      featuredGame.gameId = gameId;
      featuredGame.gameTitle = {
        bn: titleBn,
        en: titleEn,
      };
      featuredGame.order = order;
      featuredGame.status = status;

      if (req.file) {
        featuredGame.image = filePath(req.file);
      } else if (removeOldImage) {
        featuredGame.image = "";
      }

      await featuredGame.save();

      if (req.file && oldImage && !String(oldImage).startsWith("http")) {
        deleteLocalFile(oldImage);
      }

      if (removeOldImage && !req.file && oldImage) {
        deleteLocalFile(oldImage);
      }

      return successResponse(
        res,
        "BetChokkor featured game updated successfully.",
        formatFeaturedGame(req, featuredGame),
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));

      if (error?.code === 11000) {
        return errorResponse(res, "This BetChokkor featured game already exists.", 400);
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* REMOVE IMAGE */
router.patch("/:id/remove-image", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid BetChokkor featured game id.", 400);
    }

    const featuredGame = await BcFeaturedGame.findById(req.params.id);

    if (!featuredGame) {
      return errorResponse(res, "BetChokkor featured game not found.", 404);
    }

    const oldImage = featuredGame.image;

    featuredGame.image = "";
    await featuredGame.save();

    if (oldImage && !String(oldImage).startsWith("http")) {
      deleteLocalFile(oldImage);
    }

    return successResponse(
      res,
      "BetChokkor featured game image removed successfully.",
      formatFeaturedGame(req, featuredGame),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* DELETE */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid BetChokkor featured game id.", 400);
    }

    const featuredGame = await BcFeaturedGame.findByIdAndDelete(req.params.id);

    if (!featuredGame) {
      return errorResponse(res, "BetChokkor featured game not found.", 404);
    }

    if (featuredGame.image && !String(featuredGame.image).startsWith("http")) {
      deleteLocalFile(featuredGame.image);
    }

    return successResponse(
      res,
      "BetChokkor featured game deleted successfully.",
      formatFeaturedGame(req, featuredGame),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
