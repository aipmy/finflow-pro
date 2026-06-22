import { prisma } from "../../core/database.js";

export const authRepository = {
  findUserByEmailOrUsername: async (emailOrUsername) => {
    return prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername },
          { username: emailOrUsername }
        ],
        active: true
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        department: true,
        site: true,
      }
    });
  },

  findUserById: async (id) => {
    return prisma.user.findUnique({
      where: { id, active: true },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        department: true,
        site: true,
      }
    });
  },

  createSession: async (userId, refreshToken, ipAddress, userAgent, expiresAt) => {
    return prisma.userSession.create({
      data: {
        userId,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt
      }
    });
  },

  findSession: async (refreshToken) => {
    return prisma.userSession.findUnique({
      where: { refreshToken },
      include: {
        user: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true
                  }
                }
              }
            },
            department: true,
            site: true,
          }
        }
      }
    });
  },

  deleteSession: async (refreshToken) => {
    return prisma.userSession.delete({
      where: { refreshToken }
    }).catch(() => null); // Silently ignore if already deleted
  },

  deleteUserSessions: async (userId) => {
    return prisma.userSession.deleteMany({
      where: { userId }
    });
  },

  countUsers: async () => {
    return prisma.user.count();
  },

  createAdmin: async (name, username, email, passwordHash) => {
    const adminRole = await prisma.role.findUnique({
      where: { name: "admin" }
    });
    if (!adminRole) {
      throw new Error("Admin role not found. Please run migrations and seed first.");
    }
    return prisma.user.create({
      data: {
        name,
        username,
        email,
        password: passwordHash,
        roleId: adminRole.id,
        active: true
      },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true
              }
            }
          }
        },
        department: true,
        site: true
      }
    });
  },

  updatePassword: async (id, passwordHash) => {
    return prisma.user.update({
      where: { id },
      data: { password: passwordHash }
    });
  }
};
