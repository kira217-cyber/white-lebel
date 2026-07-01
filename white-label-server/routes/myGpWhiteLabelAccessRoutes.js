import express from "express";
import axios from "axios";

import WhiteLabelSite from "../models/WhiteLabelSite.js";
import MyGpCategory from "../models/MyGpCategory.js";
import MasterMyGpGameProvider from "../models/MasterMyGpGameProvider.js";
import MasterMyGpGame from "../models/MasterMyGpGame.js";
import MasterMyGpSport from "../models/MasterMyGpSport.js";

const router = express.Router();

const ORACLE_GET_GAMES_API =
  process.env.ORACLE_GET_GAMES_API || "https://oraclegames.net/api/getgames";

const ORACLE_GAME_DATA_KEY =
  process.env.ORACLE_GAME_DATA_KEY || "1189baca156e1bbbecc3b26651a63565";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

const ok = (res, message, data = null, status = 200, extra = {}) => {
  return res.status(status).json({
    success: true,
    message,
    data,
    ...extra,
  });
};

const fail = (res, message, status = 500) => {
  return res.status(status).json({
    success: false,
    message,
  });
};

const cleanText = (value = "") => String(value || "").trim();

const getToken = (req) => {
  return (
    req.headers["x-api-key"] ||
    req.headers["x-api-token"] ||
    req.headers.authorization?.replace("Bearer ", "") ||
    req.query.apiKey ||
    req.body.apiKey ||
    req.body.token ||
    ""
  );
};

const getPagination = (req) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(
    Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1),
    MAX_LIMIT,
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const verifyWhiteLabelToken = async (req, res, next) => {
  try {
    const token = cleanText(getToken(req));

    if (!token) {
      return fail(res, "API token is required.", 401);
    }

    const site = await WhiteLabelSite.findOne({
      apiToken: token,
      tokenActive: true,
      status: "active",
    }).select("siteName clientUrl logo status tokenActive");

    if (!site) {
      return fail(res, "Invalid or inactive API token.", 401);
    }

    site.lastTokenVerifiedAt = new Date();
    await site.save();

    req.whiteLabelSite = site;
    next();
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
};

const chunkArray = (arr = [], size = 100) => {
  const chunks = [];

  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }

  return chunks;
};

const cleanOracleImageType = (type = "thumbnail") => {
  if (["thumbnail", "height", "original"].includes(type)) return type;
  return "thumbnail";
};

const getOracleImageByType = (oracle = {}, type = "thumbnail") => {
  const imageType = cleanOracleImageType(type);

  if (imageType === "original") {
    return oracle.original || oracle.height || oracle.thumbnail || "";
  }

  if (imageType === "height") {
    return oracle.height || oracle.thumbnail || oracle.original || "";
  }

  return oracle.thumbnail || oracle.height || oracle.original || "";
};

const fetchOracleGamesByUIds = async (gameUIds = []) => {
  const cleanIds = [
    ...new Set(gameUIds.map((id) => cleanText(id)).filter(Boolean)),
  ];

  if (!cleanIds.length) return new Map();

  const chunks = chunkArray(cleanIds, 100);
  const allGames = [];

  for (const chunk of chunks) {
    try {
      const res = await axios.post(
        ORACLE_GET_GAMES_API,
        { game_uid: chunk },
        {
          headers: {
            "x-oraclegamedata-key": ORACLE_GAME_DATA_KEY,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        },
      );

      const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
      allGames.push(...list);
    } catch (error) {
      console.log(
        "Oracle games fetch failed:",
        error?.response?.data || error.message,
      );
    }
  }

  return new Map(
    allGames
      .filter((game) => game?.game_uid)
      .map((game) => [
        String(game.game_uid),
        {
          gameName: game.name || "",
          gameUId: game.game_uid || "",
          provider: game.provider || "",
          category: game.category || "",
          original: game.original || "",
          height: game.height || "",
          thumbnail: game.thumbnail || "",
          status: game.status,
        },
      ]),
  );
};

const normalizeGame = (game, oracleMap) => {
  const oracle = oracleMap.get(String(game.gameUId)) || {};
  const oracleImageType = cleanOracleImageType(game.oracleImageType);

  return {
    _id: game._id,
    categoryId: game.categoryId,
    providerDbId: game.providerDbId,

    gameUId: game.gameUId,
    gameId: game.gameUId,

    gameName: oracle.gameName || game.gameUId,
    name: oracle.gameName || game.gameUId,

    provider: oracle.provider || game.providerDbId?.providerCode || "",
    category: oracle.category || "",

    image: game.image || "",
    oracleImage: getOracleImageByType(oracle, oracleImageType),

    oracleImages: {
      thumbnail: oracle.thumbnail || "",
      height: oracle.height || "",
      original: oracle.original || "",
    },

    oracleImageType,

    isHot: Boolean(game.isHot),
    isJili: Boolean(game.isJili),
    isPg: Boolean(game.isPg),
    isPoker: Boolean(game.isPoker),
    isCrash: Boolean(game.isCrash),
    isLiveCasino: Boolean(game.isLiveCasino),
    isFish: Boolean(game.isFish),
    isFavorites: Boolean(game.isFavorites),
    isLatest: Boolean(game.isLatest),
    isAZ: Boolean(game.isAZ),

    status: game.status,
    createdAt: game.createdAt,
  };
};

const buildPagination = ({ page, limit, total }) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasMore = page < totalPages;

  return {
    page,
    limit,
    total,
    totalPages,
    hasMore,
    nextPage: hasMore ? page + 1 : null,
  };
};

