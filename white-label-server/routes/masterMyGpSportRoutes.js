import express from "express";
import mongoose from "mongoose";

import MasterMyGpSport from "../models/MasterMyGpSport.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const filePath = (file) => {
  if (!file) return "";
  return `/uploads/${file.filename}`;
};

const cleanText = (value = "") => String(value || "").trim();

const toBool = (value) => {
  return value === true || value === "true" || value === "1" || value === 1;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ======================================================
   CREATE MYGP SPORT
   POST /api/master/mygp-sports
====================================================== */

router.post(
  "/",
  protectMasterAdmin,
  upload.single("iconImage"),
  async (req, res) => {
    try {
      const nameBn = cleanText(req.body?.name_bn);
      const nameEn = cleanText(req.body?.name_en);
      const gameId = cleanText(req.body?.gameId);
      const order = Number(req.body?.order || 0);

      if (!nameBn || !nameEn || !gameId) {
        return errorResponse(
          res,
          "Bangla name, English name and gameId are required.",
          400,
        );
      }

      const sport = await MasterMyGpSport.create({
        name: {
          bn: nameBn,
          en: nameEn,
        },
        iconImage: req.file ? filePath(req.file) : "",
        gameId,
        isActive:
          req.body?.isActive === undefined ? true : toBool(req.body?.isActive),
        order: Number.isFinite(order) ? order : 0,
        syncStatus: "pending",
      });

      return successResponse(
        res,
        "MyGP sport created successfully.",
        sport,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   GET ALL MYGP SPORTS
   GET /api/master/mygp-sports
====================================================== */

router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const {
      search = "",
      isActive = "",
      syncStatus = "",
      page = 1,
      limit = 50,
    } = req.query || {};

    const query = {};

    if (isActive !== "") {
      query.isActive = toBool(isActive);
    }

    if (syncStatus) {
      query.syncStatus = syncStatus;
    }

    if (search) {
      query.$or = [
        { "name.bn": { $regex: search, $options: "i" } },
        { "name.en": { $regex: search, $options: "i" } },
        { gameId: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 50, 1);
    const skip = (pageNum - 1) * limitNum;

    const [sports, total] = await Promise.all([
      MasterMyGpSport.find(query)
        .sort({
          order: 1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limitNum),

      MasterMyGpSport.countDocuments(query),
    ]);

    return successResponse(res, "MyGP sports fetched successfully.", {
      sports,
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

/* ======================================================
   GET ACTIVE SPORTS ONLY
   GET /api/master/mygp-sports/active/list
====================================================== */

router.get("/active/list", protectMasterAdmin, async (req, res) => {
  try {
    const sports = await MasterMyGpSport.find({
      isActive: true,
    }).sort({
      order: 1,
      createdAt: -1,
    });

    return successResponse(
      res,
      "Active MyGP sports fetched successfully.",
      sports,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   GET SINGLE MYGP SPORT
   GET /api/master/mygp-sports/:id
====================================================== */

router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid sport id.", 400);
    }

    const sport = await MasterMyGpSport.findById(req.params.id);

    if (!sport) {
      return errorResponse(res, "MyGP sport not found.", 404);
    }

    return successResponse(res, "MyGP sport fetched successfully.", sport);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE MYGP SPORT
   PUT /api/master/mygp-sports/:id
====================================================== */

router.put(
  "/:id",
  protectMasterAdmin,
  upload.single("iconImage"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return errorResponse(res, "Invalid sport id.", 400);
      }

      const sport = await MasterMyGpSport.findById(req.params.id);

      if (!sport) {
        return errorResponse(res, "MyGP sport not found.", 404);
      }

      const nameBn = cleanText(req.body?.name_bn);
      const nameEn = cleanText(req.body?.name_en);
      const gameId = cleanText(req.body?.gameId);
      const order = Number(req.body?.order || 0);
      const removeOldImage = String(req.body?.removeOldImage) === "true";

      if (!nameBn || !nameEn || !gameId) {
        return errorResponse(
          res,
          "Bangla name, English name and gameId are required.",
          400,
        );
      }

      sport.name = {
        bn: nameBn,
        en: nameEn,
      };

      sport.gameId = gameId;

      sport.isActive =
        req.body?.isActive === undefined
          ? sport.isActive
          : toBool(req.body?.isActive);

      sport.order = Number.isFinite(order) ? order : 0;

      if (req.file) {
        sport.iconImage = filePath(req.file);
      } else if (removeOldImage) {
        sport.iconImage = "";
      }

      sport.syncStatus = "pending";

      await sport.save();

      return successResponse(res, "MyGP sport updated successfully.", sport);
    } catch (error) {
      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   DELETE MYGP SPORT
   DELETE /api/master/mygp-sports/:id
====================================================== */

router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid sport id.", 400);
    }

    const sport = await MasterMyGpSport.findByIdAndDelete(req.params.id);

    if (!sport) {
      return errorResponse(res, "MyGP sport not found.", 404);
    }

    return successResponse(res, "MyGP sport deleted successfully.", sport);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
