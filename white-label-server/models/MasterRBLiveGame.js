import mongoose from "mongoose";

const masterRBLiveGameSchema = new mongoose.Schema(
  {
    gameUID: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    openInNewTab: {
      type: Boolean,
      default: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

const MasterRBLiveGame = mongoose.model(
  "MasterRBLiveGame",
  masterRBLiveGameSchema,
);

export default MasterRBLiveGame;