import express from "express";
import bcrypt from "bcryptjs";

import MasterAdmin from "../models/MasterAdmin.js";

import generateToken from "../utils/generateToken.js";

import { errorResponse, successResponse } from "../utils/response.js";

import { protectMasterAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================
   REGISTER FIRST MASTER ADMIN
========================================= */

router.post("/register-first-master", async (req, res) => {
  try {
    const exists = await MasterAdmin.findOne();

    if (exists) {
      return errorResponse(res, "Master admin already exists.", 400);
    }

    const { name = "Master Admin", email, password } = req.body || {};

    if (!email || !password) {
      return errorResponse(res, "Email and password are required.", 400);
    }

    /* PASSWORD HASH */

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);

    /* CREATE ADMIN */

    const admin = await MasterAdmin.create({
      name,
      email: String(email).toLowerCase(),
      password: hashedPassword,
    });

    /* TOKEN */

    const token = generateToken({
      id: admin._id,
      role: admin.role,
    });

    return successResponse(res, "Master admin created successfully.", {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },

      token,
    });
  } catch (error) {
    console.error(error);

    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* =========================================
   LOGIN
========================================= */

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return errorResponse(res, "Email and password are required.", 400);
    }

    const admin = await MasterAdmin.findOne({
      email: String(email).toLowerCase(),
    }).select("+password");

    if (!admin) {
      return errorResponse(res, "Invalid email or password.", 401);
    }

    if (!admin.isActive) {
      return errorResponse(res, "Your account is inactive.", 403);
    }

    /* PASSWORD CHECK */

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return errorResponse(res, "Invalid email or password.", 401);
    }

    /* TOKEN */

    const token = generateToken({
      id: admin._id,
      role: admin.role,
    });

    return successResponse(res, "Login successful.", {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },

      token,
    });
  } catch (error) {
    console.error(error);

    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* =========================================
   GET PROFILE
========================================= */

router.get("/me", protectMasterAdmin, async (req, res) => {
  return successResponse(res, "Profile fetched.", {
    admin: req.admin,
  });
});


/* =========================================
   UPDATE PROFILE
========================================= */

router.patch("/update-profile", protectMasterAdmin, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body || {};

    if (!email && !newPassword) {
      return errorResponse(res, "Email or new password is required.", 400);
    }

    if (!currentPassword) {
      return errorResponse(res, "Current password is required.", 400);
    }

    const admin = await MasterAdmin.findById(req.admin._id).select("+password");

    if (!admin) {
      return errorResponse(res, "Admin not found.", 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, admin.password);

    if (!isMatch) {
      return errorResponse(res, "Current password is incorrect.", 401);
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();

      const exists = await MasterAdmin.findOne({
        email: normalizedEmail,
        _id: { $ne: admin._id },
      });

      if (exists) {
        return errorResponse(res, "This email already exists.", 400);
      }

      admin.email = normalizedEmail;
    }

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return errorResponse(res, "New password must be at least 6 characters.", 400);
      }

      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(newPassword, salt);
    }

    await admin.save();

    return successResponse(res, "Profile updated successfully. Please login again.", {
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});


export default router;
