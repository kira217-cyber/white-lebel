import express from "express";
import mongoose from "mongoose";
import axios from "axios";

import MasterMyGpGameProvider from "../models/MasterMyGpGameProvider.js";
import MyGpCategory from "../models/MyGpCategory.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const ORACLE_PROVIDER_LIST_API =
  process.env.ORACLE_PROVIDER_LIST_API ||
  "https://oraclegames.net/api/providerlist";

const ORACLE_PROVIDER_LIST_KEY = process.env.ORACLE_PROVIDER_LIST_KEY || "";

const uploadProviderFiles = upload.fields([
  { name: "providerIcon", maxCount: 1 },
  { name: "providerImage", maxCount: 1 },
]);

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
   GET /api/master/mygp-game-providers/oracle/list
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
   SYNC ORACLE PROVIDERS
   POST /api/master/mygp-game-providers/oracle/sync
====================================================== */

router.post("/oracle/sync", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId, providers = [] } = req.body || {};

    if (!categoryId || !isValidObjectId(categoryId)) {
      return errorResponse(res, "Valid categoryId is required.", 400);
    }

    const category = await MyGpCategory.findById(categoryId);

    if (!category) {
      return errorResponse(res, "MyGP category not found.", 404);
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

      const existing = await MasterMyGpGameProvider.findOne({
        categoryId,
        providerCode,
      });

      if (existing) {
        existing.providerName = providerName;
        existing.syncStatus = "synced";
        existing.lastSyncedAt = new Date();

        if (item.image && !existing.providerImage) {
          existing.providerImage = item.image;
        }

        if (item.image && !existing.providerIcon) {
          existing.providerIcon = item.image;
        }

        await existing.save();

        updated += 1;
        savedProviders.push(existing);
      } else {
        const provider = await MasterMyGpGameProvider.create({
          categoryId,
          providerCode,
          providerName,
          providerImage: item.image || "",
          providerIcon: item.image || "",
          isHome: false,
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
   CREATE MYGP PROVIDER
   POST /api/master/mygp-game-providers
====================================================== */

router.post("/", protectMasterAdmin, uploadProviderFiles, async (req, res) => {
  try {
    const { categoryId, providerCode, providerName, status, isHome } =
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

    const category = await MyGpCategory.findById(categoryId);

    if (!category) {
      return errorResponse(res, "MyGP category not found.", 404);
    }

    const finalProviderCode = cleanProviderCode(providerCode);

    const exists = await MasterMyGpGameProvider.findOne({
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

    const providerIcon = req.files?.providerIcon?.[0];
    const providerImage = req.files?.providerImage?.[0];

    const provider = await MasterMyGpGameProvider.create({
      categoryId,
      providerCode: finalProviderCode,
      providerName: cleanText(providerName),
      providerIcon: filePath(providerIcon),
      providerImage: filePath(providerImage),
      isHome: toBool(isHome),
      status: status === "inactive" ? "inactive" : "active",
      syncStatus: "pending",
    });

    return successResponse(
      res,
      "MyGP game provider created successfully.",
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
});

/* ======================================================
   GET ALL MYGP PROVIDERS
   GET /api/master/mygp-game-providers
====================================================== */

router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const {
      categoryId = "",
      search = "",
      status = "",
      isHome = "",
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

    if (isHome !== "") {
      query.isHome = toBool(isHome);
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
      MasterMyGpGameProvider.find(query)
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      MasterMyGpGameProvider.countDocuments(query),
    ]);

    return successResponse(res, "MyGP game providers fetched successfully.", {
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
   GET SINGLE MYGP PROVIDER
====================================================== */

router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const provider = await MasterMyGpGameProvider.findById(
      req.params.id,
    ).populate("categoryId", "categoryName categoryTitle iconImage status");

    if (!provider) {
      return errorResponse(res, "MyGP game provider not found.", 404);
    }

    return successResponse(
      res,
      "MyGP game provider fetched successfully.",
      provider,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE MYGP PROVIDER
====================================================== */

router.put(
  "/:id",
  protectMasterAdmin,
  uploadProviderFiles,
  async (req, res) => {
    try {
      const provider = await MasterMyGpGameProvider.findById(req.params.id);

      if (!provider) {
        return errorResponse(res, "MyGP game provider not found.", 404);
      }

      const { categoryId, providerCode, providerName, status, isHome } =
        req.body || {};

      if (categoryId !== undefined) {
        if (!isValidObjectId(categoryId)) {
          return errorResponse(res, "Invalid categoryId.", 400);
        }

        const category = await MyGpCategory.findById(categoryId);

        if (!category) {
          return errorResponse(res, "MyGP category not found.", 404);
        }

        provider.categoryId = categoryId;
      }

      if (providerCode !== undefined) {
        const newProviderCode = cleanProviderCode(providerCode);

        if (!newProviderCode) {
          return errorResponse(res, "providerCode is required.", 400);
        }

        const exists = await MasterMyGpGameProvider.findOne({
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
        provider.status = status === "inactive" ? "inactive" : "active";
      }

      if (isHome !== undefined) {
        provider.isHome = toBool(isHome);
      }

      const providerIcon = req.files?.providerIcon?.[0];
      const providerImage = req.files?.providerImage?.[0];

      if (providerIcon) {
        provider.providerIcon = filePath(providerIcon);
      }

      if (providerImage) {
        provider.providerImage = filePath(providerImage);
      }

      provider.syncStatus = "pending";

      await provider.save();

      return successResponse(
        res,
        "MyGP game provider updated successfully.",
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
   DELETE MYGP PROVIDER
====================================================== */

router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const provider = await MasterMyGpGameProvider.findByIdAndDelete(
      req.params.id,
    );

    if (!provider) {
      return errorResponse(res, "MyGP game provider not found.", 404);
    }

    return successResponse(
      res,
      "MyGP game provider deleted successfully.",
      provider,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
