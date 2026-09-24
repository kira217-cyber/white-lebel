import axios from "axios";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";

/* ------------------------------------------------------------------
   TBAJEE38 (Tb) — helpers shared by the admin and client routes.
------------------------------------------------------------------ */

const ORACLE_BASE = process.env.ORACLE_API_BASE || "https://oraclegames.net";

// Read on every call: dotenv runs after the route modules are imported.
const oracleHeaders = () => ({
  "x-oraclegamedata-key": process.env.ORACLE_GAME_DATA_KEY || "",
});

export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

export const cleanText = (value = "") => String(value ?? "").trim();

export const cleanCode = (value = "") => cleanText(value).toUpperCase();

export const toBool = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ---------------------------- files ---------------------------- */

export const filePath = (file) => (file ? `/uploads/${file.filename}` : "");

export const buildFileUrl = (req, value = "") => {
  if (!value) return "";
  if (String(value).startsWith("http")) return value;

  return `${req.protocol}://${req.get("host")}${
    String(value).startsWith("/") ? value : `/${value}`
  }`;
};

export const deleteLocalFile = (value = "") => {
  try {
    if (!value || String(value).startsWith("http")) return;

    const clean = String(value).startsWith("/") ? String(value).slice(1) : value;
    const full = path.resolve(clean);

    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch (error) {
    console.log("TB FILE DELETE ERROR:", error.message);
  }
};

// Every uploaded file of a multer .fields() request, for cleanup on errors.
export const uploadedPaths = (req) =>
  Object.values(req.files || {})
    .flat()
    .map((file) => filePath(file));

export const cleanupUploads = (req) => uploadedPaths(req).forEach(deleteLocalFile);

/* ---------------------------- oracle ---------------------------- */

const oracleProviderIcon = (image = "") => {
  if (!image) return "";
  if (String(image).startsWith("http")) return image;
  return `${ORACLE_BASE}/provider/${image}`;
};

export const fetchOracleProviders = async () => {
  const res = await axios.get(`${ORACLE_BASE}/api/providerlist`, {
    headers: oracleHeaders(),
    timeout: 30000,
  });

  const list = Array.isArray(res.data)
    ? res.data
    : res.data?.data || res.data?.providers || [];

  return list
    .filter((item) => item?.code && item?.name)
    .map((item) => ({
      providerCode: cleanCode(item.code),
      providerName: cleanText(item.name),
      icon: oracleProviderIcon(item.image),
      active: Number(item.status) === 1,
    }))
    .sort((a, b) => a.providerName.localeCompare(b.providerName));
};

export const fetchOracleGames = async (providerCode = "") => {
  const res = await axios.get(
    `${ORACLE_BASE}/api/game/${encodeURIComponent(cleanCode(providerCode))}`,
    { headers: oracleHeaders(), timeout: 30000 },
  );

  const games = Array.isArray(res.data?.games) ? res.data.games : [];

  return games
    .filter((game) => game?.game_uid)
    .map((game) => ({
      gameUId: cleanText(game.game_uid),
      name: cleanText(game.name),
      category: cleanText(game.category),
      active: Number(game.status) === 1,
      images: {
        thumbnail: game.thumbnail || "",
        height: game.height || "",
        original: game.original || "",
      },
    }));
};

// Oracle lists change rarely; searching many providers at once (the Hot
// page lookup) would otherwise fire one Oracle call per provider each time.
const ORACLE_TTL_MS = 10 * 60 * 1000;
const oracleCache = new Map();

export const fetchOracleGamesCached = async (providerCode = "") => {
  const code = cleanCode(providerCode);
  const hit = oracleCache.get(code);
  if (hit && Date.now() - hit.at < ORACLE_TTL_MS) return hit.games;

  const games = await fetchOracleGames(code);
  oracleCache.set(code, { at: Date.now(), games });
  return games;
};

export const oracleErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

/* ---------------------------- order ---------------------------- */

const UNORDERED = Number.MAX_SAFE_INTEGER;

const castMatch = (query = {}) => {
  const match = { ...query };

  Object.keys(match).forEach((key) => {
    const value = match[key];
    if (
      (key === "_id" || key.endsWith("Id")) &&
      typeof value === "string" &&
      isValidObjectId(value)
    ) {
      match[key] = new mongoose.Types.ObjectId(value);
    }
  });

  return match;
};

/**
 * Ordered first (1, 2, 3…), then everything never ordered in the order it
 * was added — so a newly added item always lands at the end of the list.
 */
export const findSorted = async ({
  model,
  query = {},
  orderField = "order",
  skip = 0,
  limit = 0,
  populate = [],
}) => {
  const pipeline = [
    { $match: castMatch(query) },
    {
      $addFields: {
        __key: {
          $cond: [
            { $gt: [{ $ifNull: [`$${orderField}`, 0] }, 0] },
            `$${orderField}`,
            UNORDERED,
          ],
        },
      },
    },
    { $sort: { __key: 1, createdAt: 1, _id: 1 } },
  ];

  if (skip > 0) pipeline.push({ $skip: skip });
  if (limit > 0) pipeline.push({ $limit: limit });
  pipeline.push({ $project: { __key: 0 } });

  const docs = await model.aggregate(pipeline).allowDiskUse(true);
  if (populate.length) await model.populate(docs, populate);

  return docs;
};

// Drag-and-drop result → order 1..n in one round trip. `ids` may be only the
// part of the list the admin sorted; every other item in the scope keeps its
// current sequence after them, so no two items ever share a number.
export const applyOrder = async (model, ids = [], orderField = "order", scope = {}) => {
  const picked = [...new Set(ids.map(String))].filter(isValidObjectId);
  if (!picked.length) return 0;

  const current = await findSorted({ model, query: scope, orderField });
  const inScope = new Set(current.map((item) => String(item._id)));
  const pickedSet = new Set(picked);

  const valid = [
    ...picked.filter((id) => inScope.has(id)),
    ...current.map((item) => String(item._id)).filter((id) => !pickedSet.has(id)),
  ];

  const result = await model.bulkWrite(
    valid.map((id, index) => ({
      updateOne: {
        filter: { _id: id, ...scope },
        update: { $set: { [orderField]: index + 1 } },
      },
    })),
  );

  return result.modifiedCount || 0;
};

/**
 * Puts one item at a 1-based position inside its scope and renumbers the
 * rest (0 / empty = move to the end). The number the admin types is where
 * the item lands on the site; nobody else ever shares it.
 */
export const moveToPosition = async (model, id, position, orderField = "order", scope = {}) => {
  const current = await findSorted({ model, query: scope, orderField });
  const ids = current.map((item) => String(item._id)).filter((itemId) => itemId !== String(id));

  const at = Number(position) > 0 ? Math.min(Math.floor(Number(position)), ids.length + 1) : ids.length + 1;
  ids.splice(at - 1, 0, String(id));

  await applyOrder(model, ids, orderField, scope);
  return at;
};

/* ---------------------------- format ---------------------------- */

export const formatCategory = (req, item) => {
  const obj = item?.toObject ? item.toObject() : item;

  return {
    ...obj,
    id: String(obj._id),
    deskIconUrl: buildFileUrl(req, obj.deskIcon),
    mobIconUrl: buildFileUrl(req, obj.mobIcon),
    titleIconUrl: buildFileUrl(req, obj.titleIcon),
  };
};

export const formatProvider = (req, item) => {
  const obj = item?.toObject ? item.toObject() : item;
  const logoUrl = buildFileUrl(req, obj.logo);

  return {
    ...obj,
    id: String(obj._id),
    categoryId: String(obj.categoryId?._id || obj.categoryId || ""),
    category: obj.categoryId?._id ? obj.categoryId : undefined,
    displayName: obj.displayName || obj.providerCode,
    logoUrl,
    // What the site actually draws: the wordmark, else Oracle's icon.
    iconUrl: logoUrl || obj.oracleIcon || "",
  };
};

export const formatGame = (req, item) => {
  const obj = item?.toObject ? item.toObject() : item;
  const images = obj.oracleImages || {};
  const customImageUrl = buildFileUrl(req, obj.image);
  const provider = obj.providerDbId?._id ? obj.providerDbId : null;

  return {
    ...obj,
    id: String(obj._id),
    categoryId: String(obj.categoryId?._id || obj.categoryId || ""),
    category: obj.categoryId?._id
      ? { id: String(obj.categoryId._id), key: obj.categoryId.key, name: obj.categoryId.name }
      : undefined,
    providerDbId: String(provider?._id || obj.providerDbId || ""),
    provider: provider
      ? {
          id: String(provider._id),
          providerCode: provider.providerCode,
          displayName: provider.displayName || provider.providerCode,
        }
      : undefined,
    customImageUrl,
    // 420×500 — sharp in the desktop square and the mobile 217:245 card.
    imageUrl: customImageUrl || images.height || images.thumbnail || images.original || "",
  };
};
