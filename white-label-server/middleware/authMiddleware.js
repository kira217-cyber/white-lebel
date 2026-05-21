import jwt from "jsonwebtoken";
import MasterAdmin from "../models/MasterAdmin.js";
import { errorResponse } from "../utils/response.js";

export const protectMasterAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Unauthorized. Token missing.", 401);
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await MasterAdmin.findById(decoded.id);

    if (!admin || !admin.isActive) {
      return errorResponse(res, "Unauthorized admin.", 401);
    }

    req.admin = admin;
    next();
  } catch (error) {
    return errorResponse(res, "Invalid or expired token.", 401);
  }
};