/* ======================================================
   VERIFY TOKEN
   POST /api/white-label/mygp/verify-token
====================================================== */

router.post("/verify-token", async (req, res) => {
  try {
    const token = cleanText(req.body?.token || req.body?.apiKey);

    if (!token) {
      return fail(res, "API token is required.", 400);
    }

    const site = await WhiteLabelSite.findOne({
      apiToken: token,
      tokenActive: true,
      status: "active",
    }).select("siteName clientUrl logo status tokenActive");

    if (!site) {
      return fail(res, "Invalid or inactive API token.", 401);
    }

    site.lastTokenVerifiedAt = new Date();
    await site.save();

    return ok(res, "API token verified successfully.", {
      valid: true,
      site,
    });
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   GAME MENU
   GET /api/white-label/mygp/game-menu
====================================================== */

router.get("/game-menu", verifyWhiteLabelToken, async (req, res) => {
  try {
    const categories = await MyGpCategory.find({ status: "active" })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const categoryIds = categories.map((item) => item._id);

    const providers = await MasterMyGpGameProvider.find({
      status: "active",
      categoryId: { $in: categoryIds },
    })
      .sort({ createdAt: -1 })
      .lean();

    const providerMap = providers.reduce((acc, provider) => {
      const key = String(provider.categoryId);

      if (!acc[key]) acc[key] = [];

      acc[key].push({
        _id: provider._id,
        categoryId: provider.categoryId,
        providerName: provider.providerName,
        providerCode: provider.providerCode,
        providerImage: provider.providerImage,
        providerIcon: provider.providerIcon,
        isHome: provider.isHome,
        status: provider.status,
      });

      return acc;
    }, {});

    const menu = categories.map((cat) => ({
      _id: cat._id,
      categoryName: cat.categoryName,
      categoryTitle: cat.categoryTitle,
      iconImage: cat.iconImage,
      order: cat.order,
      status: cat.status,
      providers: providerMap[String(cat._id)] || [],
    }));

    return ok(res, "MyGP game menu fetched successfully.", menu);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   CATEGORIES
   GET /api/white-label/mygp/game-categories
====================================================== */

router.get("/game-categories", verifyWhiteLabelToken, async (req, res) => {
  try {
    const categories = await MyGpCategory.find({ status: "active" })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return ok(res, "MyGP categories fetched successfully.", categories);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   SINGLE CATEGORY
   GET /api/white-label/mygp/game-categories/:id
====================================================== */

router.get("/game-categories/:id", verifyWhiteLabelToken, async (req, res) => {
  try {
    const category = await MyGpCategory.findOne({
      _id: req.params.id,
      status: "active",
    }).lean();

    if (!category) {
      return fail(res, "Category not found.", 404);
    }

    const providers = await MasterMyGpGameProvider.find({
      categoryId: category._id,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    return ok(res, "MyGP category fetched successfully.", {
      ...category,
      providers: providers.map((provider) => ({
        _id: provider._id,
        categoryId: provider.categoryId,
        providerName: provider.providerName,
        providerCode: provider.providerCode,
        providerImage: provider.providerImage,
        providerIcon: provider.providerIcon,
        isHome: provider.isHome,
        status: provider.status,
      })),
    });
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   PROVIDERS
   GET /api/white-label/mygp/game-providers
====================================================== */

router.get("/game-providers", verifyWhiteLabelToken, async (req, res) => {
  try {
    const { categoryId = "", status = "active", isHome = "" } = req.query || {};

    const query = {};

    if (categoryId) query.categoryId = categoryId;
    if (status) query.status = status;
    if (isHome === "true" || isHome === "false") {
      query.isHome = isHome === "true";
    }

    const providers = await MasterMyGpGameProvider.find(query)
      .populate("categoryId", "categoryName categoryTitle iconImage status")
      .sort({ createdAt: -1 })
      .lean();

    return ok(res, "MyGP providers fetched successfully.", providers);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   GAMES - FAST PAGINATED
   First request default 50.
   Frontend hiddenly call nextPage while hasMore true.
   GET /api/white-label/mygp/games?page=1&limit=50
====================================================== */

router.get("/games", verifyWhiteLabelToken, async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      status = "active",
      gameUId = "",
    } = req.query || {};

    const { page, limit, skip } = getPagination(req);

    const query = {};

    if (categoryId) query.categoryId = categoryId;
    if (providerDbId) query.providerDbId = providerDbId;
    if (status) query.status = status;

    if (gameUId) {
      query.gameUId = { $regex: gameUId, $options: "i" };
    }

    const flagFields = [
      "isHot",
      "isJili",
      "isPg",
      "isPoker",
      "isCrash",
      "isLiveCasino",
      "isFish",
      "isFavorites",
      "isLatest",
      "isAZ",
    ];

    flagFields.forEach((field) => {
      if (req.query[field] === "true" || req.query[field] === "false") {
        query[field] = req.query[field] === "true";
      }
    });

    const [games, total] = await Promise.all([
      MasterMyGpGame.find(query)
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon providerImage status",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      MasterMyGpGame.countDocuments(query),
    ]);

    const gameUIds = games
      .map((game) => cleanText(game.gameUId))
      .filter(Boolean);

    const oracleMap = await fetchOracleGamesByUIds(gameUIds);

    const data = games.map((game) => normalizeGame(game, oracleMap));

    return ok(res, "MyGP games fetched successfully.", data, 200, {
      pagination: buildPagination({ page, limit, total }),
    });
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   HOT GAMES
   GET /api/white-label/mygp/hot-games?page=1&limit=50
====================================================== */

router.get("/hot-games", verifyWhiteLabelToken, async (req, res, next) => {
  try {
    req.query.isHot = "true";

    return router.handle(
      Object.assign(req, {
        url: "/games",
        originalUrl: "/games",
      }),
      res,
      next,
    );
  } catch (error) {
    next(error);
  }
});

/* ======================================================
   FLAG GAMES
   GET /api/white-label/mygp/flag-games/:flag?page=1&limit=50
   flags: isJili,isPg,isPoker,isCrash,isLiveCasino,isFish,isFavorites,isLatest,isAZ
====================================================== */

router.get("/flag-games/:flag", verifyWhiteLabelToken, async (req, res) => {
  try {
    const allowedFlags = [
      "isHot",
      "isJili",
      "isPg",
      "isPoker",
      "isCrash",
      "isLiveCasino",
      "isFish",
      "isFavorites",
      "isLatest",
      "isAZ",
    ];

    const flag = cleanText(req.params.flag);

    if (!allowedFlags.includes(flag)) {
      return fail(res, "Invalid game flag.", 400);
    }

    const { page, limit, skip } = getPagination(req);

    const query = {
      status: "active",
      [flag]: true,
    };

    const [games, total] = await Promise.all([
      MasterMyGpGame.find(query)
        .populate(
          "providerDbId",
          "providerName providerCode providerIcon providerImage status",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      MasterMyGpGame.countDocuments(query),
    ]);

    const gameUIds = games
      .map((game) => cleanText(game.gameUId))
      .filter(Boolean);

    const oracleMap = await fetchOracleGamesByUIds(gameUIds);

    const data = games.map((game) => normalizeGame(game, oracleMap));

    return ok(res, "MyGP flag games fetched successfully.", data, 200, {
      pagination: buildPagination({ page, limit, total }),
    });
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   SPORTS
   GET /api/white-label/mygp/sports
====================================================== */

router.get("/sports", verifyWhiteLabelToken, async (req, res) => {
  try {
    const sports = await MasterMyGpSport.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return ok(res, "MyGP sports fetched successfully.", sports);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

export default router;
