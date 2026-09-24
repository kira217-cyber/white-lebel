import express from "express";

import TbGameCategory from "../models/TbGameCategory.js";
import TbGameProvider from "../models/TbGameProvider.js";
import TbGame from "../models/TbGame.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";
import {
  applyOrder,
  cleanCode,
  cleanText,
  cleanupUploads,
  deleteLocalFile,
  filePath,
  findSorted,
  formatCategory,
  isValidObjectId,
  toBool,
} from "../utils/tbShared.js";

const router = express.Router();

const TYPES = ["games", "hot", "favorite", "provider", "sports"];
const ICON_FIELDS = ["deskIcon", "mobIcon", "titleIcon"];

const iconUpload = upload.fields(ICON_FIELDS.map((name) => ({ name, maxCount: 1 })));

const cleanKey = (value = "") =>
  cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Shared by create and update: only the fields that were sent are applied.
const applyBody = (target, body = {}) => {
  if (body.nameBn !== undefined || body.nameEn !== undefined) {
    target.name = {
      bn: cleanText(body.nameBn ?? target.name?.bn),
      en: cleanText(body.nameEn ?? target.name?.en),
    };
  }

  if (body.key !== undefined) target.key = cleanKey(body.key);
  if (body.type !== undefined) target.type = TYPES.includes(body.type) ? body.type : "games";
  if (body.providerCode !== undefined) target.providerCode = cleanCode(body.providerCode);

  ["showOnDesktop", "showOnMobile", "showOnHome", "showOnHomeMobile", "showProviders"].forEach((field) => {
    if (body[field] !== undefined) target[field] = toBool(body[field]);
  });

  ["deskIconW", "deskIconH"].forEach((field) => {
    if (body[field] === undefined) return;
    const value = Math.round(Number(body[field]) || 0);
    target[field] = Math.min(Math.max(value, 0), 120);
  });

  if (body.status !== undefined) {
    target.status = body.status === "inactive" ? "inactive" : "active";
  }
};

const validate = (category) => {
  if (!category.name?.bn || !category.name?.en) return "Name BN and EN are required.";
  if (!category.key) return "URL key is required (e.g. slot).";
  if (category.type === "provider" && !category.providerCode) {
    return "Pick the provider this shortcut opens.";
  }
  return "";
};

/* GET /api/master/tb-game-categories — admin list, in site order */
router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const categories = await findSorted({ model: TbGameCategory });

    const [providerCounts, gameCounts] = await Promise.all([
      TbGameProvider.aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }]),
      TbGame.aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }]),
    ]);

    const countMap = (rows) =>
      Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
    const providers = countMap(providerCounts);
    const games = countMap(gameCounts);

    return successResponse(
      res,
      "TB categories fetched successfully.",
      categories.map((item) => ({
        ...formatCategory(req, item),
        providerCount: providers[String(item._id)] || 0,
        gameCount: games[String(item._id)] || 0,
      })),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* POST /api/master/tb-game-categories */
router.post("/", protectMasterAdmin, iconUpload, async (req, res) => {
  try {
    const category = new TbGameCategory({});
    applyBody(category, req.body);

    ICON_FIELDS.forEach((field) => {
      const file = req.files?.[field]?.[0];
      if (file) category[field] = filePath(file);
    });

    const invalid = validate(category);
    if (invalid) {
      cleanupUploads(req);
      return errorResponse(res, invalid, 400);
    }

    // New categories go to the end of the bar.
    const last = await TbGameCategory.findOne().sort({ order: -1 }).select("order");
    category.order = (last?.order || 0) + 1;

    await category.save();

    return successResponse(
      res,
      "TB category created successfully.",
      formatCategory(req, category),
      201,
    );
  } catch (error) {
    cleanupUploads(req);

    if (error?.code === 11000) {
      return errorResponse(res, "This URL key is already used by another category.", 400);
    }

    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/tb-game-categories/reorder  { ids: [...], field?: "deskOrder" }
   `order` = mobile tabs + home sections, `deskOrder` = desktop tab bar. */
router.patch("/reorder", protectMasterAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const field = req.body?.field === "deskOrder" ? "deskOrder" : "order";
    await applyOrder(TbGameCategory, ids, field);

    return successResponse(res, "Category order saved.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PUT /api/master/tb-game-categories/:id */
router.put("/:id", protectMasterAdmin, iconUpload, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      cleanupUploads(req);
      return errorResponse(res, "Invalid category id.", 400);
    }

    const category = await TbGameCategory.findById(req.params.id);

    if (!category) {
      cleanupUploads(req);
      return errorResponse(res, "TB category not found.", 404);
    }

    applyBody(category, req.body);

    const invalid = validate(category);
    if (invalid) {
      cleanupUploads(req);
      return errorResponse(res, invalid, 400);
    }

    const replaced = [];

    ICON_FIELDS.forEach((field) => {
      const file = req.files?.[field]?.[0];

      if (file) {
        replaced.push(category[field]);
        category[field] = filePath(file);
      } else if (toBool(req.body?.[`remove_${field}`])) {
        replaced.push(category[field]);
        category[field] = "";
      }
    });

    await category.save();
    replaced.forEach(deleteLocalFile);

    return successResponse(res, "TB category updated successfully.", formatCategory(req, category));
  } catch (error) {
    cleanupUploads(req);

    if (error?.code === 11000) {
      return errorResponse(res, "This URL key is already used by another category.", 400);
    }

    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* DELETE /api/master/tb-game-categories/:id — also removes its providers and games */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid category id.", 400);
    }

    const category = await TbGameCategory.findById(req.params.id);

    if (!category) {
      return errorResponse(res, "TB category not found.", 404);
    }

    const providers = await TbGameProvider.find({ categoryId: category._id }).select("logo");
    const games = await TbGame.find({ categoryId: category._id }).select("image");

    const [deletedGames, deletedProviders] = await Promise.all([
      TbGame.deleteMany({ categoryId: category._id }),
      TbGameProvider.deleteMany({ categoryId: category._id }),
    ]);

    await category.deleteOne();

    ICON_FIELDS.forEach((field) => deleteLocalFile(category[field]));
    providers.forEach((provider) => deleteLocalFile(provider.logo));
    games.forEach((game) => deleteLocalFile(game.image));

    return successResponse(res, "TB category deleted successfully.", {
      deletedProviders: deletedProviders.deletedCount || 0,
      deletedGames: deletedGames.deletedCount || 0,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
