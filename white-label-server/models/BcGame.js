import mongoose from "mongoose";

const BcGameSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BcGameCategory",
      required: true,
      index: true,
    },

    providerDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BcGameProvider",
      required: true,
      index: true,
    },

    oracleImageType: {
      type: String,
      enum: ["thumbnail", "height", "original"],
      default: "thumbnail",
    },

    gameUId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    isHot: {
      type: Boolean,
      default: false,
      index: true,
    },

    isFavorites: {
      type: Boolean,
      default: false,
      index: true,
    },

    isLatest: {
      type: Boolean,
      default: false,
      index: true,
    },

    isAZ: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Position of this game on the category "All" page (provider = all).
    // 0 means "no order set" and those games are always listed after every
    // ordered game. Numbers are unique per category, not globally.
    categoryOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Same idea, but for the page of one specific provider. Kept separate
    // from categoryOrder so the "All" page and a provider page can be
    // arranged independently. Numbers are unique per provider.
    providerOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    syncStatus: {
      type: String,
      enum: ["pending", "synced", "failed"],
      default: "pending",
      index: true,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

BcGameSchema.index({ providerDbId: 1, gameUId: 1 }, { unique: true });
BcGameSchema.index({ categoryId: 1, status: 1 });
BcGameSchema.index({ providerDbId: 1, status: 1 });

// Ordered lookups. The unique partial indexes are the hard guarantee behind
// the "this number is already used" check in the admin panel; unordered games
// (order 0 / missing) are excluded so any number of them can coexist.
BcGameSchema.index(
  { categoryId: 1, categoryOrder: 1 },
  {
    unique: true,
    name: "uniq_category_order",
    partialFilterExpression: { categoryOrder: { $gt: 0 } },
  },
);

BcGameSchema.index(
  { providerDbId: 1, providerOrder: 1 },
  {
    unique: true,
    name: "uniq_provider_order",
    partialFilterExpression: { providerOrder: { $gt: 0 } },
  },
);

const BcGame = mongoose.models.BcGame || mongoose.model("BcGame", BcGameSchema);

export default BcGame;
