import mongoose from "mongoose";

const CxGameProviderSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CxGameCategory",
      required: true,
      index: true,
    },

    providerCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    providerName: {
      type: String,
      required: true,
      trim: true,
    },

    providerIcon: {
      type: String,
      default: "",
      trim: true,
    },

    isHome: {
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

CxGameProviderSchema.index(
  { categoryId: 1, providerCode: 1 },
  { unique: true },
);

const CxGameProvider =
  mongoose.models.CxGameProvider ||
  mongoose.model("CxGameProvider", CxGameProviderSchema);

export default CxGameProvider;
