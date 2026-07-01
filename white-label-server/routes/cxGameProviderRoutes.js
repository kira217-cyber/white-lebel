import express from "express";
import mongoose from "mongoose";
import axios from "axios";
import fs from "fs";
import path from "path";

import CxGameProvider from "../models/CxGameProvider.js";
import CxGameCategory from "../models/CxGameCategory.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const ORACLE_PROVIDER_LIST_API =
  process.env.ORACLE_PROVIDER_LIST_API ||
  "https://oraclegames.net/api/providerlist";

const ORACLE_PROVIDER_LIST_KEY = "1189baca156e1bbbecc3b26651a63565";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanText = (value = "") => String(value || "").trim();

const cleanProviderCode = (value = "") => cleanText(value).toUpperCase();

const toBool = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

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

const formatProvider = (req, provider) => {
  const obj = provider.toObject ? provider.toObject() : provider;

  return {
    ...obj,
    providerIconUrl: obj.providerIcon
      ? buildFileUrl(req, obj.providerIcon)
      : "",
  };
};

/* ======================================================
   ORACLE PROVIDER LIST
   GET /api/master/cx-game-providers/oracle/list
====================================================== */
router.get("/oracle/list", protectMasterAdmin, async (req, res) => {
  try {
    const response = await axios.get(ORACLE_PROVIDER_LIST_API, {
      headers: {
        "x-oraclegamedata-key": ORACLE_PROVIDER_LIST_KEY,
      },
      timeout: 30000,
    });

    const list = Array.isArray(response.data)
      ? response.data
      : response.data?.data || response.data?.providers || [];

    const providers = list
      .filter((item) => item?.code && item?.name)
      .map((item) => ({
        providerCode: cleanProviderCode(item.code),
        providerName: cleanText(item.name),
        image: item.image || "",
        status: item.status || "",
        currency: item.currency || "",
        language: item.language || "",
      }));

    return successResponse(
      res,
      "CX Oracle provider list fetched successfully.",
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
   SYNC SELECTED ORACLE PROVIDER
   POST /api/master/cx-game-providers/oracle/sync
====================================================== */
router.post("/oracle/sync", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId, providers = [] } = req.body || {};

    if (!categoryId || !isValidObjectId(categoryId)) {
      return errorResponse(res, "Valid categoryId is required.", 400);
    }

    const category = await CxGameCategory.findById(categoryId);

    if (!category) {
      return errorResponse(res, "CX game category not found.", 404);
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

      const existing = await CxGameProvider.findOne({
        categoryId,
        providerCode,
      });

      if (existing) {
        existing.providerName = providerName;
        existing.syncStatus = "synced";
        existing.lastSyncedAt = new Date();

        if (item.image && !existing.providerIcon) {
          existing.providerIcon = item.image;
        }

        await existing.save();

        updated += 1;
        savedProviders.push(formatProvider(req, existing));
      } else {
        const provider = await CxGameProvider.create({
          categoryId,
          providerCode,
          providerName,
          providerIcon: item.image || "",
          isHome: false,
          status: "active",
          syncStatus: "synced",
          lastSyncedAt: new Date(),
        });

        created += 1;
        savedProviders.push(formatProvider(req, provider));
      }
    }

    return successResponse(res, "CX Oracle providers synced successfully.", {
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
   CREATE PROVIDER
====================================================== */
router.post(
  "/",
  protectMasterAdmin,
  upload.single("providerIcon"),
  async (req, res) => {
    try {
      const { categoryId, providerCode, providerName, status, isHome } =
        req.body || {};

      if (!categoryId || !isValidObjectId(categoryId)) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Valid categoryId is required.", 400);
      }

      if (!providerCode || !providerName) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(
          res,
          "providerCode and providerName are required.",
          400,
        );
      }

      const category = await CxGameCategory.findById(categoryId);

      if (!category) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "CX game category not found.", 404);
      }

      const finalProviderCode = cleanProviderCode(providerCode);

      const exists = await CxGameProvider.findOne({
        categoryId,
        providerCode: finalProviderCode,
      });

      if (exists) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(
          res,
          "This provider already exists in this category.",
          400,
        );
      }

      const provider = await CxGameProvider.create({
        categoryId,
        providerCode: finalProviderCode,
        providerName: cleanText(providerName),
        providerIcon: req.file ? filePath(req.file) : "",
        isHome: toBool(isHome),
        status: status === "inactive" ? "inactive" : "active",
        syncStatus: "pending",
      });

      return successResponse(
        res,
        "CX game provider created successfully.",
        formatProvider(req, provider),
        201,
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));

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
   GET ALL PROVIDERS
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

    if (status) query.status = status;
    if (syncStatus) query.syncStatus = syncStatus;

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
      CxGameProvider.find(query)
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      CxGameProvider.countDocuments(query),
    ]);

    return successResponse(res, "CX game providers fetched successfully.", {
      providers: providers.map((item) => formatProvider(req, item)),
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
   ACTIVE PROVIDERS
====================================================== */
router.get("/active/list", async (req, res) => {
  try {
    const { categoryId = "", isHome = "" } = req.query || {};

    const query = { status: "active" };

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return errorResponse(res, "Invalid categoryId.", 400);
      }

      query.categoryId = categoryId;
    }

    if (isHome !== "") {
      query.isHome = toBool(isHome);
    }

    const providers = await CxGameProvider.find(query)
      .populate("categoryId", "categoryName categoryTitle iconImage status")
      .sort({ createdAt: -1 });

    return successResponse(
      res,
      "CX active game providers fetched successfully.",
      providers.map((item) => formatProvider(req, item)),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   SINGLE PROVIDER
====================================================== */
router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid provider id.", 400);
    }

    const provider = await CxGameProvider.findById(req.params.id).populate(
      "categoryId",
      "categoryName categoryTitle iconImage status",
    );

    if (!provider) {
      return errorResponse(res, "CX game provider not found.", 404);
    }

    return successResponse(
      res,
      "CX game provider fetched successfully.",
      formatProvider(req, provider),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE PROVIDER
====================================================== */
router.put(
  "/:id",
  protectMasterAdmin,
  upload.single("providerIcon"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Invalid provider id.", 400);
      }

      const provider = await CxGameProvider.findById(req.params.id);

      if (!provider) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "CX game provider not found.", 404);
      }

      const {
        categoryId,
        providerCode,
        providerName,
        status,
        isHome,
        removeOldIcon,
      } = req.body || {};

      const oldIcon = provider.providerIcon;

      if (categoryId !== undefined) {
        if (!isValidObjectId(categoryId)) {
          if (req.file) deleteLocalFile(filePath(req.file));
          return errorResponse(res, "Invalid categoryId.", 400);
        }

        const category = await CxGameCategory.findById(categoryId);

        if (!category) {
          if (req.file) deleteLocalFile(filePath(req.file));
          return errorResponse(res, "CX game category not found.", 404);
        }

        provider.categoryId = categoryId;
      }

      if (providerCode !== undefined) {
        const newProviderCode = cleanProviderCode(providerCode);

        if (!newProviderCode) {
          if (req.file) deleteLocalFile(filePath(req.file));
          return errorResponse(res, "providerCode is required.", 400);
        }

        const exists = await CxGameProvider.findOne({
          _id: { $ne: provider._id },
          categoryId: provider.categoryId,
          providerCode: newProviderCode,
        });

        if (exists) {
          if (req.file) deleteLocalFile(filePath(req.file));
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
          if (req.file) deleteLocalFile(filePath(req.file));
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

      if (req.file) {
        provider.providerIcon = filePath(req.file);
      } else if (removeOldIcon === "true") {
        provider.providerIcon = "";
      }

      provider.syncStatus = "pending";

      await provider.save();

      if (req.file && oldIcon && !String(oldIcon).startsWith("http")) {
        deleteLocalFile(oldIcon);
      }

      if (
        removeOldIcon === "true" &&
        !req.file &&
        oldIcon &&
        !String(oldIcon).startsWith("http")
      ) {
        deleteLocalFile(oldIcon);
      }

      return successResponse(
        res,
        "CX game provider updated successfully.",
        formatProvider(req, provider),
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));

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
   DELETE PROVIDER
====================================================== */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid provider id.", 400);
    }

    const provider = await CxGameProvider.findById(req.params.id);

    if (!provider) {
      return errorResponse(res, "CX game provider not found.", 404);
    }

    const oldIcon = provider.providerIcon;

    let deletedGamesCount = 0;

    if (mongoose.models.CxGame) {
      const deletedGames = await mongoose.models.CxGame.deleteMany({
        providerDbId: provider._id,
      });

      deletedGamesCount = deletedGames?.deletedCount || 0;
    }

    await CxGameProvider.findByIdAndDelete(provider._id);

    if (oldIcon && !String(oldIcon).startsWith("http")) {
      deleteLocalFile(oldIcon);
    }

    return successResponse(res, "CX provider deleted successfully.", {
      providerId: provider._id,
      deletedGames: deletedGamesCount,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
