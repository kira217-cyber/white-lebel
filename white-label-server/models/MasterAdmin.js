import mongoose from "mongoose";

const masterAdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Master Admin",
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ["master-admin"],
      default: "master-admin",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

const MasterAdmin = mongoose.model("MasterAdmin", masterAdminSchema);

export default MasterAdmin;
