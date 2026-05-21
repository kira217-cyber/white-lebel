import mongoose from "mongoose";

const whiteLabelSiteSchema = new mongoose.Schema(
  {
    siteName: {
      type: String,
      required: true,
      trim: true,
    },

    clientUrl: {
      type: String,
      required: true,
      trim: true,
    },

    adminLoginUrl: {
      type: String,
      required: true,
      trim: true,
    },

    adminEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    adminPassword: {
      type: String,
      required: true,
      trim: true,
    },

    logo: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

whiteLabelSiteSchema.index({
  siteName: "text",
  adminEmail: "text",
});

const WhiteLabelSite = mongoose.model("WhiteLabelSite", whiteLabelSiteSchema);

export default WhiteLabelSite;
