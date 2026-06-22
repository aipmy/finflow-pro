export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { message: "Authentication required" } });
    }

    const { permissions, role } = req.user;

    // Admin has superuser status and bypasses permission checks
    if (role === "admin") {
      return next();
    }

    if (!permissions || !permissions.includes(requiredPermission)) {
      return res.status(403).json({ error: { message: "Forbidden: You do not have the required permission" } });
    }

    next();
  };
};
