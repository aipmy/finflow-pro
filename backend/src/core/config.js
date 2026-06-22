import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "finflow_jwt_secret_key_2026_xyz",
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || "finflow_jwt_refresh_secret_key_2026_abc",
  databaseUrl: process.env.DATABASE_URL,
};
