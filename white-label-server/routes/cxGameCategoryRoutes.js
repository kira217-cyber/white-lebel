import express from "express";
import fs from "fs";
import path from "path";

import CxGameCategory from "../models/CxGameCategory.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { upload } from "../config/multer.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

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

const formatCategory = (req, category) => {
  const obj = category.toObject ? category.toObject() : category;

  return {
    ...obj,
    iconImageUrl: obj.iconImage ? buildFileUrl(req, obj.iconImage) : "",
  };
};

/* CREATE */
router.post(
  "/",
  protectMasterAdmin,
  upload.single("iconImage"),
  async (req, res) => {
    try {
      const {
        categoryNameBn,
        categoryNameEn,
        categoryTitleBn,
        categoryTitleEn,
        order,
        status,
      } = req.body || {};

      if (!categoryNameBn?.trim() || !categoryNameEn?.trim()) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Category name BN and EN required", 400);
      }

      if (!categoryTitleBn?.trim() || !categoryTitleEn?.trim()) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Category title BN and EN required", 400);
      }

      const category = await CxGameCategory.create({
        categoryName: {
          bn: categoryNameBn.trim(),
          en: categoryNameEn.trim(),
        },
        categoryTitle: {
          bn: categoryTitleBn.trim(),
          en: categoryTitleEn.trim(),
        },
        iconImage: req.file ? filePath(req.file) : "",
        order: Number(order) || 0,
        status: status === "inactive" ? "inactive" : "active",
      });

      return successResponse(
        res,
        "CX game category created successfully.",
        formatCategory(req, category),
        201,
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));
      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ADMIN ALL */
router.get("/admin/all", protectMasterAdmin, async (req, res) => {
  try {
    const { search = "", status = "" } = req.query || {};

    const query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { "categoryName.bn": { $regex: search, $options: "i" } },
        { "categoryName.en": { $regex: search, $options: "i" } },
        { "categoryTitle.bn": { $regex: search, $options: "i" } },
        { "categoryTitle.en": { $regex: search, $options: "i" } },
      ];
    }

    const categories = await CxGameCategory.find(query).sort({
      order: 1,
      createdAt: -1,
    });

    return successResponse(
      res,
      "CX categories fetched successfully.",
      categories.map((item) => formatCategory(req, item)),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ACTIVE PUBLIC */
router.get("/", async (req, res) => {
  try {
    const categories = await CxGameCategory.find({ status: "active" }).sort({
      order: 1,
      createdAt: -1,
    });

    return successResponse(
      res,
      "CX active categories fetched successfully.",
      categories.map((item) => formatCategory(req, item)),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* SINGLE */
router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const category = await CxGameCategory.findById(req.params.id);

    if (!category) {
      return errorResponse(res, "CX category not found.", 404);
    }

    return successResponse(
      res,
      "CX category fetched successfully.",
      formatCategory(req, category),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* UPDATE */
router.put(
  "/:id",
  protectMasterAdmin,
  upload.single("iconImage"),
  async (req, res) => {
    try {
      const category = await CxGameCategory.findById(req.params.id);

      if (!category) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "CX category not found.", 404);
      }

      const {
        categoryNameBn,
        categoryNameEn,
        categoryTitleBn,
        categoryTitleEn,
        order,
        status,
        removeOldImage,
      } = req.body || {};

      if (!categoryNameBn?.trim() || !categoryNameEn?.trim()) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Category name BN and EN required", 400);
      }

      if (!categoryTitleBn?.trim() || !categoryTitleEn?.trim()) {
        if (req.file) deleteLocalFile(filePath(req.file));
        return errorResponse(res, "Category title BN and EN required", 400);
      }

      const oldImage = category.iconImage;

      category.categoryName = {
        bn: categoryNameBn.trim(),
        en: categoryNameEn.trim(),
      };

      category.categoryTitle = {
        bn: categoryTitleBn.trim(),
        en: categoryTitleEn.trim(),
      };

      category.order = Number(order) || 0;
      category.status = status === "inactive" ? "inactive" : "active";

      if (req.file) {
        category.iconImage = filePath(req.file);
      } else if (removeOldImage === "true") {
        category.iconImage = "";
      }

      await category.save();

      if (req.file && oldImage) deleteLocalFile(oldImage);
      if (removeOldImage === "true" && !req.file && oldImage) {
        deleteLocalFile(oldImage);
      }

      return successResponse(
        res,
        "CX category updated successfully.",
        formatCategory(req, category),
      );
    } catch (error) {
      if (req.file) deleteLocalFile(filePath(req.file));
      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* DELETE */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const category = await CxGameCategory.findById(req.params.id);

    if (!category) {
      return errorResponse(res, "CX category not found.", 404);
    }

    const oldImage = category.iconImage;

    await CxGameCategory.findByIdAndDelete(category._id);

    if (oldImage) deleteLocalFile(oldImage);

    return successResponse(res, "CX category deleted successfully.", {
      categoryId: category._id,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
