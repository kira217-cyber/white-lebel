import mongoose from "mongoose";

import BcGame from "../models/BcGame.js";

// Games with no order set (0 or missing) sort behind every ordered game.
const UNORDERED_KEY = Number.MAX_SAFE_INTEGER;

export const CATEGORY_ORDER_FIELD = "categoryOrder";
export const PROVIDER_ORDER_FIELD = "providerOrder";

// A provider page is ordered by providerOrder, the category "All" page by
// categoryOrder. Everything else (search, home) falls back to categoryOrder.
export const pickOrderField = (providerDbId = "") =>
  providerDbId ? PROVIDER_ORDER_FIELD : CATEGORY_ORDER_FIELD;

const OBJECT_ID_KEYS = ["_id", "categoryId", "providerDbId"];

// find() casts string ids for us, aggregate() does not.
const castMatch = (query = {}) => {
  const match = { ...query };

  OBJECT_ID_KEYS.forEach((key) => {
    const value = match[key];

    if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
      match[key] = new mongoose.Types.ObjectId(value);
    }
  });

  return match;
};

const orderKeyStage = (orderField) => ({
  $addFields: {
    __orderKey: {
      $cond: [
        { $gt: [{ $ifNull: [`$${orderField}`, 0] }, 0] },
        `$${orderField}`,
        UNORDERED_KEY,
      ],
    },
  },
});

/**
 * Same result shape as Model.find().populate(), but sorted by admin order:
 * ordered documents first (1, 2, 3...), then the rest newest-first as before.
 * Works for any BetChokkor model that carries a numeric order field.
 */
export const findOrdered = async ({
  model,
  query = {},
  orderField = CATEGORY_ORDER_FIELD,
  skip = 0,
  limit = 0,
  populate = [],
} = {}) => {
  const pipeline = [
    { $match: castMatch(query) },
    orderKeyStage(orderField),
    { $sort: { __orderKey: 1, createdAt: -1, _id: -1 } },
  ];

  if (skip > 0) pipeline.push({ $skip: skip });
  if (limit > 0) pipeline.push({ $limit: limit });

  pipeline.push({ $project: { __orderKey: 0 } });

  const docs = await model.aggregate(pipeline).allowDiskUse(true);

  if (populate.length) {
    await model.populate(docs, populate);
  }

  return docs;
};

export const findGamesOrdered = (options = {}) =>
  findOrdered({ ...options, model: BcGame });

const orderValue = (game, orderField) => {
  const value = Number(game?.[orderField]);
  return Number.isFinite(value) && value > 0 ? value : UNORDERED_KEY;
};

// In-memory equivalent of the pipeline above, for lists that were already
// loaded and just need re-sorting under a different order field.
export const compareByOrder =
  (orderField = CATEGORY_ORDER_FIELD) =>
  (a, b) => {
    const diff = orderValue(a, orderField) - orderValue(b, orderField);
    if (diff !== 0) return diff;

    return new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0);
  };
