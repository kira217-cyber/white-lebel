import express from "express";
import fs from "fs";
import path from "path";

import MyGpCategory from "../models/MyGpCategory.js";
import { upload } from "../config/multer.js";

import {
  successResponse,
  errorResponse,
} from "../utils/response.js";

const router = express.Router();

const buildFileUrl = (req, filePath = "") => {
  if (!filePath) return "";

  const normalized = filePath.replace(/\\/g, "/");

  return `${req.protocol}://${req.get("host")}/${normalized}`;
};

const formatCategory = (req, category) => {
  const obj = category.toObject();

  return {
    ...obj,
    iconImageUrl: obj.iconImage
      ? buildFileUrl(req, obj.iconImage)
      : "",
  };
};

const deleteLocalFile = (filePath = "") => {
  if (!filePath) return;

  const fullPath = path.resolve(filePath);

  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};





// CREATE
router.post(
  "/",
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
      } = req.body;

      if (
        !categoryNameBn?.trim() ||
        !categoryNameEn?.trim()
      ) {
        if (req.file) deleteLocalFile(req.file.path);

        return errorResponse(
          res,
          "Category name Bangla and English required",
          400,
        );
      }

      if (
        !categoryTitleBn?.trim() ||
        !categoryTitleEn?.trim()
      ) {
        if (req.file) deleteLocalFile(req.file.path);

        return errorResponse(
          res,
          "Category title Bangla and English required",
          400,
        );
      }

      const category = await MyGpCategory.create({
        categoryName: {
          bn: categoryNameBn.trim(),
          en: categoryNameEn.trim(),
        },

        categoryTitle: {
          bn: categoryTitleBn.trim(),
          en: categoryTitleEn.trim(),
        },

        iconImage: req.file
          ? req.file.path.replace(/\\/g, "/")
          : "",

        order: Number(order) || 0,

        status:
          status === "inactive"
            ? "inactive"
            : "active",
      });

      return successResponse(
        res,
        "MyGP category created successfully",
        formatCategory(req, category),
        201,
      );
    } catch (error) {
      if (req.file) {
        deleteLocalFile(req.file.path);
      }

      return errorResponse(
        res,
        error.message || "Failed to create category",
        500,
      );
    }
  },
);





// ADMIN ALL
router.get("/admin/all", async (req, res) => {
  try {
    const categories = await MyGpCategory.find()
      .sort({
        order: 1,
        createdAt: -1,
      });

    return successResponse(
      res,
      "Categories fetched successfully",
      categories.map((item) =>
        formatCategory(req, item),
      ),
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch categories",
      500,
    );
  }
});





// ACTIVE
router.get("/", async (req, res) => {
  try {
    const categories = await MyGpCategory.find({
      status: "active",
    }).sort({
      order: 1,
      createdAt: -1,
    });

    return successResponse(
      res,
      "Categories fetched successfully",
      categories.map((item) =>
        formatCategory(req, item),
      ),
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch categories",
      500,
    );
  }
});





// SINGLE
router.get("/:id", async (req, res) => {
  try {
    const category =
      await MyGpCategory.findById(req.params.id);

    if (!category) {
      return errorResponse(
        res,
        "Category not found",
        404,
      );
    }

    return successResponse(
      res,
      "Category fetched successfully",
      formatCategory(req, category),
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to fetch category",
      500,
    );
  }
});





// UPDATE
router.put(
  "/:id",
  upload.single("iconImage"),
  async (req, res) => {
    try {
      const category =
        await MyGpCategory.findById(req.params.id);

      if (!category) {
        if (req.file) {
          deleteLocalFile(req.file.path);
        }

        return errorResponse(
          res,
          "Category not found",
          404,
        );
      }

      const {
        categoryNameBn,
        categoryNameEn,
        categoryTitleBn,
        categoryTitleEn,
        order,
        status,
        removeOldImage,
      } = req.body;

      const oldImagePath = category.iconImage;

      category.categoryName = {
        bn: categoryNameBn?.trim(),
        en: categoryNameEn?.trim(),
      };

      category.categoryTitle = {
        bn: categoryTitleBn?.trim(),
        en: categoryTitleEn?.trim(),
      };

      category.order = Number(order) || 0;

      category.status =
        status === "inactive"
          ? "inactive"
          : "active";

      if (req.file) {
        category.iconImage =
          req.file.path.replace(/\\/g, "/");
      } else if (removeOldImage === "true") {
        category.iconImage = "";
      }

      await category.save();

      if (req.file && oldImagePath) {
        deleteLocalFile(oldImagePath);
      }

      if (
        removeOldImage === "true" &&
        !req.file &&
        oldImagePath
      ) {
        deleteLocalFile(oldImagePath);
      }

      return successResponse(
        res,
        "Category updated successfully",
        formatCategory(req, category),
      );
    } catch (error) {
      if (req.file) {
        deleteLocalFile(req.file.path);
      }

      return errorResponse(
        res,
        error.message || "Failed to update category",
        500,
      );
    }
  },
);





// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const category =
      await MyGpCategory.findById(req.params.id);

    if (!category) {
      return errorResponse(
        res,
        "Category not found",
        404,
      );
    }

    const oldImagePath = category.iconImage;

    await MyGpCategory.findByIdAndDelete(
      req.params.id,
    );

    if (oldImagePath) {
      deleteLocalFile(oldImagePath);
    }

    return successResponse(
      res,
      "Category deleted successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to delete category",
      500,
    );
  }
});

export default router;