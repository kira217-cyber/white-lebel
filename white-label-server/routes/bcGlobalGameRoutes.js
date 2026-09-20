import express from "express";
import mongoose from "mongoose";
import axios from "axios";

import WhiteLabelSite from "../models/WhiteLabelSite.js";

import BcGameCategory from "../models/BcGameCategory.js";
import BcGameProvider from "../models/BcGameProvider.js";
import BcGame from "../models/BcGame.js";
import BcFeaturedGame from "../models/BcFeaturedGame.js";
import BcSport from "../models/BcSport.js";

import {
  getActiveProviderIds,
  isActiveProviderId,
  rejectHiddenEntries,
} from "../utils/bcGameVisibility.js";

import {
  compareByOrder,
  findGamesOrdered,
  findOrdered,
  pickOrderField,
  PROVIDER_ORDER_FIELD,
} from "../utils/bcGameOrder.js";

import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

const INITIAL_LIST_LIMIT = 50;

const ORACLE_GAME_API_BASE =
  process.env.ORACLE_GAME_API_BASE || "https://oraclegames.net/api/game";

const ORACLE_GAME_DATA_KEY =
  process.env.ORACLE_GAME_DATA_KEY || "1189baca156e1bbbecc3b26651a63565";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const cleanText = (value = "") => String(value || "").trim();

const getToken = (req) => {
  return cleanText(
    req.headers["x-api-key"] ||
      req.headers["x-api-token"] ||
      req.headers.authorization?.replace("Bearer ", "") ||
      req.query.apiKey ||
      req.body?.apiKey ||
      req.body?.token ||
      "",
  );
};

const verifyBcApiKey = async (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return errorResponse(res, "API token is required.", 401);
    }

    const site = await WhiteLabelSite.findOne({
      apiToken: token,
      tokenActive: true,
      status: "active",
    }).select("siteName clientUrl adminLoginUrl logo status tokenActive");

    if (!site) {
      return errorResponse(res, "Invalid or inactive API token.", 401);
    }

    site.lastTokenVerifiedAt = new Date();
    await site.save();

    req.whiteLabelSite = site;
    next();
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

const buildFileUrl = (req, filePath = "") => {
  if (!filePath) return "";
  if (String(filePath).startsWith("http")) return filePath;

  return `${req.protocol}://${req.get("host")}${
    String(filePath).startsWith("/") ? filePath : `/${filePath}`
  }`;
};

const getOracleImageByType = (oracleGame, type = "thumbnail") => {
  if (!oracleGame) return "";
  if (type === "original") return oracleGame.original || "";
  if (type === "height") return oracleGame.height || "";
  return oracleGame.thumbnail || oracleGame.original || oracleGame.height || "";
};

const fetchOracleGamesByProvider = async (providerCode = "") => {
  try {
    if (!providerCode) return [];

    const res = await axios.get(`${ORACLE_GAME_API_BASE}/${providerCode}`, {
      headers: {
        "x-oraclegamedata-key": ORACLE_GAME_DATA_KEY,
      },
      timeout: 30000,
    });

    const rawGames = Array.isArray(res?.data?.games) ? res.data.games : [];

    return rawGames
      .filter((game) => game?.game_uid)
      .map((game) => ({
        gameUId: String(game?.game_uid || "").trim(),
        name: game?.name || "",
        provider: game?.provider || "",
        category: game?.category || "",
        original: game?.original || "",
        height: game?.height || "",
        thumbnail: game?.thumbnail || "",
      }));
  } catch (error) {
    console.log("BetChokkor ORACLE GAME FETCH ERROR:", providerCode, error.message);
    return [];
  }
};

const belongsToProvider = (game, providerIdSet) =>
  providerIdSet.has(String(game?.providerDbId?._id || game?.providerDbId || ""));

const formatCategory = (req, item) => {
  const obj = item?.toObject ? item.toObject() : item;

  return {
    ...obj,
    id: String(obj._id),
    iconImageUrl: obj.iconImage ? buildFileUrl(req, obj.iconImage) : "",
  };
};

const formatProvider = (req, item) => {
  const obj = item?.toObject ? item.toObject() : item;
  const category = obj.categoryId?._id ? obj.categoryId : null;

  return {
    ...obj,
    id: String(obj._id),
    categoryId: category ? String(category._id) : String(obj.categoryId || ""),
    providerIconUrl: obj.providerIcon
      ? buildFileUrl(req, obj.providerIcon)
      : "",
  };
};

