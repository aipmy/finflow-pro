import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../../core/config.js";
import { authRepository } from "./auth.repository.js";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const generateTokens = (user) => {
  const permissions = user.role.rolePermissions.map(rp => rp.permission.name);
  
  const payload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    permissions,
    department: user.department?.name || null,
    site: user.site?.name || null,
  };

  const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: ACCESS_TOKEN_EXPIRY });
  const refreshToken = jwt.sign({ userId: user.id }, config.jwtRefreshSecret, { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` });

  return { accessToken, refreshToken, payload };
};

export const authService = {
  login: async (emailOrUsername, password, ipAddress, userAgent) => {
    const user = await authRepository.findUserByEmailOrUsername(emailOrUsername);
    if (!user) {
      throw { status: 401, message: "Invalid email/username or password" };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw { status: 401, message: "Invalid email or password" };
    }

    const { accessToken, refreshToken, payload } = generateTokens(user);

    // Save refresh token session in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    await authRepository.createSession(user.id, refreshToken, ipAddress, userAgent, expiresAt);

    return { accessToken, refreshToken, user: payload };
  },

  refresh: async (token, ipAddress, userAgent) => {
    try {
      jwt.verify(token, config.jwtRefreshSecret);
    } catch (err) {
      throw { status: 401, message: "Invalid or expired refresh token" };
    }

    const session = await authRepository.findSession(token);
    if (!session || new Date() > session.expiresAt) {
      if (session) await authRepository.deleteSession(token);
      throw { status: 401, message: "Session expired or invalid" };
    }

    // Generate new tokens
    const { accessToken, refreshToken, payload } = generateTokens(session.user);

    // Swap refresh tokens (delete old, save new)
    await authRepository.deleteSession(token);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    await authRepository.createSession(session.user.id, refreshToken, ipAddress, userAgent, expiresAt);

    return { accessToken, refreshToken, user: payload };
  },

  logout: async (token) => {
    await authRepository.deleteSession(token);
    return { success: true };
  },

  getSetupStatus: async () => {
    const count = await authRepository.countUsers();
    return { needSetup: count === 0 };
  },

  setupAdmin: async (name, username, email, password, ipAddress, userAgent) => {
    const count = await authRepository.countUsers();
    if (count > 0) {
      throw { status: 400, message: "Setup has already been completed." };
    }

    if (!username || username.trim().length < 3) {
      throw { status: 400, message: "Username must be at least 3 characters long." };
    }

    // Password validations (regex checks for length, uppercase, lowercase, number, special char)
    if (password.length < 8) {
      throw { status: 400, message: "Password must be at least 8 characters long." };
    }
    if (!/[A-Z]/.test(password)) {
      throw { status: 400, message: "Password must contain at least one uppercase letter." };
    }
    if (!/[a-z]/.test(password)) {
      throw { status: 400, message: "Password must contain at least one lowercase letter." };
    }
    if (!/[0-9]/.test(password)) {
      throw { status: 400, message: "Password must contain at least one number." };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw { status: 400, message: "Password must contain at least one special character." };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await authRepository.createAdmin(name, username, email, passwordHash);

    const { accessToken, refreshToken, payload } = generateTokens(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    await authRepository.createSession(user.id, refreshToken, ipAddress, userAgent, expiresAt);

    return { accessToken, refreshToken, user: payload };
  },

  changePassword: async (userId, currentPassword, newPassword) => {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw { status: 404, message: "User tidak ditemukan" };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      throw { status: 400, message: "Password lama tidak sesuai" };
    }

    if (newPassword.length < 8) {
      throw { status: 400, message: "Password baru minimal 8 karakter." };
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw { status: 400, message: "Password baru harus mengandung minimal satu huruf besar." };
    }
    if (!/[a-z]/.test(newPassword)) {
      throw { status: 400, message: "Password baru harus mengandung minimal satu huruf kecil." };
    }
    if (!/[0-9]/.test(newPassword)) {
      throw { status: 400, message: "Password baru harus mengandung minimal satu angka." };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      throw { status: 400, message: "Password baru harus mengandung minimal satu karakter spesial." };
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await authRepository.updatePassword(userId, passwordHash);

    return { success: true };
  }
};
