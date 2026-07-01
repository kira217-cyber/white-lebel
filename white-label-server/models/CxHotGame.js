import mongoose from "mongoose";

const CxHotGameSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    order: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

CxHotGameSchema.index({ status: 1, order: 1 });

const CxHotGame =
  mongoose.models.CxHotGame || mongoose.model("CxHotGame", CxHotGameSchema);

export default CxHotGame;
