import express from "express";

import TbGameProvider from "../models/TbGameProvider.js";
import TbGame from "../models/TbGame.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";
import {
  applyOrder,
  cleanText,
  deleteLocalFile,
  escapeRegex,
  fetchOracleGames,
  fetchOracleGamesCached,
  filePath,
  findSorted,
  formatGame,
  isValidObjectId,
  moveToPosition,
  oracleErrorMessage,
  toBool,
} from "../utils/tbShared.js";

const router = express.Router();

const PROVIDER_POPULATE = { path: "providerDbId", select: "providerCode displayName" };
const CATEGORY_POPULATE = { path: "categoryId", select: "name key" };

// Two admin-picked lists work the same way: HOT and Favorites
const LISTS = {
  hot: { flag: "isHot", order: "hotOrder" },
  favorite: { flag: "isFavorite", order: "favOrder" },
};

const nextListOrder = async (list = "hot") => {
  const { flag, order } = LISTS[list];
  const last = await TbGame.findOne({ [flag]: true }).sort({ [order]: -1 }).select(order);
  return (last?.[order] || 0) + 1;
};

const nextHotOrder = () => nextListOrder("hot");

const loadProvider = async (providerDbId) =>
  isValidObjectId(providerDbId) ? TbGameProvider.findById(providerDbId) : null;

/* GET /api/master/tb-games/oracle/:providerDbId
   Every Oracle game of this provider; `addedId` is set for the ones already
   added so the picker shows them selected. */
