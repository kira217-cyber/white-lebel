import express from "express";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import CxPopularGame from "../models/CxPopularGame.js";
import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
const cleanText = (value = "") => String(value || "").trim();

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

const deleteLocalFile = (filePathValue = "") => {
  try {
    if (!filePathValue) return;
    if (String(filePathValue).startsWith("http")) return;

    const cleanPath = String(filePathValue).startsWith("/")
      ? String(filePathValue).slice(1)
      : String(filePathValue);

    const fullPath = path.resolve(cleanPath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.log("FILE DELETE ERROR:", error.message);
  }
};

const formatPopularGame = (req, item) => {
  const obj = item.toObject ? item.toObject() : item;

  return {
    ...obj,
    imageUrl: obj.image ? buildFileUrl(req, obj.image) : "",
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
      const order = Number(req.body?.order || 0);
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

      const exists = await CxPopularGame.findOne({ gameId });

      if (exists) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "This CX popular game already exists.", 400);
      }

      const popularGame = await CxPopularGame.create({
        gameId,
        gameTitle: {
          bn: titleBn,
          en: titleEn,
        },
        image: req.file ? filePath(req.file) : "",
        order: Number.isFinite(order) ? order : 0,
        status,
      });

      return successResponse(
        res,
        "CX popular game created successfully.",
        formatPopularGame(req, popularGame),
        201,
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));

      if (error?.code === 11000) {
        return errorResponse(res, "This CX popular game already exists.", 400);
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
      CxPopularGame.find(query)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CxPopularGame.countDocuments(query),
    ]);

    return successResponse(res, "CX popular games fetched successfully.", {
      games: games.map((item) => formatPopularGame(req, item)),
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
    const games = await CxPopularGame.find({ status: "active" }).sort({
      order: 1,
      createdAt: -1,
    });

    return successResponse(
      res,
      "CX active popular games fetched successfully.",
      games.map((item) => formatPopularGame(req, item)),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* SINGLE */
router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid CX popular game id.", 400);
    }

    const popularGame = await CxPopularGame.findById(req.params.id);

    if (!popularGame) {
      return errorResponse(res, "CX popular game not found.", 404);
    }

    return successResponse(
      res,
      "CX popular game fetched successfully.",
      formatPopularGame(req, popularGame),
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
        return errorResponse(res, "Invalid CX popular game id.", 400);
      }

      const popularGame = await CxPopularGame.findById(req.params.id);

      if (!popularGame) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "CX popular game not found.", 404);
      }

      const gameId = cleanText(req.body?.gameId);
      const titleBn = cleanText(req.body?.gameTitle_bn);
      const titleEn = cleanText(req.body?.gameTitle_en);
      const order = Number(req.body?.order || 0);
      const status = req.body?.status === "inactive" ? "inactive" : "active";
      const removeOldImage = String(req.body?.removeOldImage) === "true";

      const oldImage = popularGame.image;

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

      const exists = await CxPopularGame.findOne({
        _id: { $ne: popularGame._id },
        gameId,
      });

      if (exists) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "This CX popular game already exists.", 400);
      }

      popularGame.gameId = gameId;
      popularGame.gameTitle = {
        bn: titleBn,
        en: titleEn,
      };
      popularGame.order = Number.isFinite(order) ? order : 0;
      popularGame.status = status;

      if (req.file) {
        popularGame.image = filePath(req.file);
      } else if (removeOldImage) {
        popularGame.image = "";
      }

      await popularGame.save();

      if (req.file && oldImage && !String(oldImage).startsWith("http")) {
        deleteLocalFile(oldImage);
      }

      if (removeOldImage && !req.file && oldImage) {
        deleteLocalFile(oldImage);
      }

      return successResponse(
        res,
        "CX popular game updated successfully.",
        formatPopularGame(req, popularGame),
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));

      if (error?.code === 11000) {
        return errorResponse(res, "This CX popular game already exists.", 400);
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* REMOVE IMAGE */
router.patch("/:id/remove-image", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid CX popular game id.", 400);
    }

    const popularGame = await CxPopularGame.findById(req.params.id);

    if (!popularGame) {
      return errorResponse(res, "CX popular game not found.", 404);
    }

    const oldImage = popularGame.image;
    popularGame.image = "";
    await popularGame.save();

    if (oldImage && !String(oldImage).startsWith("http")) {
      deleteLocalFile(oldImage);
    }

    return successResponse(
      res,
      "CX popular game image removed successfully.",
      formatPopularGame(req, popularGame),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* DELETE */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid CX popular game id.", 400);
    }

    const popularGame = await CxPopularGame.findByIdAndDelete(req.params.id);

    if (!popularGame) {
      return errorResponse(res, "CX popular game not found.", 404);
    }

    if (popularGame.image && !String(popularGame.image).startsWith("http")) {
      deleteLocalFile(popularGame.image);
    }

    return successResponse(
      res,
      "CX popular game deleted successfully.",
      formatPopularGame(req, popularGame),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
