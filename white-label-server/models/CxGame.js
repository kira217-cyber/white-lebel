import mongoose from "mongoose";

const CxGameSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CxGameCategory",
      required: true,
      index: true,
    },

    providerDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CxGameProvider",
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

CxGameSchema.index({ providerDbId: 1, gameUId: 1 }, { unique: true });
CxGameSchema.index({ categoryId: 1, status: 1 });
CxGameSchema.index({ providerDbId: 1, status: 1 });

const CxGame = mongoose.models.CxGame || mongoose.model("CxGame", CxGameSchema);

export default CxGame;