router.get("/oracle/:providerDbId", protectMasterAdmin, async (req, res) => {
  try {
    const provider = await loadProvider(req.params.providerDbId);
    if (!provider) return errorResponse(res, "TB provider not found.", 404);

    let oracleGames;
    try {
      oracleGames = await fetchOracleGames(provider.providerCode);
    } catch (error) {
      return errorResponse(res, oracleErrorMessage(error, "Failed to fetch Oracle games."), 502);
    }

    const added = await TbGame.find({ providerDbId: provider._id }).select("gameUId isHot");
    const addedMap = new Map(added.map((game) => [game.gameUId, game]));

    return successResponse(res, "Oracle games fetched successfully.", {
      providerCode: provider.providerCode,
      games: oracleGames.map((game) => {
        const mine = addedMap.get(game.gameUId);
        return {
          ...game,
          addedId: mine ? String(mine._id) : "",
          isHot: Boolean(mine?.isHot),
        };
      }),
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* GET /api/master/tb-games/lookup?q=  (name or game_uid)
   For the Hot page: games already in the catalog, plus Oracle games of the
   providers already added that are NOT in the catalog yet — those come with
   the provider rows (one per category) they can be added under. */
router.get("/lookup", protectMasterAdmin, async (req, res) => {
  try {
    const q = cleanText(req.query?.q);
    if (q.length < 2) return successResponse(res, "Type at least 2 characters.", { catalog: [], oracle: [] });

    const rx = { $regex: escapeRegex(q), $options: "i" };
    const catalog = await TbGame.find({ $or: [{ name: rx }, { nameBn: rx }, { gameUId: rx }] })
      .limit(24)
      .populate([PROVIDER_POPULATE, CATEGORY_POPULATE]);

    const providers = await TbGameProvider.find({})
      .select("providerCode providerName displayName categoryId")
      .populate({ path: "categoryId", select: "name key" });

    const rowsByCode = new Map();
    providers.forEach((row) => {
      if (!rowsByCode.has(row.providerCode)) rowsByCode.set(row.providerCode, []);
      rowsByCode.get(row.providerCode).push(row);
    });

    const inCatalog = new Set(
      await TbGame.find({ providerCode: { $in: [...rowsByCode.keys()] } }).distinct("gameUId"),
    );

    const needle = q.toLowerCase();
    const found = [];

    await Promise.all(
      [...rowsByCode.keys()].map(async (code) => {
        let games = [];
        try {
          games = await fetchOracleGamesCached(code);
        } catch {
          return; // one slow provider must not break the search
        }
        games.forEach((game) => {
          if (inCatalog.has(game.gameUId)) return;
          if (game.gameUId.toLowerCase() !== needle && !game.name.toLowerCase().includes(needle)) return;
          found.push({
            ...game,
            providerCode: code,
            rows: rowsByCode.get(code).map((row) => ({
              providerDbId: String(row._id),
              displayName: row.displayName || row.providerCode,
              category: row.categoryId
                ? { id: String(row.categoryId._id), key: row.categoryId.key, name: row.categoryId.name }
                : null,
            })),
          });
        });
      }),
    );

    // An exact uid first, then by name
    found.sort((a, b) => (b.gameUId.toLowerCase() === needle) - (a.gameUId.toLowerCase() === needle) || a.name.localeCompare(b.name));

    return successResponse(res, "Lookup done.", {
      catalog: catalog.map((game) => formatGame(req, game)),
      oracle: found.slice(0, 24),
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* GET /api/master/tb-games/list/:list — the Hot or Favorite list in site order */
router.get("/list/:list", protectMasterAdmin, async (req, res) => {
  try {
    const spec = LISTS[req.params.list];
    if (!spec) return errorResponse(res, "Unknown list.", 404);

    const games = await findSorted({
      model: TbGame,
      query: { [spec.flag]: true },
      orderField: spec.order,
      populate: [PROVIDER_POPULATE, CATEGORY_POPULATE],
    });

    return successResponse(res, "List fetched successfully.", games.map((g) => formatGame(req, g)));
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/tb-games/list/:list  { ids, on }  — add to / remove from the list */
router.patch("/list/:list", protectMasterAdmin, async (req, res) => {
  try {
    const spec = LISTS[req.params.list];
    if (!spec) return errorResponse(res, "Unknown list.", 404);

    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isValidObjectId);
    const on = toBool(req.body?.on);
    if (!ids.length) return errorResponse(res, "Nothing to update.", 400);

    if (!on) {
      await TbGame.updateMany({ _id: { $in: ids } }, { $set: { [spec.flag]: false, [spec.order]: 0 } });
    } else {
      let order = await nextListOrder(req.params.list);
      const games = await TbGame.find({ _id: { $in: ids }, [spec.flag]: { $ne: true } }).select("_id");
      if (games.length) {
        await TbGame.bulkWrite(
          games.map((game) => ({
            updateOne: { filter: { _id: game._id }, update: { $set: { [spec.flag]: true, [spec.order]: order++ } } },
          })),
        );
      }
    }

    return successResponse(res, on ? "Added." : "Removed.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/tb-games/list/:list/position  { id, position } */
router.patch("/list/:list/position", protectMasterAdmin, async (req, res) => {
  try {
    const spec = LISTS[req.params.list];
    if (!spec || !isValidObjectId(req.body?.id)) return errorResponse(res, "Bad request.", 400);

    const at = await moveToPosition(TbGame, req.body.id, req.body.position, spec.order, { [spec.flag]: true });
    return successResponse(res, "Position saved.", { position: at });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* Old Hot routes kept for the Game page's ⭐ button */
router.get("/hot", protectMasterAdmin, async (req, res) => {
  try {
    const games = await findSorted({
      model: TbGame,
      query: { isHot: true },
      orderField: "hotOrder",
      populate: [PROVIDER_POPULATE, CATEGORY_POPULATE],
    });

    return successResponse(res, "Hot games fetched successfully.", games.map((g) => formatGame(req, g)));
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* GET /api/master/tb-games?categoryId=&providerDbId=&search=&missingBn=1&page=&limit= */
router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const {
      categoryId = "",
      providerDbId = "",
      search = "",
      missingBn = "",
      page = 1,
      limit = 60,
    } = req.query || {};

    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) return errorResponse(res, "Invalid categoryId.", 400);
      query.categoryId = categoryId;
    }

    if (providerDbId) {
      if (!isValidObjectId(providerDbId)) return errorResponse(res, "Invalid providerDbId.", 400);
      query.providerDbId = providerDbId;
    }

    if (cleanText(search)) {
      const rx = { $regex: escapeRegex(cleanText(search)), $options: "i" };
      query.$or = [{ name: rx }, { nameBn: rx }, { gameUId: rx }];
    }

    if (toBool(missingBn)) query.nameBn = { $in: ["", null] };

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 60, 1), 500);

    const [games, total] = await Promise.all([
      findSorted({
        model: TbGame,
        query,
        skip: (pageNum - 1) * limitNum,
        limit: limitNum,
        populate: [PROVIDER_POPULATE, CATEGORY_POPULATE],
      }),
      TbGame.countDocuments(query),
    ]);

    return successResponse(res, "TB games fetched successfully.", {
      games: games.map((game) => formatGame(req, game)),
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

/* POST /api/master/tb-games/bulk
   { providerDbId, gameUIds: [...], isHot?, isLatest?, status? }
   Name and images are taken from Oracle here on the server, never from the
   browser, so what is stored always matches Oracle. The optional flags are
   the "apply when adding" switches of the admin page. */
router.post("/bulk", protectMasterAdmin, async (req, res) => {
  try {
    const { providerDbId, gameUIds = [] } = req.body || {};
    const addHot = toBool(req.body?.isHot);
    const addLatest = toBool(req.body?.isLatest);
    const addFavorite = toBool(req.body?.isFavorite);
    const addStatus = req.body?.status === "inactive" ? "inactive" : "active";

    const provider = await loadProvider(providerDbId);
    if (!provider) return errorResponse(res, "TB provider not found.", 404);

    const wanted = new Set((Array.isArray(gameUIds) ? gameUIds : []).map(cleanText).filter(Boolean));
    if (!wanted.size) return errorResponse(res, "Pick at least one game.", 400);

    let oracleGames;
    try {
      oracleGames = await fetchOracleGames(provider.providerCode);
    } catch (error) {
      return errorResponse(res, oracleErrorMessage(error, "Failed to reach Oracle."), 502);
    }

    const existing = new Set(
      await TbGame.find({ providerDbId: provider._id }).distinct("gameUId"),
    );
    const last = await TbGame.findOne({ providerDbId: provider._id }).sort({ order: -1 }).select("order");
    let nextOrder = last?.order || 0;
    let hotOrder = addHot ? (await nextHotOrder()) - 1 : 0;
    let favOrder = addFavorite ? (await nextListOrder("favorite")) - 1 : 0;

    const docs = oracleGames
      .filter((game) => wanted.has(game.gameUId) && !existing.has(game.gameUId))
      .map((game) => {
        nextOrder += 1;
        return {
          categoryId: provider.categoryId,
          providerDbId: provider._id,
          providerCode: provider.providerCode,
          gameUId: game.gameUId,
          name: game.name,
          oracleImages: game.images,
          order: nextOrder,
          isHot: addHot,
          hotOrder: addHot ? ++hotOrder : 0,
          isLatest: addLatest,
          isFavorite: addFavorite,
          favOrder: addFavorite ? ++favOrder : 0,
          status: addStatus,
        };
      });

    const created = docs.length ? await TbGame.insertMany(docs, { ordered: false }) : [];

    return successResponse(
      res,
      `${created.length} game(s) added.`,
      { created: created.length, skipped: wanted.size - created.length },
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* POST /api/master/tb-games/bulk-remove  { ids: [...] } */
router.post("/bulk-remove", protectMasterAdmin, async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isValidObjectId);
    if (!ids.length) return errorResponse(res, "Nothing to remove.", 400);

    const games = await TbGame.find({ _id: { $in: ids } }).select("image");
    const deleted = await TbGame.deleteMany({ _id: { $in: ids } });
    games.forEach((game) => deleteLocalFile(game.image));

    return successResponse(res, `${deleted.deletedCount || 0} game(s) removed.`, {
      deleted: deleted.deletedCount || 0,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/tb-games/bangla  { items: [{ id, nameBn }] }
   Saves the whole Bangla-name table in one request. */
router.patch("/bangla", protectMasterAdmin, async (req, res) => {
  try {
    const items = (Array.isArray(req.body?.items) ? req.body.items : []).filter((item) =>
      isValidObjectId(item?.id),
    );
    if (!items.length) return errorResponse(res, "Nothing to save.", 400);

    const result = await TbGame.bulkWrite(
      items.map((item) => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { nameBn: cleanText(item.nameBn) } },
        },
      })),
    );

    return successResponse(res, `${result.modifiedCount || 0} Bangla name(s) saved.`, {
      saved: result.modifiedCount || 0,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/tb-games/hot  { ids: [...], isHot: true|false }
   The star button — newly starred games join the end of the Hot list. */
router.patch("/hot", protectMasterAdmin, async (req, res) => {
  try {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).filter(isValidObjectId);
    const isHot = toBool(req.body?.isHot);
    if (!ids.length) return errorResponse(res, "Nothing to update.", 400);

    if (!isHot) {
      await TbGame.updateMany({ _id: { $in: ids } }, { $set: { isHot: false, hotOrder: 0 } });
    } else {
      let order = await nextHotOrder();
      const games = await TbGame.find({ _id: { $in: ids }, isHot: false }).select("_id");

      if (games.length) {
        await TbGame.bulkWrite(
          games.map((game) => ({
            updateOne: {
              filter: { _id: game._id },
              update: { $set: { isHot: true, hotOrder: order++ } },
            },
          })),
        );
      }
    }

    return successResponse(res, isHot ? "Marked as HOT." : "Removed from HOT.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/tb-games/hot/reorder  { ids } */
router.patch("/hot/reorder", protectMasterAdmin, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    await applyOrder(TbGame, ids, "hotOrder", { isHot: true });

    return successResponse(res, "Hot order saved.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/tb-games/reorder  { providerDbId, ids } */
router.patch("/reorder", protectMasterAdmin, async (req, res) => {
  try {
    const { providerDbId, ids = [] } = req.body || {};
    if (!isValidObjectId(providerDbId)) return errorResponse(res, "Valid providerDbId is required.", 400);

    await applyOrder(TbGame, Array.isArray(ids) ? ids : [], "order", { providerDbId });

    return successResponse(res, "Game order saved.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PUT /api/master/tb-games/:id — Bangla name, flags, status, custom image */
router.put("/:id", protectMasterAdmin, upload.single("image"), async (req, res) => {
  const newImage = filePath(req.file);

  try {
    if (!isValidObjectId(req.params.id)) {
      deleteLocalFile(newImage);
      return errorResponse(res, "Invalid game id.", 400);
    }

    const game = await TbGame.findById(req.params.id);

    if (!game) {
      deleteLocalFile(newImage);
      return errorResponse(res, "TB game not found.", 404);
    }

    const { nameBn, isHot, isLatest, isFavorite, status, removeImage, order, hotOrder } = req.body || {};
    const oldImage = game.image;

    if (nameBn !== undefined) game.nameBn = cleanText(nameBn);
    if (isLatest !== undefined) game.isLatest = toBool(isLatest);
    if (status !== undefined) game.status = status === "inactive" ? "inactive" : "active";

    if (isHot !== undefined) {
      const hot = toBool(isHot);
      if (hot && !game.isHot) game.hotOrder = await nextHotOrder();
      if (!hot) game.hotOrder = 0;
      game.isHot = hot;
    }

    if (isFavorite !== undefined) {
      const fav = toBool(isFavorite);
      if (fav && !game.isFavorite) game.favOrder = await nextListOrder("favorite");
      if (!fav) game.favOrder = 0;
      game.isFavorite = fav;
    }

    if (newImage) game.image = newImage;
    else if (toBool(removeImage)) game.image = "";

    await game.save();

    if (oldImage && oldImage !== game.image) deleteLocalFile(oldImage);

    // Position numbers: where the game shows inside its provider, and in HOT
    if (order !== undefined && String(order).trim() !== "") {
      await moveToPosition(TbGame, game._id, order, "order", { providerDbId: game.providerDbId });
    }
    if (game.isHot && hotOrder !== undefined && String(hotOrder).trim() !== "") {
      await moveToPosition(TbGame, game._id, hotOrder, "hotOrder", { isHot: true });
    }

    const fresh = await TbGame.findById(game._id);
    await fresh.populate([PROVIDER_POPULATE, CATEGORY_POPULATE]);
    return successResponse(res, "TB game updated successfully.", formatGame(req, fresh));
  } catch (error) {
    deleteLocalFile(newImage);
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
