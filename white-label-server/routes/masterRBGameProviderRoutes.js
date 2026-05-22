import express from "express";
import mongoose from "mongoose";

import MasterRBGameProvider from "../models/MasterRBGameProvider.js";
import MasterRBGameCategory from "../models/MasterRBGameCategory.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { errorResponse, successResponse } from "../utils/response.js";

const router = express.Router();

const filePath = (file) => {
  if (!file) return "";
  return `/uploads/${file.filename}`;
};

const toBool = (value) => {
  return value === true || value === "true" || value === "1" || value === 1;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

/* ======================================================
   CREATE RB PROVIDER
====================================================== */

router.post(
  "/",
  protectMasterAdmin,
  upload.fields([
    { name: "providerImage", maxCount: 1 },
    { name: "providerIcon", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { categoryId, providerName, providerId, status, isHot, isNew } =
        req.body || {};

      if (!categoryId || !isValidObjectId(categoryId)) {
        return errorResponse(res, "Valid categoryId is required.", 400);
      }

      if (!providerName || !providerId) {
        return errorResponse(
          res,
          "providerName and providerId are required.",
          400,
        );
      }

      const category = await MasterRBGameCategory.findById(categoryId);

      if (!category) {
        return errorResponse(res, "RB category not found.", 404);
      }

      const exists = await MasterRBGameProvider.findOne({
        categoryId,
        providerId: String(providerId).trim(),
      });

      if (exists) {
        return errorResponse(
          res,
          "This provider already exists in this category.",
          400,
        );
      }

      const providerImage = req.files?.providerImage?.[0];
      const providerIcon = req.files?.providerIcon?.[0];

      if (!providerImage) {
        return errorResponse(res, "Provider image is required.", 400);
      }

      if (!providerIcon) {
        return errorResponse(res, "Provider icon is required.", 400);
      }

      const provider = await MasterRBGameProvider.create({
        categoryId,
        providerName: String(providerName).trim(),
        providerId: String(providerId).trim(),
        providerImage: filePath(providerImage),
        providerIcon: filePath(providerIcon),
        isHot: toBool(isHot),
        isNew: toBool(isNew),
        status: status || "active",
        syncStatus: "pending",
      });

      return successResponse(
        res,
        "RB game provider created successfully.",
        provider,
        201,
      );
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(
          res,
          "This provider already exists in this category.",
          400,
        );
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   GET ALL RB PROVIDERS
====================================================== */

router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const {
      categoryId = "",
      search = "",
      status = "",
      isHot = "",
      isNew = "",
      page = 1,
      limit = 20,
    } = req.query || {};

    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return errorResponse(res, "Invalid categoryId.", 400);
      }

      query.categoryId = categoryId;
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

    if (search) {
      query.$or = [
        { providerName: { $regex: search, $options: "i" } },
        { providerId: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    const [providers, total] = await Promise.all([
      MasterRBGameProvider.find(query)
        .populate(
          "categoryId",
          "categoryName categoryTitle bannerImage iconImage status",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      MasterRBGameProvider.countDocuments(query),
    ]);

    return successResponse(res, "RB game providers fetched successfully.", {
      providers,
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
   GET SINGLE RB PROVIDER
====================================================== */

router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const provider = await MasterRBGameProvider.findById(
      req.params.id,
    ).populate(
      "categoryId",
      "categoryName categoryTitle bannerImage iconImage status",
    );

    if (!provider) {
      return errorResponse(res, "RB game provider not found.", 404);
    }

    return successResponse(
      res,
      "RB game provider fetched successfully.",
      provider,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE RB PROVIDER
====================================================== */

router.put(
  "/:id",
  protectMasterAdmin,
  upload.fields([
    { name: "providerImage", maxCount: 1 },
    { name: "providerIcon", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const provider = await MasterRBGameProvider.findById(req.params.id);

      if (!provider) {
        return errorResponse(res, "RB game provider not found.", 404);
      }

      const { categoryId, providerName, providerId, status, isHot, isNew } =
        req.body || {};

      if (categoryId !== undefined) {
        if (!isValidObjectId(categoryId)) {
          return errorResponse(res, "Invalid categoryId.", 400);
        }

        const category = await MasterRBGameCategory.findById(categoryId);

        if (!category) {
          return errorResponse(res, "RB category not found.", 404);
        }

        provider.categoryId = categoryId;
      }

      if (providerName !== undefined) {
        provider.providerName = String(providerName).trim();
      }

      if (providerId !== undefined) {
        const newProviderId = String(providerId).trim();

        const exists = await MasterRBGameProvider.findOne({
          _id: { $ne: provider._id },
          categoryId: provider.categoryId,
          providerId: newProviderId,
        });

        if (exists) {
          return errorResponse(
            res,
            "This provider already exists in this category.",
            400,
          );
        }

        provider.providerId = newProviderId;
      }

      if (status !== undefined) {
        provider.status = status;
      }

      if (isHot !== undefined) {
        provider.isHot = toBool(isHot);
      }

      if (isNew !== undefined) {
        provider.isNew = toBool(isNew);
      }

      const providerImage = req.files?.providerImage?.[0];
      const providerIcon = req.files?.providerIcon?.[0];

      if (providerImage) {
        provider.providerImage = filePath(providerImage);
      }

      if (providerIcon) {
        provider.providerIcon = filePath(providerIcon);
      }

      provider.syncStatus = "pending";

      await provider.save();

      return successResponse(
        res,
        "RB game provider updated successfully.",
        provider,
      );
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(
          res,
          "This provider already exists in this category.",
          400,
        );
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   DELETE RB PROVIDER
====================================================== */

router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const provider = await MasterRBGameProvider.findByIdAndDelete(
      req.params.id,
    );

    if (!provider) {
      return errorResponse(res, "RB game provider not found.", 404);
    }

    return successResponse(
      res,
      "RB game provider deleted successfully.",
      provider,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
