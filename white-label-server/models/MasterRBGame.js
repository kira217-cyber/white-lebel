import mongoose from "mongoose";

const masterRBGameSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterRBGameCategory",
      required: true,
      index: true,
    },

    providerDbId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterRBGameProvider",
      required: true,
      index: true,
    },

    // Oracle game._id only
    gameId: {
      type: String,
      required: true,
      trim: true,
    },

    // only custom uploaded image will save here
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

    isNew: {
      type: Boolean,
      default: false,
      index: true,
    },

    isJackpot: {
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
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

masterRBGameSchema.index(
  { providerDbId: 1, gameId: 1 },
  { unique: true }
);

const MasterRBGame = mongoose.model("MasterRBGame", masterRBGameSchema);

export default MasterRBGame;