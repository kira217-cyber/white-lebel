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
  fetchOracleGames,
  fetchOracleProviders,
  filePath,
  findSorted,
  formatProvider,
  isValidObjectId,
  oracleErrorMessage,
  toBool,
} from "../utils/b47Shared.js";

const router = express.Router();

/* GET /api/master/b47-game-providers/oracle/list?categoryId=
   Oracle's full provider list, with `added` marking the ones already in
   this category so the picker can show them ticked. */
router.get("/oracle/list", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId = "" } = req.query || {};

    const [oracle, added] = await Promise.all([
      fetchOracleProviders(),
      isValidObjectId(categoryId)
        ? B47GameProvider.find({ categoryId }).distinct("providerCode")
        : [],
    ]);

    const addedSet = new Set(added);

    return successResponse(
      res,
      "Oracle provider list fetched successfully.",
      oracle.map((item) => ({ ...item, added: addedSet.has(item.providerCode) })),
    );
  } catch (error) {
    return errorResponse(res, oracleErrorMessage(error, "Failed to fetch Oracle providers."), 502);
  }
});

/* GET /api/master/b47-game-providers?categoryId= — in site order, with game counts */
router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId = "" } = req.query || {};
    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) return errorResponse(res, "Invalid categoryId.", 400);
      query.categoryId = categoryId;
    }

    const providers = await findSorted({
      model: B47GameProvider,
      query,
      populate: [{ path: "categoryId", select: "name key type" }],
    });

    const counts = await B47Game.aggregate([
      { $match: { providerDbId: { $in: providers.map((item) => item._id) } } },
      {
        $group: {
          _id: "$providerDbId",
          total: { $sum: 1 },
          hot: { $sum: { $cond: ["$isHot", 1, 0] } },
          missingBn: {
            $sum: { $cond: [{ $eq: [{ $ifNull: ["$nameBn", ""] }, ""] }, 1, 0] },
          },
        },
      },
    ]);
    const countMap = Object.fromEntries(counts.map((row) => [String(row._id), row]));

    return successResponse(
      res,
      "4777Bet providers fetched successfully.",
      providers.map((item) => {
        const count = countMap[String(item._id)] || {};
        return {
          ...formatProvider(req, item),
          gameCount: count.total || 0,
          hotCount: count.hot || 0,
          missingBnCount: count.missingBn || 0,
        };
      }),
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* POST /api/master/b47-game-providers/bulk
   { categoryId, providers: [{ providerCode, providerName, icon }] }
   Adds every ticked Oracle provider in one go; already added ones are skipped. */
router.post("/bulk", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId, providers = [] } = req.body || {};

    if (!isValidObjectId(categoryId)) return errorResponse(res, "Valid categoryId is required.", 400);
    if (!Array.isArray(providers) || !providers.length) {
      return errorResponse(res, "Pick at least one provider.", 400);
    }

    const category = await B47GameCategory.findById(categoryId);
    if (!category) return errorResponse(res, "4777Bet category not found.", 404);

    const existing = new Set(
      await B47GameProvider.find({ categoryId }).distinct("providerCode"),
    );
    const last = await B47GameProvider.findOne({ categoryId }).sort({ order: -1 }).select("order");
    let nextOrder = last?.order || 0;

    const docs = [];

    providers.forEach((item) => {
      const providerCode = cleanCode(item.providerCode);
      const providerName = cleanText(item.providerName);

      if (!providerCode || !providerName || existing.has(providerCode)) return;
      existing.add(providerCode);

      nextOrder += 1;
      docs.push({
        categoryId,
        providerCode,
        providerName,
        oracleIcon: cleanText(item.icon),
        order: nextOrder,
        lastSyncedAt: new Date(),
      });
    });

    const created = docs.length ? await B47GameProvider.insertMany(docs) : [];

    return successResponse(
      res,
      `${created.length} provider(s) added.`,
      {
        created: created.length,
        skipped: providers.length - created.length,
        providers: created.map((item) => formatProvider(req, item)),
      },
      201,
    );
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PATCH /api/master/b47-game-providers/reorder  { categoryId, ids } */
router.patch("/reorder", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId, ids = [] } = req.body || {};
    if (!isValidObjectId(categoryId)) return errorResponse(res, "Valid categoryId is required.", 400);

    await applyOrder(B47GameProvider, Array.isArray(ids) ? ids : [], "order", { categoryId });

    return successResponse(res, "Provider order saved.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PUT /api/master/b47-game-providers/:id — logos, badge name, status
   `logo` = wordmark (mobile rail, game center); `cardLogo` = colour logo on
   the desktop home "provider list" card. */
const LOGO_FIELDS = ["logo", "cardLogo", "mobLogo", "lobbyImage"];
const logoUpload = upload.fields(LOGO_FIELDS.map((name) => ({ name, maxCount: 1 })));

router.put("/:id", protectMasterAdmin, logoUpload, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      cleanupUploads(req);
      return errorResponse(res, "Invalid provider id.", 400);
    }

    const provider = await B47GameProvider.findById(req.params.id);

    if (!provider) {
      cleanupUploads(req);
      return errorResponse(res, "4777Bet provider not found.", 404);
    }

    const { displayName, status } = req.body || {};

    if (displayName !== undefined) provider.displayName = cleanText(displayName);
    if (status !== undefined) provider.status = status === "inactive" ? "inactive" : "active";

    const replaced = [];

    LOGO_FIELDS.forEach((field) => {
      const file = req.files?.[field]?.[0];
      const removeKey = { logo: "removeLogo", cardLogo: "removeCardLogo", mobLogo: "removeMobLogo", lobbyImage: "removeLobbyImage" }[field];

      if (file) {
        replaced.push(provider[field]);
        provider[field] = filePath(file);
      } else if (toBool(req.body?.[removeKey])) {
        replaced.push(provider[field]);
        provider[field] = "";
      }
    });

    await provider.save();
    replaced.forEach(deleteLocalFile);

    return successResponse(res, "4777Bet provider updated successfully.", formatProvider(req, provider));
  } catch (error) {
    cleanupUploads(req);
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* POST /api/master/b47-game-providers/:id/sync
   Refreshes the stored name and images of every added game from Oracle.
   Games Oracle no longer lists are reported, not deleted. */
router.post("/:id/sync", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return errorResponse(res, "Invalid provider id.", 400);

    const provider = await B47GameProvider.findById(req.params.id);
    if (!provider) return errorResponse(res, "4777Bet provider not found.", 404);

    let oracleGames;
    try {
      oracleGames = await fetchOracleGames(provider.providerCode);
    } catch (error) {
      return errorResponse(res, oracleErrorMessage(error, "Failed to reach Oracle."), 502);
    }

    const oracleMap = new Map(oracleGames.map((game) => [game.gameUId, game]));
    const games = await B47Game.find({ providerDbId: provider._id }).select("gameUId name");

    const ops = [];
    const missing = [];

    games.forEach((game) => {
      const fresh = oracleMap.get(game.gameUId);
      if (!fresh) {
        missing.push(game.name || game.gameUId);
        return;
      }
      ops.push({
        updateOne: {
          filter: { _id: game._id },
          update: { $set: { name: fresh.name, oracleImages: fresh.images } },
        },
      });
    });

    if (ops.length) await B47Game.bulkWrite(ops);

    provider.lastSyncedAt = new Date();
    await provider.save();

    return successResponse(res, "Provider synced with Oracle.", {
      updated: ops.length,
      missing,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* DELETE /api/master/b47-game-providers/:id — removes its games too */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return errorResponse(res, "Invalid provider id.", 400);

    const provider = await B47GameProvider.findById(req.params.id);
    if (!provider) return errorResponse(res, "4777Bet provider not found.", 404);

    const games = await B47Game.find({ providerDbId: provider._id }).select("image");
    const deleted = await B47Game.deleteMany({ providerDbId: provider._id });

    await provider.deleteOne();

    deleteLocalFile(provider.logo);
    deleteLocalFile(provider.cardLogo);
    deleteLocalFile(provider.mobLogo);
    deleteLocalFile(provider.lobbyImage);
    games.forEach((game) => deleteLocalFile(game.image));

    return successResponse(res, "4777Bet provider deleted successfully.", {
      deletedGames: deleted.deletedCount || 0,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
