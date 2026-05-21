import express from "express";
import WhiteLabelSite from "../models/WhiteLabelSite.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { upload } from "../config/multer.js";

const router = express.Router();

const fileUrl = (req, file) => {
  if (!file) return "";
  return `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
};

router.post(
  "/",
  protectMasterAdmin,
  upload.single("logo"),
  async (req, res) => {
    try {
      const {
        siteName,
        clientUrl,
        adminLoginUrl,
        adminEmail,
        adminPassword,
        note,
        status,
      } = req.body || {};

      if (
        !siteName ||
        !clientUrl ||
        !adminLoginUrl ||
        !adminEmail ||
        !adminPassword
      ) {
        return errorResponse(
          res,
          "siteName, clientUrl, adminLoginUrl, adminEmail and adminPassword are required.",
          400,
        );
      }

      const site = await WhiteLabelSite.create({
        siteName,
        clientUrl,
        adminLoginUrl,
        adminEmail,
        adminPassword,
        note,
        status,
        logo: fileUrl(req, req.file),
      });

      return successResponse(res, "Site created successfully.", site, 201);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "", status = "" } = req.query || {};

    const query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { siteName: { $regex: search, $options: "i" } },
        { adminEmail: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 15, 1);
    const skip = (pageNum - 1) * limitNum;

    const [sites, total] = await Promise.all([
      WhiteLabelSite.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      WhiteLabelSite.countDocuments(query),
    ]);

    return successResponse(res, "Sites fetched successfully.", {
      sites,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const site = await WhiteLabelSite.findById(req.params.id);

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    return successResponse(res, "Site fetched successfully.", site);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.patch(
  "/:id",
  protectMasterAdmin,
  upload.single("logo"),
  async (req, res) => {
    try {
      const updateData = {};

      const fields = [
        "siteName",
        "clientUrl",
        "adminLoginUrl",
        "adminEmail",
        "adminPassword",
        "note",
        "status",
      ];

      fields.forEach((field) => {
        if (req.body[field] !== undefined) {
          updateData[field] = req.body[field];
        }
      });

      if (req.file) {
        updateData.logo = fileUrl(req, req.file);
      }

      const site = await WhiteLabelSite.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true },
      );

      if (!site) {
        return errorResponse(res, "Site not found.", 404);
      }

      return successResponse(res, "Site updated successfully.", site);
    } catch (error) {
      return errorResponse(res, error.message, 500);
    }
  },
);

router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const site = await WhiteLabelSite.findByIdAndDelete(req.params.id);

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    return successResponse(res, "Site deleted successfully.", site);
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

router.post("/:id/open-admin", protectMasterAdmin, async (req, res) => {
  try {
    const site = await WhiteLabelSite.findById(req.params.id);

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    if (site.status !== "active") {
      return errorResponse(res, "This site is inactive.", 403);
    }

    site.lastLoginAt = new Date();
    await site.save();

    return successResponse(res, "Admin login info fetched.", {
      adminLoginUrl: site.adminLoginUrl,
      adminEmail: site.adminEmail,
      adminPassword: site.adminPassword,
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
});

export default router;
