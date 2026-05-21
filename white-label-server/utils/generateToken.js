import jwt from "jsonwebtoken";

const generateToken = (payload, expiresIn = process.env.JWT_EXPIRE || "7d") => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn,
  });
};

export default generateToken;
