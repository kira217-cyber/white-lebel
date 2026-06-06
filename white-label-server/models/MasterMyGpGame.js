import mongoose from "mongoose";

const MasterMyGpGameSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MyGpCategory",
      required: true,
      index: true,
    },

    providerDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterMyGpGameProvider",
      required: true,
      index: true,
    },

    gameUId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    oracleImageType: {
      type: String,
      enum: ["thumbnail", "height", "original"],
      default: "thumbnail",
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

    isJili: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPg: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPoker: {
      type: Boolean,
      default: false,
      index: true,
    },

    isCrash: {
      type: Boolean,
      default: false,
      index: true,
    },

    isLiveCasino: {
      type: Boolean,
      default: false,
      index: true,
    },

    isFish: {
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

MasterMyGpGameSchema.index(
  { providerDbId: 1, gameUId: 1 },
  { unique: true },
);

export default mongoose.model("MasterMyGpGame", MasterMyGpGameSchema);