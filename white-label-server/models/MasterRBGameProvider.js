import mongoose from "mongoose";

const masterRBGameProviderSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterRBGameCategory",
      required: true,
      index: true,
    },

    providerName: {
      type: String,
      required: true,
      trim: true,
    },

    providerId: {
      type: String,
      required: true,
      trim: true,
    },

    providerImage: {
      type: String,
      default: "",
      trim: true,
    },

    providerIcon: {
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
  { timestamps: true },
);

masterRBGameProviderSchema.index(
  { categoryId: 1, providerId: 1 },
  { unique: true },
);

masterRBGameProviderSchema.index({
  providerName: "text",
  providerId: "text",
});

const MasterRBGameProvider = mongoose.model(
  "MasterRBGameProvider",
  masterRBGameProviderSchema,
);

export default MasterRBGameProvider;
