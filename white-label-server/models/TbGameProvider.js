import mongoose from "mongoose";

/**
 * A provider always comes from the Oracle provider list and belongs to one
 * category (the same code in two categories is two documents, each with its
 * own logo and order — the site draws a separate logo per category too).
 */
const TbGameProviderSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TbGameCategory",
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

    // Oracle's own name, e.g. "PGSoft".
    providerName: {
      type: String,
      required: true,
      trim: true,
    },

    // Short name on the game card badge and under the mobile chip,
    // e.g. JL → "JILI". Falls back to providerCode.
    displayName: {
      type: String,
      default: "",
      trim: true,
    },

    // Wide wordmark uploaded by the admin (desktop chip 150×48, mobile rail).
    logo: {
      type: String,
      default: "",
      trim: true,
    },

    // Oracle's square icon — used until a wordmark is uploaded.
    oracleIcon: {
      type: String,
      default: "",
      trim: true,
    },

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

    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

TbGameProviderSchema.index(
  { categoryId: 1, providerCode: 1 },
  { unique: true },
);
TbGameProviderSchema.index({ categoryId: 1, order: 1 });

const TbGameProvider =
  mongoose.models.TbGameProvider ||
  mongoose.model("TbGameProvider", TbGameProviderSchema);

export default TbGameProvider;
