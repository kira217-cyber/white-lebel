import express from "express";
import mongoose from "mongoose";
import axios from "axios";

import WhiteLabelSite from "../models/WhiteLabelSite.js";

import CxGameCategory from "../models/CxGameCategory.js";
import CxGameProvider from "../models/CxGameProvider.js";
import CxGame from "../models/CxGame.js";
import CxHotGame from "../models/CxHotGame.js";
import CxPopularGame from "../models/CxPopularGame.js";
import CxSport from "../models/CxSport.js";

import { successResponse, errorResponse } from "../utils/response.js";

const router = express.Router();

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

const verifyCxApiKey = async (req, res, next) => {
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
    console.log("CX ORACLE GAME FETCH ERROR:", providerCode, error.message);
    return [];
  }
};

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

const formatHotGame = (req, item, gameDetails = null) => {
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

const formatPopularGame = (req, item, gameDetails = null) => {
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

    return successResponse(res, "CX API token verified successfully.", {
      valid: true,
      site,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* GET FULL GLOBAL GAME DATA */
router.get("/game-data", verifyCxApiKey, async (req, res) => {
  try {
    const [
      categories,
      providers,
      homeProviders,
      games,
      hotGames,
      popularGames,
      sports,
    ] = await Promise.all([
      CxGameCategory.find({ status: "active" }).sort({
        order: 1,
        createdAt: -1,
      }),

      CxGameProvider.find({ status: "active" })
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .sort({ createdAt: -1 }),

      CxGameProvider.find({ status: "active", isHome: true })
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .sort({ createdAt: -1 }),

      CxGame.find({ status: "active" })
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon status isHome",
        )
        .sort({ createdAt: -1 }),

      CxHotGame.find({ status: "active" }).sort({
        order: 1,
        createdAt: -1,
      }),

      CxPopularGame.find({ status: "active" }).sort({
        order: 1,
        createdAt: -1,
      }),

      CxSport.find({ isActive: true }).sort({
        order: 1,
        createdAt: -1,
      }),
    ]);

    const formattedGames = await attachOracleDataToGames(req, games);
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

    return successResponse(res, "CX global game data loaded successfully.", {
      categories: categories.map((item) => formatCategory(req, item)),
      providers: formattedProviders,
      homeProviders: homeProviders.map((item) => formatProvider(req, item)),
      games: formattedGames,

      hotGames: hotGames.map((item) => {
        const key = String(item.gameId || "");
        return formatHotGame(req, item, gameMap[key] || null);
      }),

      popularGames: popularGames.map((item) => {
        const key = String(item.gameId || "");
        return formatPopularGame(req, item, gameMap[key] || null);
      }),

      sports: sports.map((item) => formatSport(req, item)),

      gamesByCategory,
      gamesByProvider,
      providersByCategory,
    });
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to load CX global game data.",
      500,
    );
  }
});

/* GAME LIST */
router.get("/game-list", verifyCxApiKey, async (req, res) => {
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

    const [games, total] = await Promise.all([
      CxGame.find(query)
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon status isHome",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      CxGame.countDocuments(query),
    ]);

    const formattedGames = await attachOracleDataToGames(req, games);

    return successResponse(res, "CX games loaded successfully.", {
      games: formattedGames,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message || "Failed to load CX games.", 500);
  }
});

/* PLAY GAME DETAILS */
router.get("/play-game/:gameId", verifyCxApiKey, async (req, res) => {
  try {
    const { gameId } = req.params;

    let game = null;

    if (isValidObjectId(gameId)) {
      game = await CxGame.findOne({ _id: gameId, status: "active" })
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon status isHome",
        );
    }

    if (!game) {
      game = await CxGame.findOne({ gameUId: gameId, status: "active" })
        .populate("categoryId", "categoryName categoryTitle iconImage status")
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon status isHome",
        );
    }

    if (!game) {
      return errorResponse(res, "CX game not found.", 404);
    }

    const [formattedGame] = await attachOracleDataToGames(req, [game]);

    return successResponse(
      res,
      "CX play game details loaded successfully.",
      formattedGame,
    );
  } catch (error) {
    return errorResponse(
      res,
      error.message || "Failed to load CX play game details.",
      500,
    );
  }
});

export default router;
