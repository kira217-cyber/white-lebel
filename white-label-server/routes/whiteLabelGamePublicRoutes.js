import express from "express";
import axios from "axios";

import WhiteLabelSite from "../models/WhiteLabelSite.js";
import MasterRBGameCategory from "../models/MasterRBGameCategory.js";
import MasterRBGameProvider from "../models/MasterRBGameProvider.js";
import MasterRBGame from "../models/MasterRBGame.js";

const router = express.Router();

const ORACLE_BASE = "https://api.oraclegames.live/api";
const ORACLE_KEY = "ceeeba1c-892b-4571-b05f-2bcec5c4a44e";

const ok = (res, message, data = null, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

const fail = (res, message, status = 500) => {
  return res.status(status).json({
    success: false,
    message,
  });
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

const fetchOracleGamesByIds = async (ids = []) => {
  const cleanIds = [
    ...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)),
  ];

  console.log("ORACLE_KEY EXISTS:", Boolean(ORACLE_KEY));
  console.log("ORACLE IDS:", cleanIds);

  if (!cleanIds.length) {
    console.log("No game ids found for Oracle API");
    return new Map();
  }

  if (!ORACLE_KEY) {
    console.log("ORACLE_TOKEN missing in .env");
    return new Map();
  }

  const chunks = chunkArray(cleanIds, 100);
  const allGames = [];

  for (const chunk of chunks) {
    try {
      const res = await axios.post(
        `${ORACLE_BASE}/games/by-ids`,
        { ids: chunk },
        {
          headers: {
            "x-api-key": ORACLE_KEY,
          },
          timeout: 20000,
        },
      );

      console.log("ORACLE RESPONSE COUNT:", res.data?.count);
      console.log("ORACLE RESPONSE DATA LENGTH:", res.data?.data?.length);

      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      allGames.push(...list);
    } catch (error) {
      console.log(
        "Oracle games/by-ids failed status:",
        error?.response?.status,
      );
      console.log("Oracle games/by-ids failed data:", error?.response?.data);
      console.log("Oracle games/by-ids failed message:", error?.message);
    }
  }

  console.log("ORACLE FINAL GAMES:", allGames.length);

  return new Map(
    allGames.map((game) => [
      String(game._id),
      {
        gameName: game.gameName || game.name || "",
        game_code: game.game_code || "",
        oracleImage: game.image || "",
        provider: game.provider || null,
      },
    ]),
  );
};

const normalizeGame = (game, oracleMap) => {
  const oracle = oracleMap.get(String(game.gameId)) || {};

  return {
    _id: game._id,
    categoryId: game.categoryId,
    providerDbId: game.providerDbId,

    gameId: game.gameId,
    gameName: oracle.gameName || game.gameName || game.gameId,
    game_code: oracle.game_code || game.game_code || "",

    image: game.image || "",
    oracleImage: oracle.oracleImage || "",

    provider: oracle.provider || null,

    isHot: game.isHot,
    isNew: game.isNew,
    isJackpot: game.isJackpot,

    status: game.status,
    createdAt: game.createdAt,
  };
};

/* ======================================================
   VERIFY TOKEN
   POST /api/white-label/verify-token
====================================================== */

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

/* ======================================================
   GAME MENU
   GET /api/white-label/game-menu
====================================================== */

router.get("/game-menu", verifyWhiteLabelToken, async (req, res) => {
  try {
    const categories = await MasterRBGameCategory.find({
      status: "active",
    })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean();

    const categoryIds = categories.map((item) => item._id);

    const providers = await MasterRBGameProvider.find({
      status: "active",
      categoryId: {
        $in: categoryIds,
      },
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    const providerMap = providers.reduce((acc, provider) => {
      const key = String(provider.categoryId);

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push({
        _id: provider._id,
        categoryId: provider.categoryId,
        providerName: provider.providerName,
        providerId: provider.providerId,
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

/* ======================================================
   SINGLE CATEGORY
   GET /api/white-label/game-categories/:id
====================================================== */

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
      .sort({
        createdAt: -1,
      })
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
        providerId: provider.providerId,
        providerImage: provider.providerImage,
        providerIcon: provider.providerIcon,
        status: provider.status,
      })),
    });
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   GAMES
   GET /api/white-label/games?categoryId=&providerDbId=
====================================================== */

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
      .sort({
        createdAt: -1,
      })
      .lean();

    const gameIds = games
      .map((game) => String(game.gameId || "").trim())
      .filter(Boolean);

    const oracleMap = await fetchOracleGamesByIds(gameIds);

    const data = games.map((game) => normalizeGame(game, oracleMap));

    return ok(res, "White label games fetched successfully.", data);
  } catch (error) {
    return fail(res, error.message || "Server error", 500);
  }
});

export default router;
