import express from "express";
import mongoose from "mongoose";
import axios from "axios";

import MasterRBGameProvider from "../models/MasterRBGameProvider.js";
import MasterRBGameCategory from "../models/MasterRBGameCategory.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { errorResponse, successResponse } from "../utils/response.js";

const router = express.Router();

const ORACLE_PROVIDER_LIST_API =
  process.env.ORACLE_PROVIDER_LIST_API ||
  "https://oraclegames.net/api/providerlist";

const ORACLE_PROVIDER_LIST_KEY =
  process.env.ORACLE_PROVIDER_LIST_KEY || "1189baca156e1bbbecc3b26651a63565";

const filePath = (file) => {
  if (!file) return "";
  return `/uploads/${file.filename}`;
};

const toBool = (value) => {
  return value === true || value === "true" || value === "1" || value === 1;
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanText = (value = "") => String(value || "").trim();

const cleanProviderCode = (value = "") => cleanText(value).toUpperCase();

/* ======================================================
   FETCH ORACLE PROVIDER LIST
   GET /api/master-rb-game-providers/oracle/list
====================================================== */

router.get("/oracle/list", protectMasterAdmin, async (req, res) => {
  try {
    const response = await axios.get(ORACLE_PROVIDER_LIST_API, {
      headers: {
        "x-oraclegamedata-key": ORACLE_PROVIDER_LIST_KEY,
      },
      timeout: 30000,
    });

    const list = Array.isArray(response.data) ? response.data : [];

    const providers = list
      .filter((item) => item?.code && item?.name)
      .map((item) => ({
        providerCode: cleanProviderCode(item.code),
        providerName: cleanText(item.name),
        image: item.image || "",
        status: item.status,
        currency: item.currency || "",
        language: item.language || "",
      }));

    return successResponse(
      res,
      "Oracle provider list fetched successfully.",
      providers,
    );
  } catch (error) {
    return errorResponse(
      res,
      error?.response?.data?.message ||
        error.message ||
        "Failed to fetch Oracle provider list.",
      500,
    );
  }
});

/* ======================================================
   SYNC / SAVE ORACLE PROVIDERS BY CATEGORY
   POST /api/master-rb-game-providers/oracle/sync
   body: { categoryId, providers: [{ providerCode, providerName }] }
====================================================== */

router.post("/oracle/sync", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId, providers = [] } = req.body || {};

    if (!categoryId || !isValidObjectId(categoryId)) {
      return errorResponse(res, "Valid categoryId is required.", 400);
    }

    const category = await MasterRBGameCategory.findById(categoryId);

    if (!category) {
      return errorResponse(res, "RB category not found.", 404);
    }

    if (!Array.isArray(providers) || providers.length === 0) {
      return errorResponse(res, "Providers array is required.", 400);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    const savedProviders = [];

    for (const item of providers) {
      const providerCode = cleanProviderCode(item.providerCode || item.code);
      const providerName = cleanText(item.providerName || item.name);

      if (!providerCode || !providerName) {
        skipped += 1;
        continue;
      }

      const existing = await MasterRBGameProvider.findOne({
        categoryId,
        providerCode,
      });

      if (existing) {
        existing.providerName = providerName;
        existing.syncStatus = "synced";
        existing.lastSyncedAt = new Date();

        await existing.save();

        updated += 1;
        savedProviders.push(existing);
      } else {
        const provider = await MasterRBGameProvider.create({
          categoryId,
          providerCode,
          providerName,
          providerImage: item.image || "",
          providerIcon: item.image || "",
          isHot: false,
          isNew: false,
          status: "active",
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });

        created += 1;
        savedProviders.push(provider);
      }
    }

    return successResponse(res, "Oracle providers synced successfully.", {
      created,
      updated,
      skipped,
      providers: savedProviders,
    });
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
});

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
      const { categoryId, providerCode, providerName, status, isHot, isNew } =
        req.body || {};

      if (!categoryId || !isValidObjectId(categoryId)) {
        return errorResponse(res, "Valid categoryId is required.", 400);
      }

      if (!providerCode || !providerName) {
        return errorResponse(
          res,
          "providerCode and providerName are required.",
          400,
        );
      }

      const category = await MasterRBGameCategory.findById(categoryId);

      if (!category) {
        return errorResponse(res, "RB category not found.", 404);
      }

      const finalProviderCode = cleanProviderCode(providerCode);

      const exists = await MasterRBGameProvider.findOne({
        categoryId,
        providerCode: finalProviderCode,
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
        providerCode: finalProviderCode,
        providerName: cleanText(providerName),
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
      syncStatus = "",
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

    if (syncStatus) {
      query.syncStatus = syncStatus;
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
        { providerCode: { $regex: search, $options: "i" } },
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

      const { categoryId, providerCode, providerName, status, isHot, isNew } =
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

      if (providerCode !== undefined) {
        const newProviderCode = cleanProviderCode(providerCode);

        if (!newProviderCode) {
          return errorResponse(res, "providerCode is required.", 400);
        }

        const exists = await MasterRBGameProvider.findOne({
          _id: { $ne: provider._id },
          categoryId: provider.categoryId,
          providerCode: newProviderCode,
        });

        if (exists) {
          return errorResponse(
            res,
            "This provider already exists in this category.",
            400,
          );
        }

        provider.providerCode = newProviderCode;
      }

      if (providerName !== undefined) {
        const newProviderName = cleanText(providerName);

        if (!newProviderName) {
          return errorResponse(res, "providerName is required.", 400);
        }

        provider.providerName = newProviderName;
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
