import jwt from "jsonwebtoken";
import { config } from "../core/config.js";

export const requireAuth = (req, res, next) => {
  let token;
  const authHeader = req.headers["authorization"];
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: { message: "No token provided, authorization denied" } });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: { message: "Token is not valid or has expired" } });
  }
};
