import { authService } from "./auth.service.js";

export const authController = {
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: { message: "Email and password are required" } });
      }

      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const userAgent = req.headers["user-agent"] || "";

      const result = await authService.login(email, password, ipAddress, userAgent);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  refresh: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: { message: "Refresh token is required" } });
      }

      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const userAgent = req.headers["user-agent"] || "";

      const result = await authService.refresh(refreshToken, ipAddress, userAgent);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  logout: async (req, res, next) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: { message: "Refresh token is required" } });
      }

      await authService.logout(refreshToken);
      return res.json({ success: true, message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  },

  getSetupStatus: async (req, res, next) => {
    try {
      const result = await authService.getSetupStatus();
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  setup: async (req, res, next) => {
    try {
      const { name, username, email, password } = req.body;
      if (!name || !username || !email || !password) {
        return res.status(400).json({ error: { message: "Name, username, email, and password are required" } });
      }

      const ipAddress = req.ip || req.headers["x-forwarded-for"] || "";
      const userAgent = req.headers["user-agent"] || "";

      const result = await authService.setupAdmin(name, username, email, password, ipAddress, userAgent);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  },

  changePassword: async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: { message: "Password lama dan password baru harus diisi" } });
      }

      const result = await authService.changePassword(userId, currentPassword, newPassword);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }
};
