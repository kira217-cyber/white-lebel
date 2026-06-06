import express from "express";
import WhiteLabelSite from "../models/WhiteLabelSite.js";
import { protectMasterAdmin } from "../middleware/authMiddleware.js";
import { errorResponse, successResponse } from "../utils/response.js";
import { upload } from "../config/multer.js";

const router = express.Router();

/* ======================================================
   FILE PATH
====================================================== */

const filePath = (file) => {
  if (!file) return "";
  return `/uploads/${file.filename}`;
};

/* ======================================================
   TOKEN HELPERS
====================================================== */

const generateApiToken = (length = 20) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let token = "";

  for (let i = 0; i < length; i += 1) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return token;
};

const makeTokenPreview = (token = "") => {
  if (!token) return "";
  return `${token.slice(0, 4)}********${token.slice(-4)}`;
};

const createUniqueToken = async () => {
  let token = generateApiToken(20);

  let exists = await WhiteLabelSite.findOne({ apiToken: token }).select(
    "+apiToken",
  );

  while (exists) {
    token = generateApiToken(20);

    exists = await WhiteLabelSite.findOne({ apiToken: token }).select(
      "+apiToken",
    );
  }

  return token;
};

/* ======================================================
   VERIFY TOKEN
====================================================== */

router.post("/verify-token", async (req, res) => {
  try {
    const { token } = req.body || {};

    if (!token) {
      return errorResponse(res, "API token is required.", 400);
    }

    const site = await WhiteLabelSite.findOne({
      apiToken: String(token).trim(),
      tokenActive: true,
      status: "active",
    }).select("siteName clientUrl adminLoginUrl logo status tokenActive");

    if (!site) {
      return errorResponse(res, "Invalid or inactive API token.", 401);
    }

    site.lastTokenVerifiedAt = new Date();
    await site.save();

    return successResponse(res, "API token verified successfully.", {
      valid: true,
      site,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   CREATE SITE
====================================================== */

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

      const apiToken = await createUniqueToken();

      const site = await WhiteLabelSite.create({
        siteName,
        clientUrl,
        adminLoginUrl,
        adminEmail,
        adminPassword,
        note,
        status: status || "active",
        logo: filePath(req.file),
        apiToken,
        apiTokenPreview: makeTokenPreview(apiToken),
        tokenActive: true,
        apiTokenLastGeneratedAt: new Date(),
      });

      const safeSite = site.toObject();
      delete safeSite.apiToken;

      return successResponse(
        res,
        "Site created successfully.",
        {
          site: safeSite,
          apiToken,
        },
        201,
      );
    } catch (error) {
      if (error?.code === 11000) {
        return errorResponse(res, "Duplicate API token detected.", 400);
      }

      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   GET ALL SITES
====================================================== */

router.get("/", protectMasterAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 15, search = "", status = "" } = req.query || {};

    const query = {};

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        {
          siteName: {
            $regex: search,
            $options: "i",
          },
        },
        {
          adminEmail: {
            $regex: search,
            $options: "i",
          },
        },
        {
          clientUrl: {
            $regex: search,
            $options: "i",
          },
        },
        {
          adminLoginUrl: {
            $regex: search,
            $options: "i",
          },
        },
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
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   GET TOKEN
====================================================== */

router.get("/:id/token", protectMasterAdmin, async (req, res) => {
  try {
    const site = await WhiteLabelSite.findById(req.params.id).select(
      "+apiToken siteName status tokenActive apiTokenPreview apiTokenLastGeneratedAt",
    );

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    return successResponse(res, "API token fetched successfully.", {
      siteId: site._id,
      siteName: site.siteName,
      apiToken: site.apiToken,
      apiTokenPreview: site.apiTokenPreview,
      tokenActive: site.tokenActive,
      status: site.status,
      apiTokenLastGeneratedAt: site.apiTokenLastGeneratedAt,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   REGENERATE TOKEN
====================================================== */

router.post("/:id/regenerate-token", protectMasterAdmin, async (req, res) => {
  try {
    const site = await WhiteLabelSite.findById(req.params.id).select(
      "+apiToken",
    );

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    const newToken = await createUniqueToken();

    site.apiToken = newToken;
    site.apiTokenPreview = makeTokenPreview(newToken);
    site.tokenActive = true;
    site.apiTokenLastGeneratedAt = new Date();
    site.lastTokenVerifiedAt = null;

    await site.save();

    return successResponse(res, "API token regenerated successfully.", {
      siteId: site._id,
      siteName: site.siteName,
      apiToken: newToken,
      apiTokenPreview: site.apiTokenPreview,
      tokenActive: site.tokenActive,
      apiTokenLastGeneratedAt: site.apiTokenLastGeneratedAt,
    });
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE TOKEN STATUS
====================================================== */

router.patch("/:id/token-status", protectMasterAdmin, async (req, res) => {
  try {
    const { tokenActive } = req.body || {};

    const site = await WhiteLabelSite.findByIdAndUpdate(
      req.params.id,
      {
        tokenActive: tokenActive === true || tokenActive === "true",
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    return successResponse(res, "Token status updated successfully.", site);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   GET SINGLE SITE
====================================================== */

router.get("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const site = await WhiteLabelSite.findById(req.params.id);

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    return successResponse(res, "Site fetched successfully.", site);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   UPDATE SITE
====================================================== */

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
        updateData.logo = filePath(req.file);
      }

      const site = await WhiteLabelSite.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
          runValidators: true,
        },
      );

      if (!site) {
        return errorResponse(res, "Site not found.", 404);
      }

      return successResponse(res, "Site updated successfully.", site);
    } catch (error) {
      return errorResponse(res, error.message || "Server error", 500);
    }
  },
);

/* ======================================================
   DELETE SITE
====================================================== */

router.delete("/:id", protectMasterAdmin, async (req, res) => {
  try {
    const site = await WhiteLabelSite.findByIdAndDelete(req.params.id);

    if (!site) {
      return errorResponse(res, "Site not found.", 404);
    }

    return successResponse(res, "Site deleted successfully.", site);
  } catch (error) {
    return errorResponse(res, error.message || "Server error", 500);
  }
});

/* ======================================================
   OPEN ADMIN
====================================================== */

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
    return errorResponse(res, error.message || "Server error", 500);
  }
});

export default router;
