import express from "express";
import axios from "axios";
import WhiteLabelSite from "../models/WhiteLabelSite.js";
import MasterRBGameCategory from "../models/MasterRBGameCategory.js";
import MasterRBGameProvider from "../models/MasterRBGameProvider.js";
import MasterRBGame from "../models/MasterRBGame.js";
import MasterRBLiveGame from "../models/MasterRBLiveGame.js";

const router = express.Router();

const ORACLE_GET_GAMES_API =
  process.env.ORACLE_GET_GAMES_API || "https://oraclegames.net/api/getgames";

const ORACLE_GAME_DATA_KEY =
  process.env.ORACLE_GAME_DATA_KEY || "1189baca156e1bbbecc3b26651a63565";

const ok = (res, message, data = null, status = 200) => {
  return res.status(status).json({ success: true, message, data });
};

const fail = (res, message, status = 500) => {
  return res.status(status).json({ success: false, message });
};

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

const verifyWhiteLabelToken = async (req, res, next) => {
  try {
    const token = String(getToken(req) || "").trim();

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

const cleanText = (value = "") => String(value || "").trim();

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

  if (!ORACLE_GAME_DATA_KEY) {
    console.log("ORACLE_GAME_DATA_KEY missing in .env");
    return new Map();
  }

  const chunks = chunkArray(cleanIds, 100);
  const allGames = [];

  for (const chunk of chunks) {
    try {
      const res = await axios.post(
        ORACLE_GET_GAMES_API,
        {
          game_uid: chunk,
        },
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

    isHot: game.isHot,
    isNew: game.isNew,
    isJackpot: game.isJackpot,

    status: game.status,
    createdAt: game.createdAt,
  };
};

/* VERIFY TOKEN */
router.post("/verify-token", async (req, res) => {
  try {
    const token = String(req.body?.token || req.body?.apiKey || "").trim();

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

/* GAME MENU */
router.get("/game-menu", verifyWhiteLabelToken, async (req, res) => {
  try {
    const categories = await MasterRBGameCategory.find({ status: "active" })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    const categoryIds = categories.map((item) => item._id);

    const providers = await MasterRBGameProvider.find({
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
        status: provider.status,
      });

      return acc;
    }, {});

    const menu = categories.map((cat) => ({
      _id: cat._id,
      categoryName: cat.categoryName,
      categoryTitle: cat.categoryTitle,
      bannerImage: cat.bannerImage,
      iconImage: cat.iconImage,
      order: cat.order,
      badge: cat.jackpot ? "hot" : "none",
      status: cat.status,
      providers: providerMap[String(cat._id)] || [],
    }));

    return ok(res, "White label game menu fetched successfully.", menu);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* SINGLE CATEGORY */
router.get("/game-categories/:id", verifyWhiteLabelToken, async (req, res) => {
  try {
    const category = await MasterRBGameCategory.findOne({
      _id: req.params.id,
      status: "active",
    }).lean();

    if (!category) {
      return fail(res, "Category not found.", 404);
    }

    const providers = await MasterRBGameProvider.find({
      categoryId: category._id,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .lean();

    return ok(res, "White label category fetched successfully.", {
      _id: category._id,
      categoryName: category.categoryName,
      categoryTitle: category.categoryTitle,
      bannerImage: category.bannerImage,
      iconImage: category.iconImage,
      order: category.order,
      status: category.status,
      providers: providers.map((provider) => ({
        _id: provider._id,
        categoryId: provider.categoryId,
        providerName: provider.providerName,
        providerCode: provider.providerCode,
        providerImage: provider.providerImage,
        providerIcon: provider.providerIcon,
        status: provider.status,
      })),
    });
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* GAMES */
router.get("/games", verifyWhiteLabelToken, async (req, res) => {
  try {
    const { categoryId = "", providerDbId = "" } = req.query || {};

    if (!categoryId) {
      return fail(res, "categoryId is required.", 400);
    }

    const query = {
      categoryId,
      status: "active",
    };

    if (providerDbId) {
      query.providerDbId = providerDbId;
    }

    const games = await MasterRBGame.find(query)
      .populate("providerDbId", "providerName providerCode status")
      .sort({ createdAt: -1 })
      .lean();

    const gameUIds = games
      .map((game) => cleanText(game.gameUId))
      .filter(Boolean);

    const oracleMap = await fetchOracleGamesByUIds(gameUIds);

    const data = games.map((game) => normalizeGame(game, oracleMap));

    return ok(res, "White label games fetched successfully.", data);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* HOT GAMES */
router.get("/hot-games", verifyWhiteLabelToken, async (req, res) => {
  try {
    const limit = Math.max(Number(req.query.limit) || 15, 1);

    const games = await MasterRBGame.find({
      status: "active",
      isHot: true,
    })
      .populate("providerDbId", "providerName providerCode status")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const gameUIds = games
      .map((game) => cleanText(game.gameUId))
      .filter(Boolean);

    const oracleMap = await fetchOracleGamesByUIds(gameUIds);

    const data = games.map((game) => normalizeGame(game, oracleMap));

    return ok(res, "White label hot games fetched successfully.", data);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* LIVE GAME GLOBAL */
router.get("/live-game", verifyWhiteLabelToken, async (req, res) => {
  try {
    let config = await MasterRBLiveGame.findOne().lean();

    if (!config) {
      return ok(res, "Live game config fetched successfully.", {
        gameUID: "",
        isActive: false,
        openInNewTab: true,
      });
    }

    return ok(res, "Live game config fetched successfully.", {
      _id: config._id,
      gameUID: config.gameUID,
      isActive: config.isActive,
      openInNewTab: config.openInNewTab,
      note: config.note || "",
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

export default router;
