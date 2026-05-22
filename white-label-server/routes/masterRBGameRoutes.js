import express from "express";
import mongoose from "mongoose";

import MasterRBGame from "../models/MasterRBGame.js";
import MasterRBGameCategory from "../models/MasterRBGameCategory.js";
import MasterRBGameProvider from "../models/MasterRBGameProvider.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { errorResponse, successResponse } from "../utils/response.js";

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toBool = (value) => {
  return value === true || value === "true" || value === "1" || value === 1;
};

const filePath = (file) => {
  if (!file) return "";
  return `/uploads/${file.filename}`;
};

/* CREATE GAME */
router.post(
  "/",
  protectMasterAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        categoryId,
        providerDbId,
        gameId,
        isHot,
        isNew,
        isJackpot,
        status,
      } = req.body || {};

      if (!categoryId || !isValidObjectId(categoryId)) {
        return errorResponse(res, "Valid categoryId is required.", 400);
      }

      if (!providerDbId || !isValidObjectId(providerDbId)) {
        return errorResponse(res, "Valid providerDbId is required.", 400);
      }

      if (!gameId) {
        return errorResponse(res, "gameId is required.", 400);
      }

      const category = await MasterRBGameCategory.findById(categoryId);

      if (!category) {
        return errorResponse(res, "RB game category not found.", 404);
      }

      const provider = await MasterRBGameProvider.findOne({
        _id: providerDbId,
        categoryId,
      });

      if (!provider) {
        return errorResponse(
          res,
          "RB game provider not found under this category.",
          404,
        );
      }

      const exists = await MasterRBGame.findOne({
        providerDbId,
        gameId: String(gameId).trim(),
      });

      if (exists) {
        return errorResponse(
          res,
          "This game already exists under this provider.",
          400,
        );
      }

      const game = await MasterRBGame.create({
        categoryId,
        providerDbId,
        gameId: String(gameId).trim(),

        // Oracle image URL will NOT save.
        // Only uploaded image path will save.
        image: req.file ? filePath(req.file) : "",

        isHot: toBool(isHot),
        isNew: toBool(isNew),
        isJackpot: toBool(isJackpot),
        status: status || "active",
        syncStatus: "pending",
      });

      return successResponse(res, "RB game added successfully.", game, 201);
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(
          res,
          "This game already exists under this provider.",
          400,
        );
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* GET ALL GAMES */
router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      gameId = "",
      status = "",
      isHot = "",
      isNew = "",
      isJackpot = "",
      page = 1,
      limit = 50,
    } = req.query || {};

    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return errorResponse(res, "Invalid categoryId.", 400);
      }

      query.categoryId = categoryId;
    }

    if (providerDbId) {
      if (!isValidObjectId(providerDbId)) {
        return errorResponse(res, "Invalid providerDbId.", 400);
      }

      query.providerDbId = providerDbId;
    }

    if (gameId) {
      query.gameId = { $regex: gameId, $options: "i" };
    }

    if (status) {
      query.status = status;
    }

    if (isHot !== "") {
      query.isHot = toBool(isHot);
    }

    if (isNew !== "") {
      query.isNew = toBool(isNew);
    }

    if (isJackpot !== "") {
      query.isJackpot = toBool(isJackpot);
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 50, 1);
    const skip = (pageNum - 1) * limitNum;

    const [games, total] = await Promise.all([
      MasterRBGame.find(query)
        .populate("categoryId", "categoryName categoryTitle status")
        .populate("providerDbId", "providerName providerId status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      MasterRBGame.countDocuments(query),
    ]);

    return successResponse(res, "RB games fetched successfully.", {
      games,
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

/* GET SINGLE GAME */
router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const game = await MasterRBGame.findById(req.params.id)
      .populate("categoryId", "categoryName categoryTitle status")
      .populate("providerDbId", "providerName providerId status");

    if (!game) {
      return errorResponse(res, "RB game not found.", 404);
    }

    return successResponse(res, "RB game fetched successfully.", game);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* UPDATE GAME */
router.put(
  "/:id",
  protectMasterAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const game = await MasterRBGame.findById(req.params.id);

      if (!game) {
        return errorResponse(res, "RB game not found.", 404);
      }

      const { categoryId, providerDbId, isHot, isNew, isJackpot, status } =
        req.body || {};

      if (categoryId !== undefined) {
        if (!isValidObjectId(categoryId)) {
          return errorResponse(res, "Invalid categoryId.", 400);
        }

        const category = await MasterRBGameCategory.findById(categoryId);

        if (!category) {
          return errorResponse(res, "RB game category not found.", 404);
        }

        game.categoryId = categoryId;
      }

      if (providerDbId !== undefined) {
        if (!isValidObjectId(providerDbId)) {
          return errorResponse(res, "Invalid providerDbId.", 400);
        }

        const provider = await MasterRBGameProvider.findById(providerDbId);

        if (!provider) {
          return errorResponse(res, "RB game provider not found.", 404);
        }

        game.providerDbId = providerDbId;
      }

      if (isHot !== undefined) {
        game.isHot = toBool(isHot);
      }

      if (isNew !== undefined) {
        game.isNew = toBool(isNew);
      }

      if (isJackpot !== undefined) {
        game.isJackpot = toBool(isJackpot);
      }

      if (status !== undefined) {
        game.status = status;
      }

      // Only custom upload updates image.
      // If no file, existing image stays same.
      if (req.file) {
        game.image = filePath(req.file);
      }

      game.syncStatus = "pending";

      await game.save();

      return successResponse(res, "RB game updated successfully.", game);
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(
          res,
          "This game already exists under this provider.",
          400,
        );
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* REMOVE CUSTOM IMAGE ONLY */
router.patch("/:id/remove-image", protectMasterAdmin, async (req, res) => {
  try {
    const game = await MasterRBGame.findById(req.params.id);

    if (!game) {
      return errorResponse(res, "RB game not found.", 404);
    }

    game.image = "";
    game.syncStatus = "pending";

    await game.save();

    return successResponse(res, "RB game custom image removed.", game);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* DELETE GAME */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const game = await MasterRBGame.findByIdAndDelete(req.params.id);

    if (!game) {
      return errorResponse(res, "RB game not found.", 404);
    }

    return successResponse(res, "RB game deleted successfully.", game);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
