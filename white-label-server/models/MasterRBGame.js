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

    // Oracle game_uid
    gameUId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // Oracle image URL DB te save hobe na.
    // New Oracle image keys: original, height, thumbnail
    oracleImageType: {
      type: String,
      enum: ["thumbnail", "height", "original"],
      default: "thumbnail",
      index: true,
    },

    // Only custom uploaded image save hobe
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
      index: true,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

masterRBGameSchema.index({ providerDbId: 1, gameUId: 1 }, { unique: true });

masterRBGameSchema.index({
  gameUId: "text",
});

const MasterRBGame = mongoose.model("MasterRBGame", masterRBGameSchema);

export default MasterRBGame;
