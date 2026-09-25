import express from "express";

import WhiteLabelSite from "../models/WhiteLabelSite.js";
import TbGameCategory from "../models/TbGameCategory.js";
import TbGameProvider from "../models/TbGameProvider.js";
import TbGame from "../models/TbGame.js";

import { successResponse, errorResponse } from "../utils/response.js";
import {
  buildFileUrl,
  cleanCode,
  cleanText,
  escapeRegex,
  findSorted,
} from "../utils/tbShared.js";

/* ------------------------------------------------------------------
   TBAJEE38 site API — /api/master/tb-global/client
   Called by the TBAJEE38 server (never the browser) with the site's API
   token. Everything is read from the database; Oracle is not called here.
------------------------------------------------------------------ */

const router = express.Router();

const HOME_LIMIT = 24;
const MAX_LIMIT = 100;
const VERIFY_WRITE_EVERY_MS = 5 * 60 * 1000;

const getToken = (req) =>
  cleanText(
    req.headers["x-api-key"] ||
      req.headers.authorization?.replace("Bearer ", "") ||
      req.body?.token ||
      "",
  );

const findSite = (token) =>
  WhiteLabelSite.findOne({ apiToken: token, tokenActive: true, status: "active" }).select(
    "siteName clientUrl logo status tokenActive lastTokenVerifiedAt",
  );

// lastTokenVerifiedAt is only written every few minutes, not on every call.
const touchSite = async (site) => {
  const last = site.lastTokenVerifiedAt ? new Date(site.lastTokenVerifiedAt).getTime() : 0;
  if (Date.now() - last < VERIFY_WRITE_EVERY_MS) return;

  site.lastTokenVerifiedAt = new Date();
  await site.save();
};

const verifyTbApiKey = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) return errorResponse(res, "API token is required.", 401);

    const site = await findSite(token);
    if (!site) return errorResponse(res, "Invalid or inactive API token.", 401);

    await touchSite(site);
    req.whiteLabelSite = site;
    next();
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

/* ---------------------------- shapes ---------------------------- */

const siteCategory = (req, item) => ({
  id: String(item._id),
  key: item.key,
  name: item.name,
  type: item.type,
  providerCode: item.providerCode || "",
  deskIcon: buildFileUrl(req, item.deskIcon),
  deskIconSize: item.deskIconW && item.deskIconH ? [item.deskIconW, item.deskIconH] : null,
  mobIcon: buildFileUrl(req, item.mobIcon),
  titleIcon: buildFileUrl(req, item.titleIcon),
  showOnDesktop: item.showOnDesktop,
  showOnMobile: item.showOnMobile,
  showOnHome: item.showOnHome,
  showOnHomeMobile: item.showOnHomeMobile !== false,
  showProviders: item.showProviders !== false,
  deskOrder: item.deskOrder || 0,
});

const siteProvider = (req, item) => {
  const logo = buildFileUrl(req, item.logo);
  return {
    id: String(item._id),
    code: item.providerCode,
    name: item.displayName || item.providerCode,
    icon: logo || item.oracleIcon || "",
    hasLogo: Boolean(logo),
  };
};

// Oracle sends ".../thumbnail/BTI/" (a folder, no file) for games without art
const realImage = (url = "") => Boolean(url) && !String(url).endsWith("/");

const siteGame = (req, item, providerNames, providerIcons) => {
  const images = item.oracleImages || {};
  return {
    id: String(item._id),
    gameUId: item.gameUId,
    name: item.name,
    nameBn: item.nameBn || "",
    providerCode: item.providerCode,
    providerName: providerNames.get(String(item.providerDbId)) || item.providerCode,
    // Oracle এ কিছু গেমের (সব স্পোর্টস) ছবি নেই — তখন প্রোভাইডারের লোগো
    image:
      buildFileUrl(req, item.image) ||
      [images.height, images.thumbnail, images.original].find(realImage) ||
      providerIcons?.get(String(item.providerDbId)) ||
      "",
    isHot: Boolean(item.isHot),
    isLatest: Boolean(item.isLatest),
  };
};

// Active providers under active categories — a switched-off provider or
// category takes all its games off the site without touching them.
const loadVisibility = async (req) => {
  const categories = await findSorted({ model: TbGameCategory, query: { status: "active" } });
  const categoryIds = categories.map((item) => item._id);

  const providers = await findSorted({
    model: TbGameProvider,
    query: { status: "active", categoryId: { $in: categoryIds } },
  });

  return {
    categories,
    providers,
    providerIds: providers.map((item) => item._id),
    providerNames: new Map(
      providers.map((item) => [String(item._id), item.displayName || item.providerCode]),
    ),
    providerIcons: new Map(
      providers.map((item) => [String(item._id), buildFileUrl(req, item.logo) || item.oracleIcon || ""]),
    ),
  };
};

