import mongoose from "mongoose";

const BcGameProviderSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BcGameCategory",
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

    // Position in the provider button row of its own category. 0 means "no
    // order set" and those providers always follow every ordered one.
    // Numbers are unique per category, not globally.
    order: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Position in the home page provider row. That row mixes providers from
    // every category, so unlike `order` this number is unique site-wide.
    homeOrder: {
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

BcGameProviderSchema.index(
  { categoryId: 1, providerCode: 1 },
  { unique: true },
);

// Hard guarantee behind the "this number is already used" check in the admin
// panel. Unordered providers (0 / missing) are excluded, so any number of
// them can coexist.
BcGameProviderSchema.index(
  { categoryId: 1, order: 1 },
  {
    unique: true,
    name: "uniq_provider_category_order",
    partialFilterExpression: { order: { $gt: 0 } },
  },
);

BcGameProviderSchema.index(
  { homeOrder: 1 },
  {
    unique: true,
    name: "uniq_provider_home_order",
    partialFilterExpression: { homeOrder: { $gt: 0 } },
  },
);

const BcGameProvider =
  mongoose.models.BcGameProvider ||
  mongoose.model("BcGameProvider", BcGameProviderSchema);

export default BcGameProvider;