const formatGame = (req, game, oracleGame = null) => {
  const obj = game?.toObject ? game.toObject() : game;

  const category = obj.categoryId?._id ? obj.categoryId : null;
  const provider = obj.providerDbId?._id ? obj.providerDbId : null;

  const customImageUrl = obj.image ? buildFileUrl(req, obj.image) : "";
  const oracleImageUrl = getOracleImageByType(
    oracleGame,
    obj.oracleImageType || "thumbnail",
  );

  return {
    ...obj,
    id: String(obj._id),
    gameId: String(obj._id),
    gameUId: obj.gameUId || "",

    categoryId: category ? String(category._id) : String(obj.categoryId || ""),
    providerDbId: provider
      ? String(provider._id)
      : String(obj.providerDbId || ""),

    category: category
      ? {
          _id: String(category._id),
          categoryName: category.categoryName,
          categoryTitle: category.categoryTitle,
          iconImage: category.iconImage || "",
          iconImageUrl: category.iconImage
            ? buildFileUrl(req, category.iconImage)
            : "",
        }
      : null,

    provider: provider
      ? {
          _id: String(provider._id),
          providerName: provider.providerName || "",
          providerCode: provider.providerCode || "",
          providerIcon: provider.providerIcon || "",
          providerIconUrl: provider.providerIcon
            ? buildFileUrl(req, provider.providerIcon)
            : "",
        }
      : null,

    oracleGame: oracleGame
      ? {
          gameUId: oracleGame.gameUId || "",
          name: oracleGame.name || "",
          provider: oracleGame.provider || "",
          category: oracleGame.category || "",
          original: oracleGame.original || "",
          height: oracleGame.height || "",
          thumbnail: oracleGame.thumbnail || "",
        }
      : null,

    customImageUrl,
    oracleImageUrl,
    imageUrl: customImageUrl || oracleImageUrl,
  };
};

const formatFeaturedGame = (req, item, gameDetails = null) => {
  const obj = item?.toObject ? item.toObject() : item;

  return {
    ...obj,
    id: String(obj._id),
    gameId: gameDetails?.gameId || obj.gameId || "",
    gameUId: gameDetails?.gameUId || obj.gameId || "",
    imageUrl: obj.image
      ? buildFileUrl(req, obj.image)
      : gameDetails?.imageUrl || "",
    game: gameDetails,
  };
};

const formatSport = (req, item) => {
  const obj = item?.toObject ? item.toObject() : item;

  return {
    ...obj,
    id: String(obj._id),
    iconImageUrl: obj.iconImage ? buildFileUrl(req, obj.iconImage) : "",
  };
};

const attachOracleDataToGames = async (req, games = []) => {
  if (!Array.isArray(games) || games.length === 0) return [];

  const providerCodes = [
    ...new Set(
      games.map((game) => game?.providerDbId?.providerCode).filter(Boolean),
    ),
  ];

  const oracleMap = {};

  await Promise.all(
    providerCodes.map(async (providerCode) => {
      const oracleGames = await fetchOracleGamesByProvider(providerCode);

      oracleGames.forEach((oracleGame) => {
        const uid = String(oracleGame?.gameUId || "").trim();
        if (!uid) return;
        oracleMap[`${providerCode}_${uid}`] = oracleGame;
      });
    }),
  );

  return games.map((game) => {
    const providerCode = game?.providerDbId?.providerCode || "";
    const gameUId = String(game?.gameUId || "").trim();
    const oracleGame = oracleMap[`${providerCode}_${gameUId}`] || null;

    return formatGame(req, game, oracleGame);
  });
};

const createGameMap = (formattedGames = []) => {
  const map = {};

  formattedGames.forEach((game) => {
    if (game?.gameId) map[String(game.gameId)] = game;
    if (game?._id) map[String(game._id)] = game;
    if (game?.gameUId) map[String(game.gameUId)] = game;
  });

  return map;
};

