import express from "express";
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

const n = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const getNextOrder = async () => {
  const last = await MasterRBGameCategory.findOne().sort({ order: -1 });

  return n(last?.order) + 1;
};

/* ======================================================
   CREATE CATEGORY
====================================================== */

router.post(
  "/",
  protectMasterAdmin,
  upload.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "iconImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        categoryNameBn,
        categoryNameEn,
        categoryTitleBn,
        categoryTitleEn,
        order,
        jackpot,
        status,
      } = req.body || {};

      if (!categoryNameBn || !categoryNameEn) {
        return errorResponse(res, "Category name BN and EN are required.", 400);
      }

      if (!categoryTitleBn || !categoryTitleEn) {
        return errorResponse(
          res,
          "Category title BN and EN are required.",
          400,
        );
      }

      const banner = req.files?.bannerImage?.[0];
      const icon = req.files?.iconImage?.[0];

      if (!banner) {
        return errorResponse(res, "Banner image is required.", 400);
      }

      const finalOrder =
        String(order || "").trim() === "" ? await getNextOrder() : n(order);

      const category = await MasterRBGameCategory.create({
        categoryName: {
          bn: categoryNameBn,
          en: categoryNameEn,
        },

        categoryTitle: {
          bn: categoryTitleBn,
          en: categoryTitleEn,
        },

        bannerImage: filePath(banner),

        iconImage: filePath(icon),

        order: finalOrder,

        jackpot: toBool(jackpot),

        status: status || "active",

        syncStatus: "pending",
      });

      return successResponse(
        res,
        "RB game category created successfully.",
        category,
        201,
      );
    } catch (error) {
      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   GET ALL CATEGORY
====================================================== */

router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      jackpot = "",
      page = 1,
      limit = 20,
    } = req.query || {};

    const query = {};

    if (status) {
      query.status = status;
    }

    if (jackpot !== "") {
      query.jackpot = toBool(jackpot);
    }

    if (search) {
      query.$or = [
        {
          "categoryName.bn": {
            $regex: search,
            $options: "i",
          },
        },

        {
          "categoryName.en": {
            $regex: search,
            $options: "i",
          },
        },

        {
          "categoryTitle.bn": {
            $regex: search,
            $options: "i",
          },
        },

        {
          "categoryTitle.en": {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const pageNum = Math.max(n(page), 1);
    const limitNum = Math.max(n(limit), 1);

    const skip = (pageNum - 1) * limitNum;

    const [categories, total] = await Promise.all([
      MasterRBGameCategory.find(query)
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      MasterRBGameCategory.countDocuments(query),
    ]);

    return successResponse(res, "RB game categories fetched successfully.", {
      categories,

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
   GET SINGLE CATEGORY
====================================================== */

router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const category = await MasterRBGameCategory.findById(req.params.id);

    if (!category) {
      return errorResponse(res, "RB game category not found.", 404);
    }

    return successResponse(
      res,
      "RB game category fetched successfully.",
      category,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE CATEGORY
====================================================== */

router.put(
  "/:id",
  protectMasterAdmin,
  upload.fields([
    { name: "bannerImage", maxCount: 1 },
    { name: "iconImage", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const category = await MasterRBGameCategory.findById(req.params.id);

      if (!category) {
        return errorResponse(res, "RB game category not found.", 404);
      }

      const {
        categoryNameBn,
        categoryNameEn,
        categoryTitleBn,
        categoryTitleEn,
        order,
        jackpot,
        status,
      } = req.body || {};

      if (categoryNameBn !== undefined) {
        category.categoryName.bn = categoryNameBn;
      }

      if (categoryNameEn !== undefined) {
        category.categoryName.en = categoryNameEn;
      }

      if (categoryTitleBn !== undefined) {
        category.categoryTitle.bn = categoryTitleBn;
      }

      if (categoryTitleEn !== undefined) {
        category.categoryTitle.en = categoryTitleEn;
      }

      if (String(order || "").trim() !== "") {
        category.order = n(order);
      }

      if (jackpot !== undefined) {
        category.jackpot = toBool(jackpot);
      }

      if (status !== undefined) {
        category.status = status;
      }

      const banner = req.files?.bannerImage?.[0];
      const icon = req.files?.iconImage?.[0];

      if (banner) {
        category.bannerImage = filePath(banner);
      }

      if (icon) {
        category.iconImage = filePath(icon);
      }

      category.syncStatus = "pending";

      await category.save();

      return successResponse(
        res,
        "RB game category updated successfully.",
        category,
      );
    } catch (error) {
      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   DELETE CATEGORY
====================================================== */

router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const category = await MasterRBGameCategory.findByIdAndDelete(
      req.params.id,
    );

    if (!category) {
      return errorResponse(res, "RB game category not found.", 404);
    }

    return successResponse(
      res,
      "RB game category deleted successfully.",
      category,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
