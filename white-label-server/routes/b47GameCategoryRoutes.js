import express from "express";

import B47GameCategory from "../models/B47GameCategory.js";
import B47GameProvider from "../models/B47GameProvider.js";
import B47Game from "../models/B47Game.js";

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
  formatProvider,
  isValidObjectId,
  toBool,
} from "../utils/b47Shared.js";

const router = express.Router();

const TYPES = ["games", "hot", "favorite", "provider", "sports"];
const ICON_FIELDS = ["deskIcon", "mobIcon", "titleIcon", "homeBanner", "centerBg"];
const HOME_CARDS = ["none", "large", "small"];

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

  [["mobName", "mobNameBn", "mobNameEn"], ["hotTitle", "hotTitleBn", "hotTitleEn"]].forEach(([field, bn, en]) => {
    if (body[bn] === undefined && body[en] === undefined) return;
    target[field] = {
      bn: cleanText(body[bn] ?? target[field]?.bn),
      en: cleanText(body[en] ?? target[field]?.en),
    };
  });

  if (body.centerLayout !== undefined) {
    target.centerLayout = body.centerLayout === "providers" ? "providers" : "grid";
  }

  if (body.homeCard !== undefined) {
    target.homeCard = HOME_CARDS.includes(body.homeCard) ? body.homeCard : "none";
  }
  if (body.homeCardOrder !== undefined) {
    target.homeCardOrder = Math.max(Math.round(Number(body.homeCardOrder) || 0), 0);
  }

  if (body.key !== undefined) target.key = cleanKey(body.key);
  if (body.type !== undefined) target.type = TYPES.includes(body.type) ? body.type : "games";
  if (body.providerCode !== undefined) target.providerCode = cleanCode(body.providerCode);

  ["showOnDesktop", "showOnMobile", "showOnHome", "showOnHomeMobile", "showProviders", "showHotSection"].forEach((field) => {
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

/* GET /api/master/b47-game-categories — admin list, in site order */
router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const categories = await findSorted({ model: B47GameCategory });

    const [providerCounts, gameCounts] = await Promise.all([
      B47GameProvider.aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }]),
      B47Game.aggregate([{ $group: { _id: "$categoryId", count: { $sum: 1 } } }]),
    ]);

    const countMap = (rows) =>
      Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
    const providers = countMap(providerCounts);
    const games = countMap(gameCounts);

    // হোমের "সরবরাহকারীর তালিকা" কার্ডের প্রিভিউ — প্রথম ৪টা প্রোভাইডারের লোগো
    const activeProviders = await findSorted({ model: B47GameProvider, query: { status: "active" } });
    const cardLogos = {};
    activeProviders.forEach((item) => {
      const list = (cardLogos[String(item.categoryId)] ||= []);
      if (list.length < 4) list.push(formatProvider(req, item).cardLogoUrl);
    });

    return successResponse(
      res,
      "4777Bet categories fetched successfully.",
      categories.map((item) => ({
        ...formatCategory(req, item),
        providerCount: providers[String(item._id)] || 0,
        gameCount: games[String(item._id)] || 0,
        cardLogos: cardLogos[String(item._id)] || [],
      })),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* POST /api/master/b47-game-categories */
router.post("/", protectMasterAdmin, iconUpload, async (req, res) => {
  try {
    const category = new B47GameCategory({});
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
    const last = await B47GameCategory.findOne().sort({ order: -1 }).select("order");
    category.order = (last?.order || 0) + 1;

    await category.save();

    return successResponse(
      res,
      "4777Bet category created successfully.",
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

/* PATCH /api/master/b47-game-categories/reorder  { ids: [...], field?: "deskOrder" }
   `order` = mobile tabs + home sections, `deskOrder` = desktop tab bar. */
router.patch("/reorder", protectMasterAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const field = req.body?.field === "deskOrder" ? "deskOrder" : "order";
    await applyOrder(B47GameCategory, ids, field);

    return successResponse(res, "Category order saved.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PUT /api/master/b47-game-categories/:id */
router.put("/:id", protectMasterAdmin, iconUpload, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      cleanupUploads(req);
      return errorResponse(res, "Invalid category id.", 400);
    }

    const category = await B47GameCategory.findById(req.params.id);

    if (!category) {
      cleanupUploads(req);
      return errorResponse(res, "4777Bet category not found.", 404);
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

    return successResponse(res, "4777Bet category updated successfully.", formatCategory(req, category));
  } catch (error) {
    cleanupUploads(req);

    if (error?.code === 11000) {
      return errorResponse(res, "This URL key is already used by another category.", 400);
    }

    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* DELETE /api/master/b47-game-categories/:id — also removes its providers and games */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid category id.", 400);
    }

    const category = await B47GameCategory.findById(req.params.id);

    if (!category) {
      return errorResponse(res, "4777Bet category not found.", 404);
    }

    const providers = await B47GameProvider.find({ categoryId: category._id }).select("logo");
    const games = await B47Game.find({ categoryId: category._id }).select("image");

    const [deletedGames, deletedProviders] = await Promise.all([
      B47Game.deleteMany({ categoryId: category._id }),
      B47GameProvider.deleteMany({ categoryId: category._id }),
    ]);

    await category.deleteOne();

    ICON_FIELDS.forEach((field) => deleteLocalFile(category[field]));
    providers.forEach((provider) => deleteLocalFile(provider.logo));
    games.forEach((game) => deleteLocalFile(game.image));

    return successResponse(res, "4777Bet category deleted successfully.", {
      deletedProviders: deletedProviders.deletedCount || 0,
      deletedGames: deletedGames.deletedCount || 0,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