/* VERIFY TOKEN */
router.post("/verify-token", async (req, res) => {
  try {
    const token = cleanText(req.body?.token || req.body?.apiKey);

    if (!token) {
      return errorResponse(res, "API token is required.", 400);
    }

    const site = await WhiteLabelSite.findOne({
      apiToken: token,
      tokenActive: true,
      status: "active",
    }).select("siteName clientUrl adminLoginUrl logo status tokenActive");

    if (!site) {
      return errorResponse(res, "Invalid or inactive API token.", 401);
    }

    site.lastTokenVerifiedAt = new Date();
    await site.save();

    return successResponse(res, "BetChokkor API token verified successfully.", {
      valid: true,
      site,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* GET FULL GLOBAL GAME DATA */
router.get("/game-data", verifyBcApiKey, async (req, res) => {
  try {
    const [
      categories,
      providers,
      homeProviders,
      allGames,
      featuredGames,
      sports,
    ] = await Promise.all([
      BcGameCategory.find({ status: "active" }).sort({
        order: 1,
        createdAt: -1,
      }),

      // Category button rows follow `order`, the home row follows its own
      // `homeOrder` because it mixes providers from every category.
      findOrdered({
        model: BcGameProvider,
        query: { status: "active" },
        orderField: "order",
        populate: [
          {
            path: "categoryId",
            select: "categoryName categoryTitle iconImage status",
          },
        ],
      }),

      findOrdered({
        model: BcGameProvider,
        query: { status: "active", isHome: true },
        orderField: "homeOrder",
        populate: [
          {
            path: "categoryId",
            select: "categoryName categoryTitle iconImage status",
          },
        ],
      }),

      // Ordered by categoryOrder: this list feeds the category ("All") views,
      // and gamesByProvider is re-sorted by providerOrder further down.
      findGamesOrdered({
        query: { status: "active" },
        populate: [
          {
            path: "categoryId",
            select: "categoryName categoryTitle iconImage status",
          },
          {
            path: "providerDbId",
            select: "providerName providerCode providerIcon status isHome",
          },
        ],
      }),

      BcFeaturedGame.find({ status: "active" }).sort({
        order: 1,
        createdAt: -1,
      }),

      BcSport.find({ isActive: true }).sort({
        order: 1,
        createdAt: -1,
      }),
    ]);

    // `providers` is already the active-only list, so anything whose provider
    // is missing from it belongs to a deactivated provider and stays hidden.
    const activeProviderIds = new Set(
      providers.map((item) => String(item._id)),
    );

    const games = allGames.filter((game) =>
      belongsToProvider(game, activeProviderIds),
    );

    const hiddenGameIds = new Set(
      allGames
        .filter((game) => !belongsToProvider(game, activeProviderIds))
        .map((game) => String(game._id)),
    );

    // Cap featured/sports/home-provider lists so the first response stays light.
    const cappedFeaturedGames = rejectHiddenEntries(
      featuredGames,
      hiddenGameIds,
    ).slice(0, INITIAL_LIST_LIMIT);

    const cappedSports = sports.slice(0, INITIAL_LIST_LIMIT);
    const cappedHomeProviders = homeProviders.slice(0, INITIAL_LIST_LIMIT);

    // Group raw (un-enriched) games by category so we only Oracle-enrich
    // the first INITIAL_LIST_LIMIT games per category on this initial load.
    // The rest stay available behind /game-list pagination.
    const rawGamesByCategory = {};

    games.forEach((game) => {
      const catId = game.categoryId?._id ? String(game.categoryId._id) : "";
      if (!catId) return;

      if (!rawGamesByCategory[catId]) rawGamesByCategory[catId] = [];
      rawGamesByCategory[catId].push(game);
    });

    const gamesById = new Map(games.map((game) => [String(game._id), game]));
    const neededGames = new Map();

    Object.values(rawGamesByCategory).forEach((list) => {
      list
        .slice(0, INITIAL_LIST_LIMIT)
        .forEach((game) => neededGames.set(String(game._id), game));
    });

    // ফিচার্ড গেম ক্যাটাগরির ক্যাপের বাইরে পড়লেও যেন ছবি-নাম পাওয়া যায়
    cappedFeaturedGames.forEach((item) => {
      const key = String(item.gameId || "");
      if (key && !neededGames.has(key) && gamesById.has(key)) {
        neededGames.set(key, gamesById.get(key));
      }
    });

    const reducedGames = Array.from(neededGames.values());
    const formattedGames = await attachOracleDataToGames(req, reducedGames);
    const gameMap = createGameMap(formattedGames);

    const gamesByCategory = {};
    const gamesByProvider = {};
    const providersByCategory = {};

    formattedGames.forEach((game) => {
      if (game.categoryId) {
        if (!gamesByCategory[game.categoryId])
          gamesByCategory[game.categoryId] = [];
        gamesByCategory[game.categoryId].push(game);
      }

      if (game.providerDbId) {
        if (!gamesByProvider[game.providerDbId])
          gamesByProvider[game.providerDbId] = [];
        gamesByProvider[game.providerDbId].push(game);
      }
    });

    // A provider page follows its own numbering, not the category's.
    Object.values(gamesByProvider).forEach((list) => {
      list.sort(compareByOrder(PROVIDER_ORDER_FIELD));
    });

    const formattedProviders = providers.map((item) =>
      formatProvider(req, item),
    );

    formattedProviders.forEach((provider) => {
      if (provider.categoryId) {
        if (!providersByCategory[provider.categoryId]) {
          providersByCategory[provider.categoryId] = [];
        }

        providersByCategory[provider.categoryId].push(provider);
      }
    });

    const categoryTotals = {};
    Object.entries(rawGamesByCategory).forEach(([catId, list]) => {
      categoryTotals[catId] = list.length;
    });

    return successResponse(res, "BetChokkor global game data loaded successfully.", {
      categories: categories.map((item) => formatCategory(req, item)),
      providers: formattedProviders,
      homeProviders: cappedHomeProviders.map((item) =>
        formatProvider(req, item),
      ),
      games: formattedGames,

      featuredGames: cappedFeaturedGames.map((item) => {
        const key = String(item.gameId || "");
        return formatFeaturedGame(req, item, gameMap[key] || null);
      }),

      sports: cappedSports.map((item) => formatSport(req, item)),

      gamesByCategory,
      gamesByProvider,
      providersByCategory,

      // Client can use this to lazy-load the remaining games in the
      // background via GET /game-list?categoryId=...&page=2&limit=50
      gamesMeta: {
        limit: INITIAL_LIST_LIMIT,
        totalGames: games.length,
        categoryTotals,
      },
    });
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to load BetChokkor global game data.",
      500,
    );
  }
});

/* GAME LIST */
router.get("/game-list", verifyBcApiKey, async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      page = 1,
      limit = 24,
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

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 24, 1);
    const skip = (pageNum - 1) * limitNum;

    // Games stay behind their provider's status: a deactivated provider
    // returns nothing at all, and the "All" view skips its games entirely.
    const activeProviderIds = await getActiveProviderIds();

    if (providerDbId) {
      if (!isActiveProviderId(activeProviderIds, providerDbId)) {
        return successResponse(res, "BetChokkor games loaded successfully.", {
          games: [],
          meta: { page: pageNum, limit: limitNum, total: 0, totalPages: 1 },
        });
      }
    } else {
      query.providerDbId = { $in: activeProviderIds };
    }

    // Provider selected -> providerOrder, "All" -> categoryOrder. The client
    // pages through this endpoint and keeps whatever order it receives, so
    // page 1 holds exactly the games the admin numbered 1, 2, 3...
    const [games, total] = await Promise.all([
      findGamesOrdered({
        query,
        orderField: pickOrderField(providerDbId),
        skip,
        limit: limitNum,
        populate: [
          {
            path: "categoryId",
            select: "categoryName categoryTitle iconImage status",
          },
          {
            path: "providerDbId",
            select: "providerName providerCode providerIcon status isHome",
          },
        ],
      }),

      BcGame.countDocuments(query),
    ]);

    const formattedGames = await attachOracleDataToGames(req, games);

    return successResponse(res, "BetChokkor games loaded successfully.", {
      games: formattedGames,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message || "Failed to load BetChokkor games.", 500);
  }
});

/* PLAY GAME DETAILS */
router.get("/play-game/:gameId", verifyBcApiKey, async (req, res) => {
  try {
    const { gameId } = req.params;

    let game = null;

    if (isValidObjectId(gameId)) {
      game = await BcGame.findOne({ _id: gameId, status: "active" })
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon status isHome",
        );
    }

    if (!game) {
      game = await BcGame.findOne({ gameUId: gameId, status: "active" })
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon status isHome",
        );
    }

    if (!game) {
      return errorResponse(res, "BetChokkor game not found.", 404);
    }

    // A deactivated provider's game must not be launchable either, even if
    // someone kept the direct link.
    if (game.providerDbId?.status !== "active") {
      return errorResponse(res, "BetChokkor game not found.", 404);
    }

    const [formattedGame] = await attachOracleDataToGames(req, [game]);

    return successResponse(
      res,
      "BetChokkor play game details loaded successfully.",
      formattedGame,
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to load BetChokkor play game details.",
      500,
    );
  }
});

export default router;
