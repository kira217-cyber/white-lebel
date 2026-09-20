import express from "express";
import mongoose from "mongoose";
import axios from "axios";

import BcGame from "../models/BcGame.js";
import BcGameCategory from "../models/BcGameCategory.js";
import BcGameProvider from "../models/BcGameProvider.js";

import {
  findGamesOrdered,
  pickOrderField,
} from "../utils/bcGameOrder.js";

import {
  getActiveProviderIds,
  isActiveProviderId,
} from "../utils/bcGameVisibility.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const ORACLE_GAME_API_BASE =
  process.env.ORACLE_GAME_API_BASE || "https://oraclegames.net/api/game";

const ORACLE_GAME_DATA_KEY = "1189baca156e1bbbecc3b26651a63565";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const filePath = (file) => {
  if (!file) return "";
  return `/uploads/${file.filename}`;
};

const cleanText = (value = "") => String(value || "").trim();

const cleanProviderCode = (value = "") => cleanText(value).toUpperCase();

const toBool = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

const validOracleImageTypes = ["thumbnail", "height", "original"];

const cleanOracleImageType = (value) => {
  if (validOracleImageTypes.includes(value)) return value;
  return "thumbnail";
};

const BOOLEAN_FIELDS = ["isHot", "isFavorites", "isLatest", "isAZ"];

const applyBooleanFlags = (target, source = {}) => {
  BOOLEAN_FIELDS.forEach((field) => {
    if (source[field] !== undefined) {
      target[field] = toBool(source[field]);
    }
  });
};

/* ------------------------------------------------------------------
   ORDER HELPERS
   categoryOrder drives the category "All" page, providerOrder drives a
   single provider page. 0 means "not ordered" and can repeat freely;
   any number above 0 must be unique inside its own category / provider.
------------------------------------------------------------------ */

const ORDER_SCOPES = {
  category: {
    field: "categoryOrder",
    label: "All Page Order",
    where: "in this category",
  },
  provider: {
    field: "providerOrder",
    label: "Provider Page Order",
    where: "under this provider",
  },
};

// "" clears the order back to 0, a bad value returns null so the caller
// can answer with a 400 instead of silently storing garbage.
const parseOrderValue = (value) => {
  if (value === undefined || value === null || value === "") return 0;

  const num = Number(value);

  if (!Number.isFinite(num) || num < 0) return null;

  return Math.floor(num);
};

const findOrderConflict = async ({
  scope,
  categoryId,
  providerDbId,
  order,
  excludeId,
}) => {
  if (!order || order <= 0) return null;

  const { field } = ORDER_SCOPES[scope];

  const query =
    scope === "category"
      ? { categoryId, [field]: order }
      : { providerDbId, [field]: order };

  if (excludeId) query._id = { $ne: excludeId };

  return BcGame.findOne(query).select("gameUId categoryOrder providerOrder");
};

const orderConflictMessage = (scope, order, conflict) => {
  const { label, where } = ORDER_SCOPES[scope];
  const name = conflict?.gameUId ? ` by game "${conflict.gameUId}"` : "";

  return `${label} ${order} is already used${name} ${where}.`;
};

// The partial unique indexes are the last line of defence behind the
// checks above, so an E11000 has to say which number actually clashed.
const duplicateKeyMessage = (error) => {
  const keyPattern = error?.keyPattern || {};

  if (keyPattern.categoryOrder) {
    return "This All Page Order number is already used in this category.";
  }

  if (keyPattern.providerOrder) {
    return "This Provider Page Order number is already used under this provider.";
  }

  return "This game already exists under this provider.";
};

const normalizeOracleGames = (data) => {
  const games = Array.isArray(data?.games) ? data.games : [];

  return games
    .filter((game) => game?.game_uid)
    .map((game) => ({
      name: game.name || "",
      game_uid: String(game.game_uid || "").trim(),
      provider: game.provider || "",
      category: game.category || "",
      status: game.status,
      images: {
        original: game.original || "",
        height: game.height || "",
        thumbnail: game.thumbnail || "",
      },
      raw: game,
    }));
};

/* ======================================================
   ORACLE GAMES BY PROVIDER CODE
   GET /api/master/bc-games/oracle/:providerCode
====================================================== */

