import mongoose from "mongoose";

/**
 * Name and images are copied from Oracle when the game is added (and on
 * every provider re-sync), so the site never waits on Oracle and search can
 * run on both names in the database.
 */
const TbGameSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TbGameCategory",
      required: true,
      index: true,
    },

    providerDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TbGameProvider",
      required: true,
      index: true,
    },

    // Denormalised for the provider-shortcut category (JILI tab) and search.
    providerCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    gameUId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // English name from Oracle.
    name: {
      type: String,
      default: "",
      trim: true,
    },

    // Optional Bangla name set by the admin. Empty → English is shown.
    nameBn: {
      type: String,
      default: "",
      trim: true,
    },

    oracleImages: {
      thumbnail: { type: String, default: "" },
      height: { type: String, default: "" },
      original: { type: String, default: "" },
    },

    // Custom image upload; wins over the Oracle images.
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

    // Position in the "Hot" section / tab. Only meaningful when isHot.
    hotOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    // "আমার প্রিয়" ক্যাটাগরির গেম — admin বাছাই (খেলোয়াড়ের ♥ এর উপরে)
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },

    favOrder: {
      type: Number,
      default: 0,
      min: 0,
    },

    isLatest: {
      type: Boolean,
      default: false,
    },

    // Position inside its provider (and the category "all" list).
    order: {
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
  },
  { timestamps: true },
);

TbGameSchema.index({ providerDbId: 1, gameUId: 1 }, { unique: true });
TbGameSchema.index({ categoryId: 1, status: 1, order: 1 });
TbGameSchema.index({ isHot: 1, hotOrder: 1 });

const TbGame = mongoose.models.TbGame || mongoose.model("TbGame", TbGameSchema);

export default TbGame;
