import express from "express";

import TbGameCategory from "../models/TbGameCategory.js";
import TbGameProvider from "../models/TbGameProvider.js";
import TbGame from "../models/TbGame.js";

import { upload } from "../config/multer.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { successResponse, errorResponse } from "../utils/response.js";
import {
  applyOrder,
  cleanCode,
  cleanText,
  deleteLocalFile,
  fetchOracleGames,
  fetchOracleProviders,
  filePath,
  findSorted,
  formatProvider,
  isValidObjectId,
  oracleErrorMessage,
  toBool,
} from "../utils/tbShared.js";

const router = express.Router();

/* GET /api/master/tb-game-providers/oracle/list?categoryId=
   Oracle's full provider list, with `added` marking the ones already in
   this category so the picker can show them ticked. */
router.get("/oracle/list", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId = "" } = req.query || {};

    const [oracle, added] = await Promise.all([
      fetchOracleProviders(),
      isValidObjectId(categoryId)
        ? TbGameProvider.find({ categoryId }).distinct("providerCode")
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

/* GET /api/master/tb-game-providers?categoryId= — in site order, with game counts */
router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId = "" } = req.query || {};
    const query = {};

    if (categoryId) {
      if (!isValidObjectId(categoryId)) return errorResponse(res, "Invalid categoryId.", 400);
      query.categoryId = categoryId;
    }

    const providers = await findSorted({
      model: TbGameProvider,
      query,
      populate: [{ path: "categoryId", select: "name key type" }],
    });

    const counts = await TbGame.aggregate([
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
      "TB providers fetched successfully.",
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

/* POST /api/master/tb-game-providers/bulk
   { categoryId, providers: [{ providerCode, providerName, icon }] }
   Adds every ticked Oracle provider in one go; already added ones are skipped. */
router.post("/bulk", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId, providers = [] } = req.body || {};

    if (!isValidObjectId(categoryId)) return errorResponse(res, "Valid categoryId is required.", 400);
    if (!Array.isArray(providers) || !providers.length) {
      return errorResponse(res, "Pick at least one provider.", 400);
    }

    const category = await TbGameCategory.findById(categoryId);
    if (!category) return errorResponse(res, "TB category not found.", 404);

    const existing = new Set(
      await TbGameProvider.find({ categoryId }).distinct("providerCode"),
    );
    const last = await TbGameProvider.findOne({ categoryId }).sort({ order: -1 }).select("order");
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

    const created = docs.length ? await TbGameProvider.insertMany(docs) : [];

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

/* PATCH /api/master/tb-game-providers/reorder  { categoryId, ids } */
router.patch("/reorder", protectMasterAdmin, async (req, res) => {
  try {
    const { categoryId, ids = [] } = req.body || {};
    if (!isValidObjectId(categoryId)) return errorResponse(res, "Valid categoryId is required.", 400);

    await applyOrder(TbGameProvider, Array.isArray(ids) ? ids : [], "order", { categoryId });

    return successResponse(res, "Provider order saved.", { count: ids.length });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* PUT /api/master/tb-game-providers/:id — logo, badge name, status */
router.put("/:id", protectMasterAdmin, upload.single("logo"), async (req, res) => {
  const newLogo = filePath(req.file);

  try {
    if (!isValidObjectId(req.params.id)) {
      deleteLocalFile(newLogo);
      return errorResponse(res, "Invalid provider id.", 400);
    }

    const provider = await TbGameProvider.findById(req.params.id);

    if (!provider) {
      deleteLocalFile(newLogo);
      return errorResponse(res, "TB provider not found.", 404);
    }

    const { displayName, status, removeLogo } = req.body || {};
    const oldLogo = provider.logo;

    if (displayName !== undefined) provider.displayName = cleanText(displayName);
    if (status !== undefined) provider.status = status === "inactive" ? "inactive" : "active";

    if (newLogo) provider.logo = newLogo;
    else if (toBool(removeLogo)) provider.logo = "";

    await provider.save();

    if (oldLogo && oldLogo !== provider.logo) deleteLocalFile(oldLogo);

    return successResponse(res, "TB provider updated successfully.", formatProvider(req, provider));
  } catch (error) {
    deleteLocalFile(newLogo);
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* POST /api/master/tb-game-providers/:id/sync
   Refreshes the stored name and images of every added game from Oracle.
   Games Oracle no longer lists are reported, not deleted. */
router.post("/:id/sync", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return errorResponse(res, "Invalid provider id.", 400);

    const provider = await TbGameProvider.findById(req.params.id);
    if (!provider) return errorResponse(res, "TB provider not found.", 404);

    let oracleGames;
    try {
      oracleGames = await fetchOracleGames(provider.providerCode);
    } catch (error) {
      return errorResponse(res, oracleErrorMessage(error, "Failed to reach Oracle."), 502);
    }

    const oracleMap = new Map(oracleGames.map((game) => [game.gameUId, game]));
    const games = await TbGame.find({ providerDbId: provider._id }).select("gameUId name");

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

    if (ops.length) await TbGame.bulkWrite(ops);

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

/* DELETE /api/master/tb-game-providers/:id — removes its games too */
router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return errorResponse(res, "Invalid provider id.", 400);

    const provider = await TbGameProvider.findById(req.params.id);
    if (!provider) return errorResponse(res, "TB provider not found.", 404);

    const games = await TbGame.find({ providerDbId: provider._id }).select("image");
    const deleted = await TbGame.deleteMany({ providerDbId: provider._id });

    await provider.deleteOne();

    deleteLocalFile(provider.logo);
    games.forEach((game) => deleteLocalFile(game.image));

    return successResponse(res, "TB provider deleted successfully.", {
      deletedGames: deleted.deletedCount || 0,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