// The game query a category stands for on the site.
const categoryQuery = (category, providerIds) => {
  const base = { status: "active", providerDbId: { $in: providerIds } };

  if (category.type === "hot") return { query: { ...base, isHot: true }, orderField: "hotOrder" };
  if (category.type === "provider") {
    return { query: { ...base, providerCode: category.providerCode }, orderField: "order" };
  }
  if (category.type === "favorite") {
    return { query: { ...base, isFavorite: true }, orderField: "favOrder" };
  }

  return { query: { ...base, categoryId: category._id }, orderField: "order" };
};

/* POST /verify-token */
router.post("/verify-token", async (req, res) => {
  try {
    const token = cleanText(req.body?.token || req.body?.apiKey);
    if (!token) return errorResponse(res, "API token is required.", 400);

    const site = await findSite(token);
    if (!site) return errorResponse(res, "Invalid or inactive API token.", 401);

    await touchSite(site);

    return successResponse(res, "TB API token verified successfully.", {
      valid: true,
      site: { siteName: site.siteName, clientUrl: site.clientUrl },
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* GET /game-data
   Everything the site needs to draw its shell: categories (both designs),
   providers per category, and the first games of every home section. */
router.get("/game-data", verifyTbApiKey, async (req, res) => {
  try {
    const { categories, providers, providerIds, providerNames, providerIcons } = await loadVisibility(req);

    const providersByCategory = {};
    providers.forEach((item) => {
      const key = String(item.categoryId);
      (providersByCategory[key] ||= []).push(siteProvider(req, item));
    });

    const sections = await Promise.all(
      categories.map(async (category) => {
        const spec = categoryQuery(category, providerIds);
        if (!spec) return { games: [], total: 0 };

        const [games, total] = await Promise.all([
          category.showOnHome ||
          category.showOnHomeMobile !== false ||
          category.type === "sports" ||
          category.type === "favorite"
            ? findSorted({ model: TbGame, ...spec, limit: HOME_LIMIT })
            : [],
          TbGame.countDocuments(spec.query),
        ]);

        return { games, total };
      }),
    );

    return successResponse(res, "TB game data fetched successfully.", {
      categories: categories.map((category, index) => ({
        ...siteCategory(req, category),
        providers:
          (category.type === "games" || category.type === "sports") && category.showProviders !== false
            ? providersByCategory[String(category._id)] || []
            : [],
        total: sections[index].total,
        games: sections[index].games.map((game) => siteGame(req, game, providerNames, providerIcons)),
      })),
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* GET /game-list?category=<key>&provider=<code>&search=&page=&limit=
   One page of a category (optionally one provider of it). With only
   `search` it looks through every visible game. */
router.get("/game-list", verifyTbApiKey, async (req, res) => {
  try {
    const { category = "", provider = "", search = "", page = 1, limit = 30 } = req.query || {};
    const { categories, providerIds, providerNames, providerIcons } = await loadVisibility(req);

    let spec = { query: { status: "active", providerDbId: { $in: providerIds } }, orderField: "order" };

    if (cleanText(category)) {
      const found = categories.find((item) => item.key === cleanText(category).toLowerCase());
      if (!found) return errorResponse(res, "Category not found.", 404);

      spec = categoryQuery(found, providerIds);
      if (!spec) {
        return successResponse(res, "Favorites are kept on the site.", {
          games: [],
          meta: { page: 1, limit: 0, total: 0, totalPages: 1 },
        });
      }
    }

    const query = { ...spec.query };
    if (cleanText(provider)) query.providerCode = cleanCode(provider);

    if (cleanText(search)) {
      const rx = { $regex: escapeRegex(cleanText(search)), $options: "i" };
      query.$or = [{ name: rx }, { nameBn: rx }];
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 30, 1), MAX_LIMIT);

    const [games, total] = await Promise.all([
      findSorted({
        model: TbGame,
        query,
        orderField: spec.orderField,
        skip: (pageNum - 1) * limitNum,
        limit: limitNum,
      }),
      TbGame.countDocuments(query),
    ]);

    return successResponse(res, "TB game list fetched successfully.", {
      games: games.map((game) => siteGame(req, game, providerNames, providerIcons)),
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

/* GET /game/:gameUId — one visible game (the play page title / launch check) */
router.get("/game/:gameUId", verifyTbApiKey, async (req, res) => {
  try {
    const { providerIds, providerNames, providerIcons } = await loadVisibility(req);

    const game = await TbGame.findOne({
      gameUId: cleanText(req.params.gameUId),
      status: "active",
      providerDbId: { $in: providerIds },
    });

    if (!game) return errorResponse(res, "Game not found.", 404);

    // ক্যাটাগরির key — সাইটের বেটিং রেকর্ড গেমের ধরন (স্লট, ফিশিং, লাইভ…)
    // দিয়ে ছাঁকে, আর callback এর সময় সেটা এখান থেকেই জানে
    const category = await TbGameCategory.findById(game.categoryId).select("key type").lean();

    return successResponse(res, "TB game fetched successfully.", {
      ...siteGame(req, game, providerNames, providerIcons),
      categoryKey: category?.key || "",
      categoryType: category?.type || "",
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