router.get("/oracle/:providerCode", protectMasterAdmin, async (req, res) => {
  try {
    const providerCode = cleanProviderCode(req.params.providerCode);

    if (!providerCode) {
      return errorResponse(res, "providerCode is required.", 400);
    }

    const response = await axios.get(
      `${ORACLE_GAME_API_BASE}/${providerCode}`,
      {
        headers: {
          "x-oraclegamedata-key": ORACLE_GAME_DATA_KEY,
        },
        timeout: 30000,
      },
    );

    const games = normalizeOracleGames(response.data);

    return successResponse(res, "BetChokkor Oracle games fetched successfully.", {
      provider: response.data?.provider || null,
      games,
    });
  } catch (error) {
    return errorResponse(
      res,
      error?.response?.data?.message ||
        error.message ||
        "Failed to fetch Oracle games.",
      500,
    );
  }
});

/* ======================================================
   CREATE GAME
   POST /api/master/bc-games
====================================================== */

router.post(
  "/",
  protectMasterAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { categoryId, providerDbId, gameUId, oracleImageType, status } =
        req.body || {};

      if (!categoryId || !isValidObjectId(categoryId)) {
        return errorResponse(res, "Valid categoryId is required.", 400);
      }

      if (!providerDbId || !isValidObjectId(providerDbId)) {
        return errorResponse(res, "Valid providerDbId is required.", 400);
      }

      if (!gameUId || !cleanText(gameUId)) {
        return errorResponse(res, "gameUId is required.", 400);
      }

      const category = await BcGameCategory.findById(categoryId);

      if (!category) {
        return errorResponse(res, "BetChokkor game category not found.", 404);
      }

      const provider = await BcGameProvider.findOne({
        _id: providerDbId,
        categoryId,
      });

      if (!provider) {
        return errorResponse(
          res,
          "BetChokkor game provider not found under this category.",
          404,
        );
      }

      const finalGameUId = cleanText(gameUId);

      const exists = await BcGame.findOne({
        providerDbId,
        gameUId: finalGameUId,
      });

      if (exists) {
        return errorResponse(
          res,
          "This game already exists under this provider.",
          400,
        );
      }

      const categoryOrder = parseOrderValue(req.body?.categoryOrder);
      const providerOrder = parseOrderValue(req.body?.providerOrder);

      if (categoryOrder === null) {
        return errorResponse(res, "Invalid categoryOrder.", 400);
      }

      if (providerOrder === null) {
        return errorResponse(res, "Invalid providerOrder.", 400);
      }

      const categoryConflict = await findOrderConflict({
        scope: "category",
        categoryId,
        order: categoryOrder,
      });

      if (categoryConflict) {
        return errorResponse(
          res,
          orderConflictMessage("category", categoryOrder, categoryConflict),
          400,
        );
      }

      const providerConflict = await findOrderConflict({
        scope: "provider",
        providerDbId,
        order: providerOrder,
      });

      if (providerConflict) {
        return errorResponse(
          res,
          orderConflictMessage("provider", providerOrder, providerConflict),
          400,
        );
      }

      const payload = {
        categoryId,
        providerDbId,
        gameUId: finalGameUId,
        oracleImageType: cleanOracleImageType(oracleImageType),
        image: req.file ? filePath(req.file) : "",
        status: status === "inactive" ? "inactive" : "active",
        syncStatus: "pending",
        categoryOrder,
        providerOrder,
      };

      applyBooleanFlags(payload, req.body);

      const game = await BcGame.create(payload);

      return successResponse(res, "BetChokkor game added successfully.", game, 201);
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(res, duplicateKeyMessage(error), 400);
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   GET ALL GAMES
   GET /api/master/bc-games
====================================================== */

router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      gameUId = "",
      status = "",
      syncStatus = "",
      oracleImageType = "",
      page = 1,
      limit = 50,
    } = req.query || {};

    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return errorResponse(res, "Invalid categoryId.", 400);
      }

      query.categoryId = categoryId;
    }

    if (providerDbId) {
      if (!isValidObjectId(providerDbId)) {
        return errorResponse(res, "Invalid providerDbId.", 400);
      }

      query.providerDbId = providerDbId;
    }

    if (gameUId) {
      query.gameUId = { $regex: gameUId, $options: "i" };
    }

    if (status) query.status = status;
    if (syncStatus) query.syncStatus = syncStatus;

    if (oracleImageType && validOracleImageTypes.includes(oracleImageType)) {
      query.oracleImageType = oracleImageType;
    }

    BOOLEAN_FIELDS.forEach((field) => {
      if (req.query[field] !== undefined && req.query[field] !== "") {
        query[field] = toBool(req.query[field]);
      }
    });

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 50, 1);
    const skip = (pageNum - 1) * limitNum;

    // Admin sees the exact order the site will render, so the numbers the
    // admin types can be sanity-checked right here in the panel.
    const [games, total] = await Promise.all([
      findGamesOrdered({
        query,
        orderField: pickOrderField(providerDbId),
        skip,
        limit: limitNum,
        populate: [
          { path: "categoryId", select: "categoryName categoryTitle status" },
          { path: "providerDbId", select: "providerName providerCode status" },
        ],
      }),

      BcGame.countDocuments(query),
    ]);

    return successResponse(res, "BetChokkor games fetched successfully.", {
      games,
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
   ACTIVE PUBLIC GAMES
   GET /api/master/bc-games/active/list
====================================================== */

router.get("/active/list", async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      isHot = "",
      isFavorites = "",
      isLatest = "",
      isAZ = "",
      page = 1,
      limit = 50,
    } = req.query || {};

    const query = { status: "active" };

    if (categoryId) {
      if (!isValidObjectId(categoryId)) {
        return errorResponse(res, "Invalid categoryId.", 400);
      }

      query.categoryId = categoryId;
    }

    if (providerDbId) {
      if (!isValidObjectId(providerDbId)) {
        return errorResponse(res, "Invalid providerDbId.", 400);
      }

      query.providerDbId = providerDbId;
    }

    if (isHot !== "") query.isHot = toBool(isHot);
    if (isFavorites !== "") query.isFavorites = toBool(isFavorites);
    if (isLatest !== "") query.isLatest = toBool(isLatest);
    if (isAZ !== "") query.isAZ = toBool(isAZ);

    // This list is public, so a deactivated provider's games stay out of it.
    const activeProviderIds = await getActiveProviderIds();

    if (providerDbId) {
      if (!isActiveProviderId(activeProviderIds, providerDbId)) {
        return successResponse(res, "BetChokkor active games fetched successfully.", {
          games: [],
          meta: { page: 1, limit: Number(limit) || 50, total: 0, totalPages: 1 },
        });
      }
    } else {
      query.providerDbId = { $in: activeProviderIds };
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 50, 1);
    const skip = (pageNum - 1) * limitNum;

    // Admin sees the exact order the site will render, so the numbers the
    // admin types can be sanity-checked right here in the panel.
    const [games, total] = await Promise.all([
      findGamesOrdered({
        query,
        orderField: pickOrderField(providerDbId),
        skip,
        limit: limitNum,
        populate: [
          { path: "categoryId", select: "categoryName categoryTitle status" },
          { path: "providerDbId", select: "providerName providerCode status" },
        ],
      }),

      BcGame.countDocuments(query),
    ]);

    return successResponse(res, "BetChokkor active games fetched successfully.", {
      games,
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
   ORDER NUMBERS ALREADY IN USE
   GET /api/master/bc-games/order/used?categoryId=..&providerDbId=..

   Feeds the "this number is already added" hint in the edit modal, so the
   admin sees the clash while typing instead of after saving. categoryOrder
   is scoped to the whole category (every provider inside it), providerOrder
   only to the one provider.
====================================================== */

router.get("/order/used", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId = "", providerDbId = "" } = req.query || {};

    if (categoryId && !isValidObjectId(categoryId)) {
      return errorResponse(res, "Invalid categoryId.", 400);
    }

    if (providerDbId && !isValidObjectId(providerDbId)) {
      return errorResponse(res, "Invalid providerDbId.", 400);
    }

    if (!categoryId && !providerDbId) {
      return errorResponse(
        res,
        "categoryId or providerDbId is required.",
        400,
      );
    }

    const toUsedList = (games, field) =>
      games.map((game) => ({
        id: String(game._id),
        gameUId: game.gameUId || "",
        order: Number(game[field]) || 0,
      }));

    const [categoryGames, providerGames] = await Promise.all([
      categoryId
        ? BcGame.find({ categoryId, categoryOrder: { $gt: 0 } })
            .select("gameUId categoryOrder")
            .sort({ categoryOrder: 1 })
        : [],

      providerDbId
        ? BcGame.find({ providerDbId, providerOrder: { $gt: 0 } })
            .select("gameUId providerOrder")
            .sort({ providerOrder: 1 })
        : [],
    ]);

    return successResponse(res, "BetChokkor game order usage fetched successfully.", {
      categoryOrders: toUsedList(categoryGames, "categoryOrder"),
      providerOrders: toUsedList(providerGames, "providerOrder"),
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   GET SINGLE GAME
====================================================== */

router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid game id.", 400);
    }

    const game = await BcGame.findById(req.params.id)
      .populate("categoryId", "categoryName categoryTitle status")
      .populate("providerDbId", "providerName providerCode status");

    if (!game) {
      return errorResponse(res, "BetChokkor game not found.", 404);
    }

    return successResponse(res, "BetChokkor game fetched successfully.", game);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE GAME
====================================================== */

router.put(
  "/:id",
  protectMasterAdmin,
  upload.single("image"),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return errorResponse(res, "Invalid game id.", 400);
      }

      const game = await BcGame.findById(req.params.id);

      if (!game) {
        return errorResponse(res, "BetChokkor game not found.", 404);
      }

      const { categoryId, providerDbId, gameUId, oracleImageType, status } =
        req.body || {};

      if (categoryId !== undefined) {
        if (!isValidObjectId(categoryId)) {
          return errorResponse(res, "Invalid categoryId.", 400);
        }

        const category = await BcGameCategory.findById(categoryId);

        if (!category) {
          return errorResponse(res, "BetChokkor game category not found.", 404);
        }

        game.categoryId = categoryId;
      }

      if (providerDbId !== undefined) {
        if (!isValidObjectId(providerDbId)) {
          return errorResponse(res, "Invalid providerDbId.", 400);
        }

        const provider = await BcGameProvider.findById(providerDbId);

        if (!provider) {
          return errorResponse(res, "BetChokkor game provider not found.", 404);
        }

        game.providerDbId = providerDbId;
      }

      if (gameUId !== undefined) {
        const newGameUId = cleanText(gameUId);

        if (!newGameUId) {
          return errorResponse(res, "gameUId is required.", 400);
        }

        const exists = await BcGame.findOne({
          _id: { $ne: game._id },
          providerDbId: game.providerDbId,
          gameUId: newGameUId,
        });

        if (exists) {
          return errorResponse(
            res,
            "This game already exists under this provider.",
            400,
          );
        }

        game.gameUId = newGameUId;
      }

      if (oracleImageType !== undefined) {
        game.oracleImageType = cleanOracleImageType(oracleImageType);
      }

      if (status !== undefined) {
        game.status = status === "inactive" ? "inactive" : "active";
      }

      // Checked against the game's final category/provider, so moving a game
      // and renumbering it in one request still validates against the right
      // scope. The game itself is excluded so re-saving the same number works.
      if (req.body?.categoryOrder !== undefined) {
        const categoryOrder = parseOrderValue(req.body.categoryOrder);

        if (categoryOrder === null) {
          return errorResponse(res, "Invalid categoryOrder.", 400);
        }

        const conflict = await findOrderConflict({
          scope: "category",
          categoryId: game.categoryId,
          order: categoryOrder,
          excludeId: game._id,
        });

        if (conflict) {
          return errorResponse(
            res,
            orderConflictMessage("category", categoryOrder, conflict),
            400,
          );
        }

        game.categoryOrder = categoryOrder;
      }

      if (req.body?.providerOrder !== undefined) {
        const providerOrder = parseOrderValue(req.body.providerOrder);

        if (providerOrder === null) {
          return errorResponse(res, "Invalid providerOrder.", 400);
        }

        const conflict = await findOrderConflict({
          scope: "provider",
          providerDbId: game.providerDbId,
          order: providerOrder,
          excludeId: game._id,
        });

        if (conflict) {
          return errorResponse(
            res,
            orderConflictMessage("provider", providerOrder, conflict),
            400,
          );
        }

        game.providerOrder = providerOrder;
      }

      applyBooleanFlags(game, req.body);

      if (req.file) {
        game.image = filePath(req.file);
      }

      game.syncStatus = "pending";

      await game.save();

      return successResponse(res, "BetChokkor game updated successfully.", game);
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(res, duplicateKeyMessage(error), 400);
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   REMOVE CUSTOM IMAGE
====================================================== */

router.patch("/:id/remove-image", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid game id.", 400);
    }

    const game = await BcGame.findById(req.params.id);

    if (!game) {
      return errorResponse(res, "BetChokkor game not found.", 404);
    }

    game.image = "";
    game.syncStatus = "pending";

    await game.save();

    return successResponse(res, "BetChokkor game custom image removed.", game);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   DELETE GAME
====================================================== */

router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return errorResponse(res, "Invalid game id.", 400);
    }

    const game = await BcGame.findByIdAndDelete(req.params.id);

    if (!game) {
      return errorResponse(res, "BetChokkor game not found.", 404);
    }

    return successResponse(res, "BetChokkor game deleted successfully.", game);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
