import mongoose from "mongoose";

const CxSportSchema = new mongoose.Schema(
  {
    name: {
      bn: {
        type: String,
        required: true,
        trim: true,
      },
      en: {
        type: String,
        required: true,
        trim: true,
      },
    },

    iconImage: {
      type: String,
      default: "",
      trim: true,
    },

    gameId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
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

CxSportSchema.index({ isActive: 1, order: 1 });

const CxSport =
  mongoose.models.CxSport || mongoose.model("CxSport", CxSportSchema);

export default CxSport;
