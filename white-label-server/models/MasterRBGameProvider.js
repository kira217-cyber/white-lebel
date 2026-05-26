import mongoose from "mongoose";

const masterRBGameProviderSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MasterRBGameCategory",
      required: true,
      index: true,
    },

    // ✅ Oracle provider code => PG
    providerCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },

    // ✅ Oracle provider name => PGSoft
    providerName: {
      type: String,
      required: true,
      trim: true,
      index: true,
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
      index: true,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

/* ======================================================
   UNIQUE CATEGORY + PROVIDER CODE
====================================================== */

masterRBGameProviderSchema.index(
  { categoryId: 1, providerCode: 1 },
  { unique: true },
);

/* ======================================================
   SEARCH INDEX
====================================================== */

masterRBGameProviderSchema.index({
  providerName: "text",
  providerCode: "text",
});

const MasterRBGameProvider = mongoose.model(
  "MasterRBGameProvider",
  masterRBGameProviderSchema,
);

export default MasterRBGameProvider;
